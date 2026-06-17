---
title: "查询节点池"
---

# 查询节点池

## 文档元信息

- **功能名称**: 查询标准节点池
- **API 版本**: 2018-05-25
- **API 名称**: `DescribeClusterNodePools` / `DescribeClusterNodePoolDetail`
- **文档更新时间**: 2026-06-17
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

查询节点池用于获取节点池列表、节点池详情、伸缩配置、节点数量摘要、标签、污点和资源标签。运维自动化通常先查询节点池详情，再决定扩容、缩容、删除或调度迁移。

---

## 查询节点池列表

### 使用 tccli

```bash
tccli tke DescribeClusterNodePools \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx
```

### 按节点池 ID 过滤

```bash
tccli tke DescribeClusterNodePools \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --Filters '[
    {
      "Name": "NodePoolsId",
      "Values": ["np-xxxxxxxx"]
    }
  ]'
```

### 按资源标签过滤

```bash
tccli tke DescribeClusterNodePools \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --Filters '[
    {
      "Name": "Tags",
      "Values": ["env:production"]
    }
  ]'
```

---

## 查询节点池详情

```bash
tccli tke DescribeClusterNodePoolDetail \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx
```

重点关注：

| 字段 | 说明 | 运维用途 |
|------|------|----------|
| NodePoolId | 节点池 ID | 后续修改或删除 |
| Name | 节点池名称 | 人工识别 |
| LifeState | 生命周期状态 | 判断是否可操作 |
| NodeCountSummary | 节点数量摘要 | 扩缩容判断 |
| AutoscalingGroupId | AS 组 ID | 排查伸缩活动 |
| Labels | 节点标签 | 调度匹配 |
| Taints | 节点污点 | 调度隔离 |
| Tags | 腾讯云资源标签 | 成本和治理 |

---

## Python SDK 示例

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import models, tke_client

cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

req = models.DescribeClusterNodePoolsRequest()
req.ClusterId = "cls-xxxxxxxx"

resp = client.DescribeClusterNodePools(req)
for pool in resp.NodePoolSet:
    print(pool.NodePoolId, pool.Name, pool.LifeState)
```

查询详情：

```python
req = models.DescribeClusterNodePoolDetailRequest()
req.ClusterId = "cls-xxxxxxxx"
req.NodePoolId = "np-xxxxxxxx"

resp = client.DescribeClusterNodePoolDetail(req)
print(resp.NodePool.NodePoolId)
print(resp.NodePool.Name)
```

---

## Kubernetes 侧验证

```bash
NODE_NAME=your-node-name

# 查看属于某个节点池的节点
kubectl get nodes -l node-pool=production-pool -o wide

# 查看节点标签和污点
kubectl describe node "$NODE_NAME"

# 查看节点上的 Pod
kubectl get pods -A -o wide --field-selector spec.nodeName="$NODE_NAME"
```

---

## 常见问题

| 问题 | 可能原因 | 处理方式 |
|------|----------|----------|
| 查询不到节点池 | ClusterId 或地域错误 | 确认 Region 和 ClusterId |
| API 返回节点池存在但 kubectl 没有节点 | 节点仍在创建或初始化失败 | 查看节点池详情和 AS 活动记录 |
| 标签过滤无结果 | 资源标签和 Kubernetes 节点标签混淆 | `Tags` 过滤的是腾讯云资源标签 |
| 节点数量和 Pod 容量不匹配 | 节点 NotReady 或污点阻止调度 | 检查节点状态、污点和 kubelet |

---

## 相关文档

- [创建节点池](./01-create-node-pool.md)
- [扩缩节点池](./02-scale-node-pool.md)
- [删除节点池](./04-delete-node-pool.md)
