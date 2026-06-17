---
title: "NetworkPolicy"
---

# NetworkPolicy

NetworkPolicy 用于控制 Pod 入站和出站流量。它适合多租户隔离、生产命名空间默认拒绝、只允许特定服务访问数据库等场景。

## 本章内容

| 文档 | 适用场景 |
|------|----------|
| [命名空间隔离](01-namespace-isolation.md) | 从默认拒绝开始配置最小放通 |

## 使用前确认

NetworkPolicy 是否生效取决于集群网络插件能力。配置前先确认当前 TKE 集群的 CNI 和网络策略能力，避免 YAML 已创建但实际流量不受控。
