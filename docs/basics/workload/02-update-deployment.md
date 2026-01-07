# 更新 Deployment（工作负载）

## 功能概述

更新 TKE 集群中的 Deployment，包括更新容器镜像、修改副本数、调整资源配置、更新环境变量等操作。Deployment 支持滚动更新，可以实现零停机时间的应用更新。

**核心特性**：
- 🔄 **滚动更新**：逐步替换旧 Pod，保证服务不中断
- ⚡ **快速回滚**：发现问题可一键回滚到之前版本
- 📊 **更新策略**：可配置更新速度和最大不可用数
- 🎯 **精确控制**：暂停/恢复更新，金丝雀发布
- 📝 **版本历史**：保存多个历史版本，可查看和回滚

**常见更新场景**：
- ✅ 更新应用版本（镜像更新）
- ✅ 调整副本数（扩缩容）
- ✅ 修改资源配置（CPU/内存）
- ✅ 更新环境变量
- ✅ 修改健康检查配置

**相关文档**：
- [创建 Deployment](./01-create-deployment.md)
- [删除 Deployment](./03-delete-deployment.md)

---

## 前置条件

在更新 Deployment 前，请确认：

- [ ] **Deployment 已存在**
  - 可以通过 `kubectl get deployment` 查看
  - Deployment 状态为 `Running`

- [ ] **已配置访问凭证**
  - 已获取 kubeconfig 文件
  - 本地已安装 kubectl 客户端

- [ ] **更新内容已准备**
  - 新镜像已推送到镜像仓库
  - 新配置已测试验证
  - 资源配置合理（不超过集群可用资源）

- [ ] **了解更新影响**
  - 评估更新对业务的影响
  - 准备回滚方案
  - 确认更新窗口（生产环境）

---

## 检查清单

在开始前，请确认：

### 1. Deployment 状态检查
```bash
# 查看 Deployment 状态
kubectl get deployment <deployment-name>

# 查看 Pod 状态
kubectl get pods -l app=<label>

# 查看当前版本信息
kubectl rollout history deployment/<deployment-name>
```

### 2. 资源可用性检查
```bash
# 检查集群资源
kubectl top nodes

# 检查当前资源使用
kubectl top pods -l app=<label>
```

### 3. 备份当前配置
```bash
# 导出当前配置（备份）
kubectl get deployment <deployment-name> -o yaml > deployment-backup.yaml
```

---

## 操作步骤

### 方式 1：使用 kubectl set（快速更新镜像）

适用于仅更新容器镜像的场景。

#### Step 1: 更新镜像

```bash
# 更新单个容器镜像
kubectl set image deployment/<deployment-name> \
  <container-name>=<new-image>:<new-tag>

# 示例：更新 nginx 镜像到 1.22 版本
kubectl set image deployment/nginx-deployment \
  nginx=nginx:1.22
```

#### Step 2: 查看更新状态

```bash
# 实时查看更新进度
kubectl rollout status deployment/<deployment-name>

# 输出示例：
# Waiting for deployment "nginx-deployment" rollout to finish: 1 out of 3 new replicas have been updated...
# Waiting for deployment "nginx-deployment" rollout to finish: 2 out of 3 new replicas have been updated...
# Waiting for deployment "nginx-deployment" rollout to finish: 3 old replicas are pending termination...
# deployment "nginx-deployment" successfully rolled out
```

---

### 方式 2：使用 kubectl apply（更新完整配置）

适用于更新多个配置项的场景。

#### Step 1: 修改 Deployment YAML 文件

修改 `deployment.yaml` 文件：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
spec:
  replicas: 5  # 修改：从 3 改为 5
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.22  # 修改：从 1.21 改为 1.22
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: "200m"      # 修改：从 100m 改为 200m
            memory: "256Mi"  # 修改：从 128Mi 改为 256Mi
          limits:
            cpu: "1000m"     # 修改：从 500m 改为 1000m
            memory: "1Gi"    # 修改：从 512Mi 改为 1Gi
        env:
        - name: ENV         # 新增：环境变量
          value: "production"
```

#### Step 2: 应用更新

```bash
# 应用更新
kubectl apply -f deployment.yaml

# 查看更新状态
kubectl rollout status deployment/<deployment-name>
```

---

### 方式 3：使用 kubectl patch（局部更新）

适用于仅修改个别字段的场景。

```bash
# 更新副本数
kubectl patch deployment <deployment-name> -p '{"spec":{"replicas":5}}'

