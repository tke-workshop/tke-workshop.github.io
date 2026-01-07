# 删除 Deployment（工作负载）

## 功能概述

删除 TKE 集群中的 Deployment 及其管理的所有 Pod。删除操作会清理 Deployment、ReplicaSet 和 Pod 资源，但不会删除关联的 Service、ConfigMap、Secret 等资源。

**核心特性**：
- 🗑️ **级联删除**：自动删除 ReplicaSet 和 Pod
- ⚡ **快速清理**：支持立即删除和优雅终止
- 🛡️ **保留关联资源**：不影响 Service、ConfigMap 等
- 📝 **可恢复**：删除前可导出配置用于恢复

**适用场景**：
- ✅ 下线不再使用的应用
- ✅ 清理测试/开发环境
- ✅ 重新部署应用
- ✅ 释放集群资源

**相关文档**：
- [创建 Deployment](./01-create-deployment.md)
- [更新 Deployment](./02-update-deployment.md)

---

## 前置条件

在删除 Deployment 前，请确认：

- [ ] **Deployment 已存在**
  - 可以通过 `kubectl get deployment` 查看
  
- [ ] **已配置访问凭证**
  - 已获取 kubeconfig 文件
  - 本地已安装 kubectl 客户端

- [ ] **了解删除影响**
  - 确认应用可以下线
  - 评估对其他服务的影响
  - 是否需要备份配置

- [ ] **检查关联资源**（可选）
  - 是否有关联的 Service 需要删除
  - 是否有关联的 ConfigMap/Secret 需要删除
  - 是否有关联的 Ingress 需要删除

---

## 检查清单

在开始前，请确认：

### 1. Deployment 状态检查
```bash
# 查看 Deployment
kubectl get deployment <deployment-name>

# 查看关联的 Pod
kubectl get pods -l app=<label>

# 查看关联的 ReplicaSet
kubectl get replicaset -l app=<label>
```

### 2. 检查关联资源
```bash
# 查看关联的 Service
kubectl get service -l app=<label>

# 查看关联的 Ingress
kubectl get ingress -l app=<label>

# 查看关联的 ConfigMap
kubectl get configmap -l app=<label>

# 查看关联的 Secret
kubectl get secret -l app=<label>
```

### 3. 备份配置（推荐）
```bash
# 导出 Deployment 配置
kubectl get deployment <deployment-name> -o yaml > deployment-backup.yaml

# 导出关联资源配置
kubectl get service,configmap,secret -l app=<label> -o yaml > resources-backup.yaml
```

---

## 操作步骤

### 方式 1：使用 kubectl delete（标准删除）

删除单个 Deployment（推荐）。

```bash
# 删除 Deployment
kubectl delete deployment <deployment-name>

# 示例
kubectl delete deployment nginx-deployment

# 指定命名空间
kubectl delete deployment <deployment-name> -n <namespace>
```

**输出示例**：
```
deployment.apps "nginx-deployment" deleted
```

---

### 方式 2：使用 YAML 文件删除

适用于批量删除或重复操作。

```bash
# 删除 YAML 文件中定义的资源
kubectl delete -f deployment.yaml

# 删除目录下的所有资源
kubectl delete -f ./manifests/
```

---

### 方式 3：使用标签选择器删除

适用于批量删除多个 Deployment。

```bash
# 删除匹配标签的所有 Deployment
kubectl delete deployment -l app=<label>

# 示例：删除所有标签为 env=test 的 Deployment
kubectl delete deployment -l env=test

# 删除所有 Deployment（危险操作，慎用）
kubectl delete deployment --all
```

---

### 方式 4：立即强制删除

适用于 Deployment 无法正常删除的情况。

```bash
# 强制立即删除（跳过优雅终止）
kubectl delete deployment <deployment-name> --grace-period=0 --force

# 警告：此操作会立即终止所有 Pod，可能导致数据丢失
```

---

