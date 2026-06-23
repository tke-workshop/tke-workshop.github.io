---
title: "集群生命周期"
description: "· page_id `32188`"
---

> 对照官方：[集群生命周期](https://cloud.tencent.com/document/product/457/32188) · page_id `32188`

## 概述

TKE 集群从创建到销毁经历多个状态阶段。通过 `DescribeClusterStatus` 查询集群运行状态（`ClusterState`）、删除保护（`ClusterDeletionProtection`）和审计状态（`ClusterAuditEnabled`），通过 `DescribeClusters` 查看完整配置。通过 `ModifyClusterAttribute` 修改名称、描述等属性，通过 `DisableClusterDeletionProtection` 控制删除保护。

> **推荐**：仅需查询状态和删除保护时优先使用 `DescribeClusterStatus`（响应快）；需完整配置时使用 `DescribeClusters`。

### 状态流转

```
Creating → Running ⇄ Upgrading → Running → Deleting → 已删除
              ↓
          Abnormal
```

| 状态 | `ClusterStatus` 值 | 含义 | 禁止操作 |
|------|:--:|------|------|
| 创建中 | `Creating` | 控制面和网络初始化中（约 10-15 分钟） | 所有写操作 |
| 运行中 | `Running` | 集群正常运行 | 无 |
| 升级中 | `Upgrading` | K8s 版本升级进行中 | 修改属性、删除、再次升级 |
| 删除中 | `Deleting` | 集群正在删除 | 所有操作 |
| 异常 | `Abnormal` | 集群状态异常 | 升级、扩缩容等变更操作 |
| 欠费隔离 | `Isolated` | 后付费集群欠费隔离 | 写操作 |

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
#    需要: tke:DescribeClusters, tke:ModifyClusterAttribute,
#          tke:EnableClusterDeletionProtection, tke:DisableClusterDeletionProtection
tccli tke DescribeClusters --region <Region>
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
# 4. 确认目标集群存在
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: TotalCount >= 1
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

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 快速查看运行状态和删除保护 | `DescribeClusterStatus` | 是 |
| 查看集群完整详情 | `DescribeClusters` | 是 |
| 修改集群名称、描述 | `ModifyClusterAttribute` | 是 |
| 开启删除保护 | `EnableClusterDeletionProtection` | 是 |
| 关闭删除保护 | `DisableClusterDeletionProtection` | 是 |

## 关键字段说明

| 字段 | 来源 API | 类型 | 说明 |
|------|---------|------|------|
| `ClusterState` | `DescribeClusterStatus` | String | 状态：`Creating`/`Running`/`Upgrading`/`Deleting`/`Abnormal`/`Closed` |
| `ClusterStatus` | `DescribeClusters` | String | 状态：`Creating`/`Running`/`Upgrading`/`Deleting`/`Abnormal`/`Isolated` |
| `ClusterDeletionProtection` | `DescribeClusterStatus` | Boolean | 删除保护是否开启 |
| `DeletionProtection` | `DescribeClusters` | Boolean | 同 `ClusterDeletionProtection`，`true` 时禁止删除 |
| `ClusterAuditEnabled` | `DescribeClusterStatus` | Boolean | 审计是否开启 |

> `DescribeClusterStatus` 用 `Closed` 表示隔离状态，`DescribeClusters` 用 `Isolated`。两者含义一致。

## 操作步骤

### 步骤 1：查询集群状态

```bash
tccli tke DescribeClusterStatus --region <Region> \
    --ClusterIds '["<ClusterId>"]'
# expected: exit 0，返回集群当前状态
```

**预期输出**：

```json
{
    "ClusterStatusSet": [
        {
            "ClusterId": "cls-example",
            "ClusterState": "Running",
            "ClusterInstanceState": "-",
            "ClusterBMonitor": false,
            "ClusterDeletionProtection": true,
            "ClusterAuditEnabled": false
        }
    ],
    "RequestId": "..."
}
```

### 步骤 2：查看集群完整详情

```bash
tccli tke DescribeClusters --region <Region> \
    --ClusterIds '["<ClusterId>"]'
# expected: exit 0，返回完整集群信息
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Clusters": [
        {
            "ClusterId": "cls-example",
            "ClusterName": "<ClusterName>",
            "ClusterType": "MANAGED_CLUSTER",
            "ClusterVersion": "1.30.0",
            "ClusterStatus": "Running",
            "ClusterNodeNum": 0,
            "ClusterMaterNodeNum": 1,
            "CreatedTime": "2026-06-18T03:08:25Z",
            "DeletionProtection": true,
            "VpcId": "vpc-example",
            "ContainerRuntime": "containerd",
            "ClusterLevel": "L5"
        }
    ],
    "RequestId": "..."
}
```

### 步骤 3：按状态过滤集群

```bash
# 仅列出运行中的集群
tccli tke DescribeClusters --region <Region> \
    --Filters '[{"Name":"ClusterStatus","Values":["Running"]}]'
# expected: 返回 ClusterStatus 均为 Running 的集群列表
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

### 步骤 4：修改集群属性

```bash
# 修改集群名称
tccli tke ModifyClusterAttribute --region <Region> \
    --ClusterId <ClusterId> \
    --ClusterName "<NewClusterName>"
# expected: exit 0
```

### 步骤 5：开关删除保护

```bash
# 开启删除保护
tccli tke EnableClusterDeletionProtection --region <Region> --ClusterId <ClusterId>
# expected: exit 0

# 关闭删除保护（删除集群前必须）
tccli tke DisableClusterDeletionProtection --region <Region> --ClusterId <ClusterId>
# expected: exit 0
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `<ClusterId>` | 目标集群 ID，格式 `cls-xxxxxxxx` | `tccli tke DescribeClusters --region <Region>` |
| `<Region>` | 地域，如 `ap-guangzhou` | `tccli configure list` |
| `<NewClusterName>` | 新集群名称，长度 1-60 字符 | 自定义 |

## 验证

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 集群状态 | `DescribeClusterStatus` → `ClusterState` | `"Running"` |
| 删除保护 | `DescribeClusterStatus` → `ClusterDeletionProtection` | 与操作预期一致 |
| 审计状态 | `DescribeClusterStatus` → `ClusterAuditEnabled` | `true` / `false` |
| 名称已修改 | `DescribeClusters` → `ClusterName` | `"<NewClusterName>"` |

## 清理

本页主要为读操作和属性修改操作。如启用了删除保护且在不需要时：

```bash
# 清理前确认状态
tccli tke DescribeClusterStatus --region <Region> --ClusterIds '["<ClusterId>"]'
# 确认 ClusterDeletionProtection 当前状态

# 关闭删除保护（如已开启）
tccli tke DisableClusterDeletionProtection --region <Region> --ClusterId <ClusterId>
# expected: exit 0
```

```json
{
  "ClusterStatusSet": "<ClusterStatusSet>",
  "ClusterId": "<ClusterId>",
  "ClusterState": "<ClusterState>",
  "ClusterInstanceState": "<ClusterInstanceState>",
  "ClusterBMonitor": "<ClusterBMonitor>",
  "ClusterInitNodeNum": "<ClusterInitNodeNum>"
}
```

> **风险说明**：删除保护是防止误删的关键安全机制。关闭后任何有 `tke:DeleteCluster` 权限的主体均可删除该集群。仅在确认需要删除时关闭。

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `DeleteCluster` 返回 `OperationDenied` | `DescribeClusterStatus` 确认 `ClusterDeletionProtection: true` | 删除保护已开启 | `DisableClusterDeletionProtection` 关闭后重试 |
| `ModifyClusterAttribute` 返回 "cluster is in upgrading" | `DescribeClusterStatus` 查看 `ClusterState` | 集群正在升级（`Upgrading`），拒绝属性修改 | 等待恢复 `Running` 后重试 |
| `DescribeClusters` 返回 `ResourceNotFound` | 检查 ClusterId 拼写和 region | ClusterId 不存在于当前账号/地域 | `tccli tke DescribeClusters --region <Region>` 确认正确 ID |
| `UnauthorizedOperation` | `tccli configure list` 检查凭据 | CAM 权限不足（环境限制） | 联系主账号授予 `QcloudTKEFullAccess` |
| `ModifyClusterAttribute` 返回 `InvalidParameter.ClusterName` | 检查名称规则（1-60 字符，字母开头） | 名称不合法或重名 | 更换为合法唯一名称 |

### 状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 状态长时间 `Creating`（>15 分钟） | `DescribeClusterStatus` 轮询 | 后端创建卡住 — VPC/子网不可用或配额不足 | 保留 region、ClusterId、RequestId → 登录 [TKE 控制台](https://console.cloud.tencent.com/tke2/cluster) |
| 状态 `Abnormal` | `DescribeClusterStatus` 确认后查 `DescribeClusters` 的 `StatusReason` | 底层资源故障、欠费等 | 检查 `StatusReason` → 登录控制台 → 无法解决则 [提交工单](https://console.cloud.tencent.com/workorder) |
| 状态 `Closed` / `Isolated` | `DescribeClusterStatus` 确认 | 后付费集群欠费隔离（环境限制） | 充值后自动恢复 `Running` |

## 下一步

- [创建集群](../create) — 创建新托管集群
- [删除集群](../delete) — 安全删除集群及关联资源
- [升级集群](../upgrade) — 升级 K8s 版本

## 控制台替代

[TKE 控制台 → 集群列表](https://console.cloud.tencent.com/tke2/cluster)
