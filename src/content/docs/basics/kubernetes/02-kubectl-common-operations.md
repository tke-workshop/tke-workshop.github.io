---
title: "常用 kubectl 命令操作"
---

# 常用 kubectl 命令操作

## 文档元信息

- **功能名称**: Kubernetes 对象常用操作
- **主要工具**: `kubectl`
- **适用对象**: Pod、Deployment、Service、ConfigMap、Secret、Ingress、Job
- **文档更新时间**: 2026-06-17
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

`kubectl` 是 Kubernetes 对象操作的统一入口。本文提供 TKE 集群中最常用的对象查看、部署、更新、删除和排障命令，覆盖日常交付与运维场景。

---

## 查看资源

```bash
# 查看常用资源
kubectl get pod,deploy,svc,ingress

# 查看所有命名空间下的 Pod
kubectl get pods -A -o wide

# 查看指定命名空间资源
kubectl get deploy,svc -n <namespace>

# 查看对象详情
kubectl describe pod <pod-name> -n <namespace>

# 查看事件
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# 查看对象 YAML
kubectl get deployment <name> -n <namespace> -o yaml
```

---

## 创建和应用对象

### 使用 YAML 声明式部署

```bash
kubectl apply -f app.yaml
kubectl apply -f ./manifests/
```

### 部署前查看差异

```bash
kubectl diff -f app.yaml
```

### 快速创建 Deployment

```bash
kubectl create deployment nginx \
  --image=nginx:1.25 \
  --replicas=3
```

### 快速暴露 Service

```bash
kubectl expose deployment nginx \
  --port=80 \
  --target-port=80 \
  --type=ClusterIP
```

### 创建 ConfigMap 和 Secret

```bash
kubectl create configmap app-config \
  --from-literal=ENV=production \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic app-secret \
  --from-literal=password='change-me' \
  --dry-run=client -o yaml | kubectl apply -f -
```

---

## 更新对象

### 更新镜像

```bash
kubectl set image deployment/nginx nginx=nginx:1.26
kubectl rollout status deployment/nginx
```

### 调整副本数

```bash
kubectl scale deployment/nginx --replicas=5
kubectl get pods -l app=nginx -w
```

### 局部 patch

```bash
kubectl patch deployment nginx \
  -p '{"spec":{"template":{"metadata":{"annotations":{"restartedAt":"'$(date -Iseconds)'"}}}}}'
```

### 交互式编辑

```bash
kubectl edit deployment nginx
```

---

## 发布和回滚

```bash
# 查看发布状态
kubectl rollout status deployment/nginx

# 查看发布历史
kubectl rollout history deployment/nginx

# 回滚到上一版本
kubectl rollout undo deployment/nginx

# 回滚到指定版本
kubectl rollout undo deployment/nginx --to-revision=2

# 暂停和恢复发布
kubectl rollout pause deployment/nginx
kubectl rollout resume deployment/nginx
```

---

## 删除对象

```bash
# 按文件删除
kubectl delete -f app.yaml

# 删除指定对象
kubectl delete deployment nginx
kubectl delete service nginx

# 按标签删除
kubectl delete pod -l app=nginx

# 删除命名空间内所有同类对象
kubectl delete job --all -n <namespace>
```

!!! warning "删除前确认"
    删除 Service、Ingress、LoadBalancer 类型资源可能影响访问入口；删除 Deployment 会级联删除其管理的 Pod。生产环境建议先导出 YAML 备份。

---

## 日志和调试

```bash
# 查看日志
kubectl logs <pod-name> -n <namespace>

# 查看上一次崩溃日志
kubectl logs <pod-name> -n <namespace> --previous

# 按标签查看日志
kubectl logs -l app=nginx -n <namespace> --tail=100

# 进入容器
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh

# 端口转发
kubectl port-forward deployment/nginx 8080:80

# 启动临时调试 Pod
kubectl run debug-shell \
  --rm -it \
  --restart=Never \
  --image=busybox:1.36 \
  -- sh
```

---

## 常见排障流

### Pod Pending

```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl get nodes
kubectl describe node <node-name>
```

重点检查资源不足、节点污点、亲和性、PVC 绑定和调度事件。

### ImagePullBackOff

```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl get secret -n <namespace>
```

重点检查镜像地址、镜像标签、TCR 访问权限和 `imagePullSecrets`。

### CrashLoopBackOff

```bash
kubectl logs <pod-name> -n <namespace> --previous
kubectl describe pod <pod-name> -n <namespace>
```

重点检查启动命令、环境变量、配置文件、探针和依赖服务。

### Service Endpoints 为空

```bash
kubectl describe service <service-name> -n <namespace>
kubectl get endpoints <service-name> -n <namespace>
kubectl get pods --show-labels -n <namespace>
```

重点检查 Service selector 是否匹配 Pod labels。

---

## 常用对象速查

| 对象 | 查看 | 常用操作 |
|------|------|----------|
| Pod | `kubectl get pods -A` | `logs`、`exec`、`describe` |
| Deployment | `kubectl get deploy` | `set image`、`scale`、`rollout` |
| Service | `kubectl get svc` | `expose`、`describe`、检查 Endpoints |
| ConfigMap | `kubectl get cm` | `create configmap`、`apply` |
| Secret | `kubectl get secret` | `create secret`、`imagePullSecrets` |
| Ingress | `kubectl get ingress` | 检查规则、证书和后端 Service |
| Job | `kubectl get job` | 查看完成状态和 Pod 日志 |

---

## 相关文档

- [连接集群](./01-connect-cluster.md)
- [创建节点池](../node-pool/01-create-node-pool.md)
- [LoadBalancer Service 最佳实践](../../networking/service/03-loadbalancer-service.md)
