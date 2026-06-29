---
title: "混合云下的多平台镜像数据同步复制"
description: "· page_id `60740`"
---

> 对照官方：[混合云下的多平台镜像数据同步复制](https://cloud.tencent.com/document/product/1141/60740) · page_id `60740`

## 概述

混合云场景下，容器镜像需要在跨主账号、跨地域、跨国、跨平台的多个容器镜像仓库之间同步复制。TCR 提供实例复制、实例同步、镜像迁移工具及自定义域名等多项能力，覆盖以下三类典型场景。

| 场景 | 说明 | 核心能力 | 实例规格要求 |
|------|------|---------|------------|
| 跨地域实例复制 | 国内/跨国多地域间同步镜像，实现就近拉取 | 实例复制 + 实例同步 | 高级版 |
| 跨平台镜像迁移或同步 | 公有云/自建仓库/多家云平台间的镜像流转 | image-transfer + Harbor 同步 | 无特殊要求 |
| DevOps 镜像流转 | 开发、测试、生产环境间的镜像自动传递 | 实例同步 | 标准版或高级版 |

> **使用限制：**
> - 实例同步功能需要实例规格为**标准版或高级版**，basic 实例不支持。
> - 实例复制功能需要实例规格为**高级版**，basic/standard 实例不支持。
> - 暂不支持跨国实例复制（需使用实例同步 + 本地实例复制替代）。

## 前置条件

- [环境准备](../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:DescribeInstances, tcr:CreateReplicationInstance, tcr:DescribeReplicationInstances
#    tcr:DescribeReplicationInstanceCreateTasks, tcr:ManageReplication
#    tcr:DescribeReplicationPolicies, tcr:DeleteReplicationRule
#    tcr:DeleteReplicationInstance, tcr:ManageInternalEndpoint
#    tcr:DescribeInternalEndpoints, tcr:DescribeInstanceCustomizedDomain
#    tcr:DescribeReplicationInstanceSyncStatus, tcr:ModifyInstance
# 验证：执行 DescribeInstances 确认权限
tccli tcr DescribeInstances --region ap-guangzhou
# expected: exit 0，返回实例列表（可为空）
```

### 资源检查

```bash
# 4. 确认主实例存在且状态正常
tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'
# expected: exit 0, Status: "Running"

# 5. 确认实例规格满足场景需求（场景一需高级版，场景三需标准版或高级版）
tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'
# expected: exit 0, RegistryType 为 "premium"（场景一）或 "standard"/"premium"（场景三）

# 6. （场景三）确认目标实例的命名空间已预先创建
tccli tcr DescribeNamespaces --region <Region> --RegistryId DEST_REGISTRY_ID
# expected: exit 0, 目标命名空间在列表中

# 7. （跨主账号场景）确认目标侧提供的凭证可访问目标实例
tccli tcr DescribeInstances --region PEER_REGION --Registryids '["PEER_REGISTRY_ID"]'
# expected: exit 0，使用目标账号凭证执行，返回目标实例信息
```

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看实例列表 | `DescribeInstances` | 是 |
| 查看已有复制实例 | `DescribeReplicationInstances` | 是 |
| 创建复制实例（新建从实例） | `CreateReplicationInstance` | 否 |
| 查询复制实例创建任务进度 | `DescribeReplicationInstanceCreateTasks` | 是 |
| 配置 VPC 内网接入 | `ManageInternalEndpoint` | 是（相同 VPC 重复接入不会报错） |
| 查看同步策略列表 | `DescribeReplicationPolicies` | 是 |
| 创建/更新同步规则 | `ManageReplication` | 否（作为创建时） |
| 查看同步状态 | `DescribeReplicationInstanceSyncStatus` | 是 |
| 查看自定义域名 | `DescribeInstanceCustomizedDomain` | 是 |
| 删除同步规则 | `DeleteReplicationRule` | 是 |
| 删除从实例 | `DeleteReplicationInstance` | 是 |
| 升级实例规格 | `ModifyInstance` | 是（已为目标规格则无操作） |

## 关键字段说明

以下说明本页面涉及的主要 API 的核心参数。完整参数定义见各 API 的 `--generate-cli-skeleton` 输出。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | 格式 `tcr-` 开头，长度 22。主实例 ID | `InvalidParameter`：实例不存在或无权访问 |
| `ReplicationRegionId` | Integer | 是 | 目标地域数字 ID，如 `4`（ap-shanghai）。取值见[地域列表](https://cloud.tencent.com/document/product/1141/39265) | 写入错误地域后不可回退，需删除从实例重新创建 |
| `ReplicationRegionName` | String | 是 | 目标地域名称，如 `ap-shanghai`，须与 `ReplicationRegionId` 一致 | `InvalidParameter`：与 RegionId 不匹配 |
| `SyncTag` | Boolean | 否 | `true`：同步 Tag；`false`：不同步。默认 `false` | 省略时 Tag 不会被同步到从实例 |
| `SourceRegistryId` | String | 是 | 源实例 ID，格式 `tcr-` 开头 | `InvalidParameter`：实例不存在 |
| `DestinationRegistryId` | String | 是 | 目标实例 ID，格式 `tcr-` 开头 | `InvalidParameter`：实例不存在或跨地域不可达 |
| `Rule.Name` | String | 是 | 字母数字及 `-._`，以字母或数字开头 | `InvalidParameter`：命名不符合规范 |
| `Rule.DestNamespace` | String | 是 | 目标实例中已存在的命名空间名 | `ResourceNotFound`：命名空间不存在 |
| `Rule.Override` | Boolean | 否 | `true`：覆盖同名镜像；`false`：跳过。默认 `false` | 设为 `false` 时若镜像已存在则同步失败 |
| `Rule.Deletion` | Boolean | 否 | `true`：源删除则目标也删除；`false`：保留。默认 `false` | 设为 `true` 会级联删除目标仓库镜像 |
| `Rule.Filters` | Array | 是 | `[{"Type":"name","Value":"正则"}]`，至少一个。`Value` 为 Go 正则 | 正则错误导致零镜像匹配 |
| `DestinationRegionId` | Integer | 是 | 目标实例所在地域数字 ID | 地域错误导致同步不可达 |
| `PeerReplicationOption.PeerRegistryUin` | String | 否 | 目标主账号 UIN，跨账号必填 | 跨账号场景缺省则无权限访问 |
| `PeerReplicationOption.PeerRegistryToken` | String | 否 | 目标实例用户级长期访问密码，跨账号必填 | 误用服务级凭证则同步持续失败，且错误信息不明确 |
| `EnablePeerReplication` | Boolean | 否 | `true`：启用跨账号同步。默认为同账号 | 跨账号场景漏填则退化为同账号同步 |
| `VpcId` | String | 是 | 格式 `vpc-xxxxxxxx`，目标地域内的 VPC | `InvalidParameter`：VPC 不存在或非目标地域 |
| `SubnetId` | String | 是 | 格式 `subnet-xxxxxxxx`，属于指定 VPC | `InvalidParameter`：子网不存在或不在 VPC 下 |
| `Operation` | String | 是 | `Create`：新增接入；`Delete`：移除接入 | 填写错误导致操作语义相反 |

## 操作步骤

### 场景一：跨地域实例复制

当业务部署在多个地域时，使用**实例复制**功能实现单地域上传、多地域高速实时同步、就近内网拉取。此场景需要**高级版**实例。

#### 步骤 1：确认主实例规格

##### 选择依据

- **实例规格**：实例复制仅高级版支持。若当前实例为 basic 或 standard，需先升级至 premium。
- **升级方式**：basic 到 premium 为在线升级，不中断服务，零预付扣费。

```bash
tccli tcr DescribeInstances \
    --region <Region> \
    --Registryids '["REGISTRY_ID"]'
# expected: exit 0, RegistryType: "premium", Status: "Running"
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
            "InternalEndpoint": "10.0.0.1"
        }
    ]
}
```

若 `RegistryType` 不是 `premium`，执行升级：

```bash
tccli tcr ModifyInstance \
    --RegistryId REGISTRY_ID \
    --RegistryType premium \
    --region <Region>
