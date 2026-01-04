# 部署应用

本章节将指导您在 TKE 集群中部署第一个应用。

## 1. 准备工作

确保您已完成：

- [x] 集群创建并处于运行状态
- [x] kubectl 已配置并能连接集群
- [x] 创建了 `workshop` 命名空间

```bash
# 创建命名空间（如果还没有）
kubectl create namespace workshop

# 切换到 workshop 命名空间
kubectl config set-context --current --namespace=workshop
```

## 2. 部署 Nginx 应用

### 2.1 创建 Deployment

创建 `nginx-deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: workshop
  labels:
    app: nginx
spec:
  replicas: 3
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
        image: nginx:1.25
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

应用配置：

```bash
kubectl apply -f nginx-deployment.yaml
```

### 2.2 验证部署

```bash
# 查看 Deployment 状态
kubectl get deployments

# 查看 Pod 状态
kubectl get pods

# 查看详细信息
kubectl describe deployment nginx-deployment
```

预期输出：

```
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   3/3     3            3           1m
```

## 3. 暴露服务

### 3.1 创建 Service

创建 `nginx-service.yaml`：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
  namespace: workshop
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
```

应用配置：

```bash
kubectl apply -f nginx-service.yaml
```

### 3.2 获取访问地址

```bash
# 查看 Service
kubectl get svc nginx-service

# 等待 EXTERNAL-IP 分配（可能需要 1-2 分钟）
kubectl get svc nginx-service -w
```

预期输出：

```
NAME            TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)        AGE
nginx-service   LoadBalancer   10.96.123.45    123.45.67.89    80:31234/TCP   2m
```

### 3.3 访问应用

```bash
# 使用 EXTERNAL-IP 访问
curl http://<EXTERNAL-IP>

# 或在浏览器中打开
```

!!! success "部署成功"
    看到 Nginx 欢迎页面表示应用部署成功！

## 4. 更新应用

### 4.1 更新镜像版本

```bash
# 更新镜像
kubectl set image deployment/nginx-deployment nginx=nginx:1.26

# 查看更新状态
kubectl rollout status deployment/nginx-deployment
```

### 4.2 回滚

```bash
# 查看历史版本
kubectl rollout history deployment/nginx-deployment

# 回滚到上一版本
kubectl rollout undo deployment/nginx-deployment

# 回滚到指定版本
kubectl rollout undo deployment/nginx-deployment --to-revision=1
```

## 5. 清理资源

```bash
# 删除 Service
kubectl delete -f nginx-service.yaml

# 删除 Deployment
kubectl delete -f nginx-deployment.yaml

# 或一次性删除
kubectl delete -f nginx-deployment.yaml -f nginx-service.yaml
```

## 6. 总结

恭喜！您已经完成了基础模块的学习，掌握了：

- [x] 环境准备
- [x] 创建 TKE 集群
- [x] kubectl 基本操作
- [x] 部署和管理应用

## 下一步

选择感兴趣的模块继续学习：

<div class="grid cards" markdown>

-   :material-network: __网络__

    ---

    深入学习 Service、Ingress 配置

    [:octicons-arrow-right-24: 网络模块](../networking/index.md)

-   :material-chart-line: __可观测性__

    ---

    配置监控、日志和链路追踪

    [:octicons-arrow-right-24: 可观测性模块](../observability/index.md)

</div>
