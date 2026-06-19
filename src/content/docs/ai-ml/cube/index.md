---
title: "Cube on TKE"
---

# Cube on TKE

Cube 专题聚焦 Agent Sandbox 在 Kubernetes / TKE 节点资源池上的部署、运行时边界和性能路径。这里保留原始实践文章的主要内容，用于沉淀 CubeSandbox PVM、Kubernetes 运维底座和 Agent 短任务场景下的经验。

## 文章列表

| 文章 | 内容 |
|------|------|
| [Cube on Kubernetes：K8s 做运维底座，Cube 负责 Sandbox 快路径](01-cube-on-kubernetes-fast-path.md) | 解释 Kubernetes 与 Cube 的职责边界：K8s 管运维底座，Cube 管 sandbox 快路径。 |
| [在 Kubernetes 节点资源池上部署 CubeSandbox PVM 的实践](02-cubesandbox-pvm-on-kubernetes-practice.md) | 介绍在 Kubernetes 节点资源池中部署 CubeSandbox PVM、入口、调度和运维的实践路径。 |
| [Agent 短任务场景下，Cube PVM 与 Pod 启动路径的一次对比](03-agent-sandbox-performance-practice.md) | 对比 Cube PVM、Pod Job 和 warm Pod exec 在 Agent 短任务场景下的路径开销。 |
