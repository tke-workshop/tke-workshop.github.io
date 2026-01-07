# 创建节点池 (CreateClusterNodePool)

## 功能概述

在 TKE 集群中创建节点池，用于统一管理一组具有相同配置的节点。节点池支持自动伸缩、标签管理、污点配置等高级特性，是生产环境节点管理的最佳实践。

**API 名称**: `CreateClusterNodePool`  
**功能优先级**: P0（核心功能）  
**适用场景**: 节点分组管理、自动扩缩容、多规格节点管理、GPU 节点管理

---

## 前置条件

### 必须满足
- [ ] 已创建 TKE 集群（集群状态为 Running）
- [ ] 集群版本 ≥ 1.12（节点池功能要求）
- [ ] 已配置腾讯云 API 访问凭证（SecretId/SecretKey）
- [ ] VPC 和子网已创建
- [ ] 安全组已配置

### 可选条件
- [ ] 已创建 CAM 角色（自定义节点权限）
- [ ] 已准备自定义镜像（特殊环境需求）
- [ ] 已配置启动脚本（节点初始化脚本）

---

## 检查清单

在开始前，请确认：

1. **集群状态检查**
   ```bash
   # 使用 tccli 查询集群
   tccli tke DescribeClusters --ClusterIds '["cls-xxxxxxxx"]'
   ```
   期望结果：集群状态为 Running，版本 ≥ 1.12

2. **配额检查**
   - CVM 实例配额（控制台查看）
   - 弹性网卡配额（VPC 控制台）
   - 云硬盘配额（CBS 控制台）

3. **网络配置检查**
   ```bash
   # 查询 VPC 子网
   tccli vpc DescribeSubnets --Filters '[{"Name":"vpc-id","Values":["vpc-xxxxxxxx"]}]'
   ```
   期望结果：子网可用 IP 充足

4. **镜像和实例类型检查**
   ```bash
   # 查询可用实例类型
   tccli cvm DescribeInstanceTypeConfigs --Filters '[{"Name":"zone","Values":["ap-guangzhou-3"]}]'
   
   # 查询可用镜像
   tccli cvm DescribeImages --Filters '[{"Name":"image-type","Values":["PUBLIC_IMAGE"]}]'
   ```

---

## 操作步骤

### 方式 1: 使用 tccli（腾讯云 CLI）

#### Step 1: 准备配置文件

创建文件 `node-pool-config.json`:

```json
{
  "ClusterId": "cls-xxxxxxxx",
  "Name": "production-pool",
  "AutoScalingGroupPara": {
    "DesiredCapacity": 3,
    "MinSize": 1,
    "MaxSize": 10,
    "VpcId": "vpc-xxxxxxxx",
    "SubnetIds": ["subnet-xxxxxxxx"],
    "InstanceType": "S5.MEDIUM4",
    "SystemDisk": {
      "DiskType": "CLOUD_PREMIUM",
      "DiskSize": 100
    },
    "DataDisks": [
      {
        "DiskType": "CLOUD_PREMIUM",
        "DiskSize": 200
      }
    ],
    "InternetAccessible": {
      "InternetChargeType": "TRAFFIC_POSTPAID_BY_HOUR",
      "InternetMaxBandwidthOut": 10
    },
    "SecurityGroupIds": ["sg-xxxxxxxx"],
    "ProjectId": 0
  },
  "Labels": [
    {
      "Name": "env",
      "Value": "production"
    },
    {
      "Name": "node-pool",
      "Value": "production-pool"
    }
  ],
  "Taints": [],
  "EnableAutoscale": true,
  "OsName": "TencentOS Server 3.1 (TK4)",
  "NodePoolOs": "GENERAL"
}
```

#### Step 2: 创建节点池

```bash
tccli tke CreateClusterNodePool --cli-input-json file://node-pool-config.json
```

期望输出：
```json
{
  "NodePoolId": "np-xxxxxxxx",
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

---

### 方式 2: 使用 Python SDK

```python
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tke.v20180525 import tke_client, models

