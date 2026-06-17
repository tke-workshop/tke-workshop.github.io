---
title: "LoadBalancer Service"
---

# LoadBalancer Service

`LoadBalancer` Service 用于通过腾讯云 CLB 暴露集群内应用。适合 TCP、UDP、HTTP 等四层入口场景；如果需要域名、路径、TLS 证书和多服务复用入口，优先使用 Ingress。

---

## 前置条件

- 已连接 TKE 集群，并能执行 `kubectl`
- 后端 Pod 已运行，且 label 可被 Service selector 匹配
- 账号具备 CLB 创建或绑定权限
- 公网入口已确认带宽、计费和安全组策略
- 内网入口已确认 CLB 子网与业务访问来源

---

## 创建后端应用

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 2
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
            - name: http
              containerPort: 80
```

```bash
kubectl apply -f nginx-deployment.yaml
kubectl rollout status deployment/nginx
```

---

## 创建公网 CLB Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-lb
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 80
```

```bash
kubectl apply -f nginx-lb.yaml
kubectl get svc nginx-lb -w
```

当 `EXTERNAL-IP` 出现公网 IP 后，可以访问：

```bash
EXTERNAL_IP=$(kubectl get svc nginx-lb -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl "http://${EXTERNAL_IP}"
```

---

## 创建内网 CLB Service

内网 CLB 需要指定所在子网：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-internal-lb
  annotations:
    service.kubernetes.io/qcloud-loadbalancer-internal-subnetid: subnet-xxxxxxxx
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 80
```

```bash
kubectl apply -f nginx-internal-lb.yaml
kubectl get svc nginx-internal-lb -w
```

内网 CLB 只能被 VPC 内或互通网络访问。创建前确认子网可用 IP 充足，且访问来源到 CLB 的安全组和路由策略已放通。

---

## 保留客户端源 IP

默认 `externalTrafficPolicy: Cluster` 会把流量转发到集群内所有可用后端，负载更均衡，但后端 Pod 看到的来源 IP 可能不是客户端真实 IP。需要保留源 IP 时设置：

```yaml
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
```

`Local` 模式只把流量转发到本节点上的后端 Pod。使用前需要确认每个被 CLB 健康检查命中的节点都有可用 Pod，否则可能出现流量不均衡或节点健康检查失败。

---

## 常用检查命令

```bash
kubectl describe svc nginx-lb
kubectl get endpoints nginx-lb -o wide
kubectl get pods -l app=nginx -o wide
kubectl describe pod -l app=nginx
```

如果 `EXTERNAL-IP` 长时间为 `<pending>`，优先检查：

| 检查项 | 命令或位置 |
|--------|------------|
| Service 事件 | `kubectl describe svc nginx-lb` |
| 后端 Endpoint | `kubectl get endpoints nginx-lb` |
| CLB 配额 | 腾讯云 CLB 控制台 |
| 账号权限 | CAM 策略和操作审计 |
| 子网 IP | VPC 子网可用 IP |

---

## 删除资源

```bash
kubectl delete svc nginx-lb
kubectl delete deployment nginx
```

删除 `LoadBalancer` Service 后，TKE 会按 Service 生命周期回收自动创建的 CLB。若使用已有 CLB，删除前确认监听器和后端绑定的归属关系，避免影响其他业务。

---

## 注意事项

- 不要手动修改 TKE 自动创建的 `LoadBalancerResource` 资源。
- 复制 Service YAML 重新创建时，删除 `service.cloud.tencent.com/client-token` 注解，避免复用旧幂等 token。
- 避免在同一个 Service 上直接切换公网 CLB、内网 CLB、已有 CLB、不同 CLB 类型；确有需要时先切回 ClusterIP，再重新创建目标访问方式。
- 生产入口建议配套告警：CLB 后端健康检查失败、5xx、连接数、带宽、Service Endpoint 为空。

---

## 官方参考

- [腾讯云 TKE Service 基本功能](https://cloud.tencent.com/document/product/457/45489)
