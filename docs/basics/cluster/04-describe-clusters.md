# 如何查询 TKE 集群列表

## 文档元信息

- **功能名称**: 查询 TKE 集群列表
- **API 版本**: 2018-05-25
- **适用集群版本**: 所有版本
- **文档更新时间**: 2026-01-07
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

查询当前账号在指定地域下的所有 TKE 集群列表，支持按集群 ID、名称、状态等条件过滤。本文档提供面向 Agent 的完整操作指南，是集群管理的基础操作。

**任务目标**: 通过 API 或 CLI 获取集群列表及详细信息

---

## 前置条件

在执行查询操作前，必须满足以下条件:

- [ ] 已开通腾讯云账号并完成实名认证
- [ ] 已创建腾讯云 API 密钥 (SecretId 和 SecretKey)
- [ ] 账号具有 TKE 服务的查询权限 (QcloudTKEReadOnlyAccess 或更高权限)
- [ ] 已安装并配置 tccli 工具 (腾讯云 CLI) 或准备好 API 调用环境

---

## 检查清单

在开始前，请确认：

- [ ] 已确定目标地域（如 ap-guangzhou, ap-beijing）
- [ ] 已知晓需要查询的集群 ID（可选，用于精确查询）
- [ ] 了解查询的筛选条件（可选）

---

## 操作步骤

### 方式一: 使用腾讯云 API

#### Step 1: 准备请求参数

查询集群列表的参数说明:

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|------|------|------|--------|
| Region | 是 | String | 地域 | ap-guangzhou |
| ClusterIds | 否 | Array | 集群 ID 列表，不传则查询所有 | ["cls-xxx", "cls-yyy"] |
| Filters | 否 | Array | 过滤条件 | 见下方 |
| Limit | 否 | Integer | 返回数量限制，默认 20，最大 100 | 20 |
| Offset | 否 | Integer | 偏移量，默认 0 | 0 |

**Filters 结构**:

```json
[
  {
    "Name": "ClusterName",      // 按集群名称过滤
    "Values": ["my-cluster"]
  },
  {
    "Name": "ClusterStatus",    // 按状态过滤: Running/Creating/Abnormal/Deleting
    "Values": ["Running"]
  },
  {
    "Name": "ClusterType",      // 按类型过滤: MANAGED_CLUSTER/INDEPENDENT_CLUSTER
    "Values": ["MANAGED_CLUSTER"]
  }
]
```

#### Step 2: 调用 DescribeClusters API

**使用腾讯云 CLI (tccli)**:

```bash
# 查询所有集群
tccli tke DescribeClusters \
  --Region ap-guangzhou

# 查询指定集群
tccli tke DescribeClusters \
  --Region ap-guangzhou \
  --ClusterIds '["cls-xxxxxxxx", "cls-yyyyyyyy"]'

# 按名称过滤
tccli tke DescribeClusters \
  --Region ap-guangzhou \
  --Filters '[
    {
      "Name": "ClusterName",
      "Values": ["production-cluster"]
    }
  ]'

# 查询运行中的托管集群
tccli tke DescribeClusters \
  --Region ap-guangzhou \
  --Filters '[
    {
      "Name": "ClusterStatus",
      "Values": ["Running"]
    },
    {
      "Name": "ClusterType",
      "Values": ["MANAGED_CLUSTER"]
    }
  ]'
```

**使用 Python SDK**:

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import tke_client, models

# 初始化认证
cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

# 方式1: 查询所有集群
req = models.DescribeClustersRequest()
resp = client.DescribeClusters(req)

print(f"集群总数: {resp.TotalCount}")
for cluster in resp.Clusters:
    print(f"集群名称: {cluster.ClusterName}")
    print(f"集群ID: {cluster.ClusterId}")
    print(f"集群状态: {cluster.ClusterStatus}")
    print(f"K8s版本: {cluster.ClusterVersion}")
    print("-" * 40)

# 方式2: 查询指定集群
req = models.DescribeClustersRequest()
req.ClusterIds = ["cls-xxxxxxxx"]
resp = client.DescribeClusters(req)

