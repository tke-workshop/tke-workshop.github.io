# 创建 Deployment (CreateDeployment)

## 功能概述

在 TKE 集群中创建 Deployment 工作负载，支持多副本、自动调度、健康检查等特性。Deployment 是 Kubernetes 中最常用的工作负载类型，适用于无状态应用的部署。

**API 名称**: 无（使用 kubectl 或 Kubernetes API）  
**功能优先级**: P0（核心功能）  
**适用场景**: 无状态应用部署、微服务部署、Web 应用部署

---

## 前置条件

### 必须满足
- [ ] 已创建 TKE 集群（集群状态为 Running）
- [ ] 已获取集群访问凭证（kubeconfig）
- [ ] 已安装 kubectl 客户端工具（版本 ≥ 1.20）
- [ ] 集群资源充足（CPU、内存、存储）
- [ ] 容器镜像已准备好且可访问

### 可选条件
- [ ] 配置了镜像仓库访问凭证（私有镜像）
- [ ] 配置了 ConfigMap/Secret（应用配置）
- [ ] 配置了 Service（服务暴露）

---

## 检查清单

在开始前，请确认：

1. **集群状态检查**
   ```bash
   kubectl cluster-info
   kubectl get nodes
   ```
   期望结果：集群可访问，节点状态为 Ready

2. **资源配额检查**
   ```bash
   kubectl describe quota -n <namespace>
   kubectl top nodes
   ```
   期望结果：命名空间资源配额充足，节点资源使用率 < 80%

3. **镜像访问检查**
   ```bash
   # 拉取镜像测试
   docker pull <your-image>
   ```
   期望结果：镜像可正常拉取

4. **命名空间检查**
   ```bash
   kubectl get namespace <namespace>
   ```
   期望结果：目标命名空间存在

---

## 操作步骤

### 方式 1: 使用 kubectl（推荐）

#### Step 1: 准备 Deployment YAML 配置

创建文件 `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
  labels:
    app: nginx
spec:
  replicas: 3                      # 副本数
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
        image: nginx:1.21           # 容器镜像
        ports:
        - containerPort: 80
          name: http
          protocol: TCP
        resources:                  # 资源限制
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:              # 存活探针
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:             # 就绪探针
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Step 2: 应用配置

```bash
kubectl apply -f deployment.yaml
```

期望输出：
```
deployment.apps/nginx-deployment created
```

#### Step 3: 验证创建

```bash
# 查看 Deployment 状态
kubectl get deployment nginx-deployment

# 查看 Pod 状态
kubectl get pods -l app=nginx

# 查看详细信息
kubectl describe deployment nginx-deployment
```

---

### 方式 2: 使用 kubectl 命令行（快速创建）

```bash
# 创建基础 Deployment
kubectl create deployment nginx-deployment \
  --image=nginx:1.21 \
  --replicas=3 \
  --port=80 \
  --namespace=default

# 设置资源限制
kubectl set resources deployment nginx-deployment \
  --requests=cpu=100m,memory=128Mi \
  --limits=cpu=500m,memory=512Mi
```

---

### 方式 3: 使用 Python Kubernetes Client

```python
from kubernetes import client, config

# 加载 kubeconfig
config.load_kube_config()

# 创建 API 客户端
apps_v1 = client.AppsV1Api()

# 定义 Deployment
deployment = client.V1Deployment(
    api_version="apps/v1",
    kind="Deployment",
    metadata=client.V1ObjectMeta(
        name="nginx-deployment",
        namespace="default",
        labels={"app": "nginx"}
    ),
    spec=client.V1DeploymentSpec(
        replicas=3,
        selector=client.V1LabelSelector(
            match_labels={"app": "nginx"}
        ),
        template=client.V1PodTemplateSpec(
            metadata=client.V1ObjectMeta(
                labels={"app": "nginx"}
            ),
            spec=client.V1PodSpec(
                containers=[
                    client.V1Container(
                        name="nginx",
                        image="nginx:1.21",
                        ports=[client.V1ContainerPort(container_port=80)],
                        resources=client.V1ResourceRequirements(
                            requests={"cpu": "100m", "memory": "128Mi"},
                            limits={"cpu": "500m", "memory": "512Mi"}
                        ),
                        liveness_probe=client.V1Probe(
                            http_get=client.V1HTTPGetAction(path="/", port=80),
                            initial_delay_seconds=30,
                            period_seconds=10
                        ),
                        readiness_probe=client.V1Probe(
                            http_get=client.V1HTTPGetAction(path="/", port=80),
                            initial_delay_seconds=5,
                            period_seconds=5
                        )
                    )
                ]
            )
        )
    )
)

