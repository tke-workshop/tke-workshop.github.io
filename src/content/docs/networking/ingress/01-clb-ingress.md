---
title: "CLB Ingress"
---

# CLB Ingress

本文演示如何通过 Ingress 将 HTTP 流量转发到集群内 Service。不同集群可能使用 TKE 托管 Ingress、CLB Ingress Controller 或自建 NGINX Ingress；本文聚焦 Kubernetes Ingress 资源本身和排查链路。

---

## 前置条件

- 已连接 TKE 集群
- 已安装或启用 Ingress Controller
- 已准备可访问的域名，或可以通过 `curl -H 'Host: ...'` 验证
- 后端 Service 已能在集群内访问

---

## 创建后端应用和 Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
    - name: http
      port: 80
      targetPort: 80
```

```bash
kubectl apply -f web.yaml
kubectl get svc web
kubectl get endpoints web
```

---

## 创建 Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
spec:
  ingressClassName: <ingress-class-name>
  rules:
    - host: web.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
```

```bash
kubectl apply -f ingress.yaml
kubectl get ingress web
kubectl describe ingress web
```

将 `<ingress-class-name>` 替换为集群中实际的 IngressClass：

```bash
kubectl get ingressclass
```

---

## 验证访问

```bash
INGRESS_IP=$(kubectl get ingress web -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -H "Host: web.example.com" "http://${INGRESS_IP}/"
```

如果域名已经解析到 CLB，可以直接访问：

```bash
curl http://web.example.com/
```

---

## 配置 HTTPS

```bash
kubectl create secret tls web-tls \
  --cert=web.example.com.crt \
  --key=web.example.com.key
```

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
spec:
  ingressClassName: <ingress-class-name>
  tls:
    - hosts:
        - web.example.com
      secretName: web-tls
  rules:
    - host: web.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
```

---

## 排查顺序

| 现象 | 检查项 |
|------|--------|
| Ingress 没有地址 | `kubectl describe ingress`、Ingress Controller 日志、CLB 配额 |
| 404 | host、path、pathType、IngressClass 是否匹配 |
| 502/503 | Service Endpoint 是否为空、Pod readiness 是否通过 |
| HTTPS 失败 | TLS Secret 名称、证书域名、证书链 |
| 域名不通 | DNS 解析、CLB 安全组、监听器状态 |

```bash
kubectl get ingress,svc,endpoints,pods -o wide
kubectl describe ingress web
kubectl logs -n <controller-namespace> deploy/<controller-deployment>
```

---

## 清理资源

```bash
kubectl delete ingress web
kubectl delete svc web
kubectl delete deployment web
kubectl delete secret web-tls
```
