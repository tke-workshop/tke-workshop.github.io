---
title: "成本"
---

# 存储成本

存储成本来自容量、快照、备份、请求、流量和闲置资源。生产环境需要把 PVC 与云资源成本打通治理。

## 成本治理

- PVC、PV、云硬盘、CFS、COS Bucket 添加统一标签。
- 定期清理 Released PV、未绑定 PVC、闲置快照和测试 Bucket。
- 对 `Retain` 资源建立人工回收流程。
- COS 使用生命周期规则转低频或归档。
- 避免为临时缓存申请长期高性能云盘。

## 检查命令

```bash
kubectl get pv
kubectl get pvc -A
kubectl get storageclass
```

重点关注状态为 `Released`、长时间 `Pending`、命名不规范或缺少标签的资源。