# expected: exit 0
```

升级为异步操作，轮询确认变更生效：

```bash
tccli tcr DescribeInstances \
    --region <Region> \
    --Registryids '["REGISTRY_ID"]'
# expected: exit 0, RegistryType: "premium", Status: "Running"
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `REGISTRY_ID` | 主实例 ID | 格式 `tcr-xxxxxxxxxxxx` | `tccli tcr DescribeInstances` |
| `REGION` | 主实例所在地域 | 如 `ap-guangzhou` | `tccli tcr DescribeInstances` 返回的 `RegionName` |

#### 步骤 2：查看当前复制实例关系

```bash
tccli tcr DescribeReplicationInstances \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0
```

**预期输出**（首次创建时为空）：

```json
{
    "TotalCount": 0,
    "ReplicationRegistries": null
}
```

确认当前未配置复制实例，避免在同一地域重复创建。

#### 步骤 3：创建从实例

##### 选择依据

- **ReplicationRegionId**：选择目标地域的数字 ID。业务就近访问优先选择用户集中的地域（如华东选 `4`/ap-shanghai），降低镜像拉取延迟。
- **SyncTag**：选 `true` 以保持 Tag 一致性。若 Tag 量大且仅需部分 Tag，可选 `false` 以减少同步开销。
- **`--region` 参数**：始终指向主实例所在地域，即使创建的是其他地域的从实例。

##### 最小配置（只含必填字段）

`replication_instance-minimal.json`：

```json
{
    "RegistryId": "<RegistryId>",
    "ReplicationRegionId": 4,
    "ReplicationRegionName": "ap-shanghai"
}
```

```bash
tccli tcr CreateReplicationInstance \
    --cli-input-json file://replication_instance-minimal.json \
    --region ap-guangzhou
# expected: exit 0, 返回 ReplicationRegistryId
```

