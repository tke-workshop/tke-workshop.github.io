# 更新 Deployment (UpdateDeployment)

## 功能概述

更新 TKE 集群中的 Deployment 配置，支持镜像升级、资源调整、副本数修改、滚动更新等操作。Kubernetes 会自动执行滚动更新策略，确保服务零停机。

**API 名称**: 无（使用 kubectl 或 Kubernetes API）  
**功能优先级**: P0（核心功能）  
**适用场景**: 应用升级、版本发布、配置变更、扩缩容

---

## 前置条件

### 必须满足
- [ ] 已创建 TKE 集群（集群状态为 Running）
- [ ] 已获取集群访问凭证（kubeconfig）
- [ ] 已安装 kubectl 客户端工具（版本 ≥ 1.20）
- [ ] 目标 Deployment 存在且状态正常

### 可选条件
- [ ] 新镜像已构建并推送到镜像仓库
- [ ] 配置文件（ConfigMap/Secret）已更新
- [ ] 已准备回滚方案（备份旧版本配置）

---

## 检查清单

在开始前，请确认：

1. **确认 Deployment 当前状态**
   ```bash
   kubectl get deployment <deployment-name> -n <namespace>
   kubectl describe deployment <deployment-name> -n <namespace>
   ```
   期望结果：Deployment 状态正常，所有 Pod Running

2. **备份当前配置**
   ```bash
   kubectl get deployment <deployment-name> -n <namespace> -o yaml > deployment-backup.yaml
   ```
   期望结果：配置已保存到本地文件

3. **验证新镜像可用**（如果更新镜像）
   ```bash
   docker pull <new-image>
   ```
   期望结果：镜像可正常拉取

4. **检查资源配额**（如果增加副本数或资源）
   ```bash
   kubectl describe quota -n <namespace>
   kubectl top nodes
   ```
   期望结果：集群资源充足

---

## 操作步骤

### 方式 1: 使用 kubectl 命令行（快速更新）

#### 更新镜像（最常用）

```bash
# 更新单个容器镜像
kubectl set image deployment/<deployment-name> \
  <container-name>=<new-image>:<tag> \
  -n <namespace>

# 示例：更新 nginx 镜像到 1.22 版本
kubectl set image deployment/nginx-deployment \
  nginx=nginx:1.22 \
  -n default
```

期望输出：
```
deployment.apps/nginx-deployment image updated
```

#### 更新资源限制

```bash
kubectl set resources deployment/<deployment-name> \
  --requests=cpu=200m,memory=256Mi \
  --limits=cpu=1000m,memory=1Gi \
  -n <namespace>
```

#### 调整副本数

```bash
kubectl scale deployment/<deployment-name> \
  --replicas=5 \
  -n <namespace>
```

---

### 方式 2: 使用 kubectl edit（交互式编辑）

```bash
kubectl edit deployment <deployment-name> -n <namespace>
```

这会打开系统默认编辑器（vi/vim），修改后保存即自动应用。

**适用场景**：复杂配置变更、多处修改

---

### 方式 3: 使用 kubectl apply（声明式更新）

#### Step 1: 修改 YAML 文件

编辑 `deployment.yaml`，例如更新镜像版本：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
spec:
  replicas: 5                      # 修改副本数
  template:
    spec:
      containers:
      - name: nginx
        image: nginx:1.22           # 修改镜像版本
        resources:
          requests:
            cpu: 200m               # 修改资源请求
            memory: 256Mi
          limits:
            cpu: 1000m              # 修改资源限制
            memory: 1Gi
```

#### Step 2: 应用更新

```bash
kubectl apply -f deployment.yaml
```

期望输出：
```
deployment.apps/nginx-deployment configured
```

---

### 方式 4: 使用 kubectl patch（部分更新）

```bash
# JSON Patch 格式
kubectl patch deployment <deployment-name> \
  -n <namespace> \
  -p '{"spec":{"replicas":5}}'

