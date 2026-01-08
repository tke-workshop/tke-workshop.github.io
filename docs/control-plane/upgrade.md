---
title: 升级 TKE 集群
description: 本文介绍如何通过 5 种方式升级 TKE 集群的 Kubernetes 版本
agent_ready: true
agent_rating: 5
api_reference: UpdateClusterVersion
---

## 文档元信息

- **功能名称**: 升级 TKE 集群
- **API 版本**: 2018-05-25
- **适用集群版本**: 所有版本
- **文档更新时间**: 2026-01-08
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

TKE 集群升级是将集群的 Kubernetes 版本升级到更高版本的操作。升级过程包括 Master 组件升级和 Node 节点升级两个阶段。

**任务目标**：将 TKE 集群从当前版本升级到目标 Kubernetes 版本。

**适用场景**：

- 获取新版本 Kubernetes 特性
- 修复已知安全漏洞
- 保持版本在官方支持周期内
- 使用新版本 API 和功能

**Agent 友好度**：⭐⭐⭐⭐⭐

---

## 前置条件

在执行操作前，必须满足以下条件：

- [ ] 已开通腾讯云账号并完成实名认证
- [ ] 已创建腾讯云 API 密钥 (SecretId 和 SecretKey)
- [ ] 账号具有 TKE 服务的管理权限 (QcloudTKEFullAccess 或 AdministratorAccess)
- [ ] 目标集群状态为 Running（运行中）
- [ ] 集群内无异常节点（所有节点状态为 Ready）
- [ ] 已安装并配置 tccli 工具（腾讯云 CLI）
- [ ] 已备份重要应用数据和配置
- [ ] 已确认目标版本与当前应用、插件兼容

### 检查清单

#### 1. 集群状态检查

```bash
tccli tke DescribeClusters \
  --Region ap-guangzhou \
  --ClusterIds '["cls-xxxxxxxx"]'

# 确认 ClusterStatus 为 Running
```

#### 2. 节点状态检查

```bash
kubectl get nodes

# 确认所有节点状态为 Ready
```

#### 3. 查询可升级版本

```bash
tccli tke DescribeAvailableClusterVersion \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx

# 获取可升级的目标版本列表
```

---

## 操作步骤

### 方式一：使用腾讯云 API

#### Step 1: 准备请求参数

**核心参数**：

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|:----:|------|------|--------|
| ClusterId | 是 | String | 集群 ID | cls-xxxxxxxx |
| DstVersion | 是 | String | 目标 Kubernetes 版本 | 1.28.3 |
| ExtraArgs | 否 | Object | 集群自定义参数 | 见下方 |
| MaxNotReadyPercent | 否 | Float | 最大不可用节点百分比 | 10 |
| SkipPreCheck | 否 | Boolean | 是否跳过前置检查（不推荐） | false |

**ExtraArgs 结构**：

| 字段 | 必填 | 类型 | 说明 |
|------|:----:|------|------|
| KubeAPIServer | 否 | Array of String | API Server 自定义参数 |
| KubeControllerManager | 否 | Array of String | Controller Manager 自定义参数 |
| KubeScheduler | 否 | Array of String | Scheduler 自定义参数 |

**请求结构示例**：

```json
{
  "ClusterId": "cls-xxxxxxxx",
  "DstVersion": "1.28.3",
  "MaxNotReadyPercent": 10,
  "SkipPreCheck": false
}
```

#### Step 2: 调用 API

**使用腾讯云 CLI (tccli)**：

```bash
tccli tke UpdateClusterVersion \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --DstVersion 1.28.3 \
  --MaxNotReadyPercent 10
```

**使用 Python SDK**：

```python
import json
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tke.v20180525 import tke_client, models

# 配置认证信息
cred = credential.Credential("your-secret-id", "your-secret-key")

# 配置 HTTP 选项
httpProfile = HttpProfile()
httpProfile.endpoint = "tke.tencentcloudapi.com"

# 配置客户端
clientProfile = ClientProfile()
clientProfile.httpProfile = httpProfile
client = tke_client.TkeClient(cred, "ap-guangzhou", clientProfile)

# 构造请求
req = models.UpdateClusterVersionRequest()
params = {
    "ClusterId": "cls-xxxxxxxx",
    "DstVersion": "1.28.3",
    "MaxNotReadyPercent": 10,
    "SkipPreCheck": False
}
req.from_json_string(json.dumps(params))

# 发送请求
resp = client.UpdateClusterVersion(req)
print(f"RequestId: {resp.RequestId}")
```

**使用 Go SDK**：

