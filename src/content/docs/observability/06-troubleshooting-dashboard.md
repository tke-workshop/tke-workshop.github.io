---
title: "故障看板"
---

# 故障看板

故障看板用于在告警触发后快速缩小范围。建议按“集群 -> 节点 -> 工作负载 -> 网络/存储 -> 日志/事件”组织。

---

## 看板结构

| 区域 | 内容 |
|------|------|
| 集群总览 | 节点 Ready、Pod 总数、CPU/内存/磁盘水位 |
| 异常工作负载 | Pending、CrashLoopBackOff、重启次数、不可用副本 |
| 网络入口 | Ingress/Service 5xx、Endpoint 为空、CLB 后端健康 |
| 存储 | PVC Pending、VolumeMount 失败、容量水位 |
| 日志 | error/warn 趋势、关键字、trace_id |
| 事件 | 最近 30 分钟 Warning 事件 |

---

## 一次性排查命令

```bash
kubectl get nodes
kubectl get pods -A --field-selector=status.phase!=Running
kubectl get events -A --sort-by=.lastTimestamp
kubectl get svc,endpoints,ingress -A
kubectl get pvc -A
```

---

## 常见场景

| 场景 | 第一反应 |
|------|----------|
| 页面 5xx | 看 Ingress/Service Endpoint、Pod 日志、后端健康 |
| Pod Pending | 看调度事件、节点资源、污点、PVC、子网 IP |
| 延迟升高 | 看节点水位、网络入口、应用日志、下游依赖 |
| 容器重启 | 看 previous 日志、OOM、探针、配置变更 |
| 存储挂载失败 | 看 PVC/PV、Pod event、CSI 日志、云资源状态 |

---

## 复盘输出

故障结束后保留以下信息：

- 告警时间和恢复时间。
- 影响业务和用户范围。
- 首个异常指标。
- 关键日志、事件和审计记录。
- 根因和直接恢复动作。
- 防止再次发生的变更项。
