---
title: "VPC-CNI"
---

# VPC-CNI

VPC-CNI 是 TKE 基于 CNI 和 VPC 弹性网卡提供的容器网络模式。Pod 与节点处于同一 VPC 网络平面，Pod IP 来自 VPC 子网，适合低时延、固定 Pod IP、LB 直通 Pod 等场景。

---

## 适用场景

| 场景 | 说明 |
|------|------|
| 低时延服务 | 相比 Overlay/Global Router 少一层转发路径 |
| 固定 Pod IP | 传统系统按 IP 白名单访问容器服务 |
| LB 直通 Pod | 减少 NodePort 转发路径 |
| 与 VPC 资源互通 | Pod IP 可被 VPC 内资源直接识别 |

---

## 模式选择

| 模式 | 特点 | 适合场景 |
|------|------|----------|
| 共享网卡模式 | 多个 Pod 共享弹性网卡上的辅助 IP | 通用业务、较高 Pod 密度 |
| 独占网卡模式 | 每个 Pod 使用独立弹性网卡 | 高性能、强隔离、Pod 数较少 |

独占网卡模式受实例规格的 ENI 数量限制更明显；共享网卡模式更适合大多数业务。

---

## 规划清单

- 为 Pod 独立规划容器子网，不建议与 CVM、CLB 等资源共用。
- 容器子网可用区需要覆盖节点所在可用区。
- 预估每个节点最大 Pod 数，结合实例规格 ENI/IP 上限计算容量。
- 为扩容预留足够子网 IP，避免高峰扩容时 Pod 无法分配 IP。
- 需要固定 IP 时，提前设计回收、重建和灰度发布流程。

---

## 检查节点容量

```bash
kubectl get nodes
kubectl describe node <node-name> | sed -n '/Allocatable:/,/Events:/p'
```

关注 `pods`、ENI/IP 相关 allocatable 信息，以及节点所在可用区是否与容器子网匹配。

---

## Pod IP 验证

```bash
kubectl get pods -A -o wide
kubectl describe pod <pod-name> -n <namespace>
```

在 VPC-CNI 模式下，Pod IP 应来自已规划的 VPC 容器子网。

---

## 常见问题

| 现象 | 可能原因 | 处理方式 |
|------|----------|----------|
| Pod 一直 Pending | 子网 IP 不足、节点可用区不匹配、ENI/IP 达上限 | 检查事件、子网余量和节点规格 |
| Pod 无法访问 VPC 资源 | 安全组、路由或 ACL 未放通 | 检查 Pod IP 所在子网和目标资源策略 |
| 固定 IP 未保留 | 未启用固定 IP 能力或重建流程不正确 | 检查工作负载配置和 IP 回收策略 |
| 单节点 Pod 密度低 | 独占网卡模式或实例规格 ENI 上限较低 | 换用共享网卡模式或更高规格节点 |

---

## 官方参考

- [腾讯云 TKE VPC-CNI 模式介绍](https://cloud.tencent.com/document/product/457/50355)
