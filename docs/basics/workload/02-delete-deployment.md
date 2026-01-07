# 删除 Deployment (DeleteDeployment)

## 功能概述

删除 TKE 集群中的 Deployment 工作负载。删除 Deployment 会级联删除其管理的所有 Pod（除非配置为孤儿删除）。

**API 名称**: 无（使用 kubectl 或 Kubernetes API）  
**功能优先级**: P0（核心功能）  
**适用场景**: 应用下线、版本回退、资源清理

---

## 前置条件

### 必须满足
- [ ] 已创建 TKE 集群（集群状态为 Running）
- [ ] 已获取集群访问凭证（kubeconfig）
- [ ] 已安装 kubectl 客户端工具（版本 ≥ 1.20）
- [ ] 目标 Deployment 存在

### 可选条件
- [ ] 已备份 Deployment YAML 配置（方便后续恢复）
- [ ] 已确认无业务依赖（避免误删）

---

## 检查清单

在开始前，请确认：

1. **确认目标 Deployment**
   ```bash
   kubectl get deployment -n <namespace>
   kubectl describe deployment <deployment-name> -n <namespace>
   ```
   期望结果：找到目标 Deployment 并确认名称正确

2. **检查依赖关系**
   ```bash
   # 查看关联的 Service
   kubectl get svc -n <namespace> -l app=<app-label>
   
   # 查看关联的 Ingress
   kubectl get ingress -n <namespace>
   ```
   期望结果：了解删除影响范围

3. **备份配置**（可选）
   ```bash
   kubectl get deployment <deployment-name> -n <namespace> -o yaml > deployment-backup.yaml
   ```
   期望结果：配置已保存到本地文件

4. **确认删除策略**
   - **级联删除**（默认）：删除 Deployment 及其管理的所有 Pod
   - **孤儿删除**：仅删除 Deployment，保留 Pod（不推荐）

---

## 操作步骤

### 方式 1: 使用 kubectl（推荐）

#### Step 1: 删除 Deployment

```bash
kubectl delete deployment <deployment-name> -n <namespace>
```

期望输出：
```
deployment.apps "nginx-deployment" deleted
```

#### Step 2: 验证删除

```bash
# 确认 Deployment 已删除
kubectl get deployment <deployment-name> -n <namespace>

# 确认 Pod 已被清理
kubectl get pods -l app=<app-label> -n <namespace>
```

期望输出：
```
Error from server (NotFound): deployments.apps "nginx-deployment" not found
No resources found in default namespace.
```

---

### 方式 2: 使用 YAML 文件删除

如果有原始的 YAML 配置文件：

```bash
kubectl delete -f deployment.yaml
```

---

### 方式 3: 使用标签选择器批量删除

```bash
# 删除所有带有特定标签的 Deployment
kubectl delete deployment -l app=nginx -n <namespace>

# 删除所有 Deployment（危险操作，慎用！）
kubectl delete deployment --all -n <namespace>
```

---

### 方式 4: 使用 Python Kubernetes Client

```python
from kubernetes import client, config
from kubernetes.client.rest import ApiException

# 加载 kubeconfig
config.load_kube_config()

# 创建 API 客户端
apps_v1 = client.AppsV1Api()

def delete_deployment(name, namespace="default"):
    """删除 Deployment"""
    try:
        # 删除 Deployment（级联删除 Pod）
        response = apps_v1.delete_namespaced_deployment(
            name=name,
            namespace=namespace,
            propagation_policy='Foreground'  # 前台级联删除
        )
        
        print(f"✅ Deployment '{name}' deleted successfully")
        print(f"   Namespace: {namespace}")
        
        # 等待 Pod 清理完成
        print(f"⏳ Waiting for Pods to be deleted...")
        core_v1 = client.CoreV1Api()
        while True:
            pods = core_v1.list_namespaced_pod(
                namespace=namespace,
                label_selector=f"app={name}"
            )
            if len(pods.items) == 0:
                print(f"✅ All Pods deleted")
                break
            print(f"   Remaining Pods: {len(pods.items)}")
            import time
            time.sleep(2)
        
        return True
        
    except ApiException as e:
        if e.status == 404:
            print(f"❌ Error: Deployment '{name}' not found")
        else:
            print(f"❌ Error deleting Deployment: {e}")
        return False

# 示例调用
delete_deployment("nginx-deployment", "default")
```

