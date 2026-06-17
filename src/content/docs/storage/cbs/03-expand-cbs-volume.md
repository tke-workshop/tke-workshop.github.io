---
title: "扩容 CBS PVC"
---

# 扩容 CBS PVC

CBS PVC 扩容用于提升已有云硬盘容量。扩容前确认 StorageClass 允许扩容，并且应用和文件系统支持在线扩容。

---

## 检查 StorageClass

```bash
kubectl get storageclass cbs-premium -o yaml
```

确认包含：

```yaml
allowVolumeExpansion: true
```

如果未启用扩容，需要新建支持扩容的 StorageClass，并通过迁移方式处理存量数据。

---

## 修改 PVC 容量

```bash
kubectl patch pvc mysql-data \
  -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
```

```bash
kubectl get pvc mysql-data -w
kubectl describe pvc mysql-data
```

只能扩容，不能直接缩容 PVC。缩容通常需要新建较小容量卷并迁移数据。

---

## 在 Pod 内验证

```bash
kubectl exec -it mysql-0 -- df -h /var/lib/mysql
```

如果容量未变化，检查 Pod 事件、PVC conditions 和 CSI 组件日志。有些文件系统或旧版本组件可能需要 Pod 重建后完成文件系统扩展。

---

## 扩容前检查

- 已完成数据备份或快照。
- 确认目标容量不超过产品限制和配额。
- 确认业务低峰执行，便于回滚和观察。
- 记录扩容前后容量、时间和操作者。

---

## 常见问题

| 现象 | 可能原因 |
|------|----------|
| PVC 容量不变 | StorageClass 未开启 `allowVolumeExpansion` |
| Pod 内容量未变化 | 文件系统扩展未完成或 Pod 未重新挂载 |
| 扩容失败 | CBS 配额不足、云盘状态异常或 CSI 组件异常 |
