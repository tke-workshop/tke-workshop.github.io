---
title: "扩缩原生节点池"
---

# 扩缩原生节点池

## 文档元信息

- **功能名称**: 扩缩原生节点池
- **主要对象**: `MachineSet`
- **文档更新时间**: 2026-06-17
- **Agent 友好度**: ⭐⭐⭐⭐

---

## 功能概述

原生节点池通过 `MachineSet` 的 `replicas` 和 `scaling` 字段控制节点数量。未开启自动伸缩时，可以直接调整 `replicas`；开启自动伸缩时，主要调整 `minReplicas`、`maxReplicas` 和扩容策略。

---

## 手动扩缩容

### 查看当前副本数

```bash
kubectl get machineset
kubectl describe machineset native-backend-pool
```

### 调整副本数

```bash
kubectl scale machineset/native-backend-pool --replicas=5
```

验证：

```bash
kubectl get machine
kubectl get nodes -l node-type=native
```

---

## 调整自动伸缩范围

编辑 `MachineSet`:

```bash
kubectl edit machineset native-backend-pool
```

修改：

```yaml
spec:
  replicas: 3
  scaling:
    minReplicas: 2
    maxReplicas: 20
    createPolicy: ZonePriority
```

常用扩容策略：

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| ZonePriority | 首选可用区优先 | 希望优先使用指定可用区 |
| ZoneEquality | 多可用区打散 | 希望节点跨可用区均衡 |

---

## 缩容前迁移 Pod

```bash
kubectl get nodes -l node-type=native -o wide
kubectl cordon <node-name>
kubectl drain <node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=10m
```

然后再降低 `MachineSet` 副本数：

```bash
kubectl scale machineset/native-backend-pool --replicas=2
```

---

## 注意事项

1. 如果直接删除 `Machine`，但 `MachineSet.spec.replicas` 未降低，控制器会重新创建节点。
2. 开启自动伸缩后，不建议长期手动调整副本数。
3. 缩容前先确认业务 Pod 已迁移，避免关键服务容量不足。
4. 多可用区扩容前确认各子网 IP 和机型库存。

---

## 相关文档

- [创建原生节点池](./01-create-native-node-pool.md)
- [管理原生节点](./03-manage-native-node.md)
- [维护 TKE 节点](../node/03-maintain-node.md)
