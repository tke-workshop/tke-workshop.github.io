---
title: "CBS 云硬盘"
---

# CBS 云硬盘

CBS 云硬盘适合数据库、消息队列、StatefulSet、单 Pod 状态服务等需要块存储的场景。通过 TKE 的 CBS-CSI 组件，可以使用 StorageClass 动态创建云硬盘，也可以绑定已有云硬盘。

## 本章内容

| 文档 | 适用场景 |
|------|----------|
| [动态创建 CBS PVC](01-dynamic-cbs-pvc.md) | 新业务按声明自动创建云硬盘 |
| [使用已有 CBS](02-static-cbs-pv.md) | 迁移或复用已有云硬盘 |
| [扩容 CBS PVC](03-expand-cbs-volume.md) | 调整云硬盘容量 |
