---
title: "网络排障"
---

# 网络排障

网络排障建议按“应用 -> Pod -> Service -> Endpoint -> Ingress/CLB -> 安全组/路由”的顺序逐层定位，避免一开始就跳到云资源侧。

## 本章内容

| 文档 | 适用场景 |
|------|----------|
| [Service 连通性排障](01-service-connectivity.md) | Service 无法访问、Endpoint 为空、CLB Pending |
