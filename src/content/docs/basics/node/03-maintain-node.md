---
title: "如何维护 TKE 节点"
---

# 如何维护 TKE 节点

## 文档元信息

- **功能名称**: 维护 TKE 节点
- **操作类型**: 封锁、取消封锁、驱逐、移出再移入
- **适用集群版本**: TKE 标准集群
- **文档更新时间**: 2026-06-17
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

节点维护用于在不直接删除节点的情况下，安全处理节点升级、内核修复、运行时调整、节点故障排查等场景。常见维护动作包括：

1. **封锁节点（cordon）**: 将节点设置为不可调度，阻止新的 Pod 调度到该节点。
2. **驱逐节点（drain）**: 先封锁节点，再逐出节点上的 Pod，使受控制器管理的 Pod 在其他节点重建。
3. **取消封锁（uncordon）**: 维护完成后恢复节点可调度状态。
4. **移出再移入**: 适用于 Kubernetes 版本升级、内核版本升级等需要节点重装系统的场景。

**任务目标**: 在维护节点前控制调度入口，在维护过程中迁移业务 Pod，并在维护后验证业务和节点状态恢复。

---

## 前置条件

在执行节点维护前，请确认：

- [ ] 已获取目标集群 kubeconfig，并能执行 `kubectl get nodes`
- [ ] 已确认目标节点名称（Kubernetes Node Name）和 CVM 实例 ID
- [ ] 集群中剩余节点有足够资源承载待驱逐 Pod
- [ ] 关键业务已配置副本、反亲和性或拓扑分散策略
- [ ] 已检查 PodDisruptionBudget（PDB）是否会阻止驱逐
- [ ] 已识别使用 `hostPath`、本地盘或本地缓存的 Pod，并完成备份或风险确认
- [ ] 生产环境已安排维护窗口并准备回滚方案

---

## 风险说明

驱逐不是滚动更新。驱逐节点时会先删除节点上的 Pod，再由 Deployment、ReplicaSet、StatefulSet 等控制器在其他节点重建 Pod。若业务所有副本都落在同一个待维护节点上，或 PDB、资源余量、镜像拉取速度不满足要求，可能导致服务不可用。

> 腾讯云官方文档说明，节点驱逐后会自动将节点内所有非 DaemonSet 管理的 Pod 驱逐到集群内其他节点，并将该节点设置为封锁状态；本地存储 Pod 被驱逐后数据将丢失，请谨慎操作。

---

## 操作步骤

### Step 1: 查询目标节点和业务分布

```bash
kubectl get nodes -o wide
kubectl get pods -A -o wide --field-selector spec.nodeName=<node-name>
```

检查节点资源和业务分布：

```bash
kubectl describe node <node-name>
kubectl top node <node-name>
kubectl get pdb -A
```

如果 `kubectl top` 不可用，说明集群可能未安装或未正常运行 metrics-server，请改用控制台节点页查看资源分配情况。

### Step 2: 封锁节点

封锁节点会阻止新的 Pod 调度到该节点，但不会自动迁移已经运行在该节点上的 Pod。

```bash
kubectl cordon <node-name>
```

验证节点已被标记为不可调度：

```bash
kubectl get node <node-name>
```

预期输出中应能看到 `SchedulingDisabled`：

```text
NAME          STATUS                     ROLES    AGE   VERSION
<node-name>   Ready,SchedulingDisabled    <none>   30d   v1.28.4
```

### Step 3: 驱逐节点上的 Pod

常规维护建议使用 `kubectl drain`。该命令会封锁节点并逐出节点上的 Pod。

