# 如何添加节点到 TKE 集群

## 文档元信息

- **功能名称**: 添加节点
- **API 版本**: 2018-05-25
- **适用集群版本**: 所有版本
- **文档更新时间**: 2026-01-07
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

向现有 TKE 集群添加工作节点(Node),支持两种方式:
1. **创建新节点**: 自动购买 CVM 实例并加入集群
2. **添加已有节点**: 将现有 CVM 实例加入集群

**任务目标**: 扩展集群计算资源,增加可调度的工作节点

---

## 前置条件

- [ ] 集群状态为 `Running`
- [ ] 集群节点配额充足 (默认每集群 100 个节点)
- [ ] 目标可用区有足够的 CVM 库存 (创建新节点)
- [ ] 已有 CVM 实例满足加入条件 (添加已有节点)
- [ ] 账户余额充足 (创建新节点需付费)

---

## 方式一: 创建新节点

### Step 1: 准备节点配置参数

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|------|------|------|--------|
| ClusterId | 是 | String | 集群 ID | cls-xxxxxxxx |
| RunInstancesForNode | 是 | Array | 节点创建参数 | 见下方 |
| InstanceAdvancedSettings | 否 | Object | 节点高级配置 | 见下方 |

**RunInstancesForNode 结构**:

```json
{
  "InstanceType": "SA2.MEDIUM4",           // 实例机型 (2核4G)
  "SystemDisk": {
    "DiskType": "CLOUD_PREMIUM",           // 高性能云硬盘
    "DiskSize": 50                         // 系统盘大小 GB
  },
  "DataDisks": [
    {
      "DiskType": "CLOUD_PREMIUM",
      "DiskSize": 100,                     // 数据盘大小 GB
      "DeleteWithInstance": true           // 随实例删除
    }
  ],
  "InternetAccessible": {
    "InternetMaxBandwidthOut": 5,          // 公网带宽 Mbps
    "PublicIpAssigned": true               // 分配公网 IP
  },
  "InstanceCount": 3,                      // 节点数量
  "Zone": "ap-guangzhou-3",                // 可用区
  "InstanceName": "tke-node",              // 实例名称
  "SecurityGroupIds": ["sg-xxxxxxxx"]      // 安全组
}
```

**InstanceAdvancedSettings 结构**:

```json
{
  "Labels": [
    {
      "Name": "env",
      "Value": "production"
    }
  ],
  "Taints": [],                            // 污点配置
  "ExtraArgs": {
    "kubelet": [
      "max-pods=64"                        // 每节点最大 Pod 数
    ]
  },
  "UserScript": "",                        // 自定义脚本
  "DataDisks": [
    {
      "MountTarget": "/var/lib/docker",    // 挂载路径
      "DiskType": "CLOUD_PREMIUM",
      "DiskSize": 100
    }
  ]
}
```

### Step 2: 调用 CreateClusterInstances API

**使用腾讯云 CLI**:

```bash
tccli tke CreateClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --RunInstancesForNode '[
    {
      "InstanceType": "SA2.MEDIUM4",
      "SystemDisk": {
        "DiskType": "CLOUD_PREMIUM",
        "DiskSize": 50
      },
      "DataDisks": [
        {
          "DiskType": "CLOUD_PREMIUM",
          "DiskSize": 100
        }
      ],
      "InternetAccessible": {
        "InternetMaxBandwidthOut": 5
      },
      "InstanceCount": 3,
      "Zone": "ap-guangzhou-3",
      "SecurityGroupIds": ["sg-xxxxxxxx"]
    }
  ]' \
  --InstanceAdvancedSettings '{
    "Labels": [
      {
        "Name": "env",
        "Value": "production"
      }
    ]
  }'
```

**使用 Python SDK**:

