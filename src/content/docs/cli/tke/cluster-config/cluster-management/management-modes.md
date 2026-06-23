---
title: "集群管理模式说明"
description: "· page_id `31013`"
---

> 对照官方：[集群管理模式说明](https://cloud.tencent.com/document/product/457/31013) · page_id `31013`

## 概述

TKE 提供两种集群管理模式，通过 `ClusterType` 字段区分。核心区别在于**控制面（Master + Etcd）由谁运维**。

| 维度 | 托管集群 | 独立集群 |
|------|---------|---------|
| `ClusterType` API 枚举 | `MANAGED_CLUSTER` | `INDEPENDENT_CLUSTER` |
| 控制台概念名 | 托管集群 | 独立集群 |
| 控制面归属 | 腾讯云运维，不在用户资源列表 | 用户自购 CVM 部署 |
| Master/Etcd 管理 | 自动运维，不可修改 | 用户自行管理、扩缩容 |
| 容器运行时 | 强制 `containerd` | 可选 `containerd` / `docker` |
| 费用构成 | 集群管理费 + 工作节点 CVM 等云资源 | Master CVM + 工作节点 CVM 等云资源 |
| Master 扩缩容 | 不开放 | `ScaleOutClusterMaster` / `ScaleInClusterMaster` |
| 新集群支持 | 活跃支持 | **已停止新建** |
| 适用场景 | 绝大多数生产/测试环境，免运维 | （历史）需完全控制控制面的特殊场景 |

**建议：新集群一律选托管集群（`MANAGED_CLUSTER`）。**

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

# 3. 检查 CAM 权限 — 需要 tke:DescribeClusters
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
# 4. 查询目标集群
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
| 查看集群列表及类型 | `DescribeClusters` | 是 |
| 按类型过滤集群 | `DescribeClusters --Filters` | 是 |

## 关键字段说明

| 字段 | 类型 | 说明 | 取值 |
|------|------|------|------|
| `ClusterType` | String | 管理模式 | `MANAGED_CLUSTER`（托管）/ `INDEPENDENT_CLUSTER`（独立） |
| `ClusterStatus` | String | 生命周期状态 | `Running` / `Creating` / `Upgrading` / `Deleting` / `Abnormal` |

## 操作步骤

### 步骤 1：查询集群管理模式

```bash
tccli tke DescribeClusters --region <Region> \
    --ClusterIds '["<ClusterId>"]'
# expected: exit 0，ClusterType 字段显示管理模式
```

**预期输出**（托管集群）：

```json
{
    "TotalCount": 1,
    "Clusters": [
        {
            "ClusterId": "cls-example",
            "ClusterName": "<ClusterName>",
            "ClusterType": "MANAGED_CLUSTER",
            "ClusterStatus": "Running",
            "ClusterVersion": "1.30.0",
            "ClusterNetworkSettings": {
                "ClusterCIDR": "10.200.0.0/16",
                "ServiceCIDR": "10.201.0.0/20",
                "MaxNodePodNum": 64,
                "MaxClusterServiceNum": 4096
            },
            "ClusterMaterNodeNum": 1,
            "ClusterNodeNum": 0,
            "DeletionProtection": true
        }
    ],
    "RequestId": "..."
}
```

| 字段 | 值 | 含义 |
|------|-----|------|
| `ClusterType` | `MANAGED_CLUSTER` | 托管集群 — 控制面由腾讯云运维 |
| `ClusterType` | `INDEPENDENT_CLUSTER` | 独立集群（仅存量）— Master/Etcd 部署在用户 CVM 上 |

### 步骤 2：按类型过滤集群

```bash
# 仅列出托管集群
tccli tke DescribeClusters --region <Region> \
    --Filters '[{"Name":"ClusterType","Values":["MANAGED_CLUSTER"]}]'
# expected: 返回 ClusterType 均为 MANAGED_CLUSTER 的集群列表
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

### 步骤 3：两种模式的 API 能力差异

| API | `MANAGED_CLUSTER` | `INDEPENDENT_CLUSTER` |
|-----|:--:|:--:|
| `CreateCluster` | 支持 | 已停止新建 |
| `DescribeClusters` | 支持 | 支持 |
| `DeleteCluster` | 支持 | 支持 |
| `ModifyClusterAttribute` | 支持 | 支持 |
| `ScaleOutClusterMaster` | 不开放 | 支持 |
| `ScaleInClusterMaster` | 不开放 | 支持 |

## 验证

```bash
# 确认集群类型
tccli tke DescribeClusters --region <Region> \
    --ClusterIds '["<ClusterId>"]' \
    | jq '.Clusters[0].ClusterType'
# expected: "MANAGED_CLUSTER"
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

| 验证维度 | 托管集群 | 独立集群 |
|---------|---------|---------|
| `ClusterType` | `MANAGED_CLUSTER` | `INDEPENDENT_CLUSTER` |
| Master 节点来源 | 不在用户 CVM 列表 | 可见 `cvm DescribeInstances` |
| 容器运行时 | 强制 `containerd` | 可选 `containerd` / `docker` |

## 清理

本页为概念说明页，无资源需清理。

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `DescribeClusters` 返回 `InvalidParameter.ClusterId` | 检查 `--ClusterIds` 格式 | ID 格式错误或不属于当前账号/地域 | `tccli tke DescribeClusters --region <Region>` 列出全部集群确认 ID |
| `DescribeClusters` 返回 `UnauthorizedOperation` | `tccli configure list` 检查凭据 | 子账号缺少 `tke:DescribeClusters` 权限（环境限制） | 联系主账号授予 `QcloudTKEFullAccess` |
| 创建集群返回 `InvalidParameter.ClusterType` | 检查 `ClusterType` 字段值 | 填了控制台概念名（如 `GR`）而非 API 枚举 | 改为 `"MANAGED_CLUSTER"` |

### 类型选择疑问

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 想新建独立集群但 API 报错 | `DescribeVersions` 查看 | 独立集群已停止新建入口 | 改用托管集群 `MANAGED_CLUSTER` |
| 托管集群删除全部节点后仍计费 | `DescribeClusters` 确认集群仍在运行 | 集群本身仍在运行并计费 | 执行 `DeleteCluster` 删除集群本身 |

## 下一步

- [创建集群](../create) — 通过 CLI 创建托管集群
- [集群生命周期](../lifecycle) — 集群状态流转与生命周期管理
- [集群扩缩容](../scale) — 托管集群规格调整

## 控制台替代

[TKE 控制台 → 集群列表](https://console.cloud.tencent.com/tke2/cluster)：集群卡片上「集群类型」列展示。
