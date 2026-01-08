# 如何删除超级节点

## 文档元信息

- **功能名称**: 删除超级节点
- **API 版本**: 2018-05-25
- **适用集群版本**: 所有版本
- **文档更新时间**: 2026-01-07
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

从 TKE 集群中删除指定的虚拟节点（Virtual Node），释放 Serverless 资源。

**核心功能**:
- **单个删除**: 删除指定的虚拟节点
- **批量删除**: 同时删除多个虚拟节点
- **强制删除**: 即使节点上有运行中的 Pod 也执行删除
- **安全删除**: 默认检查节点上是否有 Pod，有则拒绝删除

**任务目标**: 安全地删除不再使用的虚拟节点，释放资源

---

## 前置条件

- [ ] 集群状态为 `Running`
- [ ] 虚拟节点存在且可访问
- [ ] 已获取虚拟节点名称（NodeName）
- [ ] 确认节点上的 Pod 可以被安全删除（非强制删除时）

---

## 操作步骤

### Step 1: 查询虚拟节点列表

在删除前，先确认要删除的节点名称:

```bash
# 查看所有虚拟节点
kubectl get nodes -l type=virtual-kubelet

# 查看节点详情
kubectl describe node eklet-subnet-xxxxxxxx-0

# 查看节点上运行的 Pod
kubectl get pods --all-namespaces -o wide --field-selector spec.nodeName=eklet-subnet-xxxxxxxx-0
```

### Step 2: 准备删除参数

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|------|------|------|--------|
| ClusterId | 是 | String | 集群 ID | cls-xxxxxxxx |
| NodeNames | 是 | Array | 虚拟节点名称列表 | ["eklet-subnet-xxx-0"] |
| Force | 否 | Boolean | 是否强制删除 | false (默认) |

**Force 参数说明**:
- `false` (默认): 非强制删除，如果节点上有运行中的 Pod，操作将失败
- `true`: 强制删除，即使节点上有运行中的 Pod 也会执行删除

### Step 3: 调用 DeleteClusterVirtualNode API

**方式一: 安全删除（推荐）**

```bash
# 使用腾讯云 CLI - 默认安全删除
tccli tke DeleteClusterVirtualNode \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodeNames '["eklet-subnet-xxxxxxxx-0"]'
```

**方式二: 强制删除（谨慎使用）**

```bash
# 强制删除，即使有运行中的 Pod
tccli tke DeleteClusterVirtualNode \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodeNames '["eklet-subnet-xxxxxxxx-0"]' \
  --Force true
```

**使用 Python SDK**:

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import tke_client, models

cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

req = models.DeleteClusterVirtualNodeRequest()
req.ClusterId = "cls-xxxxxxxx"
req.NodeNames = ["eklet-subnet-xxxxxxxx-0"]
req.Force = False  # 安全删除

resp = client.DeleteClusterVirtualNode(req)
print(f"删除成功, 请求ID: {resp.RequestId}")
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

    request := tke.NewDeleteClusterVirtualNodeRequest()
    request.ClusterId = common.StringPtr("cls-xxxxxxxx")
    request.NodeNames = common.StringPtrs([]string{"eklet-subnet-xxxxxxxx-0"})
    request.Force = common.BoolPtr(false)

    response, err := client.DeleteClusterVirtualNode(request)
    if err != nil {
        panic(err)
    }
    fmt.Printf("删除成功, 请求ID: %s\n", *response.Response.RequestId)
}
```

**批量删除虚拟节点**:

```python
# 批量删除多个虚拟节点
req = models.DeleteClusterVirtualNodeRequest()
req.ClusterId = "cls-xxxxxxxx"
req.NodeNames = [
    "eklet-subnet-xxxxxxx1-0",
    "eklet-subnet-xxxxxxx2-0",
    "eklet-subnet-xxxxxxx3-0"
]
req.Force = False

resp = client.DeleteClusterVirtualNode(req)
```

### Step 4: 获取响应

**成功响应**:

```json
{
  "Response": {
    "RequestId": "1ac0d3ae-063e-4789-93fe-3c73e93191b9"
  }
}
```

---

## 验证步骤

### Step 1: 验证节点已删除

```bash
# 查看节点列表，确认节点已不存在
kubectl get nodes -l type=virtual-kubelet

