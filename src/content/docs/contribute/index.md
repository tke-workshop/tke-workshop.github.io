---
title: 贡献与 Agent-First 规范
description: 编写可被人和 Agent 共同使用的 Workshop 内容。
---

# 贡献与 Agent-First 规范

Workshop 内容既服务工程师，也服务 AI Agent。贡献内容时，请优先保证结构清晰、示例可运行、验证路径明确。

## 文档结构

操作型文档建议包含：

- 功能概述。
- 前置条件。
- 参数表。
- 操作步骤。
- 验证步骤。
- 异常处理。
- Agent Prompt 模板。
- Cookbook 链接。

## Cookbook 要求

可执行脚本应包含：

- 明确的 CLI 参数。
- `config.example.yaml` 示例。
- 具体异常处理。
- 结构化日志。
- `--wait` 或验证命令。

## 维护说明

当前站点使用 Astro + Starlight。新增或修改页面时，请在 `src/content/docs` 中维护内容，并同步检查内链、代码块、Cookbook 回链和移动端阅读体验。
