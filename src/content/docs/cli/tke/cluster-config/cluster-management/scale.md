---
title: "集群扩缩容"
description: "· page_id `32190` · tccli ≥3.1.107 · API 2018-05-25"
---

> 对照官方：[集群扩缩容](https://cloud.tencent.com/document/product/457/32190) · page_id `32190` · tccli ≥3.1.107 · API 2018-05-25

## 概述

TKE 集群扩缩容的方式取决于集群类型。**托管集群**（`MANAGED_CLUSTER`）的 Master 由腾讯云自动维护和扩缩容，用户通过**节点池**（NodePool）管理 Worker 节点的扩缩容。**独立集群**（`INDEPENDENT_CLUSTER`）支持 Master 节点的手动扩缩容。

| 集群类型 | 扩缩容方式 | 对应 API |
|---------|-----------|---------|
| 托管集群（`MANAGED_CLUSTER`） | 节点池扩缩容：调整期望节点数、弹性伸缩范围 | `CreateClusterNodePool`、`ModifyNodePoolDesiredCapacityAboutAsg`、`ModifyClusterNodePool` |
| 独立集群（`INDEPENDENT_CLUSTER`） | Master 节点扩缩容 + 节点池扩缩容 | `ScaleOutClusterMaster`、`ScaleInClusterMaster` |

节点池扩缩容有两种方式：
1. **手动调整期望节点数**：`ModifyNodePoolDesiredCapacityAboutAsg`，直接设置关联 AS 组的期望实例数，立即触发扩缩容
2. **调整弹性伸缩范围**：`ModifyClusterNodePool`，修改最大/最小节点数及是否开启自动伸缩，集群根据资源使用率自动扩缩容

## 前置条件

- [环境准备](../../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0
```

**预期输出**：

```
tccli version 3.1.107.1
```

```bash
# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId、secretKey、region 均已配置，region 为目标地域
```

**预期输出**：

```
secretId  = AKID********************************
secretKey = ********************************
region    = ap-guangzhou
output    = json
```

```bash
# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tke:DescribeClusters, tke:DescribeClusterNodePools
#    tke:CreateClusterNodePool, tke:ModifyNodePoolDesiredCapacityAboutAsg
#    tke:ModifyClusterNodePool, tke:DeleteClusterNodePool
#    tke:ScaleOutClusterMaster, tke:ScaleInClusterMaster（独立集群）
# 验证：执行 DescribeClusters 确认权限
tccli tke DescribeClusters --region <Region>
# expected: exit 0，返回集群列表（可为空）
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Clusters": [
        {
            "ClusterId": "cls-example",
            "ClusterName": "example-cluster",
            "ClusterType": "MANAGED_CLUSTER",
            "ClusterStatus": "Running",
            "ClusterVersion": "1.30.0"
        }
    ]
}
```

```bash
# 验证节点池权限
tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>
# expected: exit 0，返回节点池列表（可为空）
```

**预期输出**：

```json
{
    "TotalCount": 0,
    "NodePoolSet": []
}
```

### 资源检查

```bash
# 4. 确认集群存在并查看集群类型
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: 返回目标集群信息，确认 ClusterType 字段
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Clusters": [
        {
            "ClusterId": "cls-example",
            "ClusterName": "example-cluster",
            "ClusterType": "MANAGED_CLUSTER",
            "ClusterStatus": "Running",
            "ClusterVersion": "1.30.0"
        }
    ]
}
```

集群存在且状态为 `Running`。确认 `ClusterType`：
- `MANAGED_CLUSTER` → 使用节点池扩缩容（参考本页操作步骤）
- `INDEPENDENT_CLUSTER` → 可使用 `ScaleOutClusterMaster` / `ScaleInClusterMaster`

## 控制台与 CLI 参数映射

以下说明 `CreateClusterNodePool` 的主要参数。完整参数定义见 `tccli tke CreateClusterNodePool --help --detail`。

| 字段 | 类型 | 必填 | 幂等 | 取值与约束 | 错误后果 |
|------|------|:--:|:--:|------|------|
| `ClusterId` | String | 是 | 否 | 目标集群 ID，格式 `cls-xxxxxxxx`。目标集群必须为托管集群 | 集群不存在或类型不匹配 → `InvalidParameter.ClusterId` |
| `Name` | String | 否 | 否 | 节点池名称，自定义。不填由系统自动生成 | — |
| `AutoScalingGroupPara` | String | 是 | 否 | AS 创建弹性伸缩组的参数字符串（JSON）。**不可设置 `AutoScalingGroupName`**（系统自动生成）。必须含 `MaxSize`、`MinSize`、`DesiredCapacity`、`VpcId`、`SubnetIds` | 设置了 `AutoScalingGroupName` → `InvalidParameter.Param: autoscaling group name can not be set` |
| `LaunchConfigurePara` | String | 是 | 否 | AS 创建启动配置的参数字符串（JSON）。**不可设置 `ImageId` 和 `LaunchConfigurationName`**（由 `NodePoolOs` 决定）。必须含 `SecurityGroupIds`、`InstanceType`、`SystemDisk`、`LoginSettings` | 设置了 `ImageId` → `InvalidParameter.Param: image id can not be set`；缺失 `SecurityGroupIds` → `InvalidParameter.Param: security group ids is not set` |
| `EnableAutoscale` | Boolean | 否 | 否 | 是否开启自动伸缩。`true` 开启，`false` 关闭。默认 `false` | 忘了开启 → 集群不会根据负载自动扩缩容 |
| `ContainerRuntime` | String | 否 | 否 | 容器运行时。托管集群固定为 `containerd` | 填 `docker` → 托管集群不支持 docker 运行时 |
| `RuntimeVersion` | String | 否 | 否 | 容器运行时版本。**建议不传**，由 API 根据 K8s 版本自动选择匹配版本 | 版本与 K8s 不匹配 → `FailedOperation.PolicyServerRuntimeNotMatchK8sVersionError` |
| `NodePoolOs` | String | 否 | 否 | 节点操作系统。如 `tlinux3.1x86_64`、`ubuntu20.04x86_64` | — |
| `DeletionProtection` | Boolean | 否 | 是 | 节点池删除保护。测试环境建议 `false`，生产环境建议 `true` | 忘开删除保护 → 可能误删生产节点池 |
| `InstanceAdvancedSettings` | Object | 是 | 否 | 节点高级设置。`DesiredPodNumber` 节点上期望的 Pod 数量，`Unschedulable` 是否设置为不可调度 | 参数格式不正确 → `InvalidParameter.Param` |

### 其他操作的 CLI 映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看集群列表/类型 | `DescribeClusters` | 是 |
| 查看节点池列表 | `DescribeClusterNodePools` | 是 |
| 调整期望节点数 | `ModifyNodePoolDesiredCapacityAboutAsg` | 否 |
| 调整弹性伸缩范围 | `ModifyClusterNodePool` | 否 |
| 删除节点池 | `DeleteClusterNodePool` | 是 |
| 独立集群 Master 扩容 | `ScaleOutClusterMaster` | 否 |
| 独立集群 Master 缩容 | `ScaleInClusterMaster` | 否 |

## 操作步骤

### 步骤 1：确认集群类型

#### 选择依据

- **集群类型**：通过 `DescribeClusters` 确认当前集群类型。托管集群（`MANAGED_CLUSTER`）的 Master 由腾讯云自动维护、扩缩容、升级，用户无需也禁止操作 Master 节点。扩缩容通过节点池完成。独立集群（`INDEPENDENT_CLUSTER`）方可使用 `ScaleOutClusterMaster` / `ScaleInClusterMaster` 操作 Master 节点。
- **常见错误**：误认为所有集群都支持 `ScaleOutClusterMaster`。该 API 仅适用于独立集群，托管集群使用时会报 `InvalidParameter: only independent cluster allowed to scale master or etcd`。

```bash
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: exit 0，返回 ClusterType 字段
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Clusters": [
        {
            "ClusterId": "cls-example",
            "ClusterName": "example-cluster",
            "ClusterType": "MANAGED_CLUSTER",
            "ClusterStatus": "Running",
            "ClusterVersion": "1.30.0"
        }
    ]
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<ClusterId>` | 集群 ID | 格式 `cls-xxxxxxxx` | `tccli tke DescribeClusters` |
| `<Region>` | 地域 | 如 `ap-guangzhou` | `tccli tke DescribeRegions` |

- 如 `ClusterType` 为 `MANAGED_CLUSTER` → 继续本节后续步骤，通过节点池扩缩容
- 如 `ClusterType` 为 `INDEPENDENT_CLUSTER` → 跳至 [补充：独立集群 Master 扩缩容](#补充独立集群-master-扩缩容)

### 步骤 2：创建节点池（托管集群扩缩容基础）

#### 选择依据

- **节点池**：托管集群的扩缩容通过节点池（NodePool）管理，而非 Master 扩缩容。节点池关联一个弹性伸缩（AS）组，通过修改期望实例数来控制节点数量。
- **参数简化策略**：`CreateClusterNodePool` 参数众多，关键原则：
  - `AutoScalingGroupPara` 中不设 `AutoScalingGroupName`（系统自动生成）
  - `LaunchConfigurePara` 中不设 `ImageId` / `LaunchConfigurationName`（由 `NodePoolOs` 决定镜像）
  - 必须提供 `SecurityGroupIds`
  - 不传 `RuntimeVersion`，让 API 自动匹配 K8s 版本
- **查询现有节点池**：先确认当前节点池状态，避免重复创建。

```bash
tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>
# expected: exit 0，返回现有节点池列表
```

**预期输出**：

```json
{
    "TotalCount": 0,
    "NodePoolSet": []
}
```

#### 最小创建（只含必填字段）

`create-nodepool-minimal.json`：

```json
{
    "ClusterId": "<ClusterId>",
    "EnableAutoscale": true,
    "AutoScalingGroupPara": "{\"MaxSize\":3,\"MinSize\":0,\"DesiredCapacity\":1,\"VpcId\":\"<VpcId>\",\"SubnetIds\":[\"<SubnetId>\"],\"MultiZoneSubnetPolicy\":\"PRIORITY\",\"RetryPolicy\":\"IMMEDIATE_RETRY\",\"ServiceSettings\":{\"ScalingMode\":\"CLASSIC_SCALING\"}}",
    "LaunchConfigurePara": "{\"InstanceType\":\"S5.MEDIUM2\",\"SystemDisk\":{\"DiskType\":\"CLOUD_PREMIUM\",\"DiskSize\":50},\"InternetAccessible\":{\"InternetChargeType\":\"TRAFFIC_POSTPAID_BY_HOUR\",\"InternetMaxBandwidthOut\":0,\"PublicIpAssigned\":false},\"LoginSettings\":{\"Password\":\"<Password>\"},\"EnhancedService\":{\"SecurityService\":{\"Enabled\":true},\"MonitorService\":{\"Enabled\":true}},\"InstanceChargeType\":\"POSTPAID_BY_HOUR\",\"SecurityGroupIds\":[\"<SecurityGroupId>\"]}",
    "InstanceAdvancedSettings": {
        "DesiredPodNumber": 0,
        "Unschedulable": 0
    }
}
```

```bash
tccli tke CreateClusterNodePool --cli-input-json file://create-nodepool-minimal.json --region <Region>
# expected: exit 0，返回 NodePoolId
```

**预期输出**：

```json
{
    "NodePoolId": "np-example",
    "RequestId": "dabf5405-abba-4119-b380-53818a9fd50f"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<ClusterId>` | 集群 ID | 必须为托管集群 | `DescribeClusters` |
| `<VpcId>` | VPC ID | 集群所在 VPC | `DescribeClusters` → `ClusterNetworkSettings.VpcId` |
| `<SubnetId>` | 子网 ID | VPC 下的可用子网 | `tccli vpc DescribeSubnets` |
| `<SecurityGroupId>` | 安全组 ID | 必须提供 | `tccli vpc DescribeSecurityGroups` |
| `<Password>` | 节点登录密码 | 自定义 | — |
| `<Region>` | 地域 | 如 `ap-guangzhou` | `tccli tke DescribeRegions` |

#### 增强配置（加操作系统、容器运行时、删除保护）

`create-nodepool-enhanced.json`：

```json
{
    "ClusterId": "<ClusterId>",
    "Name": "scale-np",
    "EnableAutoscale": true,
    "ContainerRuntime": "containerd",
    "NodePoolOs": "tlinux3.1x86_64",
    "DeletionProtection": false,
    "AutoScalingGroupPara": "{\"MaxSize\":3,\"MinSize\":0,\"DesiredCapacity\":1,\"VpcId\":\"<VpcId>\",\"SubnetIds\":[\"<SubnetId>\"],\"MultiZoneSubnetPolicy\":\"PRIORITY\",\"RetryPolicy\":\"IMMEDIATE_RETRY\",\"ServiceSettings\":{\"ScalingMode\":\"CLASSIC_SCALING\"}}",
    "LaunchConfigurePara": "{\"InstanceType\":\"S5.MEDIUM2\",\"SystemDisk\":{\"DiskType\":\"CLOUD_PREMIUM\",\"DiskSize\":50},\"InternetAccessible\":{\"InternetChargeType\":\"TRAFFIC_POSTPAID_BY_HOUR\",\"InternetMaxBandwidthOut\":0,\"PublicIpAssigned\":false},\"LoginSettings\":{\"Password\":\"<Password>\"},\"EnhancedService\":{\"SecurityService\":{\"Enabled\":true},\"MonitorService\":{\"Enabled\":true}},\"InstanceChargeType\":\"POSTPAID_BY_HOUR\",\"SecurityGroupIds\":[\"<SecurityGroupId>\"]}",
    "InstanceAdvancedSettings": {
        "DesiredPodNumber": 0,
        "Unschedulable": 0
    }
}
```

节点池创建后，等待其就绪：

```bash
tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>
# expected: NodePoolSet 含新节点池，LifeState 为 "normal"
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "NodePoolSet": [
        {
            "NodePoolId": "np-example",
            "Name": "scale-np",
            "LifeState": "normal",
            "DesiredNodesNum": 1,
            "MaxNodesNum": 3,
            "MinNodesNum": 0
        }
    ]
}
```

### 步骤 3：扩容节点池（调整期望节点数）

#### 选择依据

- **扩容方式**：`ModifyNodePoolDesiredCapacityAboutAsg` 直接调整节点池关联 AS 组的期望实例数，立即触发节点创建。适合手动扩容场景。
- **期望节点数**：必须在当前 `MinNodesNum` 和 `MaxNodesNum` 范围内。修改 `DesiredCapacity` 后，AS 会自动创建/销毁 CVM 实例以达到期望数量。

#### 扩容命令（1 → 2）

```bash
tccli tke ModifyNodePoolDesiredCapacityAboutAsg \
    --ClusterId <ClusterId> \
    --NodePoolId <NodePoolId> \
    --DesiredCapacity 2 \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "5ebe51d8-3f57-44c3-86bd-c4290f917805"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<ClusterId>` | 集群 ID | — | `DescribeClusters` |
| `<NodePoolId>` | 节点池 ID | — | `DescribeClusterNodePools` |
| `<Region>` | 地域 | — | `tccli tke DescribeRegions` |

验证扩容生效：

```bash
tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>
# expected: DesiredNodesNum 为 2，LifeState 为 "normal"
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "NodePoolSet": [
        {
            "NodePoolId": "np-example",
            "Name": "scale-np",
            "LifeState": "normal",
            "DesiredNodesNum": 2,
            "MaxNodesNum": 3,
            "MinNodesNum": 0
        }
    ]
}
```

### 步骤 4：调整弹性伸缩范围

#### 选择依据

- **弹性伸缩范围**：`ModifyClusterNodePool` 调整 `MaxNodesNum` 和 `MinNodesNum` 控制弹性伸缩的上限和下限。配合 `EnableAutoscale` 开启后，集群会基于资源使用率自动在范围内扩缩容。
- **与期望节点数的关系**：期望节点数必须在 [MinNodesNum, MaxNodesNum] 区间内。调整范围后，已运行的节点不受影响，但后续弹性伸缩行为受新范围约束。

```bash
tccli tke ModifyClusterNodePool \
    --ClusterId <ClusterId> \
    --NodePoolId <NodePoolId> \
    --MaxNodesNum 5 \
    --MinNodesNum 1 \
    --EnableAutoscale true \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "ad2d0204-fc6c-498f-a6df-7acd153f222c"
}
```

验证范围修改生效：

```bash
tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>
# expected: MaxNodesNum 为 5，MinNodesNum 为 1
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "NodePoolSet": [
        {
            "NodePoolId": "np-example",
            "Name": "scale-np",
            "LifeState": "normal",
            "DesiredNodesNum": 2,
            "MaxNodesNum": 5,
            "MinNodesNum": 1
        }
    ]
}
```

### 步骤 5：缩容节点池（调低期望节点数）

```bash
tccli tke ModifyNodePoolDesiredCapacityAboutAsg \
    --ClusterId <ClusterId> \
    --NodePoolId <NodePoolId> \
    --DesiredCapacity 1 \
    --region <Region>
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "297b1b96-eb39-4f85-984b-9a2330abb0bc"
}
```

验证缩容生效：

```bash
tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>
# expected: DesiredNodesNum 为 1
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "NodePoolSet": [
        {
            "NodePoolId": "np-example",
            "Name": "scale-np",
            "LifeState": "normal",
            "DesiredNodesNum": 1,
            "MaxNodesNum": 5,
            "MinNodesNum": 1
        }
    ]
}
```

### 补充：独立集群 Master 扩缩容

> **适用条件**：仅 `ClusterType: "INDEPENDENT_CLUSTER"` 时有效。托管集群使用会返回 `InvalidParameter: only independent cluster allowed to scale master or etcd`。

#### Master 扩容

`scaleout-master.json`：

```json
{
    "ClusterId": "<ClusterId>",
    "RunInstancesForNode": [
        {
            "NodeRole": "MASTER_ETCD",
            "RunInstancesPara": ["<CvmConfigJSONString>"]
        }
    ]
}
```

```bash
tccli tke ScaleOutClusterMaster --cli-input-json file://scaleout-master.json --region <Region>
# expected: exit 0（仅独立集群）
```

#### Master 缩容

> **注意**：`ScaleInClusterMaster` 为内测功能，需联系腾讯云开通白名单后方可使用。

> **⚠️ 副作用警告**：`InstanceDeleteMode: "terminate"` 会**彻底销毁**指定 Master 实例及其关联磁盘，数据不可恢复。执行前务必确认：
> - 集群中至少保留一个健康 Master 节点（缩容后 Master 数量不得低于 etcd 法定人数）
> - `InstanceId` 准确无误，避免误删
> - 建议先在测试集群验证

```bash
tccli tke ScaleInClusterMaster \
    --ClusterId <ClusterId> \
    --ScaleInMasters '[{"InstanceId":"<InstanceId>","NodeRole":"MASTER_ETCD","InstanceDeleteMode":"terminate"}]' \
    --region <Region>