### 方式 5：删除 Deployment 但保留 Pod

适用于需要手动清理 Pod 的场景。

```bash
# 删除 Deployment 但不删除 Pod
kubectl delete deployment <deployment-name> --cascade=orphan

# 此时 Pod 会变成"孤儿"，不再被 Deployment 管理
# 需要手动删除 Pod
kubectl delete pod -l app=<label>
```

---

### 方式 6：使用 Kubernetes Python SDK

适用于自动化和编程场景。

```python
from kubernetes import client, config
from kubernetes.client.rest import ApiException

def delete_deployment(namespace="default", name="nginx-deployment"):
    """
    删除 Deployment
    
    Args:
        namespace: 命名空间
        name: Deployment 名称
    """
    config.load_kube_config()
    apps_v1 = client.AppsV1Api()
    
    try:
        # 删除 Deployment
        resp = apps_v1.delete_namespaced_deployment(
            name=name,
            namespace=namespace,
            body=client.V1DeleteOptions(
                propagation_policy='Foreground',  # 前台删除（等待 Pod 删除完成）
                grace_period_seconds=30          # 优雅终止时间
            )
        )
        
        print(f"✅ Deployment '{name}' 删除成功")
        print(f"   命名空间: {namespace}")
        return resp
    except ApiException as e:
        if e.status == 404:
            print(f"❌ Deployment '{name}' 不存在")
        else:
            print(f"❌ 删除失败: {e}")
        raise

# 使用示例
if __name__ == "__main__":
    delete_deployment(
        namespace="default",
        name="nginx-deployment"
    )
```

---

## 验证步骤

删除 Deployment 后，通过以下步骤验证：

### 1. 验证 Deployment 已删除

```bash
# 查看 Deployment
kubectl get deployment <deployment-name>

# 期望输出：
# Error from server (NotFound): deployments.apps "nginx-deployment" not found
```

### 2. 验证 Pod 已删除

```bash
# 查看 Pod
kubectl get pods -l app=<label>

# 期望输出：
# No resources found in default namespace.
```

### 3. 验证 ReplicaSet 已删除

```bash
# 查看 ReplicaSet
kubectl get replicaset -l app=<label>

# 期望输出：
# No resources found in default namespace.
```

### 4. 检查关联资源是否保留

```bash
# 查看 Service（应该保留）
kubectl get service -l app=<label>

# 查看 ConfigMap（应该保留）
kubectl get configmap -l app=<label>

# 查看 Secret（应该保留）
kubectl get secret -l app=<label>
```

---

## 清理关联资源

Deployment 删除后，关联资源不会自动删除，需要手动清理。

### 1. 删除 Service

```bash
# 删除关联的 Service
kubectl delete service -l app=<label>

# 或删除特定 Service
kubectl delete service <service-name>
```

### 2. 删除 ConfigMap

```bash
# 删除关联的 ConfigMap
kubectl delete configmap -l app=<label>

# 或删除特定 ConfigMap
kubectl delete configmap <configmap-name>
```

### 3. 删除 Secret

```bash
# 删除关联的 Secret
kubectl delete secret -l app=<label>

# 或删除特定 Secret
kubectl delete secret <secret-name>
```

### 4. 删除 Ingress

```bash
# 删除关联的 Ingress
kubectl delete ingress -l app=<label>

# 或删除特定 Ingress
kubectl delete ingress <ingress-name>
```

### 5. 批量删除所有关联资源

```bash
# 删除所有关联资源（Deployment、Service、ConfigMap、Secret 等）
kubectl delete deployment,service,configmap,secret,ingress -l app=<label>
```

---

## 恢复删除的 Deployment

如果误删了 Deployment，可以通过备份配置恢复。

### 方式 1：使用备份的 YAML 文件

```bash
# 重新创建 Deployment
kubectl apply -f deployment-backup.yaml

# 验证恢复
kubectl get deployment <deployment-name>
kubectl get pods -l app=<label>
```

