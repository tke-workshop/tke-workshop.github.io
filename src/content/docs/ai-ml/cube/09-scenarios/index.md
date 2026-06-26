---
title: "场景实践"
---

# 场景实践

本文档目录介绍 TKE Cube Agent Sandbox 在典型 Agent 场景中的参考架构和落地方式。

## 场景清单

| 文档 | 适用场景 | 重点能力 |
| --- | --- | --- |
| [构建 AI Coding 执行环境](01-ai-coding-sandbox.md) | AI 编程助手、云端 IDE、代码生成和自动修复 | 自定义镜像、Git 凭证、工作区持久化、端口预览、测试执行 |
| [构建常驻型 Cloud Agent 工作空间](02-cloud-agent-workspace.md) | 员工 Agent、长期会话 Agent、自主代理、类 OpenClaw 工作空间 | 长生命周期、暂停恢复、持久化、工具调用、凭证和审计 |
| [在自有 TKE 集群中交付 Agent Platform 执行面](03-agent-platform-byoc.md) | Agent 平台 BYOC、自部署、企业私有化交付 | 控制面/执行面解耦、租户隔离、配额、网络、存储和运维 |

## 场景文档和操作文档的关系

操作文档回答“如何配置一个对象”，场景文档回答“为什么这样组合这些对象”。

建议先阅读 [产品介绍](../01-overview.md) 和 [快速开始](../02-quick-start.md)，再根据业务类型选择对应场景文档。

## 选型建议

| 业务形态 | 推荐阅读 |
| --- | --- |
| 需要让 Agent clone 代码、修改文件、运行测试和生成 diff | AI Coding 执行环境 |
| 需要为每个用户保留长期工作区、工具状态和会话上下文 | Cloud Agent 工作空间 |
| 需要把底层执行环境交付到客户自有 TKE 集群中 | Agent Platform BYOC |
| 需要严格控制出网、凭证和审计 | Cloud Agent 工作空间、Agent Platform BYOC |