# expected: exit 0（仅独立集群 + 白名单）
```

## 验证

### 状态维度

节点池创建或调整后，从以下维度验证：

| 维度 | 命令 | 预期 |
|------|------|------|
| 节点池状态 | `tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>` | `LifeState: "normal"` |
| 期望节点数 | 同上，检查 `DesiredNodesNum` | 与设置的 `DesiredCapacity` 一致 |
| 弹性伸缩范围 | 同上，检查 `MaxNodesNum`、`MinNodesNum` | 与修改后的值一致 |
| 自动伸缩开关 | 同上，检查 `EnableAutoscale` | 与设置值一致 |
| 实际节点数 | `tccli tke DescribeClusterInstances --ClusterId <ClusterId> --region <Region>` | 节点实例数 ≥ `DesiredNodesNum` |

> 节点创建为异步操作，从期望节点数修改到实际节点 Running 需 3-5 分钟。超时参见 [排障](#排障)。

### 节点实例状态验证

```bash
tccli tke DescribeClusterInstances --ClusterId <ClusterId> --region <Region>
# expected: 返回节点实例列表，InstanceState 为 "running"
```

**预期输出**：

```json
{
    "TotalCount": 2,
    "InstanceSet": [
        {
            "InstanceId": "ins-example01",
            "InstanceRole": "WORKER",
            "InstanceState": "running",
            "InstanceType": "S5.MEDIUM2",
            "LanIP": "10.0.0.1",
            "NodePoolId": "np-example"
        },
        {
            "InstanceId": "ins-example02",
            "InstanceRole": "WORKER",
            "InstanceState": "running",
            "InstanceType": "S5.MEDIUM2",
            "LanIP": "10.0.0.2",
            "NodePoolId": "np-example"
        }
    ]
}
```

### 集群访问验证（kubectl）

> **kubectl 连通性要求**：以下 kubectl 命令需在集群端点可达的环境下执行（公网端点或 IOA/VPN/专线）。

```bash
# 获取 kubeconfig（公网端点）
tccli tke DescribeClusterKubeconfig --ClusterId <ClusterId> --IsExtranet true --region <Region>
# expected: 返回 base64 编码的 kubeconfig
```

将输出中的 `Kubeconfig` 字段内容保存为 `~/.kube/config`（或通过 `KUBECONFIG` 环境变量指定），然后验证集群连通性：

```bash
# 验证集群连通性
kubectl cluster-info
# expected: Kubernetes control plane is running at https://...
```

**预期输出**：

```
Kubernetes control plane is running at https://<ClusterEndpoint>
CoreDNS is running at https://<ClusterEndpoint>/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