def create_node_pool(cluster_id, name, instance_type, desired_capacity=3):
    """创建 TKE 节点池"""
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
    req = models.CreateClusterNodePoolRequest()
    params = {
        "ClusterId": cluster_id,
        "Name": name,
        "AutoScalingGroupPara": {
            "DesiredCapacity": desired_capacity,
            "MinSize": 1,
            "MaxSize": 10,
            "VpcId": "vpc-xxxxxxxx",
            "SubnetIds": ["subnet-xxxxxxxx"],
            "InstanceType": instance_type,
            "SystemDisk": {
                "DiskType": "CLOUD_PREMIUM",
                "DiskSize": 100
            },
            "DataDisks": [
                {
                    "DiskType": "CLOUD_PREMIUM",
                    "DiskSize": 200,
                    "FileSystem": "ext4",
                    "MountTarget": "/var/lib/docker"
                }
            ],
            "InternetAccessible": {
                "InternetChargeType": "TRAFFIC_POSTPAID_BY_HOUR",
                "InternetMaxBandwidthOut": 10,
                "PublicIpAssigned": True
            },
            "SecurityGroupIds": ["sg-xxxxxxxx"],
            "ProjectId": 0
        },
        "Labels": [
            {"Name": "env", "Value": "production"},
            {"Name": "node-pool", "Value": name}
        ],
        "Taints": [],
        "EnableAutoscale": True,
        "OsName": "TencentOS Server 3.1 (TK4)",
        "NodePoolOs": "GENERAL"
    }
    req.from_json_string(json.dumps(params))
    
    # 发送请求
    resp = client.CreateClusterNodePool(req)
    
    print(f"✅ Node pool created successfully")
    print(f"   Node Pool ID: {resp.NodePoolId}")
    print(f"   Name: {name}")
    print(f"   Desired Capacity: {desired_capacity}")
    
    return resp.NodePoolId

