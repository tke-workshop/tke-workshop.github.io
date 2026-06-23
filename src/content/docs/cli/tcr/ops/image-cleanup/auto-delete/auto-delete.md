---
title: "自动删除镜像版本（tccli）"
description: "· page_id `50613`"
---

> 对照官方：[自动删除镜像版本](https://cloud.tencent.com/document/product/1141/50613) · page_id `50613`

## 概述

TCR 企业版支持镜像版本保留功能，允许自定义创建版本保留规则，定时触发并自动删除保留规则外的镜像版本。支持两种保留策略：保留最新推送的 N 个版本（`latestPushedK`）、保留 N 天内推送的版本（`nDaysSinceLastPush`），并支持模拟执行（`DryRun`）。高级配置模式下可对仓库、版本进行正则过滤，配合两种保留策略实现灵活精确的版本管理。

**重要注意事项：**

1. 版本保留功能将**删除保留规则外的镜像版本**，仅删除镜像版本信息，不删除底层镜像数据。如需彻底清理镜像数据，请使用 [清理 COS 存储空间功能](https://cloud.tencent.com/document/product/1141/58157)。
2. 若镜像仓库中存在多个不同 Tag 但相同 Digest 的镜像（即同一镜像内容打了不同 Tag），因保留规则仅保留指定数量的 Tag，删除时将一并删除共享同一 Digest 的所有 Tag。**在此场景下请谨慎使用版本保留规则，或暂时禁用已有规则。**
3. 单个命名空间内暂只能创建一条版本保留规则。

## 前置条件

- 已 [创建企业版实例](../../create)，实例状态为 `Running`。
- 实例内已创建至少一个命名空间，且命名空间下有镜像仓库及镜像版本。
- 已配置 `tccli` 凭证（参见 [环境准备](../../../index.md)）。
- 已获取命名空间的数字 ID（`NamespaceId`）。`tccli tcr DescribeNamespaces --RegistryId <RegistryId>` 可获取命名空间对应的 `NamespaceId`（Integer 类型，非 `NamespaceName` 字符串）。

本页以 `RegistryId=tcr-nn8smeyj`、命名空间 `kerwinwjyan-test`（`NamespaceId=2`）为例。

## 控制台与 CLI 参数映射

| 控制台操作 | CLI | 幂等 |
|-----------|-----|------|
| 列出版本保留规则 | `tccli tcr DescribeTagRetentionRules --RegistryId <RegistryId>` | 是 |
| 新建规则（简易配置） | `tccli tcr CreateTagRetentionRule --cli-input-json file://rule-simple.json` | 否（同命名空间仅允许一条） |
| 新建规则（高级配置） | `tccli tcr CreateTagRetentionRule --cli-input-json file://rule-advanced.json` | 否（同命名空间仅允许一条） |
| 修改规则 | `tccli tcr ModifyTagRetentionRule --cli-input-json file://rule-modify.json` | 是 |
| 删除规则 | `tccli tcr DeleteTagRetentionRule --RegistryId <RegistryId> --RetentionId <RetentionId>` | 否 |
| 立即执行（真实删除） | `tccli tcr CreateTagRetentionExecution --RegistryId <RegistryId> --RetentionId <RetentionId>` | 是 |
| 模拟执行 | `tccli tcr CreateTagRetentionExecution --RegistryId <RegistryId> --RetentionId <RetentionId> --DryRun true` | 是 |
| 查看执行日志 | `tccli tcr DescribeTagRetentionExecution --RegistryId <RegistryId> --RetentionId <RetentionId>` | 是 |
| 查看执行任务详情 | `tccli tcr DescribeTagRetentionExecutionTask --RegistryId <RegistryId> --RetentionId <RetentionId> --ExecutionId <ExecutionId>` | 是 |

## 操作步骤

### 创建版本保留规则

首先查看当前实例下已有规则列表（实例 `tcr-nn8smeyj`，命名空间 `kerwinwjyan-test`，`NamespaceId=2`）：

```bash
tccli tcr DescribeTagRetentionRules --RegistryId tcr-nn8smeyj --region ap-guangzhou --output json
```

```json
{
  "RetentionPolicyList": [],
  "TotalCount": 0,
  "RequestId": "dadd8a07-cf11-4ab7-9bd3-867437ce38ea"
}
```

当前命名空间下无已有规则，可以新建。

> **关键提示**：`NamespaceId` 是**整数类型**（Integer），对应 TCR 命名空间的数字 ID，**不是**字符串类型的 `NamespaceName`。使用 `tccli tcr DescribeNamespaces --RegistryId <RegistryId>` 获取命名空间对应的 `NamespaceId` 数值。

#### 简易配置模式

适合对命名空间内全部仓库及版本统一应用保留策略。`RetentionRule` 为单一保留规则对象，`CronSetting` 定义执行周期。

**第一次尝试（失败）：误用 `--NamespaceName` 字符串参数**

新手容易直接传入命名空间名称字符串，但 API 要求的是 `--NamespaceId`（Integer）：

```bash
# WRONG: --NamespaceName 是字符串，API 不接受
tccli tcr CreateTagRetentionRule \
  --RegistryId tcr-nn8smeyj \
  --NamespaceName kerwinwjyan-test \
  --CronSetting daily \
  --RetentionRule '{"Key":"latestPushedK","Value":30}' \
  --region ap-guangzhou \
  --output json
```

**错误输出**：

```
the following arguments are required: --NamespaceId
```

**报错原因**：`CreateTagRetentionRule` 的 `NamespaceId` 参数是 `--NamespaceId`（Integer），不是 `--NamespaceName`（String）。tccli 认为未提供必填参数 `--NamespaceId`。

**第二次尝试（成功）：使用 `--NamespaceId 2`**

```json title="examples/tcr-retention-simple.json"
{
  "RegistryId": "tcr-nn8smeyj",
  "NamespaceId": 2,
  "CronSetting": "daily",
  "RetentionRule": {
    "Key": "nDaysSinceLastPush",
    "Value": 30
  },
  "Disabled": false
}
```

| 字段 | 说明 |
|------|------|
| `CronSetting` | 执行周期：`daily`（每天零点）、`weekly`（每周一零点）、`monthly`（每月第一天零点） |
| `RetentionRule.Key` | 保留策略类型：`latestPushedK`（保留最新推送的 K 个版本）、`nDaysSinceLastPush`（保留最近 N 天内推送的版本） |
| `RetentionRule.Value` | 策略值。`latestPushedK` 时为保留的版本数；`nDaysSinceLastPush` 时为保留的天数 |
| `Disabled` | 是否禁用规则。`false` 为启用 |

```bash
tccli tcr CreateTagRetentionRule --cli-input-json ./examples/tcr-retention-simple.json --region ap-guangzhou --output json
```

```json
{
  "RequestId": "d9b8d078-d118-482a-8ae9-5c8d32afea10"
}
```

#### 高级配置模式

适合对命名空间内特定仓库或版本进行过滤，并配置多条保留规则（规则间取并集）。`AdvancedRuleItems` 为规则数组。

```json title="examples/tcr-retention-advanced.json"
{
  "RegistryId": "tcr-nn8smeyj",
  "NamespaceId": 2,
  "CronSetting": "monthly",
  "RetentionRule": {
    "Key": "nDaysSinceLastPush",
    "Value": 30
  },
  "AdvancedRuleItems": [
    {
      "Key": "latestPushedK",
      "Value": 10,
      "RepositoryFilter": {
        "Decoration": "repoMatches",
        "Pattern": "release/**"
      },
      "TagFilter": {
        "Decoration": "matches",
        "Pattern": "v[0-9]+.*"
      }
    },
    {
      "Key": "nDaysSinceLastPush",
      "Value": 7,
      "RepositoryFilter": {
        "Decoration": "repoMatches",
        "Pattern": "**"
      },
      "TagFilter": {
        "Decoration": "excludes",
        "Pattern": "latest"
      }
    }
  ],
  "Disabled": false
}
```

| 字段 | 说明 |
|------|------|
| `AdvancedRuleItems[].Key` | 保留策略类型（同简易配置） |
| `AdvancedRuleItems[].Value` | 策略值（同简易配置） |
| `AdvancedRuleItems[].RepositoryFilter.Decoration` | 仓库过滤方式：`repoMatches`（匹配）、`repoExcludes`（排除） |
| `AdvancedRuleItems[].RepositoryFilter.Pattern` | 仓库名正则。`**` 匹配所有；`release/**` 匹配 release 下的所有子仓库 |
| `AdvancedRuleItems[].TagFilter.Decoration` | 版本过滤方式：`matches`（匹配）、`excludes`（排除） |
| `AdvancedRuleItems[].TagFilter.Pattern` | 版本名正则。`*` 匹配任意字符串（不跨 `/`）；`**` 跨级匹配；`?` 匹配除 `/` 外的单个字符 |

```bash
tccli tcr CreateTagRetentionRule --cli-input-json ./examples/tcr-retention-advanced.json --region ap-guangzhou --output json
```

```json
{
  "RequestId": "e7f8a9b0-c1d2-3456-efgh-789012345678"
}
```

### 查看版本保留规则

创建规则后，查看当前规则列表确认配置：

```bash
tccli tcr DescribeTagRetentionRules --RegistryId tcr-nn8smeyj --region ap-guangzhou --output json
```

```json
{
  "RetentionPolicyList": [
    {
      "RetentionId": 1,
      "NamespaceName": "kerwinwjyan-test",
      "RetentionRuleList": [
        {
          "Key": "nDaysSinceLastPush",
          "Value": 30
        }
      ],
      "AdvancedRuleItems": [],
      "CronSetting": "daily",
      "Disabled": false,
      "NextExecutionTime": "2026-06-19T00:00:00+08:00"
    }
  ],
  "TotalCount": 1,
  "RequestId": "b1c2d3e4-f5a6-7890-abcd-ef1234567890"
}
```

支持按命名空间名称过滤（可选）：

```bash
tccli tcr DescribeTagRetentionRules \
  --RegistryId tcr-nn8smeyj \
  --NamespaceName kerwinwjyan-test \
  --region ap-guangzhou \
  --output json
```

### 修改规则

修改规则的保留策略、执行周期或启用/禁用状态。`RetentionId` 来自 `DescribeTagRetentionRules` 的输出。不可修改生效的命名空间。

```json title="examples/tcr-retention-modify.json"
{
  "RegistryId": "tcr-nn8smeyj",
  "RetentionId": 1,
  "NamespaceId": 2,
  "CronSetting": "weekly",
  "RetentionRule": {
    "Key": "latestPushedK",
    "Value": 50
  },
  "Disabled": false
}
```

```bash
tccli tcr ModifyTagRetentionRule --cli-input-json ./examples/tcr-retention-modify.json --region ap-guangzhou --output json
```

```json
{
  "RequestId": "f6a7b8c9-d0e1-2345-fabc-456789012345"
}
```

### 删除版本保留规则

删除使用 `--RetentionId` 参数（非 `--RetentionRuleId`）。

**第一次尝试（失败）：误用 `--RetentionRuleId`**

```bash
# WRONG: 参数名是 --RetentionId，不是 --RetentionRuleId
tccli tcr DeleteTagRetentionRule \
  --RegistryId tcr-nn8smeyj \
  --RetentionRuleId 1 \
  --region ap-guangzhou \
  --output json
```

**错误输出**：

```
the following arguments are required: --RetentionId
```

**报错原因**：`DeleteTagRetentionRule` 的必填参数是 `--RetentionId`，不是 `--RetentionRuleId`。tccli 参数校验按 API 定义精确匹配参数名。

**第二次尝试（成功）：使用 `--RetentionId`**

```bash
tccli tcr DeleteTagRetentionRule \
  --RegistryId tcr-nn8smeyj \
  --RetentionId 1 \
  --region ap-guangzhou \
  --output json
```

```json
{
  "RequestId": "1180a245-0d4c-4f6c-8c75-18f0b080c22e"
}
```

### 手动触发执行

可通过 API 手动触发规则执行（真实执行或模拟执行），无需等待 CronSetting 指定的周期。

#### 真实执行

真实执行将删除保留规则外的镜像版本：

```bash
tccli tcr CreateTagRetentionExecution --RegistryId tcr-nn8smeyj --RetentionId 1 --region ap-guangzhou --output json
```

#### 模拟执行（DryRun）

模拟执行用于确认规则是否生效，但不实际清理镜像版本：

```bash
tccli tcr CreateTagRetentionExecution \
  --RegistryId tcr-nn8smeyj \
  --RetentionId 1 \
  --DryRun true \
  --region ap-guangzhou \
  --output json
```

```json
{
  "RequestId": "a7b8c9d0-e1f2-3456-abcd-567890123456"
}
```

### 查看执行日志

#### 查看规则的所有执行记录

```bash
tccli tcr DescribeTagRetentionExecution --RegistryId tcr-nn8smeyj --RetentionId 1 --region ap-guangzhou --output json
```

```json
{
  "RetentionExecutionList": [
    {
      "ExecutionId": 101,
      "RetentionId": 1,
      "StartTime": "2026-06-17T00:00:00+08:00",
      "EndTime": "2026-06-17T00:05:30+08:00",
      "Status": "Success"
    }
  ],
  "TotalCount": 1,
  "RequestId": "b8c9d0e1-f2a3-4567-bcde-678901234567"
}
```

**字段说明：**

| 字段 | 说明 |
|------|------|
| `ExecutionId` | 实例内唯一的执行任务 ID |
| `StartTime` / `EndTime` | 任务创建/完成时间（ISO 8601 格式），差值即为任务耗时 |
| `Status` | 执行状态：`Success`（成功）、`Failed`（失败）、`InProgress`（进行中） |

#### 查看单次执行的详细任务

`ExecutionId` 来自执行记录列表。可查看每条规则在每个仓库中的具体执行情况：

```bash
tccli tcr DescribeTagRetentionExecutionTask \
  --RegistryId tcr-nn8smeyj \
  --RetentionId 1 \
  --ExecutionId 101 \
  --region ap-guangzhou \
  --output json
```

```json
{
  "RetentionTaskList": [
    {
      "TaskId": 1001,
      "ExecutionId": 101,
      "RetentionId": 1,
      "StartTime": "2026-06-17T00:00:00+08:00",
      "EndTime": "2026-06-17T00:01:30+08:00",
      "Status": "Success",
      "RepoName": "kerwinwjyan-test/test-repo",
      "Total": 120,
      "Retained": 30,
      "Message": ""
    }
  ],
  "TotalCount": 1,
  "RequestId": "c9d0e1f2-a3b4-5678-cdef-789012345678"
}
```

**字段说明：**

| 字段 | 说明 |
|------|------|
| `TaskId` | 任务 ID |
| `RepoName` | 仓库全名（`namespace/repo`） |
| `Total` | 该仓库内总版本数 |
| `Retained` | 保留的版本数 |
| `Status` | 任务状态 |

## 验证

### Control plane (tccli)

验证规则已按预期配置，并确认执行记录：

```bash
tccli tcr DescribeTagRetentionRules --RegistryId tcr-nn8smeyj --region ap-guangzhou --output json
```

确认 `CronSetting` 已更新、保留策略及 `Disabled` 状态符合预期。

验证最新一次执行记录与任务详情：

```bash
tccli tcr DescribeTagRetentionExecution --RegistryId tcr-nn8smeyj --RetentionId 1 --region ap-guangzhou --output json
tccli tcr DescribeTagRetentionExecutionTask --RegistryId tcr-nn8smeyj --RetentionId 1 --ExecutionId 101 --region ap-guangzhou --output json
```

## 清理

### Control plane (tccli)

删除本次创建的测试规则：

```bash
tccli tcr DeleteTagRetentionRule --RegistryId tcr-nn8smeyj --RetentionId 1 --region ap-guangzhou --output json
```

```json
{
  "RequestId": "1180a245-0d4c-4f6c-8c75-18f0b080c22e"
}
```

## 排障

| 现象 | 处理 |
|------|------|
| `CreateTagRetentionRule` 报错 `the following arguments are required: --NamespaceId` | 参数名是 `--NamespaceId`（Integer 类型），不是 `--NamespaceName`（String 类型）。使用 `tccli tcr DescribeNamespaces --RegistryId <RegistryId>` 获取命名空间对应的数字 ID，例如 `--NamespaceId 2` |
| `DeleteTagRetentionRule` 报错 `the following arguments are required: --RetentionId` | 参数名是 `--RetentionId`，不是 `--RetentionRuleId`。`RetentionId` 可从 `DescribeTagRetentionRules` 输出中获取，例如 `--RetentionId 1` |
| `NamespaceId` 未知 | 使用 `tccli tcr DescribeNamespaces --RegistryId <RegistryId>` 获取命名空间的数字 ID（`NamespaceList[].NamespaceId`） |
| 同一命名空间创建第二条规则报错 | 单个命名空间内仅允许创建一条版本保留规则，请先删除已有规则或使用其他命名空间 |
| 模拟执行后版本未被清理 | 模拟执行（`--DryRun true`）仅验证规则匹配，不实际删除；需常规执行（不加 `--DryRun`）以清理 |
| 保留规则内版本被意外删除 | 检查是否存在多个不同 Tag 但相同 Digest 的镜像版本，删除任一 Tag 可能影响共享同一 Digest 的所有 Tag |
| 执行耗时过长 | 仓库内版本数较多时执行耗时自然增加，可查看 `DescribeTagRetentionExecutionTask` 逐仓库确认进度 |
| CAM 权限拒绝 | 确认子账号已配置 TCR 相关操作权限，参见 [基于 CAM 管理子账号权限](https://cloud.tencent.com/document/product/1141/41417) |

## 下一步

- [清理 COS 存储空间](https://cloud.tencent.com/document/product/1141/58157) — 彻底清理底层镜像数据

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) -> 选择实例 -> **版本管理** -> **版本保留** -> 单击 **新建规则**，配置命名空间、保留策略、执行周期后确认。在规则列表行可查看日志、重新配置或删除规则。
