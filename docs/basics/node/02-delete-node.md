# 如何删除 TKE 节点

## 文档元信息

- **功能名称**: 删除 TKE 节点
- **API 版本**: 2018-05-25
- **适用集群版本**: 所有版本
- **文档更新时间**: 2026-01-07
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

从 TKE 集群中删除指定的节点，支持批量删除。删除节点会先驱逐节点上的 Pod，然后从集群中移除节点，最后销毁 CVM 实例（可选）。

**任务目标**: 安全地从集群中删除节点，避免业务中断

---

## 前置条件

在执行删除节点操作前，必须满足以下条件:

- [ ] 已开通腾讯云账号并完成实名认证
- [ ] 已创建腾讯云 API 密钥 (SecretId 和 SecretKey)
- [ ] 账号具有 TKE 服务的节点管理权限
- [ ] 目标集群状态为 Running
- [ ] 已知晓要删除的节点 ID 或节点名称
- [ ] 确认删除节点不会导致业务不可用（如副本数不足）

---

## 检查清单

在开始前，请确认：

- [ ] 集群中有足够的剩余节点承载工作负载
- [ ] 待删除节点上的 Pod 有其他节点可调度
- [ ] 已备份节点上的重要数据（如本地存储）
- [ ] 了解删除模式（仅从集群移除 vs 同时销毁 CVM）
- [ ] 生产环境操作已获得审批

**⚠️ 重要提示**:
- 删除节点会驱逐节点上的所有 Pod
- 如果 Pod 没有副本或 PDB 配置不当，可能导致服务中断
- 删除节点后 CVM 实例默认会被销毁，数据无法恢复

---

## 操作步骤

### 方式一: 使用腾讯云 API

#### Step 1: 准备请求参数

删除节点的核心参数:

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|------|------|------|--------|
| ClusterId | 是 | String | 集群 ID | cls-xxxxxxxx |
| InstanceIds | 是 | Array | 节点 ID 列表（CVM 实例 ID） | ["ins-xxx", "ins-yyy"] |
| InstanceDeleteMode | 否 | String | 删除模式：retain（保留实例）、terminate（销毁实例，默认） | terminate |
| ForceDelete | 否 | Boolean | 是否强制删除（跳过驱逐，不推荐） | false |

**删除模式说明**:

| 模式 | 说明 | 适用场景 | CVM 实例 | 数据保留 |
|------|------|----------|---------|---------|
| terminate（默认） | 从集群移除并销毁 CVM | 不再需要该节点 | 销毁 | ❌ 不保留 |
| retain | 仅从集群移除，保留 CVM | 节点需要重新使用或迁移到其他集群 | 保留 | ✅ 保留 |

#### Step 2: 调用 DeleteClusterInstances API

**使用腾讯云 CLI (tccli)**:

```bash
# 删除单个节点（默认销毁 CVM）
tccli tke DeleteClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --InstanceIds '["ins-xxxxxxxx"]'

# 批量删除节点
tccli tke DeleteClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --InstanceIds '["ins-xxxxxxxx", "ins-yyyyyyyy", "ins-zzzzzzzz"]'

# 删除节点但保留 CVM 实例
tccli tke DeleteClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --InstanceIds '["ins-xxxxxxxx"]' \
  --InstanceDeleteMode retain

# 强制删除（不推荐，跳过 Pod 驱逐）
tccli tke DeleteClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --InstanceIds '["ins-xxxxxxxx"]' \
  --ForceDelete true
```

**使用 Python SDK**:

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import tke_client, models

# 初始化认证
cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

# 方式1: 删除节点（默认销毁 CVM）
req = models.DeleteClusterInstancesRequest()
req.ClusterId = "cls-xxxxxxxx"
req.InstanceIds = ["ins-xxxxxxxx"]
req.InstanceDeleteMode = "terminate"  # 可选，默认值

resp = client.DeleteClusterInstances(req)
print(f"删除请求已提交，RequestId: {resp.RequestId}")

# 方式2: 删除节点但保留 CVM
req = models.DeleteClusterInstancesRequest()
req.ClusterId = "cls-xxxxxxxx"
req.InstanceIds = ["ins-xxxxxxxx"]
req.InstanceDeleteMode = "retain"

resp = client.DeleteClusterInstances(req)
print("节点已从集群移除，CVM 实例已保留")

