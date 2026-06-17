---
title: "Service"
---

# Service

Service 是 Kubernetes 中最常用的网络抽象，用于为一组动态变化的 Pod 提供稳定访问入口。TKE 支持标准 Kubernetes Service 类型，并在 `LoadBalancer` 场景下对接腾讯云 CLB。

## 本章内容

| 文档 | 适用场景 |
|------|----------|
| [Service 类型](01-service-types.md) | 选择 ClusterIP、NodePort、LoadBalancer 或 ExternalName |
| [LoadBalancer Service](02-loadbalancer-service.md) | 通过腾讯云 CLB 对外暴露服务 |

## 选择建议

| 类型 | 访问范围 | 推荐用途 |
|------|----------|----------|
| ClusterIP | 集群内 | 微服务之间调用 |
| NodePort | 节点 IP + 端口 | 临时调试、非生产入口 |
| LoadBalancer | 公网或 VPC 内网 | 生产四层入口 |
| ExternalName | DNS CNAME | 映射外部服务 |

生产环境对外入口优先使用 `LoadBalancer` 或 Ingress，不建议直接依赖 NodePort 暴露业务。
