---
title: "清理 COS 存储空间（tccli）"
description: "· page_id `58157`"
---

> 对照官方：[清理 COS 存储空间](https://cloud.tencent.com/document/product/1141/58157) · page_id `58157`

## 概述

TCR 企业版实例的容器镜像数据存储在腾讯云对象存储（COS）中。当通过控制台或 API 删除镜像 Tag 或清空仓库时，仅移除镜像元数据索引，底层 COS 中已无引用的镜像层（blob）数据并不会被立即回收——这些孤立 blob 持续占用 COS 存储空间并产生费用。

GC（Garbage Collection，垃圾回收）作业负责清理 COS 中已无任何镜像 Tag 引用的 blob 数据，释放存储空间。支持两种触发方式：

| 触发方式 | `Schedule.Type` | 说明 |
|---------|-----------------|------|
| **手动触发** | `Manual` | 通过 `CreateGCJob` API 即时触发一次 GC |
| **定期自动** | `Scheduled` | 实例级别周期性自动执行 |

**GC 作业状态机**：`running`（执行中）→ `finished`（成功完成） / `failed`（执行失败）。

> **注意**：
> - GC 过程仅清理 COS 存储层中无引用的 blob。对于仍被镜像 Tag 引用的数据、或已被 [版本保留规则](../auto-delete) 删除 Tag 但未执行 GC 的 blob，需先确保无引用后再触发 GC。
> - 执行 GC 期间不影响正常镜像推拉。

## 前置条件

- 已 [创建企业版实例](../../create)，实例状态为 `Running`。
- 已配置 `tccli` 凭证（参见 [环境准备](../../../index.md)）。
- 建议在执行 GC 前完成需要清理的镜像 Tag 删除操作（参见 [自动删除镜像版本](../auto-delete)），确保目标 blob 已无引用。
- 若使用子账号操作，需授予实例操作权限，参见 [企业版授权方案示例](https://cloud.tencent.com/document/product/1141/41417)。

## 控制台与 CLI 参数映射

| 控制台操作 | CLI | 幂等 |
|-----------|-----|------|
| 立即执行清理 | `tccli tcr CreateGCJob --RegistryId <RegistryId>` | 否（并发限制） |
| 模拟运行清理 | （CLI 不支持模拟模式，控制台独占） | — |
| 查看 GC 作业列表 | `tccli tcr DescribeGCJobs --RegistryId <RegistryId>` | 是 |
| 终止进行中的 GC | `tccli tcr TerminateGCJob --RegistryId <RegistryId> --JobId <JobId>` | 是 |

## 操作步骤

### 1. 触发 GC 作业

`CreateGCJob` 无额外参数——仅需传入 `RegistryId` 即可触发一次即时 GC（`Schedule.Type` 为 `Manual`）。该操作不支持并发：若实例已有 `running` 状态的 GC 作业，需等待其完成或终止后再触发。

```bash
tccli tcr CreateGCJob \
  --RegistryId '<RegistryId>' \
  --region <Region>
```

```output
{
    "RequestId": "b0a6db6b-5d88-47b7-a040-9515aac67ae5"
}
```

`CreateGCJob` 返回体仅包含 `RequestId`，不直接返回 `JobId`。需通过下一步 `DescribeGCJobs` 获取 GC 作业 ID 及状态。

### 2. 查看 GC 作业状态

触发 GC 后，使用 `DescribeGCJobs` 查询当前实例的 GC 作业列表：

```bash
tccli tcr DescribeGCJobs \
  --RegistryId '<RegistryId>' \
  --region <Region>
```

```output
{
    "Jobs": [
        {
            "ID": 8,
            "JobStatus": "running",
            "Schedule": {
                "Type": "Manual"
            },
            "CreationTime": "2026-06-16T10:30:00+08:00",
            "UpdateTime": "2026-06-16T10:30:05+08:00"
        }
    ],
    "RequestId": "1c616ba0-088e-49ee-8ac4-ab2085e952c8"
}
```

**Jobs 数组字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `ID` | Integer | GC 作业唯一标识 ID |
| `JobStatus` | String | 作业状态：`running`（执行中）、`finished`（已完成）、`failed`（失败） |
| `Schedule.Type` | String | 触发方式：`Manual`（手动触发）、`Scheduled`（定期自动） |
| `CreationTime` | String | 作业创建时间（ISO 8601） |
| `UpdateTime` | String | 作业状态最近更新时间（ISO 8601） |

**轮询等待 GC 完成**：可编写简单轮询脚本等待 GC 结束：

```bash
# 等待 GC 作业完成（示例 JobId=8）
while true; do
  STATUS=$(tccli tcr DescribeGCJobs --RegistryId '<RegistryId>' --region <Region> \
    | jq -r '.Jobs[] | select(.ID == 8) | .JobStatus')
  echo "GC Job 8 status: $STATUS"
  case "$STATUS" in
    finished|failed) break ;;
  esac
  sleep 10
done
```

### 3. 终止 GC 作业

若 GC 作业执行时间过长，可使用 `TerminateGCJob` 终止。`--JobId` 为整数类型，来自 `DescribeGCJobs` 输出中的 `Jobs[].ID` 字段：

```bash
tccli tcr TerminateGCJob \
  --RegistryId '<RegistryId>' \
  --JobId 8 \
  --region <Region>
```

```output
{
    "RequestId": "c2d3e4f5-a6b7-8901-cdef-1234567890ab"
}
```

终止后，`DescribeGCJobs` 中对应的 `JobStatus` 变更为 `finished`。

## 验证

### Control plane (tccli)

触发 GC 后，验证作业是否成功完成：

```bash
tccli tcr DescribeGCJobs \
  --RegistryId '<RegistryId>' \
  --region <Region>
```

确认目标 GC 作业 `JobStatus` 为 `finished`。若为 `failed`，参考 [排障](#排障) 章节排查。

**验证存储空间释放效果**：可在控制台实例概览页查看存储用量变化，或使用 COS 控制台查看对应 Bucket 的存储量变化（存在延迟，建议等待数小时后再对比）。

## 清理

GC 作业本身即为清理操作，完成后自动结束，无需额外清理。若触发的是测试性 GC（仅验证流程），可在作业完成后忽略。

## 排障

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateGCJob` 返回 `InternalError` 或提示 "GC job already running" | `tccli tcr DescribeGCJobs --RegistryId <RegistryId> --region <Region>` 检查 `JobStatus` | 实例已有 GC 作业在运行中，不允许并发触发 | 等待当前 GC 完成（`JobStatus` 变为 `finished`/`failed`），或使用 `TerminateGCJob` 终止后重试 |
| `DescribeGCJobs` 返回空 `Jobs` 数组 | 确认实例为企业版、且存在镜像数据变更 | 无已完成的镜像删除操作则无孤立 blob 可清理，或 GC 作业已过期被清理 | 确认存在已删除 Tag 但未 GC 的镜像数据，或该情况属正常——空列表表示无待清理数据 |
| `TerminateGCJob` 提示 "Job not found" | `tccli tcr DescribeGCJobs --RegistryId <RegistryId> --region <Region>` 确认 `--JobId` | `--JobId` 不正确，或作业已结束（`finished`/`failed`） | 从 `DescribeGCJobs` 重新确认正确的 Job ID |
| GC 作业 `JobStatus=failed` | `tccli tcr DescribeGCJobs --RegistryId <RegistryId> --region <Region>` 查看失败作业详情 | COS API 调用异常、权限不足或 COS Bucket 配置问题 | 重试 `CreateGCJob`。若持续失败，检查实例关联的 COS Bucket 是否存在且可访问；通过 [提交工单](https://console.cloud.tencent.com/workorder/category) 获取技术支持 |
| GC 作业长时间处于 `running` | 轮询 `DescribeGCJobs` 观察持续时间 | 实例内镜像规模较大，孤立 blob 数量多，清理耗时较长 | 耐心等待。单次 GC 执行时间取决于 blob 数量。若超过 2 小时仍无进展，可 `TerminateGCJob` 终止后重新触发 |
| CAM 权限拒绝 | — | 子账号缺少 `tcr:CreateGCJob` / `tcr:DescribeGCJobs` / `tcr:TerminateGCJob` 权限 | 为子账号配置对应 API 权限，参见 [基于 CAM 管理子账号权限](https://cloud.tencent.com/document/product/1141/41417) |
| GC 完成后存储空间未明显减少 | 对比 GC 前后控制台存储用量或 COS Bucket 容量 | 若实例中本无大量孤立 blob（如未删除过镜像或已定期自动 GC），清理量极小属正常 | 确认确实存在大量已删除引用但未 GC 的 blob 后再评估，或等待 COS 用量指标更新（存在计费延迟） |

## 下一步

- [自动删除镜像版本](../auto-delete) -- 配置版本保留规则，定期清理过期 Tag
- [管理镜像仓库](../../image-creation/repository) -- 删除不需要的镜像仓库及 Tag

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) -> 选择实例 -> 左侧导航栏 **制品清理** -> 单击 **立即执行清理** 手动触发 GC，或单击 **模拟运行清理** 先预览可清理数据量。在制品清理页面可查看历史 GC 任务列表及执行状态。