# 方式3: 批量删除
req = models.DeleteClusterInstancesRequest()
req.ClusterId = "cls-xxxxxxxx"
req.InstanceIds = ["ins-xxx", "ins-yyy", "ins-zzz"]

resp = client.DeleteClusterInstances(req)
print(f"批量删除 {len(req.InstanceIds)} 个节点")
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

	// 方式1: 删除节点（默认销毁 CVM）
	request := tke.NewDeleteClusterInstancesRequest()
	request.ClusterId = common.StringPtr("cls-xxxxxxxx")
	request.InstanceIds = []*string{
		common.StringPtr("ins-xxxxxxxx"),
	}
	request.InstanceDeleteMode = common.StringPtr("terminate")

	response, err := client.DeleteClusterInstances(request)
	if err != nil {
		panic(err)
	}
	fmt.Printf("删除请求已提交，RequestId: %s\n", *response.Response.RequestId)

	// 方式2: 删除节点但保留 CVM
	request2 := tke.NewDeleteClusterInstancesRequest()
	request2.ClusterId = common.StringPtr("cls-xxxxxxxx")
	request2.InstanceIds = []*string{common.StringPtr("ins-xxxxxxxx")}
	request2.InstanceDeleteMode = common.StringPtr("retain")

	response2, _ := client.DeleteClusterInstances(request2)
	fmt.Printf("节点已从集群移除，CVM 保留，RequestId: %s\n", *response2.Response.RequestId)

	// 方式3: 批量删除
	request3 := tke.NewDeleteClusterInstancesRequest()
	request3.ClusterId = common.StringPtr("cls-xxxxxxxx")
	request3.InstanceIds = []*string{
		common.StringPtr("ins-xxx"),
		common.StringPtr("ins-yyy"),
		common.StringPtr("ins-zzz"),
	}

	response3, _ := client.DeleteClusterInstances(request3)
	fmt.Printf("批量删除成功，RequestId: %s\n", *response3.Response.RequestId)
}
```

#### Step 3: 获取响应

**成功响应示例**:

```json
{
  "Response": {
    "RequestId": "12345678-1234-1234-1234-123456789012"
  }
}
```

**响应说明**:
- API 调用成功仅表示请求已接受，实际删除是异步操作
- 需要通过查询节点列表或集群事件来确认删除完成

---

### 方式二: 使用 kubectl（驱逐 Pod）

在删除节点前，可以先手动驱逐 Pod：

```bash
# Step 1: 设置节点不可调度
kubectl cordon <node-name>

# Step 2: 驱逐节点上的 Pod
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Step 3: 从集群删除节点（使用 API）
# 此时节点上已无业务 Pod，删除更安全
```

---

## 验证步骤

### Step 1: 查询节点列表

等待 1-2 分钟后，查询节点列表确认节点已删除：

```bash
# 查询集群节点列表
tccli tke DescribeClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx
```

或使用 kubectl:

```bash
# 查看节点列表
kubectl get nodes

# 查看节点详情（如果节点还在）
kubectl describe node <node-name>
```

**期望结果**:
- 节点不再出现在节点列表中
- kubectl get nodes 不再显示该节点

### Step 2: 验证 CVM 实例状态

如果使用 `terminate` 模式，检查 CVM 是否已销毁：

```bash
# 查询 CVM 实例状态
tccli cvm DescribeInstances \
  --Region ap-guangzhou \
  --InstanceIds '["ins-xxxxxxxx"]'
```

**期望结果**:
- `terminate` 模式：实例状态为 `SHUTDOWN` 或实例不存在
- `retain` 模式：实例状态为 `RUNNING`，但不在集群中

### Step 3: 检查 Pod 重新调度

```bash
# 查看 Pod 是否已重新调度到其他节点
kubectl get pods -A -o wide | grep <old-node-name>

