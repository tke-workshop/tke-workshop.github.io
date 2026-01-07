# 扩容节点池 (ModifyClusterNodePool)

## 功能概述

修改 TKE 节点池的期望节点数、最小/最大节点数等配置，实现节点池的手动扩缩容。适用于应对流量高峰、资源优化、成本控制等场景。

**API 名称**: `ModifyClusterNodePool`  
**功能优先级**: P0（核心功能）  
**适用场景**: 应对流量高峰、资源扩容、节点缩容、弹性调整

---

## 前置条件

### 必须满足
- [ ] 已创建 TKE 集群（集群状态为 Running）
- [ ] 目标节点池已存在且状态正常
- [ ] 已配置腾讯云 API 访问凭证（SecretId/SecretKey）
- [ ] 节点池启用了伸缩功能

### 可选条件
- [ ] 已监控当前资源使用情况（决定扩容规模）
- [ ] 已评估成本影响（扩容会增加费用）

---

## 检查清单

在开始前，请确认：

1. **节点池状态检查**
   ```bash
   tccli tke DescribeClusterNodePoolDetail \
     --ClusterId cls-xxxxxxxx \
     --NodePoolId np-xxxxxxxx
   ```
   期望结果：节点池状态为 normal

2. **当前节点数查询**
   ```bash
   kubectl get nodes -l node-pool=<pool-name>
   ```
   期望结果：了解当前节点数

3. **资源使用情况**
   ```bash
   kubectl top nodes
   kubectl describe quota -n <namespace>
   ```
   期望结果：了解是否需要扩容

4. **配额检查**
   - CVM 实例配额充足
   - 账户余额充足（扩容会增加费用）

---

## 操作步骤

### 方式 1: 使用 tccli（腾讯云 CLI）

#### 扩容节点池

```bash
tccli tke ModifyClusterNodePool \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx \
  --DesiredCapacity 10 \
  --MinSize 3 \
  --MaxSize 20
```

期望输出：
```json
{
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

#### 仅修改期望节点数（最常用）

```bash
tccli tke ModifyClusterNodePool \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx \
  --DesiredCapacity 10
```

#### 修改伸缩范围

```bash
# 修改最小/最大节点数（不改变当前节点数）
tccli tke ModifyClusterNodePool \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx \
  --MinSize 5 \
  --MaxSize 30
```

---

### 方式 2: 使用 Python SDK

```python
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tke.v20180525 import tke_client, models
import json

def scale_node_pool(cluster_id, node_pool_id, desired_capacity=None, min_size=None, max_size=None):
    """扩容节点池"""
    # 初始化认证
    cred = credential.Credential("SecretId", "SecretKey")
    
    # 配置 HTTP 请求
    http_profile = HttpProfile()
    http_profile.endpoint = "tke.tencentcloudapi.com"
    
    client_profile = ClientProfile()
    client_profile.httpProfile = http_profile
    
    # 创建 TKE 客户端
    client = tke_client.TkeClient(cred, "ap-guangzhou", client_profile)
    
    # 构建请求
    req = models.ModifyClusterNodePoolRequest()
    params = {
        "ClusterId": cluster_id,
        "NodePoolId": node_pool_id
    }
    
    if desired_capacity is not None:
        params["DesiredCapacity"] = desired_capacity
    if min_size is not None:
        params["MinSize"] = min_size
    if max_size is not None:
        params["MaxSize"] = max_size
    
    req.from_json_string(json.dumps(params))
    
    # 发送请求
    resp = client.ModifyClusterNodePool(req)
    
    print(f"✅ Node pool scaled successfully")
    print(f"   Node Pool ID: {node_pool_id}")
    if desired_capacity:
        print(f"   Desired Capacity: {desired_capacity}")
    if min_size:
        print(f"   Min Size: {min_size}")
    if max_size:
        print(f"   Max Size: {max_size}")
    
    return resp.RequestId

# 示例调用

