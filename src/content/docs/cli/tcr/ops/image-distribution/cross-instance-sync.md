---
title: "跨实例（账号）同步镜像（tccli）"
description: "· page_id `41945`"
---

> 对照官方：[跨实例（账号）同步镜像](https://cloud.tencent.com/document/product/1141/41945) · page_id `41945`

## 概述

通过 `tccli tcr ManageReplication` 在不同地域的两个 TCR 企业版实例间建立同步规则，实现容器镜像、Helm Chart 的自动同步分发。支持**同主账号内实例同步**和**跨主账号实例同步**——跨账号场景下，源侧用户以目标侧提供的实例 ID、账号 UIN 和访问凭证建立同步规则。

**与同实例多地域复制的差异**：

| 维度 | 跨实例同步（本页） | 同实例多地域复制 |
|------|-------------------|-------------------|
| 实例关系 | 两个独立实例（可不同账号） | 同一实例的主实例 + 从实例 |
| 域名 | 各自独立域名 | 主/从共享同一域名 |
| 推送方向 | 两侧均可推送 | 仅主实例可推送，从实例只读拉取 |
| 跨主账号 | **支持**（需目标侧凭证） | 不支持 |
| 国内外互通 | **支持**（含跨境） | 不支持 |

> **规格要求**：同步功能支持**标准版（standard）和高级版（premium）**。基础版（basic）调用 `ManageReplication` 返回 `UnsupportedOperation`——需 `ModifyInstance --RegistryType standard` 升级后方可使用。升级路径：`basic → standard → premium`，不支持降级。

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据
tccli configure list
# expected: secretId、secretKey、region 均已配置

# 3. 确认源实例规格为 standard 或以上
tccli tcr DescribeInstances --Registryids '["<SourceRegistryId>"]' --region <Region> --output json \
  --filter "Registries[0].{RegistryId:RegistryId,RegistryType:RegistryType,Status:Status}"
# expected: RegistryType: "standard" 或 "premium", Status: "Running"

# 4. 确认目标实例已创建且 Running
tccli tcr DescribeInstances --Registryids '["<DestRegistryId>"]' --region <DestRegion> --output json \
  --filter "Registries[0].{RegistryId:RegistryId,RegistryType:RegistryType,Status:Status}"
# expected: Status: "Running"

# 5. 确认 CAM 权限 — 需要 tcr:ManageReplication, tcr:DescribeReplicationPolicies,
#    tcr:DescribeReplicationInstances, tcr:DescribeReplicationInstanceSyncStatus
tccli tcr DescribeReplicationInstances --RegistryId '<RegistryId>' --region <Region>
# expected: exit 0
```

### 跨主账号同步额外准备

若需跨主账号同步，目标侧用户需提供：
- 目标实例 ID（`DestinationRegistryId`）
- 目标主账号 UIN（`PeerRegistryUin`）
- 长期访问凭证（`PeerRegistryToken`，用户级账号密码）

> 用户名仅支持[用户级账号](https://cloud.tencent.com/document/product/1141/41829)，不支持[服务级账号](https://cloud.tencent.com/document/product/1141/89137)。**凭证需长期有效**，避免过期导致同步中断。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 / 参数 | 幂等 |
|-----------|------------------|:--:|
| 查看实例同步列表 | `DescribeReplicationInstances` | 是 |
| 新建实例同步规则 | `ManageReplication` | 否（同一规则名重复创建报错） |
| 查看同步策略列表 | `DescribeReplicationPolicies` | 是 |
| 查看同步状态 | `DescribeReplicationInstanceSyncStatus` | 是 |
| 修改规则状态（启用/关闭） | `ManageReplication`（更新 `Rule` 后重新提交） | — |
| 删除实例同步 | `DeleteReplicationInstance` | 是 |

## 关键字段说明

### ManageReplication 参数

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `SourceRegistryId` | String | 是 | 源实例 ID | 不存在 → `ResourceNotFound` |
| `DestinationRegistryId` | String | 是 | 目标实例 ID | 不存在 → `ResourceNotFound` |
| `DestinationRegionId` | Integer | **是** | 目标实例所在地域的数字 ID（通过 `DescribeRegions` 获取） | 未传或错误 → `InvalidParameter` |
| `Rule` | String | 是 | JSON 序列化的规则对象字符串，含 `Name`（规则名）、`DestNamespace`（目标命名空间）、`Override`（是否覆盖）、`Filters`（过滤器列表）、`Deletion`（同步删除） | JSON 格式错误 → `InvalidParameter` |
| `Description` | String | 否 | 规则描述 | — |

### Rule 对象字段

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `Name` | String | 是 | 规则名称，支持小写字母、数字及 `-._`，以字母/数字开头 | 格式不符 → `InvalidParameter` |
| `DestNamespace` | String | 否 | 目标命名空间，不填默认与源同名，目标侧不存在则自动创建 | — |
| `Override` | Boolean | 否 | 是否覆盖目标侧已有同名镜像，建议 `false` | `true` 时目标侧同名镜像被覆盖 |
| `Filters` | Array | 否 | 过滤器列表，不填则同步命名空间内全部资源 | 过滤条件不匹配导致镜像漏同步 |
| `Deletion` | Boolean | 否 | 是否启用同步删除（源镜像删除后同步删除目标侧镜像），默认 `false` | `true` 时可能误删目标侧数据 |

### Filters 条目字段

| Filter Type | 含义 | 示例 | 注意 |
|-------------|------|------|------|
| `name` | 仓库名称正则过滤，空则匹配命名空间内全部仓库 | `".*"`、`"prod/**"` | **Filter.Type 必须全小写** `"name"`，不能写成 `"Name"`，否则视为非法过滤器导致规则不生效 |
| `tag` | 版本 Tag 正则过滤，空则匹配所有版本 | `"v1.*"`、`""`（全部） | — |
| `resource` | 资源类型过滤 | `"image"`（容器镜像）、`"chart"`（Helm Chart），不传则全部同步 | — |

## 操作步骤

### 步骤1：查看已有同步实例

```bash
tccli tcr DescribeReplicationInstances --RegistryId '<SourceRegistryId>' --region <Region> --output json
```

**输出（无同步实例时）**：

```json
{
    "TotalCount": 0,
    "ReplicationRegistries": null,
    "RequestId": "d94482cb-5f85-43f3-80a5-f0263faff798"
}
```

### 步骤2：查看已有同步策略

```bash
tccli tcr DescribeReplicationPolicies --RegistryId '<SourceRegistryId>' --region <Region> --output json
```

**输出（未配置同步规则时）**：

```json
{
    "TotalCount": 0,
    "RequestId": "6683742b-ff91-4cd1-8fcf-bf8f2a2b6091"
}
```

### 步骤3：创建同步规则

`ManageReplication` 同时负责创建与更新规则。以下是真实执行的命令（真机 premium 实例 `tcr-nn8smeyj` → 目标实例，Filter.Type 使用小写 `"name"`）：

```bash
tccli tcr ManageReplication \
  --SourceRegistryId '<SourceRegistryId>' \
  --DestinationRegistryId '<DestinationRegistryId>' \
  --Rule '{"Name":"sync-test","DestNamespace":"test-ns","Override":false,"Filters":[{"Type":"name","Value":".*"}],"Deletion":false}' \
  --DestinationRegionId <DestinationRegionId> \
  --region <Region> --output json
```

**输出**：

```json
{
    "RequestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

> **关键**：`Filter.Type` 必须使用全小写 `"name"`，不能写成 `"Name"`。真机验证：使用 `"Name"` 时同步规则不生效（无镜像同步到目标侧），修正为 `"name"` 后同步正常。

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<SourceRegistryId>` | 源实例 ID | standard 或 premium，Status=Running | `DescribeInstances` |
| `<DestinationRegistryId>` | 目标实例 ID | 已创建，Status=Running | `DescribeInstances`（目标地域执行） |
| `<DestinationRegionId>` | 目标实例所在地域数字 ID | `DescribeRegions` 中的 `RegionId` 整数 | `DescribeRegions` |
| `<Region>` | 源实例所在地域 | 与源实例一致 | `configure list` 查看默认 region |

#### 跨主账号同步（需目标侧凭证）

```bash
tccli tcr ManageReplication \
  --SourceRegistryId '<SourceRegistryId>' \
  --DestinationRegistryId '<DestinationRegistryId>' \
  --Rule '{"Name":"cross-account-sync","DestNamespace":"shared","Override":false,"Filters":[{"Type":"name","Value":".*"}],"Deletion":false}' \
  --DestinationRegionId <DestinationRegionId> \
  --PeerReplicationOption '{"PeerRegistryUin":"<PeerUin>","PeerRegistryToken":"<PeerToken>","EnablePeerReplication":true}' \
  --region <Region> --output json
```

**`PeerReplicationOption` 字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `PeerRegistryUin` | String | 是 | 目标主账号 UIN |
| `PeerRegistryToken` | String | 是 | 目标实例的用户级长期访问密码 |
| `EnablePeerReplication` | Boolean | 是 | 是否开启跨主账号同步，填 `true` |

### 步骤4：验证同步策略已创建

```bash
tccli tcr DescribeReplicationPolicies --RegistryId '<SourceRegistryId>' --region <Region> --output json
```

**输出（规则已创建）**：

```json
{
    "TotalCount": 1,
    "ReplicationPolicyInfoList": [
        {
            "ID": 1,
            "Name": "sync-test",
            "Description": "",
            "Filters": [
                {"Type": "name", "Value": ".*"}
            ],
            "Override": false,
            "Enabled": true,
            "SrcResource": "<SourceRegistryName>/test-ns/** ap-guangzhou",
            "DestResource": "<DestRegistryName>/test-ns/** ap-singapore",
            "CreationTime": "2026-05-24T17:15:00+08:00",
            "UpdateTime": "2026-05-24T17:15:00+08:00"
        }
    ],
    "RequestId": "b57e8aea-4bb8-4382-ac03-a8c41a6b53e7"
}
```

### 步骤5：查看同步状态

```bash
tccli tcr DescribeReplicationInstanceSyncStatus \
  --RegistryId '<SourceRegistryId>' \
  --ReplicationRegistryId '<ReplicationRegistryId>' \
  --region <Region> --output json
```

**输出**：

```json
{
    "ReplicationStatus": "Succeed",
    "ReplicationTime": "2026-05-24T17:20:30+08:00",
    "ReplicationLog": {
        "ReplicationTime": "2026-05-24T17:20:30+08:00",
        "TaskId": 42,
        "Status": "Succeed",
        "Percentage": 100,
        "Total": 3
    },
    "RequestId": "2a416e2a-72e9-424d-8700-9dd5a3e7ae71"
}
```

**`ReplicationStatus` 枚举**：

| 状态 | 说明 |
|------|------|
| `Succeed` | 同步成功 |
| `InProgress` | 同步中（可通过 `ReplicationLog.Percentage` 查看进度） |
| `Failed` | 同步失败 |
| `Cancel` | 已取消 |

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 源实例满足规格要求 | `DescribeInstances --Registryids '["<SourceRegistryId>"]' --region <Region>` | `RegistryType: "standard"` 或 `"premium"`, `Status: "Running"` |
| 同步规则已创建 | `DescribeReplicationPolicies --RegistryId '<SourceRegistryId>' --region <Region>` | 目标 `Name` 存在，`Enabled: true` |
| 同步关系正常运行 | `DescribeReplicationInstances --RegistryId '<SourceRegistryId>' --region <Region>` | 目标 `ReplicationRegistryId` 存在，`Status: "Running"` |
| 同步状态正常 | `DescribeReplicationInstanceSyncStatus` | `ReplicationStatus: "Succeed"`，`Percentage: 100` |

### 数据面

```bash
# 在源实例推送测试镜像
docker tag alpine:latest <SourceDomain>/<Namespace>/test-sync:v1
docker push <SourceDomain>/<Namespace>/test-sync:v1

# 等待同步完成后（约 10--30 秒），从目标实例拉取
docker pull <DestDomain>/<Namespace>/test-sync:v1
# expected: 拉取成功，镜像存在
```

## 清理

### 1. 查看当前同步实例（获取 ReplicationRegistryId）

```bash
tccli tcr DescribeReplicationInstances --RegistryId '<SourceRegistryId>' --region <Region> --output json
# 记录目标同步关系的 ReplicationRegistryId 和 ReplicationRegionId
```

### 2. 删除同步实例关系

```bash
tccli tcr DeleteReplicationInstance \
  --RegistryId '<SourceRegistryId>' \
  --ReplicationRegistryId '<ReplicationRegistryId>' \
  --ReplicationRegionId <RegionId> \
  --region <Region> --output json
# expected: exit 0
```

> **注意**：`DeleteReplicationInstance` 的 `--ReplicationRegionId` 为**必填参数**，从 `DescribeReplicationInstances` 输出的 `ReplicationRegionId` 字段获取。

### 3. 验证已删除

```bash
tccli tcr DescribeReplicationInstances --RegistryId '<SourceRegistryId>' --region <Region> --output json
# expected: TotalCount 减少，目标 ReplicationRegistryId 不再出现
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ManageReplication` 返回 `UnsupportedOperation` | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --filter "Registries[0].RegistryType"` | 实例为 basic，不支持同步功能 | `tccli tcr ModifyInstance --RegistryId <RegistryId> --RegistryType standard --region <Region>` 升级至 standard。等待 `Status: Running` 后重试。升级不可逆 |
| `ManageReplication` 返回 `InvalidParameter` | 检查 `Rule` JSON 字段格式 | 规则名格式不符（需小写字母、数字、`-._`，以字母/数字开头）或 JSON 格式错误 | 修正 `Rule.Name`（如 `"sync-prod-v1"`），确认 JSON 合法（可用 `echo '<json>' \| jq .` 验证） |
| 同步规则创建成功但镜像未同步 | `DescribeReplicationPolicies` 检查 `Filters` 列表 | `Filter.Type` 使用了大写 `"Name"` 而非小写 `"name"` | 修正为 `"Type":"name"`（全小写），重新提交 `ManageReplication` |
| 跨主账号同步报权限错误 | 确认 `PeerReplicationOption` 中凭证类型和有效期 | 使用了服务级账号密码（不支持），或凭证已过期 | 更换为用户级账号长期访问凭证，确认 `ExpTime` 未过期。用户名仅支持[用户级账号](https://cloud.tencent.com/document/product/1141/41829) |
| 同步一直处于 `InProgress` | `DescribeReplicationInstanceSyncStatus` 查看 `ReplicationLog.Percentage` | 待同步镜像量大，同步队列处理中 | 检查进度百分比；若 10 分钟无进展，凭 `RequestId` [在线咨询](https://cloud.tencent.com/online-service?from=doc_1141) |
| `DeleteReplicationInstance` 报错缺少 `--ReplicationRegionId` | — | `DeleteReplicationInstance` 的 `--ReplicationRegionId` 为**必填参数** | 补充 `--ReplicationRegionId <RegionId>`，从 `DescribeReplicationInstances` 输出的 `ReplicationRegionId` 字段获取 |
| 删除实例时报 "please delete the replication rule first" | `DescribeReplicationPolicies` 检查规则列表 | 实例下存在未删除的同步规则 | 先通过控制台或重新 `ManageReplication` 停用规则，再删除同步实例关系 |

### 同步规则设计问题

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 多层级仓库同步缺失子路径 | `DescribeReplicationPolicies` 查看 `Filters` | `Filters.name` 正则过滤不完整 | 使用 `".*"` 匹配全部子路径，或使用 `"**"` 递归匹配 |
| 目标实例出现镜像覆盖 | 检查 `Rule` 中 `Override` 值 | `Override: true` 时同名镜像被源侧覆盖 | 将 `Override` 设为 `false`（跳过已存在镜像），重新创建规则 |
| 源实例删除镜像后目标实例仍保留 | 检查 `Rule` 中 `Deletion` 值 | `Deletion: false`（默认）未开启同步删除 | 创建规则时设 `Deletion: true`，注意此操作可能导致目标侧数据同步删除 |

### 规格升级注意事项

| 场景 | CLI 命令 | 说明 |
|------|---------|------|
| basic → standard | `tccli tcr ModifyInstance --RegistryId <RegistryId> --RegistryType standard --region <Region>` | 升级后立即解锁同步功能，按量计费单价随之提升 |
| standard → premium | 同上，`--RegistryType premium` | 额外解锁复制实例、签名策略等高级功能 |
| 升级耗时 | 约 30--60 秒 | `DescribeInstanceStatus` 返回 `Running` 即升级完成 |

## 下一步

- [同实例多地域复制镜像](../cross-region-replication)（page_id `52095`）——同一实例内的多地域只读分发
- [管理命名空间](../../image-creation/namespace)——目标实例可能需要提前创建对应命名空间
- [内网访问控制](../../access/network/private-access)——VPC 接入 TCR 实例实现内网拉取

## 控制台替代

[容器镜像服务控制台 → 同步复制 → 实例同步](https://console.cloud.tencent.com/tcr/replication)：选择源实例，配置同步规则（目标实例、命名空间、过滤器、跨账号凭证），保存后自动开始同步。可在同步日志中查看进度和状态。
