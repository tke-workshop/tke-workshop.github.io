# 如何创建按量超级节点

## 文档元信息

- **功能名称**: 创建按量超级节点
- **API 版本**: 2018-05-25
- **适用集群版本**: 所有版本
- **文档更新时间**: 2026-01-07
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

在已有的超级节点池中创建按量计费的虚拟节点（Virtual Node），为 Pod 提供 Serverless 运行环境。

**核心特性**:
- **按需创建**: 根据业务需求动态创建虚拟节点
- **秒级启动**: 虚拟节点快速就绪，无需等待 CVM 创建
- **按量计费**: 仅按实际运行的 Pod 资源使用量计费
- **自动释放**: Pod 销毁后节点资源自动释放

**任务目标**: 在指定超级节点池中创建虚拟节点，用于运行容器工作负载

---

## 前置条件

- [ ] 集群状态为 `Running`
- [ ] 已创建超级节点池（参考 [创建超级节点池](./01-create-supernode-pool.md)）
- [ ] 节点池状态正常（非创建中、删除中等状态）
- [ ] 账户余额充足
- [ ] 已获取节点池 ID（NodePoolId）

---

## 操作步骤

### Step 1: 准备虚拟节点配置参数

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|------|------|------|--------|
| ClusterId | 是 | String | 集群 ID | cls-xxxxxxxx |
| NodePoolId | 是 | String | 节点池 ID | np-xxxxxxxx |
| SubnetId | 三选一 | String | 虚拟节点所属子网 ID | subnet-xxxxxxxx |
| SubnetIds | 三选一 | Array | 虚拟节点子网 ID 列表 | ["subnet-xxx1"] |
| VirtualNodes | 三选一 | Array | 虚拟节点规格列表 | 见下方 |

**参数说明**:
- `SubnetId`、`SubnetIds`、`VirtualNodes` 三个参数必须选择其中一个
- 推荐使用 `SubnetId` 或 `SubnetIds` 简化配置

**VirtualNodeSpec 结构** (可选):

```json
{
  "VirtualNodes": [
    {
      "SubnetId": "subnet-xxxxxxxx",
      "Name": "eklet-custom-node-01"
    }
  ]
}
```

### Step 2: 调用 CreateClusterVirtualNode API

**使用腾讯云 CLI**:

```bash
tccli tke CreateClusterVirtualNode \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx \
  --SubnetId subnet-xxxxxxxx
```

**使用 Python SDK**:

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import tke_client, models

cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

req = models.CreateClusterVirtualNodeRequest()
req.ClusterId = "cls-xxxxxxxx"
req.NodePoolId = "np-xxxxxxxx"
req.SubnetId = "subnet-xxxxxxxx"

resp = client.CreateClusterVirtualNode(req)
print(f"虚拟节点名称: {resp.NodeName}")
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

    request := tke.NewCreateClusterVirtualNodeRequest()
    request.ClusterId = common.StringPtr("cls-xxxxxxxx")
    request.NodePoolId = common.StringPtr("np-xxxxxxxx")
    request.SubnetId = common.StringPtr("subnet-xxxxxxxx")

    response, err := client.CreateClusterVirtualNode(request)
    if err != nil {
        panic(err)
    }
    fmt.Printf("虚拟节点名称: %s\n", *response.Response.NodeName)
}
```

**批量创建虚拟节点**:

```python
# 使用 SubnetIds 批量创建
req = models.CreateClusterVirtualNodeRequest()
req.ClusterId = "cls-xxxxxxxx"
req.NodePoolId = "np-xxxxxxxx"
req.SubnetIds = [
    "subnet-xxxxxxx1",
    "subnet-xxxxxxx2",
    "subnet-xxxxxxx3"
]

resp = client.CreateClusterVirtualNode(req)
```

### Step 3: 获取响应

**成功响应**:

```json
{
  "Response": {
    "NodeName": "eklet-subnet-xxxxxxxx-0",
    "RequestId": "1ac0d3ae-063e-4789-93fe-3c73e93191b9"
  }
}
```

---

## 验证步骤

### Step 1: 查询虚拟节点状态

```bash
# 查看所有虚拟节点
kubectl get nodes -l type=virtual-kubelet

# 查看节点详情
kubectl describe node eklet-subnet-xxxxxxxx-0
```

### Step 2: 检查节点就绪状态

```bash
# 查看节点状态
kubectl get nodes -o wide
```

**期望结果**:

```
NAME                         STATUS   ROLES    AGE   VERSION
eklet-subnet-xxxxxxxx-0      Ready    agent    1m    v1.28.3-tke.1
```

### Step 3: 部署测试 Pod 到虚拟节点

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod-on-supernode
spec:
  nodeSelector:
    type: virtual-kubelet
  tolerations:
  - key: serverless
    operator: Exists
    effect: NoSchedule
  containers:
  - name: nginx
    image: nginx:latest
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
```

