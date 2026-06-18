---
title: "告警配置"
---

# 告警配置

告警配置的目标是让值班人收到“需要行动”的信号，而不是把所有指标波动都推送出来。

---

## 告警分级

| 级别 | 含义 | 示例 |
|------|------|------|
| critical | 影响生产可用性，需要立即处理 | 多节点 NotReady、核心服务不可用 |
| warning | 有风险，需要尽快处理 | Pod 重启增多、PVC 容量接近上限 |
| info | 观察或记录 | 扩容完成、发布完成 |

---

## 推荐告警

| 类别 | 告警 |
|------|------|
| 节点 | NodeNotReady、CPU/内存/磁盘持续高水位 |
| 工作负载 | Deployment 可用副本不足、Pod 重启过多、OOMKilled |
| 存储 | PVC 容量不足、VolumeMount 失败、CSI 异常 |
| 网络 | Service Endpoint 为空、Ingress 5xx、CLB 后端异常 |
| 控制面 | API Server 错误率、P99 延迟、限流 |
| 日志 | error 日志突增、关键错误关键字 |

---

## PrometheusRule 示例

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: workload-alerts
  namespace: monitoring
spec:
  groups:
    - name: workload.rules
      rules:
        - alert: DeploymentReplicasUnavailable
          expr: kube_deployment_spec_replicas - kube_deployment_status_replicas_available > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Deployment 可用副本不足"
            description: "{{ $labels.namespace }}/{{ $labels.deployment }} 持续 10 分钟可用副本不足"
        - alert: PodRestartTooOften
          expr: increase(kube_pod_container_status_restarts_total[15m]) > 3
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pod 重启过多"
            description: "{{ $labels.namespace }}/{{ $labels.pod }} 15 分钟内重启超过 3 次"
```

---

## 告警治理

- 每条告警必须有负责人、处理手册和静默规则。
- 告警描述包含集群、命名空间、资源名、影响范围和查询链接。
- 对抖动告警设置合理 `for` 时间。
- 对已知维护窗口配置静默。
- 定期复盘误报、漏报和无人处理告警。
