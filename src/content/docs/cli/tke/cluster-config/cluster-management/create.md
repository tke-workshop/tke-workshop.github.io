---
title: "创建集群"
description: "· page_id `103981` · tccli ≥3.1.107 · API 2018-05-25"
---

> 对照官方：[创建集群](https://cloud.tencent.com/document/product/457/103981) · page_id `103981` · tccli ≥3.1.107 · API 2018-05-25

## 概述

通过 `CreateCluster` API 创建 TKE 标准集群。集群创建后**不包含工作节点**（`ClusterNodeNum=0`），节点通过节点池后续添加。创建集群属异步操作，需轮询直至状态为 `Running`。

| 维度 | 托管集群 | 独立集群 |
|------|---------|---------|
| `ClusterType` 枚举 | `MANAGED_CLUSTER` | `INDEPENDENT_CLUSTER` |
| 控制面归属 | 腾讯云运维 | 用户自购 CVM 部署 |
| Master/Etcd 管理 | 自动运维，不可修改 | 用户自行管理 |
| 运行时 | 强制 `containerd` | 可选 `containerd` / `docker` |
| 新集群支持 | 活跃支持 | **已停止新建** |

**建议：新集群一律选托管集群（`MANAGED_CLUSTER`）。**

## 前置条件

- [环境准备](../../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置

# 3. 检查 CAM 权限
#    需要: tke:CreateCluster, tke:DescribeClusters, tke:DescribeVersions,
#          tke:CreateClusterEndpoint, tke:DescribeClusterEndpoints,
#          tke:DescribeClusterKubeconfig, tke:DescribeClusterSecurity,
#          tke:DescribeClusterStatus, tke:DescribeClusterEndpointStatus,
#          tke:DescribeClusterLevelAttribute, tke:DeleteCluster,
#          vpc:DescribeVpcs, vpc:DescribeSubnets, vpc:DescribeVpcLimits,
#          vpc:CreateSecurityGroup, vpc:CreateSecurityGroupPolicies,
#          vpc:DeleteSecurityGroup
tccli tke DescribeClusters --region <Region>
# expected: exit 0
tccli vpc DescribeVpcs --region <Region>
# expected: exit 0
```

### 资源检查

```bash
# 4. 查询可用 K8s 版本
tccli tke DescribeVersions --region <Region>
# expected: TotalCount >= 1，推荐 ≥ 1.30.0
```

**预期输出**：

```json
{
    "TotalCount": 14,
    "VersionInstanceSet": [
        {"Name": "k8s", "Version": "1.10.5", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.12.4", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.14.3", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.14.3-tk8s", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.16.3", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.18.4", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.20.6", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.22.5", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.24.4", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.26.1", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.28.3", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.30.0", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.32.2", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"},
        {"Name": "k8s", "Version": "1.34.1", "Remark": "SUITABLE_FOR_INDEPENDENT_CLUSTER"}
    ]
}
```

```bash
# 5. 查询集群级别（规格与配额）
tccli tke DescribeClusterLevelAttribute --region <Region>
# expected: TotalCount >= 1
```

**预期输出**：

```json
{
    "TotalCount": 9,
    "Items": [
        {"Name": "5节点", "Alias": "L5", "NodeCount": 5, "PodCount": 150, "ConfigMapCount": 128, "RSCount": 900, "CRDCount": 150, "Enable": true},
        {"Name": "20节点", "Alias": "L20", "NodeCount": 20, "PodCount": 600, "ConfigMapCount": 256, "RSCount": 3600, "CRDCount": 600, "Enable": true},
        {"Name": "50节点", "Alias": "L50", "NodeCount": 50, "PodCount": 1500, "ConfigMapCount": 512, "RSCount": 7500, "CRDCount": 1250, "Enable": true},
        {"Name": "100节点", "Alias": "L100", "NodeCount": 100, "PodCount": 3000, "ConfigMapCount": 1024, "RSCount": 15000, "CRDCount": 2500, "Enable": true},
        {"Name": "200节点", "Alias": "L200", "NodeCount": 200, "PodCount": 6000, "ConfigMapCount": 2048, "RSCount": 30000, "CRDCount": 5000, "Enable": true},
        {"Name": "500节点", "Alias": "L500", "NodeCount": 500, "PodCount": 15000, "ConfigMapCount": 4096, "RSCount": 60000, "CRDCount": 10000, "Enable": true},
        {"Name": "1000节点", "Alias": "L1000", "NodeCount": 1000, "PodCount": 30000, "ConfigMapCount": 6144, "RSCount": 120000, "CRDCount": 20000, "Enable": true},
        {"Name": "3000节点", "Alias": "L3000", "NodeCount": 3000, "PodCount": 90000, "ConfigMapCount": 8192, "RSCount": 300000, "CRDCount": 50000, "Enable": true},
        {"Name": "5000节点", "Alias": "L5000", "NodeCount": 5000, "PodCount": 150000, "ConfigMapCount": 10240, "RSCount": 600000, "CRDCount": 100000, "Enable": true}
    ]
}
```

```bash
# 6. 查询 VPC 和子网
tccli vpc DescribeVpcs --region <Region> \
    --Filters '[{"Name":"vpc-name","Values":["<VpcNameFilter>"]}]'
# expected: 至少返回 1 个 VPC，记录 VpcId

tccli vpc DescribeSubnets --region <Region> \
    --Filters '[{"Name":"vpc-id","Values":["<VpcId>"]}]'
# expected: 至少 1 个子网，AvailableIpAddressCount >= 3

# 7. 检查 VPC 配额
tccli vpc DescribeVpcLimits --region <Region> \
    --LimitTypes '["appid-max-vpcs"]'
# expected: 已用量 < 总量
```

**查询 VPC 预期输出**：

```json
{
    "TotalCount": 1,
    "VpcSet": [
        {
            "VpcId": "vpc-example",
            "VpcName": "<VpcName>",
            "CidrBlock": "172.16.0.0/12",
            "IsDefault": false,
            "EnableMulticast": false,
            "DnsServerSet": ["183.60.83.19", "183.60.82.98"],
            "EnableDhcp": true,
            "AssistantCidrSet": []
        }
    ]
}
```

**查询子网预期输出**：

```json
{
    "TotalCount": 1,
    "SubnetSet": [
        {
            "VpcId": "vpc-example",
            "SubnetId": "subnet-example",
            "SubnetName": "<SubnetName>",
            "CidrBlock": "172.24.0.0/20",
            "Zone": "ap-guangzhou-3",
            "AvailableIpAddressCount": 4087,
            "TotalIpAddressCount": 4093
        }
    ]
}
```

上述示例中 VPC CIDR 为 `172.16.0.0/12`，子网 CIDR 为 `172.24.0.0/20`。创建集群时 `ClusterCIDR` 和 `ServiceCIDR` **必须与 VPC CIDR 及辅助 CIDR 不重叠**。

## 关键字段说明

以下说明 `CreateCluster` 的主要参数。完整参数定义见 `tccli tke CreateCluster help --detail`。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `ClusterType` | String | 是 | `MANAGED_CLUSTER`（托管）或 `INDEPENDENT_CLUSTER`（独立，已停止新建） | 填 `GR` 等控制台概念名 → `InvalidParameter.ClusterType` |
| `ClusterBasicSettings.ClusterVersion` | String | 是 | 如 `1.30.0`。通过 `DescribeVersions` 查询可用版本 | 版本不存在 → `InvalidParameter.ClusterVersion` |
| `ClusterBasicSettings.ClusterName` | String | 是 | 长度 1-60 字符，以字母开头 | 格式不合法 → 参数校验失败 |
| `ClusterBasicSettings.VpcId` | String | 是 | 已存在的 VPC ID，格式 `vpc-xxxxxxxx` | VPC 不存在 → `InvalidParameter.VpcId` |
| `ClusterBasicSettings.SubnetId` | String | 是 | 已存在且属于上述 VPC 的子网 ID | 子网不存在 → `InvalidParameter.SubnetId` |
| `ClusterBasicSettings.ClusterLevel` | String | 否 | `L5`~`L5000`，决定 Pod/ConfigMap/CRD 配额上限 | 级别超配额 → `LimitExceeded` |
| `ClusterCIDRSettings.ClusterCIDR` | String | 是 | Pod IP 范围，如 `10.200.0.0/16`，不与 VPC CIDR、辅助 CIDR、已有集群 CIDR 重叠 | CIDR 冲突 → `InvalidParameter.ClusterCIDRSettings` |
| `ClusterCIDRSettings.ServiceCIDR` | String | 是 | Service IP 范围，**掩码必须 17-27**。如 `/20`（4096 个 Service IP） | `/16` 等越界 → `InvalidParameter.CidrMaskSizeOutOfRange` |
| `ClusterCIDRSettings.MaxNodePodNum` | Integer | 否 | 默认 64，上限 256 | 超出范围 → 参数校验失败 |
| `ClusterCIDRSettings.MaxClusterServiceNum` | Integer | 否 | 须与 ServiceCIDR 掩码匹配：`/20`→4096, `/24`→256, `/17`→32768 | 不匹配 → 参数校验失败 |
| `ClusterAdvancedSettings.ContainerRuntime` | String | 否 | `containerd`（推荐，托管集群强制） | 托管集群填 `docker` → 参数校验失败 |
| `ClusterAdvancedSettings.RuntimeVersion` | String | 否 | 如 `1.6.9`。托管集群自动选择，通常无需指定 | 版本不可用 → 参数校验失败 |
| `ClusterAdvancedSettings.DeletionProtection` | Boolean | 否 | 默认 `false`。生产环境建议 `true` | 忘开 → 可能误删生产集群 |

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查询可用 K8s 版本 | `DescribeVersions` | 是 |
| 查询集群级别规格 | `DescribeClusterLevelAttribute` | 是 |
| 查询 VPC 和子网 | `DescribeVpcs` / `DescribeSubnets` | 是 |
| 创建安全组 | `CreateSecurityGroup` | 否 |
| 添加安全组规则 | `CreateSecurityGroupPolicies` | 否 |
| 创建托管集群 | `CreateCluster` | 否 |
| 查看集群详情 | `DescribeClusters` | 是 |
| 查看集群状态 | `DescribeClusterStatus` | 是 |
| 创建内网访问端点 | `CreateClusterEndpoint` | 否 |
| 轮询端点状态 | `DescribeClusterEndpointStatus` | 是 |
| 查看访问端点 | `DescribeClusterEndpoints` | 是 |
| 获取 kubeconfig（证书） | `DescribeClusterKubeconfig` | 是 |
| 获取 kubeconfig（token） | `DescribeClusterSecurity` | 是 |
| 删除集群 | `DeleteCluster` | 否 |

## 操作步骤

### 步骤 1：选择集群参数

#### 选择依据

- **集群类型**：选择 `MANAGED_CLUSTER`（托管集群）。托管集群控制面由腾讯云运维，无需自行管理 Master 节点。独立集群（`INDEPENDENT_CLUSTER`）需自行购买 CVM 部署 Master 节点，且已停止新建。新集群一律选托管。常见错误：填控制台概念名 `GR` 而非 API 枚举 `MANAGED_CLUSTER` → `InvalidParameter.ClusterType`。
- **K8s 版本**：推荐 `1.30.0`（当前 LTS 长期支持版本，稳定可用）。可通过 `tccli tke DescribeVersions --region <Region>` 查询最新可用版本。
- **运行时**：选 `containerd`。Docker 运行时已停止维护，K8s 1.24+ 移除 dockershim。托管集群强制使用 containerd。
- **集群规格**：选 `L5`（最小规格，5 节点/150 Pod）。生产环境按需选择更高规格（`L20`~`L5000`）。
- **CIDR 规划**：`ClusterCIDR` 选用 `10.200.0.0/16`，`ServiceCIDR` 选用 `10.201.0.0/20`。**必须与 VPC CIDR（本例 `172.16.0.0/12`）、VPC 辅助 CIDR、已有集群 CIDR 不重叠**。ServiceCIDR 掩码必须在 17-27 之间，`MaxClusterServiceNum` 须与掩码匹配（`/20` → 4096）。CIDR 计算公式：`MaxClusterServiceNum = 2^(32-掩码)-2`。
- **空集群模式**：先创建空集群（`ClusterNodeNum=0`），验证控制面和网络配置正确。节点通过节点池后续添加（见"节点管理"章节）。空集群节点数为 0 是预期行为。

**版本确认**：

```bash
tccli tke DescribeVersions --region <Region> \
    | jq '.VersionInstanceSet[] | select(.Version >= "1.30")'
# expected: 返回 1.30.0、1.32.2、1.34.1
```

**CIDR 冲突检查**：

```bash
# 检查现有集群 CIDR 避免冲突
tccli tke DescribeClusters --region <Region> \
    | jq '.Clusters[].ClusterNetworkSettings | {ClusterCIDR, ServiceCIDR}'
# expected: 列出所有现有 CIDR，确认新 CIDR 不重叠
```

> **注意**：如果 VPC 配置了辅助 CIDR（如 `10.0.0.0/16`、`10.1.0.0/20`），这些网段也不可用于集群 CIDR。通过 `tccli vpc DescribeVpcs --region <Region> --VpcIds '["<VpcId>"]'` 查看 `AssistantCidrSet` 字段确认。

### 步骤 2：最小创建（空集群，只含必填字段）

`cluster-minimal.json`：

```json
{
  "ClusterType": "MANAGED_CLUSTER",
  "ClusterBasicSettings": {
    "ClusterName": "<ClusterName>",
    "ClusterVersion": "1.30.0",
    "VpcId": "<VpcId>",
    "SubnetId": "<SubnetId>",
    "ClusterLevel": "L5"
  },
  "ClusterCIDRSettings": {
    "ClusterCIDR": "10.200.0.0/16",
    "MaxNodePodNum": 64,
    "MaxClusterServiceNum": 4096,
    "ServiceCIDR": "10.201.0.0/20"
  }
}
```

```bash
tccli tke CreateCluster --region <Region> \
    --cli-input-json file://cluster-minimal.json
# expected: exit 0，返回 ClusterId
```

**预期输出**：

```json
{
    "ClusterId": "cls-example",
    "RequestId": "..."
}
```

### 步骤 3：增强配置

`cluster-enhanced.json`：

```json
{
  "ClusterType": "MANAGED_CLUSTER",
  "ClusterBasicSettings": {
    "ClusterName": "<ClusterName>",
    "ClusterVersion": "1.30.0",
    "VpcId": "<VpcId>",
    "SubnetId": "<SubnetId>",
    "ClusterLevel": "L5",
    "ClusterDescription": "<ClusterDescription>",
    "TagSpecification": [
      {
        "ResourceType": "cluster",
        "Tags": [
          {"Key": "env", "Value": "production"}
        ]
      }
    ]
  },
  "ClusterCIDRSettings": {
    "ClusterCIDR": "10.200.0.0/16",
    "MaxNodePodNum": 64,
    "MaxClusterServiceNum": 4096,
    "ServiceCIDR": "10.201.0.0/20"
  },
  "ClusterAdvancedSettings": {
    "ContainerRuntime": "containerd",
    "RuntimeVersion": "1.6.9",
    "DeletionProtection": true,
    "AuditEnabled": true
  }
}
```

```bash
tccli tke CreateCluster --region <Region> \
    --cli-input-json file://cluster-enhanced.json
# expected: exit 0，返回 ClusterId，集群异步创建中
```

**预期输出**：

```json
{
    "ClusterId": "cls-example",
    "RequestId": "..."
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<ClusterName>` | 集群名称 | 长度 1-60 字符，字母开头 | 自定义 |
| `<VpcId>` | VPC ID | 格式 `vpc-xxxxxxxx` | `tccli vpc DescribeVpcs --region <Region>` |
| `<SubnetId>` | 子网 ID | 需属于上述 VPC，有可用 IP | `tccli vpc DescribeSubnets --region <Region>` |
| `<Region>` | 地域 | 如 `ap-guangzhou` | `tccli configure list` |
| `<ClusterDescription>` | 集群描述 | 可选，长度 ≤ 256 | 自定义 |

| 层级 | 包含内容 | 目的 |
|------|---------|------|
| **最小创建** | ClusterType, ClusterName, ClusterVersion, VpcId, SubnetId, ClusterLevel, ClusterCIDR, ServiceCIDR | 验证控制面和网络配置 |
| **增强配置** | 最小创建全部字段 + Description, TagSpecification, ContainerRuntime, RuntimeVersion, DeletionProtection, AuditEnabled | 生产环境推荐配置 |

### 步骤 4：创建安全组并放行 kubectl 访问

集群创建后，在创建访问端点之前需准备安全组。以下是自建安全组的完整流程：

`sg-create.json`：

```json
{
  "GroupName": "<SgName>",
  "GroupDescription": "<SgDescription>"
}
```

```bash
tccli vpc CreateSecurityGroup --region <Region> \
    --cli-input-json file://sg-create.json
# expected: exit 0，返回 SecurityGroupId
```

**预期输出**：

```json
{
    "SecurityGroup": {
        "SecurityGroupId": "sg-example",
        "SecurityGroupName": "<SgName>"
    },
    "RequestId": "..."
}
```

`sg-policy.json`：

```json
{
  "SecurityGroupId": "<SecurityGroupId>",
  "SecurityGroupPolicySet": {
    "Ingress": [
      {
        "Protocol": "TCP",
        "Port": "443",
        "CidrBlock": "0.0.0.0/0",
        "Action": "ACCEPT",
        "PolicyDescription": "kubectl access"
      }
    ]
  }
}
```

```bash
tccli vpc CreateSecurityGroupPolicies --region <Region> \
    --cli-input-json file://sg-policy.json
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "..."
}
```

### 步骤 5：创建内网访问端点

集群就绪后，创建内网访问端点以获取 kubectl 访问能力。

> **为什么选内网端点**：公网端点（`--IsExtranet true`）可能被组织级 CAM 策略拒绝（条件 `tke:clusterExtranetEndpoint=true`）。内网端点（`--IsExtranet false`）通过 VPC 内部 IP 访问，需要同 VPC CVM 或 IOA/VPN/专线连接。

`endpoint-internal.json`：

```json
{
  "ClusterId": "<ClusterId>",
  "SubnetId": "<SubnetId>",
  "IsExtranet": false,
  "SecurityGroup": "<SecurityGroupId>"
}
```

```bash
tccli tke CreateClusterEndpoint --region <Region> \
    --cli-input-json file://endpoint-internal.json
# expected: exit 0，返回 RequestId。端点异步创建中
```

**预期输出**：

```json
{
    "RequestId": "..."
}
```

端点创建是异步操作。轮询直至状态为 `Created`：

```bash
tccli tke DescribeClusterEndpointStatus --region <Region> \
    --ClusterId <ClusterId> \
    --IsExtranet false
# expected: exit 0，Status: "Created"
```

**预期输出**：

```json
{
    "Status": "Created",
    "ErrorMsg": ""
}
```

> **注意**：端点创建约需 30-60 秒。如果 `Status` 为 `Creating`，等待后重新轮询。

### 步骤 6：获取访问端点信息

```bash
tccli tke DescribeClusterEndpoints --region <Region> \
    --ClusterId <ClusterId>
# expected: exit 0，返回内网端点 IP 和域名
```

**预期输出**：

```json
{
    "CertificationAuthority": "(CA证书内容)",
    "ClusterExternalEndpoint": "",
    "ClusterIntranetEndpoint": "172.24.0.16",
    "ClusterDomain": "cls-example.ccs.tencent-cloud.com",
    "ClusterExternalACL": null,
    "ClusterExternalDomain": "cls-example.ccs.tencent-cloud.com",
    "ClusterIntranetDomain": "",
    "SecurityGroup": "",
    "ClusterIntranetSubnetId": "subnet-example",
    "IntranetSecurityGroup": "sg-example"
}
```

### 步骤 7：获取 kubeconfig（token 型，推荐）

`DescribeClusterSecurity` 返回含 `token` 的 kubeconfig，比证书型（`DescribeClusterKubeconfig`）更便于 kubectl 使用：

```bash
tccli tke DescribeClusterSecurity --region <Region> \
    --ClusterId <ClusterId>
# expected: exit 0，返回 Kubeconfig 含 token
```

**预期输出**：

```json
{
    "UserName": "admin",
    "Password": "...",
    "CertificationAuthority": "(CA证书内容)",
    "ClusterExternalEndpoint": "",
    "Domain": "cls-example.ccs.tencent-cloud.com",
    "PgwEndpoint": "",
    "SecurityPolicy": null,
    "Kubeconfig": "apiVersion: v1\nclusters:\n- cluster:\n    certificate-authority-data: ...\n    server: https://cls-example.ccs.tencent-cloud.com\n...\nusers:\n- name: cls-example-admin\n  user:\n    token: <token>\n",
    "JnsGwEndpoint": null
}
```

```bash
# 写入 kubeconfig
tccli tke DescribeClusterSecurity --region <Region> --ClusterId <ClusterId> \
    | jq -r '.Kubeconfig' > ~/.kube/config
# expected: exit 0，kubeconfig 写入成功
```

> **注意**：内网端点 IP `172.24.0.16` 仅限 VPC 内部访问。本地机器 `kubectl` 不可直连，需在同 VPC CVM 或通过 IOA/VPN/专线执行 `kubectl` 命令。备选方案：将 kubeconfig 上传至同 VPC CVM，在 CVM 上执行 `kubectl` 操作。

## 验证

集群创建是异步操作，耗时约 10-15 分钟。轮询直到状态为 `Running`：

### 控制面（tccli）

```bash
tccli tke DescribeClusters --region <Region> \
    --ClusterIds '["<ClusterId>"]'
# expected: exit 0，ClusterStatus: "Running"
```

**预期输出**（集群就绪后）：

```json
{
    "TotalCount": 1,
    "Clusters": [
        {
            "ClusterId": "cls-example",
            "ClusterName": "<ClusterName>",
            "ClusterDescription": "",
            "ClusterVersion": "1.30.0",
            "ClusterOs": "ubuntu16.04.1 LTSx86_64",
            "ClusterType": "MANAGED_CLUSTER",
            "ClusterNetworkSettings": {
                "ClusterCIDR": "10.200.0.0/16",
                "IgnoreClusterCIDRConflict": false,
                "MaxNodePodNum": 64,
                "MaxClusterServiceNum": 4096,
                "Ipvs": false,
                "VpcId": "vpc-example",
                "Cni": true,
                "KubeProxyMode": "",
                "ServiceCIDR": "10.201.0.0/20",
                "Subnets": null,
                "IgnoreServiceCIDRConflict": false,
                "IsDualStack": false,
                "Ipv6ServiceCIDR": "",
                "CiliumMode": "",
                "SubnetId": "subnet-example",
                "DataPlaneV2": false
            },
            "ClusterNodeNum": 0,
            "ProjectId": 0,
            "ClusterStatus": "Running",
            "ClusterMaterNodeNum": 1,
            "ImageId": "",
            "OsCustomizeType": "",
            "ContainerRuntime": "containerd",
            "CreatedTime": "2026-06-23T05:24:09Z",
            "DeletionProtection": true,
            "EnableExternalNode": false,
            "ClusterLevel": "L5",
            "AutoUpgradeClusterLevel": false,
            "QGPUShareEnable": false,
            "RuntimeVersion": "1.6.9",
            "ClusterEtcdNodeNum": 0,
            "CdcId": "",
            "IsHighAvailability": true,
            "ClusterCategory": null,
            "SecurityModeConfig": {
                "Enabled": false,
                "Namespaces": null,
                "Labels": null
            }
        }
    ]
}
```

| 验证维度 | 检查字段 | 预期值 |
|---------|---------|------|
| 集群状态 | `ClusterStatus` | `Running` |
| 网络 | `ClusterCIDR` + `ServiceCIDR` | `10.200.0.0/16` / `10.201.0.0/20` |
| 运行时 | `ContainerRuntime` + `RuntimeVersion` | `containerd` / `1.6.9` |
| 删除保护 | `DeletionProtection` | `true`（增强配置中开启） |
| 节点数 | `ClusterNodeNum` | `0`（空集群，预期行为） |

集群状态确认：

```bash
tccli tke DescribeClusterStatus --region <Region> \
    --ClusterIds '["<ClusterId>"]'
# expected: exit 0，ClusterState: "Running"
```

**预期输出**：

```json
{
    "ClusterStatusSet": [
        {
            "ClusterId": "cls-example",
            "ClusterState": "Running",
            "ClusterInstanceState": "-",
            "ClusterBMonitor": false,
            "ClusterInitNodeNum": 0,
            "ClusterRunningNodeNum": 0,
            "ClusterFailedNodeNum": 0,
            "ClusterClosedNodeNum": 0,
            "ClusterClosingNodeNum": 0,
            "ClusterDeletionProtection": false,
            "ClusterAuditEnabled": false
        }
    ],
    "TotalCount": 1
}
```

### 数据面（kubectl）

> **注意**：以下 kubectl 命令需在**同 VPC 的 CVM** 上执行。内网端点 IP 不可从本地机器直连。

```bash
# 获取 token 型 kubeconfig 并写入（在同 VPC CVM 上执行）
tccli tke DescribeClusterSecurity --region <Region> --ClusterId <ClusterId> \
    | jq -r '.Kubeconfig' > ~/.kube/config
# expected: exit 0

# 验证 kubectl 连通性
kubectl cluster-info
# expected: Kubernetes control plane is running at https://cls-example.ccs.tencent-cloud.com

kubectl get ns
# expected: 返回 default、kube-system 等系统命名空间
```

## 清理

> **警告**：`DeleteCluster` 配合 `InstanceDeleteMode: "terminate"` 会**级联删除**集群关联的所有 CVM 实例及磁盘。删除保护开启时需先关闭。生产环境执行删除前务必先 `DescribeClusters` 确认集群 ID 和名称。空集群（`ClusterNodeNum=0`）无 CVM 可删，但 `terminate` 模式仍会尝试清理关联资源。

安装依赖倒序清理：

```bash
# 1. 清理前状态检查
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# 确认 ClusterId、ClusterName、ClusterNodeNum。确认是要删除的目标集群

# 2. 关闭删除保护（如启用）
tccli tke ModifyClusterAttribute --region <Region> \
    --ClusterId <ClusterId> \
    --DeletionProtection false
# expected: exit 0

# 3. 删除集群
tccli tke DeleteCluster --region <Region> \
    --ClusterId <ClusterId> \
    --InstanceDeleteMode terminate
# ⚠️  --InstanceDeleteMode terminate 会删除所有关联 CVM 节点
# expected: exit 0

# 4. 删除自建安全组
tccli vpc DeleteSecurityGroup --region <Region> \
    --SecurityGroupId <SecurityGroupId>
# expected: exit 0

# 5. 验证已删除
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: ResourceNotFound 或返回空列表
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateCluster` 返回 `InvalidParameter.ClusterType` | 检查请求 JSON 中 `ClusterType` 字段 | 填了控制台概念名（如 `GR`）而非 API 枚举 | 改为 `"MANAGED_CLUSTER"`（托管）或 `"INDEPENDENT_CLUSTER"`（独立）。不要填 `"GR"` |
| `CreateCluster` 返回 `InvalidParameter.CidrMaskSizeOutOfRange` | 检查 ServiceCIDR 掩码 | 掩码不在 17-27 之间。`/16` 会触发此错误 | 改为 `/17` 至 `/27`，如 `/20`。同时调整 `MaxClusterServiceNum` 匹配（`/20`→4096） |
| `CreateCluster` 返回 `InvalidParameter.ClusterCIDRSettings` | `tccli vpc DescribeVpcs --region <Region> --VpcIds '["<VpcId>"]'` 查看 VPC CIDR 和辅助 CIDR。`tccli tke DescribeClusters --region <Region> \| jq '.Clusters[].ClusterNetworkSettings'` 对比现有集群 CIDR | Pod/Service CIDR 与 VPC CIDR、辅助 CIDR 或已有集群 CIDR 重叠 | 修改 `ClusterCIDR` 或 `ServiceCIDR` 为不重叠网段 |
| `CreateCluster` 返回 `InvalidParameter.VpcId` | `DescribeVpcs` 确认 VPC 存在且地域匹配 | VPC ID 不存在或地域不匹配 | 先 `CreateVpc` 或 `DescribeVpcs` 获取已有 VPC ID |
| `CreateCluster` 返回 `InvalidParameter.SubnetId` | `DescribeSubnets` 确认子网存在 | 子网不存在或不属于指定 VPC | 先 `CreateSubnet` 或复用已有子网 |
| `CreateCluster` 参数校验失败（`MaxClusterServiceNum` 与掩码不匹配） | 检查 `MaxClusterServiceNum` vs `ServiceCIDR` 掩码 | 数量与掩码 IP 数量不匹配。计算公式：`2^(32-掩码)-2` | `/20` → `4096`，`/24` → `256`，`/17` → `32768` |
| `CreateClusterEndpoint`（`--IsExtranet true`）返回 `InvalidParameter.Param` | 查看完整错误消息：含 `CAM deny` 和 `strategyId` 字段 | 公网端点被**组织级 CAM 策略**以 `tke:clusterExtranetEndpoint=true` 条件硬拒绝（如 `strategyId:240463971`）。**非安全组问题，是账户级硬策略，自建安全组也无法绕过** | 回退到内网端点：用 `--IsExtranet false` 创建内网端点。内网端点通过 VPC 内部 IP 访问（如 `172.24.0.16`），需通过同 VPC CVM、IOA、VPN 或专线连接 |
| `CreateClusterEndpointVip` 返回 `ResourceUnavailable.ClusterState` | `DescribeClusters` 检查 `ClusterNodeNum` | **集群无工作节点**（`ClusterNodeNum=0`）。VIP 入口要求集群至少有一个工作节点来代理流量 | 先通过 `tccli tke CreateClusterNodePool` 添加工作节点，再创建 VIP 入口。空集群不可创建 VIP 入口 |
| `DeleteCluster` 返回 `ResourceUnavailable.ClusterInDeletionProtection` | `DescribeClusters` 检查 `DeletionProtection` | 删除保护已开启 | 先 `ModifyClusterAttribute --DeletionProtection false` |

### 创建后长时间不 Running

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 返回 ClusterId 但 15 分钟后仍非 Running | `DescribeClusters` 轮询 `ClusterStatus` | 后端创建卡住——可能是 VPC/子网不可用、CIDR 冲突、资源配额不足 | 保留 Region、ClusterId、RequestId、创建 JSON → 登录 [TKE 控制台](https://console.cloud.tencent.com/tke2/cluster) 查看详细状态 → 仍无法解决则 [提交工单](https://console.cloud.tencent.com/workorder) |
| 状态 `Abnormal` | `DescribeClusters` 查看 `StatusReason` | 网络配置问题或底层资源不足 | `DeleteCluster` 重新创建。保留 RequestId + 创建 JSON 以备排查 |
| 端点状态轮询长时间 `Creating` | `DescribeClusterEndpointStatus` 查看 `Status` 和 `ErrorMsg` | 后端创建端点缓慢或失败 | 超过 2 分钟仍 `Creating` → 检查 `ErrorMsg` → 如非空，据错误信息修正（常见：安全组配置、子网 IP 不足） |

### kubectl 连通性故障

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 本地机器 `kubectl` 报 `dial tcp 172.24.0.16:443: i/o timeout` | `DescribeClusterEndpoints` 检查 `ClusterIntranetEndpoint` | **内网端点仅限 VPC 内部访问**。内网 IP（如 `172.24.0.16`）只能从同 VPC 的 CVM 访问。本地机器无法直连 | 方案一：在同 VPC CVM 上执行 kubectl 命令。方案二：通过 IOA/VPN/专线连接。方案三：获取 kubeconfig 后 scp 至同 VPC 跳板机执行 |
| 公网端点创建被 CAM 拒绝 | `CreateClusterEndpoint --IsExtranet true` 返回 `InvalidParameter.Param` + `CAM deny` + `strategyId` | 组织级 CAM 策略硬拒绝公网端点（条件 `tke:clusterExtranetEndpoint=true`）。此为环境限制，非命令错误 | 使用内网端点（`--IsExtranet false`）。如需公网访问，联系 CAM 管理员评估策略 `strategyId` 的豁免条件 |
| `DescribeClusterSecurity` 获取的 kubeconfig 中 `server` 地址不可达 | 检查 kubeconfig 中 `server` 字段是否为内网地址 | 内网端点 IP 需在 VPC 内部可达。公网端点（如已创建）使用 `ClusterDomain` 地址 | 确认 `server` 地址类型：内网 IP 需 VPC 内访问，域名需 DNS 可达 |

## 下一步

- [连接集群](../connect) — 获取 kubeconfig 连接集群
- [集群生命周期](../lifecycle) — 状态流转与生命周期管理
- [添加节点池](../../../节点管理/普通节点/创建节点池) — 向集群添加工作节点
- [集群扩缩容](../scale) — 调整集群规格

## 控制台替代

[TKE 控制台 → 集群列表 → 新建](https://console.cloud.tencent.com/tke2/cluster/create)