# 查看 Pod 调度事件
kubectl get events -A --sort-by='.lastTimestamp' | grep -i 'Schedule\|Evict'
```

**期望结果**:
- 原节点上的 Pod 已成功迁移到其他节点
- 所有 Pod 状态为 `Running`

---

## 异常处理

### 常见错误及解决方案

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|---------|
| InvalidParameter.ClusterNotFound | 集群不存在 | ClusterId 错误或集群已删除 | 检查集群 ID 是否正确 |
| InvalidParameter.InstanceNotFound | 节点不存在 | InstanceId 错误或节点已删除 | 检查节点 ID 是否正确 |
| FailedOperation.NodeNotReady | 节点状态异常 | 节点处于异常状态 | 使用 `ForceDelete=true` 强制删除 |
| FailedOperation.PodEvictionTimeout | Pod 驱逐超时 | Pod 驱逐时间超过限制 | 检查 PDB 配置，或使用强制删除 |
| LimitExceeded.DeleteBatchLimit | 删除数量超限 | 单次删除节点数量超过限制（通常 ≤ 100） | 分批删除 |
| ResourceInUse.NodeHasStaticPod | 节点有静态 Pod | 节点上运行有静态 Pod 无法驱逐 | 先删除静态 Pod 定义文件 |

### 特殊情况处理

#### 1. Pod 驱逐失败

**原因**: PodDisruptionBudget (PDB) 配置导致无法驱逐

**解决方案**:

```bash
# 查看 PDB 配置
kubectl get pdb -A

# 临时修改 PDB（降低 minAvailable）
kubectl edit pdb <pdb-name> -n <namespace>

# 或删除 PDB（谨慎操作）
kubectl delete pdb <pdb-name> -n <namespace>

# 然后重新删除节点
```

#### 2. 节点无法连接

**原因**: 节点网络异常或已宕机

**解决方案**:

```bash
# 使用强制删除
tccli tke DeleteClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --InstanceIds '["ins-xxxxxxxx"]' \
  --ForceDelete true
```

#### 3. 节点卡在删除状态

**原因**: API 调用成功但节点删除卡住

**排查步骤**:

```bash
# 1. 查看节点状态
kubectl describe node <node-name>

# 2. 查看集群事件
kubectl get events -A --sort-by='.lastTimestamp' | tail -20

# 3. 查看 TKE 控制台的集群事件

# 4. 如果超过 10 分钟仍未删除，提交工单
```

---

## 高级用法

### 批量删除多个节点

```python
def batch_delete_nodes(client, cluster_id, instance_ids, batch_size=10):
    """
    批量删除节点（分批）
    
    Args:
        client: TKE 客户端
        cluster_id: 集群 ID
        instance_ids: 节点 ID 列表
        batch_size: 每批删除数量
    """
    for i in range(0, len(instance_ids), batch_size):
        batch = instance_ids[i:i+batch_size]
        
        req = models.DeleteClusterInstancesRequest()
        req.ClusterId = cluster_id
        req.InstanceIds = batch
        
        try:
            resp = client.DeleteClusterInstances(req)
            print(f"批次 {i//batch_size + 1}: 已提交删除 {len(batch)} 个节点")
            print(f"  RequestId: {resp.RequestId}")
        except Exception as e:
            print(f"批次 {i//batch_size + 1} 删除失败: {e}")
        
        # 等待一段时间再提交下一批
        time.sleep(5)

# 使用示例
nodes_to_delete = ["ins-xxx", "ins-yyy", "ins-zzz", "ins-aaa", "ins-bbb"]
batch_delete_nodes(client, "cls-xxxxxxxx", nodes_to_delete)
```

### 安全删除节点（带 Pod 检查）

```python
def safe_delete_node(client, cluster_id, instance_id):
    """
    安全删除节点（先驱逐 Pod）
    
    Args:
        client: TKE 客户端
        cluster_id: 集群 ID
        instance_id: 节点 ID
    """
    import subprocess
    
    # 1. 获取节点名称
    # 需要先查询节点列表获取节点名称
    
    # 2. 设置节点不可调度
    subprocess.run(["kubectl", "cordon", node_name], check=True)
    print(f"节点 {node_name} 已设置为不可调度")
    
    # 3. 驱逐 Pod
    subprocess.run([
        "kubectl", "drain", node_name,
        "--ignore-daemonsets",
        "--delete-emptydir-data",
        "--force",
        "--timeout=300s"
    ], check=True)
    print(f"节点 {node_name} 上的 Pod 已驱逐")
    
    # 4. 删除节点
    req = models.DeleteClusterInstancesRequest()
    req.ClusterId = cluster_id
    req.InstanceIds = [instance_id]
    
    resp = client.DeleteClusterInstances(req)
    print(f"节点删除请求已提交，RequestId: {resp.RequestId}")
