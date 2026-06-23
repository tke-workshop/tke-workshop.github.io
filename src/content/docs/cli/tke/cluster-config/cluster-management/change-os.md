---
title: "更改集群操作系统"
description: "· page_id `58059` · tccli ≥3.1.107 · API 2018-05-25"
---

> 对照官方：[更改集群操作系统](https://cloud.tencent.com/document/product/457/58059) · page_id `58059` · tccli ≥3.1.107 · API 2018-05-25

## 概述

调用 `ModifyClusterImage` API 修改集群的**默认节点 OS 镜像**，仅对新加入集群的节点生效，**不会变更已有存量节点的 OS**。

| 概念 | 含义 | 影响范围 |
|------|------|---------|
| 集群默认镜像（`ImageId`） | `ModifyClusterImage` 设置的默认镜像 | 仅后续新建/重装节点 |
| 存量节点 OS | 已在集群中运行的节点的操作系统 | 不受 `ModifyClusterImage` 影响 |

## 前置条件

- [环境准备](../../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tke:DescribeClusters, tke:DescribeOSImages, tke:ModifyClusterImage
# 验证：执行 DescribeClusters 确认权限
tccli tke DescribeClusters --region <Region>
# expected: exit 0，返回集群列表（可为空）
```

### 资源检查

```bash
# 4. 确认目标集群存在且状态为 Running
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: ClusterStatus: "Running"

# 5. 查看集群当前默认镜像
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]' \
    | jq '.Clusters[0] | {ClusterOs, ImageId, OsCustomizeType}'
# expected: exit 0，返回当前 OS 配置
```

**预期输出**：

```json
{
    "ClusterOs": "ubuntu16.04.1 LTSx86_64",
    "ImageId": "",
    "OsCustomizeType": ""
}
```

> `ImageId` 为空（`""`）表示集群未显式设置默认镜像，使用公共镜像。`OsCustomizeType` 为空（`""`）表示未自定义 OS 类型。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看集群当前 OS 镜像 | `DescribeClusters` | 是 |
| 查询可用 OS 镜像列表 | `DescribeOSImages` | 是 |
| 更改集群操作系统 | `ModifyClusterImage` | 是 |

## 关键字段说明

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `ClusterId` | String | 是 | 目标集群 ID，格式 `cls-xxxxxxxx`。通过 `DescribeClusters` 获取 | 集群不存在 → `ResourceNotFound.ClusterNotFound` |
| `ImageId` | String | 是 | 必须为 `DescribeOSImages` 返回的在线镜像 ID（`Status: "online"`），格式 `img-xxxxxxxx`。**一旦设置无法恢复为空** | 镜像不在线或不存在 → `InvalidParameter.ImageId`；传空字符串 → `InvalidParameterValue.ImageId` |
| `ClusterOs` | String | — | 只读字段。标识集群当前默认 OS。**执行 `ModifyClusterImage` 后该字段会同步更新为新镜像的 OsName**（如 `ubuntu16.04.1 LTSx86_64` → `ubuntu22.04x86_64`） | — |
| `OsCustomizeType` | String | — | 只读字段。集群 OS 自定义类型。未显式设置镜像时为 `""`，设置后变为 `GENERAL`（通用类型） | — |

> **注意**：`ClusterOs` 和 `OsCustomizeType` 是 `DescribeClusters` 返回的只读字段，不是 `ModifyClusterImage` 的入参。它们随 `ImageId` 设置自动更新。`ImageId` 一旦通过 `ModifyClusterImage` 设为显式值后，无法恢复为空——只能设为另一个有效 `ImageId`。

## 操作步骤

### 步骤 1：查询可用 OS 镜像列表

```bash
tccli tke DescribeOSImages --region <Region>
# expected: exit 0，返回可用镜像列表
```

**预期输出**：

```json
{
    "TotalCount": 60,
    "OSImageSeriesSet": [
        {"OsName": "ubuntu22.04x86_64", "ImageId": "img-487zeit5", "Status": "online"},
        {"OsName": "ubuntu24.04x86_64", "ImageId": "img-mmytdhbn", "Status": "online"},
        {"OsName": "tlinux3.1x86_64", "ImageId": "img-eb30mz89", "Status": "online"},
        {"OsName": "tlinux4_x86_64_public", "ImageId": "img-6n21msk1", "Status": "online"},
        {"OsName": "debian12.8x86_64", "ImageId": "img-541bm08j", "Status": "online"},
        {"OsName": "debian11.11x86_64", "ImageId": "img-mn4o8ymp", "Status": "online"}
    ],
    "RequestId": "..."
}
```

> 以上仅展示代表性镜像。过滤在线镜像：`tccli tke DescribeOSImages --region <Region> | jq '.OSImageSeriesSet[] | select(.Status=="online") | {OsName, ImageId}'`。不要选择 `Status` 为 `offline` 的镜像——会导致 `InvalidParameter.ImageId`。

### 步骤 2：修改集群默认 OS 镜像

#### 选择依据

- **ubuntu22.04x86_64**（`img-487zeit5`）：广泛使用的 LTS 版本，社区成熟，与 TKE 兼容性良好。TKE 当前默认集群使用 ubuntu 系列，选择同系列便于后续节点管理。
- **tlinux3.1x86_64**（`img-eb30mz89`）：腾讯云优化版，与 TKE 兼容性最佳。
- **影响范围**：`ModifyClusterImage` 仅影响后续新建节点（含手动添加、节点池扩容、重装节点），**存量节点 OS 不变**。空集群（0 节点）也可正常执行——该 API 仅设置集群默认镜像属性，不触发节点操作。
- **存量节点迁移**：存量节点需通过节点池滚动更新（删除旧节点 → 新节点自动用新镜像）或手动重装。

```bash
tccli tke ModifyClusterImage --region <Region> \
    --ClusterId <ClusterId> \
    --ImageId <ImageId>
# expected: exit 0，返回 RequestId 确认修改已提交
```

**预期输出**：

```json
{
    "RequestId": "..."
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<ClusterId>` | 集群 ID | 格式 `cls-xxxxxxxx` | `tccli tke DescribeClusters --region <Region>` |
| `<Region>` | 地域 | 如 `ap-guangzhou` | `tccli configure list` |
| `<ImageId>` | 目标镜像 ID | 必须来自 `DescribeOSImages` 且 `Status` 为 `online` | `tccli tke DescribeOSImages --region <Region>` |

> **注意**：修改完成后，`DescribeClusters` 的 `ClusterOs` 字段**会同步更新**为新镜像的 OsName（如 `ubuntu22.04x86_64`），同时 `ImageId` 从空字符串变为显式镜像 ID，`OsCustomizeType` 变为 `GENERAL`。验证修改是否生效应同时检查 `ClusterOs`、`ImageId`、`OsCustomizeType` 三个字段。

## 验证

### 控制面（tccli）

```bash
# 确认默认镜像已更新
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]' \
    | jq '.Clusters[0] | {ClusterOs, ImageId, OsCustomizeType, ClusterStatus}'
# expected: ImageId 为目标镜像 ID，ClusterOs 已更新为新 OS 名称
```

**预期输出**：

```json
{
    "ClusterOs": "ubuntu22.04x86_64",
    "ImageId": "img-487zeit5",
    "OsCustomizeType": "GENERAL",
    "ClusterStatus": "Running"
}
```

| 验证维度 | 命令 | 预期 |
|---------|------|------|
| 默认镜像 | `DescribeClusters` → `ImageId` | 值为步骤 2 设置的 `<ImageId>` |
| 集群 OS | `DescribeClusters` → `ClusterOs` | 已更新为新镜像 OsName（如 `ubuntu22.04x86_64`） |
| OS 自定义类型 | `DescribeClusters` → `OsCustomizeType` | `GENERAL`（设置显式镜像后的默认标记） |
| 集群状态 | `DescribeClusters` → `ClusterStatus` | `Running` |

> `ModifyClusterImage` 是同步 API（返回 RequestId 即生效），无需轮询等待状态变更。

## 清理

> **⚠️ 警告**：OS 变更不可逆——修改后新节点使用新 OS，无法自动回退存量节点。若要完全还原：先用 `ModifyClusterImage` 设回原 `ImageId`，再通过节点池滚动更新替换存量节点。

### 恢复原始集群 OS 镜像

```bash
# 先查询原始 OS 对应的 ImageId
tccli tke DescribeOSImages --region <Region> | jq '.OSImageSeriesSet[] | select(.OsName | test("ubuntu16.04")) | {OsName, ImageId, Status}'
# expected: 返回 ubuntu16.04 的 ImageId
```

```bash
# 恢复为原始 ImageId
tccli tke ModifyClusterImage --region <Region> \
    --ClusterId <ClusterId> \
    --ImageId <OriginalImageId>
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "..."
}
```

### 验证已恢复

```bash
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]' \
    | jq '.Clusters[0] | {ClusterOs, ImageId, OsCustomizeType, ClusterStatus}'
