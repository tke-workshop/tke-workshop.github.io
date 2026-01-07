# 如何查询 TKE 节点列表

## 文档元信息

- **功能名称**: 查询 TKE 节点列表
- **API 版本**: 2018-05-25
- **适用集群版本**: 所有版本
- **文档更新时间**: 2026-01-07
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

查询指定 TKE 集群中的所有节点列表，支持按节点 ID、状态、标签等条件过滤。本文档提供面向 Agent 的完整操作指南，是节点管理的基础操作。

**任务目标**: 通过 API 或 CLI 获取集群节点列表及详细信息

---

## 前置条件

在执行查询操作前，必须满足以下条件:

- [ ] 已开通腾讯云账号并完成实名认证
- [ ] 已创建腾讯云 API 密钥 (SecretId 和 SecretKey)
- [ ] 账号具有 TKE 服务的查询权限 (QcloudTKEReadOnlyAccess 或更高权限)
- [ ] 已知晓目标集群 ID
- [ ] 已安装并配置 tccli 工具或准备好 API 调用环境

---

## 检查清单

在开始前，请确认：

- [ ] 已确定目标集群 ID
- [ ] 已知晓集群所在地域
- [ ] 了解查询的筛选条件（可选）

---

## 操作步骤

### 方式一: 使用腾讯云 API

#### Step 1: 准备请求参数

查询节点列表的参数说明:

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|------|------|------|--------|
| ClusterId | 是 | String | 集群 ID | cls-xxxxxxxx |
| InstanceIds | 否 | Array | 节点 ID 列表（CVM 实例 ID），不传则查询所有 | ["ins-xxx", "ins-yyy"] |
| Filters | 否 | Array | 过滤条件 | 见下方 |
| Limit | 否 | Integer | 返回数量限制，默认 20，最大 100 | 20 |
| Offset | 否 | Integer | 偏移量，默认 0 | 0 |

**Filters 结构**:

```json
[
  {
    "Name": "NodePoolId",       // 按节点池 ID 过滤
    "Values": ["np-xxxxxxxx"]
  },
  {
    "Name": "InstanceState",    // 按节点状态过滤
    "Values": ["running"]       // running/abnormal/initializing/failed
  },
  {
    "Name": "Zone",             // 按可用区过滤
    "Values": ["ap-guangzhou-3"]
  }
]
```

#### Step 2: 调用 DescribeClusterInstances API

**使用腾讯云 CLI (tccli)**:

```bash
# 查询集群所有节点
tccli tke DescribeClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx

# 查询指定节点
tccli tke DescribeClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --InstanceIds '["ins-xxxxxxxx", "ins-yyyyyyyy"]'

# 按节点池过滤
tccli tke DescribeClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --Filters '[
    {
      "Name": "NodePoolId",
      "Values": ["np-xxxxxxxx"]
    }
  ]'

# 按可用区过滤
tccli tke DescribeClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --Filters '[
    {
      "Name": "Zone",
      "Values": ["ap-guangzhou-3"]
    }
  ]'

# 分页查询
tccli tke DescribeClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --Limit 10 \
  --Offset 0
```

**使用 Python SDK**:

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import tke_client, models

# 初始化认证
cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

# 方式1: 查询所有节点
req = models.DescribeClusterInstancesRequest()
req.ClusterId = "cls-xxxxxxxx"

resp = client.DescribeClusterInstances(req)

print(f"节点总数: {resp.TotalCount}")
for instance in resp.InstancesList:
    print(f"节点ID: {instance.InstanceId}")
    print(f"节点名称: {instance.InstanceName}")
    print(f"节点状态: {instance.InstanceState}")
    print(f"内网IP: {instance.LanIP}")
    print(f"节点类型: {instance.InstanceType}")
    print(f"可用区: {instance.Zone}")
    print("-" * 40)