# 更新镜像
kubectl patch deployment <deployment-name> \
  -n <namespace> \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"nginx","image":"nginx:1.22"}]}}}}'

# Strategic Merge Patch（推荐）
kubectl patch deployment <deployment-name> \
  -n <namespace> \
  --type='strategic' \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"nginx","image":"nginx:1.22"}]}}}}'
```

---

### 方式 5: 使用 Python Kubernetes Client

```python
from kubernetes import client, config

# 加载 kubeconfig
config.load_kube_config()

# 创建 API 客户端
apps_v1 = client.AppsV1Api()

def update_deployment_image(name, namespace, container_name, new_image):
    """更新 Deployment 镜像"""
    # 读取当前 Deployment
    deployment = apps_v1.read_namespaced_deployment(name, namespace)
    
    # 更新镜像
    for container in deployment.spec.template.spec.containers:
        if container.name == container_name:
            container.image = new_image
            break
    
    # 应用更新
    response = apps_v1.patch_namespaced_deployment(
        name=name,
        namespace=namespace,
        body=deployment
    )
    
    print(f"✅ Deployment '{name}' updated successfully")
    print(f"   New image: {new_image}")
    return response

def scale_deployment(name, namespace, replicas):
    """调整 Deployment 副本数"""
    # 读取当前 Deployment
    deployment = apps_v1.read_namespaced_deployment(name, namespace)
    
    # 更新副本数
    deployment.spec.replicas = replicas
    
    # 应用更新
    response = apps_v1.patch_namespaced_deployment(
        name=name,
        namespace=namespace,
        body=deployment
    )
    
    print(f"✅ Deployment '{name}' scaled to {replicas} replicas")
    return response

# 示例调用
update_deployment_image("nginx-deployment", "default", "nginx", "nginx:1.22")
scale_deployment("nginx-deployment", "default", 5)
```

---

### 方式 6: 使用 Go Kubernetes Client

```go
package main

import (
    "context"
    "fmt"
    
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
    
    deploymentName := "nginx-deployment"
    namespace := "default"
    
    // 读取当前 Deployment
    deployment, err := clientset.AppsV1().Deployments(namespace).Get(
        context.TODO(),
        deploymentName,
        metav1.GetOptions{},
    )
    if err != nil {
        panic(err)
    }
    
    // 更新镜像
    for i := range deployment.Spec.Template.Spec.Containers {
        if deployment.Spec.Template.Spec.Containers[i].Name == "nginx" {
            deployment.Spec.Template.Spec.Containers[i].Image = "nginx:1.22"
        }
    }
    
    // 更新副本数
    replicas := int32(5)
    deployment.Spec.Replicas = &replicas
    
    // 应用更新
    result, err := clientset.AppsV1().Deployments(namespace).Update(
        context.TODO(),
        deployment,
        metav1.UpdateOptions{},
    )
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("✅ Deployment updated: %s\n", result.GetObjectMeta().GetName())
    fmt.Printf("   Replicas: %d\n", *result.Spec.Replicas)
}
```

---

## 滚动更新策略

Kubernetes 默认使用滚动更新（RollingUpdate）策略，可配置更新行为：

### 配置滚动更新参数

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1           # 最多超出期望副本数 1 个（可以是百分比，如 25%）
      maxUnavailable: 0     # 最多不可用副本数 0 个（保证零停机）
  minReadySeconds: 5        # Pod 就绪后等待 5 秒才视为可用
  revisionHistoryLimit: 10  # 保留 10 个历史版本（用于回滚）
```

**参数说明**：
- `maxSurge`: 更新过程中，最多可以创建多少个新 Pod（超出期望副本数）
- `maxUnavailable`: 更新过程中，最多允许多少个 Pod 不可用
- `minReadySeconds`: Pod 就绪后等待多久才视为可用（防止快速失败的 Pod 被认为成功）
- `revisionHistoryLimit`: 保留多少个历史 ReplicaSet（用于回滚）

### 零停机更新配置