应用 Pod:

```bash
kubectl apply -f test-pod.yaml

# 验证 Pod 调度到虚拟节点
kubectl get pod test-pod-on-supernode -o wide
```

---

## 异常处理

### 常见错误及解决方案

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|---------|
| InvalidParameter.Param | 参数错误 | 参数格式或取值错误 | 检查参数格式和取值 |
| InvalidParameter.SubnetInvalidError | 子网配置错误 | 子网不合法 | 确认子网在正确的 VPC 中 |
| ResourceInUse.SubnetAlreadyExist | 子网已被使用 | 子网已有虚拟节点 | 检查子网使用情况 |
| ResourceUnavailable.NodePoolStateNotNormal | 节点池状态异常 | 节点池非正常状态 | 等待节点池状态恢复 |
| UnsupportedOperation.NotInWhitelist | 未在白名单中 | 功能未开通 | 联系技术支持开通 |
| UnsupportedOperation.NotSupportInstallVirtualKubelet | 不支持 Virtual Kubelet | 环境不支持 | 确认集群版本和配置 |

### 虚拟节点创建失败处理

```bash
# 1. 查看节点池状态
tccli tke DescribeClusterVirtualNodePools \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --Filters '[{"Name":"NodePoolId","Values":["np-xxxxxxxx"]}]'

# 2. 检查 virtual-kubelet 组件日志
kubectl logs -n kube-system -l app=virtual-kubelet

# 3. 查看节点事件
kubectl get events -n kube-system --sort-by='.lastTimestamp'
```

### 虚拟节点 NotReady 处理

```bash
# 1. 查看节点详细信息
kubectl describe node eklet-subnet-xxxxxxxx-0

# 2. 检查网络连通性
kubectl get pods -n kube-system -o wide | grep virtual-kubelet

# 3. 重启 virtual-kubelet Pod
kubectl delete pod -n kube-system -l app=virtual-kubelet
```

---

## 高级配置

### 配置节点亲和性调度 Pod

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-on-supernode
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: type
                operator: In
                values:
                - virtual-kubelet
      tolerations:
      - key: serverless
        operator: Exists
        effect: NoSchedule
      containers:
      - name: app
        image: nginx:latest
```

### 配置资源限制

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-limit-pod
spec:
  nodeSelector:
    type: virtual-kubelet
  containers:
  - name: app
    image: nginx:latest
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "1000m"
        memory: "2Gi"
```

**注意事项**:
- 超级节点按 Pod 的 request 资源计费
- 建议合理设置 requests 和 limits 避免资源浪费
- CPU 和内存必须同时设置

---

## Agent Prompt 模板

### 创建虚拟节点 Prompt

```prompt
请在超级节点池中创建虚拟节点:
- 集群ID: {{cluster_id}}
- 节点池ID: {{nodepool_id}}
- 子网ID: {{subnet_id}}
```

### 批量创建虚拟节点 Prompt

```prompt
请批量创建虚拟节点用于多可用区部署:
- 集群ID: cls-xxxxxxxx
- 节点池ID: np-xxxxxxxx
- 子网ID列表: subnet-xxx1, subnet-xxx2, subnet-xxx3
```

---

## 最佳实践

1. **自动扩展**:
   - 通常无需手动创建虚拟节点
   - Kubernetes 调度器会自动触发虚拟节点创建
   - 手动创建适用于预热或测试场景

2. **网络规划**:
   - 合理选择子网，确保 IP 地址充足
   - 多可用区部署时使用多个子网
   - 子网需要与集群在同一 VPC 内

3. **资源配置**:
   - Pod 必须设置 resources.requests
   - 避免过度分配资源造成浪费
   - 推荐 CPU 和内存按 1:2 或 1:4 配置

4. **调度策略**:
   - 使用 nodeSelector 指定虚拟节点: `type: virtual-kubelet`
   - 配置 tolerations 容忍节点污点
   - 使用亲和性实现混合部署

5. **成本优化**:
   - 按需创建，避免闲置虚拟节点
   - 合理设置 Pod 资源规格
   - 使用 HPA 自动扩缩容

---

## 相关文档

- [创建超级节点池](./01-create-supernode-pool.md)
- [删除超级节点](./03-delete-supernode.md)
- [超级节点计费说明](./05-supernode-billing.md)
- [普通节点管理](../node/01-add-node.md)

---

## API 文档链接

- **CreateClusterVirtualNode**: https://cloud.tencent.com/document/api/457/85355
- **API Explorer**: https://console.cloud.tencent.com/api/explorer?Product=tke&Version=2018-05-25&Action=CreateClusterVirtualNode

---

## Cookbook 示例

完整可执行代码示例: [TKE 超级节点创建 Cookbook](../../cookbook/create-supernode-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2026-01-07  
**维护者**: TKE Documentation Team
