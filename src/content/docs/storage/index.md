---
title: "存储"
---

# 存储

TKE 存储板块面向 Kubernetes 持久化存储操作，覆盖 PV、PVC、StorageClass、CBS 云硬盘、CFS 文件存储、COS 对象存储和常见挂载故障排查。

---

## 学习路径

| 阶段 | 目标 | 推荐文档 |
|------|------|----------|
| 基础概念 | 理解 PV/PVC/StorageClass/CSI 和访问模式 | [存储基础概念](01-storage-concepts.md) |
| 块存储 | 为数据库、StatefulSet、单 Pod 状态服务创建云硬盘 | [动态创建 CBS PVC](cbs/01-dynamic-cbs-pvc.md) |
| 共享文件 | 为多副本服务挂载共享文件系统 | [使用 CFS PVC](cfs/01-cfs-pvc.md) |
| 对象存储 | 将 COS 挂载给数据集、模型、备份类任务 | [挂载 COS](cos/01-mount-cos.md) |
| 故障处理 | 定位 PVC Pending、VolumeMount 失败、性能异常 | [存储排障](troubleshooting/) |

---

## 存储类型选择

| 存储 | Kubernetes 对象 | 访问模式 | 适用场景 |
|------|----------------|----------|----------|
| CBS 云硬盘 | StorageClass/PVC/PV | ReadWriteOnce | 数据库、队列、单 Pod 状态服务 |
| CFS 文件存储 | StorageClass/PVC/PV | ReadWriteMany | 多 Pod 共享目录、配置、模型缓存 |
| COS 对象存储 | PV/PVC 或 SDK | ReadWriteMany | 数据集、模型、备份、日志归档 |
| 本地存储 | emptyDir/hostPath/local PV | 视配置而定 | 临时缓存、高性能本地读写 |

CBS 是块存储，通常一个云硬盘同时只能挂载到一个节点；CFS 和 COS 可用于多 Pod 共享，但语义、性能和一致性与本地文件系统不同。

---

## 快速命令

```bash
kubectl get storageclass
kubectl get pv
kubectl get pvc -A
kubectl describe pvc <pvc-name> -n <namespace>
kubectl describe pod <pod-name> -n <namespace>
```

---

## 官方参考

- [腾讯云 TKE 使用云硬盘 CBS](https://cloud.tencent.com/document/product/457/44237)
- [腾讯云 TKE StorageClass 管理云硬盘模板](https://cloud.tencent.com/document/product/457/44239)
- [腾讯云 TKE PV 和 PVC 管理文件存储](https://cloud.tencent.com/document/product/457/44236)
- [腾讯云 TKE 使用对象存储 COS](https://cloud.tencent.com/document/product/457/44232)