### 方式 2：从 Git 仓库恢复

```bash
# 从 Git 拉取配置文件
git pull origin main

# 重新部署
kubectl apply -f ./manifests/deployment.yaml
```

### 方式 3：从镜像仓库重新部署

```bash
# 快速创建 Deployment
kubectl create deployment <deployment-name> \
  --image=<image>:<tag> \
  --replicas=<number>

# 导出配置文件
kubectl get deployment <deployment-name> -o yaml > deployment.yaml
```

---

## 异常处理

| 错误现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| `NotFound` | Deployment 不存在 | 1. 检查 Deployment 名称拼写<br>2. 检查命名空间是否正确<br>3. 使用 `kubectl get deployment --all-namespaces` 查找 |
| 删除卡住 | Pod 无法终止 | 1. 查看 Pod 状态 `kubectl describe pod <pod-name>`<br>2. 强制删除 `kubectl delete pod <pod-name> --grace-period=0 --force`<br>3. 检查 Pod 中是否有 finalizers |
| `Forbidden` | 权限不足 | 1. 检查 RBAC 权限<br>2. 使用管理员账号<br>3. 联系集群管理员 |
| Pod 未删除 | 使用了 `--cascade=orphan` | 手动删除 Pod `kubectl delete pod -l app=<label>` |

### 常见错误排查

#### 错误 1: Deployment 不存在

```bash
# 问题现象
kubectl delete deployment nginx-deployment
# Error from server (NotFound): deployments.apps "nginx-deployment" not found

# 排查步骤
# 1. 检查所有命名空间
kubectl get deployment --all-namespaces | grep nginx

# 2. 检查名称是否正确
kubectl get deployment | grep nginx

# 3. 可能已经删除
kubectl get events | grep nginx-deployment
```

#### 错误 2: 删除卡住，Pod 无法终止

```bash
# 问题现象
kubectl delete deployment nginx-deployment
# (长时间无响应)

# 排查步骤
# 1. 查看 Pod 状态
kubectl get pods -l app=nginx

# 输出示例：
# NAME                     READY   STATUS        RESTARTS   AGE
# nginx-xxx                1/1     Terminating   0          5m

# 2. 查看 Pod 详情
kubectl describe pod nginx-xxx | grep -A 10 "Events:"

# 3. 检查是否有 finalizers
kubectl get pod nginx-xxx -o jsonpath='{.metadata.finalizers}'

# 解决方案
# 方案 1: 等待优雅终止完成（默认 30 秒）

# 方案 2: 强制删除 Pod
kubectl delete pod nginx-xxx --grace-period=0 --force

# 方案 3: 移除 finalizers
kubectl patch pod nginx-xxx -p '{"metadata":{"finalizers":null}}'

# 方案 4: 强制删除 Deployment
kubectl delete deployment nginx-deployment --grace-period=0 --force
```

#### 错误 3: 权限不足

```bash
# 问题现象
kubectl delete deployment nginx-deployment
# Error from server (Forbidden): deployments.apps "nginx-deployment" is forbidden: 
# User "test-user" cannot delete resource "deployments" in API group "apps" in the namespace "default"

# 解决方案
# 1. 检查当前用户权限
kubectl auth can-i delete deployment

# 2. 使用管理员账号
kubectl delete deployment nginx-deployment --as=system:admin

# 3. 联系集群管理员授权
```

---

## 批量删除场景

### 场景 1: 删除测试环境的所有 Deployment

```bash
# 删除 test 命名空间下的所有 Deployment
kubectl delete deployment --all -n test

# 或删除整个命名空间（会删除所有资源）
kubectl delete namespace test
```

### 场景 2: 删除特定应用的所有组件

```bash
# 删除应用的所有资源（Deployment、Service、ConfigMap 等）
kubectl delete all -l app=myapp

# 注意：此命令不会删除 Secret、PVC 等资源
# 需要单独删除
kubectl delete secret,pvc -l app=myapp
```