# 更新环境变量
kubectl patch deployment <deployment-name> -p '{"spec":{"template":{"spec":{"containers":[{"name":"nginx","env":[{"name":"ENV","value":"production"}]}]}}}}'

# 更新资源限制
kubectl patch deployment <deployment-name> --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/cpu", "value":"1000m"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value":"1Gi"}
]'
```

---

### 方式 4：使用 kubectl scale（快速扩缩容）

专门用于调整副本数：

```bash
# 扩容到 5 个副本
kubectl scale deployment/<deployment-name> --replicas=5

# 查看扩容进度
kubectl get pods -l app=<label> -w
```

---

### 方式 5：使用 kubectl edit（交互式编辑）

适用于临时修改和调试：

```bash
# 打开默认编辑器编辑 Deployment
kubectl edit deployment/<deployment-name>

# 保存退出后自动应用更新
```

---

### 方式 6：使用 Kubernetes Python SDK

适用于自动化和编程场景：

```python
from kubernetes import client, config
from kubernetes.client.rest import ApiException

def update_deployment(namespace="default", name="nginx-deployment", 
                      new_image="nginx:1.22", new_replicas=5):
    """
    更新 Deployment
    
    Args:
        namespace: 命名空间
        name: Deployment 名称
        new_image: 新镜像
        new_replicas: 新副本数
    """
    config.load_kube_config()
    apps_v1 = client.AppsV1Api()
    
    try:
        # 获取当前 Deployment
        deployment = apps_v1.read_namespaced_deployment(name, namespace)
        
        # 更新镜像和副本数
        deployment.spec.replicas = new_replicas
        deployment.spec.template.spec.containers[0].image = new_image
        
        # 应用更新
        resp = apps_v1.patch_namespaced_deployment(
            name=name,
            namespace=namespace,
            body=deployment
        )
        
        print(f"✅ Deployment '{name}' 更新成功")
        print(f"   新镜像: {new_image}")
        print(f"   新副本数: {new_replicas}")
        return resp
    except ApiException as e:
        print(f"❌ 更新失败: {e}")
        raise

# 使用示例
if __name__ == "__main__":
    update_deployment(
        namespace="default",
        name="nginx-deployment",
        new_image="nginx:1.22",
        new_replicas=5
    )
```

---

## 验证步骤

更新 Deployment 后，通过以下步骤验证：

### 1. 验证更新状态

```bash
# 查看 Deployment 状态
kubectl get deployment <deployment-name>

# 期望输出：
# NAME               READY   UP-TO-DATE   AVAILABLE   AGE
# nginx-deployment   5/5     5            5           10m

# 查看详细信息
kubectl describe deployment <deployment-name> | grep -A 5 "Events:"
```

### 2. 验证 Pod 版本

```bash
# 查看 Pod 镜像版本
kubectl get pods -l app=<label> -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'

# 期望输出：
# nginx-deployment-xxx  nginx:1.22
# nginx-deployment-yyy  nginx:1.22
# nginx-deployment-zzz  nginx:1.22
```

### 3. 验证副本数

```bash
# 查看副本数
kubectl get deployment <deployment-name> -o jsonpath='{.spec.replicas}'

# 查看实际运行的 Pod 数
kubectl get pods -l app=<label> --field-selector=status.phase=Running | wc -l
```

### 4. 验证应用功能

```bash
# 端口转发测试
kubectl port-forward deployment/<deployment-name> 8080:80

# 测试应用
curl http://localhost:8080

# 或创建临时 Pod 测试
kubectl run test-pod --rm -it --image=busybox -- wget -qO- http://<service-name>
```

### 5. 查看更新历史

```bash
# 查看版本历史
kubectl rollout history deployment/<deployment-name>

# 查看特定版本详情
kubectl rollout history deployment/<deployment-name> --revision=2
```

---

## 回滚操作

如果更新后发现问题，可以快速回滚。

### 方式 1：回滚到上一个版本

```bash
# 回滚到上一个版本
kubectl rollout undo deployment/<deployment-name>

# 查看回滚状态
kubectl rollout status deployment/<deployment-name>
```

### 方式 2：回滚到指定版本

```bash
# 查看历史版本
kubectl rollout history deployment/<deployment-name>

# 回滚到指定版本（如版本 2）
kubectl rollout undo deployment/<deployment-name> --to-revision=2
```

### 方式 3：使用备份配置回滚

```bash
# 应用备份的配置文件
kubectl apply -f deployment-backup.yaml