```bash
# 验证新节点已注册并可调度 Pod
kubectl get nodes
# expected: 新节点状态为 Ready
```

**预期输出**：

```
NAME            STATUS   ROLES    AGE   VERSION
10.0.0.1        Ready    <none>   5m    v1.32.2
10.0.0.2        Ready    <none>   1m    v1.32.2
```

```bash
# 部署测试 Pod 验证可调度性
kubectl run test-schedule --image=busybox --restart=Never -- sleep 30
# expected: pod/test-schedule created
```

**预期输出**：

```
pod/test-schedule created
```

```bash
kubectl get pod test-schedule -o wide
# expected: Pod 状态 Running，NODE 列为新扩容节点
```

**预期输出**：

```
NAME             READY   STATUS    RESTARTS   AGE   IP          NODE       NOMINATED NODE   READINESS GATES
test-schedule    1/1     Running   0          5s    10.0.0.4   10.0.0.2   <none>           <none>
```

```bash
kubectl delete pod test-schedule
# expected: pod "test-schedule" deleted
```

## 清理

> **⚠️ 警告**：`DeleteClusterNodePool` 使用 `--KeepInstance false` 会**级联删除**节点池中所有 CVM 实例和关联磁盘。
> 生产环境执行前务必确认节点池名称和 ID，建议先 `DescribeClusterNodePools` 检查。
> 删除节点池前确认无关键 Pod 运行在该节点池上（`kubectl get pods -o wide`）。

