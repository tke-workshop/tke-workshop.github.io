---
title: "维护 TKE 节点"
---

# 维护 TKE 节点

## 文档元信息

- **功能名称**: 节点维护
- **适用对象**: 普通节点、节点池中的普通节点
- **文档更新时间**: 2026-06-17
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

节点维护用于在升级、排障、缩容或删除节点前安全迁移业务 Pod。核心流程是：设置节点不可调度、驱逐业务 Pod、执行维护动作、根据结果恢复调度或删除节点。

---

## 标准维护流程

### Step 1: 查看节点状态

```bash
kubectl get nodes -o wide
kubectl describe node <node-name>
kubectl get pods -A -o wide --field-selector spec.nodeName=<node-name>
```

### Step 2: 设置节点不可调度

```bash
kubectl cordon <node-name>
```

验证：

```bash
kubectl get node <node-name>
```

节点状态应包含 `SchedulingDisabled`。

### Step 3: 驱逐业务 Pod

```bash
kubectl drain <node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=10m
```

!!! warning "驱逐影响"
    `drain` 会驱逐节点上的可驱逐 Pod。执行前应确认副本数、PodDisruptionBudget、持久化存储和业务高可用策略。

### Step 4: 执行维护动作

常见维护动作：

- 检查 kubelet、containerd、系统日志
- 升级节点组件或操作系统
- 从集群移除节点
- 删除或替换底层 CVM

### Step 5: 恢复调度

如果维护后继续使用该节点：

```bash
kubectl uncordon <node-name>
```

如果需要删除节点，参考 [删除节点](./02-delete-node.md) 或 [删除节点池](../node-pool/04-delete-node-pool.md)。

---

## 常见排障命令

```bash
# 查看 kubelet 状态
systemctl status kubelet

# 查看 containerd 状态
systemctl status containerd

# 查看 kubelet 日志
journalctl -u kubelet -n 200 --no-pager

# 查看容器运行时日志
journalctl -u containerd -n 200 --no-pager
```

---

## drain 常见阻塞

| 现象 | 原因 | 处理方式 |
|------|------|----------|
| PDB 阻止驱逐 | 可用副本不足 | 临时扩容副本或调整维护窗口 |
| DaemonSet Pod 未删除 | DaemonSet 由控制器管理 | 使用 `--ignore-daemonsets` |
| emptyDir 数据阻止 | Pod 使用本地临时数据 | 确认可丢弃后使用 `--delete-emptydir-data` |
| StatefulSet 迁移慢 | 存储挂载或应用启动慢 | 等待重建完成，不要强制批量删除 |

---

## 最佳实践

1. 每次只维护少量节点，避免同时损失过多容量。
2. 维护前先确认替代节点池容量充足。
3. 对核心服务配置 PDB 和多副本。
4. 维护完成后检查 `Pending` Pod、服务错误率和节点资源水位。
5. 节点池缩容优先通过节点池 API，不要直接删除节点池托管的节点。