```python
from tencentcloud.common import credential
from tencentcloud.tke.v20180525 import tke_client, models

cred = credential.Credential("SecretId", "SecretKey")
client = tke_client.TkeClient(cred, "ap-guangzhou")

req = models.CreateClusterInstancesRequest()
req.ClusterId = "cls-xxxxxxxx"

# 节点创建参数
run_param = models.RunInstancesForNode()
run_param.InstanceType = "SA2.MEDIUM4"
run_param.SystemDisk = models.SystemDisk()
run_param.SystemDisk.DiskType = "CLOUD_PREMIUM"
run_param.SystemDisk.DiskSize = 50
run_param.InstanceCount = 3
run_param.Zone = "ap-guangzhou-3"

req.RunInstancesForNode = [run_param]

# 高级配置
advanced = models.InstanceAdvancedSettings()
label = models.Label()
label.Name = "env"
label.Value = "production"
advanced.Labels = [label]

req.InstanceAdvancedSettings = advanced

resp = client.CreateClusterInstances(req)
print(f"节点ID列表: {resp.InstanceIdSet}")
```

### Step 3: 获取响应

**成功响应**:

```json
{
  "Response": {
    "InstanceIdSet": [
      "ins-xxxxxxx1",
      "ins-xxxxxxx2",
      "ins-xxxxxxx3"
    ],
    "RequestId": "12345678-1234-1234-1234-123456789012"
  }
}
```

---

## 方式二: 添加已有节点

### Step 1: 检查已有节点是否满足条件

节点必须满足:
- [ ] 操作系统为 CentOS 7.x / Ubuntu 18.04+ / TencentOS Server
- [ ] 与集群在同一 VPC 内
- [ ] 未安装 Docker/Containerd (或愿意重装)
- [ ] 未加入其他 TKE 集群

### Step 2: 调用 AddExistedInstances API

**使用腾讯云 CLI**:

```bash
tccli tke AddExistedInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --InstanceIds '["ins-existed01", "ins-existed02"]' \
  --InstanceAdvancedSettings '{
    "Labels": [
      {
        "Name": "node-role",
        "Value": "worker"
      }
    ]
  }'
```

**使用 Python SDK**:

```python
req = models.AddExistedInstancesRequest()
req.ClusterId = "cls-xxxxxxxx"
req.InstanceIds = ["ins-existed01", "ins-existed02"]

advanced = models.InstanceAdvancedSettings()
label = models.Label()
label.Name = "node-role"
label.Value = "worker"
advanced.Labels = [label]

req.InstanceAdvancedSettings = advanced

resp = client.AddExistedInstances(req)
print(f"加入成功: {resp.SuccessInstanceIds}")
print(f"加入失败: {resp.FailedInstanceIds}")
```

---

## 验证步骤

### Step 1: 查询节点状态

```bash
tccli tke DescribeClusterInstances \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --InstanceIds '["ins-xxxxxxxx"]'
```

### Step 2: 使用 kubectl 验证

```bash
# 查看节点列表
kubectl get nodes

# 查看节点详情
kubectl describe node <node-name>

# 检查节点状态
kubectl get nodes -o wide
```

**期望结果**:

```
NAME            STATUS   ROLES    AGE   VERSION
tke-node-xxx1   Ready    <none>   2m    v1.28.3
tke-node-xxx2   Ready    <none>   2m    v1.28.3
tke-node-xxx3   Ready    <none>   2m    v1.28.3
```

### Step 3: 检查节点组件

```bash
# 检查 kubelet 状态
kubectl get --raw "/api/v1/nodes/<node-name>/proxy/healthz"

# 查看节点资源使用情况
kubectl top node <node-name>
```

---

## 异常处理

