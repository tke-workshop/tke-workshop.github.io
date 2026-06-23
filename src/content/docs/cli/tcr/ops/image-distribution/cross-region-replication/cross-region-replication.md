---
title: "同实例多地域复制镜像（tccli）"
description: "· page_id `52095`"
---

> 对照官方：[同实例多地域复制镜像](https://cloud.tencent.com/document/product/1141/52095) · page_id `52095`

## 概述

通过 `tccli tcr CreateReplicationInstance` 为 TCR premium 实例在其他地域创建**从实例（Replication Instance）**。主实例与从实例共享同一域名和登录凭证，镜像推送至主实例后自动同步至各地域从实例，实现**单地域上传、多地域同步、就近内网拉取**。

> **规格限制**：仅 premium 实例支持。basic 实例调用 `CreateReplicationInstance` 返回 `UnsupportedOperation`——需先 `ModifyInstance --RegistryType premium` 升级，升级不可降级。

**与跨实例同步的核心差异**：

| 维度 | 同实例多地域复制（本页） | 跨实例（账号）同步 |
|------|---------------------------|-------------------|
| 实例关系 | 同一实例的主实例 + 从实例（唯一 `RegistryId`） | 两个独立实例（各自 `RegistryId`） |
| 域名 | 主/从共享同一域名 | 各自独立域名 |
| 推送方向 | 仅主实例可推送，从实例只读拉取 | 两侧均可推送 |
| 适用场景 | 同账号多地域只读分发、就近拉取 | 跨账号分发、灾备、多活推送 |

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId、secretKey、region 均已配置

# 3. 确认实例规格为 premium（basic/standard 不支持复制实例）
tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --output json \
  --filter "Registries[0].{RegistryId:RegistryId,RegistryType:RegistryType,Status:Status}"
# expected: RegistryType: "premium", Status: "Running"

# 4. 确认目标地域已开通 TCR
tccli tcr DescribeRegions --region <Region> --output json | jq '.Regions[] | select(.RegionName=="<TargetRegion>")'
# expected: RegionName 匹配，Status: "alluser"
```

### 计费说明

- 每个从实例在目标地域产生独立计费，费用与主实例规格相关
- 从实例删除后停止计费
- 主实例升级/premium 本身按量计费单价随 tier 提升

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 / 参数 | 幂等 |
|-----------|------------------|:--:|
| 查询从实例列表 | `DescribeReplicationInstances` | 是 |
| 新建从实例（选择目标地域） | `CreateReplicationInstance --ReplicationRegionId <RegionId>` | 否（重复创建同地域报错） |
| 查看创建进度 | `DescribeReplicationInstanceCreateTasks` | 是 |
| 查看同步状态 | `DescribeReplicationInstanceSyncStatus` | 是 |
| 删除从实例 | `DeleteReplicationInstance` | 否（删除后再次调用报 NotFound） |
| 升级至 premium（若当前为 basic/standard） | `ModifyInstance --RegistryType premium` | 否（已为 premium 时幂等） |

## 关键字段说明

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | 主实例 ID，形如 `tcr-nn8smeyj` | 实例不存在 → `ResourceNotFound` |
| `ReplicationRegionId` | Integer | 是 | 目标地域数字 ID，通过 `DescribeRegions` 获取（如 ap-shanghai=4, ap-beijing=8）。**注意不是 RegionName 字符串** | 传入非法值 → `InvalidParameter` 或 `InvalidParameter.ReplicationRegionId`；传入与主实例相同地域 → `InvalidParameter`（不支持同地域复制） |
| `ReplicationRegionName` | String | 否 | 目标地域名称，如 `ap-shanghai`。传入后 API 返回的 `ReplicationRegionName` 将包含此值 | — |

## 操作步骤

### 步骤1：确认实例为 premium 并查看现有从实例

```bash
tccli tcr DescribeReplicationInstances --RegistryId 'tcr-nn8smeyj' --region ap-guangzhou
```

**输出（premium 实例，无已创建的从实例）**：

```json
{
    "TotalCount": 0,
    "ReplicationRegistries": null,
    "RequestId": "d94482cb-5f85-43f3-80a5-f0263faff798"
}
```

> 若实例非 premium，`DescribeReplicationInstances` 仍正常返回 `TotalCount: 0` 和 `ReplicationRegistries: null`，但后续 `CreateReplicationInstance` 将报 `UnsupportedOperation`——需先升级。

### 步骤2：升级实例至 premium（如需要）

若当前实例为 basic 或 standard，需先执行升级：

```bash
tccli tcr ModifyInstance --RegistryId '<RegistryId>' --RegistryType premium --region <Region>
# expected: exit 0，返回 RequestId
```

轮询确认升级完成：

```bash
tccli tcr DescribeInstanceStatus --RegistryIds '["<RegistryId>"]' --region <Region> --output json \
  --filter "RegistryStatusSet[0].Status"
# expected: "Running"（升级约 30--60 秒）
```

### 步骤3：查询目标地域 RegionId

```bash
tccli tcr DescribeRegions --region ap-guangzhou --output json
```

**输出（截取关键条目）**：

```json
{
    "Regions": [
        {"Alias": "gz", "RegionId": 1, "RegionName": "ap-guangzhou", "Status": "alluser"},
        {"Alias": "sh", "RegionId": 4, "RegionName": "ap-shanghai", "Status": "alluser"},
        {"Alias": "bj", "RegionId": 8, "RegionName": "ap-beijing", "Status": "alluser"}
    ]
}
```

> 记录目标地域的 `RegionId`（整数），例如 `ap-shanghai` 对应 `4`。

### 步骤4：创建从实例

```bash
tccli tcr CreateReplicationInstance \
  --RegistryId 'tcr-nn8smeyj' \
  --ReplicationRegionId 4 \
  --region ap-guangzhou
```

**输出**：

```json
{
    "ReplicationRegistryId": "tcr-nn8smeyj-4-xxxxxxxx",
    "RequestId": "eac6b301-a322-493a-8e36-83b295459397"
}
```

> 记录返回的 `ReplicationRegistryId`（形如 `tcr-nn8smeyj-4-xxxxxxxx`），后续查询同步状态和删除均需此 ID。创建为异步操作。

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `tcr-nn8smeyj` | 主实例 RegistryId | 已存在、premium 规格、Status=Running | `DescribeInstances` |
| `4` | 目标地域 RegionId | 数字格式，与主实例地域不同 | `DescribeRegions` 查询目标地域的 `RegionId` |

### 步骤5：查看从实例创建进度

```bash
tccli tcr DescribeReplicationInstanceCreateTasks \
  --RegistryId 'tcr-nn8smeyj' \
  --ReplicationRegistryId 'tcr-nn8smeyj-4-xxxxxxxx' \
  --region ap-guangzhou --output json
```

**输出**：

```json
{
    "TaskDetail": [
        {
            "TaskName": "CreateReplication",
            "TaskUUID": "xxxx-xxxx-xxxx",
            "TaskStatus": "Succeed",
            "CreatedTime": "2026-05-24T17:09:41+08:00",
            "FinishedTime": "2026-05-24T17:10:11+08:00"
        }
    ],
    "Status": "Succeed",
    "RequestId": "109a280f-a11e-44d5-8741-9d3f213b06f2"
}
```

> 从实例创建通常约 30--60 秒完成。若 `Status` 为 `Running` 或 `InProgress`，等待后重新查询。

### 步骤6：查看从实例列表（确认创建）

```bash
tccli tcr DescribeReplicationInstances --RegistryId 'tcr-nn8smeyj' --region ap-guangzhou --output json
```

**输出**：

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "RegistryId": "tcr-nn8smeyj",
            "ReplicationRegistryId": "tcr-nn8smeyj-4-xxxxxxxx",
            "ReplicationRegionId": 4,
            "ReplicationRegionName": "ap-shanghai",
            "Status": "Running",
            "CreatedAt": "2026-05-24T17:09:41+08:00"
        }
    ],
    "RequestId": "70342808-5071-4971-ab62-c7a0b8a9bf09"
}
```

> `Status: "Running"` 表示从实例创建完成，可确认下一步同步逻辑。

### 步骤7：查看同步状态

```bash
tccli tcr DescribeReplicationInstanceSyncStatus \
  --RegistryId 'tcr-nn8smeyj' \
  --ReplicationRegistryId 'tcr-nn8smeyj-4-xxxxxxxx' \
  --region ap-guangzhou --output json
```

**输出**：

```json
{
    "ReplicationStatus": "Synced",
    "ReplicationTime": "2026-05-24T17:09:41+08:00",
    "RequestId": "2a416e2a-72e9-424d-8700-9dd5a3e7ae71"
}
```

> `ReplicationStatus: "Synced"` 表示主实例与从实例同步完成。若为 `Syncing`，表示同步进行中。

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 从实例已创建 | `DescribeReplicationInstances --RegistryId '<RegistryId>' --region <Region>` | `TotalCount >= 1`，`ReplicationRegistries` 含目标地域 |
| 从实例 Status 为 Running | 同上，检查 `ReplicationRegistries[].Status` | `"Running"` |
| 创建任务完成 | `DescribeReplicationInstanceCreateTasks` | `Status: "Succeed"` |
| 同步状态正常 | `DescribeReplicationInstanceSyncStatus` | `ReplicationStatus: "Synced"` |
| 主实例规格为 premium | `DescribeInstances --Registryids '["<RegistryId>"]'` | `RegistryType: "premium"` |

### 数据面

```bash
# 在源地域推送测试镜像至主实例
docker tag alpine:latest <RegistryDomain>/<Namespace>/test-replication:v1
docker push <RegistryDomain>/<Namespace>/test-replication:v1

# 从目标地域通过内网拉取（需目标地域有 VPC 接入）
docker pull <RegistryDomain>/<Namespace>/test-replication:v1
# expected: 拉取成功（证明同步已完成）
```

> 镜像同步为自动触发，推送后约 10--30 秒可在从实例地域拉取到相同镜像。

## 清理

> **警告：删除主实例前必须删除所有从实例**，否则 `DeleteInstance` 返回错误（提示 "has N replication registry"）。从实例删除不可逆。

### 1. 确认当前从实例列表

```bash
tccli tcr DescribeReplicationInstances --RegistryId 'tcr-nn8smeyj' --region ap-guangzhou --output json
# 记录所有待删除的 ReplicationRegistryId
```

### 2. 逐个删除从实例

```bash
tccli tcr DeleteReplicationInstance \
  --RegistryId 'tcr-nn8smeyj' \
  --ReplicationRegistryId 'tcr-nn8smeyj-4-xxxxxxxx' \
  --region ap-guangzhou --output json
# expected: exit 0，返回 RequestId
```

### 3. 验证全部删除

```bash
tccli tcr DescribeReplicationInstances --RegistryId 'tcr-nn8smeyj' --region ap-guangzhou --output json
# expected: TotalCount: 0, ReplicationRegistries: null
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateReplicationInstance` 返回 `UnsupportedOperation` | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --filter "Registries[0].RegistryType"` | 实例为 basic 或 standard，不支持复制实例 | `tccli tcr ModifyInstance --RegistryId <RegistryId> --RegistryType premium --region <Region>` 升级至 premium。升级不可降级，确认后操作 |
| `CreateReplicationInstance` 返回 `InvalidParameter` | 检查 `ReplicationRegionId` 是否为整数格式 | `ReplicationRegionId` 使用了 RegionName 字符串（如 `"ap-shanghai"`）而非数字 ID | 使用 `DescribeRegions` 查询目标地域的 `RegionId` 整数（如 ap-shanghai=4） |
| `CreateReplicationInstance` 返回 `InvalidParameter.ReplicationRegionId` | 同上 | 传入了不存在的地域 ID，或传入了与主实例相同的地域 | 使用 `DescribeRegions` 确认目标地域 `RegionId` 合法且不等于主实例所在地域 |
| `DeleteInstance` 返回错误（含 "has N replication registry"） | `DescribeReplicationInstances` 查看从实例列表 | 主实例下存在未删除的从实例 | 逐个执行 `DeleteReplicationInstance`，确认 `DescribeReplicationInstances` 返回 `TotalCount: 0` 后重试 |
| `DeleteReplicationInstance` 返回 `ResourceNotFound` | 确认 `ReplicationRegistryId` 是否已被删除或拼写错误 | 从实例不存在或已删除 | 检查 `ReplicationRegistryId` 拼写（形如 `tcr-nn8smeyj-4-xxxxxxxx`） |
| `DescribeReplicationInstanceCreateTasks` 返回 `ResourceNotFound` | 确认 `ReplicationRegistryId` | 创建任务已完成清理或 ReplicationRegistryId 不正确 | 通过 `DescribeReplicationInstances` 获取正确的 `ReplicationRegistryId` |

### 同步状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 同步状态持续 `Syncing` 超过 10 分钟 | `DescribeReplicationInstanceSyncStatus` 循环查询 | 大量镜像同步或网络延迟 | 等待完成；若持续超过 30 分钟，凭 `RequestId` [在线咨询](https://cloud.tencent.com/online-service?from=doc_1141) |
| 从实例 `Status: "Unhealthy"` | `DescribeReplicationInstances` 查看状态 | 目标地域存储或网络异常 | 若持续异常，删除后重新创建从实例 |

## 下一步

- [跨实例（账号）同步镜像](../cross-instance-sync)（page_id `41945`）——跨账号独立实例同步
- [销毁退还实例](../../delete)（page_id `51111`）——删除主实例前确保已清理从实例
- [访问配置](../../access/network/private-access)——配置目标地域 VPC 接入以实现内网拉取

## 控制台替代

[容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 选择 premium 实例 → **同步复制** → **新建从实例**，选择目标地域和规格后确认即开始创建。
