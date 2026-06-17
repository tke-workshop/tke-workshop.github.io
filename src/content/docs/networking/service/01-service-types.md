---
title: "Service 类型"
---

# Service 类型

本文介绍 Kubernetes Service 的常见类型，并给出 TKE 场景下的选择建议。

---

## 类型对比

| 类型 | 访问方式 | 是否创建 CLB | 典型场景 |
|------|----------|--------------|----------|
| `ClusterIP` | 集群内虚拟 IP | 否 | 服务间调用、内部 API |
| `NodePort` | `NodeIP:NodePort` | 否 | 临时调试、兼容外部网关 |
| `LoadBalancer` | CLB VIP | 是 | 生产四层入口 |
| `ExternalName` | DNS CNAME | 否 | 将集群内访问映射到外部域名 |

---

## ClusterIP

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  type: ClusterIP
  selector:
    app: nginx
  ports:
    - name: http
      port: 80
      targetPort: 80
```

```bash
kubectl apply -f service.yaml
kubectl get svc nginx
kubectl get endpoints nginx
```

`ClusterIP` 只在集群内可访问，适合作为 Deployment、StatefulSet、Job 等工作负载之间的稳定访问地址。

---

## NodePort

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-nodeport
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
    - name: http
      port: 80
      targetPort: 80
      nodePort: 30080
```

```bash
kubectl apply -f nodeport.yaml
kubectl get svc nginx-nodeport
```

NodePort 默认使用 `30000-32767` 端口段。生产环境使用 NodePort 时，需要同步检查节点安全组是否放通对应端口，并评估节点 IP 变更、跨节点转发和来源 IP 保留问题。

---

## LoadBalancer

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
      port: 80
      targetPort: 80
```

```bash
kubectl apply -f loadbalancer.yaml
kubectl get svc nginx-lb -w
```

TKE 会为 `LoadBalancer` Service 创建或绑定腾讯云 CLB。公网和内网 CLB、已有 CLB 绑定、带宽和来源 IP 策略请参考 [LoadBalancer Service](02-loadbalancer-service.md)。

---

## ExternalName

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-api
spec:
  type: ExternalName
  externalName: api.example.com
```

`ExternalName` 不创建 ClusterIP，也不代理流量，只返回 DNS CNAME。它适合把外部依赖以 Kubernetes Service 的形式暴露给集群内应用。

---

## 验证命令

```bash
kubectl get svc -A
kubectl describe svc <service-name> -n <namespace>
kubectl get endpoints <service-name> -n <namespace>
kubectl get endpointslice -l kubernetes.io/service-name=<service-name> -n <namespace>
```

Service 无法访问时，先确认 selector 是否能匹配 Pod，再检查 Endpoint 是否生成。
