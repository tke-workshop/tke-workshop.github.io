---
title: "TKE Serverless 集群拉取 TCR 容器镜像"
description: "· page_id `59029`"
---

> 对照官方：[TKE Serverless 集群拉取 TCR 容器镜像](https://cloud.tencent.com/document/product/1141/59029) · page_id `59029`

## 概述

在 TKE Serverless（弹性容器实例 EKS）集群中拉取 TCR 企业版实例内的私有容器镜像，并创建工作负载。

整体链路分为三层：(1) 将镜像推送至 TCR 企业版（docker，数据面）；(2) 打通 TKE Serverless 集群与 TCR 实例间的内网访问链路（tccli，控制面）；(3) 在集群中创建引用 TCR 镜像的工作负载（kubectl，数据面）。

> **与 TKE 标准集群的关键区别：** TKE Serverless 集群**不支持** TCR 插件免密拉取。必须手动创建 `imagePullSecret` 并在工作负载 `spec.template.spec.imagePullSecrets` 中显式引用。标准 TKE 集群可通过安装 TCR 插件实现免密拉取，参见 [TKE 集群使用 TCR 插件内网免密拉取容器镜像](https://cloud.tencent.com/document/product/1141/48184)。

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
#    tcr:DescribeInstances, tcr:CreateNamespace, tcr:DescribeNamespaces,
#    tcr:CreateRepository, tcr:DescribeRepositories,
#    tcr:ManageInternalEndpoint, tcr:CreateInternalEndpointDns,
#    tcr:DescribeInternalEndpoints, tcr:DescribeInternalEndpointDnsStatus,
#    tcr:CreateInstanceToken, tcr:DescribeInstanceToken, tcr:DeleteInstanceToken,
#    tke:DescribeClusters
#    建议授予 QcloudTCRFullAccess 预设策略
# 验证：执行 DescribeInstances 确认 TCR 权限
tccli tcr DescribeInstances --region <Region>
# expected: exit 0，返回实例列表（可为空）

# 验证 TKE 权限
tccli tke DescribeClusters --region <Region>
# expected: exit 0，返回集群列表（可为空）

# 4. 检查 Docker 客户端
docker --version
# expected: Docker version 20.10+

# 5. 检查 kubectl 并可连接到 TKE Serverless 集群
kubectl cluster-info
# expected: Kubernetes control plane 可访问
```

### 资源检查

```bash
# 6. 确认 TCR 企业版实例存在且状态正常
tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'
# expected: exit 0, Registries[0].Status == "Running"

# 7. 确认 TKE Serverless 集群存在
tccli tke DescribeClusters --region <Region> --ClusterIds '["CLUSTER_ID"]'
# expected: exit 0, Clusters[0].ClusterType 含 "SERVERLESS" 或 "EKS"
```

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看 TCR 实例列表 | `DescribeInstances` | 是 |
| 创建命名空间 | `CreateNamespace` | 否（同名报错） |
| 查看命名空间列表 | `DescribeNamespaces` | 是 |
| 创建镜像仓库（可选） | `CreateRepository` | 否（同名报错） |
| 查看仓库列表 | `DescribeRepositories` | 是 |
| 创建长期访问凭证 | `CreateInstanceToken` | 否 |
| 管理内网访问链路 | `ManageInternalEndpoint` | 否（同 VPC 重复创建报错） |
| 查看内网访问链路 | `DescribeInternalEndpoints` | 是 |
| 创建内网 DNS 解析 | `CreateInternalEndpointDns` | 否 |
| 查看内网 DNS 状态 | `DescribeInternalEndpointDnsStatus` | 是 |

## 关键字段说明

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | TCR 实例 ID，由 `DescribeInstances` 返回 | `InvalidParameter.RegistryNotFound` — 实例不存在或地域错误 |
| `Region` | String | 是 | 地域名，如 `ap-guangzhou`、`ap-shanghai` | `InvalidParameter` — 地域与实例不匹配，命令无法路由 |
| `NamespaceName` | String | 是 | 1-63 字符，小写字母/数字/下划线/连字符，不能以连字符开头结尾 | `InvalidParameter` — 命名空间名格式不合法 |
| `IsPublic` | Boolean | 否 | `true` 公有，`false` 私有（默认 `false`） | 误设为 `true` 导致镜像被意外公开访问 |
| `RepositoryName` | String | 是 | 1-255 字符，小写字母/数字/下划线/连字符/点 | `InvalidParameter` — 仓库名格式不合法 |
| `BriefDescription` | String | 否 | 最多 100 字符，仓库简要描述 | 无严重后果，仅影响仓库列表可读性 |
| `TokenType` | String | 是 | `longterm`（长期凭证，无过期）或 `temp`（临时凭证，有过期时间） | 选 `temp` 导致凭证过期后 Pod 拉取镜像失败，需重建 Secret |
| `Desc` | String | 否 | 凭证描述，最多 255 字符 | 无严重后果，仅影响凭证可识别性 |
| `VpcId` | String | 是 | 已有 VPC ID，格式 `vpc-xxxxxxxx`，须为 TKE Serverless 集群所在 VPC | `FailedOperation` — VPC 不存在或不可用 |
| `SubnetId` | String | 是 | VPC 下已有子网 ID，格式 `subnet-xxxxxxxx`，须有空闲 IP | `FailedOperation` — 子网不存在或 IP 耗尽 |
| `RegionId` | Integer | 否 | 地域数字 ID（如广州=1、上海=4），部分接口自动推导 | `InvalidParameter` — RegionId 与 RegionName 不匹配 |
| `RegionName` | String | 否 | 地域名称，须与 `--region` 一致（如 `ap-guangzhou`） | `InvalidParameter` — 地域信息不一致 |
| `EniLBIp` | String | 是 | ENI LB IP 地址。`EniLBIp` 为 `CreateInternalEndpointDns` 的输入参数名，`AccessIp` 为 `DescribeInternalEndpoints` 的输出字段名，二者为同一值 | `InvalidParameter` — IP 地址无效，DNS 解析指向错误目标 |
| `UsePublicDomain` | Boolean | 否 | `true` 使用公网域名（`tencentcloudcr.com`）做内网解析；`false` 使用专有域名 | DNS 解析目标不一致，Pod 无法通过内网访问 TCR |
| `InstanceId` | String | 是 | TCR 实例 ID（同 `RegistryId`），用于 `CreateInternalEndpointDns` | `ResourceNotFound` — 实例不存在 |
| `Operation` | String | 是 | `"Create"` 或 `"Delete"`，大小写敏感 | `InvalidParameter` — 操作类型未知 |

## 操作步骤

### 步骤 1：准备容器镜像（控制面 + 数据面）

#### 1.1 查看 TCR 实例状态

确认企业版实例处于可用状态：

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
            "RegistryName": "example",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "example.tencentcloudcr.com"
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 占位符 | 对应关键字段 | 获取方式 |
|--------|------------|---------|
| `REGISTRY_ID` | `RegistryId` | `tccli tcr DescribeInstances --region <Region>` |
| `REGION` | `Region` | `tccli configure list` 查看已配置地域 |

记录 `RegistryName`（后续 docker 登录用）和 `RegistryType`（`basic` 或 `premium`，影响部分操作限制）。

#### 1.2 创建命名空间

##### 选择依据

- **IsPublic**：选择 `false`（私有），因为本场景拉取的是私有容器镜像，设为 `true` 会导致镜像被意外公开访问。默认为 `false`，省略此参数效果相同。
- **NamespaceName**：建议使用项目名或团队名作为命名空间前缀，便于在 `DescribeNamespaces` 中按组织维度管理。

新建的 TCR 企业版实例内无默认命名空间，需手动创建：

```bash
tccli tcr CreateNamespace \
    --RegistryId REGISTRY_ID \
    --NamespaceName NAMESPACE_NAME \
    --IsPublic false \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 占位符 | 对应关键字段 | 获取方式 |
|--------|------------|---------|
| `REGISTRY_ID` | `RegistryId` | 步骤 1.1 `DescribeInstances` 返回 |
| `NAMESPACE_NAME` | `NamespaceName` | 自定义，如 `kerwinwjyan-test` |
| `REGION` | `Region` | `tccli configure list` 查看 |

验证：

```bash
tccli tcr DescribeNamespaces \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, NamespaceList 包含 NAMESPACE_NAME, Public == false
```

**预期输出**：

```json
{
    "NamespaceList": [
        {
            "Name": "kerwinwjyan-test",
            "NamespaceId": 2,
            "Public": false
        }
    ],
    "TotalCount": 1,
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

#### 1.3 创建镜像仓库（可选）

##### 选择依据

- **可选执行**：`docker push` 时若目标仓库不存在，TCR 会**自动创建**，无需提前手动执行。仅在需要预设 `BriefDescription` 或严格控制仓库名的场景下才手动创建。
- **RepositoryName**：建议与镜像名一致，避免 `docker tag` 时路径混淆。
- **BriefDescription**：可选但建议填写，便于在 `DescribeRepositories` 返回的仓库列表中快速识别用途。

**最小创建**（仅必填字段，参数 ≤3 个，无需 JSON 文件）：

```bash
tccli tcr CreateRepository \
    --RegistryId REGISTRY_ID \
    --NamespaceName NAMESPACE_NAME \
    --RepositoryName REPO_NAME \
    --region <Region>
# expected: exit 0
```

**增强配置**（含可选字段）：

```bash
tccli tcr CreateRepository \
    --RegistryId REGISTRY_ID \
    --NamespaceName NAMESPACE_NAME \
    --RepositoryName REPO_NAME \
    --BriefDescription "仓库描述" \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 占位符 | 对应关键字段 | 获取方式 |
|--------|------------|---------|
| `REGISTRY_ID` | `RegistryId` | 步骤 1.1 `DescribeInstances` 返回 |
| `NAMESPACE_NAME` | `NamespaceName` | 步骤 1.2 创建的命名空间 |
| `REPO_NAME` | `RepositoryName` | 自定义，如 `nginx` |
| `REGION` | `Region` | `tccli configure list` 查看 |

验证：

```bash
tccli tcr DescribeRepositories \
    --RegistryId REGISTRY_ID \
    --NamespaceName NAMESPACE_NAME \
    --region <Region>
# expected: exit 0, RepositoryList 包含 REPOSITORY_NAME
```

**预期输出**：

```json
{
    "RepositoryList": [
        {
            "Name": "NAMESPACE_NAME/REPO_NAME",
            "Namespace": "NAMESPACE_NAME",
            "Public": true
        }
    ],
    "TotalCount": 1,
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

#### 1.4 创建访问凭证并推送镜像至 TCR（数据面）

##### 选择依据

- **TokenType**：选择 `longterm` 而非 `temp`，因为 TKE Serverless 工作负载需要持久有效的镜像拉取凭证。`temp` 凭证有过期时间，过期后需重建 `imagePullSecret` 并滚动更新所有引用该 Secret 的工作负载，运维成本高。
- **Desc**：建议填写可识别的描述（如 "EKS 拉取专用"），方便通过 `DescribeInstanceToken` 识别凭证用途，便于后续轮换时精准定位。
- **专用凭证**：建议为 EKS 拉取场景创建专用长期凭证，而非复用控制台临时凭证，以实现权限隔离和独立轮换。

创建长期访问凭证：

```bash
tccli tcr CreateInstanceToken \
    --RegistryId REGISTRY_ID \
    --TokenType longterm \
    --Desc "EKS 拉取专用" \
    --region <Region>
# expected: exit 0, 返回 Username 和 Token
```

**预期输出**：

```json
{
    "Username": "100012345678",
    "Token": "d8prmfsth9mroppu4740",
    "TokenId": "token-example",
    "ExpTime": 1893456000000,
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

> `Token` 字段**仅此一次返回**，请妥善保存。

| 占位符 | 对应关键字段 | 获取方式 |
|--------|------------|---------|
| `REGISTRY_ID` | `RegistryId` | 步骤 1.1 `DescribeInstances` 返回 |
| `REGION` | `Region` | `tccli configure list` 查看 |

确认凭证已就绪：

```bash
tccli tcr DescribeInstanceToken \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, Tokens 列表含目标凭证且 Enabled == true
```

**预期输出**：

```json
{
    "Tokens": [
        {
            "Id": "token-example",
            "Desc": "EKS 拉取专用",
            "Enabled": true
        }
    ],
    "TotalCount": 1,
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

登录并推送镜像：

```bash
docker login REGISTRY_NAME.tencentcloudcr.com \
    --username=USERNAME \
    --password=TOKEN
```

**预期输出**：

```text
Login Succeeded
```

```bash
docker tag LOCAL_IMAGE:TAG \
    REGISTRY_NAME.tencentcloudcr.com/NAMESPACE_NAME/REPO_NAME:TAG

docker push REGISTRY_NAME.tencentcloudcr.com/NAMESPACE_NAME/REPO_NAME:TAG
```

**预期输出**：

```text
The push refers to repository [REGISTRY_NAME.tencentcloudcr.com/NAMESPACE_NAME/REPO_NAME]
sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx: Pushed
TAG: digest: sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx size: 1234
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `REGISTRY_NAME` | TCR 实例名称 | 步骤 1.1 `DescribeInstances` 返回的 `RegistryName` |
| `USERNAME` | 访问凭证用户名 | 步骤 1.4 `CreateInstanceToken` 返回的 `Username` |
| `TOKEN` | 访问凭证 Token | 步骤 1.4 `CreateInstanceToken` 返回的 `Token` |
| `NAMESPACE_NAME` | 命名空间名 | 步骤 1.2 创建的命名空间 |
| `REPO_NAME` | 仓库名 | 步骤 1.3 创建的仓库名 |
| `LOCAL_IMAGE` | 本地已有镜像名 | `docker images` 查看 |
| `TAG` | 镜像标签 | 自定义，如 `latest`、`v1.0` |

### 步骤 2：配置 TKE Serverless 集群访问 TCR 实例（控制面）

TCR 企业版默认拒绝全部来源的 VPC 访问。需将 TKE Serverless 集群所在 VPC 关联至 TCR 实例并配置内网域名解析。

> 若 TKE Serverless 集群与 TCR 实例在同一地域，建议使用内网访问（免公网流量）。若需通过公网，参见[通过 NAT 网关访问外网](https://cloud.tencent.com/document/product/457/48710)（需开启 `ManageExternalEndpoint`）。

#### 2.1 获取 TKE Serverless 集群所在 VPC

```bash
tccli tke DescribeClusters \
    --ClusterIds '["CLUSTER_ID"]' \
    --region <Region>
# expected: exit 0, Clusters[0].ClusterType 含 SERVERLESS/EKS
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Clusters": [
        {
            "ClusterId": "cls-example",
            "ClusterName": "eks-cluster",
            "ClusterType": "SERVERLESS_CLUSTER",
            "ClusterStatus": "Running",
            "ClusterNetworkSettings": {
                "VpcId": "vpc-example",
                "SubnetIds": ["subnet-example"]
            }
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `CLUSTER_ID` | TKE Serverless 集群 ID | 控制台或 `tccli tke DescribeClusters --region <Region>` |
| `REGION` | 地域 | `tccli configure list` 查看 |

从返回的 `Clusters[0].ClusterNetworkSettings.VpcId` 获取 VPC ID，记录 `VPC_ID` 和对应的 `SUBNET_ID`。

#### 2.2 在 TCR 实例中关联集群 VPC

##### 选择依据

- **VpcId**：必须严格是 TKE Serverless 集群所在的 VPC（由步骤 2.1 获取），否则集群内 Pod 无法通过内网访问 TCR 实例。
- **SubnetId**：选择同一 VPC 下有空闲 IP 的子网。若子网 IP 耗尽，ENI 分配失败，`ManageInternalEndpoint` 将报错。
- **Operation=Create**：本场景是新建内网访问链路。`ManageInternalEndpoint` 同一 VPC 重复创建会报错，非幂等。
- **RegionId / RegionName**：部分地域需显式提供，部分可自动推导。若省略后命令正常执行则无需填写；若报 `InvalidParameter` 再补充。

参数 >= 4 个，使用 `--cli-input-json file://`，分最小/增强两层。

**最小配置**（仅必填字段）：

`tcr-manage-internal-endpoint-minimal.json`：

```json
{
    "RegistryId": "REGISTRY_ID",
    "Operation": "Create",
    "VpcId": "VPC_ID",
    "SubnetId": "SUBNET_ID"
}
```

**增强配置**（含地域信息，当最小配置报 `InvalidParameter` 时使用）：

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
# 执行创建（优先使用 minimal，若报 InvalidParameter 则改用 enhanced）
tccli tcr ManageInternalEndpoint \
    --cli-input-json file://tcr-manage-internal-endpoint-minimal.json \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RegistryId": "REGISTRY_ID",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 占位符 | 对应关键字段 | 获取方式 |
|--------|------------|---------|
| `REGISTRY_ID` | `RegistryId` | 步骤 1.1 `DescribeInstances` 返回 |
| `VPC_ID` | `VpcId` | 步骤 2.1 `DescribeClusters` 返回 `ClusterNetworkSettings.VpcId` |
| `SUBNET_ID` | `SubnetId` | 步骤 2.1 `DescribeClusters` 返回的 `SubnetIds[0]` |
| `REGION` | `Region` | `tccli configure list` 查看 |

> **注意：** 若当前账号 VPC 数量已达上限（`LimitExceeded`），`ManageInternalEndpoint` 将失败。此为环境限制，非命令错误。需先清理不再使用的 VPC 后重试。正常环境下，VPC 配额充足可正常执行。

异步轮询等待链路就绪：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, AccessVpcSet 不为 null
```

**预期输出**：

```json
{
    "AccessVpcSet": [
        {
            "VpcId": "vpc-of73262z",
            "SubnetId": "subnet-rdmcho9m",
            "AccessIp": "10.0.0.100",
            "Status": "Running"
        }
    ],
    "TotalCount": 1,
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

> 若内网链路尚未创建，`AccessVpcSet` 为 `null`、`TotalCount` 为 `0`。执行 `ManageInternalEndpoint` 创建链路后重试。

记录 `AccessVpcSet[0].AccessIp` 值（即 `ENI_LB_IP`），后续步骤 2.3 需要。

##### 多维度验证

创建内网链路是异步操作，仅检查 `Status=Running` 不够，需多维度确认：

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 状态 | `AccessVpcSet[i].Status` | `Running` |
| 网络 | `AccessVpcSet[i].AccessIp` | 非空有效 IP 地址 |
| VPC 关联 | `AccessVpcSet[i].VpcId` | 等于目标 `VPC_ID` |
| 子网关联 | `AccessVpcSet[i].SubnetId` | 等于目标 `SUBNET_ID` |

#### 2.3 配置域名内网解析

内网访问链路创建完成后，配置内网 DNS 解析使 VPC 内 Pod 可通过内网解析 TCR 域名。

##### 选择依据

- **UsePublicDomain**：推荐设为 `true`，使用 `tencentcloudcr.com` 公网域名进行内网解析。这样内网与公网使用同一域名，避免 DNS 分裂导致配置不一致。若设为 `false`，将使用专有内网域名，需同时修改工作负载中的镜像地址。
- **EniLBIp**：必须严格来自步骤 2.2 `DescribeInternalEndpoints` 返回的 `AccessVpcSet[0].AccessIp`。任意填写会导致 DNS 解析指向错误 IP，Pod 无法拉取镜像。
- **前置依赖**：本步骤依赖步骤 2.2 `ManageInternalEndpoint` 成功创建链路并提供 `AccessIp`。

参数 >= 4 个，使用 `--cli-input-json file://`，分最小/增强两层。

**最小配置**（仅必填字段）：

`tcr-create-internal-dns-minimal.json`：

```json
{
    "InstanceId": "REGISTRY_ID",
    "VpcId": "VPC_ID",
    "EniLBIp": "ENI_LB_IP"
}
```

**增强配置**（含可选字段，推荐）：

`tcr-create-internal-dns-enhanced.json`：

```json
{
    "InstanceId": "REGISTRY_ID",
    "VpcId": "VPC_ID",
    "EniLBIp": "ENI_LB_IP",
    "UsePublicDomain": true,
    "RegionName": "ap-guangzhou"
}
```

```bash
# 执行创建（推荐使用 enhanced）
tccli tcr CreateInternalEndpointDns \
    --cli-input-json file://tcr-create-internal-dns-enhanced.json \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 占位符 | 对应关键字段 | 获取方式 |
|--------|------------|---------|
| `REGISTRY_ID` | `RegistryId` / `InstanceId` | 步骤 1.1 `DescribeInstances` 返回 |
| `VPC_ID` | `VpcId` | 步骤 2.1 `DescribeClusters` 返回 |
| `ENI_LB_IP` | `EniLBIp` | 步骤 2.2 `DescribeInternalEndpoints` 返回 `AccessVpcSet[0].AccessIp` |
| `REGION` | `Region` | `tccli configure list` 查看 |

> **注意：** 若 `ManageInternalEndpoint`（步骤 2.2）未执行或失败，则 `CreateInternalEndpointDns` 无可用 `ENI_LB_IP`，本步骤无法执行。需先确保步骤 2.2 成功。

验证内网 DNS 解析状态：

```bash
tccli tcr DescribeInternalEndpointDnsStatus \
    --VpcSet '[{"InstanceId":"REGISTRY_ID","VpcId":"VPC_ID","EniLBIp":"ENI_LB_IP","UsePublicDomain":true}]' \
    --region <Region>
# expected: exit 0, VpcSet[0].Status == "ENABLED"
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

### 步骤 3：使用 TCR 镜像在 TKE Serverless 集群创建工作负载（数据面）

> **需 EKS 集群：** 以下 kubectl 操作依赖已存在的 TKE Serverless（EKS）集群。若尚无可用集群，请先通过 [TKE 控制台](https://console.cloud.tencent.com/tke2/ecluster) 创建，或使用标准 TKE 集群 + TCR 插件方案（参见 [TKE 集群使用 TCR 插件内网免密拉取容器镜像](https://cloud.tencent.com/document/product/1141/48184)）。

#### 3.1 创建 imagePullSecret

TKE Serverless 集群**不支持** TCR 插件免密拉取，必须手动创建 `imagePullSecret`：

```bash
kubectl create secret docker-registry image-pull-secret \
    --docker-server=REGISTRY_NAME.tencentcloudcr.com \
    --docker-username=USERNAME \
    --docker-password=TOKEN \
    --namespace=K8S_NAMESPACE
```

**预期输出**：

```text
secret/image-pull-secret created
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `REGISTRY_NAME` | TCR 实例名称 | 步骤 1.1 `DescribeInstances` 返回的 `RegistryName` |
| `USERNAME` | 访问凭证用户名 | 步骤 1.4 `CreateInstanceToken` 返回的 `Username` |
| `TOKEN` | 访问凭证 Token | 步骤 1.4 `CreateInstanceToken` 返回的 `Token` |
| `K8S_NAMESPACE` | K8s 命名空间 | 自定义或使用已有 K8s 命名空间 |

验证 Secret 已创建：

```bash
kubectl get secret image-pull-secret -n K8S_NAMESPACE -o yaml
# expected: .data 字段含 .dockerconfigjson，非空
```

#### 3.2 创建引用 TCR 镜像的工作负载

创建 Deployment 清单 `eks-deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: DEPLOYMENT_NAME
  namespace: K8S_NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: APP_NAME
  template:
    metadata:
      labels:
        app: APP_NAME
    spec:
      imagePullSecrets:
      - name: image-pull-secret
      containers:
      - name: CONTAINER_NAME
        image: REGISTRY_NAME.tencentcloudcr.com/NAMESPACE_NAME/REPO_NAME:TAG
        ports:
        - containerPort: 80
```

```bash
kubectl apply -f eks-deployment.yaml
```

**预期输出**：

```text
deployment.apps/DEPLOYMENT_NAME created
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `DEPLOYMENT_NAME` | Deployment 名称 | 自定义 |
| `K8S_NAMESPACE` | K8s 命名空间 | 与步骤 3.1 一致 |
| `APP_NAME` | 应用标签名 | 自定义，如 `nginx` |
| `CONTAINER_NAME` | 容器名 | 自定义，如 `nginx` |
| `REGISTRY_NAME` | TCR 实例名称 | 步骤 1.1 `DescribeInstances` 返回 |
| `NAMESPACE_NAME` | TCR 命名空间 | 步骤 1.2 创建的命名空间 |
| `REPO_NAME` | TCR 仓库名 | 步骤 1.3 创建的仓库名 |
| `TAG` | 镜像标签 | 与 docker push 使用的标签一致 |

> **关键提醒：** `spec.template.spec.imagePullSecrets` 在 TKE Serverless 中必须显式配置。Serverless 集群不支持 TCR 插件自动注入，若遗漏此字段 Pod 将因鉴权失败而 `ImagePullBackOff`。

#### 3.3 验证工作负载状态

```bash
kubectl get pods -n K8S_NAMESPACE -l app=APP_NAME
# expected: STATUS Running, READY 1/1
```

**预期输出**：

```text
NAME                            READY   STATUS    RESTARTS   AGE
DEPLOYMENT_NAME-xxxxxxxxxx-xxxxx   1/1     Running   0          30s
```

```bash
kubectl describe pod -n K8S_NAMESPACE -l app=APP_NAME
```

确认 Events 中无 `Failed to pull image`、`ImagePullBackOff` 或 `ErrImagePull` 错误。

## 验证

### 控制面（tccli）

```bash
# TCR 实例已就绪
tccli tcr DescribeInstances \
    --Registryids '["REGISTRY_ID"]' \
    --region <Region>
# expected: exit 0, Registries[0].Status == "Running"
```

```bash
# 命名空间已创建
tccli tcr DescribeNamespaces \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, NamespaceList 包含 NAMESPACE_NAME
```

```bash
# 访问凭证已就绪
tccli tcr DescribeInstanceToken \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, Tokens 列表含目标凭证且 Enabled == true
```

```bash
# 内网访问链路已就绪
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, AccessVpcSet 包含目标 VPC，Status == "Running"
```

```bash
# 内网 DNS 已就绪
tccli tcr DescribeInternalEndpointDnsStatus \
    --VpcSet '[{"InstanceId":"REGISTRY_ID","VpcId":"VPC_ID","EniLBIp":"ENI_LB_IP","UsePublicDomain":true}]' \
    --region <Region>
# expected: exit 0, VpcSet[0].Status == "ENABLED"
```

### 数据面（kubectl / docker）

```bash
# 确认 Secret 存在
kubectl get secret image-pull-secret -n K8S_NAMESPACE -o yaml
# expected: .data 含 .dockerconfigjson
```

```bash
# 确认 Pod 运行正常
kubectl get pods -n K8S_NAMESPACE -l app=APP_NAME
# expected: STATUS Running, READY 1/1
```

```bash
# 确认镜像可拉取（在可访问 TCR 的客户端上）
docker pull REGISTRY_NAME.tencentcloudcr.com/NAMESPACE_NAME/REPO_NAME:TAG
# expected: 拉取成功，返回 Downloaded
```

## 清理

> **计费警告**：TKE Serverless Pod 按 vCPU/内存按秒计费，删除工作负载后停止计费。TCR 企业版实例按规格持续收费，若不再使用请参考[销毁企业版实例](../../ops/instances/delete)释放。

### 数据面（kubectl）

数据面资源需在控制面资源之前清理。

**删除工作负载：**

> **副作用警告**：`kubectl delete deployment` 会级联删除该 Deployment 管理的所有 Pod。若为生产环境，请确保已迁移流量或做好备份。

清理前确认：

```bash
kubectl get deployment DEPLOYMENT_NAME -n K8S_NAMESPACE
# expected: 确认 Deployment 存在且为待删目标
```

```bash
kubectl delete deployment DEPLOYMENT_NAME -n K8S_NAMESPACE
```

**预期输出**：

```text
deployment.apps "DEPLOYMENT_NAME" deleted
```

验证已删除：

```bash
kubectl get deployment DEPLOYMENT_NAME -n K8S_NAMESPACE
# expected: Error from server (NotFound)
```

**删除 imagePullSecret：**

> **副作用警告**：删除 Secret 后，任何引用此 Secret 的 Deployment 在 Pod 重启或重新调度时将因鉴权失败而 `ImagePullBackOff`。请确保已先删除所有引用此 Secret 的工作负载。

清理前确认：

```bash
kubectl get secret image-pull-secret -n K8S_NAMESPACE
# expected: 确认 Secret 存在且为待删目标
```

```bash
kubectl delete secret image-pull-secret -n K8S_NAMESPACE
```

**预期输出**：

```text
secret "image-pull-secret" deleted
```

验证已删除：

```bash
kubectl get secret image-pull-secret -n K8S_NAMESPACE
# expected: Error from server (NotFound)
```

**登出 TCR（如有 docker 登录）：**

```bash
docker logout REGISTRY_NAME.tencentcloudcr.com
```

### 控制面（tccli）

**删除内网访问链路：**

> **副作用警告**：删除内网访问链路后，VPC 内所有服务将无法通过内网访问 TCR 实例。关联的内网 DNS 解析记录也将失效。若集群中仍有运行中的工作负载依赖此链路拉取镜像，Pod 重启后将出现 `ImagePullBackOff`。

清理前确认链路存在：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, 确认 AccessVpcSet 包含目标 VPC
```

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

**预期输出**：

```json
{
    "RegistryId": "REGISTRY_ID",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

验证已删除：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, AccessVpcSet 为 null 或 TotalCount == 0
```

**预期输出**：

```json
{
    "AccessVpcSet": null,
    "TotalCount": 0,
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**删除访问凭证（可选，若仅需清理凭证而保留命名空间和仓库）：**

> **副作用警告**：删除凭证后，所有依赖此凭证的 `imagePullSecret` 将立即失效，对应工作负载在重启或重新调度时将出现 `ImagePullBackOff`。请确保已先删除所有引用此凭证的工作负载和 Secret。

清理前确认凭证存在：

```bash
tccli tcr DescribeInstanceToken \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, 记录待删凭证的 TokenId
```

```bash
tccli tcr DeleteInstanceToken \
    --RegistryId REGISTRY_ID \
    --TokenId TOKEN_ID \
    --region <Region>
# expected: exit 0
```

验证已删除：

```bash
tccli tcr DescribeInstanceToken \
    --RegistryId REGISTRY_ID \
    --region <Region>
# expected: exit 0, Tokens 列表中不再包含已删凭证
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ManageInternalEndpoint` 报 `LimitExceeded` | `tccli vpc DescribeVpcs --region <Region>` 统计已有 VPC 数量 | 账号 VPC 配额已满，无法添加新 VPC 关联 | 此为环境限制，非命令错误。清理不再使用的 VPC 后重试：`tccli vpc DeleteVpc --VpcId VPC_ID`；或改用已有 VPC 关联 |
| `ManageInternalEndpoint` 报 `FailedOperation` | `tccli vpc DescribeVpcs --VpcIds '["VPC_ID"]' --region <Region>` 和 `tccli vpc DescribeSubnets --SubnetIds '["SUBNET_ID"]' --region <Region>` 确认 VPC 和子网均存在 | VPC ID 或子网 ID 不存在 / 不可用 / 子网 IP 耗尽 | 修正 `VpcId` 和 `SubnetId` 为有效值，确保子网有空闲 IP |
| `CreateInternalEndpointDns` 报 `InvalidParameter` | `tccli tcr DescribeInternalEndpoints --RegistryId REGISTRY_ID --region <Region>` 确认 `AccessIp` 与返回值一致 | `EniLBIp` 填写错误或 `RegionName` 与实例地域不一致 | 从 `DescribeInternalEndpoints` 返回的 `AccessVpcSet[0].AccessIp` 获取 IP 值，填入 `EniLBIp` 参数；`RegionName` 与 `--region` 保持一致 |
| docker push 报 `unauthorized` | `tccli tcr DescribeInstanceToken --RegistryId REGISTRY_ID --region <Region>` 确认凭证 `Enabled == true` | 未登录或凭证过期/无效 | `tccli tcr CreateInstanceToken --RegistryId REGISTRY_ID --TokenType longterm --Desc "push-token" --region <Region>` 生成新凭证后 `docker login` 重新登录 |
| `VPC LimitExceeded` 且无法释放 VPC | `tccli vpc DescribeVpcs --region <Region>` 确认所有 VPC 均为生产在用 | 当前账号 VPC 配额已达上限且无可用 VPC 可释放 | 此为**环境限制**（非命令错误）。联系售后提升配额，或改用公网入口：`ManageExternalEndpoint` + `CreateSecurityPolicy` |
| `CamNoAuth` 或权限拒绝 | `tccli tcr DescribeInstances --region <Region>` 确认当前凭证有 TCR 读权限 | 子账号缺少所需 CAM 权限 | 此为环境限制，非命令错误。授予 `QcloudTCRFullAccess` 预设策略，或参考[企业版授权方案示例](https://cloud.tencent.com/document/product/1141/41417) |

### 创建成功但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| Pod 报 `ImagePullBackOff` | `kubectl get secret image-pull-secret -n K8S_NAMESPACE` 确认 Secret 存在；`kubectl describe deployment DEPLOYMENT_NAME -n K8S_NAMESPACE` 检查 `spec.template.spec.imagePullSecrets`；`tccli tcr DescribeInstanceToken --RegistryId REGISTRY_ID --region <Region>` 确认凭证 `Enabled == true` | 未配置 `imagePullSecret` 或凭证无效/过期 | 确保 Secret 存在且 Deployment 的 `imagePullSecrets` 引用正确；若凭证过期，重新创建凭证并更新 Secret |
| Pod 报 `ErrImagePull` | `tccli tcr DescribeRepositories --RegistryId REGISTRY_ID --NamespaceName NAMESPACE_NAME --region <Region>` 确认仓库存在 | 镜像地址格式错误或仓库/镜像不存在 | 确认格式：`REGISTRY_NAME.tencentcloudcr.com/NAMESPACE_NAME/REPO_NAME:TAG`；检查命名空间、仓库名和 Tag 均正确 |
| 内网 DNS 解析状态非 `ENABLED` | `tccli tcr DescribeInternalEndpointDnsStatus --VpcSet '[{"InstanceId":"REGISTRY_ID","VpcId":"VPC_ID","EniLBIp":"ENI_LB_IP","UsePublicDomain":true}]' --region <Region>` 查看详细状态 | DNS 配置参数错误（`EniLBIp` 不匹配）或 VPC 内 DNS 服务未就绪 | 对比 `EniLBIp` 与 `DescribeInternalEndpoints` 返回的 `AccessVpcSet[0].AccessIp` 是否一致；等待 1-2 分钟后重试，若持续非 `ENABLED` 联系售后 |
| `DescribeInternalEndpoints` 返回 `TotalCount: 0` | `tccli tcr DescribeInternalEndpoints --RegistryId REGISTRY_ID --region <Region>` 确认返回值 | 尚未创建任何内网访问链路 | 执行步骤 2.2 `ManageInternalEndpoint`（需 VPC 配额充足） |
| `CreateInstanceToken` 返回的 `Token` 丢失 | 无（Token 仅返回一次，API 不可恢复） | 创建时未妥善保存 Token 值 | `tccli tcr DeleteInstanceToken --RegistryId REGISTRY_ID --TokenId TOKEN_ID --region <Region>` 删除旧凭证后重新 `CreateInstanceToken`，并立即保存 Token 值 |
| 工作负载正常运行但重启后 `ImagePullBackOff` | `tccli tcr DescribeInstanceToken --RegistryId REGISTRY_ID --region <Region>` 确认凭证 `Enabled == true` | 凭证被删除或禁用，Secret 中的旧 Token 不再有效 | 重新创建凭证并更新 `imagePullSecret`：`kubectl delete secret image-pull-secret -n K8S_NAMESPACE` 后 `kubectl create secret docker-registry` 使用新 Token |

## 下一步

- [TKE 集群使用 TCR 插件内网免密拉取容器镜像](https://cloud.tencent.com/document/product/1141/48184) — 标准 TKE 集群免密方案（page_id `48184`）
- [从自建 Harbor 同步镜像到 TCR 企业版](../harbor-migration) — 迁移镜像至 TCR（page_id `44970`）
- [配置内网访问控制](../../ops/access/network/private-access) — VPC 内网访问策略管理
- [配置公网访问控制](../../ops/access/network/public-access) — 公网白名单管理（`CreateSecurityPolicy` / `DeleteSecurityPolicy`）
- [企业版快速入门](../../quickstart/enterprise) — TCR 完整操作流程

## 控制台替代

[容器服务控制台 → Serverless 集群 → 工作负载 → Deployment → 新建](https://console.cloud.tencent.com/tke2/cluster)：在"实例内容器"中选择"容器镜像服务 企业版"，浏览选择地域、实例和仓库，手动填写镜像访问凭证。控制台为 UI 交互式配置，不生成可复用 CLI 命令。
