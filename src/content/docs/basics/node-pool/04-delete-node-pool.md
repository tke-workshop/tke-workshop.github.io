---
title: "删除节点池"
---

# 删除节点池

## 文档元信息

- **功能名称**: 删除标准节点池
- **API 版本**: 2018-05-25
- **API 名称**: `DeleteClusterNodePool`
- **文档更新时间**: 2026-06-24
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

删除节点池会移除节点池管理对象，并按节点池配置和云资源策略处理关联节点。生产环境删除前必须先迁移业务 Pod，并确认是否需要保留底层 CVM、CBS 或其他关联资源。

!!! danger "生产风险"
    删除节点池可能导致节点被销毁、Pod 被驱逐和业务容量下降。执行前必须完成业务迁移、备份检查和容量确认。

---

## 前置条件

- [ ] 已记录 `ClusterId` 和待删除的 `NodePoolId`
- [ ] 已确认节点池不是核心业务唯一承载池
- [ ] 已将业务 Pod 迁移到其他节点池
- [ ] 已确认删除保护状态
- [ ] 已确认 `KeepInstance` 取值：保留底层 CVM 实例，或随节点池删除释放实例

---

## 删除前检查

### 查询节点池详情

```bash
tccli tke DescribeClusterNodePoolDetail \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx
```

### 查看节点和 Pod

```bash
kubectl get nodes -l node-pool=production-pool -o wide
kubectl get pods -A -o wide
```

### 安全迁移 Pod

```bash
# 设置节点不可调度
kubectl cordon <node-name>

# 驱逐业务 Pod
kubectl drain <node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=10m
```

---

## 操作步骤

### Step 1: 关闭删除保护

如果节点池启用了删除保护，先通过修改接口关闭：

```bash
tccli tke ModifyClusterNodePool \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx \
  --DeletionProtection false
```

### Step 2: 删除节点池

`DeleteClusterNodePool` 支持一次传入多个节点池 ID。删除前必须明确 `KeepInstance`：

- `KeepInstance=true`：删除节点池管理对象并将节点移出集群，但保留对应 CVM 实例。
- `KeepInstance=false`：删除节点池时不保留对应实例，底层 CVM 等资源可能被释放。

```bash
tccli tke DeleteClusterNodePool \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodePoolIds '["np-xxxxxxxx"]' \
  --KeepInstance true
```

**成功响应示例**:

```json
{
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### Python SDK 示例

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import models, tke_client

cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

req = models.DeleteClusterNodePoolRequest()
req.ClusterId = "cls-xxxxxxxx"
req.NodePoolIds = ["np-xxxxxxxx"]
req.KeepInstance = True

resp = client.DeleteClusterNodePool(req)
print(f"RequestId: {resp.RequestId}")
```

---

## 验证步骤

### 验证节点池不存在

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

### 验证 Kubernetes 节点

```bash
kubectl get nodes -l node-pool=production-pool
kubectl get pods -A -o wide
```

期望结果：

- 节点池列表中不再返回目标节点池
- 业务 Pod 已迁移到其他可用节点
- 如果 `KeepInstance=true`，原节点对应 CVM 实例仍保留，但已不再作为集群节点
- 集群中没有长时间 `Pending` 的关键 Pod

---

## 常见问题

| 问题 | 可能原因 | 处理方式 |
|------|----------|----------|
| 删除失败 | 删除保护未关闭 | 先设置 `DeletionProtection=false` |
| Pod 长时间无法驱逐 | PDB、local storage 或 DaemonSet 阻塞 | 检查 `kubectl drain` 输出 |
| 删除后仍看到 CVM | 资源删除策略保留或云资源回收延迟 | 检查 AS/CVM 控制台 |
| 删除后业务容量不足 | 未提前扩容其他节点池 | 回滚前先扩容备用节点池 |

---

## 最佳实践

1. 删除前先扩容目标迁移节点池，确保有足够容量。
2. 分批 cordon/drain 节点，观察业务错误率和 Pod 重建速度。
3. 删除生产节点池前保留变更记录，包括 RequestId、节点列表和迁移结果。
4. 对长期生产节点池启用删除保护，只在维护窗口临时关闭。

---

## 相关文档

- [查询节点池](./03-describe-node-pool.md)
- [扩缩节点池](./02-scale-node-pool.md)
- [节点维护](../node/03-maintain-node.md)
