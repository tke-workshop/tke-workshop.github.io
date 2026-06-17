---
title: "创建节点池"
---

# 创建节点池

## 文档元信息

- **功能名称**: 创建标准节点池
- **API 版本**: 2018-05-25
- **API 名称**: `CreateClusterNodePool`
- **适用集群版本**: 所有支持节点池的 TKE 集群
- **文档更新时间**: 2026-06-17
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

标准节点池用于统一管理一组普通 CVM 节点。节点池可以封装伸缩组、启动配置、节点标签、污点、运行时和操作系统配置，适合生产环境批量管理同类节点。

**任务目标**: 在已有 TKE 集群中创建一个可扩缩的标准节点池。

---

## 前置条件

- [ ] TKE 集群状态为 `Running`
- [ ] 已准备 VPC、子网和安全组
- [ ] 子网可用 IP、CVM、CBS、弹性伸缩配额充足
- [ ] 已配置腾讯云 API 凭证或 tccli
- [ ] 已确认节点机型、系统盘、数据盘、操作系统和容器运行时

---

## 参数说明

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|------|------|------|--------|
| ClusterId | 是 | String | 集群 ID | cls-xxxxxxxx |
| Name | 否 | String | 节点池名称 | production-pool |
| AutoScalingGroupPara | 是 | String | 弹性伸缩组参数 JSON 字符串 | 见下方 |
| LaunchConfigurePara | 是 | String | 启动配置参数 JSON 字符串 | 见下方 |
| InstanceAdvancedSettings | 否 | Object | 节点高级配置 | 见下方 |
| EnableAutoscale | 否 | Boolean | 是否启用自动伸缩 | true |
| Labels | 否 | Array | Kubernetes 节点标签 | 见下方 |
| Taints | 否 | Array | Kubernetes 节点污点 | 见下方 |
| Tags | 否 | Array | 腾讯云资源标签 | 见下方 |
| DeletionProtection | 否 | Boolean | 删除保护开关 | true |

!!! note "参数格式"
    `AutoScalingGroupPara` 和 `LaunchConfigurePara` 是 JSON 字符串透传参数，分别对应弹性伸缩 AS 组和启动配置。使用 tccli 时可以直接传入压缩后的 JSON 字符串；使用 SDK 时建议先用 `json.dumps()` 生成字符串。

### AutoScalingGroupPara 示例

```json
{
  "MinSize": 1,
  "MaxSize": 10,
  "DesiredCapacity": 3,
  "VpcId": "vpc-xxxxxxxx",
  "SubnetIds": ["subnet-xxxxxxxx"],
  "Zones": ["ap-guangzhou-3"]
}
```

### LaunchConfigurePara 示例

```json
{
  "InstanceType": "S5.MEDIUM4",
  "SystemDisk": {
    "DiskType": "CLOUD_PREMIUM",
    "DiskSize": 100
  },
  "DataDisks": [
    {
      "DiskType": "CLOUD_PREMIUM",
      "DiskSize": 200,
      "DeleteWithInstance": true
    }
  ],
  "InternetAccessible": {
    "InternetChargeType": "TRAFFIC_POSTPAID_BY_HOUR",
    "InternetMaxBandwidthOut": 10,
    "PublicIpAssigned": false
  },
  "SecurityGroupIds": ["sg-xxxxxxxx"],
  "InstanceChargeType": "POSTPAID_BY_HOUR"
}
```

### 节点标签、污点和资源标签

```json
{
  "Labels": [
    {"Name": "env", "Value": "production"},
    {"Name": "node-pool", "Value": "production-pool"}
  ],
  "Taints": [
    {"Key": "dedicated", "Value": "backend", "Effect": "NoSchedule"}
  ],
  "Tags": [
    {"Key": "env", "Value": "production"},
    {"Key": "cost-center", "Value": "cc-1001"}
  ]
}
```

---

## 操作步骤

### 方式一: 使用 tccli

