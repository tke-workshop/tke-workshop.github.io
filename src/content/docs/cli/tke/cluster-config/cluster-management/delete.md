---
title: "删除集群"
description: "· page_id `44808` · tccli ≥3.1.107 · API 2018-05-25"
---

> 对照官方：[删除集群](https://cloud.tencent.com/document/product/457/44808) · page_id `44808` · tccli ≥3.1.107 · API 2018-05-25

## 概述

删除 TKE 集群是**不可逆的破坏性操作**。根据 `InstanceDeleteMode` 参数，可仅移除集群记录（`retain`）或级联销毁关联的 CVM 实例及磁盘（`terminate`）。删除前必须依序处理：关闭删除保护、删除集群端点（内网/外网）、删除伸缩组（如有）。

`InstanceDeleteMode` 决策速览：

| 模式 | 行为 | CVM 计费 | 适用场景 |
|------|------|:--:|------|
| `terminate` | **级联销毁**所有关联 CVM 实例及磁盘 | 停止计费 | 按量计费节点，确认不再需要 |
| `retain` | 仅移除集群记录，保留 CVM 实例及磁盘 | **继续计费** | 需保留 CVM 迁移至其他集群，或包年包月实例 |

删除流程（依赖倒序）：

1. 检查删除保护状态 → 如需则 `DisableClusterDeletionProtection`
2. 删除集群端点 → `DeleteClusterEndpoint`（内网 + 外网）
3. 删除伸缩组 → `DeleteClusterAsGroups`（如有）
4. 删除集群 → `DeleteCluster`
5. 验证 → `DescribeClusters`（返回 `ResourceNotFound` 或空列表）

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tke:DescribeClusters, tke:DeleteCluster, tke:DeleteClusterEndpoint
#    tke:DeleteClusterEndpointVip, tke:DeleteClusterAsGroups
#    tke:DisableClusterDeletionProtection, tke:DescribeClusterEndpoints
#    tke:DescribeClusterEndpointStatus
# 验证：
tccli tke DescribeClusters --region <Region>
# expected: exit 0，返回集群列表
```

### 资源检查

```bash
# 4. 确认目标集群存在并查看状态
tccli tke DescribeClusters --region <Region> \
    --ClusterIds '["<ClusterId>"]'
# expected: exit 0，ClusterStatus 为 Running
```

核对要点：`ClusterId` 和 `ClusterName` 双重确认这是目标集群；`DeletionProtection` 若 `true` 需先关闭；`ClusterNodeNum` 确认将级联删除的节点数量。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看集群详情 | `DescribeClusters` | 是 |
| 查看集群端点 | `DescribeClusterEndpoints` | 是 |
| 查看端点状态 | `DescribeClusterEndpointStatus` | 是 |
| 关闭删除保护 | `DisableClusterDeletionProtection` | 是 |
| 删除内网/外网端点 | `DeleteClusterEndpoint` | 是 |
| 删除外网端口（旧版） | `DeleteClusterEndpointVip` | 是 |
| 删除伸缩组 | `DeleteClusterAsGroups` | 是 |
| 删除集群 | `DeleteCluster` | 是 |

### DeleteCluster 关键字段说明

以下说明 `DeleteCluster` 的主要参数。完整参数定义见 `tccli tke DeleteCluster help --detail`。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `ClusterId` | String | 是 | 集群 ID，格式 `cls-xxxxxxxx`。`DescribeClusters` 获取 | 集群不存在 → `ResourceNotFound.ClusterNotFound` |
| `InstanceDeleteMode` | String | 是 | `terminate`（销毁实例，仅支持按量计费 CVM）或 `retain`（仅移除记录，保留实例）。**包年包月实例用 terminate → 删除失败** | 填非法值 → `InvalidParameter.InstanceDeleteMode` |
| `ResourceDeleteOptions` | Array of ResourceDeleteOption | 否 | 资源删除策略数组，支持 CBS/CLB/CVM | — |
| `ResourceDeleteOptions[].ResourceType` | String | 是（当使用此字段时） | `CBS`（云硬盘）、`CLB`（负载均衡）、`CVM`（云服务器） | 类型不存在 → `InvalidParameter.ResourceType` |
| `ResourceDeleteOptions[].DeleteMode` | String | 是（当使用此字段时） | `terminate`（销毁）或 `retain`（保留）。CBS 默认 retain，CLB/CVM 默认销毁 | CBS 误设 terminate → 数据不可恢复 |
| `ResourceDeleteOptions[].SkipDeletionProtection` | Boolean | 否 | 是否跳过开启删除保护的资源，默认 `false`。CLB 有终端节点视为开启删除保护 | CLB 有终端节点且未设 `true` → 删除阻塞 |

## 操作步骤

### 步骤 1：查看集群状态与删除保护

删除前确认集群当前状态和删除保护开关。若 `DeletionProtection` 为 `true`，需先执行步骤 6 关闭保护。

```bash
tccli tke DescribeClusters --ClusterIds '["<ClusterId>"]' --region <Region> --output json | jq '{ClusterStatus: .Clusters[0].ClusterStatus, ClusterName: .Clusters[0].ClusterName, ClusterType: .Clusters[0].ClusterType, ClusterVersion: .Clusters[0].ClusterVersion, VpcId: .Clusters[0].ClusterNetworkSettings.VpcId, DeletionProtection: .Clusters[0].DeletionProtection}'
# expected: exit 0，DeletionProtection 为 false
```

**预期输出**：

```json
{
  "ClusterStatus": "Running",
  "ClusterName": "cls-example",
  "ClusterType": "MANAGED_CLUSTER",
  "ClusterVersion": "1.30.0",
  "VpcId": "vpc-example",
  "DeletionProtection": false
}
```

> 本例中删除保护已关闭。若为 `true`，须在删除集群前执行 `DisableClusterDeletionProtection`——否则 API 返回 `OperationDenied.ClusterDeletionProtectionEnabled`。

### 步骤 2：查看集群端点状态

删除集群前须确认当前端点配置。存在内网或外网端点时，需先删除端点再删集群，否则 `DeleteCluster` 返回 `OperationDenied`。

```bash
tccli tke DescribeClusterEndpoints --ClusterId <ClusterId> --region <Region> --output json
# expected: exit 0，返回端点配置
```

**预期输出**：

```json
{
  "CertificationAuthority": "...",
  "ClusterExternalEndpoint": "",
  "ClusterIntranetEndpoint": "172.24.0.1",
  "ClusterDomain": "cls-example.ccs.tencent-cloud.com",
  "ClusterExternalACL": null,
  "ClusterExternalDomain": "cls-example.ccs.tencent-cloud.com",
  "SecurityGroup": "",
  "ClusterIntranetSubnetId": "subnet-example",
  "IntranetSecurityGroup": "sg-example",
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

> 当前集群存在内网端点 `172.24.0.1`，无外网端点。删除集群前须先删除此内网端点。

### 步骤 3：删除集群端点

#### 选择依据

- **为什么必须先删端点**：集群存在端点时，`DeleteCluster` 直接返回 `OperationDenied`。端点必须先于集群删除。
- **内网 vs 外网**：`IsExtranet=false` 删除内网端点，`IsExtranet=true` 删除外网端点。按需分别执行，二者无依赖关系。
- **替代方式**：`DeleteClusterEndpointVip` 为旧版 API，仅支持托管集群外网端口删除。新集群推荐使用 `DeleteClusterEndpoint`。

#### 删除内网端点（L2 真执行）

```bash
tccli tke DeleteClusterEndpoint --ClusterId <ClusterId> --IsExtranet false --region <Region> --output json
# expected: exit 0
```

**预期输出**：

```json
{
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

#### 删除外网端点（如有）

```bash
tccli tke DeleteClusterEndpoint --ClusterId <ClusterId> --IsExtranet true --region <Region> --output json
# expected: exit 0
```

### 步骤 4：删除端点 VIP（旧版方式，如有）

仅当集群使用旧版外网端口方式时执行。仅支持托管集群。

```bash
tccli tke DeleteClusterEndpointVip --ClusterId <ClusterId> --region <Region> --output json
# expected: exit 0
```

**预期输出**：

```json
{
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### 步骤 5：验证端点已删除（L2 闭环）

确认端点删除操作完成，状态为 `Deleted`。

```bash
tccli tke DescribeClusterEndpointStatus --ClusterId <ClusterId> --IsExtranet false --region <Region> --output json
# expected: exit 0，Status 为 Deleted
```

**预期输出**：

```json
{
  "Status": "Deleted",
  "ErrorMsg": "Deleted",
  "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

> L2 闭环验证通过：端点状态为 `Deleted`，删除操作已确认生效。

### 步骤 6：关闭删除保护（如步骤 1 检测到已启用）

若步骤 1 中 `DeletionProtection` 为 `true`，必须关闭删除保护后才能删除集群。

```bash
tccli tke DisableClusterDeletionProtection --ClusterId <ClusterId> --region <Region> --output json
# expected: exit 0
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<ClusterId>` | 集群 ID | 格式 `cls-xxxxxxxx` | `tccli tke DescribeClusters` |
| `<Region>` | 地域 | 如 `ap-guangzhou` | `tccli configure list` |

### 步骤 7：删除集群伸缩组（如有）

若集群绑定了弹性伸缩组（ASG），需先删除伸缩组再删集群。

```bash
tccli tke DeleteClusterAsGroups --ClusterId <ClusterId> \
    --AutoScalingGroupIds '["<AutoScalingGroupId>"]' \
    --region <Region> --output json
# expected: exit 0
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<ClusterId>` | 集群 ID | 格式 `cls-xxxxxxxx` | `tccli tke DescribeClusters` |
| `<AutoScalingGroupId>` | 伸缩组 ID | 格式 `asg-xxxxxxxx` | `tccli tke DescribeClusterAsGroups` |
| `<Region>` | 地域 | 如 `ap-guangzhou` | `tccli configure list` |

`KeepInstance` 可选参数：默认 `false`（不保留伸缩组中的 CVM 节点）。设为 `true` 时保留节点。

### 步骤 8：删除集群

#### 选择依据

*以下决策依据来自生产环境执行经验。*

- **集群类型**：本例为 `MANAGED_CLUSTER`（托管集群），控制面由腾讯云运维。独立集群（`INDEPENDENT_CLUSTER`）删除流程与托管集群一致，两种类型无差异。

- **`InstanceDeleteMode` 选择**：
  - `terminate`（销毁实例）：级联删除所有关联 CVM 实例及磁盘。**仅支持按量计费 CVM**，含包年包月实例时删除失败。操作不可逆。
  - `retain`（仅移除记录）：保留 CVM 实例，集群记录从 TKE 中移除。CVM 变成游离状态，需手动管理，否则**持续计费**。
  - **常见错误**：选 `terminate` 但节点含包年包月实例 → 删除失败；选 `retain` 后忘记手动清理残留 CVM → 持续计费。

- **`ResourceDeleteOptions`（CBS/CLB/CVM 删除策略）**：
  - `CBS`：云硬盘。**默认 retain（保留）**——即使 `InstanceDeleteMode=terminate`，CBS 也不会被自动删除，除非显式设置 `DeleteMode=terminate`。
  - `CLB`：负载均衡。默认销毁。如有终端节点视为开启删除保护，需设 `SkipDeletionProtection=true` 跳过。
  - `CVM`：云服务器。按 `InstanceDeleteMode` 处理。

- **删除顺序**：必须按 端点 → 伸缩组 → 集群 的顺序执行。端点未删除就直接删集群 → API 返回 `OperationDenied`。

#### 最小删除（仅移除集群记录，保留 CVM 和 CBS）

`delete-cluster-minimal.json`：

```json
{
  "ClusterId": "<ClusterId>",
  "InstanceDeleteMode": "retain"
}
```

```bash
tccli tke DeleteCluster --region <Region> --cli-input-json file://delete-cluster-minimal.json
# expected: exit 0
```

> **警告**：`retain` 模式保留 CVM 实例，需手动清理，否则持续计费。CBS 云硬盘默认保留。

#### 增强配置（销毁实例 + 级联删除 CBS + 跳过 CLB 保护）

`delete-cluster-enhanced.json`：

```json
{
  "ClusterId": "<ClusterId>",
  "InstanceDeleteMode": "terminate",
  "ResourceDeleteOptions": [
    {
      "ResourceType": "CBS",
      "DeleteMode": "terminate"
    },
    {
      "ResourceType": "CLB",
      "DeleteMode": "terminate",
      "SkipDeletionProtection": true
    }
  ]
}
```

```bash
tccli tke DeleteCluster --region <Region> --cli-input-json file://delete-cluster-enhanced.json
# expected: exit 0
```

> **警告**：`terminate` 模式级联删除所有关联 CVM 实例及磁盘，不可逆。CBS `DeleteMode=terminate` 销毁云硬盘，数据不可恢复。生产环境执行前务必双重确认 `ClusterId`。

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<ClusterId>` | 集群 ID | 格式 `cls-xxxxxxxx` | `tccli tke DescribeClusters` |
| `<Region>` | 地域 | 如 `ap-guangzhou` | `tccli configure list` |

## 验证

集群删除为异步操作。多维度确认删除完成：

```bash
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: ResourceNotFound 或 TotalCount: 0
```

| 验证维度 | 命令 | 预期 |
|------|------|------|
| 集群状态 | `DescribeClusters --ClusterIds '["<ClusterId>"]'` | `ResourceNotFound.ClusterNotFound` 或 `Clusters` 数组为空 |
| CVM 残留（retain 模式） | `tccli cvm DescribeInstances --region <Region> --Filters '[{"Name":"instance-name","Values":["<ClusterId>*"]}]'` | 如选 `retain` 模式，确认 CVM 已被手动清理，否则持续计费 |
| CBS 残留 | `tccli cbs DescribeDisks --region <Region>` 搜索关联磁盘 | 如未设 CBS `DeleteMode=terminate`，磁盘保留且持续计费，需手动清理 |
| 端点状态 | `DescribeClusterEndpointStatus --ClusterId <ClusterId>` | 集群已删后此命令也返回 `ResourceNotFound` |

## 清理

> **⚠️ 副作用警告**：`DeleteCluster` 配合 `InstanceDeleteMode: "terminate"` 会**级联删除**集群关联的所有 CVM 实例及磁盘，操作**不可逆**。`retain` 模式仅移除集群记录，保留 CVM 实例——**需手动清理，否则持续计费**。CBS 默认 `retain`——即使 `terminate` 模式，CBS 也不会被自动删除（除非显式设置 `ResourceDeleteOptions[].DeleteMode=terminate`）。
>
> 生产环境执行前务必先执行 `DescribeClusters` 确认集群 ID 和名称正确，避免误删。

### 清理前状态检查

```bash
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# 确认是待删除的目标集群，记录 ClusterId、ClusterName
```

### 手动清理残留 CVM（retain 模式）

若使用了 `retain` 模式，CVM 实例残留，需手动销毁：

```bash
# 查询残留 CVM
tccli cvm DescribeInstances --region <Region> \
    --Filters '[{"Name":"instance-name","Values":["<ClusterId>*"]}]'

# 手动销毁
tccli cvm TerminateInstances --region <Region> --InstanceIds '["<InstanceId>"]'
```

### 验证已删除

```bash
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: ResourceNotFound 或空列表
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `DeleteCluster` 返回 `OperationDenied` | `tccli tke DescribeClusterEndpoints --ClusterId <ClusterId>` 检查端点状态 | 集群存在端点（内网/外网），删除前需先删除端点 | `tccli tke DeleteClusterEndpoint --ClusterId <ClusterId> --IsExtranet false` 删除内网端点；`--IsExtranet true` 删除外网端点。确认 `DescribeClusterEndpointStatus` 返回 `Deleted` 后重试 |
| `DeleteCluster` 返回 `OperationDenied.ClusterDeletionProtectionEnabled` | `tccli tke DescribeClusters --ClusterIds '["<ClusterId>"]'` 查看 `DeletionProtection` 字段 | 集群开启了删除保护 | `tccli tke DisableClusterDeletionProtection --ClusterId <ClusterId> --region <Region>` 关闭保护后重试 |
| `DeleteCluster` 返回 `InvalidParameter.InstanceDeleteMode` | 检查请求 JSON 中的 `InstanceDeleteMode` 字段 | 填了非法的删除模式值 | 合法值仅 `terminate` 或 `retain`。检查拼写（大小写敏感，不可用 `Terminate` 或 `delete`） |
| `DeleteCluster` 返回 `InvalidParameter.ResourceType` | 检查 `ResourceDeleteOptions` 中的 `ResourceType` 值 | 填了不支持资源类型 | 合法值：`CBS`、`CLB`、`CVM`。区分大小写 |

### 删除成功但有残留

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 集群删除成功但 CVM 实例仍在运行 | `tccli cvm DescribeInstances --region <Region>` 搜索残留实例 | `InstanceDeleteMode` 选了 `retain`，仅移除了集群记录，CVM 未被销毁 | `tccli cvm TerminateInstances --region <Region> --InstanceIds '["<InstanceId>"]'` 手动销毁 CVM。保留 RequestId 和 InstanceId 以备审计 |
| 集群删除成功但 CBS 云硬盘未被销毁 | `tccli cbs DescribeDisks --region <Region>` 搜索残留磁盘 | CBS 默认 `retain`，即使 `terminate` 模式下也未设 `ResourceDeleteOptions[].DeleteMode=terminate` | `tccli cbs TerminateDisks --region <Region> --DiskIds '["<DiskId>"]'` 手动销毁磁盘 |
| 集群删除成功但 CLB 未被销毁 | `tccli clb DescribeLoadBalancers --region <Region>` 搜索残留 CLB | CLB 有终端节点，`SkipDeletionProtection` 未设为 `true`，删除被跳过 | 在 TKE 控制台手动清理，或下次删除时设置 `"SkipDeletionProtection": true` |

## 下一步

- [集群管理模式说明](../management-modes) — 了解托管集群与独立集群的区别
- [创建集群](../create) — 重新创建集群的 CLI 操作指南
- [连接集群](../connect) — 如需创建新集群并配置访问端点
- [关闭集群审计](https://cloud.tencent.com/document/product/457/46823) — 删除集群前关闭审计（如已启用）
- [TKE 集群管理](https://console.cloud.tencent.com/tke2/cluster) — TKE 控制台集群列表

## 控制台替代

通过 [TKE 控制台](https://console.cloud.tencent.com/tke2/cluster) 删除集群：选择目标集群 → 更多 → 删除。
