---
title: "Kubernetes 对象操作"
---

# Kubernetes 对象操作

本章聚合 TKE 集群内的 Kubernetes 侧日常操作：连接集群、使用 `kubectl` 查看资源、创建或更新对象、排障和清理资源。

与集群、节点、节点池这类云资源不同，Deployment、Service、ConfigMap、Secret、Ingress、Job 等对象都属于 Kubernetes API 管理范围。基础模块不再为每一种对象拆分独立的创建、更新、删除长文，而是提供一套通用操作方法。

## 文档列表

| 章节 | 内容 | 适用对象 |
|------|------|----------|
| [连接集群](01-connect-cluster.md) | 获取 kubeconfig、配置 context、验证集群连接 | TKE 集群 |
| [常用 kubectl 命令操作](02-kubectl-common-operations.md) | 查看、应用、更新、删除、排障 Kubernetes 对象 | Pod、Deployment、Service、ConfigMap、Secret、Ingress、Job |

## 典型路径

1. 创建 TKE 集群和节点池。
2. 获取 kubeconfig 并连接集群。
3. 使用 `kubectl apply -f` 部署 Kubernetes 对象。
4. 使用 `kubectl get/describe/logs/events` 验证和排障。
5. 使用 `kubectl delete -f` 清理资源。

## 对象操作边界

| 操作对象 | 推荐入口 | 说明 |
|----------|----------|------|
| 集群生命周期 | `cluster/` | 创建、查询、删除 TKE 集群 |
| 节点和节点池 | `node/`、`node-pool/`、`native-node/`、`supernode/` | 管理计算资源 |
| Kubernetes 对象 | `kubernetes/` | 管理集群内业务对象 |
| LoadBalancer 细节 | `networking/` 或最佳实践 | CLB 注解、真实客户端 IP、Ingress 等专题 |

!!! tip "文档维护建议"
    基础模块只保留通用 Kubernetes 对象操作。复杂发布策略、Service/Ingress 暴露、CLB 注解、灰度发布等内容应放到专题或最佳实践中。