```yaml
spec:
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0     # 关键：确保至少有期望副本数的 Pod 在运行
```

---

## 验证步骤

### 1. 监控更新进度

```bash
# 实时监控 Deployment 状态
kubectl rollout status deployment/<deployment-name> -n <namespace>
```

期望输出：
```
Waiting for deployment "nginx-deployment" rollout to finish: 1 out of 5 new replicas have been updated...
Waiting for deployment "nginx-deployment" rollout to finish: 2 out of 5 new replicas have been updated...
...
deployment "nginx-deployment" successfully rolled out
```

### 2. 查看更新历史

```bash
kubectl rollout history deployment/<deployment-name> -n <namespace>
```

期望输出：
```
REVISION  CHANGE-CAUSE
1         <none>
2         kubectl set image deployment/nginx-deployment nginx=nginx:1.22
```

### 3. 查看 Deployment 状态

```bash
kubectl get deployment <deployment-name> -n <namespace>
```

期望输出：
```
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   5/5     5            5           10m
```

### 4. 查看 Pod 状态

```bash
kubectl get pods -l app=<app-label> -n <namespace> -o wide
```

验证所有 Pod 都使用新镜像且状态为 Running。

### 5. 验证新版本功能

```bash
# 端口转发测试
kubectl port-forward deployment/<deployment-name> 8080:80 -n <namespace>

# 访问测试
curl http://localhost:8080

# 查看 Pod 日志
kubectl logs -l app=<app-label> -n <namespace> --tail=50
```

---

## 回滚操作

### 快速回滚到上一个版本

```bash
kubectl rollout undo deployment/<deployment-name> -n <namespace>
```

### 回滚到指定版本

```bash
# 查看历史版本
kubectl rollout history deployment/<deployment-name> -n <namespace>

# 回滚到指定版本（如 revision 2）
kubectl rollout undo deployment/<deployment-name> \
  --to-revision=2 \
  -n <namespace>
```

### 查看指定版本详情

```bash
kubectl rollout history deployment/<deployment-name> \
  --revision=2 \
  -n <namespace>
```

---

## 高级更新场景

### 1. 蓝绿部署（手动）

```bash
# Step 1: 创建新版本 Deployment（不同名称）
kubectl apply -f deployment-v2.yaml

# Step 2: 验证新版本
kubectl get pods -l version=v2

# Step 3: 切换 Service 流量到新版本
kubectl patch service <service-name> \
  -p '{"spec":{"selector":{"version":"v2"}}}'

# Step 4: 确认无问题后删除旧版本
kubectl delete deployment <old-deployment-name>
```

### 2. 金丝雀发布（使用 Istio）

需要 Istio 或类似服务网格，这里不展开。

### 3. 暂停和恢复更新

```bash
# 暂停更新（用于分批次发布）
kubectl rollout pause deployment/<deployment-name> -n <namespace>

# 手动验证部分 Pod
# ...

# 恢复更新
kubectl rollout resume deployment/<deployment-name> -n <namespace>
```

### 4. 更新环境变量

```bash
kubectl set env deployment/<deployment-name> \
  ENV=production \
  DB_HOST=mysql.prod.svc.cluster.local \
  -n <namespace>
```

### 5. 更新 ConfigMap 后重启 Pod

```bash
# 更新 ConfigMap
kubectl create configmap app-config \
  --from-file=config.yaml \
  --dry-run=client -o yaml | kubectl apply -f -

# 触发 Deployment 重启（添加注解）
kubectl patch deployment <deployment-name> \
  -n <namespace> \
  -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"restarted-at\":\"$(date +%s)\"}}}}}"
```

---

## 异常处理

### 常见错误

| 错误现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| 更新卡住（一直等待） | 新 Pod 启动失败或健康检查失败 | 查看 Pod 日志，检查镜像和配置 |
| `ImagePullBackOff` | 新镜像不存在或无权限 | 检查镜像地址和 imagePullSecrets |
| `CrashLoopBackOff` | 新版本代码有 Bug | 立即回滚到上一个版本 |
| `Insufficient resources` | 资源不足 | 调整资源请求或扩容节点 |
| 更新完成但服务异常 | 新版本兼容性问题 | 回滚到稳定版本 |