# 示例调用
node_pool_id = create_node_pool(
    cluster_id="cls-xxxxxxxx",
    name="production-pool",
    instance_type="S5.MEDIUM4",
    desired_capacity=3
)
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
    request := tke.NewCreateClusterNodePoolRequest()
    
    clusterId := "cls-xxxxxxxx"
    name := "production-pool"
    desiredCapacity := int64(3)
    minSize := int64(1)
    maxSize := int64(10)
    
    request.ClusterId = &clusterId
    request.Name = &name
    request.AutoScalingGroupPara = &tke.AutoScalingGroupPara{
        DesiredCapacity: &desiredCapacity,
        MinSize:         &minSize,
        MaxSize:         &maxSize,
        VpcId:           common.StringPtr("vpc-xxxxxxxx"),
        SubnetIds:       common.StringPtrs([]string{"subnet-xxxxxxxx"}),
        InstanceType:    common.StringPtr("S5.MEDIUM4"),
        SystemDisk: &tke.SystemDisk{
            DiskType: common.StringPtr("CLOUD_PREMIUM"),
            DiskSize: common.Int64Ptr(100),
        },
        DataDisks: []*tke.DataDisk{
            {
                DiskType:    common.StringPtr("CLOUD_PREMIUM"),
                DiskSize:    common.Int64Ptr(200),
                FileSystem:  common.StringPtr("ext4"),
                MountTarget: common.StringPtr("/var/lib/docker"),
            },
        },
        InternetAccessible: &tke.InternetAccessible{
            InternetChargeType:      common.StringPtr("TRAFFIC_POSTPAID_BY_HOUR"),
            InternetMaxBandwidthOut: common.Int64Ptr(10),
            PublicIpAssigned:        common.BoolPtr(true),
        },
        SecurityGroupIds: common.StringPtrs([]string{"sg-xxxxxxxx"}),
        ProjectId:        common.Int64Ptr(0),
    }
    request.Labels = []*tke.Label{
        {Name: common.StringPtr("env"), Value: common.StringPtr("production")},
        {Name: common.StringPtr("node-pool"), Value: common.StringPtr(name)},
    }
    request.EnableAutoscale = common.BoolPtr(true)
    request.OsName = common.StringPtr("TencentOS Server 3.1 (TK4)")
    
    // 发送请求
    response, err := client.CreateClusterNodePool(request)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("✅ Node pool created successfully\n")
    fmt.Printf("   Node Pool ID: %s\n", *response.Response.NodePoolId)
}
```

---

## 高级配置

### 1. GPU 节点池

```json
{
  "AutoScalingGroupPara": {
    "InstanceType": "GT4.8XLARGE128",
    "InstanceAdvancedSettings": {
      "GPUArgs": {
        "MIGEnable": false
      }
    }
  },
  "Labels": [
    {"Name": "node.kubernetes.io/instance-type", "Value": "gpu"}
  ],
  "Taints": [
    {
      "Key": "nvidia.com/gpu",
      "Value": "true",
      "Effect": "NoSchedule"
    }
  ]
}
```

### 2. 配置污点（Taints）

```json
{
  "Taints": [
    {
      "Key": "node-role",
      "Value": "database",
      "Effect": "NoSchedule"
    }
  ]
}
```

**污点效果说明**：
- `NoSchedule`: 不调度新 Pod 到该节点（已有 Pod 不受影响）
- `PreferNoSchedule`: 尽量不调度（软限制）
- `NoExecute`: 不调度新 Pod，且驱逐已有 Pod（除非有容忍度）

### 3. 配置自定义启动脚本

```json
{
  "AutoScalingGroupPara": {
    "UserScript": "#!/bin/bash\necho 'vm.max_map_count=262144' >> /etc/sysctl.conf\nsysctl -p"
  }
}
```

### 4. 配置节点安全加固

```json
{
  "AutoScalingGroupPara": {
    "InstanceAdvancedSettings": {
      "Unschedulable": 0,
      "MountTarget": "/var/lib/docker",
      "DockerGraphPath": "/var/lib/docker"
    }
  }
}
```

### 5. 配置节点命名规则

```json
{
  "AutoScalingGroupPara": {
    "HostNameSettings": {
      "HostNameStyle": "UNIQUE",
      "HostNamePattern": "tke-node-{zone}-{serial}"
    }
  }
}
```

---

## 验证步骤

### 1. 查询节点池状态

```bash
tccli tke DescribeClusterNodePools --ClusterId cls-xxxxxxxx
```

期望输出：
```json
{
  "NodePools": [
    {
      "NodePoolId": "np-xxxxxxxx",
      "Name": "production-pool",
      "LifeState": "normal",
      "DesiredNodesNum": 3,
      "NodeCountSummary": {
        "ManuallyAdded": 0,
        "AutoscalingAdded": 3,
        "Total": 3
      }
    }
  ]
}
```

**状态说明**：
- `creating`: 创建中
- `normal`: 正常运行
- `updating`: 更新中
- `deleting`: 删除中
- `deleted`: 已删除

### 2. 查询节点池详情

```bash
tccli tke DescribeClusterNodePoolDetail \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx
```

### 3. 查询节点池中的节点

```bash
# 使用 kubectl 查询
kubectl get nodes -l node-pool=production-pool

# 使用 API 查询
tccli tke DescribeClusterInstances \
  --ClusterId cls-xxxxxxxx \
  --Filters '[{"Name":"nodepool-id","Values":["np-xxxxxxxx"]}]'
```

期望结果：看到节点池中的所有节点且状态为 Ready

### 4. 验证自动扩缩容（如果启用）

```bash
# 创建测试 Deployment（触发扩容）
kubectl create deployment test-autoscale --image=nginx --replicas=50

# 观察节点池扩容
kubectl get nodes -w
```

---

## 异常处理

### 常见错误

| 错误码 | 错误信息 | 可能原因 | 解决方案 |
|-------|---------|---------|---------|
| `InvalidParameterValue` | 参数值无效 | 实例类型不支持或配置错误 | 检查参数格式和取值范围 |
| `InsufficientBalance` | 账户余额不足 | 账户欠费 | 充值后重试 |
| `QuotaLimitExceeded` | 配额不足 | CVM 实例配额已满 | 申请提升配额 |
| `VpcNotFound` | VPC 不存在 | VPC ID 错误 | 检查 VPC 配置 |
| `SubnetNotFound` | 子网不存在 | 子网 ID 错误 | 检查子网配置 |
| `InvalidClusterState` | 集群状态异常 | 集群不在 Running 状态 | 等待集群就绪 |

### 故障排查步骤

#### 1. 查看节点池事件

```bash
tccli tke DescribeClusterNodePoolDetail \
  --ClusterId cls-xxxxxxxx \
  --NodePoolId np-xxxxxxxx