# 1. 扩容到 10 个节点
scale_node_pool("cls-xxxxxxxx", "np-xxxxxxxx", desired_capacity=10)

# 2. 缩容到 5 个节点
scale_node_pool("cls-xxxxxxxx", "np-xxxxxxxx", desired_capacity=5)

# 3. 修改伸缩范围
scale_node_pool("cls-xxxxxxxx", "np-xxxxxxxx", min_size=3, max_size=20)

# 4. 同时修改期望节点数和伸缩范围
scale_node_pool("cls-xxxxxxxx", "np-xxxxxxxx", 
                desired_capacity=10, min_size=5, max_size=30)
```

---

### 方式 3: 使用 Go SDK

```go
package main

import (
    "fmt"
    
    "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
    "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
    tke "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/tke/v20180525"
)

func main() {
    // 初始化认证
    credential := common.NewCredential("SecretId", "SecretKey")
    
    // 配置 Client
    cpf := profile.NewClientProfile()
    cpf.HttpProfile.Endpoint = "tke.tencentcloudapi.com"
    
    // 创建 TKE 客户端
    client, _ := tke.NewClient(credential, "ap-guangzhou", cpf)
    
    // 构建请求
    request := tke.NewModifyClusterNodePoolRequest()
    
    clusterId := "cls-xxxxxxxx"
    nodePoolId := "np-xxxxxxxx"
    desiredCapacity := int64(10)
    minSize := int64(3)
    maxSize := int64(20)
    
    request.ClusterId = &clusterId
    request.NodePoolId = &nodePoolId
    request.DesiredCapacity = &desiredCapacity
    request.MinSize = &minSize
    request.MaxSize = &maxSize
    
    // 发送请求
    response, err := client.ModifyClusterNodePool(request)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("✅ Node pool scaled successfully\n")
    fmt.Printf("   Request ID: %s\n", *response.Response.RequestId)
    fmt.Printf("   Desired Capacity: %d\n", desiredCapacity)
}
```

---

## 扩缩容场景

### 场景 1: 应对流量高峰（扩容）

```python
# 工作日高峰期扩容到 20 个节点
scale_node_pool("cls-xxxxxxxx", "np-xxxxxxxx", desired_capacity=20)
```

### 场景 2: 成本优化（缩容）

```python
# 凌晨低峰期缩容到 5 个节点
scale_node_pool("cls-xxxxxxxx", "np-xxxxxxxx", desired_capacity=5)
```

### 场景 3: 调整自动扩缩容范围

```python
# 双 11 活动期间，提高最大节点数限制
scale_node_pool("cls-xxxxxxxx", "np-xxxxxxxx", min_size=10, max_size=50)
```

### 场景 4: 临时扩容测试

```bash
# 扩容到 15 个节点进行压测
tccli tke ModifyClusterNodePool \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx \
  --DesiredCapacity 15

# 测试完成后缩容回 5 个节点
tccli tke ModifyClusterNodePool \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx \
  --DesiredCapacity 5
```

---

## 验证步骤

### 1. 监控扩容进度

```bash
# 查询节点池状态
tccli tke DescribeClusterNodePoolDetail \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx
```

查看 `DesiredNodesNum` 和 `NodeCountSummary` 字段。

### 2. 查看节点状态

```bash
# 实时监控节点数
kubectl get nodes -l node-pool=<pool-name> -w

# 查看节点详情
kubectl get nodes -l node-pool=<pool-name> -o wide
```

期望结果：节点数逐渐达到期望值，状态为 Ready

### 3. 查看 CVM 实例

```bash
tccli cvm DescribeInstances \
  --Filters '[{"Name":"tag:tke-nodepool-id","Values":["np-xxxxxxxx"]}]'
```

### 4. 验证 Pod 调度

```bash
# 查看 Pod 分布
kubectl get pods -A -o wide | grep <new-node-name>

