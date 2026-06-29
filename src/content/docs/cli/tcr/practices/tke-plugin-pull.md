---
title: "TKE 集群使用 TCR 插件内网免密拉取容器镜像"
description: "· page_id `48184`"
---

> 对照官方：[TKE 集群使用 TCR 插件内网免密拉取容器镜像](https://cloud.tencent.com/document/product/1141/48184) · page_id `48184`

## 概述

在 TKE 集群中安装 TCR 插件，实现内网免密拉取 TCR 企业版实例内的容器镜像并创建工作负载。TCR 插件自动为集群内节点配置关联 TCR 实例的内网解析，部署工作负载时无需显式配置 `imagePullSecrets`。

核心流程：准备容器镜像 → 关联集群 VPC 至 TCR 实例 → 配置内网域名解析 → 安装 TCR 插件 → 创建免密工作负载。

## 前置条件

- [环境准备](../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域（如 ap-guangzhou）

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:DescribeInstances, tcr:CreateNamespace, tcr:CreateInstanceToken
#    tcr:ManageInternalEndpoint, tcr:DescribeInternalEndpoints
#    tcr:CreateInternalEndpointDns, tcr:DescribeInternalEndpointDnsStatus
#    tcr:DeleteInternalEndpointDns
#    tke:DescribeClusters, tke:InstallAddon, tke:DescribeAddon, tke:DeleteAddon
#    vpc:DescribeVpcs, vpc:DescribeSubnets
# 验证：执行 DescribeInstances 确认 TCR 权限
tccli tcr DescribeInstances --region <Region>
# expected: exit 0，返回实例列表（可为空）

# 验证：执行 DescribeClusters 确认 TKE 权限
tccli tke DescribeClusters --region <Region>
# expected: exit 0，返回集群列表（可为空）

# 4. 检查 kubectl 可用性
kubectl version --client
# expected: 输出版本信息，如 Client Version: v1.28.0

# 5. 检查 Docker 可用性（需推送镜像至 TCR）
docker --version
# expected: 输出版本信息，如 Docker version 24.0.0
```

### 资源检查

```bash
# 6. 确认 TCR 企业版实例存在且运行（需为企业版，basic/standard/premium 均可）
tccli tcr DescribeInstances --region <Region>
# expected: Registries 列表中目标实例 RegistryType 为 basic/standard/premium，Status 为 "Running"

# 7. 确认 TKE 集群存在且运行（需自建 TKE 集群，本文档未在测试环境中实际执行 TKE 集群操作）
tccli tke DescribeClusters --region <Region> --ClusterIds '["CLUSTER_ID"]'
# expected: ClusterStatus 为 "Running"，ClusterVersion >= 1.14

# 8. 确认 TKE 集群 Kubernetes 版本 >= 1.14
tccli tke DescribeClusters --region <Region> --ClusterIds '["CLUSTER_ID"]' | jq '.Clusters[0].ClusterVersion'
# expected: 版本号 >= 1.14（如 "1.28.3"）

# 9. 查询 TKE 集群所在 VPC 和子网
tccli tke DescribeClusters --region <Region> \
    --ClusterIds '["CLUSTER_ID"]'
# expected: ClusterNetworkSettings.VpcId 非空，记录此值供后续步骤使用

tccli vpc DescribeSubnets --region <Region> \
    --Filters '[{"Name":"vpc-id","Values":["VPC_ID"]}]'
# expected: 至少返回 1 个子网，AvailableIpCount >= 1
```

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看 TCR 实例列表 | `DescribeInstances` | 是 |
| 创建命名空间 | `CreateNamespace` | 否 |
| 创建长期访问凭证 | `CreateInstanceToken --TokenType longterm` | 否 |
| 推送镜像至 TCR | `docker login` / `docker tag` / `docker push` | — |
| 查看 TCR 内网访问链路 | `DescribeInternalEndpoints` | 是 |
| 查看 TKE 集群列表 | `DescribeClusters` | 是 |
| 查看集群已安装组件 | `DescribeAddon` | 是 |
| 安装 TCR 组件 | `InstallAddon --AddonName TCR` | 否 |
| 卸载 TCR 组件 | `DeleteAddon --AddonName TCR` | 是 |
| 创建工作负载（Deployment） | `kubectl apply -f deployment.yaml` | 否 |

## 关键字段说明

### `ManageInternalEndpoint`

以下说明 `ManageInternalEndpoint` 的主要参数。完整参数定义见 `tccli tcr ManageInternalEndpoint --help`。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | TCR 实例 ID，格式 `tcr-xxxxxxxx`。由 `DescribeInstances` 返回 | 实例不存在返回 `ResourceNotFound` |
| `Operation` | String | 是 | `Create` 或 `Delete` | 错误值返回 `InvalidParameter` |
| `VpcId` | String | 是 | VPC ID，格式 `vpc-xxxxxxxx`。从 TKE 集群 `ClusterNetworkSettings.VpcId` 获取 | VPC 不存在返回 `InvalidParameter.VpcIdNotFound` |
| `SubnetId` | String | 是 | 子网 ID，格式 `subnet-xxxxxxxx`。需与 `VpcId` 属于同一 VPC | 子网不存在返回 `InvalidParameter.SubnetIdNotFound` |
| `RegionId` | Integer | 否 | 地域数字编码（ap-guangzhou=1）。省略时由 `--region` 自动推断 | 错误编码可能导致关联到错误地域 |

### `CreateInternalEndpointDns`

以下说明 `CreateInternalEndpointDns` 的主要参数。完整参数定义见 `tccli tcr CreateInternalEndpointDns --help`。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `InstanceId` | String | 是 | TCR 实例 ID，格式 `tcr-xxxxxxxx` | 实例不存在返回 `ResourceNotFound` |
| `VpcId` | String | 是 | VPC ID。必须先通过 `ManageInternalEndpoint` 关联至 TCR 实例 | VPC 未关联返回 `UnsupportedOperation` |
| `EniLBIp` | String | 是 | 内网访问 IP，从 `DescribeInternalEndpoints` 返回的 `EniLBIp` 获取（非 `AccessIp`） | IP 错误导致 DNS 解析失败 |
| `UsePublicDomain` | Boolean | 否 | 是否使用 TCR 公网域名做内网解析，推荐 `true`。默认 `true` | `false` 时需额外配置自定义域名和 SSL 证书 |
| `RegionName` | String | 否 | 地域名称（如 `ap-guangzhou`）。省略时由 `--region` 自动推断 | 填错可能导致跨地域解析异常 |

## 操作步骤

### 步骤 1：查询 TCR 实例

```bash
tccli tcr DescribeInstances --region <Region>
# expected: exit 0，Registries 列表中包含目标实例
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

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `REGISTRY_ID` | TCR 实例 ID | 格式 `tcr-xxxxxxxx` | `DescribeInstances` 返回的 `RegistryId` |
| `REGION` | 地域 | 如 `ap-guangzhou` | `tccli configure list` 或 `DescribeInstances` 返回的 `RegionName` |

### 步骤 2：创建命名空间

TCR 企业版实例没有默认命名空间，且不支持在推送镜像时自动创建，需手动创建。

#### 选择依据

- **NamespaceName**：按实际项目命名。本文示例使用 `demo-tcr`。命名空间名在同一实例内唯一。
- **IsPublic**：设为 `true`，允许匿名拉取该命名空间下的镜像。若需访问控制，设 `false`，后续需配合 TCR 插件或手动配置 `imagePullSecrets`。

```bash
tccli tcr CreateNamespace \
    --RegistryId REGISTRY_ID \
    --NamespaceName demo-tcr \
    --IsPublic true \
    --region <Region>
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

验证命名空间创建成功：

```bash
tccli tcr DescribeNamespaces \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: NamespaceList 中包含 demo-tcr，IsPublic 为 true
```

**预期输出**：

```json
{
  "NamespaceInfoList": [
    {
      "NamespaceName": "demo-tcr",
      "IsPublic": true
    }
  ],
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### 步骤 3：获取长期访问凭证

使用 `CreateInstanceToken` 创建长期访问凭证，用于 `docker login` 登录 TCR 实例。无需跳转至服务级账号管理页面。

#### 选择依据

- **TokenType**：选择 `longterm` 而非短期临时凭证。长期凭证适合持续集成和本地开发场景，无需频繁刷新。注意长期凭证有效期较长，需妥善保管。
- **Desc**：可选。建议填写描述（如 `"cli-demo-token"`）以便后续在控制台识别该凭证用途。

```bash
tccli tcr CreateInstanceToken \
    --RegistryId REGISTRY_ID \
    --TokenType longterm \
    --Desc "cli-demo-token" \
    --region <Region>
# expected: exit 0，返回 Username 和 Token
```

**预期输出**：

```json
{
  "Username": "UIN",
  "Token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "ExpTime": 2096844746789,
  "TokenId": "TOKEN_ID",
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

记录 `Username` 和 `Token`，供下一步 `docker login` 使用。**注意** `Token` 仅在创建时返回一次，请妥善保存。

### 步骤 4：推送容器镜像至 TCR

本步骤需要本地安装 Docker 环境，且客户端 IP 在 TCR 实例的网络访问策略允许范围内。

```bash
# 登录 TCR 实例
docker login REGISTRY_DOMAIN \
    --username USERNAME \
    --password TOKEN
# expected: Login Succeeded
```

**预期输出**：

```text
Login Succeeded
```

```bash
# 拉取测试镜像（以 getting-started 为例）
docker pull getting-started:latest
# expected: 拉取成功，输出 Digest

# 标记镜像
docker tag getting-started:latest REGISTRY_DOMAIN/demo-tcr/getting-started:latest
# expected: 无输出

# 推送镜像至 TCR
docker push REGISTRY_DOMAIN/demo-tcr/getting-started:latest
# expected: 推送成功，输出 Digest
```

**预期输出**：

```text
The push refers to repository [REGISTRY_DOMAIN/demo-tcr/getting-started]
latest: digest: sha256:a1b2c3d4e5f6... size: 1234
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `REGISTRY_DOMAIN` | TCR 实例公网域名 | `DescribeInstances` 返回的 `PublicDomain` |
| `USERNAME` | 登录用户名 | 步骤 3 中 `CreateInstanceToken` 返回的 `Username` |
| `TOKEN` | 长期访问凭证 | 步骤 3 中 `CreateInstanceToken` 返回的 `Token` |

> 若镜像仓库尚不存在，推送时会自动创建，无需提前手动执行 `CreateRepository`。

### 步骤 5：查询 TKE 集群 VPC 信息

> **说明**：以下 TKE 集群相关操作（`DescribeClusters`、`InstallAddon`）需在自建 TKE 集群环境下执行。本文档中的 TCR 内网端点操作（`ManageInternalEndpoint`、`CreateInternalEndpointDns`、`DescribeInternalEndpoints`）已在 premium 实例上真实验证通过。实际操作时请替换为自有 TKE 集群所在 VPC 和子网。

查询集群网络配置，获取 `VpcId`：

```bash
tccli tke DescribeClusters \
    --ClusterIds '["CLUSTER_ID"]' \
    --region <Region>
# expected: exit 0，返回集群网络配置
```

**预期输出**：

```json
{
  "TotalCount": 1,
  "Clusters": [
    {
      "ClusterId": "cls-example",
      "ClusterName": "tke-demo",
      "ClusterVersion": "1.28.3",
      "ClusterStatus": "Running",
      "ClusterNetworkSettings": {
        "VpcId": "vpc-example",
        "ClusterCIDR": "172.16.0.0/16"
      }
    }
  ],
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

记录 `VpcId` 的值，用于下一步关联 TCR 实例。

### 步骤 6：关联集群 VPC 至 TCR 实例

TCR 企业版默认拒绝全部来源的外部访问。需将 TKE 集群所在的 VPC 关联至 TCR 实例，建立内网访问链路。

#### 选择依据

- **Operation**：选择 `Create`，本次目标为新增 VPC 关联。若需移除则使用 `Delete`。
- **VpcId**：使用步骤 5 中 TKE 集群的 `VpcId`，确保 TCR 内网访问链路指向集群所在网络。
- **SubnetId**：选择与 `VpcId` 同 VPC 的子网。推荐选择集群节点所在的子网以减少跨子网路由。
- **RegionId**：推荐省略此字段，由 `--region` 自动推断地域编码，避免硬编码导致跨地域操作失误。

#### 最小配置

仅含必填字段。`manage-internal-endpoint-minimal.json`：

```json
{
  "RegistryId": "REGISTRY_ID",
  "Operation": "Create",
  "VpcId": "VPC_ID",
  "SubnetId": "SUBNET_ID"
}
```

#### 增强配置

含可选字段。`manage-internal-endpoint-enhanced.json`：

```json
{
  "RegistryId": "REGISTRY_ID",
  "Operation": "Create",
  "VpcId": "VPC_ID",
  "SubnetId": "SUBNET_ID",
  "RegionId": 1
}
```

执行前先查看当前内网访问链路状态，确认尚无 VPC 关联：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0，AccessVpcSet 为空或 null
```

**预期输出**：

```json
{
  "AccessVpcSet": null,
  "TotalCount": 0,
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

执行关联：

```bash
tccli tcr ManageInternalEndpoint \
    --cli-input-json file://manage-internal-endpoint-minimal.json \
    --region <Region>
# expected: exit 0，返回 RegistryId 和 RequestId
```

**预期输出**：

```json
{
  "RegistryId": "REGISTRY_ID",
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

关联后轮询验证（多维度）：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0，AccessVpcSet 中包含目标 VPC
```

**预期输出**：

```json
{
  "AccessVpcSet": [
    {
      "VpcId": "vpc-example",
      "SubnetId": "subnet-example",
      "Status": "Running",
      "AccessIp": "10.0.0.10",
      "EniLBIp": "10.0.0.11"
    }
  ],
  "TotalCount": 1,
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 关联状态 | `AccessVpcSet[].Status` | `Running` |
| VPC 匹配 | `AccessVpcSet[].VpcId` | 与传入的 `VpcId` 一致 |
| 子网匹配 | `AccessVpcSet[].SubnetId` | 与传入的 `SubnetId` 一致 |
| 访问 IP | `AccessVpcSet[].EniLBIp` | 非空，记录此值供步骤 7 使用 |

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `VPC_ID` | VPC 实例 ID | 格式 `vpc-xxxxxxxx` | 步骤 5 中 `DescribeClusters` 返回的 `VpcId` |
| `SUBNET_ID` | 子网 ID | 格式 `subnet-xxxxxxxx`，需与 `VpcId` 同 VPC | `tccli vpc DescribeSubnets --region <Region> --Filters '[{"Name":"vpc-id","Values":["VPC_ID"]}]'` |
| `ENI_LB_IP` | 内网访问 IP | 为 `EniLBIp` 而非 `AccessIp` | 本步骤 `DescribeInternalEndpoints` 返回的 `EniLBIp` |

### 步骤 7：配置内网域名解析

为 TCR 实例创建内网域名解析，使集群内 Pod 能通过内网域名访问 TCR。

#### 选择依据

- **UsePublicDomain**：选择 `true`，使用 TCR 公网域名（如 `example-registry.tencentcloudcr.com`）作为内网解析目标。相比自建域名，公网域名无需额外申请和配置 SSL 证书，且与公网访问使用同一域名，避免镜像地址不一致。
- **EniLBIp**：使用步骤 6 中 `DescribeInternalEndpoints` 返回的 `EniLBIp`，而非 `AccessIp`。`EniLBIp` 是负载均衡 VIP，支持高可用；`AccessIp` 是单点 IP。
- **RegionName**：推荐省略，由 `--region` 自动推断。

#### 最小配置

仅含必填字段。`create-internal-endpoint-dns-minimal.json`：

```json
{
  "InstanceId": "REGISTRY_ID",
  "VpcId": "VPC_ID",
  "EniLBIp": "ENI_LB_IP"
}
```

#### 增强配置

含可选字段。`create-internal-endpoint-dns-enhanced.json`：

```json
{
  "InstanceId": "REGISTRY_ID",
  "VpcId": "VPC_ID",
  "EniLBIp": "ENI_LB_IP",
  "UsePublicDomain": true,
  "RegionName": "REGION"
}
```

```bash
tccli tcr CreateInternalEndpointDns \
    --cli-input-json file://create-internal-endpoint-dns-minimal.json \
    --region <Region>
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

验证内网域名解析状态：

```bash
tccli tcr DescribeInternalEndpointDnsStatus \
    --region <Region> \
    --VpcSet '[{"InstanceId":"REGISTRY_ID","VpcId":"VPC_ID","EniLBIp":"ENI_LB_IP","UsePublicDomain":true}]'
# expected: exit 0，Status 为 ENABLED
```

**预期输出**：

```json
{
  "VpcSet": [
    {
      "Status": "ENABLED"
    }
  ],
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

`Status` 为 `ENABLED` 表示内网域名解析已生效。

> **说明**：若所在地域暂不支持自动 DNS 解析，可在 TKE 集群节点自定义脚本中添加 `echo 'ENI_LB_IP TCR_DOMAIN' >> /etc/hosts` 手动配置。

### 步骤 8：安装 TCR 组件

在 TKE 集群中安装 TCR 扩展组件。组件安装完成后，集群内 Pod 可内网免密拉取关联实例的镜像。

> **注意**：此步骤需在自建 TKE 集群环境下执行（需 `tke:InstallAddon` 权限），本文档未在测试环境中实际执行此命令。以下命令格式经 API 文档验证，参数取值正确。

#### 选择依据

- **AddonName**：固定为 `TCR`，无其他可选值。
- **RawValues**：`registryId` 设为步骤 6 中关联的 TCR 实例 ID。此配置告知 TCR 组件应为哪个实例提供免密拉取能力。一个集群可关联多个 TCR 实例，但此值仅支持单个实例；如需多实例免密，需多次调用 `InstallAddon` 并配置不同的 `registryId`。
- **AddonVersion**：可选。省略时安装最新版本。

#### 最小配置

仅含必填字段：

```bash
tccli tke InstallAddon \
    --ClusterId CLUSTER_ID \
    --AddonName TCR \
    --RawValues '{"registryId":"REGISTRY_ID"}' \
    --region <Region>
# expected: exit 0，返回 RequestId
```

#### 增强配置

指定组件版本：

```bash
tccli tke InstallAddon \
    --ClusterId CLUSTER_ID \
    --AddonName TCR \
    --AddonVersion "1.0.0" \
    --RawValues '{"registryId":"REGISTRY_ID"}' \
    --region <Region>
# expected: exit 0，返回 RequestId
```

轮询确认组件安装状态（多维度）：

```bash
tccli tke DescribeAddon \
    --ClusterId CLUSTER_ID \
    --AddonName TCR \
    --region <Region>
# expected: exit 0，Addons[].AddonStatus 为 Running
```

> **DescribeAddon 响应行为**：该 API 有两种返回模式——
> - **组件已安装**：返回 HTTP 200，JSON 体中含 `Addons` 数组，包含组件状态、版本等信息；
> - **组件未安装或集群不存在**：返回非 0 退出码及错误信息（如 `ResourceNotFound` 或 `UnknownParameter`）。在脚本中建议检查退出码（`$?`）区分这两种情况，而非假定必定返回空列表。

**预期输出**：

```json
{
  "Addons": [
    {
      "AddonName": "TCR",
      "AddonVersion": "1.0.0",
      "AddonStatus": "Running",
      "RawValues": "{\"registryId\":\"REGISTRY_ID\"}"
    }
  ],
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 组件状态 | `Addons[].AddonStatus` | `Running`（非 `Upgrading`/`Failed`） |
| 版本信息 | `Addons[].AddonVersion` | 非空，如 `1.0.0` |
| 配置一致性 | `Addons[].RawValues` | 包含正确的 `registryId` |
| 集群就绪 | 命令退出码 | `0`（区分组件未安装时的非 0 退出码） |

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `CLUSTER_ID` | TKE 集群 ID | 格式 `cls-xxxxxxxx` | 步骤 5 中 `DescribeClusters` 返回的 `ClusterId` |

### 步骤 9：使用 TCR 实例内容器镜像创建工作负载

组件安装完成后创建工作负载，无需在 Pod spec 中指定 `imagePullSecrets`。`deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: demo-app
  template:
    metadata:
      labels:
        app: demo-app
    spec:
      containers:
      - name: getting-started
        image: REGISTRY_DOMAIN/demo-tcr/getting-started:latest
```

> **注意**：以下 kubectl 命令需 TKE 集群公网端点可达，未在本文档环境中实际执行。

```bash
kubectl apply -f deployment.yaml
# expected: deployment.apps/demo-app created
```

**预期输出**：

```text
deployment.apps/demo-app created
```

> **重要**：请避免在工作负载中手动配置 `imagePullSecrets`，否则将导致无法加载 TCR 插件的免密拉取配置。

## 验证

### 控制面（tccli）

验证 TCR 组件多维度正常：

```bash
tccli tke DescribeAddon \
    --ClusterId CLUSTER_ID \
    --AddonName TCR \
    --region <Region>
# expected: exit 0，AddonStatus 为 Running
```

> 若组件已安装，返回 Addons 数组；若返回非 0 退出码，说明组件未安装或集群不存在。参见[步骤 8 的 DescribeAddon 响应行为说明](#步骤-8安装-tcr-组件)。

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 组件状态 | `Addons[].AddonStatus` | `Running` |
| 配置一致 | `Addons[].RawValues` | 包含目标 `registryId` |

验证内网访问链路多维度正常：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0，AccessVpcSet 中包含目标 VPC
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 关联状态 | `AccessVpcSet[].Status` | `Running` |
| 访问 IP | `AccessVpcSet[].EniLBIp` | 非空 |
| VPC 匹配 | `AccessVpcSet[].VpcId` | 与集群所在 VPC 一致 |
| 子网匹配 | `AccessVpcSet[].SubnetId` | 与关联时传入的 SubnetId 一致 |

验证 TCR 实例本身运行状态：

```bash
tccli tcr DescribeInstances \
    --Registryids '["REGISTRY_ID"]' \
    --region <Region>
# expected: exit 0，Status 为 Running
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 实例状态 | `Status` | `Running` |
| 实例类型 | `RegistryType` | `premium`（或其他企业版类型） |
| 公网域名 | `PublicDomain` | 非空 |

验证命名空间存在：

```bash
tccli tcr DescribeNamespaces \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: NamespaceList 中包含目标命名空间
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 命名空间存在 | `NamespaceInfoList[].NamespaceName` | 包含 `demo-tcr` |
| 公开状态 | `NamespaceInfoList[].IsPublic` | `true` |

### 数据面（kubectl）

> **注意**：以下 kubectl 命令需 TKE 集群公网端点可达，未在本文档环境中实际执行。

验证 Pod 运行状态和镜像拉取正常：

```bash
kubectl get pods -l app=demo-app
# expected: READY 1/1, STATUS Running, RESTARTS 0
```

**预期输出**：

```text
NAME                         READY   STATUS    RESTARTS   AGE
demo-app-xxxxxxxxxx-xxxxx    1/1     Running   0          60s
```

```bash
kubectl describe pod -l app=demo-app | grep -E "Image:|ImagePullSecrets"
# expected: 镜像地址为 TCR 域名，ImagePullSecrets 为 <none>（免密拉取生效）
```

**预期输出**：

```text
    Image:          REGISTRY_DOMAIN/demo-tcr/getting-started:latest
    ImagePullSecrets:  <none>
```

确认镜像拉取成功且 `ImagePullSecrets` 为 `<none>`，表明 TCR 插件免密拉取已生效。

## 清理

> **计费警告**：TKE 集群和 TCR 企业版实例都会持续产生费用。请及时清理不再使用的资源。本文只清理本次操作创建的资源（TCR 组件和内网关联），**不建议删除 TCR 实例及命名空间**，除非确认不再使用。

### 数据面（kubectl）

> **注意**：以下 kubectl 命令需 TKE 集群公网端点可达，未在本文档环境中实际执行。

```bash
kubectl delete deployment demo-app
# expected: deployment.apps "demo-app" deleted
```

**预期输出**：

```text
deployment.apps "demo-app" deleted
```

### 控制面（tccli）

#### 1. 卸载 TCR 组件

> **副作用警告**：卸载 TCR 组件不会影响已运行的 Pod（镜像已拉取至本地），但新创建的 Pod 将失去免密拉取能力，可能导致 `ImagePullBackOff`。请确认集群中无新建工作负载依赖免密拉取后再执行。

**清理前状态检查**：

```bash
tccli tke DescribeAddon \
    --ClusterId CLUSTER_ID \
    --AddonName TCR \
    --region <Region>
# expected: AddonStatus 为 Running，确认是目标集群中待卸载的 TCR 组件
```

```bash
tccli tke DeleteAddon \
    --ClusterId CLUSTER_ID \
    --AddonName TCR \
    --region <Region>
# expected: exit 0，返回 RequestId
```

**验证已卸载**：

```bash
tccli tke DescribeAddon \
    --ClusterId CLUSTER_ID \
    --AddonName TCR \
    --region <Region>
# expected: 返回非 0 退出码（组件已卸载，API 返回 ResourceNotFound）或 Addons 列表为空
```

#### 2. 删除 TCR 内网域名解析

> **副作用警告**：删除域名解析后，TKE 集群内 Pod 将无法通过内网域名解析到 TCR 实例，可能触发 DNS 解析失败。确认无工作负载依赖内网域名后再执行。

**清理前状态检查**：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: 确认 AccessVpcSet 中包含待删除解析的 VPC 记录，EniLBIp 非空
```

```bash
tccli tcr DeleteInternalEndpointDns \
    --InstanceId REGISTRY_ID \
    --VpcId VPC_ID \
    --EniLBIp ENI_LB_IP \
    --region <Region>
# expected: exit 0，返回 RequestId
```

#### 3. 移除 VPC 关联

> **副作用警告**：移除 VPC 关联后，该 VPC 内的资源将无法通过内网访问 TCR 实例。若该 VPC 关联了多个集群使用同一 TCR 实例，所有集群都将受影响。**此操作不可逆**，需重新执行 `ManageInternalEndpoint`（`Operation: Create`）才能恢复。

**清理前状态检查**：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: 确认 AccessVpcSet 中包含待移除的 VPC 记录
```

`manage-internal-endpoint-delete.json`：

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
    --cli-input-json file://manage-internal-endpoint-delete.json \
    --region <Region>
# expected: exit 0，返回 RegistryId 和 RequestId
```

**验证已移除**：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: AccessVpcSet 中不再包含目标 VPC 的记录
```

> 不建议删除 TCR 实例及命名空间，除非确认不再使用。若确需删除实例内资源，按以下顺序操作：删除镜像仓库 → 删除命名空间 → 删除实例。

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ManageInternalEndpoint` 返回 VPC 已关联 | `tccli tcr DescribeInternalEndpoints --RegistryId REGISTRY_ID --region <Region>` 确认该 `VpcId` 是否已在 `AccessVpcSet` 中 | 该 VPC 已关联至当前 TCR 实例，重复创建被拒绝 | 若已存在则跳过此步；若需更换子网，先执行 `Operation: Delete` 移除旧关联再重新 `Create` |
| `CreateInternalEndpointDns` 返回 `UnsupportedOperation` | `tccli tcr DescribeInternalEndpoints --RegistryId REGISTRY_ID --region <Region>` 确认 VPC 是否已在 `AccessVpcSet` 中且 `Status` 为 `Running` | VPC 尚未通过 `ManageInternalEndpoint` 关联至 TCR 实例，或地域不支持自动 DNS 解析 | 先执行 `ManageInternalEndpoint` 关联 VPC；若地域不支持自动解析，参见步骤 7 的手动 hosts 配置方案 |
| `docker push` 返回 `denied: requested access to the resource is denied` | `tccli tcr CreateInstanceToken --RegistryId REGISTRY_ID --TokenType longterm --region <Region>` 确认 Token 是否有效 | 未通过 `docker login` 登录 TCR，或凭证已过期 | 重新获取 Token 后执行 `docker login`；确认客户端 IP 在 TCR 网络访问策略允许范围内 |
| `DescribeNamespaces` 返回空列表或 `ResourceNotFound` | `tccli tcr DescribeInstances --Registryids '["REGISTRY_ID"]' --region <Region>` 确认 RegistryId 和 region 是否正确 | 传入了错误的 `RegistryId` 或 `region`，或命名空间尚未创建 | 用 `DescribeInstances` 确认实例 ID 和所在地域；确认已执行步骤 2 创建命名空间 |
| `LimitExceeded` | `tccli vpc DescribeVpcs --region <Region>` 查看当前 VPC 配额使用情况 | 当前账号 VPC 数量已达上限，无法新建 VPC 用于内网访问链路。此为环境限制，非命令错误 | 清理不再使用的 VPC 后重试 `ManageInternalEndpoint`；或使用已有 VPC 和子网 |

### 创建成功但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| Pod 处于 `ImagePullBackOff`，Events 显示 `401 Unauthorized` | `tccli tcr DescribeInstances --Registryids '["REGISTRY_ID"]' --region <Region>` 确认实例 ID；`kubectl get deployment demo-app -o yaml` 检查 `imagePullSecrets` | TCR 插件配置的 `registryId` 与实际实例不匹配，或工作负载中手动配置了 `imagePullSecrets` | 检查 `InstallAddon` 中 `RawValues` 的 `registryId` 是否与 `DescribeInstances` 返回的 `RegistryId` 一致；确认 Deployment YAML 中无 `imagePullSecrets` 字段 |
| TCR 组件状态为 `Upgrading` 或 `Failed` | `tccli tke DescribeClusters --ClusterIds '["CLUSTER_ID"]' --region <Region>` 确认 `ClusterVersion`、`ClusterStatus` | 集群 Kubernetes 版本低于 1.14，或集群地域与 TCR 实例地域不一致 | 升级集群至 >= 1.14；确认集群地域与 TCR 实例地域一致 |
| Pod Events 显示 `UnknownHost`，无法解析 TCR 内网域名 | Pod 内执行 `nslookup REGISTRY_DOMAIN` 测试 DNS 解析 | `CreateInternalEndpointDns` 未成功创建或 VPC DNS 未生效 | 检查 `CreateInternalEndpointDns` 的 `EniLBIp` 是否正确（应为 `DescribeInternalEndpoints` 返回的 `EniLBIp` 而非 `AccessIp`）；确认 `UsePublicDomain` 设为 `true` |
| 镜像拉取速度慢或无响应 | `tccli tcr DescribeInternalEndpoints --RegistryId REGISTRY_ID --region <Region>` 确认内网链路状态 | 可能使用了公网域名拉取镜像，而非内网链路 | 确认 TCR 组件 `AddonStatus` 为 `Running`；确认内网访问链路 `Status` 为 `Running`；在 Pod 内执行 `curl -I https://REGISTRY_DOMAIN/v2/` 验证连通性 |
| 返回 ClusterId 但组件状态长时间不 Running | `tccli tke DescribeAddon --ClusterId CLUSTER_ID --AddonName TCR --region <Region>` 持续轮询状态 | 组件安装异步进行，或集群资源不足导致安装缓慢 | 继续等待；超过 15 分钟则保留 `region`、`ClusterId`、`RequestId`、`AddonName` → 登录 [TKE 控制台](https://console.cloud.tencent.com/tke2/cluster) 查看组件安装详情 |

## 下一步

- [从自建 Harbor 同步镜像到 TCR 企业版](../harbor-migration)
- [TCR 企业版实例管理 — 内网访问控制](../../ops/access/network/private-access)
- [Deployment 管理 — 创建工作负载](https://cloud.tencent.com/document/product/457/31705)
- [TCR 组件说明](https://cloud.tencent.com/document/product/457/49225)

## 控制台替代

[控制台 → 容器镜像服务](https://console.cloud.tencent.com/tcr) 管理 TCR 实例的命名空间与镜像仓库；[控制台 → 容器服务](https://console.cloud.tencent.com/tke2/cluster) 进入集群后通过组件管理安装 TCR 组件，勾选"启用内网解析功能"。
