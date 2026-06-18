---
title: "事件与审计"
---

# 事件与审计

事件和审计用于还原故障时间线。事件记录 Kubernetes 调度、拉镜像、挂载、驱逐等动作；审计记录用户、控制器或自动化系统对 API Server 的操作。

---

## 查看事件

```bash
kubectl get events -A --sort-by=.lastTimestamp
kubectl get events -n <namespace> --field-selector involvedObject.name=<pod-name>
kubectl describe pod <pod-name> -n <namespace>
```

事件适合定位：

- Pod Pending 原因。
- 镜像拉取失败。
- PVC 绑定和挂载失败。
- 节点驱逐和资源不足。
- 调度失败和污点不匹配。

---

## 常见事件

| Reason | 含义 |
|--------|------|
| FailedScheduling | 调度失败 |
| FailedMount | 卷挂载失败 |
| BackOff | 容器重启退避 |
| Unhealthy | 探针失败 |
| Evicted | Pod 被驱逐 |
| FailedCreatePodSandBox | Pod 沙箱创建失败 |

---

## 审计关注点

| 场景 | 关注对象 |
|------|----------|
| 误删资源 | delete namespace/deployment/pvc |
| 权限变更 | rolebinding/clusterrolebinding |
| 配置变更 | configmap/secret/deployment patch |
| 入口变更 | ingress/service annotation |
| 扩缩容 | scale deployment/nodepool |

审计日志需要和 GitOps、CI/CD、控制台操作记录一起看，避免只看到 Kubernetes 资源变化却找不到操作者。

---

## 故障时间线模板

```text
时间:
影响范围:
首次告警:
相关事件:
相关操作:
日志证据:
恢复动作:
后续改进:
```

复盘时把事件、审计、日志、监控曲线放在同一时间轴上，能更快区分“触发原因”和“连锁反应”。