# 验证新节点可用
kubectl run test-pod --image=nginx --restart=Never
kubectl get pod test-pod -o wide
```

---

## 缩容注意事项

### 安全缩容步骤

```bash
# Step 1: 查看节点上运行的 Pod
kubectl get pods -A --field-selector spec.nodeName=<node-name>

# Step 2: 驱逐节点上的 Pod（推荐）
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Step 3: 确认 Pod 已迁移后，执行缩容
tccli tke ModifyClusterNodePool \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx \
  --DesiredCapacity 5
```

### 缩容风险

❌ **直接缩容的风险**：
- 正在运行的 Pod 可能被强制终止
- 本地存储数据可能丢失
- 服务可能短暂中断

✅ **推荐做法**：
1. 使用 `kubectl drain` 优雅驱逐 Pod
2. 缩容期望节点数 > 最小节点数
3. 避免缩容到 0（影响服务可用性）
4. 生产环境在低峰期执行缩容

---

## 高级配置

### 1. 修改其他配置

除了节点数，还可以修改其他配置：

```json
{
  "ClusterId": "cls-xxxxxxxx",
  "NodePoolId": "np-xxxxxxxx",
  "Name": "new-pool-name",
  "Labels": [
    {"Name": "env", "Value": "production-v2"}
  ],
  "Taints": [
    {"Key": "new-taint", "Value": "true", "Effect": "NoSchedule"}
  ],
  "EnableAutoscale": true,
  "AutoScalingGroupPara": {
    "DesiredCapacity": 10
  }
}
```

### 2. 配合 HPA（Horizontal Pod Autoscaler）

```bash
# 创建 HPA（Pod 自动扩缩容）
kubectl autoscale deployment <deployment-name> \
  --cpu-percent=70 \
  --min=3 \
  --max=50

# 节点池自动扩容会自动响应 HPA 的需求
```

### 3. 定时扩缩容（使用 CronJob）

创建 K8s CronJob 定时调整节点池：

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-node-pool
spec:
  schedule: "0 8 * * *"  # 每天 8:00 扩容
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: scale-up
            image: tke-cli:latest
            command:
            - /bin/sh
            - -c
            - |
              tccli tke ModifyClusterNodePool \
                --ClusterId cls-xxxxxxxx \
                --NodePoolId np-xxxxxxxx \
                --DesiredCapacity 20
          restartPolicy: OnFailure
```

---

## 异常处理

### 常见错误

| 错误码 | 错误信息 | 可能原因 | 解决方案 |
|-------|---------|---------|---------|
| `InvalidParameterValue` | 期望节点数超出范围 | desired_capacity < min_size 或 > max_size | 调整参数或修改 min/max 限制 |
| `QuotaLimitExceeded` | 实例配额不足 | CVM 配额已满 | 申请提升配额或缩小扩容规模 |
| `InsufficientBalance` | 账户余额不足 | 账户欠费 | 充值后重试 |
| `NodePoolNotFound` | 节点池不存在 | NodePoolId 错误 | 检查节点池 ID |
| `InvalidNodePoolState` | 节点池状态异常 | 节点池正在更新或删除 | 等待节点池恢复正常 |

### 故障排查步骤

#### 1. 扩容失败（节点数未增加）

```bash
# 查看节点池详情
tccli tke DescribeClusterNodePoolDetail \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx

# 查看 CVM 实例状态
tccli cvm DescribeInstances \
  --Filters '[{"Name":"tag:tke-nodepool-id","Values":["np-xxxxxxxx"]}]'
```

**可能原因**：
- CVM 配额不足
- 子网可用 IP 不足
- 镜像拉取失败

#### 2. 缩容失败（节点未删除）

```bash
# 查看节点上的 Pod
kubectl get pods -A --field-selector spec.nodeName=<node-name>

# 查看节点是否有污点或标签保护
kubectl describe node <node-name> | grep Taints
```

**可能原因**：
- 节点上有 PodDisruptionBudget 保护
- 节点上有 DaemonSet Pod（默认不驱逐）
- 节点数已达最小值