```

查看 `LifeState` 和 `Message` 字段。

#### 2. 查看节点状态

```bash
kubectl describe node <node-name>
```

查看节点事件和状态。

#### 3. 查看 CVM 实例状态

```bash
tccli cvm DescribeInstances \
  --Filters '[{"Name":"tag:tke-clusterId","Values":["cls-xxxxxxxx"]}]'
```

#### 4. 检查安全组配置

```bash
tccli vpc DescribeSecurityGroups --SecurityGroupIds '["sg-xxxxxxxx"]'
```

确认安全组规则是否允许集群网络访问。

---

## 最佳实践

### 1. 节点池命名规范

```
<环境>-<用途>-pool
例如：
- production-web-pool
- staging-database-pool
- dev-gpu-pool
```

### 2. 标签规范

推荐标签：
```json
{
  "Labels": [
    {"Name": "env", "Value": "production"},
    {"Name": "node-pool", "Value": "production-web-pool"},
    {"Name": "tier", "Value": "web"},
    {"Name": "managed-by", "Value": "terraform"}
  ]
}
```

### 3. 节点池配额设置

```json
{
  "AutoScalingGroupPara": {
    "DesiredCapacity": 5,   // 期望节点数
    "MinSize": 3,           // 最小节点数（保证高可用）
    "MaxSize": 20           // 最大节点数（控制成本）
  }
}
```

### 4. 磁盘配置

```json
{
  "SystemDisk": {
    "DiskType": "CLOUD_PREMIUM",  // 高性能云硬盘
    "DiskSize": 100               // 系统盘 100GB
  },
  "DataDisks": [
    {
      "DiskType": "CLOUD_SSD",    // 数据盘使用 SSD
      "DiskSize": 500,
      "FileSystem": "ext4",
      "MountTarget": "/var/lib/docker"
    }
  ]
}
```

### 5. 自动扩缩容策略

- 业务波动大：启用自动扩缩容
- 业务稳定：固定节点数
- 成本敏感：使用竞价实例（Spot）

---

## Agent Prompt 模板

### Prompt 1: 基础节点池

```prompt
请在 TKE 集群中创建一个节点池：
- 集群 ID: {{cluster_id}}
- 节点池名称: {{pool_name}}
- 实例类型: {{instance_type}}
- 期望节点数: {{desired_capacity}}
- 最小节点数: {{min_size}}
- 最大节点数: {{max_size}}
- VPC: {{vpc_id}}
- 子网: {{subnet_id}}
- 安全组: {{security_group_id}}
```

### Prompt 2: GPU 节点池

```prompt
请在 TKE 集群中创建一个 GPU 节点池：
- 集群 ID: {{cluster_id}}
- 节点池名称: gpu-pool
- GPU 实例类型: GT4.8XLARGE128
- 期望节点数: 2
- 配置 GPU 污点（nvidia.com/gpu=true:NoSchedule）
- 配置标签：node.kubernetes.io/instance-type=gpu
- 启用自动扩缩容（1-5 节点）
```

### Prompt 3: 生产环境节点池

```prompt
请在 TKE 集群中创建一个生产环境节点池：
- 集群 ID: {{cluster_id}}
- 节点池名称: production-web-pool
- 实例类型: S5.2XLARGE16
- 期望节点数: 5
- 最小节点数: 3（保证高可用）
- 最大节点数: 20（控制成本）
- 系统盘: 高性能云硬盘 100GB
- 数据盘: SSD 云硬盘 500GB（挂载到 /var/lib/docker）
- 标签:
  - env=production
  - tier=web
  - node-pool=production-web-pool
- 启用自动扩缩容
- 操作系统: TencentOS Server 3.1
```

---

## 相关文档

- [扩容节点池](./02-scale-node-pool.md)
- [查询节点列表](../node/04-describe-nodes.md)
- [添加节点](../node/01-add-node.md)
- [创建集群](../cluster/01-create-cluster.md)

---

## Cookbook 示例

完整可执行示例：[create-node-pool-example.py](../../cookbook/create-node-pool-example.py)

---

**文档版本**: v1.0  
**最后更新**: 2025-12-25  
**适用 TKE 版本**: ≥ 1.12
