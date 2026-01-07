# 如何创建 TKE 集群

## 文档元信息

- **功能名称**: 创建 TKE 集群
- **API 版本**: 2018-05-25
- **适用集群版本**: 所有版本
- **文档更新时间**: 2026-01-07
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

创建一个新的腾讯云容器服务（TKE）集群,支持托管集群(MANAGED_CLUSTER)和独立集群(INDEPENDENT_CLUSTER)两种类型。本文档提供面向 Agent 的完整操作指南,包含 API 调用、CLI 命令和验证步骤。

**任务目标**: 通过 API 或 CLI 创建一个可用的 TKE 集群

---

## 前置条件

在执行创建集群操作前,必须满足以下条件:

- [ ] 已开通腾讯云账号并完成实名认证
- [ ] 已创建腾讯云 API 密钥 (SecretId 和 SecretKey)
- [ ] 账号具有 TKE 服务的创建权限 (QcloudTKEFullAccess 或 AdministratorAccess)
- [ ] 目标地域已创建 VPC 网络和子网
- [ ] 目标地域集群配额充足 (默认每地域 5 个集群)
- [ ] 已安装并配置 tccli 工具 (腾讯云 CLI) 或准备好 API 调用环境

---

## 操作步骤

### 方式一: 使用腾讯云 API

#### Step 1: 准备请求参数

创建集群的核心参数:

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|------|------|------|--------|
| ClusterType | 是 | String | 集群类型: MANAGED_CLUSTER(托管) 或 INDEPENDENT_CLUSTER(独立) | MANAGED_CLUSTER |
| ClusterCIDRSettings | 是 | Object | 容器网络配置 | 见下方 |
| ClusterBasicSettings | 否 | Object | 集群基础信息 | 见下方 |
| RunInstancesForNode | 否 | Array | 节点创建参数 | 见下方 |
| Region | 是 | String | 地域 | ap-guangzhou |

**ClusterCIDRSettings 结构**:

```json
{
  "ClusterCIDR": "172.16.0.0/16",        // 集群容器网络 CIDR
  "MaxNodePodNum": 64,                    // 每个节点最大 Pod 数
  "MaxClusterServiceNum": 256,            // 集群最大 Service 数
  "ServiceCIDR": "10.96.0.0/16",         // Service CIDR
  "VpcId": "vpc-xxxxxxxx",                // VPC ID (必填)
  "CniType": "vpc-cni"                    // CNI 类型: vpc-cni 或 gre
}
```

**ClusterBasicSettings 结构**:

```json
{
  "ClusterName": "my-tke-cluster",        // 集群名称 (不超过50字符)
  "ClusterVersion": "1.28.3",             // Kubernetes 版本
  "ClusterDescription": "测试集群",       // 集群描述
  "VpcId": "vpc-xxxxxxxx",                // VPC ID
  "ProjectId": 0,                         // 项目ID (默认0)
  "ClusterLevel": "L5",                   // 集群规模: L5/L20/L50/L100/L200/L500
  "AutoUpgradeClusterLevel": true         // 是否自动升配
}
```

#### Step 2: 调用 CreateCluster API

**使用腾讯云 CLI (tccli)**:

```bash
tccli tke CreateCluster \
  --Region ap-guangzhou \
  --ClusterType MANAGED_CLUSTER \
  --ClusterBasicSettings '{
    "ClusterName": "my-tke-cluster",
    "ClusterVersion": "1.28.3",
    "VpcId": "vpc-xxxxxxxx",
    "ClusterLevel": "L5"
  }' \
  --ClusterCIDRSettings '{
    "ClusterCIDR": "172.16.0.0/16",
    "MaxNodePodNum": 64,
    "ServiceCIDR": "10.96.0.0/16",
    "VpcId": "vpc-xxxxxxxx",
    "CniType": "vpc-cni"
  }'
```

**使用 Python SDK**:

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import tke_client, models

# 初始化认证
cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

# 构造请求
req = models.CreateClusterRequest()
req.ClusterType = "MANAGED_CLUSTER"

# 集群基础配置
req.ClusterBasicSettings = models.ClusterBasicSettings()
req.ClusterBasicSettings.ClusterName = "my-tke-cluster"
req.ClusterBasicSettings.ClusterVersion = "1.28.3"
req.ClusterBasicSettings.VpcId = "vpc-xxxxxxxx"
req.ClusterBasicSettings.ClusterLevel = "L5"