# 或强制替换
kubectl replace --force -f deployment-backup.yaml
```

---

## 高级更新策略

### 1. 配置滚动更新参数

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%       # 最多可以多创建 25% 的 Pod
      maxUnavailable: 25% # 最多允许 25% 的 Pod 不可用
```

**参数说明**：
- `maxSurge`: 更新期间允许超过期望副本数的最大 Pod 数
- `maxUnavailable`: 更新期间允许不可用的最大 Pod 数
- 可以使用百分比（如 `25%`）或绝对数（如 `1`）

### 2. 暂停和恢复更新

```bash
# 暂停更新（金丝雀发布）
kubectl rollout pause deployment/<deployment-name>

# 验证新版本
# ... 测试新版本 Pod ...

# 恢复更新
kubectl rollout resume deployment/<deployment-name>
```

### 3. 蓝绿部署

```bash
# Step 1: 创建新版本 Deployment（绿）
kubectl apply -f deployment-v2.yaml

# Step 2: 验证新版本
kubectl get pods -l version=v2

# Step 3: 切换 Service 到新版本
kubectl patch service <service-name> -p '{"spec":{"selector":{"version":"v2"}}}'

# Step 4: 删除旧版本 Deployment（蓝）
kubectl delete deployment <old-deployment-name>
```

### 4. 金丝雀发布

```bash
# Step 1: 创建金丝雀 Deployment（10% 流量）
kubectl apply -f deployment-canary.yaml  # 副本数设为总数的 10%

# Step 2: 监控金丝雀版本
kubectl top pods -l version=canary

# Step 3: 如果正常，逐步增加金丝雀副本数
kubectl scale deployment canary --replicas=5

# Step 4: 完全切换
kubectl set image deployment/main app=new-image:v2
kubectl delete deployment canary
```

---

## 异常处理

| 错误现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| 更新卡住 | 新 Pod 无法启动 | 1. 查看 Pod 状态和日志<br>2. 检查镜像是否正确<br>3. 检查健康检查配置 |
| `ImagePullBackOff` | 新镜像不存在 | 1. 检查镜像名称和标签<br>2. 检查镜像仓库权限<br>3. 回滚到之前版本 |
| `CrashLoopBackOff` | 新版本有 bug | 1. 查看 Pod 日志<br>2. 立即回滚<br>3. 修复 bug 后重新发布 |
| 部分 Pod 未更新 | 更新策略限制 | 1. 检查 `maxUnavailable` 配置<br>2. 手动删除旧 Pod 触发更新 |
| 回滚失败 | 历史版本丢失 | 1. 使用备份配置文件<br>2. 检查 `revisionHistoryLimit` 配置 |

### 常见错误排查

#### 错误 1: 更新卡住不继续

```bash
# 问题现象
kubectl rollout status deployment/<deployment-name>
# Waiting for deployment "xxx" rollout to finish: 1 old replicas are pending termination...

# 排查步骤
kubectl get pods -l app=<label>  # 查看 Pod 状态

# 常见原因
# 1. 新 Pod 健康检查失败
# 2. 资源不足，新 Pod 无法启动
# 3. maxUnavailable=0 导致无法终止旧 Pod

# 解决方案
# 1. 查看新 Pod 日志
kubectl logs <new-pod-name>

# 2. 调整更新策略
kubectl patch deployment <deployment-name> -p '{"spec":{"strategy":{"rollingUpdate":{"maxUnavailable":1}}}}'

# 3. 如果确认有问题，立即回滚
kubectl rollout undo deployment/<deployment-name>
```

#### 错误 2: 镜像拉取失败

```bash
# 问题现象
kubectl get pods
# NAME                     READY   STATUS             RESTARTS   AGE
# nginx-xxx                0/1     ImagePullBackOff   0          2m

# 解决方案
# 1. 检查镜像名称
kubectl describe pod <pod-name> | grep "Failed to pull image"

# 2. 立即回滚
kubectl rollout undo deployment/<deployment-name>

# 3. 修正镜像后重新更新
kubectl set image deployment/<deployment-name> nginx=nginx:correct-tag
```

#### 错误 3: 资源不足导致更新失败

