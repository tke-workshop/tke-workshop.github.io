---
title: "创建节点池"
---

# 创建节点池

## 功能概述

在 TKE 集群中创建节点池。节点池是一组具有相同配置的节点集合，支持自动伸缩、统一管理和批量操作。通过节点池可以实现不同工作负载的资源隔离和弹性伸缩。

**核心特性**：
- 🎯 **统一配置**：节点池内所有节点使用相同的配置（机型、镜像、标签等）
- 📊 **自动伸缩**：支持根据负载自动扩缩容节点
- 🏷️ **标签管理**：自动为节点打标签，便于调度控制
- 🔧 **灵活配置**：支持自定义脚本、污点、标签
- 💰 **成本优化**：支持竞价实例、混合付费模式

**适用场景**：
- ✅ 不同工作负载需要不同类型的节点（计算密集型、内存密集型）
- ✅ 需要自动伸缩的工作负载
- ✅ 需要资源隔离的应用
- ✅ 需要成本优化的场景（竞价实例）

**相关文档**：
- [扩容节点池](./02-scale-out-nodepool.md)
- [创建集群](../cluster/01-create-cluster.md)

---

## 前置条件

在创建节点池前，请确认：

- [ ] **已创建 TKE 集群**
  - 集群状态为 `Running`
  - 集群版本 ≥ 1.10

- [ ] **已配置腾讯云 API 凭证**
  - SecretId 和 SecretKey
  - 或已配置 `~/.tccli/default.credential`

- [ ] **网络配置准备**
  - 确定节点池使用的 VPC 和子网
  - 子网 IP 地址充足

- [ ] **实例配置准备**
  - 确定实例规格（CPU/内存）
  - 确定系统盘和数据盘配置
  - 确定镜像 ID

- [ ] **权限确认**
  - 具有 TKE 集群管理权限
  - 具有 CVM 实例创建权限

---

## 检查清单

在开始前，请确认：

### 1. 集群状态检查
```bash
# 使用 tccli 查询集群
tccli tke DescribeClusters \
  --ClusterIds '["cls-abc123"]'

# 确认集群状态为 Running
```

### 2. VPC 和子网检查
```bash
# 查询子网可用 IP 数量
tccli vpc DescribeSubnetEx \
  --SubnetId subnet-abc123

# 确认可用 IP 数量充足（≥ 节点数）
```

### 3. 实例规格检查
```bash
# 查询可用的实例规格
tccli cvm DescribeInstanceTypeConfigs \
  --Filters '[{"Name":"zone","Values":["ap-guangzhou-3"]}]'
```

---

## 操作步骤

### 方式 1：使用 tccli（腾讯云 CLI）

适用于命令行自动化场景。

#### Step 1: 准备节点池配置

创建配置文件 `nodepool-config.json`：

```json
{
  "ClusterId": "cls-abc123",
  "Name": "standard-nodepool",
  "AutoScalingGroupPara": {
    "DesiredCapacity": 3,
    "MinSize": 1,
    "MaxSize": 10,
    "VpcId": "vpc-xyz789",
    "SubnetIds": ["subnet-abc123"],
    "InstanceType": "S5.MEDIUM4",
    "InstanceChargeType": "POSTPAID_BY_HOUR",
    "SystemDisk": {
      "DiskType": "CLOUD_SSD",
      "DiskSize": 50
    },
    "DataDisks": [
      {
        "DiskType": "CLOUD_SSD",
        "DiskSize": 100
      }
    ],
    "InternetAccessible": {
      "InternetChargeType": "TRAFFIC_POSTPAID_BY_HOUR",
      "InternetMaxBandwidthOut": 10
    }
  },
  "Labels": [
    {"Name": "node-type", "Value": "standard"},
    {"Name": "env", "Value": "production"}
  ],
  "Taints": [],
  "NodePoolOs": "tlinux2.4(tkernel4)x86_64",
  "OsCustomizeType": "GENERAL"
}
```

#### Step 2: 创建节点池

```bash
# 创建节点池
tccli tke CreateNodePool \
  --cli-input-json file://nodepool-config.json

# 输出示例：
# {
#   "NodePoolId": "np-abc123",
#   "RequestId": "xxx-xxx-xxx"
# }
```

#### Step 3: 查询节点池状态

```bash
# 查询节点池详情
tccli tke DescribeNodePool \
  --ClusterId cls-abc123 \
  --NodePoolId np-abc123
```

---

### 方式 2：使用 Python SDK

适用于自动化和编程场景。