# expected: ClusterOs 恢复为原始 OS，ImageId 恢复为原始 ImageId
```

**预期输出**：

```json
{
    "ClusterOs": "ubuntu16.04.1 LTSx86_64",
    "ImageId": "img-4wpaazux",
    "OsCustomizeType": "GENERAL",
    "ClusterStatus": "Running"
}
```

> **注意**：恢复后 `ImageId` 为 `img-4wpaazux`（原为 `""`），`OsCustomizeType` 为 `GENERAL`（原为 `""`）。`ModifyClusterImage` 不支持将 `ImageId` 设回空值——一旦设置即为显式指定。`ModifyClusterImage` 操作本身不创建/删除任何资源，无需清理计费资源。

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ModifyClusterImage` 返回 `InvalidParameter.ImageId` | 检查 `<ImageId>` 与 `DescribeOSImages` 返回值：`tccli tke DescribeOSImages --region <Region> \| jq '.OSImageSeriesSet[] \| select(.Status=="online")'` | ImageId 不在可用镜像列表中，或所选镜像 `Status` 为 `offline` | 只选择 `Status` 为 `online` 的镜像。用 `DescribeOSImages` 重新获取合法 ImageId |
| `ModifyClusterImage` 返回 `InvalidParameterValue.ImageId` | 检查传入的 `--ImageId` 参数 | 传入了空字符串——`ImageId` 一旦设为显式值后无法恢复为空 | 始终指定有效 ImageId。如需"还原"，用 `DescribeOSImages` 找到原 OS 对应的实际 ImageId |
| `ModifyClusterImage` 返回 `UnauthorizedOperation` | `tccli configure list` 检查凭据 | 子账号缺少 `tke:ModifyClusterImage` 权限（此为环境限制，非命令错误） | 联系主账号授予 `QcloudTKEFullAccess` 或添加自定义策略含 `tke:ModifyClusterImage` Action |
| `ModifyClusterImage` 返回 `ResourceNotFound.ClusterNotFound` | `tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'` 确认集群存在 | 集群 ID 不存在或 region 不匹配 | 检查 `<ClusterId>` 拼写和 `<Region>` 是否正确。保留 RequestId 以备查询 |