# 方式2: 查询指定节点
req = models.DescribeClusterInstancesRequest()
req.ClusterId = "cls-xxxxxxxx"
req.InstanceIds = ["ins-xxxxxxxx"]

resp = client.DescribeClusterInstances(req)

if resp.TotalCount > 0:
    instance = resp.InstancesList[0]
    print(f"节点详情:")
    print(f"  ID: {instance.InstanceId}")
    print(f"  名称: {instance.InstanceName}")
    print(f"  状态: {instance.InstanceState}")
    print(f"  CPU: {instance.CPU} 核")
    print(f"  内存: {instance.Mem} GB")
    print(f"  操作系统: {instance.OsName}")

# 方式3: 使用过滤条件
req = models.DescribeClusterInstancesRequest()
req.ClusterId = "cls-xxxxxxxx"
req.Filters = [
    models.Filter(Name="NodePoolId", Values=["np-xxxxxxxx"]),
    models.Filter(Name="InstanceState", Values=["running"])
]

resp = client.DescribeClusterInstances(req)
print(f"找到 {resp.TotalCount} 个运行中的节点（节点池 np-xxxxxxxx）")

# 方式4: 分页查询
def get_all_nodes(client, cluster_id):
    """获取所有节点（分页）"""
    all_instances = []
    offset = 0
    limit = 100
    
    while True:
        req = models.DescribeClusterInstancesRequest()
        req.ClusterId = cluster_id
        req.Limit = limit
        req.Offset = offset
        
        resp = client.DescribeClusterInstances(req)
        all_instances.extend(resp.InstancesList)
        
        if len(resp.InstancesList) < limit:
            break
        
        offset += limit
    
    return all_instances