```python
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tke.v20180525 import tke_client, models
import json
import time

def create_nodepool(cluster_id, nodepool_name, vpc_id, subnet_ids, 
                    instance_type, desired_capacity=3, min_size=1, max_size=10):
    """
    创建节点池
    
    Args:
        cluster_id: 集群 ID
        nodepool_name: 节点池名称
        vpc_id: VPC ID
        subnet_ids: 子网 ID 列表
        instance_type: 实例规格
        desired_capacity: 期望节点数
        min_size: 最小节点数
        max_size: 最大节点数
    """
    print(f"正在创建节点池: {nodepool_name}")
    print(f"集群 ID: {cluster_id}")
    print(f"实例规格: {instance_type}")
    print(f"期望节点数: {desired_capacity}")
    
    # 初始化客户端
    cred = credential.EnvironmentVariableCredential()
    httpProfile = HttpProfile()
    httpProfile.endpoint = "tke.tencentcloudapi.com"
    
    clientProfile = ClientProfile()
    clientProfile.httpProfile = httpProfile
    
    client = tke_client.TkeClient(cred, "ap-guangzhou", clientProfile)
    
    # 构建请求
    request = models.CreateNodePoolRequest()
    request.ClusterId = cluster_id
    request.Name = nodepool_name
    
    # 配置自动伸缩组
    asg_para = {
        "DesiredCapacity": desired_capacity,
        "MinSize": min_size,
        "MaxSize": max_size,
        "VpcId": vpc_id,
        "SubnetIds": subnet_ids,
        "InstanceType": instance_type,
        "InstanceChargeType": "POSTPAID_BY_HOUR",
        "SystemDisk": {
            "DiskType": "CLOUD_SSD",
            "DiskSize": 50
        },
        "DataDisks": [
            {
                "DiskType": "CLOUD_SSD",
                "DiskSize": 100
            }
        ],
        "InternetAccessible": {
            "InternetChargeType": "TRAFFIC_POSTPAID_BY_HOUR",
            "InternetMaxBandwidthOut": 10
        }
    }
    request.AutoScalingGroupPara = json.dumps(asg_para)
    
    # 配置标签
    labels = [
        {"Name": "node-type", "Value": "standard"},
        {"Name": "env", "Value": "production"}
    ]
    request.Labels = [models.Label(**label) for label in labels]
    
    # 配置操作系统
    request.NodePoolOs = "tlinux2.4(tkernel4)x86_64"
    request.OsCustomizeType = "GENERAL"
    
    try:
        # 创建节点池
        resp = client.CreateNodePool(request)
        nodepool_id = resp.NodePoolId
        
        print(f"✅ 节点池创建成功")
        print(f"   节点池 ID: {nodepool_id}")
        print(f"   请求 ID: {resp.RequestId}")
        
        # 等待节点池就绪
        print("\n等待节点就绪...")
        wait_for_nodes_ready(client, cluster_id, nodepool_id, desired_capacity)
        
        return nodepool_id
    
    except Exception as e:
        print(f"❌ 创建失败: {e}")
        raise


def wait_for_nodes_ready(client, cluster_id, nodepool_id, expected_count, timeout=600):
    """
    等待节点池节点就绪
    
    Args:
        client: TKE 客户端
        cluster_id: 集群 ID
        nodepool_id: 节点池 ID
        expected_count: 期望节点数
        timeout: 超时时间（秒）
    """
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            # 查询节点池状态
            request = models.DescribeNodePoolRequest()
            request.ClusterId = cluster_id
            request.NodePoolIds = [nodepool_id]
            
            resp = client.DescribeNodePool(request)
            if resp.NodePools:
                nodepool = resp.NodePools[0]
                node_count = nodepool.NodeCountSummary.ManuallyAdded.Normal + \
                            nodepool.NodeCountSummary.AutoscalingAdded.Normal
                
                print(f"当前节点数: {node_count}/{expected_count}", end="\r")
                
                if node_count >= expected_count:
                    print(f"\n✅ 节点已就绪 ({node_count}/{expected_count})")
                    return True
            
            time.sleep(10)
        
        except Exception as e:
            print(f"\n查询状态失败: {e}")
            return False
    
    print(f"\n⚠️ 等待超时（{timeout}秒）")
    return False


# 使用示例
if __name__ == "__main__":
    create_nodepool(
        cluster_id="cls-abc123",
        nodepool_name="standard-nodepool",
        vpc_id="vpc-xyz789",
        subnet_ids=["subnet-abc123"],
        instance_type="S5.MEDIUM4",
        desired_capacity=3,
        min_size=1,
        max_size=10
    )
```

---

## 验证步骤

创建节点池后，通过以下步骤验证：

### 1. 验证节点池状态

