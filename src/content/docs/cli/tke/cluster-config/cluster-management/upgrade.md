---
title: "升级集群"
description: "· page_id `32192`"
---

> 对照官方：[升级集群](https://cloud.tencent.com/document/product/457/32192) · page_id `32192`

## 概述

通过 `UpdateClusterVersion` 升级 TKE 集群的 Kubernetes 控制面版本，仅升级 Master 控制面，不升级工作节点（节点升级需单独执行 `UpgradeClusterInstances`）。

升级策略：先升级控制面验证稳定性，再逐步升级节点。版本须逐级递进，不可跨版本跳跃（如 1.30 直接跳到 1.34）。升级不可逆，不可回退。`DescribeAvailableClusterVersion` 返回当前集群可到达的升级路径。

## 前置条件

- [环境准备](../../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置

# 3. 检查 CAM 权限
#    需要: tke:UpdateClusterVersion, tke:DescribeAvailableClusterVersion,
#          tke:DescribeClusters, tke:DescribeVersions
tccli tke DescribeClusters --region <Region>
# expected: exit 0

tccli tke DescribeAvailableClusterVersion --region <Region> --ClusterId <ClusterId>
# expected: exit 0
```

```json
{
  "TotalCount": "<TotalCount>",
  "Clusters": "<Clusters>",
  "ClusterId": "<ClusterId>",
  "ClusterName": "<ClusterName>",
  "ClusterDescription": "<ClusterDescription>",
  "ClusterVersion": "<ClusterVersion>"
}
```

### 资源检查

```bash
# 4. 确认集群状态和当前版本
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: ClusterStatus: "Running"

# 5. 查询该集群可升级的目标版本
tccli tke DescribeAvailableClusterVersion --region <Region> --ClusterId <ClusterId>
# expected: Versions 非空

# 6. 查询全地域可用版本
tccli tke DescribeVersions --region <Region>
# expected: exit 0

# 7. 检查集群状态详情
tccli tke DescribeClusterStatus --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: ClusterState: "Running"
```

```json
{
  "TotalCount": "<TotalCount>",
  "Clusters": "<Clusters>",
  "ClusterId": "<ClusterId>",
  "ClusterName": "<ClusterName>",
  "ClusterDescription": "<ClusterDescription>",
  "ClusterVersion": "<ClusterVersion>"
}
```

### 升级前检查清单

| 检查项 | 通过标准 |
|--------|---------|
| 集群状态 | `ClusterStatus: "Running"` |
| 目标版本可用 | 在 `DescribeAvailableClusterVersion` 返回列表中 |
| 删除保护状态 | `ClusterDeletionProtection: false`（`true` 需先关闭） |
| 时间窗口 | 业务低峰期，预留 1-2 小时 |

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看可升级版本 | `DescribeAvailableClusterVersion` | 是 |
| 查询所有可用版本 | `DescribeVersions` | 是 |
| 升级集群 | `UpdateClusterVersion` | 否 |
| 查询集群状态 | `DescribeClusterStatus` | 是 |
| 查看集群详情 | `DescribeClusters` | 是 |

## 关键字段说明

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `ClusterId` | String | 是 | 格式 `cls-xxxxxxxx`，集群必须 `Running` | 不存在 → `InvalidParameter.ClusterId`；非 Running → `FailedOperation.ClusterState` |
| `DstVersion` | String | 是 | 目标 K8s 版本，须在 `DescribeAvailableClusterVersion` 返回列表中 | 版本不在可用列表 → `InvalidParameter` |
| `ExtraArgs` | ClusterExtraArgs | 否 | 自定义参数，子字段为 `Array of String`，格式 `["k1=v1","k2=v2"]` | 格式错误 → `InvalidParameter.ExtraArgs` |
| `SkipPreCheck` | Boolean | 否 | 默认 `false` | 跳过检查可能导致升级失败后难以定位 |
| `MaxNotReadyPercent` | Float | 否 | 可容忍的最大不可用 Pod 比例 | 设置过高可能导致服务不可用未被检测 |

## 操作步骤

### 步骤 1：查询当前版本和可升级版本

```bash
# 当前版本
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: ClusterVersion, ClusterStatus
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Clusters": [
        {
            "ClusterId": "cls-example",
            "ClusterName": "<ClusterName>",
            "ClusterVersion": "1.30.0",
            "ClusterStatus": "Running",
            "ClusterType": "MANAGED_CLUSTER"
        }
    ],
    "RequestId": "..."
}
```

```bash
# 可升级版本
tccli tke DescribeAvailableClusterVersion --region <Region> --ClusterId <ClusterId>
# expected: Versions 列表
```

**预期输出**（1.30.0 可升级到 1.32.2）：

```json
{
    "Versions": ["1.32.2"],
    "Clusters": [
        {
            "ClusterId": "cls-example",
            "Versions": ["1.32.2"]
        }
    ],
    "RequestId": "..."
}
```

> `DescribeAvailableClusterVersion` 只返回当前集群允许的升级路径。不能跨版本升级。

```bash
# 集群状态详情
tccli tke DescribeClusterStatus --region <Region> --ClusterIds '["<ClusterId>"]'
# 确认 ClusterDeletionProtection（true 时需先关闭）
```

**预期输出**：

```json
{
    "ClusterStatusSet": [
        {
            "ClusterId": "cls-example",
            "ClusterState": "Running",
            "ClusterDeletionProtection": true,
            "ClusterAuditEnabled": false
        }
    ],
    "RequestId": "..."
}
```

### 步骤 2：执行升级

#### 选择依据

- **版本选择**：从 `1.30.0` 升级到 `1.32.2`。`1.32.2` 是 `1.30.0` 的推荐升级路径。虽全局最新为 `1.34.1`，但不能跳级。
- **升级策略**：仅升级控制面（Master），不升级节点。节点升级需单独执行 `UpgradeClusterInstances`。
- **不可回退**：升级不可逆，不支持版本降级。
- **升级时机**：业务低峰期或维护窗口，耗时约 10-30 分钟。

#### 最小升级

```bash
tccli tke UpdateClusterVersion --region <Region> \
    --ClusterId <ClusterId> \
    --DstVersion <TargetVersion>