##### 增强配置（含可选字段）

`replication_instance-enhanced.json`：

```json
{
    "RegistryId": "<RegistryId>",
    "ReplicationRegionId": 4,
    "ReplicationRegionName": "ap-shanghai",
    "SyncTag": true
}
```

```bash
tccli tcr CreateReplicationInstance \
    --cli-input-json file://replication_instance-enhanced.json \
    --region ap-guangzhou
# expected: exit 0, 返回 ReplicationRegistryId
```

**预期输出**：

```json
{
    "ReplicationRegistryId": "tcr-example-4-example",
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<RegistryId>` | 主实例 ID | 格式 `tcr-xxxxxxxxxxxx` | `tccli tcr DescribeInstances` |
| `ReplicationRegionId` | 目标地域数字 ID | 如 `4`（ap-shanghai） | 见[地域列表](https://cloud.tencent.com/document/product/1141/39265) |
| `ReplicationRegionName` | 目标地域名称 | 如 `ap-shanghai` | 同上 |
| `SyncTag` | 是否同步 Tag | `true` 或 `false` | 自定义 |

记录返回的 `ReplicationRegistryId`（格式为 `<RegistryId>-<ReplicationRegionId>-xxxxx`）。

#### 步骤 4：轮询等待复制实例就绪

`CreateReplicationInstance` 是异步操作，需轮询检查创建任务进度。

```bash
tccli tcr DescribeReplicationInstanceCreateTasks \
    --ReplicationRegistryId REPLICATION_REGISTRY_ID \
    --ReplicationRegionId 4 \
    --region <Region>
# expected: exit 0, 所有子任务 TaskStatus 均为 "SUCCESS"
```

**预期输出**（所有任务完成时）：

```json
{
    "TaskDetail": [
        {
            "TaskName": "SyncDBTask",
            "TaskUUID": "tcr-example-4-example-db",
            "TaskStatus": "SUCCESS",
            "TaskMessage": "success"
        },
        {
            "TaskName": "CreateTcrCrdTask",
            "TaskUUID": "tcr-example-4-example-crd",
            "TaskStatus": "SUCCESS",
            "TaskMessage": "success"
        }
    ]
}
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `REPLICATION_REGISTRY_ID` | 从实例 ID | 步骤 3 `CreateReplicationInstance` 返回值 |

若子任务 `TaskStatus` 仍为 `IN_PROGRESS` 或 `PENDING`，等待 10-30 秒后重试。直到 `TaskDetail` 中所有子任务均为 `SUCCESS`。

##### 多维度验证

轮询结束后，从以下维度交叉验证复制实例是否真正可用：

| 维度 | 检查内容 | 命令 | 预期 |
|------|---------|------|------|
| 任务完成 | 所有子任务 TaskStatus | `DescribeReplicationInstanceCreateTasks` | 均为 `SUCCESS` |
| 实例状态 | 从实例 Status | `DescribeReplicationInstances` | `Running` |
| 实例标识 | ReplicationRegistryId | `DescribeReplicationInstances` 返回 | 格式 `tcr-*-X-*`，非空 |
| 创建时间 | CreatedAt | `DescribeReplicationInstances` 返回 | 为当前时间前后 5 分钟内 |

#### 步骤 5：确认从实例状态

```bash
tccli tcr DescribeReplicationInstances \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, Status: "Running"
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "ReplicationRegistryId": "tcr-example-4-example",
            "ReplicationRegionId": 4,
            "ReplicationRegionName": "ap-shanghai",
            "Status": "Running",
            "CreatedAt": "2026-01-01T00:00:00+08:00"
        }
    ]
}
```

确认 `Status` 为 `Running` 且 `ReplicationRegistryId` 与创建时返回的一致。

#### 步骤 6：将复制地域内的 VPC 接入复制实例

复制实例创建后，需将目标地域内需要拉取镜像的 VPC 接入该实例，实现就近内网拉取。详见[配置内网访问控制](../../ops/access/network/private-access)。

##### 选择依据

- **Operation**：选 `Create` 新增接入。若 VPC 已接入则使用已有链路。
- **VpcId / SubnetId**：选择属于复制实例所在地域（`ReplicationRegionId` 对应地域）的 VPC 和子网。跨地域 VPC 不可用。
- **RegionId / RegionName**：须与复制实例所在地域一致，否则接入链路不可达。

`internal_endpoint-minimal.json`：

```json
{
    "RegistryId": "<RegistryId>",
    "Operation": "Create",
    "VpcId": "<VpcId>",
    "SubnetId": "<SubnetId>"
}
```

```bash
tccli tcr ManageInternalEndpoint \
    --cli-input-json file://internal_endpoint-minimal.json \
    --region <Region>