```bash
# 查询节点池列表
tccli tke DescribeNodePools \
  --ClusterId cls-abc123

# 期望输出：
# {
#   "NodePools": [{
#     "NodePoolId": "np-abc123",
#     "Name": "standard-nodepool",
#     "LifeState": "normal",
#     "NodeCountSummary": {
#       "ManuallyAdded": {"Normal": 3}
#     }
#   }]
# }
```

### 2. 验证节点状态

```bash
# 使用 kubectl 查询节点
kubectl get nodes -l node-type=standard

# 期望输出：
# NAME          STATUS   ROLES    AGE   VERSION
# 10.0.1.10     Ready    <none>   5m    v1.24.4
# 10.0.1.11     Ready    <none>   5m    v1.24.4
# 10.0.1.12     Ready    <none>   5m    v1.24.4
```

### 3. 验证节点标签

```bash
# 查看节点标签
kubectl get nodes --show-labels | grep node-type=standard

# 验证标签是否正确
kubectl get node <node-name> -o jsonpath='{.metadata.labels}'
```

### 4. 验证自动伸缩配置（如果启用）

```bash
# 查询节点池详情
tccli tke DescribeNodePool \
  --ClusterId cls-abc123 \
  --NodePoolId np-abc123 \
  | jq '.NodePools[0].AutoscalingEnabled'

# 期望输出：true（如果启用了自动伸缩）
```

---

## 异常处理

| 错误码 | 错误信息 | 可能原因 | 解决方案 |
|--------|---------|---------|---------|
| `InvalidParameter` | 参数错误 | 配置参数不合法 | 1. 检查实例规格是否在该地域可用<br>2. 检查子网 ID 是否正确<br>3. 检查 VPC ID 是否匹配 |
| `InsufficientBalance` | 余额不足 | 账户余额不足 | 充值或使用其他付费方式 |
| `QuotaLimitExceeded` | 配额不足 | 节点数量或资源配额不足 | 1. 提工单申请配额<br>2. 删除不使用的节点池 |
| `InvalidInstanceType` | 实例规格不可用 | 该地域不支持该实例规格 | 1. 查询可用实例规格<br>2. 选择其他规格 |
| `InvalidSubnet` | 子网不可用 | 子网 IP 地址不足或不可用 | 1. 检查子网可用 IP 数量<br>2. 使用其他子网 |

### 常见错误排查

#### 错误 1: 节点创建失败

```bash
# 问题现象
# 节点池创建成功，但节点一直未创建

# 排查步骤
# 1. 查询节点池详情
tccli tke DescribeNodePool \
  --ClusterId cls-abc123 \
  --NodePoolId np-abc123

# 2. 查看节点池事件
# (需要在控制台查看)

# 常见原因
# - 子网 IP 不足
# - 实例规格在该可用区售罄
# - 安全组配置错误

# 解决方案
# 1. 修改节点池配置，使用其他子网或实例规格
tccli tke ModifyNodePool \
  --ClusterId cls-abc123 \
  --NodePoolId np-abc123 \
  --SubnetIds '["subnet-xyz456"]'
```

#### 错误 2: 节点无法加入集群

```bash
# 问题现象
# 节点创建成功，但未加入集群

# 排查步骤
# 1. 检查节点状态
kubectl get nodes

# 2. 登录节点检查 kubelet 日志
ssh ubuntu@<node-ip>
sudo journalctl -u kubelet -f

# 常见原因
# - 网络不通
# - 安全组未放通集群 API Server 端口
# - 节点初始化脚本执行失败

# 解决方案
# 1. 检查安全组配置
# 2. 检查 VPC 路由表
# 3. 重新创建节点池
```

---

## 高级配置

### 1. 启用自动伸缩

创建节点池时启用自动伸缩：

```json
{
  "ClusterId": "cls-abc123",
  "Name": "auto-scaling-nodepool",
  "EnableAutoscale": true,
  "AutoScalingGroupPara": {
    "MinSize": 1,
    "MaxSize": 20,
    "DesiredCapacity": 3,
    ...
  }
}
```

### 2. 配置污点（Taints）

为节点池添加污点，实现调度控制：

```json
{
  "Taints": [
    {
      "Key": "dedicated",
      "Value": "gpu",
      "Effect": "NoSchedule"
    }
  ]
}
```

### 3. 配置自定义脚本

在节点启动时执行自定义脚本：

```json
{
  "UserScript": "#!/bin/bash\necho 'vm.max_map_count=262144' >> /etc/sysctl.conf\nsysctl -p"
}
```

### 4. 使用竞价实例（降低成本）

```json
{
  "AutoScalingGroupPara": {
    "InstanceMarketOptions": {
      "MarketType": "spot",
      "SpotOptions": {
        "MaxPrice": "0.5",
        "SpotInstanceType": "one-time"
      }
    },
    ...
  }
}
```