# 网络配置
req.ClusterCIDRSettings = models.ClusterCIDRSettings()
req.ClusterCIDRSettings.ClusterCIDR = "172.16.0.0/16"
req.ClusterCIDRSettings.MaxNodePodNum = 64
req.ClusterCIDRSettings.ServiceCIDR = "10.96.0.0/16"
req.ClusterCIDRSettings.VpcId = "vpc-xxxxxxxx"
req.ClusterCIDRSettings.CniType = "vpc-cni"

# 发起请求
resp = client.CreateCluster(req)
print(f"集群ID: {resp.ClusterId}")
```

**使用 Go SDK**:

```go
package main

import (
	"fmt"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
	tke "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/tke/v20180525"
)

func main() {
	credential := common.NewCredential("SecretId", "SecretKey")
	cpf := profile.NewClientProfile()
	client, _ := tke.NewClient(credential, "ap-guangzhou", cpf)

	request := tke.NewCreateClusterRequest()
	request.ClusterType = common.StringPtr("MANAGED_CLUSTER")
	
	request.ClusterBasicSettings = &tke.ClusterBasicSettings{
		ClusterName:    common.StringPtr("my-tke-cluster"),
		ClusterVersion: common.StringPtr("1.28.3"),
		VpcId:          common.StringPtr("vpc-xxxxxxxx"),
		ClusterLevel:   common.StringPtr("L5"),
	}
	
	request.ClusterCIDRSettings = &tke.ClusterCIDRSettings{
		ClusterCIDR:           common.StringPtr("172.16.0.0/16"),
		MaxNodePodNum:         common.Uint64Ptr(64),
		ServiceCIDR:           common.StringPtr("10.96.0.0/16"),
		VpcId:                 common.StringPtr("vpc-xxxxxxxx"),
		CniType:               common.StringPtr("vpc-cni"),
	}

	response, err := client.CreateCluster(request)
	if err != nil {
		panic(err)
	}
	fmt.Printf("集群ID: %s\n", *response.Response.ClusterId)
}
```

#### Step 3: 获取响应

**成功响应示例**:

```json
{
  "Response": {
    "ClusterId": "cls-xxxxxxxx",
    "RequestId": "12345678-1234-1234-1234-123456789012"
  }
}
```

**响应参数说明**:

| 参数名 | 类型 | 说明 |
|--------|------|------|
| ClusterId | String | 集群唯一 ID,用于后续操作 |
| RequestId | String | 请求唯一标识,用于问题排查 |

---

### 方式二: 使用 kubectl 配合 TKE CLI

TKE 不支持通过 kubectl 直接创建集群,必须使用 API 或控制台。但可以在创建后使用 kubectl 管理集群。

---

## 验证步骤

创建集群后,需要验证集群状态:

### Step 1: 查询集群状态

```bash
tccli tke DescribeClusters \
  --Region ap-guangzhou \
  --ClusterIds '["cls-xxxxxxxx"]'
```

**期望结果**:

```json
{
  "Response": {
    "TotalCount": 1,
    "Clusters": [
      {
        "ClusterId": "cls-xxxxxxxx",
        "ClusterName": "my-tke-cluster",
        "ClusterStatus": "Running",
        "ClusterVersion": "1.28.3"
      }
    ]
  }
}
```

**集群状态说明**:

| 状态 | 说明 | 下一步操作 |
|------|------|----------|
| Creating | 创建中 | 等待状态变为 Running |
| Running | 运行中 | 可以添加节点和部署应用 |
| Abnormal | 异常 | 检查集群事件和错误日志 |
| Deleting | 删除中 | 等待删除完成 |

### Step 2: 获取集群访问凭证

```bash
tccli tke DescribeClusterKubeconfig \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx
```

### Step 3: 配置 kubectl 访问

```bash
# 将返回的 Kubeconfig 内容保存到文件
echo "<kubeconfig_content>" > ~/.kube/config-tke

# 设置 KUBECONFIG 环境变量
export KUBECONFIG=~/.kube/config-tke

# 验证连接
kubectl cluster-info
kubectl get nodes
```

**期望结果**:

```
Kubernetes control plane is running at https://cls-xxxxxxxx.ccs.tencent-cloud.com
CoreDNS is running at https://cls-xxxxxxxx.ccs.tencent-cloud.com/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

---

## 异常处理