```go
package main

import (
    "fmt"
    "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
    "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/errors"
    "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
    tke "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/tke/v20180525"
)

func main() {
    // 配置认证信息
    credential := common.NewCredential("your-secret-id", "your-secret-key")

    // 配置客户端
    cpf := profile.NewClientProfile()
    cpf.HttpProfile.Endpoint = "tke.tencentcloudapi.com"
    client, _ := tke.NewClient(credential, "ap-guangzhou", cpf)

    // 构造请求
    request := tke.NewUpdateClusterVersionRequest()
    request.ClusterId = common.StringPtr("cls-xxxxxxxx")
    request.DstVersion = common.StringPtr("1.28.3")
    maxNotReady := float64(10)
    request.MaxNotReadyPercent = &maxNotReady

    // 发送请求
    response, err := client.UpdateClusterVersion(request)
    if _, ok := err.(*errors.TencentCloudSDKError); ok {
        fmt.Printf("API error: %s\n", err)
        return
    }
    if err != nil {
        panic(err)
    }
    fmt.Printf("RequestId: %s\n", *response.Response.RequestId)
}
```

**使用 cURL**：

```bash
curl -X POST "https://tke.tencentcloudapi.com" \
  -H "Content-Type: application/json" \
  -H "Authorization: TC3-HMAC-SHA256 ..." \
  -d '{
    "Action": "UpdateClusterVersion",
    "Version": "2018-05-25",
    "Region": "ap-guangzhou",
    "ClusterId": "cls-xxxxxxxx",
    "DstVersion": "1.28.3",
    "MaxNotReadyPercent": 10
  }'
```