### 常见错误及解决方案

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|---------|
| InvalidParameter.InstanceNotFound | 实例不存在 | InstanceId 不存在或无权限 | 检查实例 ID 是否正确 |
| FailedOperation.InstanceInOtherCluster | 实例已在其他集群 | 实例已加入其他 TKE 集群 | 先从原集群移除 |
| FailedOperation.InstanceNotInVpc | 实例不在 VPC 中 | 实例网络类型不是 VPC | 使用 VPC 内的实例 |
| LimitExceeded.NodeLimit | 节点数量超限 | 集群节点数已达上限 | 升级集群规格或删除不用的节点 |
| FailedOperation.InitNodeFailed | 节点初始化失败 | 网络不通或脚本执行失败 | 检查网络和安全组配置 |
| InsufficientBalance | 余额不足 | 账户余额不足 | 充值后重试 |

### 节点加入超时处理

如果节点状态长时间为 `Initializing`:

```bash
# 1. 登录节点查看日志
ssh root@<node-ip>

# 2. 查看初始化日志
tail -f /var/log/tke-node-init.log

# 3. 检查 kubelet 状态
systemctl status kubelet

# 4. 查看容器运行时状态
systemctl status containerd
```

---

## 高级配置

### 配置节点标签和污点

```json
{
  "Labels": [
    {
      "Name": "node.kubernetes.io/role",
      "Value": "compute"
    },
    {
      "Name": "gpu",
      "Value": "true"
    }
  ],
  "Taints": [
    {
      "Key": "dedicated",
      "Value": "gpu",
      "Effect": "NoSchedule"
    }
  ]
}
```

### 配置节点自定义脚本

```json
{
  "UserScript": "#!/bin/bash\necho 'vm.max_map_count=262144' >> /etc/sysctl.conf\nsysctl -p"
}
```

### 配置数据盘挂载

```json
{
  "DataDisks": [
    {
      "MountTarget": "/var/lib/containerd",
      "DiskType": "CLOUD_SSD",
      "DiskSize": 200,
      "FileSystem": "ext4",
      "AutoFormatAndMount": true
    }
  ]
}
```

---

## Agent Prompt 模板

### 创建节点 Prompt

```prompt
请向集群添加 3 个新节点:
- 集群ID: {{cluster_id}}
- 节点机型: SA2.MEDIUM4 (2核4G)
- 系统盘: 50GB 高性能云硬盘
- 数据盘: 100GB 高性能云硬盘
- 可用区: ap-guangzhou-3
- 标签: env=production
```

### 添加已有节点 Prompt

```prompt
请将以下已有 CVM 实例加入集群:
- 集群ID: cls-xxxxxxxx
- 实例ID列表: ins-aaa, ins-bbb, ins-ccc
- 添加标签: role=worker
```

---

## 最佳实践

1. **节点规格选择**:
   - 通用场景: SA2.MEDIUM4 (2核4G) 起步
   - 计算密集: SA3.LARGE8 (4核8G) 或更高
   - GPU 场景: GN7/GN10X 系列

2. **数据盘配置**:
   - 建议挂载独立数据盘用于容器存储
   - 生产环境使用 SSD 云硬盘
   - 最小建议 100GB

3. **安全组配置**:
   - 允许集群 CIDR 访问节点 10250 端口 (kubelet)
   - 允许 NodePort 范围 30000-32768

4. **标签管理**:
   - 使用标签标识节点用途: `role=compute`
   - 使用标签标识环境: `env=production`
   - 使用标签进行应用调度: `app=nginx`

---

## 相关文档

- [删除节点](./02-delete-node.md)
- [查询节点列表](./03-describe-nodes.md)
- [设置节点不可调度](./04-cordon-node.md)
- [创建节点池](../nodepool/01-create-nodepool.md)

---

## API 文档链接

- **CreateClusterInstances**: https://cloud.tencent.com/document/api/457
- **AddExistedInstances**: https://cloud.tencent.com/document/api/457
- **API Explorer**: https://console.cloud.tencent.com/api/explorer?Product=tke

---

## Cookbook 示例

完整可执行代码示例: [TKE 节点添加 Cookbook](../../cookbook/add-node-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2026-01-07  
**维护者**: TKE Documentation Team
