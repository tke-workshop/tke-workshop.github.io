---
title: "集群监控"
---

# 集群监控

集群监控用于判断 TKE 集群整体是否健康，重点关注节点、控制面、系统组件、资源水位和网络存储依赖。

---

## 前置条件

- 已连接 TKE 集群。
- 已启用集群监控、Managed Prometheus 或等效指标采集能力。
- 已安装 `kubectl`，并具备查看节点、Pod、事件的权限。

---

## 核心检查项

| 维度 | 关注指标 |
|------|----------|
| 节点 | Ready 状态、CPU、内存、磁盘、网络、Pod 容量 |
| 控制面 | API Server 错误率、请求延迟、限流、连接失败 |
| 系统组件 | CoreDNS、kube-proxy、CSI、CNI、metrics-server |
| 容量 | 可调度 CPU/内存、Pod 数、PVC、CLB、子网 IP |
| 事件 | Node NotReady、驱逐、镜像拉取、挂载失败 |

---

## 常用命令

```bash
kubectl get nodes -o wide
kubectl describe node <node-name>
kubectl top nodes
kubectl get pods -n kube-system -o wide
kubectl get events -A --sort-by=.lastTimestamp
```

如果 `kubectl top` 不可用，优先检查指标采集组件是否部署完成。

---

## PromQL 示例

```text
# 节点 Ready 数量
sum(kube_node_status_condition{condition="Ready",status="true"})

# 节点 CPU 使用率
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 节点内存使用率
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# API Server P99 延迟
histogram_quantile(0.99, rate(apiserver_request_duration_seconds_bucket[5m]))
```

指标名称取决于采集组件和版本，使用前先在 Prometheus 查询页确认实际 label。

---

## 看板建议

- 集群总览：节点数、Pod 数、CPU/内存/磁盘总水位。
- 节点详情：单节点资源、Pod 密度、网络、磁盘。
- 系统组件：CoreDNS、CSI、CNI、kube-proxy 状态。
- 控制面：API Server 延迟、错误率、限流、请求量。

---

## 常见异常

| 现象 | 优先检查 |
|------|----------|
| 节点 NotReady | `kubectl describe node`、kubelet、网络、安全组 |
| CoreDNS 异常 | `kube-system` Pod、DNS QPS、上游 DNS |
| API 请求慢 | 控制面规格、客户端 list/watch、限流 |
| Pod 大量 Pending | 节点资源、污点、PVC、子网 IP |
