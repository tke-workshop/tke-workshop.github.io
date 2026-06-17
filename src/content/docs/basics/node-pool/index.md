---
title: "节点池管理"
---

# 节点池管理

节点池用于批量管理一组配置相同或相近的节点，是生产集群管理普通 CVM 节点的推荐方式。与手动添加单个节点相比，节点池能统一配置机型、磁盘、标签、污点、运行时、操作系统和伸缩范围。

## 节点类型边界

| 类型 | 目录 | 主要对象 | 适用场景 |
|------|------|----------|----------|
| 普通节点 | `node/` | 单个 CVM 节点 | 少量节点、存量 CVM 加入、节点维护 |
| 标准节点池 | `node-pool/` | AS 组 + 普通 CVM 节点 | 生产环境批量节点管理、自动伸缩 |
| 原生节点 | `native-node/` | `MachineSet` / `Machine` | 声明式节点管理、高利用率、原生节点能力 |
| 超级节点 | `supernode/` | 虚拟节点池 / 虚拟节点 | Serverless 容器、秒级弹性、按需资源 |

!!! tip "推荐路径"
    新建生产集群时优先使用标准节点池或原生节点池。只有在接入已有 CVM、做节点维修或处理特殊节点时，才直接使用普通节点管理文档。

## 文档列表

| 章节 | 内容 | API |
|------|------|-----|
| [创建节点池](01-create-node-pool.md) | 创建标准节点池 | `CreateClusterNodePool` |
| [扩缩节点池](02-scale-node-pool.md) | 修改伸缩范围、标签、污点 | `ModifyClusterNodePool` |
| [查询节点池](03-describe-node-pool.md) | 查询列表和详情 | `DescribeClusterNodePools` / `DescribeClusterNodePoolDetail` |
| [删除节点池](04-delete-node-pool.md) | 安全删除节点池 | `DeleteClusterNodePool` |

## 设计建议

1. 按业务类型或资源规格拆节点池，例如 `frontend-pool`、`backend-pool`、`gpu-pool`。
2. 使用稳定标签承载调度语义，例如 `node-pool=backend`、`workload-type=online`。
3. 用腾讯云资源标签承载成本语义，例如 `cost-center=cc-1001`、`owner=platform-team`。
4. 缩容前先迁移业务 Pod，确认 PDB、DaemonSet、PVC、日志采集和监控组件不受影响。
5. 不要混用 `nodepool/` 旧目录内容，标准节点池 API 统一使用 `CreateClusterNodePool` 这一族。