# 查看特定节点（应该返回 Not Found）
kubectl get node eklet-subnet-xxxxxxxx-0
```

**期望结果**:

```
Error from server (NotFound): nodes "eklet-subnet-xxxxxxxx-0" not found
```

### Step 2: 验证 Pod 状态

如果是强制删除，检查原节点上的 Pod 状态:

```bash
# 查看所有 Pod 状态
kubectl get pods --all-namespaces -o wide

# Pod 应该已被终止或重新调度到其他节点
```

### Step 3: 查看集群事件

```bash
# 查看最近的集群事件
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | tail -20
```

---

## 安全删除流程

### 推荐的完整删除流程

**Step 1: 驱逐节点上的 Pod**

```bash
# 标记节点为不可调度
kubectl cordon eklet-subnet-xxxxxxxx-0

# 驱逐节点上的 Pod（Graceful Eviction）
kubectl drain eklet-subnet-xxxxxxxx-0 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force \
  --grace-period=300
```

**Step 2: 确认 Pod 已迁移**

```bash
# 确认节点上已无 Pod
kubectl get pods --all-namespaces -o wide \
  --field-selector spec.nodeName=eklet-subnet-xxxxxxxx-0
```

**Step 3: 删除虚拟节点**

```bash
# 安全删除节点
tccli tke DeleteClusterVirtualNode \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodeNames '["eklet-subnet-xxxxxxxx-0"]'
```

---

## 异常处理

### 常见错误及解决方案

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|---------|
| ResourceInUse.ExistRunningPod | 存在运行中的 Pod | 节点上有运行中的 Pod | 先驱逐 Pod 或使用强制删除 |
| ResourceUnavailable.ClusterState | 集群状态异常 | 集群状态不支持操作 | 等待集群状态恢复正常 |
| InvalidParameter.Param | 参数错误 | 参数格式或取值错误 | 检查参数格式 |
| InternalError.UnexpectedInternal | 未知内部错误 | 服务端错误 | 稍后重试或联系技术支持 |
| ResourceNotFound.NodeNotFound | 节点不存在 | 节点已被删除或不存在 | 确认节点名称正确 |

### 删除失败处理

**场景 1: 节点上有运行中的 Pod**

```bash
# 1. 查看节点上的 Pod
kubectl get pods --all-namespaces -o wide \
  --field-selector spec.nodeName=eklet-subnet-xxxxxxxx-0

# 2. 驱逐 Pod
kubectl drain eklet-subnet-xxxxxxxx-0 \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force

# 3. 重新执行删除
tccli tke DeleteClusterVirtualNode \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodeNames '["eklet-subnet-xxxxxxxx-0"]'
```

**场景 2: 紧急情况需要强制删除**

```bash
# 使用强制删除（会直接终止 Pod）
tccli tke DeleteClusterVirtualNode \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodeNames '["eklet-subnet-xxxxxxxx-0"]' \
  --Force true
```

**注意**: 强制删除会立即终止节点上的所有 Pod，可能导致服务中断，请谨慎使用。

---

## 高级配置

### 批量安全删除脚本

```bash
#!/bin/bash

CLUSTER_ID="cls-xxxxxxxx"
REGION="ap-guangzhou"
NODE_NAMES=(
  "eklet-subnet-xxxxxxx1-0"
  "eklet-subnet-xxxxxxx2-0"
  "eklet-subnet-xxxxxxx3-0"
)

for node in "${NODE_NAMES[@]}"; do
  echo "处理节点: $node"
  
  # 驱逐 Pod
  kubectl drain $node \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --force \
    --grace-period=300
  
  if [ $? -eq 0 ]; then
    echo "驱逐成功，开始删除节点"
    
    # 删除节点
    tccli tke DeleteClusterVirtualNode \
      --Region $REGION \
      --ClusterId $CLUSTER_ID \
      --NodeNames "[\"$node\"]"
    
    echo "节点 $node 删除完成"
  else
    echo "节点 $node 驱逐失败，跳过删除"
  fi
  
  sleep 5
