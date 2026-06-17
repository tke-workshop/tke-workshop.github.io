---
title: "管理原生节点"
---

# 管理原生节点

## 文档元信息

- **功能名称**: 管理原生节点
- **主要对象**: `Machine`
- **文档更新时间**: 2026-06-17
- **Agent 友好度**: ⭐⭐⭐⭐

---

## 功能概述

原生节点在 Kubernetes 中对应 `Machine` 对象。通过 `Machine` 可以查看节点生命周期、节点详情和故障状态。维护或删除原生节点时，需要同时理解 `MachineSet` 期望副本数和实际节点数量之间的关系。

---

## 查询原生节点

### 查看 Machine 列表

```bash
kubectl get machine
```

### 查看 Machine 详情

```bash
kubectl describe machine <machine-name>
```

### 查看对应 Kubernetes Node

```bash
kubectl get nodes -l node-type=native -o wide
kubectl describe node <node-name>
```

---

## 维护原生节点

### 设置不可调度

```bash
kubectl cordon <node-name>
```

### 驱逐业务 Pod

```bash
kubectl drain <node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=10m
```

### 恢复调度

```bash
kubectl uncordon <node-name>
```

---

## 删除原生节点

### 推荐方式

先降低 `MachineSet` 副本数：

```bash
kubectl scale machineset/native-backend-pool --replicas=2
```

再删除目标 `Machine`：

```bash
kubectl delete machine <machine-name>
```

!!! warning "避免自动补回"
    如果未降低 `MachineSet` 的 `replicas`，直接删除 `Machine` 后，控制器会认为实际节点数不足，并重新创建一个节点。

---

## 排查方法

| 现象 | 检查命令 | 处理建议 |
|------|----------|----------|
| Machine 长时间创建中 | `kubectl describe machine <name>` | 查看事件、子网、机型库存和配额 |
| Node NotReady | `kubectl describe node <name>` | 检查 kubelet、containerd 和网络 |
| 删除后节点又出现 | `kubectl get machineset` | 降低 `replicas` 后再删除 |
| Pod 不调度 | `kubectl describe pod <pod>` | 检查污点、标签、亲和性和资源余量 |

---

## 相关文档

- [创建原生节点池](./01-create-native-node-pool.md)
- [扩缩原生节点池](./02-scale-native-node-pool.md)
- [维护 TKE 节点](../node/03-maintain-node.md)