if resp.TotalCount > 0:
    cluster = resp.Clusters[0]
    print(f"集群详情:")
    print(f"  名称: {cluster.ClusterName}")
    print(f"  状态: {cluster.ClusterStatus}")
    print(f"  版本: {cluster.ClusterVersion}")
    print(f"  节点数: {cluster.ClusterNodeNum}")

# 方式3: 使用过滤条件
req = models.DescribeClustersRequest()
req.Filters = [
    models.Filter(Name="ClusterStatus", Values=["Running"]),
    models.Filter(Name="ClusterType", Values=["MANAGED_CLUSTER"])
]
resp = client.DescribeClusters(req)

print(f"找到 {resp.TotalCount} 个运行中的托管集群")
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

	// 方式1: 查询所有集群
	request := tke.NewDescribeClustersRequest()
	response, err := client.DescribeClusters(request)
	if err != nil {
		panic(err)
	}

	fmt.Printf("集群总数: %d\n", *response.Response.TotalCount)
	for _, cluster := range response.Response.Clusters {
		fmt.Printf("集群名称: %s\n", *cluster.ClusterName)
		fmt.Printf("集群ID: %s\n", *cluster.ClusterId)
		fmt.Printf("集群状态: %s\n", *cluster.ClusterStatus)
		fmt.Println("----------------------------------------")
	}

	// 方式2: 查询指定集群
	request2 := tke.NewDescribeClustersRequest()
	request2.ClusterIds = []*string{common.StringPtr("cls-xxxxxxxx")}
	response2, _ := client.DescribeClusters(request2)

	if *response2.Response.TotalCount > 0 {
		cluster := response2.Response.Clusters[0]
		fmt.Printf("集群详情:\n")
		fmt.Printf("  名称: %s\n", *cluster.ClusterName)
		fmt.Printf("  状态: %s\n", *cluster.ClusterStatus)
		fmt.Printf("  版本: %s\n", *cluster.ClusterVersion)
	}

	// 方式3: 使用过滤条件
	request3 := tke.NewDescribeClustersRequest()
	request3.Filters = []*tke.Filter{
		{
			Name:   common.StringPtr("ClusterStatus"),
			Values: []*string{common.StringPtr("Running")},
		},
		{
			Name:   common.StringPtr("ClusterType"),
			Values: []*string{common.StringPtr("MANAGED_CLUSTER")},
		},
	}
	response3, _ := client.DescribeClusters(request3)
	fmt.Printf("找到 %d 个运行中的托管集群\n", *response3.Response.TotalCount)
}
```

#### Step 3: 解析响应

**成功响应示例**:

```json
{
  "Response": {
    "TotalCount": 2,
    "Clusters": [
      {
        "ClusterId": "cls-xxxxxxxx",
        "ClusterName": "production-cluster",
        "ClusterDescription": "生产环境集群",
        "ClusterVersion": "1.28.3",
        "ClusterOs": "tlinux2.4",
        "ClusterType": "MANAGED_CLUSTER",
        "ClusterStatus": "Running",
        "ClusterNodeNum": 5,
        "ClusterLevel": "L20",
        "ClusterNetworkSettings": {
          "ClusterCIDR": "172.16.0.0/16",
          "ServiceCIDR": "10.96.0.0/16",
          "VpcId": "vpc-xxxxxxxx",
          "Ipvs": true
        },
        "CreatedTime": "2025-12-01T10:30:00Z",
        "EnableExternalNode": false,
        "ProjectId": 0
      },
      {
        "ClusterId": "cls-yyyyyyyy",
        "ClusterName": "test-cluster",
        "ClusterVersion": "1.26.1",
        "ClusterType": "MANAGED_CLUSTER",
        "ClusterStatus": "Running",
        "ClusterNodeNum": 3,
        "ClusterLevel": "L5",
        "ClusterNetworkSettings": {
          "ClusterCIDR": "172.17.0.0/16",
          "ServiceCIDR": "10.97.0.0/16",
          "VpcId": "vpc-yyyyyyyy"
        }
      }
    ],
    "RequestId": "12345678-1234-1234-1234-123456789012"
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| TotalCount | Integer | 集群总数 |
| Clusters | Array | 集群列表 |
| ClusterId | String | 集群唯一 ID |
| ClusterName | String | 集群名称 |
| ClusterStatus | String | 集群状态 |
| ClusterVersion | String | Kubernetes 版本 |
| ClusterNodeNum | Integer | 节点数量 |
| ClusterLevel | String | 集群规格 |
| ClusterNetworkSettings | Object | 网络配置 |
| CreatedTime | String | 创建时间 |

**集群状态说明**:

| 状态 | 说明 | 常见原因 |
|------|------|---------|
| Running | 运行中 | 正常状态，可以正常使用 |
| Creating | 创建中 | 集群正在初始化 |
| Abnormal | 异常 | 控制面或节点异常 |
| Deleting | 删除中 | 集群正在删除 |
| Upgrading | 升级中 | 集群正在升级版本 |
| Scaling | 扩容中 | 节点正在扩容或缩容 |

---

## 验证步骤

### Step 1: 确认返回数据

检查响应中的关键字段：

```python
# 验证响应
assert resp.TotalCount > 0, "未找到任何集群"
assert len(resp.Clusters) > 0, "集群列表为空"

# 验证集群信息完整
cluster = resp.Clusters[0]
assert cluster.ClusterId is not None, "集群 ID 为空"
assert cluster.ClusterName is not None, "集群名称为空"
assert cluster.ClusterStatus in ["Running", "Creating", "Abnormal"], "集群状态异常"
```

### Step 2: 检查集群详细信息

```bash
# 查询特定集群详情
tccli tke DescribeClusters \
  --Region ap-guangzhou \
  --ClusterIds '["cls-xxxxxxxx"]' \
  | jq '.Response.Clusters[0]'
```

**预期结果**:

- 返回的集群数量与实际创建的集群数量一致
- 集群状态为 `Running` 表示可正常使用
- 网络配置、节点数量等信息正确

---

## 异常处理

### 常见错误及解决方案

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|---------|
| AuthFailure | 认证失败 | SecretId/SecretKey 错误或无权限 | 检查密钥是否正确，确认有 TKE 查询权限 |
| InvalidParameter.ClusterIdInvalid | 集群 ID 无效 | 集群 ID 格式错误或不存在 | 检查 ClusterIds 参数格式 |
| InvalidParameter.RegionInvalid | 地域无效 | Region 参数错误 | 使用正确的地域标识（如 ap-guangzhou） |
| LimitExceeded | 超出限制 | Limit 参数超过 100 | 设置 Limit ≤ 100，或分页查询 |
| ResourceNotFound | 集群不存在 | 指定的集群 ID 在当前地域不存在 | 确认集群 ID 和地域是否正确 |

### 排查步骤

1. **检查认证信息**: 确认 SecretId 和 SecretKey 正确
2. **检查地域参数**: 确认 Region 参数与集群实际所在地域一致
3. **验证集群 ID**: 如果指定了 ClusterIds，确认集群 ID 格式正确（格式：`cls-xxxxxxxx`）
4. **检查过滤条件**: 过滤条件可能导致查询结果为空

---

## 高级用法

### 分页查询

当集群数量较多时，使用分页查询：

```python
def get_all_clusters(client, region):
    """获取所有集群（分页）"""
    all_clusters = []
    offset = 0
    limit = 100  # 每页最多 100 条
    
    while True:
        req = models.DescribeClustersRequest()
        req.Limit = limit
        req.Offset = offset
        
        resp = client.DescribeClusters(req)
        all_clusters.extend(resp.Clusters)
        
        if len(resp.Clusters) < limit:
            break
        
        offset += limit
    
    return all_clusters

# 使用示例
clusters = get_all_clusters(client, "ap-guangzhou")
print(f"总共找到 {len(clusters)} 个集群")
```

### 批量查询多个地域

```python
regions = ["ap-guangzhou", "ap-beijing", "ap-shanghai"]
all_clusters = {}

for region in regions:
    client = tke_client.TkeClient(cred, region)
    req = models.DescribeClustersRequest()
    resp = client.DescribeClusters(req)
    
    all_clusters[region] = resp.Clusters
    print(f"{region}: {resp.TotalCount} 个集群")

# 统计总数
total = sum(len(clusters) for clusters in all_clusters.values())
print(f"所有地域总共 {total} 个集群")
```

### 按条件筛选集群

```python
def filter_clusters(client, status=None, cluster_type=None, min_nodes=0):
    """按条件筛选集群"""
    req = models.DescribeClustersRequest()
    
    filters = []
    if status:
        filters.append(models.Filter(Name="ClusterStatus", Values=[status]))
    if cluster_type:
        filters.append(models.Filter(Name="ClusterType", Values=[cluster_type]))
    
    if filters:
        req.Filters = filters
    
    resp = client.DescribeClusters(req)
    
    # 按节点数过滤
    result = [c for c in resp.Clusters if c.ClusterNodeNum >= min_nodes]
    
    return result

# 查询运行中且节点数 ≥ 3 的托管集群
clusters = filter_clusters(
    client,
    status="Running",
    cluster_type="MANAGED_CLUSTER",
    min_nodes=3
)
print(f"找到 {len(clusters)} 个符合条件的集群")
```

### 导出集群信息

```python
import csv

def export_clusters_to_csv(clusters, filename="clusters.csv"):
    """导出集群信息到 CSV"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            "集群ID", "集群名称", "状态", "版本", 
            "节点数", "规格", "VPC ID", "创建时间"
        ])
        
        for cluster in clusters:
            writer.writerow([
                cluster.ClusterId,
                cluster.ClusterName,
                cluster.ClusterStatus,
                cluster.ClusterVersion,
                cluster.ClusterNodeNum,
                cluster.ClusterLevel,
                cluster.ClusterNetworkSettings.VpcId,
                cluster.CreatedTime
            ])
    
    print(f"已导出 {len(clusters)} 个集群信息到 {filename}")

# 使用示例
req = models.DescribeClustersRequest()
resp = client.DescribeClusters(req)
export_clusters_to_csv(resp.Clusters)
```

---

## Agent Prompt 模板

### 基础查询 Prompt

```prompt
请帮我查询腾讯云 TKE 集群列表：
- 地域：{{region}}
- 显示所有集群的名称、状态、版本和节点数
```

### 条件筛选 Prompt

```prompt
请帮我查询符合以下条件的 TKE 集群：
- 地域：ap-guangzhou
- 集群状态：Running（运行中）
- 集群类型：托管集群
- 节点数量：≥ 3
```

### 多地域查询 Prompt

```prompt
请帮我统计以下地域的 TKE 集群数量：
- 广州（ap-guangzhou）
- 北京（ap-beijing）
- 上海（ap-shanghai）

并汇总每个地域的集群数量和总数。
```

### 导出集群信息 Prompt

```prompt
请帮我导出所有 TKE 集群的详细信息到 CSV 文件：
- 地域：ap-guangzhou
- 包含字段：集群ID、名称、状态、版本、节点数、VPC ID
- 文件名：tke-clusters-export.csv
```

---

## 最佳实践

1. **分页查询**: 集群数量较多时，使用 Limit 和 Offset 分页查询，避免超时
2. **使用过滤条件**: 明确查询条件，减少不必要的数据传输
3. **缓存结果**: 集群列表变化不频繁，可以缓存查询结果（如 5 分钟）
4. **并发查询**: 查询多个地域时，使用并发方式提高效率
5. **错误处理**: 实现重试机制，处理网络抖动导致的查询失败
6. **定期巡检**: 定期查询集群状态，及时发现异常集群

---

## 相关文档

- [创建集群](./01-create-cluster.md)
- [删除集群](./02-delete-cluster.md)
- [获取访问凭证](./03-get-kubeconfig.md)
- [查询节点列表](../node/04-describe-nodes.md)

---

## API 文档链接

- **API 文档**: https://cloud.tencent.com/document/product/457/31862
- **SDK 文档**: https://cloud.tencent.com/document/sdk
- **API Explorer**: https://console.cloud.tencent.com/api/explorer?Product=tke&Version=2018-05-25&Action=DescribeClusters

---

## Cookbook 示例

完整可执行代码示例: [TKE 集群查询 Cookbook](../../cookbook/describe-clusters-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2026-01-07  
**维护者**: TKE Documentation Team
