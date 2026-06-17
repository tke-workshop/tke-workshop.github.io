---
title: "存储配置"
---

# 存储配置

TKE 的基础存储能力已整理到独立的 [存储](../storage/) 板块。这里保留为 Data on TKE 的入口，主要用于承接数据处理、AI 训练和批任务场景中的存储选型。

## 推荐阅读

| 场景 | 文档 |
|------|------|
| 了解 PV/PVC/StorageClass/CSI | [存储基础概念](../storage/01-storage-concepts.md) |
| 数据库、单 Pod 状态服务 | [动态创建 CBS PVC](../storage/cbs/01-dynamic-cbs-pvc.md) |
| 多 Pod 共享文件 | [使用 CFS PVC](../storage/cfs/01-cfs-pvc.md) |
| 数据集、模型、备份归档 | [挂载 COS](../storage/cos/01-mount-cos.md) |
| PVC Pending 或挂载失败 | [存储排障](../storage/troubleshooting/) |

## Data 场景建议

- 训练数据和模型文件优先评估 CFS、CFS Turbo、COS 或 GooseFS-Lite。
- 数据库、队列、单副本状态服务优先使用 CBS。
- 临时缓存可使用 emptyDir、本地盘或节点缓存，但不要存放唯一副本数据。
