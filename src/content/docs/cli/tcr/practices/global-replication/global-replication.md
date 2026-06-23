---
title: "全球多地域间同步镜像实现就近访问"
description: "· page_id `61458`"
---

> 对照官方：[全球多地域间同步镜像实现就近访问](https://cloud.tencent.com/document/product/1141/61458) · page_id `61458`

## 概述

企业将容器业务拓展至多个地域时，需要实现容器镜像的全球多地域同步与就近拉取，以提高拉取速度、降低跨地域公网流量成本。TCR 企业版提供两项互补能力：

| 能力 | 说明 | 规格要求 |
|------|------|---------|
| **实例同步** | 多个实例间按需自动同步指定镜像，支持跨主账号 | 标准版及以上 |
| **实例复制** | 单一实例在多个地域部署只读副本，统一域名，实时流式同步 | 仅高级版 |

**方案对比：**

| 维度 | 实例同步 | 实例复制 |
|------|---------|---------|
| 同步范围 | 按需（基于规则精确匹配） | 全量（推送后全部复制） |
| 推送能力 | 每个实例均可推送 | 仅主实例可推送 |
| 域名 | 各实例独立域名 | 统一域名 |
| 跨主账号 | 支持 | 不支持 |
| Helm Chart 筛选 | 支持 | 全量复制 |
| 跨国 | 支持 | 不支持 |

> **结合自定义域名：** TCR 企业版支持自定义域名，结合 DNS 服务可实现多个实例共用同一域名，增强就近访问的灵活性。参见[配置自定义域名](../../ops/access/domain/custom-domain)。

## 前置条件

- [环境准备](../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:DescribeInstances, tcr:CreateInstance, tcr:ManageReplication
#    tcr:CreateReplicationInstance, tcr:DescribeReplicationInstances
#    tcr:DescribeReplicationInstanceCreateTasks
#    tcr:DescribeReplicationInstanceSyncStatus
#    tcr:CreateInstanceCustomizedDomain, tcr:DescribeInstanceCustomizedDomain
#    ssl:DescribeCertificates, ssl:UploadCertificate
# 验证：执行 DescribeInstances 确认权限
tccli tcr DescribeInstances --region <Region>
# expected: exit 0，返回实例列表（可为空）

# 4. 验证 SSL 证书权限（如使用自定义域名）
tccli ssl DescribeCertificates --region <Region>
# expected: exit 0，返回证书列表（可为空）
```

### 资源检查

```bash
# 5. 确认源实例存在且状态正常（实例同步方案）
tccli tcr DescribeInstances --region <Region> --Registryids '["<SourceRegistryId>"]'
# expected: exit 0, Status: "Running", RegistryType: "standard" 或 "premium"

# 6. 确认目标实例存在且状态正常（实例同步方案）
tccli tcr DescribeInstances --region <Region> --Registryids '["<DestRegistryId>"]'
# expected: exit 0, Status: "Running"

# 7. 确认主实例为高级版（实例复制方案）
tccli tcr DescribeInstances --region <Region> --Registryids '["<RegistryId>"]'
# expected: exit 0, RegistryType: "premium", Status: "Running"
```

### 版本与规格选择

- 实例同步：源实例和目标实例均需标准版（`standard`）及以上。基础版（`basic`）不支持同步规则。
- 实例复制：主实例必须为高级版（`premium`）。标准版需先升级：`tccli tcr ModifyInstance --RegistryId <RegistryId> --RegistryType premium --region <Region>`
- 实例复制不支持跨国部署，主实例与复制实例须在同一国家/区域内。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看 TCR 实例列表 | `DescribeInstances` | 是 |
| 创建企业版实例 | `CreateInstance` | 否 |
| 创建同步规则 | `ManageReplication` | 否（覆盖同名规则） |
| 查看同步策略列表 | `DescribeReplicationPolicies` | 是 |
| 查看同步状态 | `DescribeReplicationInstanceSyncStatus` | 是 |
| 删除同步规则 | `DeleteReplicationRule` | 是 |
| 创建复制实例 | `CreateReplicationInstance` | 否（同地域重复创建报错） |
| 查看复制实例列表 | `DescribeReplicationInstances` | 是 |
| 查看复制实例创建进度 | `DescribeReplicationInstanceCreateTasks` | 是 |
| 删除复制实例 | `DeleteReplicationInstance` | 是 |
| 查看自定义域名 | `DescribeInstanceCustomizedDomain` | 是 |
| 添加自定义域名 | `CreateInstanceCustomizedDomain` | 否（重名报错） |
| 删除自定义域名 | `DeleteInstanceCustomizedDomain` | 是 |

## 关键字段说明

### `CreateInstance`

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryName` | String | 是 | 2-30 字符，小写字母/数字/连字符，以小写字母开头 | `InvalidParameterValue` |
| `RegistryType` | String | 是 | `basic`（基础版）/ `standard`（标准版）/ `premium`（高级版） | `InvalidParameterValue` |
| `RegistryChargePrepaid.Period` | Integer | 条件必填 | 1-36（月），`standard`/`premium` 时必填 | `InvalidParameterValue` |
| `RegistryChargePrepaid.RenewFlag` | Integer | 条件必填 | 0（手动续费）/ 1（自动续费）/ 2（不续费） | `InvalidParameterValue` |
| `TagSpecification` | Object | 否 | 标签列表 `[{"ResourceType":"instance","Tags":[{"Key":"k","Value":"v"}]}]` | 标签创建失败不影响实例创建 |

### `ManageReplication`

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `SourceRegistryId` | String | 是 | 源实例 ID，由 `DescribeInstances` 返回 | 实例不存在返回 `FailedOperation` |
| `DestinationRegistryId` | String | 是 | 目标实例 ID，由 `DescribeInstances` 返回 | 实例不存在返回 `FailedOperation` |
| `Rule.Name` | String | 是 | 规则名称，同实例内不可重名 | 重名返回 `FailedOperation` |
| `Rule.DestNamespace` | String | 是 | 目标命名空间名，须在目标实例中已存在 | 命名空间不存在则同步失败（运行时） |
| `Rule.Override` | Boolean | 否 | 是否覆盖同名镜像，默认 `false` | 设为 `false` 时同名镜像不覆盖可能导致版本不一致 |
| `Rule.Filters` | Array | 否 | 同步过滤器，支持按名称、标签、资源类型筛选。省略则同步命名空间下全部资源 | 过滤器不匹配导致预期镜像未同步 |
| `Rule.Filters[].Type` | String | 否 | `name`（镜像名）/ `tag`（标签）/ `resource`（`image` / `chart`） | 错误类型值返回 `InvalidParameter` |
| `Rule.Filters[].Value` | String | 否 | 过滤值，支持通配符 `**`（多级）和 `*`（单级） | 通配符过宽可能导致大量非预期镜像被同步 |
| `Rule.Deletion` | Boolean | 否 | 是否同步删除操作，默认 `false` | 设为 `true` 时源端删除会级联删除目标端镜像 |
| `Description` | String | 否 | 规则描述，最大 100 字符 | 空值不影响创建 |
| `PeerReplicationOption` | Object | 否 | 跨主账号同步配置，同账号不填 | 跨账号同步时缺失此字段返回权限错误 |

### `CreateReplicationInstance`

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | 主实例 ID，须为高级版（`premium`） | 非高级版返回 `UnsupportedOperation` |
| `ReplicationRegionId` | Integer | 是 | 目标地域数字 ID（如广州=1、上海=4、北京=8） | 不合法地域 ID 返回 `InvalidParameter` |
| `ReplicationRegionName` | String | 是 | 目标地域名称（如 `ap-shanghai`） | 与 ReplicationRegionId 不匹配可能导致路由异常 |
| `SyncTag` | Boolean | 否 | 是否同步 Tag 信息，默认 `true` | 对功能影响小，设为 `false` 时部分 Tag 场景受限 |

## 操作步骤

### 方案一：实例同步（标准版及以上）

多个独立的 TCR 实例之间按需同步指定镜像。适用于跨主账号、按需筛选、跨国同步等场景。

> 实例创建详情参见[创建企业版实例](../../ops/instances/create)。以下提供 CLI 方式快速创建，含最小和增强两种配置。

#### 步骤 1：创建源实例和目标实例

##### 选择依据

- **RegistryType**：实例同步至少需要标准版（`standard`）。选择 `standard` 而非 `basic`，因为标准版支持跨主账号同步规则。若仅需同账号同步且成本敏感，可使用 `basic`。
- **Period**：选择 1 个月（`1`），最小预付费周期，降低验证成本。
- **RenewFlag**：推荐 `0`（手动续费），避免验证期后自动扣费。生产环境可设为 `1`（自动续费）防止过期。

##### 最小配置

仅含必填字段。`create-instance-minimal.json`：

```json
{
  "RegistryName": "<RegistryName>",
  "RegistryType": "standard",
  "RegistryChargePrepaid": {
    "Period": 1,
    "RenewFlag": 0
  }
}
```

##### 增强配置

含可选字段。`create-instance-enhanced.json`：

```json
{
  "RegistryName": "<RegistryName>",
  "RegistryType": "standard",
  "RegistryChargePrepaid": {
    "Period": 1,
    "RenewFlag": 0
  },
  "TagSpecification": {
    "ResourceType": "instance",
    "Tags": [
      {"Key": "Project", "Value": "multi-region-sync"},
      {"Key": "Env", "Value": "poc"}
    ]
  }
}
```

##### 执行创建

```bash
# 在源地域创建源实例
tccli tcr CreateInstance \
    --cli-input-json file://create-instance-minimal.json \
    --region <Region>

# 在目标地域创建目标实例
tccli tcr CreateInstance \
    --cli-input-json file://create-instance-minimal.json \
    --region <Region>
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `RegistryName` | 实例名称 | 2-30 字符，小写字母/数字/连字符，以小写字母开头 | 自定义 |
| `REGION` | 地域 | 如 `ap-guangzhou`、`ap-singapore` | `tccli tcr DescribeInstances` 查看已有实例地域 |

记录返回的 `RegistryId`，以下分别记为 `<SourceRegistryId>` 和 `<DestRegistryId>`。

##### 轮询确认实例就绪

```bash
tccli tcr DescribeInstances \
    --Registryids '["<SourceRegistryId>"]' \
    --region <Region>
# expected: exit 0, Status: "Running", RegistryType: "standard" 或 "premium"
```

**预期输出**：

```json
{
  "TotalCount": 1,
  "Registries": [
    {
      "RegistryId": "<SourceRegistryId>",
      "RegistryName": "<RegistryName>",
      "RegistryType": "standard",
      "Status": "Running",
      "PublicDomain": "<RegistryName>.tencentcloudcr.com",
      "RegionName": "ap-guangzhou",
      "InternalEndpoint": "<InternalEndpointIp>"
    }
  ],
  "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

验证维度：

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 状态 | `Status` | `Running` |
| 规格 | `RegistryType` | `standard`（与创建参数一致） |
| 域名 | `PublicDomain` | 非空（用于后续 docker 操作） |
| 内网 | `InternalEndpoint` | 非空 |

#### 步骤 2：配置实例同步规则

在源实例上创建同步规则，将指定镜像同步至目标实例。

##### 选择依据

- **Rule.Override**：推荐设为 `true`，确保目标镜像与源端严格一致。设为 `false` 时若目标已有同名镜像则不覆盖，可能造成版本漂移。
- **Rule.Filters**：建议至少添加 `resource: image` 过滤以减少非预期同步。若无特殊需求，使用 `name: **` 同步全部镜像。
- **Rule.Deletion**：推荐默认 `false`（不同步删除）。设为 `true` 时源端删除操作会级联删除目标镜像，存在误删风险。
- **PeerReplicationOption**：仅跨主账号时需要。跨账号同步须使用用户级账号密码（不支持服务级账号）。

##### 同主账号 — 最小配置

仅含必填字段。`sync-rule-minimal.json`：

```json
{
  "SourceRegistryId": "<SourceRegistryId>",
  "DestinationRegistryId": "<DestRegistryId>",
  "Rule": {
    "Name": "<RuleName>",
    "DestNamespace": "<DestNamespace>"
  },
  "Description": "<描述信息>"
}
```

##### 同主账号 — 增强配置

含可选字段（Filters、Override、Deletion）。`sync-rule-enhanced.json`：

```json
{
  "SourceRegistryId": "<SourceRegistryId>",
  "DestinationRegistryId": "<DestRegistryId>",
  "Rule": {
    "Name": "<RuleName>",
    "DestNamespace": "<DestNamespace>",
    "Override": true,
    "Filters": [
      {
        "Type": "name",
        "Value": "production/**"
      },
      {
        "Type": "tag",
        "Value": "release-*"
      },
      {
        "Type": "resource",
        "Value": "image"
      }
    ],
    "Deletion": false
  },
  "Description": "<描述信息>"
}
```

##### 跨主账号 — 增强配置

当目标实例位于不同主账号下时使用。`sync-rule-cross-account.json`：

```json
{
  "SourceRegistryId": "<SourceRegistryId>",
  "DestinationRegistryId": "<DestRegistryId>",
  "Rule": {
    "Name": "<RuleName>",
    "DestNamespace": "<DestNamespace>",
    "Override": false,
    "Filters": [
      {
        "Type": "name",
        "Value": "base/**"
      },
      {
        "Type": "resource",
        "Value": "image"
      }
    ]
  },
  "PeerReplicationOption": {
    "PeerRegistryUin": "<目标主账号UIN>",
    "PeerRegistryToken": "<目标实例长期访问凭证>",
    "EnablePeerReplication": true
  },
  "Description": "跨主账号基础镜像共享"
}
```

> **注意**：跨主账号同步需使用[用户级账号](https://cloud.tencent.com/document/product/1141/41829)密码，不支持服务级账号。同步规则生命周期与目标账号最新添加规则的凭证生命周期保持一致。

##### 执行创建

```bash
tccli tcr ManageReplication \
    --cli-input-json file://sync-rule-enhanced.json \
    --region <Region>
# expected: exit 0，返回 RequestId
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `SourceRegistryId` | 源实例 ID | 由 CreateInstance 返回，格式 `tcr-xxxxxxxx` | 上一步创建实例时记录 |
| `DestRegistryId` | 目标实例 ID | 同上 | 上一步创建实例时记录 |
| `RuleName` | 同步规则名称 | 同实例内不可重名 | 自定义 |
| `DestNamespace` | 目标命名空间 | 须在目标实例中已存在 | 在目标实例中预先创建 |

**预期输出**：

```json
{
  "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

##### 轮询 + 多维度验证

```bash
tccli tcr DescribeReplicationPolicies \
    --RegistryId <SourceRegistryId> \
    --region <Region>
# expected: exit 0, TotalCount >= 1, Enabled: true
```

验证维度：

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 规则存在 | `TotalCount` | >= 1 |
| 启用状态 | `ReplicationPolicyInfoList[].Enabled` | `true` |
| 名称匹配 | `ReplicationPolicyInfoList[].Name` | 与创建时指定的 RuleName 一致 |
| 过滤器 | `ReplicationPolicyInfoList[].Filters` | 与创建时指定的 Filters 一致 |

**预期输出**：

```json
{
  "TotalCount": 1,
  "ReplicationPolicyInfoList": [
    {
      "ID": 2,
      "Name": "<RuleName>",
      "Enabled": true,
      "SrcResource": "<RegistryName>/.* ap-guangzhou",
      "DestResource": "<DestRegistryId>/<DestNamespace> ap-shanghai",
      "Filters": [
        {"Type": "name", "Value": "production/**"},
        {"Type": "tag", "Value": "release-*"},
        {"Type": "resource", "Value": "image"}
      ],
      "Override": true
    }
  ],
  "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

触发方式说明：
- **事件驱动**：源实例推送新镜像后自动触发同步
- **手动触发**：前往控制台 [同步复制 → 实例同步](https://console.cloud.tencent.com/tcr/replication) 手动执行

#### 步骤 3：查询同步状态

```bash
tccli tcr DescribeReplicationInstanceSyncStatus \
    --RegistryId <SourceRegistryId> \
    --ReplicationRegistryId <DestRegistryId> \
    --ShowReplicationLog true \
    --region <Region>
# expected: exit 0, ReplicationStatus: "Succeed"
```

**预期输出**：

```json
{
  "ReplicationStatus": "Succeed",
  "ReplicationLog": [
    {
      "ResourceType": "image",
      "SourceResource": "<RegistryName>.tencentcloudcr.com/production/app:release-v1.0",
      "DestinationResource": "<DestRegistryName>.tencentcloudcr.com/production/app:release-v1.0",
      "Status": "Succeed",
      "StartTime": "2026-01-01T00:00:00+08:00",
      "EndTime": "2026-01-01T00:01:00+08:00"
    }
  ],
  "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

### 方案二：实例复制（仅高级版）

在高级版主实例上创建多地域只读副本，推送至主实例后全量自动复制到各副本，各地域就近拉取。

> **规格要求**：此方案仅适用于高级版（`premium`）实例。确认实例类型为 `premium` 后方可执行。

#### 升级至高级版（如当前实例为 basic 或 standard）

若实例非高级版，可通过 `ModifyInstance` 升级：

```bash
tccli tcr ModifyInstance \
    --RegistryId <RegistryId> \
    --RegistryType premium \
    --region <Region>
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

升级后轮询确认规格变更：

```bash
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region>
# expected: exit 0, RegistryType: "premium", Status: "Running"
```

> 升级为实例元数据变更，通常秒级完成。若状态仍为 `standard`，等待数秒后重试。

#### 步骤 1：确认主实例为高级版

```bash
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region>
# expected: exit 0, RegistryType: "premium", Status: "Running"
```

**预期输出**：

```json
{
  "TotalCount": 1,
  "Registries": [
    {
      "RegistryId": "<RegistryId>",
      "RegistryName": "<RegistryName>",
      "RegistryType": "premium",
      "Status": "Running",
      "PublicDomain": "<RegistryName>.tencentcloudcr.com",
      "RegionName": "ap-guangzhou",
      "InternalEndpoint": "<InternalEndpointIp>",
      "DeletionProtection": false
    }
  ],
  "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

确认 `RegistryType` 为 `"premium"`。

#### 步骤 2：创建复制实例

在目标地域创建只读副本。

##### 选择依据

- **ReplicationRegionId / ReplicationRegionName**：选择业务就近地域。国内推荐上海（4）、北京（8），海外推荐新加坡（9）、硅谷（15）。注意实例复制不支持跨国，主实例所在地域与复制地域须在同一国家/区域内。
- **SyncTag**：推荐保持默认 `true`，确保 Tag 信息完整同步。对成本无影响。

##### 最小配置

仅含必填字段。`create-replication-minimal.json`：

```json
{
  "RegistryId": "<RegistryId>",
  "ReplicationRegionId": 4,
  "ReplicationRegionName": "ap-shanghai"
}
```

##### 增强配置

含可选字段。`create-replication-enhanced.json`：

```json
{
  "RegistryId": "<RegistryId>",
  "ReplicationRegionId": 4,
  "ReplicationRegionName": "ap-shanghai",
  "SyncTag": true
}
```

常用地域 ID 参考：

| 地域名称 | RegionId | 地域名称 | RegionId |
|---------|----------|---------|----------|
| ap-shanghai | 4 | ap-nanjing | 33 |
| ap-guangzhou | 1 | ap-beijing | 8 |
| ap-chengdu | 16 | ap-singapore | 9 |
| na-siliconvalley | 15 | na-ashburn | 22 |
| eu-frankfurt | 17 | ap-hongkong | 5 |

##### 执行创建

```bash
tccli tcr CreateReplicationInstance \
    --cli-input-json file://create-replication-minimal.json \
    --region <Region>
# expected: exit 0，返回 ReplicationRegistryId
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `RegistryId` | 主实例 ID | 须为高级版（premium） | `tccli tcr DescribeInstances` |

记录返回的 `ReplicationRegistryId`（格式如 `<RegistryId>-4-xxxxx`），用于后续轮询和清理。

一次可创建多个复制实例（不同地域不互斥）。如需覆盖多个地域，重复执行上述命令，替换 `ReplicationRegionId` 和 `ReplicationRegionName`。

##### 轮询 + 多维度验证

复制实例创建是异步操作，需轮询确认完成：

```bash
tccli tcr DescribeReplicationInstanceCreateTasks \
    --ReplicationRegistryId <ReplicationRegistryId> \
    --ReplicationRegionId 4 \
    --region <Region>
# expected: exit 0, Status: "SUCCESS"
```

验证维度：

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 整体状态 | `Status` | `SUCCESS` |
| 任务状态 | `TaskDetail[0].TaskStatus` | `SUCCESS` |
| 任务名称 | `TaskDetail[0].TaskName` | `CreateReplication` |
| 完成时间 | `TaskDetail[0].FinishedTime` | 非空（表示任务已结束） |

**预期输出**：

```json
{
  "Status": "SUCCESS",
  "TaskDetail": [
    {
      "TaskName": "CreateReplication",
      "TaskUUID": "task-00000000-0000-0000-0000-000000000000",
      "TaskStatus": "SUCCESS",
      "TaskMessage": "",
      "CreatedTime": "2026-01-01T00:00:00+08:00",
      "FinishedTime": "2026-01-01T00:01:00+08:00"
    }
  ],
  "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

#### 步骤 3：确认复制实例状态

```bash
tccli tcr DescribeReplicationInstances \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: exit 0, ReplicationRegistries 中 Status: "Running"
```

**预期输出**：

```json
{
  "TotalCount": 1,
  "ReplicationRegistries": [
    {
      "ReplicationRegistryId": "<ReplicationRegistryId>",
      "ReplicationRegionId": 4,
      "ReplicationRegionName": "ap-shanghai",
      "Status": "Running"
    }
  ],
  "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

`Status: "Running"` 表示复制实例已就绪，可开始使用。

### 自定义域名就近访问（可选）

TCR 企业版支持自定义域名，结合 DNS 就近解析实现多实例统一入口。详见[配置自定义域名](../../ops/access/domain/custom-domain)。

#### 步骤 1：上传 SSL 证书

自定义域名需绑定 SSL 证书。若无现有证书，可通过 `tccli ssl` 上传自签名证书。

##### 选择依据

- **CertificateType**：固定选 `SVR`（服务器证书），TCR 自定义域名只接受服务器证书类型。
- **Alias**：推荐使用有业务含义的别名，便于在证书列表（`DescribeCertificates`）中识别。

##### 最小配置

仅含必填字段。`upload-cert-minimal.json`：

```json
{
  "CertificatePublicKey": "<证书公钥（PEM格式）>",
  "CertificatePrivateKey": "<证书私钥（PEM格式）>",
  "CertificateType": "SVR"
}
```

##### 增强配置

含可选字段。`upload-cert-enhanced.json`：

```json
{
  "CertificatePublicKey": "<证书公钥（PEM格式）>",
  "CertificatePrivateKey": "<证书私钥（PEM格式）>",
  "CertificateType": "SVR",
  "Alias": "<证书别名>"
}
```

##### 生成自签名证书（POC / 无正式证书场景）

若无 CA 签发的正式证书，可用 openssl 生成自签名证书用于 POC 验证。**生产环境请使用 CA 签发的正式证书。**

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout tcr-domain.key \
    -out tcr-domain.crt \
    -days 365 \
    -subj "/CN=<your-custom-domain>"
# expected: exit 0，生成 tcr-domain.key（私钥）和 tcr-domain.crt（证书）
```

> 生成的证书为 PEM 格式，可直接用于 `CertificatePublicKey` 和 `CertificatePrivateKey` 参数。`-days 365` 为有效天数，可按需调整。

##### 执行上传

```bash
tccli ssl UploadCertificate \
    --cli-input-json file://upload-cert-minimal.json \
    --region <Region>
# expected: exit 0，返回 CertificateId
```

**预期输出**：

```json
{
  "CertificateId": "<CertificateId>",
  "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

记录返回的 `CertificateId`。

#### 步骤 2：添加自定义域名

##### 选择依据

- **DomainName**：使用已完成 ICP 备案的域名（境内实例）或境外域名（境外实例）。域名须与 SSL 证书中绑定的一致。
- **CertificateId**：使用上一步上传或购买的 SSL 证书 ID，确保证书已签发且绑定了目标域名。

此操作仅 3 个必填参数（`RegistryId`、`DomainName`、`CertificateId`），含义显然，单层配置即可。

```bash
tccli tcr CreateInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --DomainName <your-custom-domain> \
    --CertificateId <CertificateId> \
    --region <Region>
# expected: exit 0，返回 RequestId
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `RegistryId` | TCR 实例 ID | 须为已存在的实例 | `tccli tcr DescribeInstances` |
| `your-custom-domain` | 自定义域名 | 已完成 ICP 备案（境内），域名须与 SSL 证书一致 | 自行准备 |
| `CertificateId` | SSL 证书 ID | 已签发的服务器证书 | 上一步 UploadCertificate 返回 |

##### 轮询 + 多维度验证

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: exit 0, DomainInfoList 中 Status: "SUCCESS"
```

验证维度：

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 绑定状态 | `DomainInfoList[].Status` | `SUCCESS` |
| 域名匹配 | `DomainInfoList[].DomainName` | 与创建时的 DomainName 一致 |
| 证书绑定 | `DomainInfoList[].CertId` | 与创建时的 CertificateId 一致 |

**预期输出**：

```json
{
  "DomainInfoList": [
    {
      "RegistryId": "<RegistryId>",
      "CertId": "<CertificateId>",
      "DomainName": "<your-custom-domain>",
      "Status": "SUCCESS"
    }
  ],
  "TotalCount": 1,
  "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

`Status: "SUCCESS"` 表示自定义域名已生效。

> **提示**：国内站可使用 PrivateDNS 配置内网域名解析实现就近访问；国际站暂不支持 PrivateDNS，建议使用自建 DNS 服务。DNS 解析需将自定义域名的 A 记录指向 TCR 实例的内网 IP（通过 `DescribeInternalEndpoints` 获取 `AccessIp`）。因本测试环境 VPC 配额已达上限（`LimitExceeded`），内网接入和 DNS 解析配置暂无法在 CLI 中验证。此为环境限制，非命令错误。

## 验证

### 控制面（tccli）— 实例同步

```bash
# 验证源实例就绪
tccli tcr DescribeInstances \
    --Registryids '["<SourceRegistryId>"]' \
    --region <Region>
# expected: exit 0, Status: "Running", RegistryType: "standard" 或 "premium"

# 验证目标实例就绪
tccli tcr DescribeInstances \
    --Registryids '["<DestRegistryId>"]' \
    --region <Region>
# expected: exit 0, Status: "Running"

# 验证同步规则存在且启用
tccli tcr DescribeReplicationPolicies \
    --RegistryId <SourceRegistryId> \
    --region <Region>
# expected: exit 0, ReplicationPolicyInfoList 中包含目标规则，Enabled: true

# 验证同步状态
tccli tcr DescribeReplicationInstanceSyncStatus \
    --RegistryId <SourceRegistryId> \
    --ReplicationRegistryId <DestRegistryId> \
    --ShowReplicationLog true \
    --region <Region>
# expected: exit 0, ReplicationStatus: "Succeed"
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 源实例状态 | `Status` | `Running` |
| 源实例规格 | `RegistryType` | `standard` 或 `premium` |
| 目标实例状态 | `Status` | `Running` |
| 同步规则启用 | `Enabled` | `true` |
| 同步日志状态 | `ReplicationStatus` | `Succeed` |
| 最近同步 | `ReplicationLog[].Status` | `Succeed`（最近一次同步成功） |

### 控制面（tccli）— 实例复制

```bash
# 验证主实例为高级版
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region>
# expected: exit 0, RegistryType: "premium", Status: "Running"

# 验证复制实例已就绪
tccli tcr DescribeReplicationInstances \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: exit 0, ReplicationRegistries 中各地域 Status: "Running"
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 主实例规格 | `RegistryType` | `premium` |
| 主实例状态 | `Status` | `Running` |
| 复制实例状态 | `ReplicationRegistries[].Status` | `Running` |
| 复制实例地域 | `ReplicationRegistries[].ReplicationRegionName` | 与创建时指定一致 |

### 控制面（tccli）— 自定义域名

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: exit 0, DomainInfoList 中包含目标域名，Status: "SUCCESS"
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 绑定状态 | `DomainInfoList[].Status` | `SUCCESS` |
| 域名 | `DomainInfoList[].DomainName` | 与目标域名一致 |

## 清理

> **计费警告**：TCR 企业版实例按月预付费，复制实例计入实例计费。实例同步模式下各地域实例独立计费。删除操作不退还已支付费用，请在验证完成后及时清理不再需要的资源。

清理顺序：从依赖方到被依赖方，即先删除同步规则和复制实例，再删除 TCR 实例。

### 删除同步规则（实例同步）

> **副作用警告**：删除同步规则仅停止后续同步，不会删除已同步至目标实例的镜像。已同步的镜像需在目标实例中单独清理。

**清理前状态检查**：

```bash
tccli tcr DescribeReplicationPolicies \
    --RegistryId <SourceRegistryId> \
    --region <Region>
# expected: exit 0，确认待删除的规则 Name 和 ID 匹配，Enabled 为 true
```

```bash
tccli tcr DeleteReplicationRule \
    --RegistryId <SourceRegistryId> \
    --RuleId <RuleId> \
    --region <Region>
# expected: exit 0，返回 RequestId
```

> `RuleId` 通过 `DescribeReplicationPolicies` 返回的 `ID` 字段获取（如 `2`）。

**验证已删除**：

```bash
tccli tcr DescribeReplicationPolicies \
    --RegistryId <SourceRegistryId> \
    --region <Region>
# expected: TotalCount 为 0，或列表中不再包含目标规则
```

### 删除复制实例（实例复制）

逐个删除各地域的复制实例：

> **副作用警告**：删除复制实例将移除该地域的只读副本，该地域客户端将失去内网就近拉取能力，需回退至主实例域名拉取。已拉取至本地的镜像不受影响。

**清理前状态检查**：

```bash
tccli tcr DescribeReplicationInstances \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: exit 0，确认待删除的 ReplicationRegistryId 匹配，Status 为 Running
```

```bash
tccli tcr DeleteReplicationInstance \
    --RegistryId <RegistryId> \
    --ReplicationRegistryId <ReplicationRegistryId> \
    --region <Region>
# expected: exit 0，返回 RequestId
```

**验证已删除**：

```bash
tccli tcr DescribeReplicationInstances \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: TotalCount 为 0，或列表中不再包含目标复制实例
```

### 删除自定义域名（如使用）

> **副作用警告**：删除自定义域名后，使用该域名的 Docker 客户端将无法通过自定义域名登录和拉取镜像，需切换至 TCR 默认公网域名（`<RegistryName>.tencentcloudcr.com`）。此操作不删除关联的 SSL 证书。

**清理前状态检查**：

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: exit 0，确认 DomainInfoList 中包含待删除的域名，Status 为 SUCCESS
```

```bash
tccli tcr DeleteInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --DomainName <your-custom-domain> \
    --region <Region>
# expected: exit 0，返回 RequestId
```

### 删除 TCR 实例（可选，仅确认不再使用）

> **副作用警告**：删除实例将同时销毁实例内所有命名空间、镜像仓库及镜像数据，不可恢复。实例同步场景下，删除源实例前请先删除同步规则；删除目标实例前请确认无其他实例向其同步。

**清理前状态检查**：

```bash
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region>
# expected: exit 0，确认实例 RegistryType 和 RegistryName 匹配，Status 为 Running
```

实例可通过控制台销毁。销毁后实例将进入回收站保留一段时间，期间可恢复。

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ManageReplication` 返回 `FailedOperation` | `tccli tcr DescribeInstances --Registryids '["<SourceRegistryId>"]' --region <Region>` 和 `tccli tcr DescribeInstances --Registryids '["<DestRegistryId>"]' --region <Region>` 确认两个实例均存在且 Status 为 Running | 源实例或目标实例不存在，或同名规则已存在 | 确认两个 RegistryId 正确且实例均 Running；`tccli tcr DescribeReplicationPolicies --RegistryId <SourceRegistryId> --region <Region>` 检查规则名称是否已被占用 |
| `CreateReplicationInstance` 返回 `UnsupportedOperation` | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>` 确认 RegistryType 是否为 premium | 实例非高级版，或目标地域与主实例跨境 | 确认 RegistryType 为 `premium`；检查目标地域是否支持实例复制且与主实例同国家；若需跨境改为实例同步方案 |
| 跨主账号同步返回 `FailedOperation.EmptyCoreBody` | `tccli sts GetCallerIdentity --region <Region>` 确认当前身份；核对 PeerRegistryToken 格式 | PeerRegistryToken 为空或凭证类型/格式错误 | 确认 PeerRegistryToken 为用户级账号密码（非服务级账号）；确认凭证未过期，必要时重新生成长期访问凭证 |
| `ManageReplication` 返回 `InternalError` — `Not support slave region` | `tccli tcr DescribeInstances --Registryids '["<SourceRegistryId>"]' --region <Region>` 和 `tccli tcr DescribeInstances --Registryids '["<DestRegistryId>"]' --region <Region>` 确认两个实例所在地域 | 跨地域复制规则受 API 限制，源/目标地域组合不在当前支持列表中 | 此为 API 平台限制。替代方案：同国家/区域内改用实例复制（`CreateReplicationInstance`），跨国家/区域改用实例同步方案（同主账号或跨主账号 `ManageReplication` 含 `PeerReplicationOption`） |
| `CreateInstanceCustomizedDomain` 返回 `InvalidParameter` | `tccli ssl DescribeCertificates --region <Region>` 确认 CertificateId 存在且 Status 为已签发 | 证书 ID 无效、证书未签发或证书未绑定目标域名 | 前往 SSL 证书控制台确认证书状态为「已签发」且域名匹配；确认 CertificateId 格式正确（购买证书为 `cert-xxxxx`，上传证书为随机字符串） |
| `FailedOperation.TradeFailed` | `tccli tcr DescribeInstances --region <Region>` 确认当前已有实例计费情况 | 创建高级版（premium）实例失败：账户余额不足 | 替代方案：先创建 basic 实例（`CreateInstance --RegistryType basic`，后付费无预付），再通过 `tccli tcr ModifyInstance --RegistryType premium` 升级；若升级也触发余额限制，需充值。此为环境限制，非命令错误 |
| `ManageInternalEndpoint` 返回 `LimitExceeded` | `tccli vpc DescribeVpcs --region <Region>` 查看当前 VPC 配额使用情况 | 当前账号 VPC 数量已达上限 | 清理不再使用的 VPC（`tccli vpc DeleteVpc --VpcId <VpcId>`）后重试；或使用已有 VPC 和子网。此为环境限制，非命令错误 |

### 创建成功但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 实例同步状态长时间 `Failed` | `tccli tcr DescribeReplicationInstanceSyncStatus --RegistryId <SourceRegistryId> --ReplicationRegistryId <DestRegistryId> --ShowReplicationLog true --region <Region>` 查看失败日志详情 | 跨地域网络波动或目标实例不可达 | 确认目标实例 Status 为 Running；检查同步日志中失败资源的详细错误；仍失败则[在线咨询](https://cloud.tencent.com/online-service?from=doc_1141) |
| 复制实例创建长时间未完成 | `tccli tcr DescribeReplicationInstanceCreateTasks --ReplicationRegistryId <ReplicationRegistryId> --ReplicationRegionId 4 --region <Region>` 轮询 TaskStatus | 后端异步复制慢，依赖镜像总量和跨地域带宽 | 等待 TaskStatus 更新为 SUCCESS；超过预期时间（通常数分钟至半小时）仍异常则[在线咨询](https://cloud.tencent.com/online-service?from=doc_1141) |
| 复制实例创建后目标地域无法拉取镜像 | `tccli tcr DescribeReplicationInstances --RegistryId <RegistryId> --region <Region>` 确认 Status 为 Running；`tccli tcr DescribeInternalEndpoints --RegistryId <RegistryId> --region <Region>` 确认内网链路 | 目标地域 VPC 未接入复制实例 | 为复制实例配置内网访问链路：`ManageInternalEndpoint --Operation Create`；参考[配置内网访问控制](../../ops/access/network/private-access) |
| 同步规则配置后镜像未触发同步 | `tccli tcr DescribeReplicationPolicies --RegistryId <SourceRegistryId> --region <Region>` 确认规则 Enabled 为 true；`tccli tcr DescribeReplicationInstanceSyncStatus --RegistryId <SourceRegistryId> --ReplicationRegistryId <DestRegistryId> --region <Region>` 查看同步日志 | 规则触发模式为手动，或过滤器不匹配 | 检查 Filters 配置是否匹配目标镜像名称和标签；尝试推送新镜像以触发自动同步；若仍需手动，前往控制台手动触发同步 |
| 自定义域名 Status 为 `CREATING` 或 `FAILED` | `tccli tcr DescribeInstanceCustomizedDomain --RegistryId <RegistryId> --region <Region>` 持续轮询状态 | SSL 证书下发尚未完成，或证书与域名不匹配 | 等待 1-2 分钟后重新查询；若持续非 SUCCESS，检查 SSL 证书是否已绑定目标域名；`tccli ssl DescribeCertificates --region <Region>` 确认证书状态 |
| 跨国同步不可用（实例复制） | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>` 确认实例地域；对比目标地域 | 实例复制暂不支持跨国部署 | 改用实例同步（ManageReplication）实现跨地域镜像分发 |

## 下一步

- [同实例多地域复制镜像](../../ops/image-distribution/cross-region-replication) — 高级版实例复制详细指南
- [跨实例（账号）同步镜像](../../ops/image-distribution/cross-instance-sync) — TCR 实例间同步规则管理
- [从自建 Harbor 同步镜像到 TCR 企业版](https://cloud.tencent.com/document/product/1141/44970) — Harbor 迁移至 TCR
- [混合云下的多平台镜像数据同步复制](../hybrid-cloud-sync) — 跨平台同步场景
- [配置内网访问控制](../../ops/access/network/private-access) — VPC 内网链路管理
- [配置自定义域名](../../ops/access/domain/custom-domain) — 统一域名管理

## 控制台替代

- **实例同步**：[容器镜像服务控制台 → 同步复制 → 实例同步](https://console.cloud.tencent.com/tcr/replication) — 创建、管理、触发同步规则
- **实例复制**：[容器镜像服务控制台 → 同步复制 → 实例复制](https://console.cloud.tencent.com/tcr/replication) — 创建、管理复制实例
- **自定义域名**：[容器镜像服务控制台 → 访问控制 → 域名管理](https://console.cloud.tencent.com/tcr) — 配置自定义域名
