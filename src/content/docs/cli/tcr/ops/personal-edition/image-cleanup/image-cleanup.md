---
title: "设置镜像清理（tccli）"
description: "· page_id `63914`"
---

> 对照官方：[设置镜像清理](https://cloud.tencent.com/document/product/1141/63914) · page_id `63914`

## 概述

通过 `tccli tcr` 管理 TCR **个人版**全局镜像版本自动清理策略。策略控制自动删除超出保留范围的镜像版本，帮助控制存储空间和版本管理成本。

**策略按地域独立配置**——如 `ap-guangzhou` 和 `na-siliconvalley` 需分别设置。

支持两种策略类型（同一时刻仅一种生效）：

| 策略类型 | 含义 | API `--Type` 值 |
|---------|------|-----------------|
| 按版本数量保留 | 保留最新推送的 N 个版本，超出部分定时清理 | `global_keep_last_nums` |
| 按天数保留 | 保留最近 N 天内推送的版本 | `global_keep_last_days` |

> - 保留版本数不能超过账号下镜像版本默认配额（`DescribeUserQuotaPersonal` 中 `Type: tag` 的 `Value`）。
> - 仓库级策略（`DescribeImageLifecyclePersonal`）优先于全局策略。仓库级策略的 `Type` 前缀为 `keep_last_`（无 `global_`），语义相同。
> - 个人版 API 无需 `--RegistryId` 参数，区别于企业版。
> - `DescribeNamespacePersonal` 返回的 `NamespaceCount` 为**个人版共享实例全量计数**（本实跑环境为 450），非本账号独有命名空间数。账号自身命名空间需遍历 `NamespaceInfo` 列表确认。

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey 已配置

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:DescribeImageLifecycleGlobalPersonal, tcr:ManageImageLifecycleGlobalPersonal
#    tcr:DeleteImageLifecycleGlobalPersonal, tcr:DescribeImageLifecyclePersonal
#    tcr:DescribeNamespacePersonal, tcr:DescribeUserQuotaPersonal
# 验证：执行 DescribeNamespacePersonal 确认权限
tccli tcr DescribeNamespacePersonal --region <Region> \
    --Namespace "" --Limit 1 --Offset 0
# expected: exit 0（空列表或已有命名空间数据）
```

### 资源检查

```bash
# 4. 确认个人版已初始化（未初始化时 ModifyUserPasswordPersonal 等操作会失败）
tccli tcr DescribeUserQuotaPersonal --region <Region>
# expected: exit 0，返回 Data.LimitInfo
```

**预期输出**（实跑数据）：

```json
{
    "Data": {
        "LimitInfo": [
            {"Type": "namespace", "Value": 2000},
            {"Type": "repo", "Value": 10000},
            {"Type": "tag", "Value": 9999},
            {"Type": "trigger", "Value": 10}
        ]
    },
    "RequestId": "23d1f0c4-eaf9-4b8e-973e-36297d5edcf1"
}
```

> - 若返回 `InternalError` 或提示 "has not initialized user info"，说明个人版尚未初始化。前往 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) 个人版实例卡片完成初始化后重试。
> - `DescribeUserQuotaPersonal` 返回成功（exit 0）即表示个人版已初始化可用。

```bash
# 5. 查看当前命名空间（了解已有镜像分布）
tccli tcr DescribeNamespacePersonal --region <Region> \
    --Namespace "" --Limit 20 --Offset 0
# expected: exit 0，Data.NamespaceInfo 列出命名空间
```

**预期输出**（实跑数据，NamespaceCount 为个人版共享全量）：

```json
{
    "Data": {
        "NamespaceCount": 450,
        "NamespaceInfo": [
            {
                "Namespace": "ka-test",
                "CreationTime": "2026-06-15 11:59:57",
                "RepoCount": 1
            }
        ]
    },
    "RequestId": "bb1c991c-384f-4d9a-93f9-455f77fb7353"
}
```

> `NamespaceCount` 为个人版共享实例全量（非本账号独有）。本账号命名空间需从 `NamespaceInfo` 列表确认。

## 控制台与 CLI 参数映射

| 控制台操作 | CLI | 幂等 |
|-----------|-----|:--:|
| 查看全局清理策略 | `DescribeImageLifecycleGlobalPersonal` | 是 |
| 启用/修改全局策略（按版本数） | `ManageImageLifecycleGlobalPersonal --Type global_keep_last_nums --Val <N>` | 是 |
| 启用/修改全局策略（按天数） | `ManageImageLifecycleGlobalPersonal --Type global_keep_last_days --Val <N>` | 是 |
| 查看仓库级清理策略 | `DescribeImageLifecyclePersonal --RepoName <namespace>/<repo>` | 是 |
| 关闭全局清理策略 | `DeleteImageLifecycleGlobalPersonal`（将 `Valid` 置 0，非物理删除） | 是 |

## 操作步骤

### 步骤1：查看当前全局清理策略

```bash
tccli tcr DescribeImageLifecycleGlobalPersonal --region ap-guangzhou --output json
```

**Output:**

```json
{
    "RequestId": "eac6b301-a322-493a-8e36-83b295459397",
    "Data": {
        "StrategyInfo": [
            {
                "Username": "100049208872",
                "RepoName": "",
                "Type": "global_keep_last_nums",
                "Value": 80,
                "Valid": 1,
                "CreationTime": "2020-01-22 15:38:19 +0800 CST"
            },
            {
                "Username": "100049208872",
                "RepoName": "",
                "Type": "global_keep_last_days",
                "Value": 100,
                "Valid": 0,
                "CreationTime": "2020-01-22 15:38:19 +0800 CST"
            }
        ],
        "TotalCount": 2
    }
}
```

**输出字段说明：**

| 字段 | 说明 |
|------|------|
| `RepoName` | 全局策略此字段为空字符串 `""`；仓库级策略为该仓库全名（`namespace/repo`） |
| `Type` | 策略类型：`global_keep_last_nums` / `global_keep_last_days`（全局）；`keep_last_nums` / `keep_last_days`（仓库级） |
| `Value` | 策略值：要保留的版本数或天数 |
| `Valid` | `1` = 启用（当前生效），`0` = 未启用 |
| `TotalCount` | 始终为 `2`（两条策略条目始终存在，实际生效的只有 `Valid: 1` 的那条） |

> **策略互斥**：API 同一时刻仅一种策略类型为 `Valid: 1`。设置「按版本数量保留」会自动将「按天数保留」置为 `Valid: 0`，反之亦然。

### 步骤2：设置全局清理策略

#### 按保留最新版本数

保留最新推送的 50 个镜像版本，超出部分自动清理：

```bash
tccli tcr ManageImageLifecycleGlobalPersonal \
  --Type global_keep_last_nums \
  --Val 50 \
  --region ap-guangzhou \
  --output json
```

**Output:**

```json
{
    "RequestId": "fdc10ec8-a1cf-4c2a-8eb4-f6d66abfdd53"
}
```

> `--Val` 不能超过 `DescribeUserQuotaPersonal` 中 `Type: tag` 的配额（默认为 9999）。

#### 按保留最近天数

保留最近 30 天内推送的镜像版本：

```bash
tccli tcr ManageImageLifecycleGlobalPersonal \
  --Type global_keep_last_days \
  --Val 30 \
  --region ap-guangzhou \
  --output json
```

**Output:**

```json
{
    "RequestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

> **地域独立**：策略按地域分别配置。如需在多个地域（如 `ap-guangzhou`、`ap-shanghai`）设置策略，需分别执行 `ManageImageLifecycleGlobalPersonal` 并指定对应的 `--region`。

### 步骤3：关闭全局清理策略

`DeleteImageLifecycleGlobalPersonal` 的语义是**禁用**全局策略（将所有策略条目的 `Valid` 设为 `0`），非物理删除。策略条目仍保留，重新启用时执行 `ManageImageLifecycleGlobalPersonal` 即可。

```bash
tccli tcr DeleteImageLifecycleGlobalPersonal --region ap-guangzhou --output json
```

**Output:**

```json
{
    "RequestId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

### 步骤4（可选）：查看仓库级清理策略

查询指定仓库的镜像自动清理策略：

```bash
tccli tcr DescribeImageLifecyclePersonal \
  --RepoName "<NamespaceName>/<RepoName>" \
  --region ap-guangzhou \
  --output json
```

**Output:**

```json
{
    "RequestId": "eac6b301-a322-493a-8e36-83b295459397",
    "Data": {
        "StrategyInfo": [
            {
                "Username": "100049208872",
                "RepoName": "mynamespace/myapp",
                "Type": "keep_last_days",
                "Value": 30,
                "Valid": 1,
                "CreationTime": "2020-01-22 15:38:19 +0800 CST"
            }
        ],
        "TotalCount": 1
    }
}
```

> 仓库级策略的 `Type` 不带 `global_` 前缀（`keep_last_nums` / `keep_last_days`）。当仓库级策略 `Valid: 1` 时，该仓库以仓库级策略为准，忽略全局策略。

## 验证

### 控制面（tccli）

确认策略已按预期生效：

```bash
tccli tcr DescribeImageLifecycleGlobalPersonal --region ap-guangzhou --output json
```

检查 `Data.StrategyInfo`：
- 新设置的策略类型 `Valid` 为 `1`
- `Value` 与传入的 `--Val` 一致
- 另一种策略类型 `Valid` 自动变为 `0`

## 清理

关闭全局策略即可：

```bash
tccli tcr DeleteImageLifecycleGlobalPersonal --region ap-guangzhou --output json
```

> 策略禁用后，镜像版本不再自动清理。已删除的镜像版本无法恢复。

## 排障

| 现象 | 原因 | 处理 |
|------|------|------|
| `InternalError` 或提示 "has not initialized user info" | 个人版尚未在控制台初始化 | 前往 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) 个人版实例卡片完成初始化。验证方式：`DescribeUserQuotaPersonal` 返回成功即已初始化（同[更新登录密码](../update-password) 的限制） |
| 策略设置后未立即执行清理 | 清理为定时任务触发，非实时 | 等待定时任务执行（通常每日一次） |
| `MissingParameter` | `--Type` 与 `--Val` 未同时传入 | 确认两个参数均已指定 |
| `Valid` 为 `0` | 策略未启用或被禁用 | 重新执行 `ManageImageLifecycleGlobalPersonal` 启用 |
| 跨地域查询不到策略 | 策略按地域独立配置 | 检查 `--region` 与目标地域是否一致 |
| 仓库级策略与全局策略冲突 | 仓库级策略优先 | 查询 `DescribeImageLifecyclePersonal` 确认该仓库是否有独立策略 |
| `--Val` 值超出配额 | 保留版本数超过 `DescribeUserQuotaPersonal` 中 `Type: tag` 的配额上限 | 降低 `--Val` 值或申请提升配额 |
| `DescribeUserQuotaPersonal` 返回 `AuthFailure` | API 密钥无效或 CAM 权限不足 | 检查 `tccli configure list` 密钥配置；确认 CAM 策略包含 `tcr:DescribeUserQuotaPersonal` |

## 下一步

- [个人版快速入门](../../../quickstart/personal)（page_id `63910`） — 推送/拉取镜像
- [企业版镜像版本保留](https://cloud.tencent.com/document/product/1141/50613) — 企业版 Tag 保留规则
- [更新登录密码](../update-password)（page_id `63912`） — 管理个人版登录密码

## 控制台替代

[容器镜像服务控制台 → 实例管理](https://console.cloud.tencent.com/tcr) → 选择地域个人版实例 → **更多** > **设置镜像清理** → 勾选「启用全局镜像生命周期管理」→ 选择保留类型并设置数量/天数 → 单击**确定**。
