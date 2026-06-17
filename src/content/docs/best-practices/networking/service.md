---
title: "Service 配置"
---

# Service 配置

Service 的生产实践重点不是 YAML 本身，而是访问方式、CLB 生命周期、来源 IP、配额和故障边界。

---

## 类型选择

| 类型 | 建议 |
|------|------|
| ClusterIP | 作为集群内服务调用默认选择 |
| NodePort | 只用于临时调试或被外部网关接入，不作为长期公网入口 |
| LoadBalancer | 四层生产入口首选，配套 CLB 监控和告警 |
| ExternalName | 用于外部依赖抽象，不承载流量代理能力 |

---

## LoadBalancer 设计建议

- 明确公网或内网访问方式，创建后避免直接切换。
- 内网 CLB 独立规划子网，确认访问来源网络可达。
- 使用已有 CLB 前确认监听器、后端、证书和其他业务共用关系。
- 复制 Service YAML 时删除 `service.cloud.tencent.com/client-token` 注解。
- 对关键入口配置 CLB 健康检查、后端异常、带宽和连接数告警。

腾讯云 TKE 文档说明，Service 与 CLB 的访问方式、已有 CLB 绑定、CLB 类型等生命周期变更存在限制；需要切换时，建议先迁移流量或重建 Service。

---

## 来源 IP

| 策略 | 特点 | 风险 |
|------|------|------|
| `externalTrafficPolicy: Cluster` | 负载更均衡，可转发到所有后端 Pod | 后端可能无法直接看到真实客户端 IP |
| `externalTrafficPolicy: Local` | 可保留客户端源 IP | 没有本地 Pod 的节点可能健康检查失败，流量可能不均衡 |

如果业务依赖客户端 IP 做审计、限流或安全策略，需要在发布前验证 `Local` 模式下每个节点的 Pod 分布和健康检查结果。

---

## 安全组和端口

- NodePort 默认端口段为 `30000-32767`，只放通必要来源。
- CLB 后端到节点的访问需要安全组允许对应端口。
- VPC-CNI 场景下，目标系统可能看到 Pod IP，需要额外检查 Pod 子网和安全策略。

---

## 清理策略

删除 LoadBalancer Service 前，确认 CLB 是自动创建还是已有 CLB。自动创建的 CLB 通常随 Service 生命周期回收；已有 CLB 可能仍承载其他业务，不应直接删除。

---

## 参考

- [腾讯云 TKE Service 基本功能](https://cloud.tencent.com/document/product/457/45489)