### 故障排查步骤

#### 1. 检查更新状态

```bash
kubectl rollout status deployment/<deployment-name> -n <namespace>
kubectl describe deployment <deployment-name> -n <namespace>
```

#### 2. 查看新 Pod 状态

```bash
kubectl get pods -l app=<app-label> -n <namespace>
kubectl describe pod <new-pod-name> -n <namespace>
```

#### 3. 查看 Pod 日志

```bash
kubectl logs <new-pod-name> -n <namespace>
kubectl logs <new-pod-name> --previous -n <namespace>  # 查看上次失败的日志
```

#### 4. 查看事件

```bash
kubectl get events -n <namespace> --sort-by='.lastTimestamp' | grep <deployment-name>
```

#### 5. 如果更新失败，立即回滚

```bash
kubectl rollout undo deployment/<deployment-name> -n <namespace>
```

---

## 最佳实践

### 1. 更新前准备

- ✅ 备份当前配置
- ✅ 在测试环境验证新版本
- ✅ 配置健康检查（liveness & readiness probe）
- ✅ 准备回滚方案

### 2. 生产环境更新策略

```yaml
spec:
  strategy:
    rollingUpdate:
      maxSurge: 25%          # 每次最多增加 25% Pod
      maxUnavailable: 0      # 保证零停机
  minReadySeconds: 30        # 观察期 30 秒
```

### 3. 使用版本标签

```yaml
metadata:
  labels:
    app: myapp
    version: v1.2.0        # 明确标注版本
```

### 4. 记录变更原因

```bash
# 更新时记录 CHANGE-CAUSE
kubectl set image deployment/<deployment-name> \
  nginx=nginx:1.22 \
  -n <namespace> \
  --record   # 记录变更命令
```

### 5. 监控和告警

更新时监控以下指标：
- Pod 重启次数
- 服务错误率
- 响应时间
- 资源使用率

---

## Agent Prompt 模板

### Prompt 1: 镜像升级

```prompt
请升级 TKE 集群中 Deployment 的镜像版本：
- 集群 ID: {{cluster_id}}
- 命名空间: {{namespace}}
- Deployment 名称: {{deployment_name}}
- 容器名称: {{container_name}}
- 新镜像: {{new_image}}:{{new_tag}}
- 监控滚动更新进度
- 如果失败自动回滚
```

### Prompt 2: 扩缩容

```prompt
请调整 TKE 集群中 Deployment 的副本数：
- 集群 ID: {{cluster_id}}
- 命名空间: {{namespace}}
- Deployment 名称: {{deployment_name}}
- 目标副本数: {{replicas}}
- 等待所有 Pod 就绪
```

### Prompt 3: 完整更新

```prompt
请更新 TKE 集群中的 Deployment：
- 集群 ID: {{cluster_id}}
- 命名空间: {{namespace}}
- Deployment 名称: {{deployment_name}}
- 更新内容:
  - 镜像版本: {{new_image}}:{{new_tag}}
  - 副本数: {{replicas}}
  - CPU 限制: {{cpu_limit}}
  - 内存限制: {{memory_limit}}
- 更新策略: 零停机滚动更新
- 验证步骤:
  1. 监控滚动更新进度
  2. 检查所有 Pod 状态
  3. 验证新版本功能
  4. 如果失败自动回滚
```

---

## 相关文档

- [创建 Deployment](./01-create-deployment.md)
- [删除 Deployment](./02-delete-deployment.md)
- [查询节点列表](../node/04-describe-nodes.md)
- [扩容节点池](../node-pool/02-scale-node-pool.md)

---

## Cookbook 示例

完整可执行示例：[update-deployment-example.py](../../cookbook/update-deployment-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2025-12-25  
**适用 TKE 版本**: ≥ 1.20