all_nodes = get_all_nodes(client, "cls-xxxxxxxx")
print(f"总共 {len(all_nodes)} 个节点")
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

	// 方式1: 查询所有节点
	request := tke.NewDescribeClusterInstancesRequest()
	request.ClusterId = common.StringPtr("cls-xxxxxxxx")

	response, err := client.DescribeClusterInstances(request)
	if err != nil {
		panic(err)
	}

	fmt.Printf("节点总数: %d\n", *response.Response.TotalCount)
	for _, instance := range response.Response.InstancesList {
		fmt.Printf("节点ID: %s\n", *instance.InstanceId)
		fmt.Printf("节点名称: %s\n", *instance.InstanceName)
		fmt.Printf("节点状态: %s\n", *instance.InstanceState)
		fmt.Printf("内网IP: %s\n", *instance.LanIP)
		fmt.Println("----------------------------------------")
	}

	// 方式2: 查询指定节点
	request2 := tke.NewDescribeClusterInstancesRequest()
	request2.ClusterId = common.StringPtr("cls-xxxxxxxx")
	request2.InstanceIds = []*string{common.StringPtr("ins-xxxxxxxx")}

	response2, _ := client.DescribeClusterInstances(request2)
	if *response2.Response.TotalCount > 0 {
		instance := response2.Response.InstancesList[0]
		fmt.Printf("节点详情:\n")
		fmt.Printf("  ID: %s\n", *instance.InstanceId)
		fmt.Printf("  名称: %s\n", *instance.InstanceName)
		fmt.Printf("  状态: %s\n", *instance.InstanceState)
	}

	// 方式3: 使用过滤条件
	request3 := tke.NewDescribeClusterInstancesRequest()
	request3.ClusterId = common.StringPtr("cls-xxxxxxxx")
	request3.Filters = []*tke.Filter{
		{
			Name:   common.StringPtr("NodePoolId"),
			Values: []*string{common.StringPtr("np-xxxxxxxx")},
		},
		{
			Name:   common.StringPtr("InstanceState"),
			Values: []*string{common.StringPtr("running")},
		},
	}

	response3, _ := client.DescribeClusterInstances(request3)
	fmt.Printf("找到 %d 个运行中的节点\n", *response3.Response.TotalCount)
}
```

#### Step 3: 解析响应

**成功响应示例**:

```json
{
  "Response": {
    "TotalCount": 3,
    "InstancesList": [
      {
        "InstanceId": "ins-xxxxxxxx",
        "InstanceName": "tke-node-1",
        "InstanceRole": "WORKER",
        "InstanceState": "running",
        "FailedReason": "",
        "NodePoolId": "np-xxxxxxxx",
        "CreatedTime": "2025-12-01T10:30:00Z",
        "InstanceAdvancedSettings": {
          "MountTarget": "/var/lib/docker",
          "Unschedulable": 0
        },
        "LanIP": "10.0.1.10",
        "Zone": "ap-guangzhou-3",
        "InstanceType": "SA2.MEDIUM4",
        "CPU": 2,
        "Mem": 4,
        "OsName": "TencentOS Server 3.1 (TK4)",
        "InstanceChargeType": "POSTPAID_BY_HOUR"
      },
      {
        "InstanceId": "ins-yyyyyyyy",
        "InstanceName": "tke-node-2",
        "InstanceRole": "WORKER",
        "InstanceState": "running",
        "NodePoolId": "np-xxxxxxxx",
        "LanIP": "10.0.1.11",
        "Zone": "ap-guangzhou-3",
        "InstanceType": "SA2.MEDIUM4",
        "CPU": 2,
        "Mem": 4
      }
    ],
    "RequestId": "12345678-1234-1234-1234-123456789012"
  }
}
```

**响应字段说明**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| TotalCount | Integer | 节点总数 |
| InstancesList | Array | 节点列表 |
| InstanceId | String | 节点 ID（CVM 实例 ID） |
| InstanceName | String | 节点名称 |
| InstanceRole | String | 节点角色：MASTER_ETCD/WORKER |
| InstanceState | String | 节点状态 |
| NodePoolId | String | 所属节点池 ID |
| LanIP | String | 内网 IP |
| Zone | String | 可用区 |
| InstanceType | String | 节点机型 |
| CPU | Integer | CPU 核数 |
| Mem | Integer | 内存大小（GB） |
| OsName | String | 操作系统 |

**节点状态说明**:

| 状态 | 说明 | 常见原因 |
|------|------|---------|
| running | 运行中 | 正常状态，节点可用 |
| initializing | 初始化中 | 节点正在加入集群 |
| failed | 失败 | 节点加入集群失败 |
| abnormal | 异常 | 节点不健康或网络问题 |

---

### 方式二: 使用 kubectl

查询节点列表也可以使用 kubectl（需要先获取集群访问凭证）:

```bash
# 获取所有节点
kubectl get nodes

# 查看节点详细信息
kubectl get nodes -o wide

# 查看节点详情
kubectl describe node <node-name>

# 按标签过滤节点
kubectl get nodes -l env=production

# 查看节点资源使用情况
kubectl top nodes

# 输出为 JSON 格式
kubectl get nodes -o json

# 自定义输出列
kubectl get nodes -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[-1].type,ROLES:.metadata.labels."node-role\\.kubernetes\\.io/master",AGE:.metadata.creationTimestamp,VERSION:.status.nodeInfo.kubeletVersion
```

---

## 验证步骤

### Step 1: 确认返回数据

检查响应中的关键字段：

```python
# 验证响应
assert resp.TotalCount > 0, "集群中没有节点"
assert len(resp.InstancesList) > 0, "节点列表为空"

# 验证节点信息完整
instance = resp.InstancesList[0]
assert instance.InstanceId is not None, "节点 ID 为空"
assert instance.InstanceState in ["running", "initializing", "abnormal"], "节点状态异常"
```

### Step 2: 对比 API 和 kubectl 结果

```bash
# 使用 API 查询节点数量
tccli tke DescribeClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  | jq '.Response.TotalCount'