### 1. 清理前状态检查

```bash
tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>
# 确认是待删除的目标节点池，记录 NodePoolId、Name、DesiredNodesNum
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "NodePoolSet": [
        {
            "NodePoolId": "np-example",
            "Name": "scale-np",
            "LifeState": "normal",
            "DesiredNodesNum": 1,
            "MaxNodesNum": 5,
            "MinNodesNum": 1,
            "EnableAutoscale": true
        }
    ]
}
```

### 2. 关闭节点池自动伸缩

> **⚠️ 重要**：删除节点池前，如已开启自动伸缩（`EnableAutoscale: true`），必须先关闭。否则自动伸缩可能在中途触发节点创建，导致删除失败或资源残留。

```bash
tccli tke ModifyClusterNodePool --ClusterId <ClusterId> \
    --NodePoolId <NodePoolId> \
    --EnableAutoscale false \
    --region <Region>
```

**预期输出**：

```json
{
    "RequestId": "84c2d256-33e3-44f7-81f6-adc5f949f1b9"
}
```

### 3. 关闭节点池删除保护（如启用）

```bash
tccli tke ModifyClusterNodePool --ClusterId <ClusterId> \
    --NodePoolId <NodePoolId> \
    --DeletionProtection false \
    --region <Region>
```

### 4. 删除节点池