```bash
tccli tke CreateClusterNodePool \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --Name production-pool \
  --EnableAutoscale true \
  --AutoScalingGroupPara '{
    "MinSize": 1,
    "MaxSize": 10,
    "DesiredCapacity": 3,
    "VpcId": "vpc-xxxxxxxx",
    "SubnetIds": ["subnet-xxxxxxxx"],
    "Zones": ["ap-guangzhou-3"]
  }' \
  --LaunchConfigurePara '{
    "InstanceType": "S5.MEDIUM4",
    "SystemDisk": {
      "DiskType": "CLOUD_PREMIUM",
      "DiskSize": 100
    },
    "InternetAccessible": {
      "InternetChargeType": "TRAFFIC_POSTPAID_BY_HOUR",
      "InternetMaxBandwidthOut": 10,
      "PublicIpAssigned": false
    },
    "SecurityGroupIds": ["sg-xxxxxxxx"],
    "InstanceChargeType": "POSTPAID_BY_HOUR"
  }' \
  --Labels '[
    {"Name": "env", "Value": "production"},
    {"Name": "node-pool", "Value": "production-pool"}
  ]' \
  --Tags '[
    {"Key": "env", "Value": "production"},
    {"Key": "cost-center", "Value": "cc-1001"}
  ]' \
  --DeletionProtection true
```

**成功响应示例**:

```json
{
  "NodePoolId": "np-xxxxxxxx",
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### 方式二: 使用 Python SDK

```python
import json

from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import models, tke_client

cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

req = models.CreateClusterNodePoolRequest()
req.ClusterId = "cls-xxxxxxxx"
req.Name = "production-pool"
req.EnableAutoscale = True
req.AutoScalingGroupPara = json.dumps({
    "MinSize": 1,
    "MaxSize": 10,
    "DesiredCapacity": 3,
    "VpcId": "vpc-xxxxxxxx",
    "SubnetIds": ["subnet-xxxxxxxx"],
    "Zones": ["ap-guangzhou-3"],
})
req.LaunchConfigurePara = json.dumps({
    "InstanceType": "S5.MEDIUM4",
    "SystemDisk": {
        "DiskType": "CLOUD_PREMIUM",
        "DiskSize": 100,
    },
    "SecurityGroupIds": ["sg-xxxxxxxx"],
    "InstanceChargeType": "POSTPAID_BY_HOUR",
})

env_label = models.Label()
env_label.Name = "env"
env_label.Value = "production"
pool_label = models.Label()
pool_label.Name = "node-pool"
pool_label.Value = "production-pool"
req.Labels = [env_label, pool_label]

env_tag = models.Tag()
env_tag.Key = "env"
env_tag.Value = "production"
cost_tag = models.Tag()
cost_tag.Key = "cost-center"
cost_tag.Value = "cc-1001"
req.Tags = [env_tag, cost_tag]
req.DeletionProtection = True

resp = client.CreateClusterNodePool(req)
print(f"节点池 ID: {resp.NodePoolId}")
```

---

## 验证步骤

### 查询节点池详情

```bash
tccli tke DescribeClusterNodePoolDetail \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx
```

### 查询节点是否加入集群

```bash
kubectl get nodes -l node-pool=production-pool
kubectl describe node <node-name>
```

**期望结果**:

- 节点池存在且状态正常
- 节点逐步进入 `Ready`
- 节点带有 `env=production`、`node-pool=production-pool` 标签

---

## 常见问题

| 问题 | 可能原因 | 处理方式 |
|------|----------|----------|
| 节点池创建失败 | AS/CVM/CBS 配额不足 | 检查地域配额和账户余额 |
| 节点长时间 NotReady | 安全组、路由或启动脚本异常 | 检查节点到 API Server 网络和 kubelet 日志 |
| 自动伸缩不生效 | 未开启 EnableAutoscale 或范围设置不合理 | 检查 `EnableAutoscale`、`MinSize`、`MaxSize` |
| Pod 未调度到节点池 | 标签/污点与工作负载不匹配 | 检查 `nodeSelector`、亲和性和容忍配置 |

---

## 最佳实践

1. 生产环境优先使用节点池管理普通节点，减少手工节点漂移。
2. 为节点池添加稳定标签，例如 `env`、`node-pool`、`workload-type`。
3. 将腾讯云资源标签 `Tags` 与账单、成本中心和责任团队对齐。
4. 对关键节点池启用删除保护，删除前先迁移业务 Pod。
5. 多可用区节点池应提前评估子网 IP 和机型库存。

---

## 相关文档

- [扩缩节点池](./02-scale-node-pool.md)
- [查询节点池](./03-describe-node-pool.md)
- [删除节点池](./04-delete-node-pool.md)
- [添加普通节点](../node/01-add-node.md)