### 修改后状态与预期不一致

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ClusterOs` 字段未更新 | `tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]' \| jq '.Clusters[0] \| {ClusterOs, ImageId, OsCustomizeType}'` | 可能未实际执行 `ModifyClusterImage` 或执行的是另一个集群 | 确认 `<ClusterId>` 为目标集群。重新执行步骤 2 并核对 RequestId |
| `ClusterOs` 与预期不一致 | 交叉验证 `ImageId` 对应的 OsName：`tccli tke DescribeOSImages --region <Region> \| jq '.OSImageSeriesSet[] \| select(.ImageId=="<ImageId>") \| {OsName, Status}'` | `ModifyClusterImage` 会将 `ClusterOs` 同步更新为新 ImageId 对应的 OsName——这是实测行为 | `ClusterOs` 的变更是正常的。如果发现 `ClusterOs` 与 `ImageId` 不匹配，可能是 API 缓存延迟——稍等片刻后重新查询 |
| `ModifyClusterImage` 后存量节点 OS 未变 | `kubectl get nodes -o wide`（如有节点） | `ModifyClusterImage` 只影响后续新建节点，存量节点 OS 不受影响（预期行为） | 存量节点需通过节点池滚动更新（删除旧节点 → 新节点自动用新镜像）或手动重装 |
| 新建节点使用了非预期 OS | 检查节点池的 `ImageId` 配置 | 节点池可能配置了独立的 `ImageId` 覆盖集群默认值 | 修改节点池 `ImageId` 使其与集群默认一致 |
| `ClusterOs` 和 `ImageId` 不匹配 | `DescribeOSImages` 交叉验证：`tccli tke DescribeOSImages --region <Region> \| jq '.OSImageSeriesSet[] \| select(.ImageId=="<ImageId>")'` | 可能 `ImageId` 已在平台侧下线但字段未即时同步 | 记录 `ClusterOs`、`ImageId`、`ClusterId`、`RequestId`（最后一次 `ModifyClusterImage` 的），登录 [TKE 控制台](https://console.cloud.tencent.com/tke2/cluster) 查看详细状态。仍无法解决则 [提交工单](https://console.cloud.tencent.com/workorder) |

## 下一步

- [集群扩缩容](../scale) — 扩缩节点，验证新 OS
- [创建集群](../create) — 了解创建时 OS 配置
- [连接集群](../connect) — 获取 kubeconfig 验证新节点

## 控制台替代

[控制台 → 集群 → 基本信息 → 更改集群操作系统](https://console.cloud.tencent.com/tke2/cluster)
