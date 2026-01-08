# 如何创建超级节点池

## 文档元信息

- **功能名称**: 创建超级节点池
- **API 版本**: 2018-05-25
- **适用集群版本**: 所有版本
- **文档更新时间**: 2026-01-07
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

在 TKE 集群中创建超级节点池（Virtual Node Pool），提供 Serverless 化的容器运行能力，无需管理底层节点。

**核心优势**:
- **免节点运维**: 无需关心节点的购买、扩容和维护
- **按需计费**: 按 Pod 实际使用的资源计费
- **快速弹性**: 秒级启动 Pod，无需等待节点创建
- **资源隔离**: 每个 Pod 独立的安全沙箱环境

**任务目标**: 在指定集群中创建超级节点池，用于承载 Serverless 工作负载

---

## 前置条件

- [ ] 集群状态为 `Running`
- [ ] 集群网络模式支持超级节点（VPC-CNI 或 Global Router）
- [ ] 已准备好子网 ID 和安全组 ID
- [ ] 账户余额充足（超级节点按量计费）
- [ ] 确认地域支持超级节点功能

---

## 操作步骤

### Step 1: 准备节点池配置参数

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|------|------|------|--------|
| ClusterId | 是 | String | 集群 ID | cls-xxxxxxxx |
| Name | 是 | String | 节点池名称 | vk-nodepool |
| SecurityGroupIds | 是 | Array | 安全组 ID 列表 | ["sg-xxxxxxxx"] |
| SubnetIds | 否 | Array | 子网 ID 列表 | ["subnet-xxxxxxxx"] |
| Labels | 否 | Array | 虚拟节点标签 | 见下方 |
| Taints | 否 | Array | 虚拟节点污点 | 见下方 |
| DeletionProtection | 否 | Boolean | 删除保护开关 | false |
| OS | 否 | String | 节点池操作系统 | linux |

**Labels 结构**:

```json
{
  "Labels": [
    {
      "Name": "node-type",
      "Value": "serverless"
    },
    {
      "Name": "env",
      "Value": "production"
    }
  ]
}
```

**Taints 结构**:

```json
{
  "Taints": [
    {
      "Key": "serverless",
      "Value": "true",
      "Effect": "NoSchedule"
    }
  ]
}
```

### Step 2: 调用 CreateClusterVirtualNodePool API

**使用腾讯云 CLI**:

```bash
tccli tke CreateClusterVirtualNodePool \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --Name vk-nodepool \
  --SubnetIds '["subnet-xxxxxxxx"]' \
  --SecurityGroupIds '["sg-xxxxxxxx"]' \
  --Labels '[
    {
      "Name": "node-type",
      "Value": "serverless"
    }
  ]' \
  --DeletionProtection false \
  --OS linux
```

**使用 Python SDK**:

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import tke_client, models

cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

req = models.CreateClusterVirtualNodePoolRequest()
req.ClusterId = "cls-xxxxxxxx"
req.Name = "vk-nodepool"
req.SubnetIds = ["subnet-xxxxxxxx"]
req.SecurityGroupIds = ["sg-xxxxxxxx"]

# 配置标签
label = models.Label()
label.Name = "node-type"
label.Value = "serverless"
req.Labels = [label]

# 配置操作系统
req.OS = "linux"
req.DeletionProtection = False

resp = client.CreateClusterVirtualNodePool(req)
print(f"节点池ID: {resp.NodePoolId}")
print(f"请求ID: {resp.RequestId}")
```

**使用 Go SDK**:

```go
package main

import (
    "fmt"
    "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
    "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
    tke "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/tke/v20180525"
)

func main() {
    credential := common.NewCredential("SecretId", "SecretKey")
    cpf := profile.NewClientProfile()
    client, _ := tke.NewClient(credential, "ap-guangzhou", cpf)

    request := tke.NewCreateClusterVirtualNodePoolRequest()
    request.ClusterId = common.StringPtr("cls-xxxxxxxx")
    request.Name = common.StringPtr("vk-nodepool")
    request.SubnetIds = common.StringPtrs([]string{"subnet-xxxxxxxx"})
    request.SecurityGroupIds = common.StringPtrs([]string{"sg-xxxxxxxx"})
    request.OS = common.StringPtr("linux")
    request.DeletionProtection = common.BoolPtr(false)

    response, err := client.CreateClusterVirtualNodePool(request)
    if err != nil {
        panic(err)
    }
    fmt.Printf("节点池ID: %s\n", *response.Response.NodePoolId)
}
```

### Step 3: 获取响应

**成功响应**:

```json
{
  "Response": {
    "NodePoolId": "np-xxxxxxxx",
    "RequestId": "12345678-1234-1234-1234-123456789012"
  }
}
```

---

## 验证步骤

### Step 1: 查询节点池状态

```bash
tccli tke DescribeClusterVirtualNodePools \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx
```

### Step 2: 使用 kubectl 验证

```bash
# 查看虚拟节点（创建节点池后需要创建虚拟节点才会出现）
kubectl get nodes -l node-type=serverless