# expected: exit 0，返回 RequestId。异步操作，耗时 10-30 分钟。
```

**预期输出**：

```json
{
    "RequestId": "..."
}
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `<ClusterId>` | 集群 ID | `tccli tke DescribeClusters --region <Region>` |
| `<TargetVersion>` | 目标版本，如 `1.32.2` | `DescribeAvailableClusterVersion` 返回列表 |
| `<Region>` | 地域 | `tccli configure list` |

> 参数名是 `--DstVersion`（不是 `--ClusterVersion` 也不是 `--Version`）。

#### 增强配置

`upgrade-enhanced.json`：

```json
{
    "ClusterId": "<ClusterId>",
    "DstVersion": "<TargetVersion>",
    "ExtraArgs": {
        "KubeAPIServer": ["max-requests-inflight=500"],
        "KubeControllerManager": [],
        "KubeScheduler": []
    },
    "MaxNotReadyPercent": 0.1,
    "SkipPreCheck": false
}
```

```bash
tccli tke UpdateClusterVersion --region <Region> \
    --cli-input-json file://upgrade-enhanced.json
# expected: exit 0
```

### 步骤 3：轮询升级进度

建议轮询间隔 3-5 分钟：

```bash
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: ClusterStatus: "Upgrading" → 等待 → "Running"，ClusterVersion 更新
```

**预期输出（进行中）**：

```json
{
    "Clusters": [
        {
            "ClusterId": "cls-example",
            "ClusterVersion": "1.32.2",
            "ClusterStatus": "Upgrading"
        }
    ]
}
```

**预期输出（完成）**：

```json
{
    "Clusters": [
        {
            "ClusterId": "cls-example",
            "ClusterVersion": "1.32.2",
            "ClusterStatus": "Running",
            "ClusterType": "MANAGED_CLUSTER"
        }
    ]
}
```

## 验证

```bash
# 确认版本已更新
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]' \
    | jq '.Clusters[0] | {ClusterVersion, ClusterStatus}'
# expected: ClusterVersion: "<TargetVersion>", ClusterStatus: "Running"
```

```json
{
  "TotalCount": "<TotalCount>",
  "Clusters": "<Clusters>",
  "ClusterId": "<ClusterId>",
  "ClusterName": "<ClusterName>",
  "ClusterDescription": "<ClusterDescription>",
  "ClusterVersion": "<ClusterVersion>"
}
```

