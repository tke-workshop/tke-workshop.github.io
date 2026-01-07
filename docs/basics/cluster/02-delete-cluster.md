# 如何删除 TKE 集群

## 文档元信息

- **功能名称**: 删除 TKE 集群
- **API 版本**: 2018-05-25
- **适用集群版本**: 所有版本
- **文档更新时间**: 2026-01-07
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

删除一个 TKE 集群,包括集群控制面、工作节点和关联的云资源。**此操作不可逆,请谨慎执行**。

**任务目标**: 安全地删除 TKE 集群及其相关资源

---

## 前置条件

- [ ] 已获取目标集群的 ClusterId
- [ ] 具有集群删除权限 (QcloudTKEFullAccess)
- [ ] 已确认集群中没有重要数据或应用
- [ ] 集群未启用删除保护 (或已关闭删除保护)
- [ ] 已备份重要配置和数据

---

## 前置检查清单

在删除集群前,必须确认:

- [ ] **数据备份**: 已备份集群中的重要数据、ConfigMap、Secret
- [ ] **应用迁移**: 已迁移或下线集群中的应用
- [ ] **删除保护**: 检查是否启用了删除保护
- [ ] **关联资源**: 确认要保留还是删除关联的 CLB、CBS 等资源
- [ ] **费用结算**: 确认是否有未结算的费用

---

## 操作步骤

### Step 1: 检查集群状态

删除前先查询集群状态:

```bash
tccli tke DescribeClusters \
  --Region ap-guangzhou \
  --ClusterIds '["cls-xxxxxxxx"]'
```

**检查要点**:
- 集群状态是否为 `Running` 或 `Abnormal`
- 是否启用了删除保护 (`DeletionProtection: true`)

### Step 2: 关闭删除保护(如果已启用)

如果集群启用了删除保护,需要先关闭:

```bash
tccli tke DisableClusterDeletionProtection \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx
```

### Step 3: 删除集群

调用 DeleteCluster API:

**使用腾讯云 CLI**:

```bash
tccli tke DeleteCluster \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --InstanceDeleteMode terminate \
  --ResourceDeleteOptions '[
    {
      "ResourceType": "CBS",
      "DeleteMode": "terminate"
    },
    {
      "ResourceType": "CLB",
      "DeleteMode": "terminate"
    }
  ]'
```

**核心参数说明**:

| 参数名 | 必填 | 类型 | 说明 | 可选值 |
|--------|------|------|------|--------|
| ClusterId | 是 | String | 集群 ID | - |
| InstanceDeleteMode | 是 | String | 节点删除策略 | terminate(销毁) / retain(保留) |
| ResourceDeleteOptions | 否 | Array | 资源删除策略 | 见下表 |

**ResourceDeleteOptions 说明**:

| ResourceType | DeleteMode | 说明 |
|--------------|------------|------|
| CBS | terminate | 销毁云硬盘 |
| CBS | retain | 保留云硬盘 |
| CLB | terminate | 销毁负载均衡器 |
| CLB | retain | 保留负载均衡器 |

**使用 Python SDK**:

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import tke_client, models

cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

req = models.DeleteClusterRequest()
req.ClusterId = "cls-xxxxxxxx"
req.InstanceDeleteMode = "terminate"

# 配置资源删除策略
option1 = models.ResourceDeleteOption()
option1.ResourceType = "CBS"
option1.DeleteMode = "terminate"

option2 = models.ResourceDeleteOption()
option2.ResourceType = "CLB"
option2.DeleteMode = "terminate"

req.ResourceDeleteOptions = [option1, option2]

resp = client.DeleteCluster(req)
print(f"RequestId: {resp.RequestId}")
```

**使用 Go SDK**:

```go
package main

import (
	"fmt"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
	tke "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/tke/v20180525"
)

func main() {
	credential := common.NewCredential("SecretId", "SecretKey")
	client, _ := tke.NewClient(credential, "ap-guangzhou", nil)

	request := tke.NewDeleteClusterRequest()
	request.ClusterId = common.StringPtr("cls-xxxxxxxx")
	request.InstanceDeleteMode = common.StringPtr("terminate")

	request.ResourceDeleteOptions = []*tke.ResourceDeleteOption{
		{
			ResourceType: common.StringPtr("CBS"),
			DeleteMode:   common.StringPtr("terminate"),
		},
		{
			ResourceType: common.StringPtr("CLB"),
			DeleteMode:   common.StringPtr("terminate"),
		},
	}

	response, err := client.DeleteCluster(request)
	if err != nil {
		panic(err)
	}
	fmt.Printf("RequestId: %s\n", *response.Response.RequestId)
}
```

### Step 4: 等待删除完成

删除操作是异步的,需要等待一段时间。可以通过查询集群状态来确认:

```bash
# 循环查询,直到集群不存在
while true; do
  result=$(tccli tke DescribeClusters \
    --Region ap-guangzhou \
    --ClusterIds '["cls-xxxxxxxx"]' 2>&1)
  
  if echo "$result" | grep -q "ResourceNotFound"; then
    echo "集群删除成功"
    break
  fi
  
  echo "等待删除中..."
  sleep 10
done
```

---

## 验证步骤

### Step 1: 确认集群已删除

```bash
tccli tke DescribeClusters \
  --Region ap-guangzhou \
  --ClusterIds '["cls-xxxxxxxx"]'