```bash
# 问题现象
kubectl describe deployment <deployment-name>
# Events:
#   Warning  FailedCreate  2m  replicaset-controller  Error creating: pods "xxx" is forbidden: exceeded quota

# 解决方案
# 1. 检查资源使用
kubectl top nodes
kubectl describe node <node-name>

# 2. 降低资源请求
kubectl set resources deployment <deployment-name> \
  --requests=cpu=100m,memory=128Mi

# 3. 或先缩容再更新
kubectl scale deployment <deployment-name> --replicas=2
kubectl set image deployment <deployment-name> nginx=nginx:1.22
kubectl scale deployment <deployment-name> --replicas=5
```

---

## Agent Prompt 模板

### 基础镜像更新

```
请帮我更新 Deployment 的镜像版本：
- Deployment 名称: nginx-deployment
- 命名空间: production
- 新镜像: nginx:1.22
- 确保滚动更新，不中断服务
```

### 扩缩容

```
请帮我扩容 Deployment：
- Deployment 名称: web-app
- 命名空间: production
- 当前副本数: 3
- 目标副本数: 10
- 原因：预计流量高峰
```

### 资源配置调整

```
请帮我调整 Deployment 的资源配置：
- Deployment 名称: api-server
- 命名空间: production
- 新资源配置：
  - CPU 请求: 500m
  - CPU 限制: 2000m
  - 内存请求: 1Gi
  - 内存限制: 4Gi
- 使用滚动更新
```

### 金丝雀发布

```
请帮我进行金丝雀发布：
- 应用: web-app
- 当前版本: v1.0 (10 个副本)
- 金丝雀版本: v1.1 (1 个副本，10% 流量)
- 命名空间: production
- 验证通过后逐步增加金丝雀副本数
```

---

## 参考 Cookbook

完整可执行示例：[Cookbook - 更新 Deployment](../../cookbook/update-deployment-example.py)

---

## 最佳实践

### 1. 更新前准备

✅ **推荐做法**：
- 在测试环境验证更新
- 备份当前配置
- 准备回滚方案
- 选择低峰期更新（生产环境）

❌ **不推荐做法**：
- 直接在生产环境更新未测试的版本
- 不备份配置
- 高峰期更新

### 2. 镜像管理

✅ **推荐做法**：
- 使用语义化版本号（如 `v1.2.3`）
- 避免使用 `latest` 标签
- 在镜像仓库保留多个历史版本

❌ **不推荐做法**：
- 覆盖已有镜像标签
- 仅保留最新版本镜像

### 3. 更新策略

✅ **推荐做法**：
- 生产环境使用 `RollingUpdate`
- 配置合理的 `maxSurge` 和 `maxUnavailable`
- 重要服务设置 `maxUnavailable=0`

❌ **不推荐做法**：
- 使用 `Recreate` 策略（会中断服务）
- 设置过大的 `maxUnavailable`

### 4. 健康检查

✅ **推荐做法**：
- 确保健康检查配置正确
- `initialDelaySeconds` 大于应用启动时间
- 监控健康检查失败率

❌ **不推荐做法**：
- 更新时禁用健康检查
- 健康检查配置过于严格

### 5. 回滚准备

✅ **推荐做法**：
- 保留足够的历史版本（`revisionHistoryLimit ≥ 10`）
- 定期备份配置文件
- 熟悉回滚命令

❌ **不推荐做法**：
- 设置 `revisionHistoryLimit=0`
- 不保留配置备份

---

## 相关命令速查

```bash
# 更新镜像
kubectl set image deployment/<name> <container>=<new-image>

# 更新副本数
kubectl scale deployment/<name> --replicas=<number>

# 更新完整配置
kubectl apply -f deployment.yaml

# 局部更新
kubectl patch deployment/<name> -p '<patch-json>'

# 查看更新状态
kubectl rollout status deployment/<name>

# 暂停更新
kubectl rollout pause deployment/<name>

# 恢复更新
kubectl rollout resume deployment/<name>

# 查看更新历史
kubectl rollout history deployment/<name>

# 回滚到上一个版本
kubectl rollout undo deployment/<name>

# 回滚到指定版本
kubectl rollout undo deployment/<name> --to-revision=<number>

# 重启 Deployment（重建所有 Pod）
kubectl rollout restart deployment/<name>
```

---

## 文档信息

- **版本**: v1.0
- **最后更新**: 2025-12-25
- **适用 TKE 版本**: ≥ 1.18
- **适用 Kubernetes 版本**: ≥ 1.18
- **文档质量**: L3（Agent 友好）