### 常见错误及解决方案

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|---------|
| InvalidParameter.ClusterCIDRConflict | 集群 CIDR 冲突 | 指定的 ClusterCIDR 与 VPC CIDR 冲突 | 修改 ClusterCIDR 为不冲突的网段 |
| InvalidParameter.VpcNotFound | VPC 不存在 | 指定的 VpcId 不存在或无权限 | 检查 VpcId 是否正确 |
| LimitExceeded.ClusterLimit | 集群数量超限 | 当前地域集群数量已达上限 | 删除不用的集群或申请配额 |
| InsufficientBalance | 余额不足 | 账户余额不足以支付集群费用 | 充值后重试 |
| FailedOperation.ComponentClientHTTP | 组件请求失败 | 网络或组件异常 | 等待1-2分钟后重试 |
| InvalidParameter.ClusterVersionInvalid | 集群版本无效 | 指定的 Kubernetes 版本不支持 | 使用 DescribeAvailableClusterVersion 查询可用版本 |

### 排查步骤

1. **检查请求参数**: 确认所有必填参数已正确填写
2. **查看 RequestId**: 记录 RequestId 用于提交工单
3. **查询集群状态**: 使用 DescribeClusters 查看集群状态和错误信息
4. **查看集群事件**: 登录控制台查看集群事件详情

---

## 高级配置

### 创建集群时同时添加节点

在 `RunInstancesForNode` 参数中指定节点配置:

```json
{
  "RunInstancesForNode": [
    {
      "InstanceType": "SA2.MEDIUM4",
      "SystemDisk": {
        "DiskType": "CLOUD_PREMIUM",
        "DiskSize": 50
      },
      "DataDisks": [
        {
          "DiskType": "CLOUD_PREMIUM",
          "DiskSize": 100
        }
      ],
      "InternetAccessible": {
        "InternetMaxBandwidthOut": 5
      },
      "InstanceCount": 3,
      "Zone": "ap-guangzhou-3"
    }
  ]
}
```

### 配置集群自动升级

```json
{
  "ClusterBasicSettings": {
    "AutoUpgradeClusterLevel": true
  }
}
```

### 配置集群删除保护

创建后通过 API 启用:

```bash
tccli tke EnableClusterDeletionProtection \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx
```

---

## Agent Prompt 模板

### 基础创建 Prompt

```prompt
请帮我创建一个 TKE 集群:
- 地域: {{region}}
- 集群名称: {{cluster_name}}
- Kubernetes 版本: {{k8s_version}}
- VPC ID: {{vpc_id}}
- 集群类型: 托管集群
- 容器网络 CIDR: 172.16.0.0/16
- Service CIDR: 10.96.0.0/16
- 集群规模: L5
```

### 带节点创建 Prompt

```prompt
请帮我创建一个带3个节点的 TKE 集群:
- 地域: ap-guangzhou
- 集群名称: production-cluster
- Kubernetes 版本: 1.28.3
- VPC ID: vpc-xxxxxxxx
- 节点机型: SA2.MEDIUM4 (2核4G)
- 节点数量: 3
- 系统盘: 高性能云硬盘 50GB
- 数据盘: 高性能云硬盘 100GB
```

---

## 最佳实践

1. **集群命名规范**: 使用 `{env}-{project}-{region}` 格式,如 `prod-api-gz`
2. **网络规划**: 
   - ClusterCIDR 建议使用 /16 网段,支持更多 Pod
   - ServiceCIDR 建议使用 /16 网段,避免与 ClusterCIDR 冲突
3. **集群规模选择**: 
   - L5: ≤5 节点,适合测试环境
   - L20: 6-20 节点,适合小型生产
   - L50: 21-50 节点,适合中型生产
4. **启用删除保护**: 生产集群建议启用删除保护
5. **版本选择**: 选择稳定版本,避免使用最新版本

---

## 相关文档

- [删除集群](./02-delete-cluster.md)
- [查询集群列表](./03-describe-clusters.md)
- [添加节点到集群](../node/01-add-node.md)
- [配置集群访问凭证](./04-configure-kubeconfig.md)

---

## API 文档链接

- **API 文档**: https://cloud.tencent.com/document/product/457/34527
- **SDK 文档**: https://cloud.tencent.com/document/sdk
- **API Explorer**: https://console.cloud.tencent.com/api/explorer?Product=tke&Version=2018-05-25&Action=CreateCluster

---

## Cookbook 示例

完整可执行代码示例: [TKE 集群创建 Cookbook](../../cookbook/create-cluster-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2026-01-07  
**维护者**: TKE Documentation Team
