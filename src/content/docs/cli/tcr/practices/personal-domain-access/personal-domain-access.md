---
title: "使用个人版域名访问企业版实例"
description: "· page_id `82855`"
---

> 对照官方：[使用个人版域名访问企业版实例](https://cloud.tencent.com/document/product/1141/82855) · page_id `82855`

## 概述

将个人版服务域名 `ccr.ccs.tencentyun.com` 的流量引导至 TCR 企业版实例，无需变更 TKE 集群、CI/CD 平台内已有镜像仓库地址及访问凭证配置。客户端继续使用个人版域名 + 个人版凭证即可拉取或推送企业版实例内镜像。

整套方案通过两层 DNS 劫持实现透明转发：

1. **PrivateDNS 层**：在私有网络中创建 `tencentyun.com` 私有域，将 `ccr.ccs` 主机记录 CNAME 解析至企业版实例公网域名。
2. **TCR 内网 DNS 层**：在企业版侧开启 VPC 内网自动解析（`CreateInternalEndpointDns`），使 VPC 内 DNS 请求将企业版公网域名解析至企业版内网 IP。

**支持智能回源**：若企业版实例内无对应命名空间和仓库，自动回源至个人版服务拉取对应镜像（需同命名空间、同仓库名且在个人版中存在该镜像）。若企业版仓库已存在但具体 Tag 不存在，**不会**触发回源。

> **关键提醒**：企业版实例内请勿使用 `library`、`tke`、`public` 等系统保留命名空间，否则会导致 TKE 集群无法拉取产品官方镜像。

## 前置条件

> 前置依赖：需已完成[个人版迁移至企业版完全指南](../personal-migration)中的镜像迁移步骤。企业版实例新建时默认下发支持个人版域名的 SSL 证书。

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:DescribeInstances, tcr:DescribeInternalEndpoints
#    tcr:ManageInternalEndpoint, tcr:CreateInternalEndpointDns
#    tcr:DescribeInternalEndpointDnsStatus, tcr:CreateInstanceToken
#    vpc:DescribeVpcs, vpc:DescribeSubnets
# 验证 TCR 实例查询权限：
tccli tcr DescribeInstances --region <Region>
# expected: exit 0，返回实例列表（可为空）

# 验证 VPC 权限：
tccli vpc DescribeVpcs --region <Region>
# expected: exit 0，返回 VPC 列表（可为空）

# 4. 检查 Docker 客户端（用于数据面验证）
docker --version
# expected: Docker version >= 20.10
```

### 资源检查

```bash
# 5. 确认 TCR 企业版实例存在且 Running
tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'
# expected: exit 0, Status: "Running", RegistryType: "premium" 或 "standard"

# 6. 确认 PrivateDNS 服务已开通
tccli privatedns DescribePrivateZoneList --region <Region>
# expected: exit 0（非 AuthFailure 即表示已开通）

# 7. 确认目标 VPC 存在
tccli vpc DescribeVpcs --region <Region> --VpcIds '["VPC_ID"]'
# expected: exit 0, TotalCount >= 1

# 8. 确认目标子网存在且 IP 充足
tccli vpc DescribeSubnets --region <Region> --SubnetIds '["SUBNET_ID"]'
# expected: exit 0, AvailableIpAddressCount >= 1
```

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看企业版实例及域名 | `DescribeInstances` | 是 |
| 查看内网访问链路及 IP | `DescribeInternalEndpoints` | 是 |
| 关联 VPC 至 TCR 实例 | `ManageInternalEndpoint --Operation Create` | 否 |
| 开启内网自动解析 | `CreateInternalEndpointDns` | 否（重复创建报错） |
| 查看内网 DNS 解析状态 | `DescribeInternalEndpointDnsStatus` | 是 |
| 获取临时/长期访问凭证 | `CreateInstanceToken` | 否 |
| 创建私有域（PrivateDNS） | PrivateDNS 控制台操作 | — |
| 配置解析记录 | PrivateDNS 控制台操作 | — |
| 拉取/推送镜像（数据面） | `docker pull/push ccr.ccs.tencentyun.com/...` | — |

## 关键字段说明

以下说明本页涉及的 API 主要参数。完整参数定义见 `tccli tcr <Action> --help`。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | TCR 企业版实例 ID，格式 `tcr-xxxxxxxx`。`DescribeInstances` 获取 | 实例不存在 → `ResourceNotFound` |
| `VpcId` | String | 是 | TKE 集群所在 VPC ID，格式 `vpc-xxxxxxxx`。`vpc:DescribeVpcs` 获取 | VPC 不存在 → `FailedOperation` |
| `SubnetId` | String | 是 | VPC 下子网 ID，格式 `subnet-xxxxxxxx`。`vpc:DescribeSubnets` 获取 | 子网不存在或 IP 耗尽 → `FailedOperation` |
| `EniLBIp` | String | 是 | ENI LB IP，来自 `DescribeInternalEndpoints` 返回的 `EniLBIp`。不可自行编造 | IP 不匹配 → DNS 解析指向错误目标 |
| `UsePublicDomain` | Boolean | 否 | `true`（使用公网域名解析，推荐）/ `false`（使用内网域名）。默认 `true` | `false` 时 VPC 内使用内网域名，PrivateDNS 记录值需同步修改 |
| `TokenType` | String | 是 | `longterm`（长期有效）或 `temp`（临时，约 1 小时） | 选 `temp` 凭证过期后需重建 |
| `Operation` | String | 是 | `Create`（关联 VPC）或 `Delete`（解除关联） | 填错 → 意图相反，可能误删链路 |

## 操作步骤

### 步骤 1：确认实例及内网访问链路

```bash
tccli tcr DescribeInstances --region <Region> \
    --Registryids '["REGISTRY_ID"]'
# expected: exit 0, Status: "Running", RegistryType: "premium"
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-xxxxxxxx",
            "RegistryName": "tcr-example",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "tcr-example.tencentcloudcr.com"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

查询内网访问链路当前状态：

```bash
tccli tcr DescribeInternalEndpoints --region <Region> \
    --RegistryId REGISTRY_ID
# expected: exit 0
```

**预期输出**：

```json
{
    "AccessVpcSet": [
        {
            "VpcId": "vpc-xxxxxxxx",
            "SubnetId": "subnet-xxxxxxxx",
            "Status": "Running",
            "AccessIp": "10.0.0.5",
            "EniLBIp": "10.0.0.5"
        }
    ],
    "TotalCount": 1,
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

若 `TotalCount` 为 0 或目标 VPC 未关联，执行步骤 2。

### 步骤 2：关联 VPC 至 TCR 实例

#### 选择依据

- **VpcId**：选择 TKE 集群所在 VPC。从 `tccli tke DescribeClusters --region <Region> --ClusterIds '["CLUSTER_ID"]'` 返回的 `ClusterNetworkSettings.VpcId` 获取。
- **SubnetId**：推荐选择集群节点所在子网，减少跨子网路由。同一 VPC 即可连通，不需特定子网。
- **Operation**：首次配置选 `Create`。若 VPC 已关联则跳过此步（`DescribeInternalEndpoints` 中 `VpcId` 已存在即表示已关联）。

#### 最小配置

`manage-internal-endpoint.json`：

```json
{
    "RegistryId": "REGISTRY_ID",
    "Operation": "Create",
    "VpcId": "VPC_ID",
    "SubnetId": "SUBNET_ID"
}
```

```bash
tccli tcr ManageInternalEndpoint \
    --region <Region> \
    --cli-input-json file://manage-internal-endpoint.json
# expected: exit 0, 返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

轮询确认链路就绪：

```bash
tccli tcr DescribeInternalEndpoints --region <Region> \
    --RegistryId REGISTRY_ID
# expected: exit 0, AccessVpcSet[*].Status == "Running"
```

**预期输出**：

```json
{
    "AccessVpcSet": [
        {
            "VpcId": "vpc-xxxxxxxx",
            "SubnetId": "subnet-xxxxxxxx",
            "Status": "Running",
            "AccessIp": "10.0.0.5",
            "EniLBIp": "10.0.0.5"
        }
    ],
    "TotalCount": 1,
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

记录 `EniLBIp`（步骤 3 必需）。`EniLBIp` 为企业版实例在 VPC 内的 ENI LB VIP，后续 DNS 解析将指向此 IP。

### 步骤 3：开启 TCR 侧内网 DNS 自动解析

#### 选择依据

- **EniLBIp**：必须使用步骤 2 `DescribeInternalEndpoints` 返回的 `EniLBIp`，不可自行编造。
- **UsePublicDomain**：选 `true`，使 VPC 内将企业版公网域名（`<RegistryName>.tencentcloudcr.com`）解析至内网 IP。与 PrivateDNS 侧 CNAME 记录值一致。

#### 最小配置

`create-dns.json`：

```json
{
    "InstanceId": "REGISTRY_ID",
    "VpcId": "VPC_ID",
    "EniLBIp": "ENI_LB_IP",
    "UsePublicDomain": true
}
```

```bash
tccli tcr CreateInternalEndpointDns \
    --region <Region> \
    --cli-input-json file://create-dns.json
# expected: exit 0, 返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

轮询确认 DNS 生效：

```bash
tccli tcr DescribeInternalEndpointDnsStatus --region <Region> \
    --VpcSet '[{"InstanceId":"REGISTRY_ID","VpcId":"VPC_ID","EniLBIp":"ENI_LB_IP","UsePublicDomain":true}]'
# expected: exit 0, VpcSet[*].Status == "ENABLED"
```

**预期输出**：

```json
{
    "VpcSet": [
        {
            "Status": "ENABLED"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

确认各 `VpcSet[*].Status` 均为 `ENABLED` 后继续。

### 步骤 4：配置 PrivateDNS 私有域解析

> PrivateDNS 私有域及解析记录的创建与管理需通过 [PrivateDNS 控制台](https://console.cloud.tencent.com/privatedns) 操作，无对应 tccli 等价接口。

#### 4.1 创建私有域

1. 前往 [私有域解析 PrivateDNS](https://console.cloud.tencent.com/privatedns) 控制台。
2. 单击**新建私有域**：
   - **域名**：`tencentyun.com`
   - **关联 VPC**：选择步骤 2 已关联至 TCR 实例的 VPC
   - **子域名递归解析**：保持**开启**（确保未配置的 `*.tencentyun.com` 子域名仍走公网 DNS）

#### 4.2 配置解析记录

进入私有域 `tencentyun.com` 详情页，添加解析记录：

| 字段 | 值 |
|------|-----|
| 主机记录 | `ccr.ccs` |
| 记录类型 | `CNAME` |
| 记录值 | `<RegistryName>.tencentcloudcr.com`（企业版实例公网域名，从步骤 1 `DescribeInstances` 的 `PublicDomain` 获取） |

解析链路最终效果：

```
ccr.ccs.tencentyun.com
  → (PrivateDNS CNAME) → <RegistryName>.tencentcloudcr.com
    → (TCR VPC 内网 DNS) → <EniLBIp>（企业版内网 IP）
```

### 步骤 5：获取访问凭证

#### 选择依据

- **TokenType**：`longterm`（长期有效），适合写在 TKE `imagePullSecret` 或 CI/CD 配置中。`temp`（临时，约 1 小时）仅在一次性调试场景使用，过期需重建。
- **Desc**：填写描述性文字（如 `个人版域名兼容专用`），便于在凭证列表中区分用途。

#### 最小创建

```bash
tccli tcr CreateInstanceToken --region <Region> \
    --RegistryId REGISTRY_ID \
    --TokenType longterm
# expected: exit 0, 返回 Username 和 Token
```

**预期输出**：

```json
{
    "Username": "100012345678",
    "Token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IlBBR...",
    "ExpTime": 2096844746789,
    "TokenId": "tcr-token-xxxxxxxx",
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

#### 增强配置（带描述）

```bash
tccli tcr CreateInstanceToken --region <Region> \
    --RegistryId REGISTRY_ID \
    --TokenType longterm \
    --Desc "个人版域名兼容专用"
# expected: exit 0, 返回 Username 和 Token（含 Desc）
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `REGISTRY_ID` | TCR 企业版实例 ID | 格式 `tcr-xxxxxxxx` | `tccli tcr DescribeInstances` |
| `REGION` | 地域 | 如 `ap-guangzhou` | `tccli configure list` 或 `tccli tcr DescribeInstances` 返回的地域 |
| `VPC_ID` | VPC 实例 ID | 格式 `vpc-xxxxxxxx` | `tccli vpc DescribeVpcs` |
| `ENI_LB_IP` | ENI LB 内网 IP | 点分十进制 IP，来自 `DescribeInternalEndpoints` | `tccli tcr DescribeInternalEndpoints --RegistryId REGISTRY_ID` |

### 步骤 6：验证透明访问

#### 6.1 VPC 内 DNS 解析验证

在 VPC 内任意 CVM 或 Pod 中执行：

```bash
nslookup ccr.ccs.tencentyun.com
# expected: 返回企业版实例内网 IP（ENI_LB_IP）
```

#### 6.2 Docker 登录与拉取验证

```bash
docker login ccr.ccs.tencentyun.com --username=<Username> --password=<Token>
# expected: Login Succeeded

docker pull ccr.ccs.tencentyun.com/<NamespaceName>/<RepoName>:<Tag>
# expected: 从企业版实例拉取成功（实际请求已路由至企业版内网 IP）
```

#### 6.3 智能回源验证（企业版无此仓库时回源个人版）

```bash
# 假设个人版存在 team-b/apache:latest，但企业版无此仓库
docker pull ccr.ccs.tencentyun.com/team-b/apache:latest
# expected: 自动回源至个人版拉取成功
```

> 回源仅在仓库名完全不存在于企业版实例时生效。若企业版有同名仓库但具体 Tag 不存在，**不会**回源。

#### 6.4 TKE 集群中验证

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-test
  template:
    metadata:
      labels:
        app: nginx-test
    spec:
      imagePullSecrets:
      - name: qcloudregistrykey
      containers:
      - name: nginx
        image: ccr.ccs.tencentyun.com/<NamespaceName>/<RepoName>:<Tag>
```

```bash
kubectl apply -f deployment.yaml
kubectl get pods -l app=nginx-test
# expected: STATUS Running, READY 1/1
```

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 实例状态 | `tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'` | `Status: "Running"` |
| 内网链路 | `tccli tcr DescribeInternalEndpoints --region <Region> --RegistryId REGISTRY_ID` | `AccessVpcSet[*].Status == "Running"` 且含目标 VPC |
| DNS 解析状态 | `tccli tcr DescribeInternalEndpointDnsStatus --region <Region> --VpcSet '[{"InstanceId":"REGISTRY_ID","VpcId":"VPC_ID","EniLBIp":"ENI_LB_IP","UsePublicDomain":true}]'` | `VpcSet[*].Status == "ENABLED"` |
| 访问凭证 | `tccli tcr CreateInstanceToken --region <Region> --RegistryId REGISTRY_ID --TokenType longterm` 保存 `Username` 和 `Token` | 返回有效凭证 |

### 数据面

```bash
# DNS 解析验证（VPC 内执行）
nslookup ccr.ccs.tencentyun.com
# expected: 返回企业版实例内网 IP

# Docker 登录验证
docker login ccr.ccs.tencentyun.com --username=<Username> --password=<Token>
# expected: Login Succeeded

# 拉取镜像验证
docker pull ccr.ccs.tencentyun.com/<NamespaceName>/<RepoName>:<Tag>
# expected: 成功拉取

# TKE Pod 验证
kubectl get pods -l app=nginx-test
# expected: STATUS Running, READY 1/1
```

## 清理

> **副作用警告**：
> - `DeleteInternalEndpointDns` 仅移除 TCR 侧自动 DNS 解析记录，不影响 PrivateDNS 手动配置的记录。
> - `ManageInternalEndpoint --Operation Delete` 会移除 VPC 内网访问链路，该 VPC 内所有客户端无法内网访问企业版实例。
> - 删除 PrivateDNS 解析记录或私有域后，VPC 内 `ccr.ccs.tencentyun.com` 恢复公网 DNS 解析，指向个人版服务。客户端将**回退至直接访问个人版**，而非透明路由至企业版。

### 清理前状态检查

```bash
# 确认当前内网链路状态
tccli tcr DescribeInternalEndpoints --region <Region> \
    --RegistryId REGISTRY_ID
# 确认当前 DNS 解析状态
tccli tcr DescribeInternalEndpointDnsStatus --region <Region> \
    --VpcSet '[{"InstanceId":"REGISTRY_ID","VpcId":"VPC_ID","EniLBIp":"ENI_LB_IP","UsePublicDomain":true}]'
```

### 数据面

```bash
# 删除测试 Deployment
kubectl delete deployment nginx-test --ignore-not-found
# 删除测试镜像
docker rmi ccr.ccs.tencentyun.com/<NamespaceName>/<RepoName>:<Tag>
```

### 控制面（tccli）

```bash
# 1. 删除 TCR 侧内网 DNS 解析
tccli tcr DeleteInternalEndpointDns --region <Region> \
    --InstanceId REGISTRY_ID \
    --VpcId VPC_ID \
    --EniLBIp ENI_LB_IP
# expected: exit 0

# 2. 解除 VPC 内网访问链路
tccli tcr ManageInternalEndpoint --region <Region> \
    --RegistryId REGISTRY_ID \
    --Operation Delete \
    --VpcId VPC_ID \
    --SubnetId SUBNET_ID
# expected: exit 0
```

### PrivateDNS 控制台清理

在 [PrivateDNS 控制台](https://console.cloud.tencent.com/privatedns) 中删除 `ccr.ccs` 解析记录，或删除整个私有域 `tencentyun.com`。

### 验证已删除

```bash
# 确认内网链路已删除
tccli tcr DescribeInternalEndpoints --region <Region> \
    --RegistryId REGISTRY_ID
# expected: TotalCount: 0 或目标 VPC 不在 AccessVpcSet 中

# 确认 DNS 解析已删除
tccli tcr DescribeInternalEndpointDnsStatus --region <Region> \
    --VpcSet '[{"InstanceId":"REGISTRY_ID","VpcId":"VPC_ID","EniLBIp":"ENI_LB_IP","UsePublicDomain":true}]'
# expected: VpcSet 为空或状态非 ENABLED
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ManageInternalEndpoint` 返回 `FailedOperation` | `tccli vpc DescribeVpcs --region <Region> --VpcIds '["VPC_ID"]'` 确认 VPC 存在 | VPC 不存在或 VPC ID 错误 | 使用 `tccli vpc DescribeVpcs --region <Region>` 查询正确 VPC ID |
| `ManageInternalEndpoint` 返回 `FailedOperation`（子网不可用） | `tccli vpc DescribeSubnets --region <Region> --SubnetIds '["SUBNET_ID"]'` 检查 `AvailableIpAddressCount` | 子网不存在或 IP 耗尽 | 换用有可用 IP 的子网，或在该 VPC 下新建子网 |
| `ManageInternalEndpoint` 返回 `LimitExceeded` | `tccli tcr DescribeInternalEndpoints --region <Region> --RegistryId REGISTRY_ID` 查看已有 VPC 关联数 | VPC 关联数量达上限（此为环境限制，非命令错误） | 删除不再使用的 VPC 关联后重试 |
| `CreateInternalEndpointDns` 返回 `UnsupportedOperation` | `tccli tcr DescribeInternalEndpoints --region <Region> --RegistryId REGISTRY_ID` 确认 VPC 是否已关联 | VPC 未通过 `ManageInternalEndpoint` 关联至 TCR 实例 | 先执行步骤 2 关联 VPC，再创建 DNS 解析 |
| `CreateInternalEndpointDns` 返回 `InvalidParameterValue` | `tccli tcr DescribeInternalEndpoints --region <Region> --RegistryId REGISTRY_ID` 对比 `EniLBIp` | 传入的 `EniLBIp` 与返回值不匹配 | 使用 `DescribeInternalEndpoints` 返回的精确 `EniLBIp` |
| `CreateInstanceToken` 返回 `AuthFailure` | `tccli configure list` 检查凭证 + `tccli tcr DescribeInstances --region <Region>` 验证权限 | CAM 权限不足，缺少 `tcr:CreateInstanceToken` | 联系 CAM 管理员添加 `tcr:CreateInstanceToken` 权限 |

### 创建成功但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `docker pull` 超时或无响应 | `nslookup ccr.ccs.tencentyun.com`（在 VPC 内 CVM/Pod 执行）验证 DNS | PrivateDNS 未配置或 VPC 关联错误 | 在 PrivateDNS 控制台确认私有域已关联正确 VPC，解析记录已保存且生效 |
| `docker pull` 返回个人版镜像而非企业版 | `tccli tcr DescribeRepositories --region <Region> --RegistryId REGISTRY_ID --NamespaceName <ns>` 确认仓库是否存在 | 企业版实例内无对应仓库，触发了智能回源（预期行为） | 如不期望回源，在企业版实例内创建对应命名空间和仓库并迁移镜像 |
| Push 报 `denied` / `unauthorized` | `tccli tcr DescribeNamespaces --region <Region> --RegistryId REGISTRY_ID` 确认命名空间存在 | 企业版实例内无对应命名空间，或登录凭证错误 | 先创建命名空间；确认 `docker login ccr.ccs.tencentyun.com` 使用步骤 5 生成的凭证 |
| 使用 `library`/`tke`/`public` 导致 TKE 官方镜像拉取异常 | `tccli tcr DescribeNamespaces --region <Region> --RegistryId REGISTRY_ID` 查看是否含保留命名空间 | 系统保留命名空间在个人版域名模式下与 TKE 官方镜像路径冲突 | 删除保留命名空间，改用自定义名称 |
| DNS 解析生效延迟 | `nslookup ccr.ccs.tencentyun.com` 指定 DNS 服务器查询 | DNS 传播通常需 1-2 分钟 | 等待后重试；检查 PrivateDNS 解析记录是否保存成功 |
| 同一地域多个企业版实例开启域名兼容导致解析冲突 | `tccli tcr DescribeInstances --region <Region>` 列出所有实例及 `DescribeInternalEndpointDnsStatus` 状态 | 同地域仅允许一个实例开启个人版域名兼容功能 | 仅保留一个实例开启 `CreateInternalEndpointDns`，其余实例在 PrivateDNS 侧移除解析记录 |

> 遇到上述排查无法解决的问题，保留 `RequestId`（每次 API 调用返回的 `RequestId` 字段）、实例 ID、地域信息，登录 [TCR 控制台](https://console.cloud.tencent.com/tcr) 查看详细状态，或 [提交工单](https://console.cloud.tencent.com/workorder)。

## 下一步

- [个人版迁移至企业版完全指南](../personal-migration) — 镜像数据迁移（前置步骤）
- [配置内网访问控制](../../../ops/access/network/private-access) — VPC 内网链路管理
- [TKE 集群使用 TCR 插件内网免密拉取容器镜像](../../tke-plugin-pull) — 免密拉取配置
- [配置自定义域名](../../../ops/access/domain/custom-domain) — 通用自定义域名管理

## 控制台替代

[容器镜像服务控制台](https://console.cloud.tencent.com/tcr) 完成实例创建与镜像迁移，前往 [PrivateDNS 控制台](https://console.cloud.tencent.com/privatedns) 创建 `tencentyun.com` 私有域并添加 `ccr.ccs` CNAME 记录指向企业版实例域名。在 TKE 集群内保持已有 `ccr.ccs.tencentyun.com` 镜像地址与 `qcloudregistrykey` 凭证即可透明访问企业版实例。