```

**期望结果**: 返回错误 `ResourceNotFound.ClusterNotFound`

### Step 2: 确认关联资源已删除

**检查 CVM 实例**:

```bash
tccli cvm DescribeInstances \
  --Region ap-guangzhou \
  --Filters '[
    {
      "Name": "tag:tke-cluster-id",
      "Values": ["cls-xxxxxxxx"]
    }
  ]'
```

**期望结果**: 返回空列表或实例状态为 `TERMINATING`

**检查负载均衡器**:

```bash
tccli clb DescribeLoadBalancers \
  --Region ap-guangzhou
```

查看输出中是否还有带 `tke-cluster-id: cls-xxxxxxxx` 标签的 CLB。

---

## 异常处理

### 常见错误及解决方案

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|---------|
| InvalidParameter.ClusterNotFound | 集群不存在 | ClusterId 不存在或已删除 | 检查 ClusterId 是否正确 |
| FailedOperation.ClusterDeletionProtectionEnabled | 集群删除保护已启用 | 集群启用了删除保护 | 先调用 DisableClusterDeletionProtection |
| FailedOperation.ClusterState | 集群状态异常 | 集群正在创建或升级中 | 等待操作完成后再删除 |
| FailedOperation.DeletionTimeout | 删除超时 | 资源释放超时 | 提交工单由运维人工介入 |
| InvalidParameter.InvalidInstanceDeleteMode | 实例删除模式无效 | InstanceDeleteMode 参数错误 | 使用 terminate 或 retain |

### 排查步骤

1. **确认集群状态**: 集群必须处于可删除状态
2. **检查删除保护**: 确认已关闭删除保护
3. **查看集群事件**: 登录控制台查看集群事件日志
4. **检查资源占用**: 某些资源被占用可能导致删除失败
5. **联系技术支持**: 记录 RequestId 提交工单

---

## 删除策略说明

### 节点删除策略

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| terminate | 销毁节点(CVM 实例) | 默认策略,推荐使用 |
| retain | 保留节点,仅从集群移除 | 需要保留 CVM 实例用于其他用途 |

### 资源删除策略

| 资源类型 | terminate 策略 | retain 策略 |
|---------|---------------|------------|
| CBS(云硬盘) | 销毁数据盘和系统盘 | 保留数据盘,销毁系统盘 |
| CLB(负载均衡) | 销毁所有 Service 创建的 CLB | 保留 CLB,解除与集群关联 |

**最佳实践**:
- 测试环境: 使用 `terminate` 彻底清理资源
- 生产环境: 先手动备份数据,再使用 `terminate`
- 特殊需求: 使用 `retain` 保留特定资源

---

## 删除前数据备份

### 备份 Kubernetes 资源

```bash
# 备份所有命名空间的资源
kubectl get all --all-namespaces -o yaml > cluster-backup.yaml

# 备份 ConfigMap
kubectl get cm --all-namespaces -o yaml > configmaps-backup.yaml

# 备份 Secret
kubectl get secret --all-namespaces -o yaml > secrets-backup.yaml

# 备份 PVC
kubectl get pvc --all-namespaces -o yaml > pvc-backup.yaml
```

### 备份持久化数据

```bash
# 备份 PV 对应的云硬盘数据
# 方式1: 通过快照备份
tccli cbs CreateSnapshot \
  --Region ap-guangzhou \
  --DiskId disk-xxxxxxxx \
  --SnapshotName "backup-before-delete"

# 方式2: 复制数据到对象存储
kubectl exec -n <namespace> <pod-name> -- tar czf - /data | \
  coscli cp - cos://bucket/backup/data.tar.gz
```

---

## Agent Prompt 模板

### 基础删除 Prompt

```prompt
请帮我删除 TKE 集群:
- 地域: {{region}}
- 集群ID: {{cluster_id}}
- 删除策略: 销毁所有资源(terminate)

请在删除前确认:
1. 集群中没有重要数据
2. 已关闭删除保护
3. 已备份重要配置
```

### 保留资源删除 Prompt

```prompt
请帮我删除集群,但保留以下资源:
- 集群ID: {{cluster_id}}
- 保留节点: 是
- 保留云硬盘: 是
- 保留负载均衡器: 是
```

### 批量删除 Prompt

```prompt
请帮我批量删除以下测试集群:
- cls-test01, cls-test02, cls-test03
- 地域: ap-guangzhou
- 删除策略: 销毁所有资源
- 忽略删除保护: 自动关闭
```

---

## 安全建议

1. **启用删除保护**: 生产集群务必启用删除保护
2. **权限控制**: 删除权限仅授予管理员角色
3. **操作审计**: 记录所有删除操作日志
4. **二次确认**: 删除前人工二次确认
5. **定期备份**: 定期备份集群配置和数据

---

## 相关文档

- [创建集群](./01-create-cluster.md)
- [查询集群列表](./03-describe-clusters.md)
- [启用删除保护](./05-enable-deletion-protection.md)
- [集群备份与恢复](./06-backup-and-restore.md)

---

## API 文档链接

- **API 文档**: https://cloud.tencent.com/document/product/457/36704
- **SDK 文档**: https://cloud.tencent.com/document/sdk
- **API Explorer**: https://console.cloud.tencent.com/api/explorer?Product=tke&Version=2018-05-25&Action=DeleteCluster

---

## Cookbook 示例

完整可执行代码示例: [TKE 集群删除 Cookbook](../../cookbook/delete-cluster-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2026-01-07  
**维护者**: TKE Documentation Team
