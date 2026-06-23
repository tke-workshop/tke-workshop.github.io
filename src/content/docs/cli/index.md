---
title: "面向 Agent · CLI 操作指南"
description: "通过 tccli 和产品 CLI (tkectl/tcrctl) 以 Agent-Native 方式操作腾讯云 TKE 和 TCR。"
---

本模块提供 TKE 和 TCR 的 **Agent-Native CLI 操作文档**。每篇文档面向两类读者：

- **人类工程师** — 精确的 `tccli` 命令示例、参数表、真实输出
- **LLM Agent** — 结构化 JSON 输出、稳定退出码、`--dry-run` 验证

## 两层命令模型

| 层 | 命令 | 说明 |
|----|------|------|
| **L0 — API 直通** | `tccli {tke\|tcr} {Action}` | 覆盖全部 386 个接口，零遗漏 |
| **L1 — 产品 CLI** | `tkectl` / `tcrctl` | 任务导向，带状态轮询和 teaching errors |

当前阶段：L0 (tccli) 文档已完成并验证，L1 (产品 CLI) 为 **P1 占位页**。

## 环境准备

以下步骤只需执行一次，适用于所有 CLI 操作页。

### 安装 tccli

```bash
pip install tccli
tccli --version
```

### 配置凭证与地域

```bash
tccli configure set secretId <SecretId> secretKey <SecretKey> region ap-guangzhou
```

或交互式：

```bash
tccli configure
```

### 凭证优先级

同一设置在多处出现时，`tccli` 按以下优先级解析：

1. **命令行参数** (最高)
2. **`~/.tccli/default.configure`** (配置文件)
3. **环境变量** (`TENCENTCLOUD_SECRET_ID`, `TENCENTCLOUD_SECRET_KEY`, `TENCENTCLOUD_REGION`, …)

### VPC 前置检查

许多 TKE 创建流程需要已有 VPC 和子网，操作前先确认：

```bash
tccli vpc DescribeVpcs --region ap-guangzhou --output json
tccli vpc DescribeSubnets --region ap-guangzhou --output json
```

### CAM 和计费

- 完成实名认证，授予 TKE/CVM/VPC CAM 角色
- 确认配额与计费：[TKE 计费说明](https://cloud.tencent.com/document/product/457/9082)
- TCR 计费参考：[TCR 计费概述](https://cloud.tencent.com/document/product/1141/40540)

## tccli 命令契约

所有任务页遵循以下契约：

- **JSON bridge** 模式：写命令使用 `--cli-input-json file://examples/...` 传入模板
- **waiter 模式**：异步操作通过 `Describe*` + 状态字段轮询等待完成
- **`--generate-cli-skeleton`**：按需查看完整参数树（参考用，非运行时依赖）

## 开始使用

- **[tccli on TKE](./tke/)** — TKE tccli 操作（即将发布）
- **[tccli on TCR](./tcr/)** — TCR tccli 操作
- **tkectl** — 产品 CLI，统一 TKE+TCR 的任务级命令（即将发布）
