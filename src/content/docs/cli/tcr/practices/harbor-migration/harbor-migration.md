---
title: "从自建 Harbor 同步镜像到 TCR 企业版"
description: "· page_id `44970`"
---

> 对照官方：[从自建 Harbor 同步镜像到 TCR 企业版](https://cloud.tencent.com/document/product/1141/44970) · page_id `44970`

## 概述

将自建 Harbor（v1.8.0+）中的容器镜像和 Helm Chart 同步至腾讯云容器镜像服务（TCR）企业版。同步方向为 Harbor -> TCR（Push-based），由 Harbor 侧管理复制规则，自动或手动将镜像推送到 TCR 实例。

整体链路分为四层：**TCR 实例就绪**（步骤 1）-> **网络接入**（步骤 2）-> **访问凭证**（步骤 3）-> **TCR 侧复制基础设施**（步骤 4-5，可选）-> **Harbor 侧配置**（步骤 6-7，Web UI）-> **触发同步与查看结果**（步骤 8）。

```
 ┌──────────────────────┐         ┌────────────────────────────┐
 │   自建 Harbor          │  Push   │   TCR 企业版                 │
 │   （IDC / 云上 CVM）    │ ──────> │   域名: xxx.tencentcloudcr.com │
 │                       │  Docker │   VPC 内网 / 公网            │
 │   Harbor v1.8.0+      │  pull-> │                            │
 │                       │  tag->  │   镜像仓库 + Helm Chart      │
 │   ┌─────────────────┐ │  push   │   ↓ 可选：实例复制            │
 │   │ 复制规则         │ │         │   副本实例（异地只读）         │
 │   │ （Tencent TCR    │ │         │   ManageReplication 同步     │
 │   │  或 Docker       │ │         │                            │
 │   │  Registry 提供者) │ │         │                            │
 │   └─────────────────┘ │         └────────────────────────────┘
 └──────────────────────┘
```

**使用限制：**

- 仅支持 Harbor v1.8.0 及以上版本。
- Harbor v2.1.2 及以上可选择 "Tencent TCR" 提供者（使用 CAM SecretId/SecretKey），支持 Pull-based 模式且可在 TCR 侧自动新建命名空间。
- Harbor 版本低于 v2.1.2 时只能选择 "Docker Registry" 提供者（使用 TCR 长期访问凭证），不支持在 TCR 侧自动新建命名空间。
- 若自建 Harbor 无法通过专线或私有网络访问 TCR，可使用公网同步（会产生公网流量费用）。
- TCR 侧多地域复制（`CreateReplicationInstance` + `ManageReplication`）仅高级版（`premium`）实例支持。

## 前置条件

- [环境准备](../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:DescribeInstances, tcr:ManageInternalEndpoint, tcr:ManageExternalEndpoint
#    tcr:DescribeExternalEndpointStatus, tcr:CreateSecurityPolicy, tcr:DescribeSecurityPolicies
#    tcr:CreateInstanceToken, tcr:DescribeInstanceToken, tcr:DeleteInstanceToken
#    tcr:CreateReplicationInstance, tcr:ManageReplication
#    tcr:DescribeReplicationInstances, tcr:DescribeReplicationPolicies
#    tcr:DescribeReplicationInstanceCreateTasks, tcr:DeleteReplicationInstance
#    tcr:DeleteSecurityPolicy, tcr:DeleteReplicationRule
#    建议授予 QcloudTCRFullAccess 预设策略
# 验证：执行 DescribeInstances 确认权限
tccli tcr DescribeInstances --region <Region>
# expected: exit 0，返回实例列表（可为空）
```

### 资源检查

```bash
# 4. 确认 TCR 企业版实例存在且状态正常
tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'
# expected: exit 0, Registries[0].Status == "Running"
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "example-registry.tencentcloudcr.com",
            "RegionName": "ap-guangzhou"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

```bash
# 5. 确认自建 Harbor 可访问 TCR 实例域名（网络连通性预检）
curl -I https://PUBLIC_DOMAIN/v2/ 2>&1 | head -1
# expected: HTTP/1.1 401 Unauthorized（401 表示可达，只是未认证；非 401 需排查网络）
```

> 自建 Harbor 版本 >= v1.8.0 由 Harbor 运维侧确认，不通过 tccli 验证。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看实例列表及状态 | `DescribeInstances` | 是 |
| 开启内网访问链路 | `ManageInternalEndpoint --Operation Create` | 否 |
| 开启公网访问入口 | `ManageExternalEndpoint --Operation Create` | 否 |
| 查看公网访问状态 | `DescribeExternalEndpointStatus` | 是 |
| 添加公网白名单 | `CreateSecurityPolicy` | 否 |
| 查看公网白名单 | `DescribeSecurityPolicies` | 是 |
| 创建长期访问凭证 | `CreateInstanceToken` | 否 |
| 查看已有凭证列表 | `DescribeInstanceToken` | 是 |
| 创建异地复制实例 | `CreateReplicationInstance` | 否 |
| 查看复制实例创建进度 | `DescribeReplicationInstanceCreateTasks` | 是 |
| 配置同步规则 | `ManageReplication` | 是 |
| 查看同步规则 | `DescribeReplicationPolicies` | 是 |
| 查看复制实例列表 | `DescribeReplicationInstances` | 是 |
| 删除同步规则 | `DeleteReplicationRule` | 是 |
| 删除复制实例 | `DeleteReplicationInstance` | 是 |
| 删除访问凭证 | `DeleteInstanceToken` | 是 |
| 删除公网白名单 | `DeleteSecurityPolicy` | 是 |
| 关闭公网访问入口 | `ManageExternalEndpoint --Operation Delete` | 是 |
| 删除内网访问链路 | `ManageInternalEndpoint --Operation Delete` | 是 |

## 关键字段说明

以下说明本操作涉及的主要参数。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | TCR 实例 ID，由 `DescribeInstances` 返回，格式 `tcr-` 前缀 | `InvalidParameter.RegistryNotFound` — 实例不存在或地域错误 |
| `Region` | String | 是 | 地域名，如 `ap-guangzhou`、`ap-shanghai` | `InvalidParameter` — 地域与服务不匹配，命令无法路由 |
| `Operation` | String | 条件必填 | `Create` 或 `Delete`，大小写敏感。`ManageInternalEndpoint` 和 `ManageExternalEndpoint` 必填 | `InvalidParameter` — 操作类型未知 |
| `VpcId` | String | 条件必填 | 内网方案必填。VPC ID，格式 `vpc-` 前缀，由 `vpc:DescribeVpcs` 返回 | `FailedOperation` — VPC 不存在或不可用 |
| `SubnetId` | String | 条件必填 | 内网方案必填。子网 ID，格式 `subnet-` 前缀，须与实例同地域 | `FailedOperation` — 子网不存在或地域不匹配 |
| `CidrBlock` | String | 条件必填 | 公网方案必填。IPv4 CIDR，如 `1.2.3.4/32`。`Description` 不可为空 | `InvalidParameter` — CIDR 格式错误或描述为空 |
| `Description` | String | 条件必填 | 白名单用途描述，不可为空字符串 | `InvalidParameter` — Description 为空 |
| `TokenType` | String | 是 | 固定值 `longterm`（长期凭证），不可用其他值 | `InvalidParameter` — 不支持的凭证类型 |
| `ReplicationRegionId` | Integer | 是 | 目标地域数字 ID，如 `1`=广州、`4`=上海 | `UnsupportedOperation` — 地域不支持复制或实例类型不支持 |
| `ReplicationRegionName` | String | 是 | 目标地域名称，须与 `ReplicationRegionId` 对应 | `InvalidParameter` — RegionId 与 RegionName 不匹配 |
| `Rule.Name` | String | 是 | 同步规则名，同实例内不可重名。同名规则 `ManageReplication` 会覆盖更新（幂等） | 同一实例重名 — 幂等覆盖，非报错 |
| `Rule.DestNamespace` | String | 是 | 目标命名空间名，须在 TCR 侧已存在 | `FailedOperation` — 命名空间不存在，同步失败 |
| `Rule.Override` | Boolean | 否 | 是否覆盖同名镜像。建议 `true` | `false` 时同名 Tag 不同步 |
| `Rule.Filters[].Type` | String | 否 | 过滤器类型，须小写：`name`（仓库名）、`tag`（标签）、`resource`（资源类型） | 大写 `Name` 不识别，Filter 不生效 |
| `PolicyIndex` | Integer | 是（删除时） | 白名单策略序号，由 `DescribeSecurityPolicies` 返回 | `InvalidParameter` — 序号不存在 |
| `PolicyVersion` | String | 是（删除时） | 白名单策略版本号，由 `DescribeSecurityPolicies` 返回 | `InvalidParameter` — 版本号不匹配 |

## 操作步骤

整体分为 TCR 侧准备（步骤 1-3 必选，步骤 4-5 可选）和 Harbor 侧配置（步骤 6-7），网络与凭证就绪后再进入 Harbor Web UI。

### 步骤 1：确认 TCR 实例可访问

查询实例信息，获取访问域名与状态：

```bash
tccli tcr DescribeInstances \
    --Registryids '["REGISTRY_ID"]' \
    --region <Region>
# expected: exit 0, Registries[0].Status == "Running"
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "example-registry.tencentcloudcr.com",
            "RegionName": "ap-guangzhou",
            "InternalEndpoint": "10.1.65.238"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

记录 `PublicDomain`（域名须以 `.tencentcloudcr.com` 结尾）。后续 Harbor 侧配置使用完整 URL：`https://PUBLIC_DOMAIN`。

### 步骤 2：配置 Harbor 到 TCR 的网络接入

根据自建 Harbor 的网络情况，选择内网或公网方案。

#### 方案 A：通过腾讯云私有网络访问（推荐）

若自建 Harbor 部署在腾讯云 VPC 内或已通过专线/VPN 打通至腾讯云 VPC，使用内网访问可提升同步速度并节省公网流量费用。

##### 选择依据

- **方案选择**：选内网而非公网，因为专线/VPN 链路带宽稳定、无公网流量费用，且同步大量镜像时公网带宽可能成为瓶颈。
- **VpcId**：选用自建 Harbor 所在或已打通的 VPC，而非新建 VPC — 新建 VPC 需额外打通与 Harbor 的链路。
- **SubnetId**：选用与 TCR 实例同地域的子网，跨地域子网会导致连接超时。

##### 最小配置（仅必填字段）

`tcr-manage-internal-endpoint-minimal.json`：

```json
{
    "RegistryId": "REGISTRY_ID",
    "Operation": "Create",
    "VpcId": "VPC_ID",
    "SubnetId": "SUBNET_ID"
}
```

##### 增强配置（含可选地域字段）

`tcr-manage-internal-endpoint-enhanced.json`：

```json
{
    "RegistryId": "REGISTRY_ID",
    "Operation": "Create",
    "VpcId": "VPC_ID",
    "SubnetId": "SUBNET_ID",
    "RegionId": 1,
    "RegionName": "ap-guangzhou"
}
```

```bash
# 执行创建（任选一个配置文件）
tccli tcr ManageInternalEndpoint \
    --cli-input-json file://tcr-manage-internal-endpoint-minimal.json \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RegistryId": "tcr-example",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

开启自动解析后，VPC 内即可通过 `INSTANCE_NAME.tencentcloudcr.com` 内网访问 TCR 实例。

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `REGISTRY_ID` | TCR 实例 ID | 格式 `tcr-` 前缀 | `tccli tcr DescribeInstances --region <Region>` |
| `REGION` | 地域 | 如 `ap-guangzhou` | 与 TCR 实例地域一致 |
| `VPC_ID` | VPC ID | 格式 `vpc-` 前缀，须已存在 | `tccli vpc DescribeVpcs --region <Region>` |
| `SUBNET_ID` | 子网 ID | 格式 `subnet-` 前缀，与实例同地域 | `tccli vpc DescribeSubnets --region <Region>` |

#### 方案 B：通过公网访问

若自建 Harbor 未部署在腾讯云 VPC 内且无法通过专线打通，使用公网访问。

##### B.1 开启公网访问入口

###### 选择依据

- **何时用公网**：仅当内网方案不可行（Harbor 不在腾讯云，无专线/VPN）时才选择。公网会产生流量费用，且同步速度受公网带宽限制。
- **Operation=Create**：这是开启操作（非幂等），重复执行会返回 `UnsupportedOperation: The current public network access status is Opened`。执行 Create 前先通过 `DescribeExternalEndpointStatus` 预检，仅在 `Status == "Closed"` 时执行。

```bash
# 预检：确认公网入口当前状态为 Closed 再执行 Create
tccli tcr DescribeExternalEndpointStatus \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, Status == "Closed" 时方可执行 Create
```

**预期输出**（入口已关闭时）：

```json
{
    "Status": "Closed",
    "Reason": "",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

```bash
tccli tcr ManageExternalEndpoint \
    --RegistryId REGISTRY_ID \
    --Operation Create \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RegistryId": "tcr-example",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

##### B.2 轮询公网访问状态至 Opened

公网入口开启是异步操作，需轮询 `DescribeExternalEndpointStatus` 直到 `Status` 变为 `Opened`（通常需要 1-2 分钟）：

```bash
tccli tcr DescribeExternalEndpointStatus \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, Status 终态为 "Opened"
```

**预期输出**（开启中）：

```json
{
    "Status": "Opening",
    "Reason": "",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| Status | 含义 |
|--------|------|
| `Closed` | 公网访问入口已关闭 |
| `Opening` | 公网访问入口开启中 |
| `Opened` | 公网访问入口已开启 |
| `Closing` | 公网访问入口关闭中 |

重复执行上述命令，直到返回 `"Status": "Opened"`，方可进行后续操作。

**多维度验证**（确认公网入口完整就绪，不只看 Status）：

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 状态 | `DescribeExternalEndpointStatus.Status` | `Opened` |
| 网络 | `curl -I https://PUBLIC_DOMAIN/v2/` | 返回 `401 Unauthorized`（可达但未认证） |
| 白名单 | `DescribeSecurityPolicies` 返回（若已配置） | 策略列表非空 |

##### B.3 添加公网白名单（安全策略）

入口开启后仍默认拒绝全部来源的公网访问，需为 Harbor 出口 IP 添加白名单。

###### 选择依据

- **CidrBlock 格式**：使用 `/32` 掩码限定单个 IP（最小权限原则），而非 `/0` 放通全网。`0.0.0.0/0` 仅用于临时测试，同步完成后必须删除。
- **Description**：必填且不可为空字符串，用于标识白名单用途，方便后续清理时识别。

```bash
tccli tcr CreateSecurityPolicy \
    --RegistryId REGISTRY_ID \
    --CidrBlock "HARBOR_EXIT_IP/32" \
    --Description "自建 Harbor 公网访问" \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RegistryId": "tcr-example",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

> 如无法确认 Harbor 的公网出口 IP，可临时配置 `--CidrBlock "0.0.0.0/0"` 以放通全部来源。**完成同步后务必尽快删除该白名单**（见[清理](#清理)）。

查看已有白名单：

```bash
tccli tcr DescribeSecurityPolicies \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "SecurityPolicySet": [
        {
            "PolicyIndex": 0,
            "CidrBlock": "HARBOR_EXIT_IP/32",
            "Description": "自建 Harbor 公网访问",
            "PolicyVersion": "1"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### 步骤 3：获取 TCR 访问凭证

Harbor 配置复制目标时需要 TCR 的访问凭证。根据 Harbor 版本选择不同凭证类型：

#### Harbor v2.1.2 及以上 — 使用 CAM API 密钥（推荐）

前往 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 获取 **SecretId** 和 **SecretKey**：
- Harbor 侧「访问 ID」-> SecretId
- Harbor 侧「访问密码」-> SecretKey

此方式支持 Pull-based 同步（TCR -> Harbor），且可在 TCR 侧自动新建命名空间。

#### Harbor 低于 v2.1.2 — 使用 TCR 长期访问凭证

##### 选择依据

- **TokenType**：必须选 `longterm` 而非 `temp`（临时凭证有过期时间，不适合长期同步任务）。长期凭证无过期限制。
- **Desc**：建议填写可识别的描述（如 "自建 Harbor 数据同步专用"），方便后续通过 `DescribeInstanceToken` 识别该凭证用途。

创建专用的长期访问凭证：

```bash
tccli tcr CreateInstanceToken \
    --RegistryId REGISTRY_ID \
    --TokenType longterm \
    --Desc "自建 Harbor 数据同步专用" \
    --region <Region>
# expected: exit 0, 返回 Username 和 Token
```

**预期输出**：

```json
{
    "Username": "100012345678",
    "Token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
    "ExpTime": 2096844746789,
    "TokenId": "tcr-token-example",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

> 记录 `Token` 字段，**仅此一次保存机会**。在 Harbor 中填写「访问 ID」= `Username`，「访问密码」= `Token`。

查看已有凭证：

```bash
tccli tcr DescribeInstanceToken \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, TotalCount > 0
```

**预期输出**：

```json
{
    "Tokens": [
        {
            "Id": "tcr-token-example",
            "Desc": "自建 Harbor 数据同步专用",
            "RegistryId": "tcr-example",
            "Enabled": true,
            "CreatedAt": "2026-01-01T00:00:00+08:00",
            "ExpiredAt": 2096844746789
        }
    ],
    "TotalCount": 1,
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `REGISTRY_ID` | TCR 实例 ID | 格式 `tcr-` 前缀 | `DescribeInstances` |
| `REGION` | 地域 | 如 `ap-guangzhou` | 与 TCR 实例地域一致 |

### 步骤 4：在 TCR 侧创建复制实例（异地多活，可选 — 仅高级版）

> 本步骤为可选扩展：若需要将 Harbor 同步至 TCR 的镜像进一步分发到多地域，可在目标地域创建复制实例（只读副本）。仅高级版（`premium`）实例支持。跳过本步骤则镜像仅存在于当前 TCR 实例。

##### 选择依据

- **何时需要**：当业务要求多地域就近拉取镜像时才创建复制实例。单地域使用场景跳过此步骤可以节省目标地域的实例费用。
- **ReplicationRegionId**：选择离目标用户最近的地域（如华东用户选 `4`=上海），而非随机选择。
- **前置条件**：确认实例类型为 `premium`，非高级版执行 `CreateReplicationInstance` 会直接报错。
- **升级到高级版**：若实例类型为 `basic` 或 `standard`，需先通过 `ModifyInstance` 升级至 `premium`。升级命令零预付扣费（`PayMod=0`），操作立即生效，无需提前充值。

创建复制实例前确认实例为高级版：

```bash
tccli tcr DescribeInstances \
    --Registryids '["REGISTRY_ID"]' \
    --region <Region>
# expected: exit 0, Registries[0].RegistryType == "premium"
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "example-registry.tencentcloudcr.com",
            "RegionName": "ap-guangzhou"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

确认 `RegistryType` 为 `"premium"` 后，创建复制实例。

若 `RegistryType` 非 `"premium"`（如返回 `"basic"` 或 `"standard"`），先执行升级：

```bash
tccli tcr ModifyInstance \
    --RegistryId REGISTRY_ID \
    --RegistryType premium \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

升级后重新查询确认 `RegistryType` 已变为 `"premium"`：

```bash
tccli tcr DescribeInstances \
    --Registryids '["REGISTRY_ID"]' \
    --region <Region>
# expected: exit 0, Registries[0].RegistryType == "premium"
```

确认后创建复制实例：

```bash
tccli tcr CreateReplicationInstance \
    --RegistryId REGISTRY_ID \
    --ReplicationRegionId REPLICATION_REGION_ID \
    --ReplicationRegionName REPLICATION_REGION_NAME \
    --region <Region>
# expected: exit 0, 返回 ReplicationRegistryId
```

**预期输出**：

```json
{
    "ReplicationRegistryId": "tcr-example-4-ghbzyc",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

常用地域 ID 参考：

| 地域名称 | RegionId | 地域名称 | RegionId |
|---------|----------|---------|----------|
| ap-guangzhou | 1 | ap-shanghai | 4 |
| ap-beijing | 8 | ap-nanjing | 33 |
| ap-chengdu | 16 | ap-singapore | 9 |
| na-siliconvalley | 15 | eu-frankfurt | 17 |

记录返回的 `ReplicationRegistryId`（格式如 `tcr-example-4-xxx`）。

**轮询复制实例创建进度：**

复制实例创建是异步操作，需轮询确认完成：

```bash
tccli tcr DescribeReplicationInstanceCreateTasks \
    --ReplicationRegistryId REPLICATION_REGISTRY_ID \
    --ReplicationRegionId REPLICATION_REGION_ID \
    --region <Region>
# expected: exit 0
```

**预期输出**（创建完成）：

```json
{
    "Status": "SUCCESS",
    "TaskDetail": [
        {
            "TaskName": "CreateReplication",
            "TaskUUID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "TaskStatus": "SUCCESS",
            "TaskMessage": "",
            "CreatedTime": "2026-01-01T00:00:00+08:00",
            "FinishedTime": "2026-01-01T00:01:00+08:00"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

`TaskStatus` 为 `SUCCESS` 表示复制实例已就绪。

**多维度验证**（确认复制实例完整就绪）：

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 任务状态 | `DescribeReplicationInstanceCreateTasks.TaskDetail[*].TaskStatus` | 全部 `SUCCESS` |
| 实例列表 | `DescribeReplicationInstances` 含目标实例 | `ReplicationRegistryId` 存在且 `Status: "Running"` |
| 源实例 | `DescribeInstances --Registryids '["REGISTRY_ID"]'` | 源实例 `Status: "Running"` |

```bash
# 验证复制实例已存在于列表中
tccli tcr DescribeReplicationInstances \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, ReplicationRegistries 中包含目标实例且 Status == "Running"
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "RegistryId": "tcr-example",
            "ReplicationRegistryId": "tcr-example-4-ghbzyc",
            "ReplicationRegionId": 4,
            "ReplicationRegionName": "ap-shanghai",
            "Status": "Running",
            "CreatedAt": "2026-01-01T00:00:00+08:00"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### 步骤 5：在 TCR 侧配置同步规则（可选 — 仅高级版）

> 本步骤依赖步骤 4 创建的复制实例。若跳过了步骤 4，也跳过本步骤。

在源实例上创建同步规则，将 Harbor 同步过来的镜像自动复制到目标地域的副本实例。

##### 选择依据

- **Rule.Name**：建议使用描述性名称（如 `harbor-sync-to-shanghai`），便于在 `DescribeReplicationPolicies` 中区分多条规则。
- **Rule.DestNamespace**：源与目标命名空间建议同名，减少路径混淆。若目标命名空间不存在，需先在 TCR 侧创建（参考[管理命名空间](../../ops/image-creation/namespace)）。
- **Rule.Override**：建议设为 `true`（覆盖同名镜像），避免因 Tag 已存在导致同步跳过。
- **Rule.Deletion**：建议保持 `false`（不同步删除），防止 Harbor 侧误删导致 TCR 侧数据丢失。
- **Rule.Filters**：`resource` 选 `image` 或 `chart` 视需求而定；`name` 用 `.*` 匹配全部，或用具体仓库名限定范围。**注意**：`Filters[].Type` 必须小写（`name`、`tag`、`resource`），大写 `Name` 不识别。
- **幂等性**：`ManageReplication` 同名规则已存在则覆盖更新，可安全重放。
- **跨地域限制**：从源实例地域调用 `ManageReplication` 时，若目标为异地复制实例，可能返回 `InternalError: Not support slave region`。此时需切换至目标地域（副实例所在地域）执行，或在控制台配置。

参数 >= 4 个，使用 `--cli-input-json file://`，分最小/增强两层。

**最小配置**（仅必填字段）：

`sync-rule-minimal.json`：

```json
{
    "SourceRegistryId": "REGISTRY_ID",
    "DestinationRegistryId": "REPLICATION_REGISTRY_ID",
    "Rule": {
        "Name": "RULE_NAME",
        "DestNamespace": "DEST_NAMESPACE"
    }
}
```

**增强配置**（含可选字段）：

`sync-rule-enhanced.json`：

```json
{
    "SourceRegistryId": "REGISTRY_ID",
    "DestinationRegistryId": "REPLICATION_REGISTRY_ID",
    "Rule": {
        "Name": "RULE_NAME",
        "DestNamespace": "DEST_NAMESPACE",
        "Override": true,
        "Filters": [
            {
                "Type": "name",
                "Value": ".*"
            },
            {
                "Type": "resource",
                "Value": "image"
            }
        ],
        "Deletion": false
    },
    "Description": "Harbor 同步镜像自动复制至异地"
}
```

```bash
# 执行创建（任选一个配置文件）
tccli tcr ManageReplication \
    --cli-input-json file://sync-rule-minimal.json \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

> `ManageReplication` 跨地域执行限制：从源实例地域调用时，若目标为异地复制实例，API 可能返回 `InternalError: Not support slave region`。**解决方案**：切换至目标地域（副实例所在地域，如 `ap-shanghai`）执行 `ManageReplication`，`SourceRegistryId` 填源实例、`DestinationRegistryId` 填本地实例。此操作在同地域内幂等：同名规则会覆盖更新。复制实例创建本身（步骤 4）不受此问题影响。

查看同步规则已生效：

```bash
tccli tcr DescribeReplicationPolicies \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, TotalCount > 0
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "ReplicationPolicyInfoList": [
        {
            "ID": 1,
            "Name": "RULE_NAME",
            "Enabled": true,
            "SrcResource": "INSTANCE_NAME/.* REGION_NAME",
            "DestResource": "REPLICATION_REGISTRY_ID/DEST_NAMESPACE REPLICATION_REGION_NAME",
            "Filters": [
                {"Type": "name", "Value": ".*"},
                {"Type": "resource", "Value": "image"}
            ],
            "Override": true,
            "CreationTime": "2026-01-01T00:00:00+08:00"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `REGISTRY_ID` | 源 TCR 实例 ID | 格式 `tcr-` 前缀，须为 premium | `DescribeInstances` |
| `REPLICATION_REGISTRY_ID` | 目标复制实例 ID | 由 `CreateReplicationInstance` 返回 | `DescribeReplicationInstances` |
| `REGION` | 地域 | 如 `ap-guangzhou` | 与源实例地域一致 |
| `RULE_NAME` | 同步规则名称 | 同实例内不可重名 | 自定义，如 `harbor-sync-to-shanghai` |
| `DEST_NAMESPACE` | 目标命名空间 | 须在 TCR 侧已存在 | `tccli tcr DescribeNamespaces --RegistryId REGISTRY_ID --region <Region>` |

### 步骤 6：在 Harbor 侧配置复制目标（Harbor Web UI，无 TCR API）

以管理员账号登录 Harbor Web UI，进入 **系统管理 > 仓库管理 > 新建目标**。

**Harbor v2.1.2 及以上配置（Tencent TCR 提供者）：**

| 字段 | 值 |
|------|-----|
| 提供者 | `Tencent TCR` |
| 目标名 | 自定义，如 `tencent-tcr` |
| 目标 URL | `https://PUBLIC_DOMAIN` |
| 访问 ID | CAM SecretId |
| 访问密码 | CAM SecretKey |
| 验证远程证书 | 保持默认 |

**Harbor 低于 v2.1.2 配置（Docker Registry 提供者）：**

| 字段 | 值 |
|------|-----|
| 提供者 | `Docker Registry` |
| 目标名 | 自定义，如 `tencent-tcr` |
| 目标 URL | `https://PUBLIC_DOMAIN` |
| 访问 ID | `CreateInstanceToken` 返回的 `Username` |
| 访问密码 | `CreateInstanceToken` 返回的 `Token` |

单击 **测试连接** 验证连通性。若失败，检查步骤 2 网络接入配置。

### 步骤 7：在 Harbor 侧创建复制规则（Harbor Web UI，无 TCR API）

进入 **系统管理 > 复制管理 > 新建规则**：

| 字段 | 值 |
|------|-----|
| 名称 | 自定义，如 `sync-images-to-tcr` |
| 复制模式 | `Push-based`（Harbor 推送至 TCR）。使用 "Tencent TCR" 提供者且 Harbor v2.1.2+ 时也可选 `Pull-based` |
| 源资源过滤器 | 留空则同步全部镜像与 Helm Chart；支持按仓库名/Tag 过滤 |
| 目的 Registry | 选择步骤 6 创建的目标仓库 |
| 目的 Namespace | 留空则默认同名命名空间（"Tencent TCR" 提供者可自动创建；"Docker Registry" 提供者需先在 TCR 侧手动创建：参考[管理命名空间](../../ops/image-creation/namespace)） |
| 触发模式 | `手动触发` 或 `事件驱动`（推送时自动同步） |
| 覆盖 | 建议勾选（覆盖同名资源） |

### 步骤 8：触发同步并查看结果

以下演示手动同步流程。若复制规则为事件驱动，将镜像推送至 Harbor 后会自动触发同步。

**推送到 Harbor：**

```bash
# 从 Docker Hub 拉取测试镜像
docker pull nginx:latest

# 打上 Harbor 项目标签
docker tag nginx:latest HARBOR_DOMAIN/PROJECT/nginx:latest

# 推送至自建 Harbor
docker push HARBOR_DOMAIN/PROJECT/nginx:latest
```

**从 TCR 侧验证镜像已到达：**

```bash
# 登录 TCR
docker login PUBLIC_DOMAIN --username=USERNAME --password=TOKEN

# 拉取同步后的镜像
docker pull PUBLIC_DOMAIN/NAMESPACE/nginx:latest
```

**从 TCR 侧查看同步策略与复制实例：**

查看复制策略列表（Harbor 创建的规则也会在此显示）：

```bash
tccli tcr DescribeReplicationPolicies \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, TotalCount > 0
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "ReplicationPolicyInfoList": [
        {
            "ID": 1,
            "Name": "sync-images-to-tcr",
            "Enabled": true,
            "SrcResource": "HARBOR_DOMAIN/PROJECT/** REGION_NAME",
            "DestResource": "PUBLIC_DOMAIN/NAMESPACE/** REGION_NAME",
            "Filters": [
                {"Type": "name", "Value": ".*"},
                {"Type": "tag", "Value": ""},
                {"Type": "resource", "Value": "image"}
            ],
            "Override": true,
            "CreationTime": "2026-01-01T00:00:00+08:00"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

查看复制实例列表：

```bash
tccli tcr DescribeReplicationInstances \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "RegistryId": "tcr-example",
            "ReplicationRegistryId": "REPLICATION_REGISTRY_ID",
            "ReplicationRegionId": 4,
            "ReplicationRegionName": "ap-shanghai",
            "Status": "Running",
            "CreatedAt": "2026-01-01T00:00:00+08:00"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

若使用了实例复制（步骤 4-5），可查看复制实例中的同步任务进度：

```bash
tccli tcr DescribeReplicationInstanceCreateTasks \
    --ReplicationRegistryId REPLICATION_REGISTRY_ID \
    --ReplicationRegionId REPLICATION_REGION_ID \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "Status": "SUCCESS",
    "TaskDetail": [
        {
            "TaskName": "SyncTask",
            "TaskUUID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "TaskStatus": "SUCCESS",
            "TaskMessage": "",
            "CreatedTime": "2026-01-01T00:00:00+08:00",
            "FinishedTime": "2026-01-01T00:01:00+08:00"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

## 验证

### 控制面（tccli）

```bash
# 确认实例状态为 Running
tccli tcr DescribeInstances \
    --Registryids '["REGISTRY_ID"]' \
    --region <Region>
# expected: exit 0, Registries[0].Status == "Running"
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "example-registry.tencentcloudcr.com",
            "RegionName": "ap-guangzhou",
            "InternalEndpoint": "10.1.65.238"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

```bash
# 确认公网入口已开启（若使用公网方案）
tccli tcr DescribeExternalEndpointStatus \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, Status == "Opened"
```

**预期输出**：

```json
{
    "Status": "Opened",
    "Reason": "",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

```bash
# 确认访问凭证可查询
tccli tcr DescribeInstanceToken \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, TotalCount > 0, Token Enabled: true
```

**预期输出**：

```json
{
    "Tokens": [
        {
            "Id": "tcr-token-example",
            "Desc": "自建 Harbor 数据同步专用",
            "RegistryId": "tcr-example",
            "Enabled": true,
            "CreatedAt": "2026-01-01T00:00:00+08:00",
            "ExpiredAt": 2096844746789
        }
    ],
    "TotalCount": 1,
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

```bash
# 确认 Harbor 侧的同步策略已被 TCR 识别
tccli tcr DescribeReplicationPolicies \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, TotalCount > 0, 策略 Enabled: true
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "ReplicationPolicyInfoList": [
        {
            "ID": 1,
            "Name": "sync-images-to-tcr",
            "Enabled": true,
            "SrcResource": "HARBOR_DOMAIN/PROJECT/**",
            "DestResource": "PUBLIC_DOMAIN/NAMESPACE/**",
            "Override": true,
            "CreationTime": "2026-01-01T00:00:00+08:00"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

```bash
# 确认复制实例存在且状态正常（若使用）
tccli tcr DescribeReplicationInstances \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, ReplicationRegistries[*].Status == "Running"
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "RegistryId": "tcr-example",
            "ReplicationRegistryId": "REPLICATION_REGISTRY_ID",
            "ReplicationRegionId": 4,
            "ReplicationRegionName": "ap-shanghai",
            "Status": "Running",
            "CreatedAt": "2026-01-01T00:00:00+08:00"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**多维度验证汇总**：

| 维度 | 命令 | 预期 |
|------|------|------|
| 实例状态 | `DescribeInstances --Registryids '["REGISTRY_ID"]'` | `Status: "Running"` |
| 公网入口（若使用） | `DescribeExternalEndpointStatus` | `Status: "Opened"` |
| 访问凭证 | `DescribeInstanceToken` | `TotalCount > 0`，`Enabled: true` |
| 复制策略 | `DescribeReplicationPolicies` | `TotalCount > 0`，策略 `Enabled: true` |
| 复制实例（若使用） | `DescribeReplicationInstances` | 实例 `Status: "Running"` |

### 数据面（docker）

```bash
# 登录 TCR
docker login PUBLIC_DOMAIN --username=USERNAME --password=TOKEN

# 确认镜像已同步至 TCR
docker pull PUBLIC_DOMAIN/NAMESPACE/REPOSITORY:TAG
```

## 清理

> **计费警告**：TCR 企业版实例按量计费，按实例规格和存储用量收费。若不再需要实例，请前往[销毁退还实例](../../ops/instances/delete)彻底删除以停止计费。复制实例（步骤 4 创建）也独立计费。
>
> **副作用警告**：
> - `DeleteInstanceToken`：删除凭证后，所有依赖该凭证的 Harbor 复制目标将立即失效，同步中断。
> - `DeleteReplicationRule`：删除同步规则后，该规则停止生效，后续 Harbor 推送的镜像不再自动复制到异地实例。
> - `DeleteReplicationInstance`：删除复制实例后，目标地域的只读副本被销毁，已同步的镜像数据不可恢复。
> - `DeleteSecurityPolicy`：删除白名单后，对应 IP 将无法通过公网访问 TCR 实例。
> - `ManageInternalEndpoint --Operation Delete`：删除内网链路后，VPC 内所有服务将无法通过内网访问 TCR 实例。
>
> 清理顺序为依赖倒序：先删规则（依赖实例），再删复制实例（依赖源实例），再删凭证和网络配置。

### 数据面（docker）

```bash
# 登出 TCR
docker logout PUBLIC_DOMAIN

# 清理本地已同步的测试镜像（可选）
docker rmi PUBLIC_DOMAIN/NAMESPACE/REPOSITORY:TAG
```

### 控制面（tccli）

**1. 删除同步规则（若创建了步骤 5 的 ManageReplication 规则）：**

查询当前规则以获取 `RuleId`：

```bash
tccli tcr DescribeReplicationPolicies \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, 记录待删规则的 ID 字段
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "ReplicationPolicyInfoList": [
        {
            "ID": 1,
            "Name": "RULE_NAME",
            "Enabled": true
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

```bash
tccli tcr DeleteReplicationRule \
    --RegistryId REGISTRY_ID \
    --RuleId RULE_ID \
    --region <Region>
# expected: exit 0
```

验证规则已删除：

```bash
tccli tcr DescribeReplicationPolicies \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, 列表中不再包含已删规则
```

**2. 删除复制实例（若创建了步骤 4 的复制实例）：**

清理前确认目标实例存在：

```bash
tccli tcr DescribeReplicationInstances \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, 确认 ReplicationRegistryId 为目标实例
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "RegistryId": "tcr-example",
            "ReplicationRegistryId": "REPLICATION_REGISTRY_ID",
            "Status": "Running"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

```bash
tccli tcr DeleteReplicationInstance \
    --RegistryId REGISTRY_ID \
    --ReplicationRegistryId REPLICATION_REGISTRY_ID \
    --region <Region>
# expected: exit 0
```

验证复制实例已删除：

```bash
tccli tcr DescribeReplicationInstances \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, TotalCount == 0 或 ReplicationRegistries 为空
```

**预期输出**：

```json
{
    "TotalCount": 0,
    "ReplicationRegistries": null,
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**3. 删除同步专用访问凭证：**

清理前确认凭证存在：

```bash
tccli tcr DescribeInstanceToken \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, 记录待删凭证的 Id（即 DeleteInstanceToken 所需 --TokenId 的值）
```

**预期输出**：

```json
{
    "Tokens": [
        {
            "Id": "tcr-token-example",
            "Desc": "自建 Harbor 数据同步专用",
            "Enabled": true
        }
    ],
    "TotalCount": 1,
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

```bash
tccli tcr DeleteInstanceToken \
    --RegistryId REGISTRY_ID \
    --TokenId TOKEN_ID \
    --region <Region>
# expected: exit 0
```

验证凭证已删除：

```bash
tccli tcr DescribeInstanceToken \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, Tokens 列表中不再包含已删凭证
```

**4. 清理公网白名单和入口（若使用了公网方案）：**

清理前查询已有白名单：

```bash
tccli tcr DescribeSecurityPolicies \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, 记录各策略的 PolicyIndex 和 PolicyVersion
```

**预期输出**：

```json
{
    "SecurityPolicySet": [
        {
            "PolicyIndex": 0,
            "CidrBlock": "HARBOR_EXIT_IP/32",
            "Description": "自建 Harbor 公网访问",
            "PolicyVersion": "1"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

逐个删除白名单：

```bash
tccli tcr DeleteSecurityPolicy \
    --RegistryId REGISTRY_ID \
    --PolicyIndex POLICY_INDEX \
    --PolicyVersion POLICY_VERSION \
    --region <Region>
# expected: exit 0
```

> `PolicyIndex` 和 `PolicyVersion` 均来自 `DescribeSecurityPolicies` 返回的 `SecurityPolicySet[*]` 中各字段。

验证白名单已清空：

```bash
tccli tcr DescribeSecurityPolicies \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, SecurityPolicySet 为空
```

关闭公网访问入口：

```bash
tccli tcr ManageExternalEndpoint \
    --RegistryId REGISTRY_ID \
    --Operation Delete \
    --region <Region>
# expected: exit 0
```

验证公网入口已关闭：

```bash
tccli tcr DescribeExternalEndpointStatus \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, Status == "Closed"
```

**预期输出**：

```json
{
    "Status": "Closed",
    "Reason": "",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**5. 清理内网访问链路（若使用了内网方案）：**

清理前确认链路存在：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0
```

删除内网链路：

`tcr-manage-internal-endpoint-delete.json`：

```json
{
    "RegistryId": "REGISTRY_ID",
    "Operation": "Delete",
    "VpcId": "VPC_ID",
    "SubnetId": "SUBNET_ID"
}
```

```bash
tccli tcr ManageInternalEndpoint \
    --cli-input-json file://tcr-manage-internal-endpoint-delete.json \
    --region <Region>
# expected: exit 0
```

验证已删除：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, AccessVpcSet 为 null 或 TotalCount == 0
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ManageInternalEndpoint` 返回 `FailedOperation` | `tccli vpc DescribeVpcs --region <Region>` 和 `tccli vpc DescribeSubnets --region <Region>` 确认 VPC 和子网均存在且状态正常 | VPC ID 或子网 ID 不存在 / 不可用 | 修正 `VpcId` 和 `SubnetId` 为有效值，且确保子网与 TCR 实例同地域 |
| `ManageExternalEndpoint --Operation Create` 返回 `UnsupportedOperation` | `tccli tcr DescribeExternalEndpointStatus --RegistryId REGISTRY_ID --region <Region>` 确认当前状态 | 公网入口已为 `Opened` 状态，重复执行 Create（非幂等）。错误信息含 "The current public network access status is Opened" | 仅在 `Status == "Closed"` 时执行 Create。若当前为 `Opened`，表示入口已就绪，跳过开启步骤直接使用 |
| `CreateSecurityPolicy` 返回 `InvalidParameter` | `tccli tcr DescribeSecurityPolicies --RegistryId REGISTRY_ID --region <Region>` 确认现有策略列表 | `CidrBlock` 格式不正确（非合法 IPv4 CIDR）或 `Description` 为空字符串 | 修正为合法 IPv4 地址段（如 `1.2.3.4/32`），`Description` 不可为空 |
| `CreateReplicationInstance` 返回 `UnsupportedOperation` | `tccli tcr DescribeInstances --Registryids '["REGISTRY_ID"]' --region <Region>` 确认 `RegistryType` | 实例非高级版（`premium`）或目标地域不支持复制 | 升级实例至高级版：`tccli tcr ModifyInstance --RegistryId REGISTRY_ID --RegistryType premium --region <Region>`，或选择支持的地域 |
| `ManageReplication` 返回 `InternalError: Not support slave region` | `tccli tcr DescribeReplicationInstances --RegistryId REGISTRY_ID --region <Region>` 确认复制实例 `Status` 为 `"Running"`；检查当前执行地域是否为源实例地域 | 从源实例地域执行跨地域复制规则设置，API 受限 | 切换至目标地域（副实例所在地域）执行 `ManageReplication`，指定 `SourceRegistryId` 为源实例、`DestinationRegistryId` 为本地实例；或通过 [TCR 控制台](https://console.cloud.tencent.com/tcr/replication) 在目标地域配置 |
| `CreateInstanceToken` 返回 `InvalidParameter` | 检查 `TokenType` 参数值 | `TokenType` 不是 `longterm` | 修正为 `--TokenType longterm` |
| `DeleteSecurityPolicy` 返回 `InvalidParameter` | `tccli tcr DescribeSecurityPolicies --RegistryId REGISTRY_ID --region <Region>` 确认 `PolicyIndex` 和 `PolicyVersion` | `PolicyIndex` 不存在或 `PolicyVersion` 不匹配 | 使用 `DescribeSecurityPolicies` 返回的实际 `PolicyIndex` 和 `PolicyVersion` |
| `CamNoAuth` 或权限拒绝 | `tccli tcr DescribeInstances --region <Region>` 确认当前凭证是否有 TCR 读权限 | 子账号缺少所需 CAM 权限 | 此为环境限制，非命令错误。授予 `QcloudTCRFullAccess` 预设策略，或参考[企业版授权方案示例](https://cloud.tencent.com/document/product/1141/41417) |
| `LimitExceeded` | `tccli vpc DescribeVpcs --region <Region>` 统计已有 VPC 数量 | 当前账号 VPC 数量已达上限 | 此为环境限制，非命令错误。清理不再使用的 VPC 后重试，或使用已有 VPC 和子网 |
| `TradeFailed` 或计费相关错误 | 检查账户余额和实例配额 | 账户欠费或实例配额不足 | 此为环境限制，非命令错误。前往控制台充值或调整配额 |

### 创建成功但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| Harbor 测试连接失败 | `tccli tcr DescribeExternalEndpointStatus --RegistryId REGISTRY_ID --region <Region>` 确认状态；内网方案：`tccli tcr DescribeInternalEndpoints --RegistryId REGISTRY_ID --region <Region>` 确认链路状态 | 网络不通（公网入口未开启/内网链路未就绪）或凭证错误 | 公网：确保 `Status=Opened`；内网：确保 `AccessVpcSet[0].Status=Enabled`；两种方案均检查凭证正确性 |
| Harbor 提供者列表中无 "Tencent TCR" | Harbor Web UI 版本号确认 | Harbor 版本低于 v2.1.2 | 选择 "Docker Registry" 提供者，使用 `CreateInstanceToken` 返回的凭证（非功能缺陷，是版本限制） |
| `CreateInstanceToken` 返回的 Token 丢失 | 无（Token 仅返回一次，不可恢复） | Token 创建时未妥善保存 | 先删除旧 Token：`tccli tcr DeleteInstanceToken --RegistryId REGISTRY_ID --TokenId TOKEN_ID --region <Region>`，再重新 `CreateInstanceToken` |
| `DescribeReplicationPolicies` 返回空 | Harbor Web UI 确认复制规则已创建；`tccli tcr DescribeReplicationInstances --RegistryId REGISTRY_ID --region <Region>` 确认复制实例存在 | Harbor 侧尚未创建复制规则或规则未生效（非 tccli 问题） | 确认 Harbor 复制规则已创建并已触发同步 |
| 同步完成后 TCR 侧命名空间不存在 | `tccli tcr DescribeNamespaces --RegistryId REGISTRY_ID --region <Region>` 确认命名空间是否存在 | "Docker Registry" 提供者不支持自动创建命名空间 | 先在 TCR 侧手动创建：`tccli tcr CreateNamespace --RegistryId REGISTRY_ID --NamespaceName NAMESPACE_NAME --IsPublic true --region <Region>`，然后重新触发同步 |
| `DescribeExternalEndpointStatus` 长时间为 `Opening` | 持续轮询 `tccli tcr DescribeExternalEndpointStatus --RegistryId REGISTRY_ID --region <Region>`（通常 1-2 分钟完成） | 后端资源预占延迟 | 若超过 5 分钟仍为 `Opening`，保留 RequestId 和 RegistryId，登录 [TCR 控制台](https://console.cloud.tencent.com/tcr) 查看详细状态；仍无法解决则 [提交工单](https://console.cloud.tencent.com/workorder) |
| 公网同步慢或耗时长 | `docker pull` 速度监控；`tccli tcr DescribeExternalEndpointStatus --RegistryId REGISTRY_ID --region <Region>` 确认公网入口正常 | 公网带宽限制或镜像体积较大 | 建议改为通过专线/内网同步：使用方案 A 的 `ManageInternalEndpoint --Operation Create` |
| `CreateReplicationInstance` 成功但复制实例长时间不 Running | `tccli tcr DescribeReplicationInstanceCreateTasks --ReplicationRegistryId REPLICATION_REGISTRY_ID --ReplicationRegionId REPLICATION_REGION_ID --region <Region>` 查看任务状态 | 后端创建缓慢（正常）或卡住（异常） | 继续等待；超过 15 分钟则保留 RegistryId、ReplicationRegistryId、RequestId -> 登录控制台查看详细状态 |
| Filter 不生效，同步了不期望的镜像 | 检查 `ManageReplication` JSON 中 `Filters[].Type` 字段 | `Type` 写成了大写 `Name` 而非小写 `name` | 修正为小写：`"Type": "name"`、`"Type": "tag"`、`"Type": "resource"`。执行 `DescribeReplicationPolicies` 可确认已生效的 Filter |

## 下一步

- [跨实例（账号）同步镜像](../../ops/image-distribution/cross-instance-sync)（page_id `41945`）— TCR 实例间的镜像同步规则管理
- [同实例多地域复制镜像](../../ops/image-distribution/cross-region-replication)（page_id `52095`）— 高级版实例多地域副本复制详解
- [创建企业版实例](../../ops/instances/create) — 购买 TCR 企业版实例
- [配置公网访问控制](../../ops/access/network/public-access) — 管理公网白名单（`CreateSecurityPolicy` / `DeleteSecurityPolicy`）
- [配置内网访问控制](../../ops/access/network/private-access) — VPC 内网链路管理（`ManageInternalEndpoint`）
- [管理命名空间](../../ops/image-creation/namespace) — 创建命名空间与镜像仓库

## 控制台替代

[容器镜像服务 -> 同步复制 -> 实例复制](https://console.cloud.tencent.com/tcr/replication)：登录自建 Harbor -> 系统管理 -> 仓库管理 -> 新建目标（选择 "Tencent TCR" 或 "Docker Registry" 提供者）-> 复制管理 -> 新建规则 -> 触发同步。