# 创建 Deployment
response = apps_v1.create_namespaced_deployment(
    namespace="default",
    body=deployment
)

print(f"Deployment created: {response.metadata.name}")
print(f"Replicas: {response.spec.replicas}")
```

---

### 方式 4: 使用 Go Kubernetes Client

```go
package main

import (
    "context"
    "fmt"
    
    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/resource"
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
    
    // 定义 Deployment
    replicas := int32(3)
    deployment := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "nginx-deployment",
            Namespace: "default",
            Labels:    map[string]string{"app": "nginx"},
        },
        Spec: appsv1.DeploymentSpec{
            Replicas: &replicas,
            Selector: &metav1.LabelSelector{
                MatchLabels: map[string]string{"app": "nginx"},
            },
            Template: corev1.PodTemplateSpec{
                ObjectMeta: metav1.ObjectMeta{
                    Labels: map[string]string{"app": "nginx"},
                },
                Spec: corev1.PodSpec{
                    Containers: []corev1.Container{
                        {
                            Name:  "nginx",
                            Image: "nginx:1.21",
                            Ports: []corev1.ContainerPort{
                                {ContainerPort: 80, Name: "http"},
                            },
                            Resources: corev1.ResourceRequirements{
                                Requests: corev1.ResourceList{
                                    corev1.ResourceCPU:    resource.MustParse("100m"),
                                    corev1.ResourceMemory: resource.MustParse("128Mi"),
                                },
                                Limits: corev1.ResourceList{
                                    corev1.ResourceCPU:    resource.MustParse("500m"),
                                    corev1.ResourceMemory: resource.MustParse("512Mi"),
                                },
                            },
                            LivenessProbe: &corev1.Probe{
                                ProbeHandler: corev1.ProbeHandler{
                                    HTTPGet: &corev1.HTTPGetAction{
                                        Path: "/",
                                        Port: intstr.FromInt(80),
                                    },
                                },
                                InitialDelaySeconds: 30,
                                PeriodSeconds:       10,
                            },
                            ReadinessProbe: &corev1.Probe{
                                ProbeHandler: corev1.ProbeHandler{
                                    HTTPGet: &corev1.HTTPGetAction{
                                        Path: "/",
                                        Port: intstr.FromInt(80),
                                    },
                                },
                                InitialDelaySeconds: 5,
                                PeriodSeconds:       5,
                            },
                        },
                    },
                },
            },
        },
    }
    
    // 创建 Deployment
    result, err := clientset.AppsV1().Deployments("default").Create(
        context.TODO(),
        deployment,
        metav1.CreateOptions{},
    )
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("Deployment created: %s\n", result.GetObjectMeta().GetName())
}
```

---

## 验证步骤

### 1. 检查 Deployment 状态

```bash
kubectl get deployment nginx-deployment
```

期望输出：
```
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   3/3     3            3           2m
```

**状态说明**：
- `READY`: 就绪副本数 / 期望副本数
- `UP-TO-DATE`: 已更新到最新版本的副本数
- `AVAILABLE`: 可用副本数
- `AGE`: 创建时间

### 2. 检查 Pod 状态

```bash
kubectl get pods -l app=nginx
```

期望输出：
```
NAME                                READY   STATUS    RESTARTS   AGE
nginx-deployment-5d59d67564-7xqmc   1/1     Running   0          2m
nginx-deployment-5d59d67564-k8zqw   1/1     Running   0          2m
nginx-deployment-5d59d67564-mnbvc   1/1     Running   0          2m
```

**Pod 状态说明**：
- `Running`: Pod 正常运行
- `Pending`: Pod 等待调度或镜像拉取
- `CrashLoopBackOff`: Pod 启动失败并持续重启
- `ImagePullBackOff`: 镜像拉取失败

### 3. 检查事件日志

```bash
kubectl describe deployment nginx-deployment
```

查看 `Events` 部分，确认无错误事件。

### 4. 测试应用功能

```bash
# 创建临时 Service（测试用）
kubectl expose deployment nginx-deployment --port=80 --type=ClusterIP

# 端口转发测试
kubectl port-forward deployment/nginx-deployment 8080:80

# 访问测试
curl http://localhost:8080
```

期望结果：返回 Nginx 欢迎页面 HTML

---

## 高级配置

### 1. 使用私有镜像仓库

#### 创建 Secret

```bash
kubectl create secret docker-registry tencent-tcr \
  --docker-server=ccr.ccs.tencentyun.com \
  --docker-username=<your-username> \
  --docker-password=<your-password> \
  --namespace=default