| 维度 | 预期 |
|------|------|
| 集群版本 | `ClusterVersion` 为 `<TargetVersion>` |
| 集群状态 | `ClusterStatus: "Running"` |
| kubectl 连通性 | `Kubernetes control plane is running...`（内网环境） |
| 节点状态 | `kubectl get nodes` → 所有节点 `Ready` |

> 升级后节点 kubelet 不会自动更新。旧版 kubelet 一般可与新版控制面兼容（偏差策略允许 <= 2 个次版本），建议通过 `UpgradeClusterInstances` 逐步升级节点。

## 清理

> **警告**：升级操作不可逆——不支持版本降级。升级完成后无需清理资源。

如果升级后发现问题：
1. 保留 region、ClusterId、RequestId，登录 [TKE 控制台](https://console.cloud.tencent.com/tke2/cluster)
2. 检查 `ClusterStatus` 和 `StatusReason`
3. 评估是否需要将业务迁移至新版本集群

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `DescribeAvailableClusterVersion` 返回 `UnknownAction` | 检查 API 拼写 | API 名为 `DescribeAvailableClusterVersion`（非 `DescribeClusterAvailableVersion`） | 使用正确 API 名 |
| `DescribeAvailableClusterVersion` 返回 `null` 或空列表 | `DescribeClusters` 确认集群状态；`DescribeVersions` 查看全局版本 | 当前集群版本可能已最新，或 API 需特定条件才返回升级路径 | 检查集群状态为 `Running` |
| `UpdateClusterVersion` 返回 `UnknownParameter: DstVersion` | 检查参数拼写 | 参数名是 `--DstVersion`，不是 `--ClusterVersion` | 改为 `--DstVersion <TargetVersion>` |
| `UpdateClusterVersion` 返回 `OperationDenied: DeletionProtection is enabled` | `DescribeClusterStatus` 查看 `ClusterDeletionProtection` | 升级前未关闭删除保护 | `DisableClusterDeletionProtection` 关闭后重试 |
| `UpdateClusterVersion` 返回 `InvalidParameter`（版本不可升级） | 确认 `--DstVersion` 是否在 `DescribeAvailableClusterVersion` 列表中 | 目标版本不在可升级路径中（如 1.30 跳到 1.34） | 选择返回列表中的版本，不能跳级 |
| `UpdateClusterVersion` 返回 `FailedOperation.ClusterState` | `DescribeClusters` 查看 `ClusterStatus` | 集群状态不是 `Running` | 等待恢复 `Running` 后重试 |
| `UpdateClusterVersion` 返回 `InvalidParameter.ExtraArgs` | 检查 `ExtraArgs` 格式 | 子字段必须为 `Array of String`，格式 `["k1=v1","k2=v2"]` | 调整格式 |

### 升级已提交但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 升级后 >30 分钟仍 `Upgrading` | `DescribeClusters` 持续轮询 | 升级过程卡住 | 保留 RequestId → 登录控制台 → 提交工单 |
| 升级后 `Abnormal` | `DescribeClusters` 查看 `StatusReason` | 版本兼容性问题或组件故障 | 保留 RequestId → 登录控制台。紧急处理需迁移业务至新集群 |
| 升级后 kubectl 不可达 | 重新获取 kubeconfig | API Server 重启中或凭证过期 | 等待 2-5 分钟重试 |
| 升级后节点 NotReady | `kubectl get nodes` | kubelet 与控制面版本偏差过大 | 通过 `UpgradeClusterInstances` 升级节点 |
| 只升级控制面，节点版本不一致 | `kubectl get nodes -o wide` 查看 KubeletVersion | `UpdateClusterVersion` 只升级控制面 | 执行 `UpgradeClusterInstances` 升级节点 |

## 下一步

- [集群生命周期](../lifecycle) — 状态流转管理
- [TKE Kubernetes 大版本更新说明](https://cloud.tencent.com/document/product/457/47714) — 各版本关键变更
- [Kubernetes API 废弃指南](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)

## 控制台替代

[TKE 控制台 → 集群详情 → 基本信息 → 集群版本 → 升级](https://console.cloud.tencent.com/tke2/cluster)