# expected: exit 0
```

`internal_endpoint-enhanced.json`（含地域参数）：

```json
{
    "RegistryId": "<RegistryId>",
    "Operation": "Create",
    "VpcId": "<VpcId>",
    "SubnetId": "<SubnetId>",
    "RegionId": 4,
    "RegionName": "ap-shanghai"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<RegistryId>` | 主实例 ID | 格式 `tcr-xxxxxxxxxxxx` | `tccli tcr DescribeInstances` |
| `<VpcId>` | VPC 实例 ID | 格式 `vpc-xxxxxxxx`，属于复制实例所在地域 | `tccli vpc DescribeVpcs --region REPLICATION_REGION` |
| `<SubnetId>` | 子网 ID | 格式 `subnet-xxxxxxxx`，属于指定 VPC | `tccli vpc DescribeSubnets --region REPLICATION_REGION` |

> **注意：** `ManageInternalEndpoint` 可能因 VPC 接入配额已满（`LimitExceeded`）而失败。若遇此情况，清理不再使用的 VPC 接入后重试。

#### 跨国场景的折中方案

跨国场景下暂不支持直接实例复制。可采用组合方案：
1. 在国内和国外分别创建高级版实例
2. 配置实例同步规则（`ManageReplication`）实现跨国按需同步（参见[场景三](#场景三devops-镜像流水线)中的同步规则配置）
3. 在上述国内外实例上分别执行 `CreateReplicationInstance`，在各自区域内创建从实例

最终效果：国内单点推送，实例复制到各国内地域；国外通过同步规则拉取，实例复制到各国外地域。

### 场景二：跨平台镜像迁移

多平台间（TCR、Docker Hub、Harbor、阿里云 ACR 等）的镜像迁移或同步，主要使用 image-transfer 工具和 Harbor 自建中转方案。此场景**不受实例规格限制**，basic 实例即可。

#### 方式一：使用 image-transfer 工具

[image-transfer](https://github.com/tkestack/image-transfer) 是腾讯云开源镜像迁移工具，支持 Docker Registry V2 标准的所有镜像仓库（TCR、Docker Hub、Quay、ACR、Harbor 等）间的批量迁移。

操作流程：
1. 编写认证鉴权文件 `auth.json`，配置源和目标仓库的访问凭证
2. 编写迁移规则文件 `transfer.json`，定义镜像的源/目标映射关系
3. 运行 image-transfer 容器

`auth.json` 示例：

```json
{
    "src-registry.example.com": {
        "username": "SRC_USERNAME",
        "password": "SRC_PASSWORD",
        "insecure": false
    },
    "example-registry.tencentcloudcr.com": {
        "username": "TCR_USERNAME",
        "password": "TCR_PASSWORD",
        "insecure": false
    }
}
```

`transfer.json` 示例：

```json
{
    "src-registry.example.com": {
        "source-ns/source-repo:tag": "example-registry.tencentcloudcr.com/dest-ns/dest-repo:tag"
    }
}
```

执行迁移：

```bash
docker run --rm \
    -v "$(pwd)/auth.json:/app/auth.json" \
    -v "$(pwd)/transfer.json:/app/transfer.json" \
    tkestack/image-transfer
# expected: 镜像迁移成功日志，exit 0
```

> **说明：**
> - image-transfer 运行在本地终端或服务器上，不属于 tccli 边界，但属于场景二的核心操作工具。
> - `insecure: true` 表示跳过 TLS 验证，仅适用于非生产环境的自建仓库。
> - 详细用法参见 [image-transfer README](https:/github.com/tkestack/image-transfer/blob/main/readme.md)。

**一键迁移模式（CCR 个人版到 TCR 企业版）：** 参见[个人版迁移至企业版完全指南](https://cloud.tencent.com/document/product/1141/52292)，该模式封装了认证和迁移规则，简化操作流程。

#### 方式二：通过自建 Harbor 实现跨平台实时同步

若需在第三方平台间实时同步镜像，可使用自建 Harbor 作为中转枢纽：

1. 在 Harbor 配置 Pull-based 复制策略，将源平台的镜像定期拉取至 Harbor
2. 在 Harbor 配置 Push-based 复制策略，将 Harbor 内的镜像推送至目标平台

> **支持的镜像仓库服务：** Docker Hub、Docker Registry、AWS ECR、Azure ACR、阿里云 ACR、GCR、华为 SWR、Artifact Hub、GitLab、Quay、JFrog Artifactory、TCR。

此方式无需 TCR tccli 操作。详见[从自建 Harbor 同步镜像到 TCR 企业版](https://cloud.tencent.com/document/product/1141/44970)。

#### 使用自定义域名保证服务连续性

从其他镜像仓库迁移至 TCR 时，可为 TCR 实例配置自定义域名，沿用原有仓库域名，保持发布配置和 CI/CD 流程不变。

查看已有自定义域名：

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "DomainInfoList": [
        {
            "RegistryId": "tcr-example",
            "CertId": "example-cert-id",
            "DomainName": "test.example.com",
            "Status": "SUCCESS"
        }
    ],
    "TotalCount": 1
}
```

`Status` 枚举：`SUCCESS`（绑定成功）、`FAILED`（绑定失败）、`PROCESSING`（处理中）。

配置自定义域名操作参见[配置自定义域名](../../ops/access/domain/custom-domain)，涉及 SSL 证书上传（`tccli ssl UploadCertificate`）和 DNS CNAME 解析。

### 场景三：DevOps 镜像流水线

利用 TCR 实例同步功能，实现开发、测试、预发布、生产环境之间的镜像自动流转。此场景需要**标准版或高级版**实例。

#### 步骤 1：查看当前同步策略列表

```bash
tccli tcr DescribeReplicationPolicies \
    --RegistryId DEV_REGISTRY_ID \
    --region <Region>
# expected: exit 0
```

**预期输出**（首次时为空）：

```json
{
    "TotalCount": 0,
    "ReplicationPolicyInfoList": null
}
```

确认当前无已配置的同步规则。跨账号场景请同时参见[跨实例（账号）同步镜像](../../ops/image-distribution/cross-instance-sync)。

#### 步骤 2：配置同步规则

在开发环境实例上创建同步规则，将镜像自动推送到测试环境实例。

##### 选择依据

- **Rule.Override**：选 `true` 以确保每次推送都用最新镜像覆盖目标。若需保留历史版本则选 `false`，但需确保 Tag 唯一避免冲突。
- **Rule.Deletion**：选 `false` 以保留目标仓库镜像，防止源端误删导致目标也丢失。仅当需要严格镜像生命周期同步时才选 `true`。
- **Rule.Filters**：使用 `".*"` 匹配所有镜像。生产环境建议限制范围（如 `"release-.*"`），避免调试镜像污染生产环境。
- **DestinationRegionId**：选目标实例所在地域的数字 ID，跨地域同步需确保网络可达。

##### 最小配置（只含必填字段）

`sync_dev_to_test-minimal.json`：

```json
{
    "SourceRegistryId": "<DevRegistryId>",
    "DestinationRegistryId": "<TestRegistryId>",
    "Rule": {
        "Name": "dev-to-test",
        "DestNamespace": "<DestNamespace>",
        "Filters": [
            {
                "Type": "name",
                "Value": ".*"
            }
        ]
    },
    "DestinationRegionId": 1
}
```

```bash
tccli tcr ManageReplication \
    --cli-input-json file://sync_dev_to_test-minimal.json \
    --region <Region>
# expected: exit 0
```

##### 增强配置（含可选字段）

`sync_dev_to_test-enhanced.json`：

```json
{
    "SourceRegistryId": "<DevRegistryId>",
    "DestinationRegistryId": "<TestRegistryId>",
    "Rule": {
        "Name": "dev-to-test",
        "DestNamespace": "<DestNamespace>",
        "Override": true,
        "Filters": [
            {
                "Type": "name",
                "Value": ".*"
            }
        ],
        "Deletion": false
    },
    "Description": "开发环境到测试环境自动同步",
    "DestinationRegionId": 1
}
```

```bash
tccli tcr ManageReplication \
    --cli-input-json file://sync_dev_to_test-enhanced.json \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<DevRegistryId>` | 源（开发）实例 ID | 格式 `tcr-xxxxxxxxxxxx` | `tccli tcr DescribeInstances` |
| `<TestRegistryId>` | 目标（测试）实例 ID | 格式 `tcr-xxxxxxxxxxxx` | 同上 |
| `<DestNamespace>` | 目标实例命名空间 | 需在目标实例中预先创建 | `tccli tcr DescribeNamespaces --region <Region> --RegistryId TEST_REGISTRY_ID` |
| `DestinationRegionId` | 目标实例所在地域数字 ID | 如 `1`（ap-guangzhou） | 见[地域列表](https://cloud.tencent.com/document/product/1141/39265) |

同一主账号内，按同样模式配置后续环节（测试到预发布、预发布到生产）：

- `test-to-staging`：`DestNamespace: "staging"`
- `staging-to-prod`：`DestNamespace: "production"`

#### 步骤 3：验证同步规则已生效

```bash
tccli tcr DescribeReplicationPolicies \
    --RegistryId DEV_REGISTRY_ID \
    --region <Region>
# expected: exit 0, Enabled: true
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "ReplicationPolicyInfoList": [
        {
            "ID": 2,
            "Name": "dev-to-test",
            "Enabled": true,
            "SrcResource": "example-registry/.* ap-guangzhou",
            "DestResource": "tcr-example-1/example-ns ap-guangzhou",
            "Filters": [
                {"Type": "name", "Value": ".*"}
            ],
            "Override": true
        }
    ]
}
```

确认 `Enabled` 为 `true` 且 `Filters` 与预期一致。

#### 步骤 4：查看同步状态

```bash
tccli tcr DescribeReplicationInstanceSyncStatus \
    --RegistryId DEV_REGISTRY_ID \
    --ReplicationRegistryId REPLICATION_REGISTRY_ID \
    --ShowReplicationLog true \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "ReplicationStatus": "Succeed",
    "ReplicationTime": "2026-01-01T00:05:00+08:00",
    "ReplicationLog": {
        "ReplicationTime": "2026-01-01T00:05:00+08:00",
        "TaskId": 42,
        "Status": "Succeed",
        "Percentage": 100,
        "Total": 3
    }
}
```

`ReplicationStatus` 枚举：`Succeed`（同步成功）、`InProgress`（同步中）、`Failed`（同步失败）、`Cancel`（已取消）。

当 `Status` 为 `Failed` 时，通过 `ShowReplicationLog` 查看具体失败原因。

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `DEV_REGISTRY_ID` | 源实例 ID | `tccli tcr DescribeInstances` |
| `REPLICATION_REGISTRY_ID` | 目标实例 ID | 同上 |

#### 步骤 5（可选）：跨主账号同步

若不同环境分属不同的腾讯云主账号，在步骤 2 的 `ManageReplication` 请求中增加 `PeerReplicationOption`。

##### 选择依据

- **PeerRegistryToken**：必须使用**用户级账号**长期访问密码，服务级账号凭证不支持跨主账号同步。选取长期凭证以避免同步因凭证过期中断。
- **EnablePeerReplication**：设为 `true`。此字段是跨账号开关，漏填则退化为同账号同步。

##### 最小配置（只含必填字段）

`sync_cross_account-minimal.json`：

```json
{
    "SourceRegistryId": "<DevRegistryId>",
    "DestinationRegistryId": "<PeerRegistryId>",
    "Rule": {
        "Name": "dev-to-test-cross-account",
        "DestNamespace": "<DestNamespace>",
        "Filters": [
            {
                "Type": "name",
                "Value": ".*"
            }
        ]
    },
    "DestinationRegionId": 1,
    "PeerReplicationOption": {
        "PeerRegistryUin": "<PeerUin>",
        "PeerRegistryToken": "<PeerToken>",
        "EnablePeerReplication": true
    }
}
```

```bash
tccli tcr ManageReplication \
    --cli-input-json file://sync_cross_account-minimal.json \
    --region <Region>
# expected: exit 0
```

##### 增强配置（含可选字段）

`sync_cross_account-enhanced.json`：

```json
{
    "SourceRegistryId": "<DevRegistryId>",
    "DestinationRegistryId": "<PeerRegistryId>",
    "Rule": {
        "Name": "dev-to-test-cross-account",
        "DestNamespace": "<DestNamespace>",
        "Override": true,
        "Filters": [
            {
                "Type": "name",
                "Value": ".*"
            }
        ],
        "Deletion": false
    },
    "Description": "跨主账号同步：开发到测试",
    "DestinationRegionId": 1,
    "PeerReplicationOption": {
        "PeerRegistryUin": "<PeerUin>",
        "PeerRegistryToken": "<PeerToken>",
        "EnablePeerReplication": true
    }
}
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `<PeerUin>` | 目标主账号 UIN | 目标账号基本信息页 |
| `<PeerToken>` | 目标实例长期访问凭证 | 目标实例 [用户级账号](https://cloud.tencent.com/document/product/1141/41829) 密码 |
| `<PeerRegistryId>` | 目标实例 ID | 目标侧 `tccli tcr DescribeInstances` |

> **注意：**
> - 仅支持[用户级账号](https://cloud.tencent.com/document/product/1141/41829)，不支持[服务级账号](https://cloud.tencent.com/document/product/1141/89137)。
> - 同步规则的生命周期与目标账号最新添加规则的访问凭证生命周期保持一致，请使用长期访问凭证。

#### 交付流水线（CODING DevOps）

对于更复杂的 DevOps 需求，可使用腾讯云 [CODING DevOps](https://console.cloud.tencent.com/coding) 一站式平台。TCR 的交付流水线功能依赖于 CODING DevOps 的 CI/CD 能力，支持推送代码自动触发镜像构建和部署、本地推送镜像后自动触发部署。

> 交付流水线非 tccli 范围，详见[使用交付流水线实现容器 DevOps](https://cloud.tencent.com/document/product/1141/48186)。

## 验证

### 控制面（tccli）

**实例复制验证：**

```bash
# 1. 确认从实例状态
tccli tcr DescribeReplicationInstances \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, Status: "Running", ReplicationRegistryId 非空

# 2. 确认复制任务全部完成
tccli tcr DescribeReplicationInstanceCreateTasks \
    --ReplicationRegistryId REPLICATION_REGISTRY_ID \
    --ReplicationRegionId REPLICATION_REGION_ID \
    --region <Region>
# expected: exit 0, 所有 TaskDetail[].TaskStatus 均为 "SUCCESS"
```

**实例同步验证：**

```bash
# 3. 确认同步规则已启用
tccli tcr DescribeReplicationPolicies \
    --RegistryId DEV_REGISTRY_ID \
    --region <Region>
# expected: exit 0, Enabled: true

# 4. 确认同步状态为成功
tccli tcr DescribeReplicationInstanceSyncStatus \
    --RegistryId DEV_REGISTRY_ID \
    --ReplicationRegistryId REPLICATION_REGISTRY_ID \
    --ShowReplicationLog true \
    --region <Region>
# expected: exit 0, ReplicationStatus: "Succeed"
```

**自定义域名验证：**

```bash
# 5. 确认域名绑定状态
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, Status: "SUCCESS"
```

### 数据面

**镜像迁移验证（TCR 侧）：**

```bash
tccli tcr DescribeImages \
    --RegistryId REGISTRY_ID \
    --NamespaceName NAMESPACE \
    --RepositoryName REPO \
    --region <Region>
# expected: 目标镜像 Tag 在列表中
```

**自定义域名 DNS 解析验证：**

```bash
nslookup CUSTOM_DOMAIN
# expected: 解析结果为 CNAME 指向 TCR 实例域名
```

**镜像拉取验证（从复制实例）：**

```bash
docker pull REPLICATION_REGISTRY_DOMAIN/NAMESPACE/REPO:TAG
# expected: 镜像拉取成功
```

## 清理

> **计费提醒：** TCR 企业版实例按规格和时长计费。实例复制产生的从实例按主实例规格计费，删除从实例或同步规则不会自动退还已产生的费用。请确认无需继续使用后再执行清理操作。

### 数据面

清理 image-transfer 产生的本地凭证文件（含敏感信息）：

```bash
rm auth.json transfer.json
# expected: 文件已删除
```

若在 Harbor 配置了中转复制策略，迁移完成后在 Harbor UI 停用并删除对应规则。

若为 TCR 实例配置了自定义域名且不再需要，删除 SSL 证书绑定和 DNS CNAME 记录（参见[配置自定义域名](../../ops/access/domain/custom-domain)）。

### 控制面（tccli）

按依赖倒序依次清理：同步规则 -> VPC 内网接入链路 -> 从实例。

> **副作用警告：** `DeleteReplicationInstance` 会删除从实例及其所有关联数据，从实例上的镜像和配置将永久丢失。`DeleteReplicationRule` 仅删除同步规则本身，不会删除已同步的镜像数据。

#### 步骤 1：清理前状态检查

先确认待清理的资源列表：

```bash
# 查看同步规则
tccli tcr DescribeReplicationPolicies \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: 记录 Rule ID，确认是待删除的规则

# 查看复制实例
tccli tcr DescribeReplicationInstances \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: 记录 ReplicationRegistryId，确认是待删除的从实例

# 查看 VPC 内网接入（如有）
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: 记录 VpcId，确认接入链路
```

#### 步骤 2：删除同步规则

```bash
tccli tcr DeleteReplicationRule \
    --RegistryId REGISTRY_ID \
    --RuleId RULE_ID \
    --region <Region>
# expected: exit 0
```

验证已删除：

```bash
tccli tcr DescribeReplicationPolicies \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: TotalCount: 0
```

#### 步骤 3：删除 VPC 内网接入链路（如有）

`delete_endpoint.json`：

```json
{
    "RegistryId": "<RegistryId>",
    "Operation": "Delete",
    "VpcId": "<VpcId>"
}
```

```bash
tccli tcr ManageInternalEndpoint \
    --cli-input-json file://delete_endpoint.json \
    --region <Region>
# expected: exit 0
```

验证已删除：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: TotalCount: 0
```

#### 步骤 4：删除从实例

```bash
tccli tcr DeleteReplicationInstance \
    --RegistryId REGISTRY_ID \
    --ReplicationRegistryId REPLICATION_REGISTRY_ID \
    --ReplicationRegionId REPLICATION_REGION_ID \
    --region <Region>
# expected: exit 0
```

验证已删除：

```bash
tccli tcr DescribeReplicationInstances \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: TotalCount: 0
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateReplicationInstance` 返回 `UnsupportedOperation` | `tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'` 查看 `RegistryType` | 实例非高级版，basic/standard 实例不支持实例复制 | 升级实例规格：`tccli tcr ModifyInstance --RegistryId REGISTRY_ID --RegistryType premium --region <Region>`；或改用实例同步（`ManageReplication`）替代 |
| `ManageReplication` 返回 `UnsupportedOperation` | `tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'` 查看 `RegistryType` | 实例为 basic 版，不支持实例同步 | 升级实例规格：`tccli tcr ModifyInstance --RegistryId REGISTRY_ID --RegistryType standard --region <Region>`；若无法升级，使用 image-transfer 工具手动同步 |
| `ManageReplication` 返回 `InvalidParameter` | 检查 `Rule.Name` 的组成字符和长度 | 规则名称不符合命名规范（仅支持字母数字及 `-._`，以字母或数字开头） | 修正 `Rule.Name`，确保符合规范，如 `"dev-to-test"` |
| `ManageReplication` 返回 `InternalError`，错误信息："Not support slave region" | `tccli tcr DescribeReplicationInstances --RegistryId REGISTRY_ID --region <Region>` 确认当前实例是否为复制从实例 | 当前实例是通过 `CreateReplicationInstance` 创建的从实例（slave），从实例不支持作为 `ManageReplication` 的 `SourceRegistryId` 发起同步规则 | 在源主实例（非 slave 的主实例）上执行 `ManageReplication`。从实例仅用于接收镜像复制，不支持创建同步规则作为同步源 |
| 跨主账号同步返回权限错误 | `tccli tcr DescribeInstances --region PEER_REGION --Registryids '["PEER_REGISTRY_ID"]'` 使用目标账号凭证确认目标实例存在且可访问 | `PeerRegistryToken` 使用了服务级账号凭证或不正确的密码 | 改用目标实例的[用户级账号](https://cloud.tencent.com/document/product/1141/41829)长期访问密码，重新执行 `ManageReplication` |
| 删除实例时返回 "please delete the replication rule first" | `tccli tcr DescribeReplicationInstances --RegistryId REGISTRY_ID --region <Region>` 查看关联的从实例；`tccli tcr DescribeReplicationPolicies --RegistryId REGISTRY_ID --region <Region>` 查看关联的同步规则 | 实例关联了活动的从实例或同步规则，不允许直接删除主实例 | 先执行 `DeleteReplicationInstance` 删除所有从实例，再执行 `DeleteReplicationRule` 删除所有同步规则，最后再删除主实例 |
| `ManageInternalEndpoint` 返回 `LimitExceeded` | `tccli tcr DescribeInternalEndpoints --RegistryId REGISTRY_ID --region <Region>` 查看当前接入的 VPC 数量 | 当前实例 VPC 接入数量已达上限（此为环境限制，非命令错误） | 清理不再使用的 VPC 接入链路：`tccli tcr ManageInternalEndpoint --cli-input-json file://delete_endpoint.json --region <Region>`（Operation: "Delete"），或使用已有 VPC 和子网 |
| `CreateReplicationInstance` 返回 `FailedOperation.TradeFailed` | 检查账户余额 | 账户余额不足，创建高级版从实例需预付费用（此为环境限制，非命令错误） | 先创建 basic 实例（后付费无预付）：`tccli tcr CreateInstance --RegistryType basic --region REPLICATION_REGION`，再执行 `tccli tcr ModifyInstance --RegistryType premium --region REPLICATION_REGION` 升级；若升级也触发余额限制，需充值 |

### 创建成功但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 实例同步长时间处于 `InProgress` | `tccli tcr DescribeReplicationInstanceSyncStatus --RegistryId REGISTRY_ID --ReplicationRegistryId REPLICATION_REGISTRY_ID --ShowReplicationLog true --region <Region>` 查看 `Percentage` | 待同步镜像数量多或跨地域网络延迟 | 等待自动完成，通过 `Percentage` 观察进度。若超过预期时间仍无进展，检查源和目标实例的网络连通性 |
| 复制实例创建后 `Status` 长时间非 `Running` | `tccli tcr DescribeReplicationInstanceCreateTasks --ReplicationRegistryId REPLICATION_REGISTRY_ID --ReplicationRegionId REPLICATION_REGION_ID --region <Region>` 查看各子任务状态 | 后端任务（SyncDBTask / CreateTcrCrdTask）执行超时，可能因地域资源紧张 | 若某子任务 `TaskStatus` 为 `FAILED`，记录 `TaskMessage` 和 `RequestId` 后 [提交工单](https://console.cloud.tencent.com/workorder)；若均为 `IN_PROGRESS`，继续轮询（间隔 30 秒），最长等待约 15 分钟 |
| `DescribeReplicationInstanceSyncStatus` 返回 `ReplicationStatus: "Failed"` | `tccli tcr DescribeReplicationInstanceSyncStatus --RegistryId REGISTRY_ID --ReplicationRegistryId REPLICATION_REGISTRY_ID --ShowReplicationLog true --region <Region>` 查看 `ReplicationLog` 中具体错误 | 同步过程中镜像拉取或推送失败（源/目标仓库不可达、认证过期、镜像损坏等） | 根据 `ReplicationLog` 中的错误信息定位：认证问题则更新 `PeerRegistryToken`；网络问题则检查目标实例内网/公网可达性；镜像问题则重新推送源镜像。修复后重新触发同步 |
| `DescribeInstanceCustomizedDomain` 返回 `Status: "FAILED"` | 检查 `DomainName` 对应的 DNS CNAME 记录和 SSL 证书 | CNAME 未正确配置或 SSL 证书与域名不匹配 | 确认 DNS CNAME 指向 TCR 实例域名，确认 SSL 证书包含该自定义域名 |

## 下一步

- [全球多地域间同步镜像实现就近访问](../global-replication) -- 实例复制与同步实战
- [跨实例（账号）同步镜像](../../ops/image-distribution/cross-instance-sync) -- 跨主账号同步规则详解
- [同实例多地域复制镜像](../../ops/image-distribution/cross-region-replication) -- 实例复制详细操作
- [配置内网访问控制](../../ops/access/network/private-access) -- VPC 内网链路管理
- [配置自定义域名](../../ops/access/domain/custom-domain) -- 统一域名管理

## 控制台替代

- [容器镜像服务控制台 -- 同步复制](https://console.cloud.tencent.com/tcr/replication)
