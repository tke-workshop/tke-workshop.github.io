---
title: "工作负载监控"
---

# 工作负载监控

工作负载监控关注应用是否按预期运行：副本是否足够、Pod 是否 Ready、容器是否重启、资源是否接近限制、HPA 是否能正常扩缩。

---

## 快速检查

```bash
kubectl get deploy,statefulset,daemonset -A
kubectl get pods -A -o wide
kubectl get hpa -A
kubectl top pods -A
kubectl get events -A --sort-by=.lastTimestamp
```

---

## 关键状态

| 对象 | 检查项 |
|------|--------|
| Deployment | `READY`、`UP-TO-DATE`、`AVAILABLE` |
| StatefulSet | 每个副本是否按序 Ready |
| DaemonSet | 期望节点数和已就绪 Pod 数 |
| Pod | Phase、Ready、Restarts、所在节点 |
| HPA | 当前副本、目标副本、指标是否可用 |

---

## 常见指标

```text
# Deployment 可用副本不足
kube_deployment_spec_replicas - kube_deployment_status_replicas_available

# Pod 重启增长
increase(kube_pod_container_status_restarts_total[15m])

# 容器 CPU 使用率
rate(container_cpu_usage_seconds_total{container!=""}[5m])

# 容器内存工作集
container_memory_working_set_bytes{container!=""}
```

---

## 常见异常处理

| 现象 | 命令 |
|------|------|
| CrashLoopBackOff | `kubectl logs <pod> --previous` |
| OOMKilled | `kubectl describe pod <pod>` |
| ImagePullBackOff | `kubectl describe pod <pod>` |
| Pending | `kubectl describe pod <pod>` |
| HPA 不扩容 | `kubectl describe hpa <name>` |

---

## 发布观察

```bash
kubectl rollout status deployment/<name> -n <namespace>
kubectl get rs,pods -n <namespace> -l app=<app>
kubectl describe deployment/<name> -n <namespace>
```

上线后至少观察副本可用数、重启次数、错误日志、CPU/内存和业务核心指标。