### 场景 3: 清空整个命名空间

```bash
# 删除命名空间下的所有资源
kubectl delete all --all -n <namespace>

# 或删除整个命名空间
kubectl delete namespace <namespace>
```

---

## Agent Prompt 模板

### 基础删除

```
请帮我删除 Deployment：
- Deployment 名称: nginx-deployment
- 命名空间: default
- 确保同时删除所有 Pod
```

### 删除并清理关联资源

```
请帮我删除应用及其所有关联资源：
- Deployment 名称: web-app
- 命名空间: production
- 同时删除：Service、ConfigMap、Secret、Ingress
- 删除前导出配置文件备份
```

### 批量删除

```
请帮我清理测试环境：
- 命名空间: test
- 删除所有 Deployment
- 保留命名空间本身
```

### 强制删除

```
请帮我强制删除无法正常删除的 Deployment：
- Deployment 名称: stuck-deployment
- 命名空间: default
- 问题：删除命令卡住超过 5 分钟
- 使用强制删除
```

---

## 参考 Cookbook

完整可执行示例：[Cookbook - 删除 Deployment](../../cookbook/delete-deployment-example.py)

---

## 最佳实践

### 1. 删除前准备

✅ **推荐做法**：
- 删除前导出配置文件备份
- 确认应用可以下线
- 在非生产环境测试删除流程
- 通知相关人员

❌ **不推荐做法**：
- 不备份配置直接删除
- 未确认影响范围
- 高峰期删除生产环境应用

### 2. 删除顺序

✅ **推荐做法**：
- 先删除 Ingress（停止外部流量）
- 再删除 Service（停止内部流量）
- 最后删除 Deployment（停止应用）
- 清理 ConfigMap 和 Secret

❌ **不推荐做法**：
- 先删除 Deployment，Service 还在（流量打到空 Pod）
- 不清理关联资源（资源浪费）

### 3. 生产环境删除

✅ **推荐做法**：
- 选择低峰期操作
- 逐步缩容到 0 副本，观察影响
- 确认无影响后再删除
- 保留配置文件和镜像

❌ **不推荐做法**：
- 直接删除正在服务的应用
- 不观察影响
- 删除后无法恢复

### 4. 强制删除

✅ **推荐做法**：
- 仅在必要时使用强制删除
- 先尝试移除 finalizers
- 了解强制删除的风险

❌ **不推荐做法**：
- 默认使用强制删除
- 不了解原因就强制删除

### 5. 命名空间管理

✅ **推荐做法**：
- 不同环境使用不同命名空间
- 删除整个命名空间清理测试环境
- 生产环境命名空间谨慎删除

❌ **不推荐做法**：
- 所有应用都在 default 命名空间
- 随意删除命名空间

---

## 相关命令速查

```bash
# 删除 Deployment
kubectl delete deployment <name>

# 删除指定命名空间的 Deployment
kubectl delete deployment <name> -n <namespace>

# 使用文件删除
kubectl delete -f deployment.yaml

# 使用标签删除
kubectl delete deployment -l app=<label>

# 删除所有 Deployment
kubectl delete deployment --all

# 强制删除
kubectl delete deployment <name> --grace-period=0 --force

# 删除但保留 Pod
kubectl delete deployment <name> --cascade=orphan

# 删除并等待完成
kubectl delete deployment <name> --wait=true

# 导出配置备份
kubectl get deployment <name> -o yaml > backup.yaml

# 删除所有关联资源
kubectl delete all -l app=<label>

# 删除整个命名空间
kubectl delete namespace <namespace>
```

---

## 文档信息

- **版本**: v1.0
- **最后更新**: 2025-12-25
- **适用 TKE 版本**: ≥ 1.18
- **适用 Kubernetes 版本**: ≥ 1.18
- **文档质量**: L3（Agent 友好）
