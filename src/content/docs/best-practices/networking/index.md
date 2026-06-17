---
title: "网络"
---

# 网络

网络最佳实践关注生产环境的选型、容量、安全和可运维性。具体 YAML 和操作步骤请参考 [网络教程](../../networking/)。

## 实践清单

| 主题 | 重点 |
|------|------|
| [Service 配置](service.md) | CLB 生命周期、来源 IP、配额和清理 |
| [Ingress 实践](ingress.md) | 入口复用、TLS、灰度和后端健康 |
| [网络策略](network-policy.md) | 默认拒绝、命名空间隔离、DNS 放通 |
| [VPC-CNI](vpc-cni.md) | 子网规划、Pod IP、ENI/IP 容量 |

## 生产设计原则

1. 入口流量统一收敛到 Ingress 或 LoadBalancer Service，避免业务直接暴露 NodePort。
2. 网络资源和业务资源一起纳入标签、成本和责任人治理。
3. 子网、CLB、节点安全组、NetworkPolicy 分层控制，避免只依赖单一边界。
4. 所有对外入口配置健康检查、监控告警和删除保护。
5. 网络变更采用灰度策略，避免直接切换公网/内网/已有 CLB 等不可逆或高风险参数。
