---
title: "扩缩节点池"
---

# 扩缩节点池

## 文档元信息

- **功能名称**: 扩缩标准节点池
- **API 版本**: 2018-05-25
- **API 名称**: `ModifyClusterNodePool`
- **文档更新时间**: 2026-06-17
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

通过 `ModifyClusterNodePool` 可以调整节点池的伸缩开关、最小节点数、最大节点数、标签、污点、资源标签和删除保护等配置。节点池扩缩容适用于业务高峰扩容、低峰缩容、压测临时扩容和成本优化。

!!! warning "自动伸缩与手动期望数"
    标准节点池由弹性伸缩能力管理节点数量。开启自动伸缩时，应主要调整 `MinNodesNum`、`MaxNodesNum` 和伸缩策略；如果需要固定节点数量，先确认当前节点池是否允许手动调整期望容量，避免与自动伸缩控制器互相覆盖。

---

## 前置条件

- [ ] 已创建节点池，并记录 `NodePoolId`
- [ ] 集群和节点池状态正常
- [ ] 扩容前确认 CVM、CBS、ENI、子网 IP 和账户余额充足
- [ ] 缩容前确认业务 Pod 可迁移，关键工作负载已配置 PDB

---

## 参数说明

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|------|------|------|--------|
| ClusterId | 是 | String | 集群 ID | cls-xxxxxxxx |
| NodePoolId | 是 | String | 节点池 ID | np-xxxxxxxx |
| Name | 否 | String | 节点池名称 | production-pool |
| MinNodesNum | 否 | Integer | 最小节点数 | 3 |
| MaxNodesNum | 否 | Integer | 最大节点数 | 20 |
| EnableAutoscale | 否 | Boolean | 是否开启自动伸缩 | true |
| Labels | 否 | Array | 节点标签 | env=production |
| Taints | 否 | Array | 节点污点 | dedicated=backend:NoSchedule |
| Tags | 否 | Array | 腾讯云资源标签 | cost-center=cc-1001 |
| DeletionProtection | 否 | Boolean | 删除保护开关 | true |

---

## 操作步骤

### Step 1: 查看节点池当前状态

```bash
tccli tke DescribeClusterNodePoolDetail \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx
```

关注以下字段：

- `NodeCountSummary`: 当前节点数量
- `AutoscalingGroupStatus`: 伸缩组状态
- `MaxNodesNum` / `MinNodesNum`: 伸缩范围
- `Labels` / `Taints`: 调度相关配置

### Step 2: 调整伸缩范围

```bash
tccli tke ModifyClusterNodePool \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx \
  --EnableAutoscale true \
  --MinNodesNum 3 \
  --MaxNodesNum 20
```

### Step 3: 更新标签或污点

```bash
tccli tke ModifyClusterNodePool \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx \
  --Labels '[
    {"Name": "env", "Value": "production"},
    {"Name": "workload-type", "Value": "backend"}
  ]' \
  --Taints '[
    {"Key": "dedicated", "Value": "backend", "Effect": "NoSchedule"}
  ]'
```

### Step 4: 使用 Python SDK 修改伸缩范围

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import models, tke_client

cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

req = models.ModifyClusterNodePoolRequest()
req.ClusterId = "cls-xxxxxxxx"
req.NodePoolId = "np-xxxxxxxx"
req.EnableAutoscale = True
req.MinNodesNum = 3
req.MaxNodesNum = 20

resp = client.ModifyClusterNodePool(req)
print(f"RequestId: {resp.RequestId}")
```

---

## 验证步骤

### 查看节点池详情

```bash
tccli tke DescribeClusterNodePoolDetail \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx
```

### 查看 Kubernetes 节点

```bash
kubectl get nodes -l node-pool=production-pool -o wide
kubectl describe node <node-name>
```

### 验证业务 Pod 分布

```bash
kubectl get pods -A -o wide
kubectl describe pod <pod-name> -n <namespace>
```

---

## 缩容注意事项

1. 缩容前先确认节点上的 Pod 可以被驱逐。
2. 对关键服务配置 PodDisruptionBudget，避免一次性驱逐过多副本。
3. 使用污点、亲和性或节点标签控制业务迁移范围。
4. 如果节点池开启自动伸缩，不要长期手动修改节点数量。
5. 缩容后检查 PVC、DaemonSet、日志采集和监控组件状态。

---

## 常见问题

| 问题 | 可能原因 | 处理方式 |
|------|----------|----------|
| 扩容后节点未创建 | 配额不足、库存不足、子网 IP 不足 | 检查 CVM 库存、AS 活动记录和子网 IP |
| 缩容卡住 | Pod 无法驱逐或 PDB 限制 | 检查 `kubectl drain` 输出和 PDB |
| 新标签未生效 | 存量节点未同步或被忽略 | 检查节点池修改参数和节点实际标签 |
| Pod 不调度到新节点 | 污点未容忍或选择器不匹配 | 检查 tolerations、nodeSelector、affinity |

---

## 相关文档

- [创建节点池](./01-create-node-pool.md)
- [查询节点池](./03-describe-node-pool.md)
- [删除节点池](./04-delete-node-pool.md)
- [节点维护](../node/03-maintain-node.md)