#### 3. 节点卡在 NotReady 状态

```bash
# 查看节点详情
kubectl describe node <node-name>

# 查看 kubelet 日志
kubectl logs -n kube-system <kubelet-pod>
```

---

## 最佳实践

### 1. 分阶段扩容（大规模扩容）

```python
# 避免一次性扩容过多（可能触发配额限制）
# 推荐分批扩容

# 第 1 批：扩容到 10 个节点
scale_node_pool("cls-xxxxxxxx", "np-xxxxxxxx", desired_capacity=10)
time.sleep(300)  # 等待 5 分钟

# 第 2 批：扩容到 20 个节点
scale_node_pool("cls-xxxxxxxx", "np-xxxxxxxx", desired_capacity=20)
```

### 2. 结合监控告警

设置监控指标：
- CPU 使用率 > 70% → 触发扩容
- CPU 使用率 < 30% → 触发缩容
- 节点数达到上限 → 告警通知

### 3. 成本优化

```python
# 工作日高峰期（9:00-22:00）: 20 个节点
# 工作日低峰期（22:00-9:00）: 10 个节点
# 周末: 5 个节点

import datetime

def auto_scale_by_time():
    now = datetime.datetime.now()
    is_weekend = now.weekday() >= 5
    is_peak_hour = 9 <= now.hour < 22
    
    if is_weekend:
        desired = 5
    elif is_peak_hour:
        desired = 20
    else:
        desired = 10
    
    scale_node_pool("cls-xxxxxxxx", "np-xxxxxxxx", desired_capacity=desired)
```

### 4. 设置合理的伸缩范围

```json
{
  "MinSize": 3,    // 保证基本可用性
  "MaxSize": 50,   // 防止成本失控
  "DesiredCapacity": 10  // 正常负载节点数
}
```

### 5. 监控扩缩容成本

每次扩缩容后记录：
- 节点数变化
- 成本变化
- 业务指标（QPS、响应时间）

---

## Agent Prompt 模板

### Prompt 1: 扩容节点池

```prompt
请扩容 TKE 节点池：
- 集群 ID: {{cluster_id}}
- 节点池 ID: {{node_pool_id}}
- 目标节点数: {{desired_capacity}}
- 监控扩容进度
- 验证新节点状态
```

### Prompt 2: 缩容节点池（安全）

```prompt
请安全缩容 TKE 节点池：
- 集群 ID: {{cluster_id}}
- 节点池 ID: {{node_pool_id}}
- 目标节点数: {{desired_capacity}}
- 缩容步骤:
  1. 查看待缩容节点上的 Pod
  2. 使用 kubectl drain 驱逐 Pod
  3. 等待 Pod 迁移完成
  4. 执行缩容操作
  5. 验证服务正常
```

### Prompt 3: 调整伸缩范围

```prompt
请调整 TKE 节点池的伸缩范围：
- 集群 ID: {{cluster_id}}
- 节点池 ID: {{node_pool_id}}
- 最小节点数: {{min_size}}
- 最大节点数: {{max_size}}
- 期望节点数: {{desired_capacity}}（可选）
```

### Prompt 4: 定时扩缩容

```prompt
请为 TKE 节点池配置定时扩缩容：
- 集群 ID: {{cluster_id}}
- 节点池 ID: {{node_pool_id}}
- 扩容时间: 每天 08:00
- 扩容目标: 20 个节点
- 缩容时间: 每天 22:00
- 缩容目标: 5 个节点
- 使用 K8s CronJob 实现
```

---

## 相关文档

- [创建节点池](./01-create-node-pool.md)
- [查询节点列表](../node/04-describe-nodes.md)
- [删除节点](../node/02-delete-node.md)
- [更新 Deployment](../workload/03-update-deployment.md)

---

## Cookbook 示例

完整可执行示例：[scale-node-pool-example.py](../../cookbook/scale-node-pool-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2025-12-25  
**适用 TKE 版本**: ≥ 1.12