### 5. 配置节点池操作系统

```json
{
  "NodePoolOs": "tlinux2.4(tkernel4)x86_64",
  "OsCustomizeType": "GENERAL"
}
```

**可用操作系统**：
- `ubuntu18.04.1x86_64` - Ubuntu 18.04
- `tlinux2.4(tkernel4)x86_64` - Tencent Linux 2.4（推荐）
- `centos7.6x86_64` - CentOS 7.6

---

## Agent Prompt 模板

### 基础创建

```
请帮我在 TKE 集群中创建一个节点池：
- 集群 ID: cls-abc123
- 节点池名称: standard-nodepool
- 实例规格: S5.MEDIUM4（2核4GB）
- 期望节点数: 3
- VPC: vpc-xyz789
- 子网: subnet-abc123
- 系统盘: 50GB SSD
- 数据盘: 100GB SSD
```

### 高级配置

```
请帮我创建一个支持自动伸缩的节点池：
- 集群 ID: cls-abc123
- 节点池名称: auto-scaling-pool
- 实例规格: S5.LARGE8（4核8GB）
- 最小节点数: 2
- 最大节点数: 20
- 期望节点数: 5
- 启用自动伸缩
- 添加标签: env=production, app=backend
- 添加污点: dedicated=backend:NoSchedule
```

### 批量创建

```
请帮我创建 3 个不同类型的节点池：
1. 计算密集型节点池（CPU 优化，C5.2XLARGE16）
2. 内存密集型节点池（内存优化，M5.2XLARGE32）
3. GPU 节点池（GPU 加速，GN10X.2XLARGE40）
所有节点池启用自动伸缩，最小 1 节点，最大 10 节点。
```

---

## 参考 Cookbook

完整可执行示例：[Cookbook - 创建节点池](../../cookbook/create-nodepool-example.py)

---

## 最佳实践

### 1. 节点池规划

✅ **推荐做法**：
- 按工作负载类型划分节点池（计算/内存/GPU）
- 生产环境至少 2 个节点池（一个固定，一个弹性）
- 使用有意义的命名（如 `compute-pool`, `memory-pool`）

❌ **不推荐做法**：
- 所有工作负载混用一个节点池
- 节点池命名随意（如 `pool1`, `pool2`）

### 2. 自动伸缩配置

✅ **推荐做法**：
- 设置合理的 `MinSize` 和 `MaxSize`
- `MinSize` ≥ 2（保证高可用）
- `MaxSize` 根据预算和业务需求设置
- 启用自动伸缩以应对突发流量

❌ **不推荐做法**：
- `MinSize` = 0（可能导致冷启动慢）
- `MaxSize` 设置过大（成本失控）

### 3. 实例规格选择

✅ **推荐做法**：
- 根据工作负载特性选择实例规格
- 计算密集型：CPU 优化型（C 系列）
- 内存密集型：内存优化型（M 系列）
- 通用型：标准型（S 系列）

❌ **不推荐做法**：
- 所有工作负载使用同一规格
- 选择过大或过小的规格

### 4. 标签和污点

✅ **推荐做法**：
- 为节点池添加标签，便于调度控制
- 使用污点隔离特殊工作负载（GPU、数据库）
- 标签命名规范（如 `node-type`, `env`, `app`）

❌ **不推荐做法**：
- 不使用标签和污点
- 标签命名混乱

### 5. 成本优化

✅ **推荐做法**：
- 非关键工作负载使用竞价实例
- 混合使用按量付费和包年包月
- 定期清理不使用的节点池

❌ **不推荐做法**：
- 全部使用按量付费
- 不清理闲置资源

---

## 相关命令速查

```bash
# 创建节点池
tccli tke CreateNodePool --cli-input-json file://nodepool-config.json

# 查询节点池列表
tccli tke DescribeNodePools --ClusterId <cluster-id>

# 查询节点池详情
tccli tke DescribeNodePool --ClusterId <cluster-id> --NodePoolId <nodepool-id>

# 修改节点池
tccli tke ModifyNodePool --ClusterId <cluster-id> --NodePoolId <nodepool-id> --Name <new-name>

# 删除节点池
tccli tke DeleteNodePool --ClusterId <cluster-id> --NodePoolIds '["<nodepool-id>"]'

# 查询节点（kubectl）
kubectl get nodes -l <label-selector>

# 查看节点详情
kubectl describe node <node-name>
```

---

## 文档信息

- **版本**: v1.0
- **最后更新**: 2025-12-25
- **适用 TKE 版本**: ≥ 1.10
- **API 版本**: 2018-05-25
- **文档质量**: L3（Agent 友好）