```bash
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

参数说明：

| 参数 | 说明 |
|------|------|
| `--ignore-daemonsets` | 跳过 DaemonSet 管理的 Pod；DaemonSet Pod 不会被 drain 删除 |
| `--delete-emptydir-data` | 允许删除使用 `emptyDir` 的 Pod；其中临时数据会丢失 |
| `--timeout=10m` | 可选，限制等待驱逐完成的时间 |

如果驱逐被 PDB 阻止，请先评估业务可用性，不要直接跳过保护策略：

```bash
kubectl describe pdb -A
kubectl get events -A --sort-by=.lastTimestamp
```

### Step 4: 执行维护动作

根据维护目标选择操作：

| 场景 | 建议动作 |
|------|----------|
| 临时排障、升级节点组件、调整系统参数 | 保持节点封锁，完成维护后取消封锁 |
| 需要重装系统、内核升级、节点镜像更新 | 按腾讯云控制台流程移出节点，再添加已有节点 |
| 节点不再使用 | 转到 [删除节点](./02-delete-node.md) 执行删除流程 |

移出再移入时，请先记录节点 ID。腾讯云官方指引说明，节点移出再重新加入集群会重装系统；如需保留并挂载数据盘，应按官方说明确认数据盘挂载和容器目录设置，避免误格式化。

### Step 5: 取消封锁

维护完成并确认节点状态正常后，恢复调度：

```bash
kubectl uncordon <node-name>
```

验证节点恢复可调度：

```bash
kubectl get node <node-name>
```

预期 `STATUS` 不再包含 `SchedulingDisabled`。

---

## 验证步骤

### Step 1: 验证节点状态

```bash
kubectl get nodes -o wide
kubectl describe node <node-name>
```

检查项：

- 节点 `Ready` 状态为 `True`
- 维护后需要参与调度的节点不再显示 `SchedulingDisabled`
- `MemoryPressure`、`DiskPressure`、`PIDPressure` 等 Condition 未异常

### Step 2: 验证 Pod 已恢复

```bash
kubectl get pods -A -o wide
kubectl get pods -A --field-selector spec.nodeName=<node-name>
```

检查项：

- 业务 Pod 已在其他节点或维护后的节点上重新运行
- 无长时间 `Pending`、`CrashLoopBackOff`、`ImagePullBackOff`
- StatefulSet、DaemonSet、Deployment 的期望副本数和可用副本数一致

### Step 3: 验证业务入口

```bash
kubectl get endpoints -A
kubectl get svc -A
kubectl get ingress -A
```

检查项：

- Service Endpoints 中仍有可用后端
- 入口流量、健康检查和业务探测恢复正常
- 若节点曾作为 CLB 后端，确认负载均衡后端健康状态符合预期

---

## 回滚与恢复

### 仅封锁后需要回滚

```bash
kubectl uncordon <node-name>
```

### 驱逐后业务 Pod 未恢复

1. 查看调度失败原因：

   ```bash
   kubectl get pods -A | grep Pending
   kubectl describe pod <pod-name> -n <namespace>
   kubectl get events -A --sort-by=.lastTimestamp
   ```

2. 根据原因扩容节点、释放资源、修正亲和性或恢复 PDB。
3. 业务恢复后再决定是否继续维护。

### 移出再移入失败

1. 确认原 CVM 实例 ID、地域、子网、安全组和数据盘策略。
2. 如节点已被移出但实例仍保留，参考 [添加节点](./01-add-node.md) 重新添加已有节点。
3. 若系统盘已重装或数据盘可能被格式化，不要继续写入数据，先做人工确认。

---

## 常见问题

### Q1: `cordon` 和 `drain` 有什么区别？

`cordon` 只禁止新的 Pod 调度到该节点，不会迁移已有 Pod。`drain` 会先封锁节点，再驱逐该节点上的 Pod，适合维护前迁移业务。

### Q2: 为什么 `drain` 后还有 Pod 留在节点上？

DaemonSet 管理的 Pod 默认不会被 `drain` 删除。静态 Pod、镜像缓存、系统守护进程也可能继续存在。请区分业务 Pod 和节点系统组件。

### Q3: 是否可以使用 `--force`？

不建议作为默认动作。`--force` 可能删除不受控制器管理的裸 Pod，这类 Pod 被删除后不会自动重建。只有在确认业务风险和恢复方案后才可使用。

### Q4: 维护完成后忘记 `uncordon` 会怎样？

节点会保持不可调度状态，新的 Pod 不会调度到该节点，可能降低集群可用容量。维护结束后必须执行 `kubectl uncordon <node-name>` 或在控制台取消封锁。

---

## Agent Prompt 模板

### 安全维护 Prompt

```text
请帮我维护一个 TKE 节点：
- 集群 ID：cls-xxxxxxxx
- 节点名称：<node-name>
- 维护目标：升级节点运行时配置
- 要求：
  1. 先检查节点上的 Pod、PDB 和剩余资源
  2. 执行 cordon 和 drain
  3. 维护完成后 uncordon
  4. 验证节点 Ready、业务 Pod 恢复、Service Endpoints 正常
```

### 移出再移入 Prompt

```text
请帮我制定 TKE 节点移出再移入操作计划：
- 集群 ID：cls-xxxxxxxx
- 节点名称：<node-name>
- CVM 实例 ID：ins-xxxxxxxx
- 要求：
  1. 先驱逐 Pod 并确认业务恢复
  2. 记录节点 ID 和数据盘策略
  3. 按控制台流程移出节点
  4. 重新添加已有节点
  5. 节点添加成功后取消封锁并验证业务
```

---

## 最佳实践

1. **逐个维护节点**: 同一集群有多个节点需要维护时，先完成单个节点维护并验证业务，再处理下一个节点。
2. **先扩容后维护**: 剩余资源不足时，先新增节点或扩容节点池，再执行驱逐。
3. **保护关键业务**: 为关键服务配置合理副本数、PDB、反亲和性或拓扑分散策略。
4. **谨慎处理本地存储**: 使用 `hostPath`、本地盘、`emptyDir` 的 Pod 可能在驱逐或迁移后丢失本地数据。
5. **保留操作记录**: 记录节点名称、CVM 实例 ID、维护窗口、执行命令、验证结果和回滚动作。

---

## 相关文档

- [添加节点到集群](./01-add-node.md)
- [删除节点](./02-delete-node.md)
- [查询节点列表](./04-describe-nodes.md)
- [创建节点池](../node-pool/01-create-node-pool.md)
- [扩缩节点池](../node-pool/02-scale-node-pool.md)

---

## 官方来源

- [腾讯云：驱逐或封锁节点](https://cloud.tencent.com/document/product/457/32205)，最近更新时间：2026-06-03 16:36:04
- [腾讯云：TKE 集群中节点移出再移入操作指引](https://cloud.tencent.com/document/product/457/40771)，最近更新时间：2025-09-23 11:10:01
- [腾讯云：应用高可用部署](https://cloud.tencent.com/document/product/457/40212)，最近更新时间：2026-03-16 14:43:52
- [腾讯云：节点概述](https://cloud.tencent.com/document/product/457/32201)，最近更新时间：2026-05-13 18:33:52

---

**文档版本**: v1.0  
**最后更新**: 2026-06-17  
**维护者**: TKE Documentation Team
