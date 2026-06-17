---
title: "Ingress"
---

# Ingress

Ingress 用于管理 HTTP/HTTPS 入口，把域名和路径路由到集群内 Service。它适合多个 Web 服务共享一个入口、统一 TLS 证书、按路径或域名分流的场景。

## 本章内容

| 文档 | 适用场景 |
|------|----------|
| [CLB Ingress](01-clb-ingress.md) | 使用腾讯云 CLB 作为七层入口 |

## Ingress 与 Service 的关系

Ingress 不直接选择 Pod，而是转发到后端 Service；Service 再通过 Endpoint/EndpointSlice 转发到 Pod。

```mermaid
flowchart LR
    Client[Client] --> CLB[CLB]
    CLB --> Ingress[Ingress Rule]
    Ingress --> Service[ClusterIP Service]
    Service --> Pod[Pod]
```

如果只是暴露单个 TCP/UDP 服务，优先使用 `LoadBalancer` Service；如果需要 HTTP 路由、域名和 TLS，使用 Ingress。
