---
title: "存储性能问题"
---

# 存储性能问题

存储性能问题需要先判断瓶颈在应用、文件系统、网络、云存储规格还是访问模式。

---

## 先定位存储类型

```bash
kubectl get pvc -A
kubectl describe pvc <pvc-name> -n <namespace>
kubectl get pv <pv-name> -o yaml
```

确认后端是 CBS、CFS、COS 还是本地存储，再使用对应排查路径。

---

## CBS 性能检查

- 云硬盘类型是否满足 IOPS/吞吐需求。
- 应用是否有大量 fsync、小块随机写。
- Pod 是否被调度到预期节点和可用区。
- 是否需要升级云硬盘类型或拆分数据目录。

```bash
kubectl exec -it <pod-name> -- df -h <mount-path>
kubectl exec -it <pod-name> -- sh -c 'time dd if=/dev/zero of=<mount-path>/io-test bs=1M count=1024 conv=fdatasync'
```

---

## CFS 性能检查

- 小文件数量和目录层级是否过多。
- 是否存在多个 Pod 高频写同一文件。
- CFS 类型是否满足吞吐和元数据性能。
- NFS 版本和挂载参数是否适配业务。

---

## COS 性能检查

COS 挂载不等同本地文件系统。以下场景建议改造：

- 高频随机写。
- 大量小文件 rename/list/stat。
- 对文件锁或强一致本地语义有依赖。

对象存储更适合大文件、顺序读写、归档和数据集分发；性能敏感场景可考虑本地缓存、CFS Turbo、GooseFS-Lite 或应用直接使用 COS SDK。

---

## 观测建议

- 记录 P95/P99 I/O 延迟。
- 区分读、写、元数据操作。
- 对容量、inode、小文件数量和错误率设置告警。
- 对扩容、快照、备份任务避开业务高峰。