---

### 方式 5: 使用 Go Kubernetes Client

```go
package main

import (
    "context"
    "fmt"
    "time"
    
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func main() {
    // 加载 kubeconfig
    config, err := clientcmd.BuildConfigFromFlags("", "/path/to/kubeconfig")
    if err != nil {
        panic(err)
    }
    
    // 创建客户端
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err)
    }
    
    // 删除 Deployment
    deploymentName := "nginx-deployment"
    namespace := "default"
    
    deletePolicy := metav1.DeletePropagationForeground
    deleteOptions := metav1.DeleteOptions{
        PropagationPolicy: &deletePolicy,
    }
    
    err = clientset.AppsV1().Deployments(namespace).Delete(
        context.TODO(),
        deploymentName,
        deleteOptions,
    )
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("✅ Deployment '%s' deleted successfully\n", deploymentName)
    
    // 等待 Pod 清理完成
    fmt.Println("⏳ Waiting for Pods to be deleted...")
    for {
        pods, err := clientset.CoreV1().Pods(namespace).List(
            context.TODO(),
            metav1.ListOptions{
                LabelSelector: fmt.Sprintf("app=%s", deploymentName),
            },
        )
        if err != nil {
            panic(err)
        }
        
        if len(pods.Items) == 0 {
            fmt.Println("✅ All Pods deleted")
            break
        }
        
        fmt.Printf("   Remaining Pods: %d\n", len(pods.Items))
        time.Sleep(2 * time.Second)
    }
}
```

---

## 高级选项

### 1. 孤儿删除（仅删除 Deployment，保留 Pod）

```bash
kubectl delete deployment <deployment-name> \
  --cascade=orphan \
  -n <namespace>
```

**使用场景**：
- 需要重新创建 Deployment 但保留现有 Pod
- 调试和故障排查

**注意**：孤儿 Pod 不会被自动管理，需要手动清理！

### 2. 强制立即删除（危险）

```bash
kubectl delete deployment <deployment-name> \
  --grace-period=0 \
  --force \
  -n <namespace>
```

**使用场景**：
- Deployment 卡在 Terminating 状态
- 紧急清理资源

**风险**：可能导致数据丢失或服务异常！

### 3. 批量删除（按标签）

```bash
# 删除所有 app=nginx 的 Deployment
kubectl delete deployment -l app=nginx -n <namespace>

# 删除所有环境为 dev 的 Deployment
kubectl delete deployment -l env=dev -n <namespace>
```

### 4. 删除前导出配置

```bash
# 导出并删除
kubectl get deployment <deployment-name> -n <namespace> -o yaml > backup.yaml && \
kubectl delete deployment <deployment-name> -n <namespace>
```

---

## 验证步骤

### 1. 确认 Deployment 已删除

```bash
kubectl get deployment <deployment-name> -n <namespace>
```

期望输出：
```
Error from server (NotFound): deployments.apps "nginx-deployment" not found
```

### 2. 确认 Pod 已清理

```bash
kubectl get pods -l app=<app-label> -n <namespace>
```

期望输出：
```
No resources found in default namespace.
```

### 3. 确认 ReplicaSet 已清理

```bash
kubectl get replicaset -l app=<app-label> -n <namespace>
```

期望输出：
```
No resources found in default namespace.
```

### 4. 检查事件日志

