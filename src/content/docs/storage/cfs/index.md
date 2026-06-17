---
title: "CFS 文件存储"
---

# CFS 文件存储

CFS 适合多 Pod 共享读写文件，例如共享配置、上传目录、模型缓存、训练数据目录等。TKE 通过 CFS-CSI 支持动态创建文件系统，也支持绑定已有文件系统。

## 本章内容

| 文档 | 适用场景 |
|------|----------|
| [使用 CFS PVC](01-cfs-pvc.md) | 创建 CFS StorageClass 和 PVC |
| [CFS 共享卷](02-cfs-shared-volume.md) | 多 Pod 同时挂载同一个 PVC |
