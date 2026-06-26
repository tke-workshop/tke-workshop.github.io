---
title: "产品介绍"
---

# 产品介绍

## 什么是 TKE Cube Agent Sandbox

TKE Cube Agent Sandbox 是 TKE 提供的安全沙箱执行环境。它基于 Cube Micro-VM 技术，在 TKE 原生节点池中为 AI Agent、代码解释器、自动化任务、在线代码执行和企业插件平台提供快速、隔离、可治理的运行时。

启用后，您可以继续使用 TKE 的集群、节点池、网络、存储、权限和可观测体系，同时获得适合 Agent 执行场景的沙箱能力。

## 核心特性

### Micro-VM 级隔离

每个沙箱实例运行在独立 Micro-VM 环境中，相比普通容器具备更强的隔离边界，适合执行来自用户、模型或第三方插件的不可信代码。

### 快速创建和预热

您可以通过 SandboxTemplate 定义执行环境，通过 Warm Pool 预热常用模板。当 Agent 需要运行代码或工具时，系统可从预热池快速分配沙箱，减少镜像准备和环境初始化时间。

### E2B 兼容接入

产品提供 E2B 兼容 API。您可以在应用中使用 E2B 兼容 SDK 创建沙箱、执行代码、读写文件并销毁实例，降低从自建沙箱或 E2B 生态迁移的改造成本。

### Kubernetes 声明式管理

您可以通过 Kubernetes CRD 管理沙箱资源：

- `SandboxTemplate`：定义镜像、资源、端口、环境变量和存储挂载。
- `SandboxClaim`：从模板或预热池领取沙箱实例。
- `SandboxGateway`：配置控制面和数据面访问入口。
- `SandboxTeam`：定义租户边界、配额和 API Key。
- `SandboxNetworkPolicy`：配置出入方向网络策略。

### 网络、存储和安全治理

产品支持控制面和数据面流量分离，默认使用内网入口。您可以按需开启公网入口，并配置域名、证书、安全组、来源白名单和出网策略。沙箱可挂载临时存储或共享存储，满足任务型执行和工作空间场景。

### 可观测与运维

您可以查看插件、节点池、节点、模板、预热池和沙箱实例状态。系统提供事件、日志、创建耗时、运行数量、失败原因和节点容量水位，帮助您定位镜像、资源、网络、网关和 runtime 问题。

## 适用场景

| 场景 | 说明 |
| --- | --- |
| Code Interpreter | 为 Agent 提供 Python、Shell 等代码执行环境 |
| AI 编程助手 | 为代码生成、测试、构建和调试任务提供隔离执行环境 |
| 企业 Agent 平台 | 将 Cube 作为企业 Agent 控制面的安全执行面 |
| 在线代码执行 | 运行用户提交的代码、脚本或插件 |
| Agent 批量评测 | 批量创建隔离环境进行任务采样、验证和评测 |
| 自动化运维 | 在隔离环境中执行临时命令、诊断脚本和工具调用 |

## 产品架构

```text
用户应用 / Agent 平台
        |
        | E2B 兼容 SDK / Kubernetes CRD
        v
SandboxGateway
        |
        v
Cube Agent Sandbox 控制面
        |
        v
TKE 原生节点池 + Cube Micro-VM Runtime
        |
        v
Sandbox 实例
```

## 主要对象

| 对象 | 作用 |
| --- | --- |
| Cube Agent Sandbox 插件 | 在 TKE 集群中安装控制面、CRD、网关和节点组件 |
| 原生节点池高级特性 | 在指定节点池启用 Micro-VM 沙箱能力 |
| SandboxTemplate | 定义沙箱执行环境 |
| Warm Pool | 预热一组可快速分配的沙箱实例 |
| SandboxClaim | 声明式领取一个沙箱实例 |
| SandboxGateway | 管理 API 控制面和沙箱数据面入口 |
| SandboxTeam | 管理租户、配额和 API Key |
| SandboxNetworkPolicy | 管理沙箱出入方向网络访问 |