# 使用 kubectl 查询节点数量
kubectl get nodes --no-headers | wc -l
```

**预期结果**:
- API 和 kubectl 返回的节点数量一致
- 节点状态为 `running` 表示节点健康
- 节点 IP、机型等信息正确

---

## 异常处理

### 常见错误及解决方案

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|---------|
| AuthFailure | 认证失败 | SecretId/SecretKey 错误或无权限 | 检查密钥是否正确，确认有 TKE 查询权限 |
| InvalidParameter.ClusterIdInvalid | 集群 ID 无效 | ClusterId 格式错误或不存在 | 检查集群 ID 格式（cls-xxxxxxxx） |
| InvalidParameter.InstanceIdInvalid | 节点 ID 无效 | InstanceId 格式错误或不存在 | 检查节点 ID 格式（ins-xxxxxxxx） |
| ResourceNotFound.ClusterNotFound | 集群不存在 | 指定的集群在当前地域不存在 | 确认集群 ID 和地域是否正确 |
| LimitExceeded | 超出限制 | Limit 参数超过 100 | 设置 Limit ≤ 100，或分页查询 |

### 排查步骤

1. **检查认证信息**: 确认 SecretId 和 SecretKey 正确
2. **检查集群 ID**: 确认集群 ID 和地域匹配
3. **验证节点 ID**: 如果指定了 InstanceIds，确认节点 ID 格式正确
4. **检查过滤条件**: 过滤条件可能导致查询结果为空

---

## 高级用法

### 统计节点资源

```python
def get_cluster_resources(client, cluster_id):
    """统计集群节点资源"""
    req = models.DescribeClusterInstancesRequest()
    req.ClusterId = cluster_id
    
    resp = client.DescribeClusterInstances(req)
    
    total_cpu = 0
    total_mem = 0
    node_count = resp.TotalCount
    
    for instance in resp.InstancesList:
        if instance.InstanceState == "running":
            total_cpu += instance.CPU
            total_mem += instance.Mem
    
    print(f"集群资源统计:")
    print(f"  节点数量: {node_count}")
    print(f"  总 CPU: {total_cpu} 核")
    print(f"  总内存: {total_mem} GB")
    
    return {
        "node_count": node_count,
        "total_cpu": total_cpu,
        "total_mem": total_mem
    }

# 使用示例
resources = get_cluster_resources(client, "cls-xxxxxxxx")
```

### 按节点池分组

```python
from collections import defaultdict

def group_nodes_by_nodepool(client, cluster_id):
    """按节点池分组节点"""
    req = models.DescribeClusterInstancesRequest()
    req.ClusterId = cluster_id
    
    resp = client.DescribeClusterInstances(req)
    
    nodepool_groups = defaultdict(list)
    
    for instance in resp.InstancesList:
        nodepool_id = instance.NodePoolId or "default"
        nodepool_groups[nodepool_id].append(instance)
    
    print("节点池分组:")
    for nodepool_id, instances in nodepool_groups.items():
        print(f"  {nodepool_id}: {len(instances)} 个节点")
        for inst in instances:
            print(f"    - {inst.InstanceId} ({inst.InstanceState})")
    
    return nodepool_groups

# 使用示例
groups = group_nodes_by_nodepool(client, "cls-xxxxxxxx")
```

### 检测异常节点

```python
def detect_abnormal_nodes(client, cluster_id):
    """检测异常节点"""
    req = models.DescribeClusterInstancesRequest()
    req.ClusterId = cluster_id
    
    resp = client.DescribeClusterInstances(req)
    
    abnormal_nodes = []
    
    for instance in resp.InstancesList:
        if instance.InstanceState in ["abnormal", "failed"]:
            abnormal_nodes.append({
                "instance_id": instance.InstanceId,
                "instance_name": instance.InstanceName,
                "state": instance.InstanceState,
                "failed_reason": instance.FailedReason or "未知"
            })
    
    if abnormal_nodes:
        print(f"发现 {len(abnormal_nodes)} 个异常节点:")
        for node in abnormal_nodes:
            print(f"  - {node['instance_id']} ({node['state']}): {node['failed_reason']}")
    else:
        print("所有节点状态正常")
    
    return abnormal_nodes

