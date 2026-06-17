---
title: "COS 对象存储"
---

# COS 对象存储

COS 适合对象化数据、训练数据集、模型文件、备份和归档。TKE 可通过 COS-CSI 将 COS Bucket 挂载到 Pod，也可以让应用直接使用 COS SDK 访问。

## 本章内容

| 文档 | 适用场景 |
|------|----------|
| [挂载 COS](01-mount-cos.md) | 通过 PV/PVC 将 COS 挂载到工作负载 |
| [COS Secret 与权限](02-cos-secret-and-permission.md) | 管理访问密钥、Secret 和最小权限 |
