---
title: "TKE Cube Agent Sandbox"
---

# TKE Cube Agent Sandbox 文档

TKE Cube Agent Sandbox 是面向 AI Agent、代码解释器、自动化任务和企业插件执行场景的安全沙箱运行环境。您可以在 TKE 集群的原生节点池中启用 Micro-VM 沙箱能力，通过 E2B 兼容 SDK 或 Kubernetes 声明式资源创建、运行和管理沙箱实例。

## 产品能力

- Micro-VM 级隔离：为每个沙箱实例提供独立执行边界，适合运行不可信代码、工具调用和插件任务。
- 快速创建：基于 SandboxTemplate 和 Warm Pool 机制减少环境准备时间，适合高频短任务和交互式 Agent。
- Kubernetes 原生：通过 SandboxTemplate、SandboxClaim、SandboxGateway 等资源管理模板、实例、入口和策略。
- E2B 兼容：支持使用 E2B 兼容 SDK 创建沙箱、执行代码、读写文件和销毁实例。
- 网络与存储治理：支持内网/公网入口、控制面与数据面流量分离、出网控制和共享存储挂载。
- 可观测与运维：提供实例状态、事件、日志、创建耗时、节点容量和故障原因。

## 文档目录

| 文档 | 说明 |
| --- | --- |
| [产品介绍](01-overview.md) | 了解产品定位、核心特性和适用场景 |
| [快速开始](02-quick-start.md) | 从启用能力到运行第一段代码 |
| [生命周期管理](03-lifecycle-management.md) | 创建、查询、释放、TTL 回收和强制销毁沙箱 |
| [存储配置](04-storage.md) | 为沙箱挂载临时存储和共享存储 |
| [网络配置](05-network.md) | 配置 SandboxGateway、访问入口和出网策略 |
| [可观测性](06-observability.md) | 查看状态、事件、日志、指标和告警 |
| [生产配置建议](07-best-practices.md) | 生产环境建议、容量、隔离、安全和成本优化 |
| [FAQ](08-faq.md) | 常见问题和排障建议 |
| [场景实践](scenarios/index.md) | AI Coding、Cloud Agent 工作空间和 Agent Platform BYOC 场景参考 |

## 基本使用流程

1. 在 TKE 集群中安装 Cube Agent Sandbox 插件。
2. 在原生节点池中启用 Micro-VM 沙箱高级特性。
3. 创建 SandboxTemplate，定义镜像、资源、端口、环境变量和存储挂载。
4. 创建 Warm Pool，预热常用执行环境。
5. 创建 SandboxGateway，配置内网或公网访问入口。
6. 创建 Team 和 API Key。
7. 使用 E2B 兼容 SDK 或 SandboxClaim 创建沙箱并执行任务。