```

#### 在 Deployment 中引用

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
      - name: tencent-tcr
      containers:
      - name: app
        image: ccr.ccs.tencentyun.com/namespace/app:v1.0
```

### 2. 配置环境变量

```yaml
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: ENV
          value: "production"
        - name: DB_HOST
          value: "mysql.default.svc.cluster.local"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
```

### 3. 挂载配置文件

```yaml
spec:
  template:
    spec:
      containers:
      - name: app
        volumeMounts:
        - name: config
          mountPath: /etc/app/config.yaml
          subPath: config.yaml
      volumes:
      - name: config
        configMap:
          name: app-config
```

### 4. 配置亲和性和反亲和性

```yaml
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:                # Pod 反亲和性
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - nginx
            topologyKey: kubernetes.io/hostname  # 不同节点调度
```

### 5. 配置滚动更新策略

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1           # 最多超出期望副本数 1 个
      maxUnavailable: 0     # 最多不可用副本数 0 个
```

### 6. 配置 HPA（水平自动扩展）

```bash
kubectl autoscale deployment nginx-deployment \
  --cpu-percent=50 \
  --min=3 \
  --max=10
```

---

## 异常处理

### 常见错误

| 错误现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| `ImagePullBackOff` | 镜像不存在或无权限 | 检查镜像地址，配置 imagePullSecrets |
| `CrashLoopBackOff` | 容器启动失败 | 查看日志 `kubectl logs <pod>` |
| `Pending` (调度失败) | 资源不足或节点亲和性不满足 | 检查节点资源，调整资源请求或亲和性规则 |
| `CreateContainerConfigError` | ConfigMap/Secret 不存在 | 检查配置资源是否存在 |
| `0/3 nodes available` | 节点不可用或污点限制 | 检查节点状态，添加容忍度 |

### 故障排查步骤

#### 1. 查看 Deployment 状态

```bash
kubectl describe deployment nginx-deployment
```

查看 `Conditions` 和 `Events` 部分。

#### 2. 查看 Pod 日志

```bash
# 查看当前日志
kubectl logs <pod-name>

# 查看上一次容器日志（CrashLoopBackOff 场景）
kubectl logs <pod-name> --previous
```

#### 3. 进入容器调试

```bash
kubectl exec -it <pod-name> -- /bin/bash
```

#### 4. 查看节点状态

```bash
kubectl describe node <node-name>
```

#### 5. 查看资源配额

```bash
kubectl describe quota -n default
```

---

## Agent Prompt 模板

### Prompt 1: 基础部署

```prompt
请在 TKE 集群中部署一个 Nginx 应用：
- 集群 ID: {{cluster_id}}
- 命名空间: default
- 副本数: 3
- 镜像: nginx:1.21
- 资源限制: CPU 500m, 内存 512Mi
- 配置健康检查
```

### Prompt 2: 生产环境部署

```prompt
请在 TKE 集群中部署一个生产环境应用：
- 集群 ID: {{cluster_id}}
- 命名空间: production
- 应用名称: {{app_name}}
- 镜像: {{image}}
- 副本数: 5
- 资源请求: CPU 200m, 内存 256Mi
- 资源限制: CPU 1000m, 内存 1Gi
- 配置 HPA: 最小 3 副本，最大 10 副本，CPU 使用率 70%
- 配置 Pod 反亲和性（不同节点调度）
- 配置滚动更新策略（零停机）
- 挂载 ConfigMap: {{config_name}}
- 挂载 Secret: {{secret_name}}
```

### Prompt 3: 微服务部署

```prompt
请在 TKE 集群中部署一个微服务应用：
- 集群 ID: {{cluster_id}}
- 命名空间: microservices
- 服务名称: {{service_name}}
- 镜像: {{private_registry}}/{{image}}:{{tag}}
- 配置私有镜像仓库认证
- 副本数: 3
- 环境变量:
  - SERVICE_NAME: {{service_name}}
  - ENV: production
  - DB_HOST: {{db_host}}
  - REDIS_HOST: {{redis_host}}
- 配置 livenessProbe 和 readinessProbe
- 配置资源限制和请求
```

---

## 相关文档

- [删除 Deployment](./02-delete-deployment.md)
- [更新 Deployment](./03-update-deployment.md)
- [查询集群列表](../cluster/04-describe-clusters.md)
- [创建节点池](../node-pool/01-create-node-pool.md)

---

## Cookbook 示例

完整可执行示例：[create-deployment-example.py](../../cookbook/create-deployment-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2025-12-25  
**适用 TKE 版本**: ≥ 1.20