```bash
tccli tke DeleteClusterNodePool \
    --ClusterId <ClusterId> \
    --NodePoolIds '["<NodePoolId>"]' \
    --KeepInstance false \
    --region <Region>
# ⚠️ --KeepInstance false 会删除节点池中所有 CVM 实例和磁盘
```

**预期输出**：

```json
{
    "RequestId": "312ae00e-1a62-40b4-89cf-a029b3cecd6e"
}
```

### 5. 验证已删除

```bash
tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>
# expected: 返回节点池 LifeState 为 "deleting"，后续为空列表
```

> 节点池删除为异步操作，`LifeState` 变为 `deleting` 后仍需等待实际资源销毁。最终 `DescribeClusterNodePools` 返回的 `NodePoolSet` 中不含该节点池即为删除完成。

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ScaleOutClusterMaster` 返回 `InvalidParameter`，消息 "only independent cluster allowed to scale master or etcd"，RequestId `301b8090-...` | `tccli tke DescribeClusters --ClusterIds '["<ClusterId>"]' --region <Region>` 查看 `ClusterType` | 当前集群为托管集群（`MANAGED_CLUSTER`），`ScaleOutClusterMaster` 仅支持独立集群（`INDEPENDENT_CLUSTER`） | 托管集群使用节点池扩缩容：`CreateClusterNodePool` → `ModifyNodePoolDesiredCapacityAboutAsg`。如需 Master 扩缩容，先创建独立集群 |
| `ScaleInClusterMaster` 返回 `InvalidParameter`，消息 "only independent cluster allowed to scale master or etcd"，RequestId `cca096fa-...` | 同上 | 同 `ScaleOutClusterMaster`。且 `ScaleInClusterMaster` 为内测功能，需白名单 | 托管集群无需手动缩容 Master（腾讯云自动管理）。独立集群需先开通白名单 |
| `CreateClusterNodePool` 返回 `InvalidParameter.Param`，消息 "autoscaling group name can not be set" | 检查 `AutoScalingGroupPara` JSON | `AutoScalingGroupPara` 中设置了 `AutoScalingGroupName` 字段——该字段由系统自动生成，不可手动设置 | 从 `AutoScalingGroupPara` JSON 字符串中移除 `AutoScalingGroupName` 字段 |
| `CreateClusterNodePool` 返回 `InvalidParameter.Param`，消息 "image id can not be set" | 检查 `LaunchConfigurePara` JSON | `LaunchConfigurePara` 中设置了 `ImageId` 字段——操作系统镜像由 `NodePoolOs` 参数决定，不可在启动配置中指定 | 从 `LaunchConfigurePara` JSON 字符串中移除 `ImageId` 和 `LaunchConfigurationName` 字段 |
| `CreateClusterNodePool` 返回 `InvalidParameter.Param`，消息 "security group ids is not set" | 检查 `LaunchConfigurePara` JSON | `LaunchConfigurePara` 中缺少 `SecurityGroupIds` 字段——安全组为必填项 | 在 `LaunchConfigurePara` JSON 字符串中添加 `"SecurityGroupIds":["<SecurityGroupId>"]`。可通过 `tccli vpc DescribeSecurityGroups --region <Region>` 查询可用安全组 |
| `CreateClusterNodePool` 返回 `FailedOperation.PolicyServerRuntimeNotMatchK8sVersionError`，消息 "k8s version and runtime (type/version) not match" | 检查 `RuntimeVersion` 参数 | 指定的 `RuntimeVersion` 与集群 K8s 版本不兼容 | **删除 `RuntimeVersion` 参数**，让 API 自动选择与 K8s 版本匹配的容器运行时版本 |

### 创建已提交但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 返回 `NodePoolId` 但 `LifeState` 长时间非 `normal` | `tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>` 查看 `LifeState` | 节点池创建为异步操作，通常 3-5 分钟就绪。超时可能是 VPC/子网/安全组不可用 | 保留 `ClusterId`、`NodePoolId`、`RequestId`、创建 JSON → 登录 [TKE 控制台](https://console.cloud.tencent.com/tke2/cluster) 查看详细状态 → 仍无法解决则 [提交工单](https://console.cloud.tencent.com/workorder) |
| 扩容后实际节点数未达到期望节点数 | `tccli tke DescribeClusterInstances --ClusterId <ClusterId> --region <Region>` + `tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>` 对比 `DesiredNodesNum` 与实际节点数 | AS 创建 CVM 实例耗时、CVM 配额不足、可用区资源售罄（此为环境限制，非命令错误） | 等待 3-5 分钟；检查 CVM 配额：`tccli cvm DescribeAccountQuota --region <Region>`；尝试更换可用区 |
| 缩容后节点池 LifeState 为 `updating` 持续 | `DescribeClusterNodePools` 查看 `LifeState` | 节点正在被驱逐和销毁，期间 LifeState 为 `updating`，完成后恢复 `normal` | 等待更新完成（通常 1-3 分钟）。若超过 10 分钟仍为 `updating`，保留 `ClusterId`、`NodePoolId`、`RequestId` 并提交工单 |
| 删除节点池后仍在列表中 | `tccli tke DescribeClusterNodePools --ClusterId <ClusterId> --region <Region>` | 删除为异步操作，`LifeState: "deleting"` 后节点和 CVM 实例在后台逐步销毁 | 等待删除完成。若超过 10 分钟仍为 `deleting`，登录控制台查看状态或提交工单 |

## 下一步

- [创建集群](https://cloud.tencent.com/document/product/457/32191) — 如需创建新集群进行扩缩容操作
- [节点池管理](https://cloud.tencent.com/document/product/457/43719) — 节点池的完整生命周期管理
- [集群升级](https://cloud.tencent.com/document/product/457/32192) — 集群 K8s 版本升级
- [弹性伸缩](https://cloud.tencent.com/document/product/457/37383) — 基于 HPA/CA 的自动扩缩容策略
- [环境准备](../../../../index.md) — tccli 安装和凭据配置

## 控制台替代

[通过控制台进行集群扩缩容](https://console.cloud.tencent.com/tke2/cluster)