# 使用示例
abnormal = detect_abnormal_nodes(client, "cls-xxxxxxxx")
```

### 导出节点信息

```python
import csv

def export_nodes_to_csv(client, cluster_id, filename="nodes.csv"):
    """导出节点信息到 CSV"""
    req = models.DescribeClusterInstancesRequest()
    req.ClusterId = cluster_id
    
    resp = client.DescribeClusterInstances(req)
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            "节点ID", "节点名称", "状态", "内网IP", "可用区",
            "机型", "CPU", "内存", "操作系统", "节点池ID", "创建时间"
        ])
        
        for instance in resp.InstancesList:
            writer.writerow([
                instance.InstanceId,
                instance.InstanceName,
                instance.InstanceState,
                instance.LanIP,
                instance.Zone,
                instance.InstanceType,
                instance.CPU,
                instance.Mem,
                instance.OsName,
                instance.NodePoolId or "-",
                instance.CreatedTime
            ])
    
    print(f"已导出 {resp.TotalCount} 个节点信息到 {filename}")

# 使用示例
export_nodes_to_csv(client, "cls-xxxxxxxx")
```

---

## Agent Prompt 模板

### 基础查询 Prompt

```prompt
请帮我查询 TKE 集群的节点列表：
- 集群 ID：{{cluster_id}}
- 地域：{{region}}
- 显示所有节点的 ID、名称、状态、IP 和机型
```

### 条件筛选 Prompt

```prompt
请帮我查询符合以下条件的 TKE 节点：
- 集群 ID：cls-xxxxxxxx
- 节点池 ID：np-xxxxxxxx
- 节点状态：running（运行中）
- 可用区：ap-guangzhou-3
```

### 资源统计 Prompt

```prompt
请帮我统计 TKE 集群的节点资源：
- 集群 ID：cls-xxxxxxxx
- 统计信息：
  - 总节点数
  - 总 CPU 核数
  - 总内存大小（GB）
  - 按节点池分组统计
```

### 异常检测 Prompt

```prompt
请帮我检查 TKE 集群中的异常节点：
- 集群 ID：cls-xxxxxxxx
- 检查内容：
  - 状态为 abnormal 或 failed 的节点
  - 列出节点 ID、状态和失败原因
  - 建议修复措施
```

---

## 最佳实践

1. **分页查询**: 节点数量较多时，使用 Limit 和 Offset 分页查询
2. **使用过滤条件**: 明确查询条件，减少不必要的数据传输
3. **缓存结果**: 节点列表变化不频繁，可以缓存查询结果（如 1 分钟）
4. **定期巡检**: 定期查询节点状态，及时发现异常节点
5. **结合 kubectl**: API 查询适合批量操作，kubectl 适合交互式查询
6. **监控关键指标**: 关注节点状态、资源使用率、节点池分布

---

## 相关文档

- [添加节点到集群](./01-add-node.md)
- [删除节点](./02-delete-node.md)
- [驱逐节点 Pod](./03-drain-node.md)
- [创建节点池](../nodepool/01-create-nodepool.md)
- [查询集群列表](../cluster/04-describe-clusters.md)

---

## API 文档链接

- **API 文档**: https://cloud.tencent.com/document/api/457/36704
- **SDK 文档**: https://cloud.tencent.com/document/sdk
- **API Explorer**: https://console.cloud.tencent.com/api/explorer?Product=tke&Version=2018-05-25&Action=DescribeClusterInstances

---

## Cookbook 示例

完整可执行代码示例: [TKE 节点查询 Cookbook](../../cookbook/describe-nodes-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2026-01-07  
**维护者**: TKE Documentation Team