!!! warning "签名说明"
    cURL 调用需要计算 TC3-HMAC-SHA256 签名，建议使用 SDK 或 tccli。
    签名算法参考 [签名方法 v3](https://cloud.tencent.com/document/api/457/31983)

#### Step 3: 获取响应

**响应示例**：

```json
{
  "Response": {
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

**响应参数说明**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| RequestId | String | 请求唯一标识，用于问题排查 |

### 方式二：使用控制台

#### Step 1: 进入集群详情

1. 登录 [TKE 控制台](https://console.cloud.tencent.com/tke2)
2. 在左侧导航栏选择 **集群**
3. 点击目标集群名称进入集群详情

#### Step 2: 发起升级

1. 在集群详情页，找到 **基本信息** 区域
2. 在 **Kubernetes 版本** 行，点击 **升级** 按钮
3. 在弹出的升级确认框中：
   - 选择目标版本
   - 查看升级前置检查结果
   - 配置升级参数（如最大不可用节点百分比）

#### Step 3: 执行升级

1. 确认前置检查通过
2. 点击 **确定** 开始升级
3. 在集群列表查看升级进度

!!! note "升级顺序"
    升级过程分为两个阶段：
    1. **Master 升级**：自动完成，期间 API Server 可能短暂不可用
    2. **Node 升级**：需要手动触发或配置自动升级

---

## 验证步骤

创建后，通过以下步骤验证：

### Step 1: 查询集群状态

```bash
tccli tke DescribeClusters \
  --Region ap-guangzhou \
  --ClusterIds '["cls-xxxxxxxx"]'
```

**期望结果**：

```json
{
  "Response": {
    "Clusters": [{
      "ClusterId": "cls-xxxxxxxx",
      "ClusterStatus": "Running",
      "ClusterVersion": "1.28.3"
    }]
  }
}
```

### Step 2: 验证集群版本

```bash
kubectl version --short
```

**期望结果**：

```
Server Version: v1.28.3
```

### Step 3: 检查节点状态

```bash
kubectl get nodes -o wide
```

**期望结果**：

```
NAME           STATUS   ROLES    AGE   VERSION   INTERNAL-IP    OS-IMAGE
node-01        Ready    <none>   30d   v1.28.3   10.0.0.1       Tencent tlinux
node-02        Ready    <none>   30d   v1.28.3   10.0.0.2       Tencent tlinux
```

**状态说明**：

| 状态 | 说明 | 下一步操作 |
|------|------|----------|
| Upgrading | 升级中 | 等待升级完成 |
| Running | 运行中 | 升级成功，可进行后续操作 |
| Abnormal | 异常 | 检查事件和错误日志 |

---

## 异常处理

### 常见错误码

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|---------|
| InvalidParameter.ClusterNotFound | 集群不存在 | ClusterId 错误 | 检查集群 ID 是否正确 |
| InvalidParameter.VersionNotFound | 版本不存在 | 目标版本不在可升级列表中 | 使用 DescribeAvailableClusterVersion 查询可用版本 |
| ResourceUnavailable.ClusterStateError | 集群状态异常 | 集群当前状态不支持升级 | 等待集群状态恢复为 Running |
| OperationDenied.ClusterUpgrading | 集群正在升级 | 已有升级任务在执行 | 等待当前升级完成 |
| FailedOperation.PreCheckFailed | 前置检查失败 | 存在不兼容的 API 或配置 | 根据检查结果修复问题 |
| UnauthorizedOperation | 未授权操作 | 权限不足 | 检查 CAM 策略权限 |

### 排查步骤

1. **检查请求参数**: 确认 ClusterId 和 DstVersion 正确
2. **查看 RequestId**: 记录 RequestId 用于提交工单
3. **查询集群状态**: 使用 DescribeClusters API 查看状态和错误信息
4. **查看事件详情**: 登录控制台查看集群事件
5. **检查节点状态**: 使用 kubectl get nodes 查看节点状态

### 升级失败恢复

```bash
# 查看集群事件
kubectl get events --sort-by='.lastTimestamp' -A

# 查看节点详情
kubectl describe node <node-name>

# 查看系统组件状态
kubectl get pods -n kube-system
```

---

## 高级配置

### 节点升级策略

TKE 支持以下节点升级方式：

| 升级方式 | 说明 | 适用场景 |
|----------|------|----------|
| 重装滚动升级 | 驱逐 Pod 后重装节点系统 | 需要更换容器运行时 |
| 原地升级 | 仅升级 kubelet 等组件 | 小版本升级 |
| 手动升级 | 逐个节点手动操作 | 精细控制升级过程 |

### 升级前置检查项

| 检查项 | 说明 | 影响 |
|--------|------|------|
| API 兼容性 | 检查是否使用了已废弃的 API | 可能导致工作负载创建失败 |
| 节点状态 | 检查所有节点是否 Ready | 异常节点可能导致升级失败 |
| 资源充足性 | 检查集群是否有足够资源 | 资源不足可能导致 Pod 无法调度 |
| 组件兼容性 | 检查插件与目标版本兼容性 | 不兼容插件可能无法正常工作 |

### 跨版本升级注意事项

!!! warning "重要提示"
    - TKE 不支持跨大版本直接升级（如 1.22 直接升级到 1.28）
    - 必须逐个小版本升级（1.22 → 1.24 → 1.26 → 1.28）
    - 升级不可回退，请务必在测试环境验证

**版本兼容性检查**：

```bash
# 检查使用的已废弃 API
kubectl get --raw /metrics | grep apiserver_requested_deprecated_apis

# 使用 pluto 工具扫描
pluto detect-files -d ./manifests/
```

---

## Agent Prompt 模板

### 基础升级 Prompt

```prompt
请帮我升级 TKE 集群：
- 集群 ID: {{cluster_id}}
- 地域: {{region}}
- 目标版本: {{target_version}}
- 最大不可用节点百分比: 10%
```

### 带详细配置的 Prompt

```prompt
请帮我升级 TKE 集群，配置如下：
- 集群 ID: cls-xxxxxxxx
- 地域: ap-guangzhou
- 当前版本: 1.26.1
- 目标版本: 1.28.3
- 升级前检查: 是
- 最大不可用节点百分比: 10%
- 节点升级方式: 重装滚动升级

请在升级前：
1. 检查集群状态
2. 查询可升级版本
3. 确认无异常节点
4. 执行升级操作
5. 验证升级结果
```

**参数说明**：

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `{{cluster_id}}` | 集群 ID | cls-xxxxxxxx |
| `{{region}}` | 地域 | ap-guangzhou |
| `{{target_version}}` | 目标 Kubernetes 版本 | 1.28.3 |

---

## 最佳实践

### 1. 升级时机选择

✅ **推荐做法**：
- 在业务低峰期进行升级
- 提前 1-2 周在测试环境验证
- 预留足够的回滚时间窗口

❌ **不推荐做法**：
- 在业务高峰期升级
- 未经测试直接升级生产环境
- 跳过前置检查直接升级

### 2. 版本规划

✅ **推荐做法**：
- 保持版本在官方支持周期内
- 定期关注版本更新公告
- 制定季度升级计划

❌ **不推荐做法**：
- 使用已停止支持的版本
- 长期不升级累积技术债务
- 跨多个大版本一次性升级

### 3. 应用兼容性

✅ **推荐做法**：
- 升级前检查 API 废弃情况
- 更新使用废弃 API 的 YAML 清单
- 确认 Helm Chart 与目标版本兼容

❌ **不推荐做法**：
- 忽略 API 废弃警告
- 使用硬编码的 API 版本
- 不更新过时的 Helm Chart

---

## 相关命令速查

```bash
# 查询集群信息
tccli tke DescribeClusters --ClusterIds '["cls-xxx"]'

# 查询可升级版本
tccli tke DescribeAvailableClusterVersion --ClusterId cls-xxx

# 升级集群
tccli tke UpdateClusterVersion --ClusterId cls-xxx --DstVersion 1.28.3

# 查看集群版本
kubectl version --short

# 查看节点版本
kubectl get nodes -o wide

# 查看系统组件
kubectl get pods -n kube-system

# 查看集群事件
kubectl get events --sort-by='.lastTimestamp' -A
```

---

## 相关文档

- [创建 TKE 集群](../basics/cluster/01-create-cluster.md)
- [管理节点池](../basics/nodepool/01-create-nodepool.md)
- [集群版本说明](https://cloud.tencent.com/document/product/457/47791)

---

## API 文档链接

- **API 文档**: https://cloud.tencent.com/document/api/457/52133
- **SDK 文档**: https://cloud.tencent.com/document/sdk
- **API Explorer**: https://console.cloud.tencent.com/api/explorer?Product=tke&Version=2018-05-25&Action=UpdateClusterVersion

---

**文档版本**: v1.0  
**最后更新**: 2026-01-08  
**维护者**: TKE Documentation Team