```

### 按标签删除节点

```python
def delete_nodes_by_label(client, cluster_id, label_selector):
    """
    根据标签删除节点
    
    Args:
        client: TKE 客户端
        cluster_id: 集群 ID
        label_selector: 标签选择器（如 "env=test"）
    """
    import subprocess
    import json
    
    # 1. 使用 kubectl 查询匹配标签的节点
    result = subprocess.run(
        ["kubectl", "get", "nodes", "-l", label_selector, "-o", "json"],
        capture_output=True,
        text=True,
        check=True
    )
    
    nodes_data = json.loads(result.stdout)
    
    # 2. 提取节点的 instance-id
    instance_ids = []
    for node in nodes_data.get("items", []):
        provider_id = node["spec"]["providerID"]  # 格式: qcloud:///ap-guangzhou/ins-xxx
        instance_id = provider_id.split("/")[-1]
        instance_ids.append(instance_id)
    
    print(f"找到 {len(instance_ids)} 个匹配标签 '{label_selector}' 的节点")
    
    # 3. 删除节点
    if instance_ids:
        req = models.DeleteClusterInstancesRequest()
        req.ClusterId = cluster_id
        req.InstanceIds = instance_ids
        
        resp = client.DeleteClusterInstances(req)
        print(f"删除请求已提交，RequestId: {resp.RequestId}")

# 使用示例
delete_nodes_by_label(client, "cls-xxxxxxxx", "env=test")
```

---

## Agent Prompt 模板

### 基础删除 Prompt

```prompt
请帮我从 TKE 集群中删除节点：
- 集群 ID：{{cluster_id}}
- 节点 ID：{{instance_id}}
- 删除模式：销毁 CVM 实例
- 确认删除后验证节点是否已移除
```

### 安全删除 Prompt

```prompt
请帮我安全地删除 TKE 集群节点（避免服务中断）：
- 集群 ID：cls-xxxxxxxx
- 节点 ID：ins-xxxxxxxx
- 操作步骤：
  1. 设置节点不可调度
  2. 驱逐节点上的 Pod
  3. 等待 Pod 重新调度完成
  4. 删除节点
  5. 验证删除成功
```

### 批量删除 Prompt

```prompt
请帮我批量删除 TKE 集群中的测试节点：
- 集群 ID：cls-xxxxxxxx
- 节点标签：env=test
- 操作：
  1. 查询所有带 env=test 标签的节点
  2. 分批删除（每批 5 个）
  3. 保留 CVM 实例
```

---

## 最佳实践

1. **生产环境谨慎操作**:
   - 删除前先设置节点不可调度（`kubectl cordon`）
   - 手动驱逐 Pod（`kubectl drain`）
   - 确认 Pod 重新调度成功后再删除节点

2. **避免服务中断**:
   - 确保集群有足够的剩余容量
   - 检查 Pod 副本数和 PDB 配置
   - 分批删除节点，避免同时删除多个节点

3. **数据备份**:
   - 删除前备份节点本地存储数据
   - 使用 `retain` 模式保留 CVM（如需保留数据）

4. **监控和验证**:
   - 删除后监控 Pod 状态
   - 检查服务可用性
   - 确认节点和 CVM 已删除

5. **异常节点处理**:
   - 对于无法正常驱逐的节点，使用 `ForceDelete=true`
   - 删除后检查集群事件，确认无异常

6. **节点标签管理**:
   - 为节点打上环境标签（如 `env=prod`、`env=test`）
   - 使用标签批量管理节点生命周期

---

## 相关文档

- [添加节点到集群](./01-add-node.md)
- [查询节点列表](./04-describe-nodes.md)
- [驱逐节点 Pod](./03-drain-node.md)
- [节点池管理](../nodepool/01-create-nodepool.md)

---

## API 文档链接

- **API 文档**: https://cloud.tencent.com/document/api/457/36704
- **SDK 文档**: https://cloud.tencent.com/document/sdk
- **API Explorer**: https://console.cloud.tencent.com/api/explorer?Product=tke&Version=2018-05-25&Action=DeleteClusterInstances

---

## Cookbook 示例

完整可执行代码示例: [TKE 节点删除 Cookbook](../../cookbook/delete-node-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2026-01-07  
**维护者**: TKE Documentation Team