done
```

### 删除前的健康检查

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import tke_client, models
import subprocess

def check_node_pods(node_name):
    """检查节点上是否有运行中的 Pod"""
    cmd = f"kubectl get pods --all-namespaces -o wide --field-selector spec.nodeName={node_name}"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    return result.stdout.strip()

def delete_virtual_node_safely(cluster_id, node_name, force=False):
    """安全删除虚拟节点"""
    # 检查节点上的 Pod
    pods = check_node_pods(node_name)
    
    if pods and not force:
        print(f"警告: 节点 {node_name} 上有运行中的 Pod:")
        print(pods)
        confirm = input("是否继续删除? (yes/no): ")
        if confirm.lower() != 'yes':
            print("取消删除操作")
            return
    
    # 执行删除
    cred = credential.Credential("SecretId", "SecretKey")
    client = tke_client.TkeClient(cred, "ap-guangzhou")
    
    req = models.DeleteClusterVirtualNodeRequest()
    req.ClusterId = cluster_id
    req.NodeNames = [node_name]
    req.Force = force
    
    try:
        resp = client.DeleteClusterVirtualNode(req)
        print(f"删除成功, 请求ID: {resp.RequestId}")
    except Exception as e:
        print(f"删除失败: {e}")

# 使用示例
delete_virtual_node_safely("cls-xxxxxxxx", "eklet-subnet-xxxxxxxx-0")
```

---

## Agent Prompt 模板

### 安全删除虚拟节点 Prompt

```prompt
请安全删除虚拟节点:
- 集群ID: {{cluster_id}}
- 节点名称: {{node_name}}
- 删除方式: 安全删除（先驱逐 Pod）
```

### 强制删除虚拟节点 Prompt

```prompt
请强制删除虚拟节点（紧急情况）:
- 集群ID: cls-xxxxxxxx
- 节点名称: eklet-subnet-xxxxxxxx-0
- 删除方式: 强制删除
- 注意: 会立即终止节点上的所有 Pod
```

### 批量删除虚拟节点 Prompt

```prompt
请批量删除以下虚拟节点:
- 集群ID: cls-xxxxxxxx
- 节点列表: eklet-subnet-xxx1-0, eklet-subnet-xxx2-0, eklet-subnet-xxx3-0
- 删除前先驱逐所有 Pod
```

---

## 最佳实践

1. **删除前检查**:
   - 始终先查看节点上的 Pod 状态
   - 确认业务可以被安全迁移
   - 检查是否有 StatefulSet 或持久化数据

2. **优雅驱逐**:
   - 使用 `kubectl drain` 优雅驱逐 Pod
   - 设置合理的 grace-period（如 300s）
   - 使用 `--ignore-daemonsets` 忽略 DaemonSet

3. **删除策略**:
   - 生产环境推荐使用安全删除（Force=false）
   - 仅在紧急情况下使用强制删除
   - 批量删除时逐个处理，避免大规模中断

4. **监控和验证**:
   - 删除后验证节点已从集群中移除
   - 检查 Pod 是否成功重新调度
   - 查看集群事件确认无异常

5. **自动化清理**:
   - 使用脚本批量清理不用的虚拟节点
   - 定期检查并清理闲置节点
   - 结合监控系统自动化运维

---

## 相关文档

- [创建超级节点池](./01-create-supernode-pool.md)
- [创建按量超级节点](./02-create-supernode.md)
- [查询超级节点池](./04-describe-supernode-pools.md)
- [普通节点删除](../node/02-delete-node.md)

---

## API 文档链接

- **DeleteClusterVirtualNode**: https://cloud.tencent.com/document/api/457/85353
- **API Explorer**: https://console.cloud.tencent.com/api/explorer?Product=tke&Version=2018-05-25&Action=DeleteClusterVirtualNode

---

## Cookbook 示例

完整可执行代码示例: [TKE 超级节点删除 Cookbook](../../cookbook/delete-supernode-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2026-01-07  
**维护者**: TKE Documentation Team
