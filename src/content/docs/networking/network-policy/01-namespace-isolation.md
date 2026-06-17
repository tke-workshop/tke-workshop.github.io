---
title: "命名空间隔离"
---

# 命名空间隔离

本文通过一个最小示例演示如何使用 NetworkPolicy 为命名空间建立默认拒绝策略，并只放通指定来源。

---

## 前置条件

- 集群网络插件支持 NetworkPolicy
- 已连接集群并具备创建 Namespace、Pod、NetworkPolicy 的权限
- 业务 Pod 使用稳定 label，例如 `app`、`role`、`tier`

---

## 创建测试命名空间

```bash
kubectl create namespace demo-a
kubectl create namespace demo-b
kubectl label namespace demo-a access-zone=trusted
kubectl label namespace demo-b access-zone=untrusted
```

---

## 部署服务端

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: demo-a
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
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
  name: api
  namespace: demo-a
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 80
```

```bash
kubectl apply -f api.yaml
```

---

## 默认拒绝入站流量

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: demo-a
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

```bash
kubectl apply -f default-deny-ingress.yaml
```

这条策略选择 `demo-a` 下所有 Pod，并拒绝未显式允许的入站流量。

---

## 只允许 trusted 命名空间访问

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-trusted-namespace
  namespace: demo-a
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              access-zone: trusted
      ports:
        - protocol: TCP
          port: 80
```

```bash
kubectl apply -f allow-trusted-namespace.yaml
```

---

## 验证访问

```bash
kubectl run curl-a -n demo-a --rm -it --image=curlimages/curl:8.8.0 --restart=Never -- \
  curl -m 3 http://api.demo-a.svc.cluster.local

kubectl run curl-b -n demo-b --rm -it --image=curlimages/curl:8.8.0 --restart=Never -- \
  curl -m 3 http://api.demo-a.svc.cluster.local
```

`demo-a` 带有 `access-zone=trusted`，应可以访问；`demo-b` 不满足 namespaceSelector，应被拒绝或超时。

---

## 常见问题

| 现象 | 可能原因 | 检查方式 |
|------|----------|----------|
| 策略创建后仍可访问 | CNI 不支持 NetworkPolicy 或策略未匹配 Pod | `kubectl describe networkpolicy`、检查 Pod label |
| DNS 解析失败 | 出站策略阻断 CoreDNS | 放通 kube-system/CoreDNS 的 UDP/TCP 53 |
| 预期来源被拒绝 | namespace label 或 pod label 不匹配 | `kubectl get ns --show-labels` |

---

## 清理资源

```bash
kubectl delete namespace demo-a demo-b
```
