---
title: "个人版迁移至企业版完全指南（tccli）"
description: "· page_id `52292`"
---

> 对照官方：[个人版迁移至企业版完全指南](https://cloud.tencent.com/document/product/1141/52292) · page_id `52292`

## 概述

将腾讯云容器镜像服务（TCR）个人版中的容器镜像与 Helm Chart 迁移至 TCR 企业版实例。个人版为免费共享服务，企业版为独享实例，提供更稳定的服务质量和内网访问、镜像安全扫描、实例同步等功能。

| 维度 | 方案A：DuplicateImage（逐 Tag） | 方案B：ccr2tcr 工具（全量自动） |
|------|-------------------------------|--------------------------------|
| 适用规模 | 少量镜像（<50 Tag） | 大量镜像（≥50 Tag） |
| 迁移粒度 | 逐 Tag 精确控制，支持跨命名空间重命名 | 全量自动迁移，保留原有组织结构 |
| 操作方式 | tccli 命令行 + 可选 Shell 批处理脚本 | Docker 容器运行，一条命令完成 |
| 前置依赖 | tccli + CAM 权限 | CVM + VPC 内网链路 + API 密钥对 |
| 幂等性 | 是（同一 Tag 重复迁移覆盖写入） | 是（检测已存在则跳过） |
| 推荐场景 | 精确控制、少量仓库、跨命名空间重组 | 全量搬迁、多仓库、追求效率 |

核心流程：（1）在企业版创建目标命名空间与仓库；（2）方案 A 用 `DuplicateImage` 逐 Tag 迁移，方案 B 用 `ccr2tcr` 工具全量自动迁移；（3）配置内网访问链路使业务集群可拉取；（4）通过个人版域名兼容实现零配置切换或更新镜像地址。

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

# 3. 检查 TCR 企业版实例查询权限
tccli tcr DescribeInstances --region <Region>
# expected: exit 0，返回实例列表（可为空）

# 4. 检查个人版镜像查询权限
tccli tcr DescribeImagePersonal --region <Region> --RepoName "namespace/repo"
# expected: exit 0（仓库存在返回 Tag 列表，不存在返回 ResourceNotFound 也说明权限 OK）

# 5. 检查 VPC 查询权限
tccli vpc DescribeVpcs --region <Region>
# expected: exit 0，返回 VPC 列表（可为空）
```

> CAM 所需权限（精确 Action 名）：`tcr:DescribeInstances`、`tcr:DescribeImagePersonal`、`tcr:DuplicateImage`、`tcr:CreateNamespace`、`tcr:DescribeNamespaces`、`tcr:CreateRepository`、`tcr:DescribeRepositories`、`tcr:ManageInternalEndpoint`、`tcr:DescribeInternalEndpoints`、`tcr:CreateInternalEndpointDns`、`tcr:DescribeInternalEndpointDnsStatus`、`tcr:CreateInstanceToken`、`tcr:DescribeInstanceToken`、`tcr:DeleteInstanceToken`。建议授予 `QcloudTCRFullAccess` 预设策略。方案 B 额外需要 `cvm:DescribeInstances`。

### 资源检查

```bash
# 6. 确认 TCR 企业版实例已创建且状态为 Running
tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'
# expected: exit 0, Status: "Running"

# 7. 确认个人版命名空间中存在待迁移镜像
tccli tcr DescribeImagePersonal --region <Region> --RepoName "SRC_NS/SRC_REPO"
# expected: exit 0, Data.TagInfo 非空，TotalCount > 0

# 8. 查询可用 VPC 和子网（方案 B 配置内网访问链路需要）
tccli vpc DescribeVpcs --region <Region> --Filters '[{"Name":"vpc-id","Values":["VPC_ID"]}]'
# expected: 至少返回 1 个 VPC，状态 Available

tccli vpc DescribeSubnets --region <Region> --Filters '[{"Name":"vpc-id","Values":["VPC_ID"]}]'
# expected: 至少返回 1 个子网，AvailableIpCount ≥ 1

# 9.（方案 B）确认 CVM 可用
tccli cvm DescribeInstances --region <Region> --Filters '[{"Name":"instance-id","Values":["INS_ID"]}]'
# expected: 至少返回 1 台 CVM，InstanceState: "RUNNING"
```

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看个人版镜像列表 | `DescribeImagePersonal` | 是 |
| 查看企业版实例列表 | `DescribeInstances` | 是 |
| 创建企业版命名空间 | `CreateNamespace` | 否（同名存在则报错） |
| 创建企业版镜像仓库 | `CreateRepository` | 否（同名存在则报错） |
| 迁移镜像（逐 Tag） | `DuplicateImage` | 是（幂等覆盖写入） |
| 关联 VPC 至 TCR 实例 | `ManageInternalEndpoint` | 否 |
| 查看内网访问链路 | `DescribeInternalEndpoints` | 是 |
| 开启内网 DNS 解析 | `CreateInternalEndpointDns` | 否 |
| 查询 DNS 解析状态 | `DescribeInternalEndpointDnsStatus` | 是 |
| 创建长期访问凭证 | `CreateInstanceToken` | 否 |
| 全量自动迁移 | `docker run ccr2tcr` | 是（检测已存在则跳过） |

## 关键字段说明

以下列出主要操作的参数约束。完整参数定义见 `tccli tcr <Action> --generate-cli-skeleton`。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|-----------|---------|
| `RegistryId` | String | 是 | 目标企业版实例 ID，格式 `tcr-xxxxxxxx`。`DescribeInstances` 返回 | `ResourceNotFound` — 实例不存在 |
| `NamespaceName` | String | 是 | 命名空间名，1-63 字符，以小写字母或数字开头和结尾 | `InvalidParameter` — 命名空间名格式不合法 |
| `RepositoryName` | String | 是 | 镜像仓库名，1-255 字符。同命名空间下不可重名 | `InvalidParameter.RepositoryName` — 仓库名冲突 |
| `SourceNamespaceName` | String | 是 | 源命名空间名（个人版命名空间） | `ResourceNotFound` — 源命名空间不存在 |
| `SourceRepositoryName` | String | 是 | 源仓库名（个人版仓库） | `ResourceNotFound` — 源仓库不存在 |
| `ImageVersion` | String | 是 | 镜像 Tag 名称，如 `latest`、`v1.0.0` | `ResourceNotFound` — Tag 不存在 |
| `RepoName` | String | 是 | 个人版仓库全名，格式 `<命名空间>/<仓库名>`，如 `myns/myapp` | `ResourceNotFound` — 仓库拼写错误导致查询失败 |
| `TokenType` | String | 是 | `longterm`（长期有效，推荐生产）或 `temp`（临时，数小时后过期） | 选 `temp` → 凭证过期后拉取失败；未存储 Token 值无法找回 |
| `VpcId` | String | 方案 B | 已有 VPC ID，格式 `vpc-xxxxxxxx`。`DescribeInternalEndpoints` 获取已关联列表 | `FailedOperation` — VPC 不存在或不属于当前账号 |
| `SubnetId` | String | 方案 B | VPC 下子网 ID，格式 `subnet-xxxxxxxx` | `FailedOperation` — 子网不存在或可用 IP 不足 |
| `EniLBIp` | String | 方案 B | 内网访问 IP，在 `DescribeInternalEndpoints` 返回的 `AccessIp` 字段获取 | — IP 不正确 → DNS 解析关联错误 |
| `UsePublicDomain` | Boolean | 方案 B | `true`：使用默认域名解析到内网 IP | `false` → 内网 DNS 不会自动解析默认域名 |

## 操作步骤

### 方案A：逐 Tag 精确迁移（DuplicateImage）

---

适用场景：仅需迁移特定命名空间/仓库的特定 Tag，或需在迁移过程中重命名命名空间/仓库。

#### 步骤 A1：获取个人版镜像列表

```bash
tccli tcr DescribeImagePersonal \
    --region <Region> \
    --RepoName "SRC_NS/SRC_REPO" \
    --Limit 100 \
    --output json
# expected: exit 0，返回 Tag 列表
```

**预期输出**：

```json
{
    "Data": {
        "TagInfo": [
            {
                "TagName": "latest",
                "TagId": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "ImageId": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                "Size": 123456789,
                "CreationTime": "2025-12-01T09:00:00+08:00",
                "PushTime": "2026-01-15T10:30:00+08:00"
            }
        ],
        "TotalCount": 1
    },
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

记录需要迁移的 Tag 名称列表，以及源命名空间名（`SRC_NS`）和源仓库名（`SRC_REPO`）。

#### 步骤 A2：在企业版创建目标命名空间

##### 选择依据

- **NamespaceName**：建议与个人版命名空间名保持一致，减少 CI/CD 配置变更和路径混淆。如需重组组织结构，可与源命名空间不同名。
- **IsPublic**：设为 `false`（私有）。迁移过程仅涉及数据搬运，访问权限在迁移完成后按需配置。

##### 最小创建（只含必填字段）

```bash
tccli tcr CreateNamespace \
    --region <Region> \
    --RegistryId REGISTRY_ID \
    --NamespaceName NAMESPACE_NAME \
    --output json
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

##### 增强配置（指定访问级别）

```bash
tccli tcr CreateNamespace \
    --region <Region> \
    --RegistryId REGISTRY_ID \
    --NamespaceName NAMESPACE_NAME \
    --IsPublic false \
    --output json
# expected: exit 0，返回 RequestId
```

#### 步骤 A3：在企业版创建目标仓库

##### 选择依据

- **RepositoryName**：建议与个人版仓库名保持一致。如需重命名，可在企业版使用新名称，迁移时通过 `SourceRepositoryName` 和 `RepositoryName` 分别指定源和目标。
- **BriefDescription**：可选字段，建议添加描述标记迁移来源，便于后续管理。

##### 最小创建（只含必填字段）

```bash
tccli tcr CreateRepository \
    --region <Region> \
    --RegistryId REGISTRY_ID \
    --NamespaceName NAMESPACE_NAME \
    --RepositoryName REPO_NAME \
    --output json
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

##### 增强配置（添加描述信息）

```bash
tccli tcr CreateRepository \
    --region <Region> \
    --RegistryId REGISTRY_ID \
    --NamespaceName NAMESPACE_NAME \
    --RepositoryName REPO_NAME \
    --BriefDescription "从个人版迁移" \
    --output json
# expected: exit 0，返回 RequestId
```

#### 步骤 A4：执行镜像迁移

##### 选择依据

- **NamespaceName / RepositoryName**：目标企业版命名空间和仓库（步骤 A2/A3 创建的）。可与源命名空间/仓库不同名，支持迁移过程中重组组织结构。
- **ImageVersion（Tag）**：每次迁移一个 Tag，允许选择性迁移。跳过不需要的 Tag（如临时构建版本）。
- **幂等性**：`DuplicateImage` 对同一 Tag 重复执行会覆盖写入（幂等），可安全重放。迁移中断后重新执行同一命令即可续传。

##### 单 Tag 迁移

```bash
cat > duplicate-image.json <<'EOF'
{
    "RegistryId": "REGISTRY_ID",
    "NamespaceName": "NAMESPACE_NAME",
    "RepositoryName": "REPO_NAME",
    "SourceNamespaceName": "SRC_NS",
    "SourceRepositoryName": "SRC_REPO",
    "ImageVersion": "TAG"
}
EOF

tccli tcr DuplicateImage \
    --region <Region> \
    --cli-input-json file://duplicate-image.json \
    --output json
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

##### 批量 Tag 迁移（Shell 脚本）

当需要迁移的 Tag 数量较多时，使用以下 Shell 脚本批量执行。脚本从个人版获取所有 Tag 列表，逐一迁移到企业版。

```bash
#!/bin/bash
# 批量迁移个人版仓库的所有 Tag 到企业版
set -euo pipefail

REGISTRY_ID="REGISTRY_ID"
DEST_NS="NAMESPACE_NAME"
DEST_REPO="REPO_NAME"
SRC_NS="SRC_NS"
SRC_REPO="SRC_REPO"
REGION="REGION"

TAGS=$(tccli tcr DescribeImagePersonal \
    --region "$REGION" \
    --RepoName "$SRC_NS/$SRC_REPO" \
    --output json | jq -r '.Data.TagInfo[].TagName')

for TAG in $TAGS; do
    echo "Migrating: $SRC_NS/$SRC_REPO:$TAG"
    tccli tcr DuplicateImage \
        --region "$REGION" \
        --RegistryId "$REGISTRY_ID" \
        --NamespaceName "$DEST_NS" \
        --RepositoryName "$DEST_REPO" \
        --SourceNamespaceName "$SRC_NS" \
        --SourceRepositoryName "$SRC_REPO" \
        --ImageVersion "$TAG" \
        --output json
done

echo "Migration completed."
```

> 上述脚本使用行内参数遍历 Tag，每个 Tag 一次 `DuplicateImage` 调用。Tag 数量较多时，可加入 `sleep 1` 避免 API 限频。

##### 步骤 A1-A4 参数说明

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `REGION` | 目标地域 | 如 `ap-guangzhou` | `tccli configure list` 查看 |
| `REGISTRY_ID` | 目标企业版实例 ID | 格式 `tcr-xxxxxxxx` | `tccli tcr DescribeInstances --region <Region>` |
| `NAMESPACE_NAME` | 目标命名空间名 | 1-63 字符，步骤 A2 创建 | 自定义 |
| `REPO_NAME` | 目标仓库名 | 1-255 字符，步骤 A3 创建 | 自定义 |
| `SRC_NS` | 源个人版命名空间名 | 个人版中已存在 | 个人版控制台或 `DescribeImagePersonal` 查看 |
| `SRC_REPO` | 源个人版仓库名 | 个人版中已存在 | 同上 |
| `TAG` | 源镜像 Tag | 如 `latest`、`v1.0.0` | 步骤 A1 返回的 `TagName` |

### 方案B：全量自动迁移（ccr2tcr 工具）

---

适用场景：个人版中存在大量命名空间/仓库/标签，逐 Tag 迁移工作量大。ccr2tcr 是腾讯云官方提供的迁移工具，自动处理命名空间和仓库创建，检测已有镜像跳过不重复迁移。

#### 步骤 B1：确认企业版实例就绪

```bash
tccli tcr DescribeInstances \
    --region <Region> \
    --Registryids '["REGISTRY_ID"]' \
    --output json
# expected: exit 0, Status: "Running"
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
            "CreatedAt": "2025-12-01T09:00:00+08:00"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

记录 `RegistryName`（`example-registry`），方案 B 步骤 B6 的 `--tcrName` 参数将使用此值。

#### 步骤 B2：配置 VPC 内网访问链路

使迁移工具所在的 CVM 可通过内网访问企业版实例，避免公网流量费用并提升迁移速度。

##### 选择依据

- **VpcId / SubnetId**：选择迁移工具 CVM 所在的 VPC 和子网，确保 CVM 与 TCR 实例网络互通。需提前确认 CVM 所在 VPC。
- **Operation**：`Create` 为新增关联，`Delete` 为解除关联。每个实例最多关联 10 个 VPC。

##### B2.1 查看当前内网链路

```bash
tccli tcr DescribeInternalEndpoints \
    --region <Region> \
    --RegistryId REGISTRY_ID \
    --output json
# expected: exit 0，未配置时 AccessVpcSet 为空
```

**预期输出**：

```json
{
    "AccessVpcSet": [],
    "TotalCount": 0,
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

##### B2.2 关联 VPC

```bash
cat > manage-internal-endpoint.json <<'EOF'
{
    "RegistryId": "REGISTRY_ID",
    "Operation": "Create",
    "VpcId": "VPC_ID",
    "SubnetId": "SUBNET_ID"
}
EOF

tccli tcr ManageInternalEndpoint \
    --region <Region> \
    --cli-input-json file://manage-internal-endpoint.json \
    --output json
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RegistryId": "tcr-example",
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

##### B2.3 轮询确认链路就绪

```bash
tccli tcr DescribeInternalEndpoints \
    --region <Region> \
    --RegistryId REGISTRY_ID \
    --output json
# expected: exit 0, AccessVpcSet[0].Status == "Running"
```

**预期输出**：

```json
{
    "AccessVpcSet": [
        {
            "VpcId": "vpc-example",
            "SubnetId": "subnet-example",
            "Status": "Running",
            "AccessIp": "10.0.0.100"
        }
    ],
    "TotalCount": 1,
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

记录 `AccessIp`（如 `10.0.0.100`），步骤 B3 将使用此值。

#### 步骤 B3：启用内网 DNS 解析

```bash
cat > create-dns.json <<'EOF'
{
    "InstanceId": "REGISTRY_ID",
    "VpcId": "VPC_ID",
    "EniLBIp": "ACCESS_IP",
    "UsePublicDomain": true
}
EOF

tccli tcr CreateInternalEndpointDns \
    --region <Region> \
    --cli-input-json file://create-dns.json \
    --output json
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

轮询确认 DNS 状态为 ENABLED：

```bash
tccli tcr DescribeInternalEndpointDnsStatus \
    --region <Region> \
    --VpcSet '[{"InstanceId":"REGISTRY_ID","VpcId":"VPC_ID","EniLBIp":"ACCESS_IP","UsePublicDomain":true}]' \
    --output json
# expected: exit 0, VpcSet[0].Status == "ENABLED"
```

**预期输出**：

```json
{
    "VpcSet": [
        {
            "VpcId": "vpc-example",
            "Status": "ENABLED"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

#### 步骤 B4：获取企业版长期访问凭证

##### 选择依据

- **TokenType**：必须选 `longterm`。临时凭证（`temp`）在数小时后过期，可能导致长时间迁移任务中断后无法续传。长期凭证适用于迁移这类耗时操作。
- **Desc**：建议填写描述如 `migration-token`，便于迁移完成后识别和清理。

```bash
tccli tcr CreateInstanceToken \
    --region <Region> \
    --RegistryId REGISTRY_ID \
    --TokenType longterm \
    --Desc "migration-token" \
    --output json
# expected: exit 0，返回 Username 和 Token
```

**预期输出**：

```json
{
    "Username": "100012345678",
    "Token": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ik9EVzJPUS05aloyN2NadHI2WjhFWUR0dHBSY1E2R2p...",
    "ExpTime": 2096844746789,
    "TokenId": "tkn-example",
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

> 记录 `Username`（即腾讯云账号 UIN）、`Token` 和 `TokenId`。`Token` 仅在创建时返回一次，之后无法查询——请立即保存。`TokenId` 用于迁移完成后清理。

#### 步骤 B5：准备 API 调用密钥

前往 [访问管理控制台](https://console.cloud.tencent.com/cam/capi) 获取 SecretId 和 SecretKey。

方案 B 需要两对密钥（个人版 API 密钥和企业版 API 密钥），实际通常使用同一对密钥，只需确保密钥关联的子账号具备个人版和企业版的双向操作权限。

#### 步骤 B6：执行全量迁移

```bash
docker pull ccr.ccs.tencentyun.com/tcrimages/image-transfer:ccr2tcr
# expected: 下载完成
```

```bash
docker run --network=host --rm \
    ccr.ccs.tencentyun.com/tcrimages/image-transfer:ccr2tcr \
    /run \
    --tcrName REGISTRY_NAME \
    --ccrRegionName ap-guangzhou \
    --tcrRegionName REGION \
    --ccrAuth UIN:CCR_PASSWORD \
    --tcrAuth UIN:TCR_TOKEN \
    --ccrSecretId SECRET_ID \
    --ccrSecretKey SECRET_KEY \
    --tcrSecretId SECRET_ID \
    --tcrSecretKey SECRET_KEY \
    --tagNum 50
# expected: 输出 "################# Finished, 0 transfer jobs failed ..."
```

**预期输出**：

```text
################# Finished, 0 transfer jobs failed, 0 normal urlPair generate failed, 0 jobs generate failed #################
```

| 参数 | 说明 | 获取方式 |
|------|------|---------|
| `REGISTRY_NAME` | 目标企业版实例名称 | 步骤 B1 返回的 `RegistryName`，如 `example-registry` |
| `REGION` | 企业版实例所在的地域 | 步骤 B1 或 `tccli configure list` |
| `UIN` | 腾讯云主账号 UIN | 步骤 B4 返回的 `Username` |
| `CCR_PASSWORD` | 个人版访问密码 | 个人版控制台 → 访问凭证 |
| `TCR_TOKEN` | 企业版长期访问凭证 Token | 步骤 B4 返回的 `Token` |
| `SECRET_ID` | API 调用 SecretId | 步骤 B5 从 CAM 控制台获取 |
| `SECRET_KEY` | API 调用 SecretKey | 步骤 B5 从 CAM 控制台获取 |
| `--tagNum` | 每个仓库每次迁移的 Tag 数量 | 默认 20，可按需调整为 50 或更大 |

### 业务切换

#### 方式一：零配置切换（推荐）

通过个人版域名兼容功能，业务集群无需修改镜像地址即可拉取已迁移到企业版的镜像。参见[使用个人版域名访问企业版实例](../personal-domain-access)。

#### 方式二：镜像地址更新

将 CI/CD 配置和 Kubernetes 工作负载中的镜像地址从个人版切换为企业版。

| 版本 | 镜像地址格式 |
|------|-------------|
| 个人版 | `ccr.ccs.tencentyun.com/<namespace>/<repo>:<tag>` |
| 企业版 | `<RegistryName>.tencentcloudcr.com/<namespace>/<repo>:<tag>` |

创建用于拉取企业版镜像的 `imagePullSecret`：

```bash
kubectl create secret docker-registry tcr-pull-secret \
    --docker-server=REGISTRY_NAME.tencentcloudcr.com \
    --docker-username=UIN \
    --docker-password=TCR_TOKEN \
    -n NAMESPACE_NAME
# expected: secret/tcr-pull-secret created
```

```yaml
# deployment.yaml
spec:
  template:
    spec:
      imagePullSecrets:
      - name: tcr-pull-secret
      containers:
      - name: app
        image: REGISTRY_NAME.tencentcloudcr.com/NAMESPACE_NAME/REPO_NAME:TAG
```

> TKE 集群推荐安装 TCR 插件实现免密拉取（参见[TKE 集群使用 TCR 插件内网免密拉取容器镜像](../../tke-plugin-pull)），无需手动配置 `imagePullSecret`。

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 期望 |
|--------|------|------|
| 命名空间已创建 | `tccli tcr DescribeNamespaces --region <Region> --RegistryId REGISTRY_ID --output json` | `NamespaceNames` 列表含目标命名空间 |
| 仓库已创建 | `tccli tcr DescribeRepositories --region <Region> --RegistryId REGISTRY_ID --NamespaceName NAMESPACE_NAME --output json` | `RepositoryList` 含目标仓库 |
| 镜像已迁移（方案 A） | `tccli tcr DescribeImages --region <Region> --RegistryId REGISTRY_ID --NamespaceName NAMESPACE_NAME --RepositoryName REPO_NAME --output json` | `ImageInfoList` 含迁移的 Tag，数量与源一致 |
| 内网链路就绪（方案 B） | `tccli tcr DescribeInternalEndpoints --region <Region> --RegistryId REGISTRY_ID --output json` | `AccessVpcSet[0].Status: "Running"` |
| DNS 解析生效（方案 B） | `tccli tcr DescribeInternalEndpointDnsStatus --region <Region> --VpcSet '[{"InstanceId":"REGISTRY_ID","VpcId":"VPC_ID","EniLBIp":"ACCESS_IP","UsePublicDomain":true}]' --output json` | `VpcSet[0].Status: "ENABLED"` |

### 数据面（docker）

```bash
# 登录企业版实例
docker login REGISTRY_NAME.tencentcloudcr.com --username=UIN --password=TCR_TOKEN
# expected: Login Succeeded

# 拉取已迁移的镜像
docker pull REGISTRY_NAME.tencentcloudcr.com/NAMESPACE_NAME/REPO_NAME:TAG
# expected: Downloaded newer image，或 Already exists（如本地已缓存）
```

## 清理

> **计费警告**：TCR 企业版实例按规格持续计费。迁移完成后如仅用于验证，请及时[销毁退还实例](../../../../ops/instances/delete)。个人版源镜像建议保留一段时间作为备份。
>
> **副作用警告**：`ManageInternalEndpoint` 以 `Operation: "Delete"` 调用会解除 VPC 与实例的内网关联，依赖该链路的业务集群将无法通过内网拉取镜像。清理前请确认无生产业务依赖该链路。

### 数据面

```bash
# 清理 ccr2tcr 工具镜像（方案 B 使用后）
docker rmi ccr.ccs.tencentyun.com/tcrimages/image-transfer:ccr2tcr
# expected: 成功删除镜像
```

### 控制面（tccli）

#### 1. 清理前状态检查

```bash
tccli tcr DescribeInstances \
    --region <Region> \
    --Registryids '["REGISTRY_ID"]' \
    --output json
# expected: exit 0，确认是待操作的目标实例，记录 RegistryId
```

#### 2. 删除迁移专用访问凭证

```bash
tccli tcr DeleteInstanceToken \
    --region <Region> \
    --RegistryId REGISTRY_ID \
    --TokenId TOKEN_ID \
    --output json
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

#### 3. 删除内网 DNS 解析

```bash
tccli tcr DeleteInternalEndpointDns \
    --region <Region> \
    --InstanceId REGISTRY_ID \
    --VpcId VPC_ID \
    --EniLBIp ACCESS_IP \
    --output json
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

#### 4. 删除 VPC 内网访问链路

```bash
tccli tcr ManageInternalEndpoint \
    --region <Region> \
    --RegistryId REGISTRY_ID \
    --Operation Delete \
    --VpcId VPC_ID \
    --SubnetId SUBNET_ID \
    --output json
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

#### 5. 验证已清理

```bash
tccli tcr DescribeInternalEndpoints \
    --region <Region> \
    --RegistryId REGISTRY_ID \
    --output json
# expected: exit 0, AccessVpcSet 为空，TotalCount: 0
```

**预期输出**：

```json
{
    "AccessVpcSet": [],
    "TotalCount": 0,
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `DuplicateImage` 返回 `ResourceNotFound` | `tccli tcr DescribeImagePersonal --region <Region> --RepoName "SRC_NS/SRC_REPO" --output json` 检查源仓库和 Tag 是否存在 | 源命名空间/仓库名拼写错误或 Tag 不存在 | 核对 `SourceNamespaceName`、`SourceRepositoryName`、`ImageVersion` 拼写；用步骤 A1 的输出确认准确的命名空间名、仓库名和 Tag 名 |
| `DuplicateImage` 返回 `FailedOperation` | `tccli tcr DescribeRepositories --region <Region> --RegistryId REGISTRY_ID --NamespaceName NAMESPACE_NAME --output json` 确认目标仓库存在 | 目标企业版仓库未创建 | 先执行步骤 A3 `CreateRepository`，再重新执行 `DuplicateImage` |
| `ManageInternalEndpoint` 返回 `LimitExceeded` | `tccli vpc DescribeVpcs --region <Region> --output json` 查看 VPC 数量和配额 | 账号 VPC 配额已满（此为环境限制，非命令错误） | 清理不再使用的 VPC 后重试，或使用已有 VPC |
| `CreateInstanceToken` 返回 `UnauthorizedOperation` | `tccli tcr DescribeInstances --region <Region> --output json` 确认子账号有读取权限 | 子账号缺少 `tcr:CreateInstanceToken` 权限 | 授予 `QcloudTCRFullAccess` 预设策略，或添加自定义策略含 `tcr:CreateInstanceToken` |
| `CreateInternalEndpointDns` 返回 `FailedOperation` | `tccli tcr DescribeInternalEndpoints --region <Region> --RegistryId REGISTRY_ID --output json` 确认内网链路已 Running | VPC 内网链路尚未就绪，或 `EniLBIp` 填写了错误的 AccessIp | 等待内网链路 Status 变为 Running 后重试；确认 `EniLBIp` 与 `DescribeInternalEndpoints` 返回的 `AccessIp` 一致 |
| ccr2tcr 工具报失败数非零 | 查看工具输出的具体错误行（如 `transfer jobs failed: N`） | 网络波动导致部分镜像传输中断或 API 调用超时 | 重新运行 ccr2tcr 工具（幂等，已迁移的会自动跳过）。持续失败可通过 [在线咨询](https://cloud.tencent.com/online-service?from=doc_1141) 申请协助 |
| ccr2tcr 报命名空间命名冲突 | 查看工具输出中的冲突命名空间名 | 使用了 `library`、`tke`、`public` 等企业版保留命名空间，或与实例已有命名空间同名 | 在个人版中重命名冲突的命名空间后再运行，或手动创建非冲突的企业版命名空间并用方案 A 逐 Tag 迁移该部分 |

### 迁移结果异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 迁移后镜像 Tag 数量少于预期 | 对比个人版与企业版 Tag 列表：`tccli tcr DescribeImagePersonal --region <Region> --RepoName "SRC_NS/SRC_REPO" --output json | jq '.Data.TotalCount'` vs `tccli tcr DescribeImages --region <Region> --RegistryId REGISTRY_ID --NamespaceName NAMESPACE_NAME --RepositoryName REPO_NAME --output json | jq '.TotalCount'` | 部分 Tag 迁移失败（脚本中途退出、API 限频、网络超时） | 对缺失 Tag 重新执行 `DuplicateImage`（幂等，不会重复创建） |
| 迁移后 `docker pull` 返回 `unauthorized` | `docker login REGISTRY_NAME.tencentcloudcr.com --username=UIN --password=TCR_TOKEN` 确认登录状态 | 凭证错误或已过期（`temp` 类型），或未登录 | 使用 `longterm` 类型 Token 重新登录。确认用户名是 `CreateInstanceToken` 返回的 `Username`（UIN），密码是 `Token`（不是 SecretId/SecretKey） |
| 迁移后 `docker pull` 返回 `not found` | `tccli tcr DescribeImages --region <Region> --RegistryId REGISTRY_ID --NamespaceName NAMESPACE_NAME --RepositoryName REPO_NAME --output json` 确认 Tag 存在 | 命名空间/仓库名拼写错误或 Tag 不存在 | 用 `DescribeImages` 获取准确的命名空间名和仓库名，核对 `docker pull` 地址中的路径 |
| Pod 报 `ImagePullBackOff`（方式二） | `kubectl describe pod POD_NAME -n NAMESPACE_NAME` 查看 Events 详情 | 镜像地址或 `imagePullSecret` 配置错误 | 核对 `image` 字段格式为 `REGISTRY_NAME.tencentcloudcr.com/NAMESPACE_NAME/REPO_NAME:TAG`；确认 Secret 名称在 `imagePullSecrets` 中拼写正确；确认 `kubectl create secret docker-registry` 时 `--docker-server` 不含 `https://` 前缀 |

## 下一步

- [使用个人版域名访问企业版实例](https://cloud.tencent.com/document/product/1141/82855) — 零配置切换业务访问
- [TKE 集群使用 TCR 插件内网免密拉取容器镜像](https://cloud.tencent.com/document/product/1141/48184) — 免密拉取配置
- [配置内网访问控制](https://cloud.tencent.com/document/product/1141/61445) — VPC 内网链路管理
- [配置自定义域名](https://cloud.tencent.com/document/product/1141/61444) — 统一域名管理
- [销毁退还实例](https://cloud.tencent.com/document/product/1141/61442) — 实例生命周期管理

## 控制台替代

[容器镜像服务控制台](https://console.cloud.tencent.com/tcr) -> 实例列表 -> 目标企业版实例 -> 镜像仓库 -> **自动迁移**功能，或配合 ccr2tcr 工具在 CVM 上执行全量迁移。