# 查看节点池相关的系统 Pod
kubectl get pods -n kube-system | grep virtual-kubelet
```

**期望结果**:

```
NAME                                READY   STATUS    RESTARTS   AGE
virtual-kubelet-np-xxxxxxxx-xxxxx   1/1     Running   0          2m
```

### Step 3: 查看超级节点池详情

```bash
# 使用控制台或 API 查询节点池详细信息
tccli tke DescribeClusterVirtualNodePools \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --Filters '[
    {
      "Name": "NodePoolId",
      "Values": ["np-xxxxxxxx"]
    }
  ]'
```

---

## 异常处理

### 常见错误及解决方案

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|---------|
| InvalidParameter.SubnetNotExist | 子网不存在 | SubnetId 不存在或无权限 | 检查子网 ID 是否正确 |
| InvalidParameter.SubnetInvalidError | 子网配置错误 | 子网配置不合法 | 确认子网在正确的 VPC 中 |
| ResourceInUse.SubnetAlreadyExist | 子网已被使用 | 子网已被其他节点池占用 | 选择其他可用子网 |
| ResourceUnavailable.ClusterState | 集群状态异常 | 集群状态不支持操作 | 等待集群状态恢复正常 |
| UnauthorizedOperation.CamNoAuth | 无权限 | CAM 权限不足 | 申请 TKE 相关权限 |
| UnsupportedOperation.NotSupportInstallVirtualKubelet | 不支持 Virtual Kubelet | 系统环境不支持 | 联系技术支持确认集群配置 |
| InvalidParameter.Param | 参数错误 | 参数格式或取值错误 | 检查参数格式和取值范围 |

### 节点池创建失败处理

如果节点池状态异常:

```bash
# 1. 查看节点池详细信息
tccli tke DescribeClusterVirtualNodePools \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx

# 2. 检查集群事件
kubectl get events -n kube-system --sort-by='.lastTimestamp'

# 3. 查看 virtual-kubelet 日志
kubectl logs -n kube-system -l app=virtual-kubelet
```

---

## 高级配置

### 配置多子网支持

```json
{
  "SubnetIds": [
    "subnet-xxxxxxx1",
    "subnet-xxxxxxx2",
    "subnet-xxxxxxx3"
  ]
}
```

**说明**: 多子网配置可实现跨可用区的容灾能力

### 配置节点标签和污点

```json
{
  "Labels": [
    {
      "Name": "workload-type",
      "Value": "batch"
    },
    {
      "Name": "cost-center",
      "Value": "ai-team"
    }
  ],
  "Taints": [
    {
      "Key": "serverless",
      "Value": "true",
      "Effect": "NoSchedule"
    }
  ]
}
```

### 配置删除保护

```json
{
  "DeletionProtection": true
}
```

**说明**: 开启删除保护后，需要先关闭保护才能删除节点池，避免误删除

---

## Agent Prompt 模板

### 创建超级节点池 Prompt

```prompt
请在集群中创建超级节点池:
- 集群ID: {{cluster_id}}
- 节点池名称: vk-nodepool-prod
- 子网ID: {{subnet_id}}
- 安全组ID: {{security_group_id}}
- 节点标签: node-type=serverless, env=production
- 操作系统: linux
- 删除保护: 关闭
```

### 创建带污点的节点池 Prompt

```prompt
请创建一个带污点的超级节点池，用于运行特定工作负载:
- 集群ID: cls-xxxxxxxx
- 名称: vk-nodepool-dedicated
- 污点配置: dedicated=gpu:NoSchedule
- 标签: gpu=true
```

---

## 最佳实践

1. **子网规划**:
   - 建议为超级节点池规划独立的子网
   - 确保子网 IP 地址段充足（建议 /24 或更大）
   - 多可用区部署时配置多个子网

2. **安全组配置**:
   - 允许集群 CIDR 访问超级节点
   - 开放必要的端口（如 443 用于 API 访问）
   - 根据业务需求配置出站规则

3. **标签策略**:
   - 使用标签标识节点类型: `node-type=serverless`
   - 使用标签标识环境: `env=production`
   - 使用标签进行成本分摊: `cost-center=team-name`

4. **污点配置**:
   - 为超级节点添加污点避免非预期 Pod 调度
   - 配合 Pod 的 tolerations 实现精准调度
   - 示例污点: `serverless=true:NoSchedule`

5. **删除保护**:
   - 生产环境建议开启删除保护
   - 定期审查不使用的节点池

---

## 相关文档

- [创建按量超级节点](./02-create-supernode.md)
- [删除超级节点](./03-delete-supernode.md)
- [查询超级节点池](./04-describe-supernode-pools.md)
- [普通节点管理](../node/01-add-node.md)

---

## API 文档链接

- **CreateClusterVirtualNodePool**: https://cloud.tencent.com/document/api/457/85354
- **API Explorer**: https://console.cloud.tencent.com/api/explorer?Product=tke&Version=2018-05-25&Action=CreateClusterVirtualNodePool

---

## Cookbook 示例

完整可执行代码示例: [TKE 超级节点池创建 Cookbook](../../cookbook/create-supernode-pool-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2026-01-07  
**维护者**: TKE Documentation Team