```bash
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

查看是否有删除相关的事件。

---

## 异常处理

### 常见错误

| 错误现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| `NotFound` | Deployment 不存在 | 检查名称和命名空间是否正确 |
| `Forbidden` | 权限不足 | 检查 RBAC 权限配置 |
| Deployment 卡在 `Terminating` | Finalizer 阻塞或 Pod 无法删除 | 使用强制删除或手动清理 Finalizer |
| Pod 无法删除 | 节点异常或 Volume 卸载失败 | 检查节点状态，强制删除 Pod |
| `Unauthorized` | kubeconfig 过期或无效 | 重新获取集群访问凭证 |

### 故障排查步骤

#### 1. 检查 Deployment 状态

```bash
kubectl describe deployment <deployment-name> -n <namespace>
```

查看 `Status` 和 `Events` 部分。

#### 2. 检查 Pod 状态

```bash
kubectl get pods -l app=<app-label> -n <namespace>
kubectl describe pod <pod-name> -n <namespace>
```

#### 3. 强制删除卡住的 Deployment

```bash
# 移除 Finalizer
kubectl patch deployment <deployment-name> \
  -n <namespace> \
  -p '{"metadata":{"finalizers":[]}}' \
  --type=merge

# 强制删除
kubectl delete deployment <deployment-name> \
  --grace-period=0 \
  --force \
  -n <namespace>
```

#### 4. 手动清理残留的 ReplicaSet

```bash
kubectl delete replicaset -l app=<app-label> -n <namespace>
```

#### 5. 手动清理残留的 Pod

```bash
kubectl delete pod -l app=<app-label> --force --grace-period=0 -n <namespace>
```

---

## 最佳实践

### 1. 删除前备份

```bash
# 导出完整配置
kubectl get deployment <deployment-name> -n <namespace> -o yaml > deployment-backup.yaml

# 或使用 kubectl-neat 导出干净的配置
kubectl get deployment <deployment-name> -n <namespace> -o yaml | kubectl neat > deployment-backup.yaml
```

### 2. 分阶段删除（生产环境）

```bash
# Step 1: 缩容到 0
kubectl scale deployment <deployment-name> --replicas=0 -n <namespace>

# Step 2: 观察业务影响（等待 5-10 分钟）
kubectl get pods -l app=<app-label> -n <namespace>

# Step 3: 确认无影响后删除
kubectl delete deployment <deployment-name> -n <namespace>
```

### 3. 使用标签管理

```yaml
metadata:
  labels:
    app: myapp
    env: production
    version: v1.0
    managed-by: terraform
```

删除时使用标签选择器：
```bash
kubectl delete deployment -l app=myapp,env=dev -n <namespace>
```

### 4. 结合监控告警

删除前检查监控指标：
- 服务 QPS
- 错误率
- 资源使用率

---

## Agent Prompt 模板

### Prompt 1: 基础删除

```prompt
请删除 TKE 集群中的 Deployment：
- 集群 ID: {{cluster_id}}
- 命名空间: {{namespace}}
- Deployment 名称: {{deployment_name}}
- 删除前备份配置
```

### Prompt 2: 安全删除

```prompt
请安全删除 TKE 集群中的 Deployment：
- 集群 ID: {{cluster_id}}
- 命名空间: {{namespace}}
- Deployment 名称: {{deployment_name}}
- 删除步骤:
  1. 导出配置到本地
  2. 缩容到 0 副本
  3. 等待 5 分钟观察业务影响
  4. 确认无影响后删除
  5. 验证清理完成
```

### Prompt 3: 批量删除

```prompt
请批量删除 TKE 集群中的 Deployment：
- 集群 ID: {{cluster_id}}
- 命名空间: {{namespace}}
- 删除条件: env=dev 且 version=v1.0
- 删除前导出所有配置
- 逐个删除并验证
```

---

## 相关文档

- [创建 Deployment](./01-create-deployment.md)
- [更新 Deployment](./03-update-deployment.md)
- [删除节点](../node/02-delete-node.md)
- [删除集群](../cluster/02-delete-cluster.md)

---

## Cookbook 示例

完整可执行示例：[delete-deployment-example.py](../../cookbook/delete-deployment-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2025-12-25  
**适用 TKE 版本**: ≥ 1.20
