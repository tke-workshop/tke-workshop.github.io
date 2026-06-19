---
title: "Cube on Kubernetes：K8s 做运维底座，Cube 负责 Sandbox 快路径"
---

# Cube on Kubernetes：K8s 做运维底座，Cube 负责 Sandbox 快路径

## 摘要

Agent 应用正在把 sandbox 从“可选隔离手段”变成基础设施能力。过去我们习惯用 Pod、容器或虚拟机承载代码执行环境，但在高频创建、短生命周期、暂停恢复、模板预热和不可信代码隔离等场景下，传统 Kubernetes Pod 生命周期并不总是最合适的抽象。

本文讨论一种更适合 Agent Sandbox 的边界划分：Kubernetes 负责部署、节点、监控、日志、升级和资源池运维；Cube 负责 sandbox 创建、执行、暂停恢复、模板预热和 PVM/Micro-VM 隔离。换句话说，K8s 做运维底座，Cube 负责沙箱快路径。

## Agent 让 Sandbox 变成基础设施

随着 Agent、代码解释器、浏览器自动化、数据分析助手和自动化运维任务越来越多，应用不再只是调用模型，还需要动态创建一个可以执行代码、访问工具、处理文件、调用网络资源的隔离环境。

这个环境通常有几个特点：

- 生命周期短，可能只存在几秒到几分钟。
- 创建频率高，单个 Agent 任务可能多次创建执行环境。
- 执行内容不完全可信，需要强隔离。
- 需要直接的 API，例如 `run_code`、`exec`、文件上传下载、端口访问。
- 可能需要暂停、恢复、快照和模板预热。

如果只是“跑一个长期服务”，Pod 是非常自然的抽象。但如果目标是“快速创建一个可执行的安全沙箱”，Pod 生命周期就不一定是最短路径。

## 常见误区：把 Sandbox 等同于 Pod

在 Kubernetes 体系里，一个自然想法是：既然要在集群里创建隔离环境，那就把每个 sandbox 做成一个 Pod。

这种方式有明显好处：

- 可以复用 Kubernetes API。
- 可以复用 scheduler、kubelet、CNI、ServiceAccount 等机制。
- 企业已有的运维和治理体系更容易接入。

但它也会带来一些不适合 Agent Sandbox 的问题。

首先，Pod 创建路径天然较长。一次 sandbox 创建要经过 kube-apiserver、scheduler、kubelet、CRI/runtime、CNI 等多个组件。对普通在线服务来说，这个路径是合理的；对高频短任务来说，它可能成为主要延迟来源。

其次，Pod 生命周期和 Agent Sandbox 生命周期并不完全一致。Agent 关心的是：创建一个沙箱、执行一段代码、保存或丢弃状态、暂停或恢复、暴露某个运行时端口。Pod 关心的是：声明式期望、容器状态、调度、重启策略、Service 发现。这两套语义有重叠，但不是一回事。

第三，Cube 的一些核心能力并不适合被完全压进 Pod 语义里。例如模板预热、Micro-VM 快速创建、PVM 隔离、快照恢复、运行时代码执行 API，这些能力更像一个 sandbox runtime 控制面，而不是传统工作负载编排。

所以问题不是“Kubernetes 好不好”，而是：**每个 sandbox 的生命周期是否必须由 Kubernetes API 承担。**

## 推荐边界：K8s 管系统，Cube 管沙箱

更合理的方式是把边界拆开。

Kubernetes 负责系统层能力：

- 部署 Cube 控制面。
- 部署节点侧 Daemon。
- 管理节点池和节点标签。
- 做健康检查、升级和回滚。
- 接入 Prometheus、日志、告警和审计。
- 提供基础资源池和运维体系。

Cube 负责 sandbox 运行时能力：

- 创建和销毁 sandbox。
- 模板预热和版本管理。
- `run_code` / `exec` / 文件操作。
- 暂停、恢复、快照。
- PVM / Micro-VM 隔离。
- sandbox 网络入口和端口访问。

这不是绕开 Kubernetes，而是让 Kubernetes 做它擅长的事，让 Cube 做它擅长的事。

## 为什么不强行走 K8s API

不强行走 K8s API，主要有四个原因。

第一，Agent Sandbox 需要快路径。

Agent 的一次工具调用或代码执行，可能只需要几十毫秒到几百毫秒的执行时间。如果创建环境本身要走完整 Pod 调度路径，端到端体验会被拉长。Cube 可以围绕模板预热、运行时复用和 sandbox API 设计更短路径。

第二，Sandbox API 更贴近 Agent 开发者。

Agent 应用开发者通常希望调用：

```text
CreateSandbox
RunCode
UploadFile
ExposePort
Pause
Resume
DestroySandbox
```

而不是直接操作：

```text
Pod
Job
Service
Ingress
Exec subresource
```

后者适合平台工程团队，前者更适合 Agent 应用。

第三，Cube 的优势在 runtime，而不是把自己伪装成 Pod。

Cube 的价值在于快速创建 sandbox、模板预热、PVM/Micro-VM 隔离、暂停恢复、高密和复用。如果强行把 Cube 完全包装成 Pod runtime，很多能力会被 Kubernetes 工作负载模型稀释。

第四，计算节点可以更干净。

对于专用 sandbox 节点，Cube 可以直接管理 VMM、网络、存储和运行时生命周期。Kubernetes 仍然可以负责部署和运维，但不必参与每个 sandbox 的创建路径。这样节点上的职责更清晰，也更容易围绕 sandbox 隔离模型优化。

## 这对 Kubernetes 用户有什么好处

这种方式不是让用户离开 Kubernetes。相反，它让已有 Kubernetes 用户用更低成本获得 Agent Sandbox 能力。

用户仍然可以复用：

- 已有集群和节点资源。
- 监控、日志、告警体系。
- 镜像仓库和发布流程。
- 权限和运维流程。
- 节点扩缩容能力。

变化只是：Agent Sandbox 的运行时生命周期，不再强行建模为 Pod，而是交给 Cube API 或 E2B 兼容 API。

这对已有 Kubernetes 资源池的客户尤其重要。他们不一定希望迁移到全新的 Serverless 平台，也不一定希望把不可信 Agent 代码继续放在普通容器里。Cube on Kubernetes 提供了一个折中路径：资源和运维体系仍然在自己熟悉的环境里，sandbox 运行时能力交给更合适的系统。

## 实践架构

一个推荐的整体架构如下：

```text
Agent / Application
        |
        v
Cube API / E2B-compatible API
        |
        v
Cube Control Plane on Kubernetes
        |
        v
Cube Node Daemon on dedicated nodes
        |
        v
PVM / Micro-VM Sandbox
```

Kubernetes 负责：

```text
Deploy control plane
Deploy node daemon
Manage nodes
Expose gateway
Collect metrics
Collect logs
Handle upgrades
```

Cube 负责：

```text
Create sandbox
Warm template
Run code
Pause / resume
Route sandbox traffic
Destroy sandbox
```

这个架构的关键点是：Kubernetes 参与系统运维，但不参与每个 sandbox 的快路径。

## 后续最佳实践方向

要把这套模式真正沉淀为社区最佳实践，还需要继续补齐几类内容：

- 一键部署：Helm、DaemonSet、节点标签、节点独占。
- 模板预热：模板构建、分发、状态检查和升级。
- 网络入口：wildcard domain、path-based routing、TLS、访问控制。
- 可观测：sandbox 创建耗时、执行耗时、节点状态、模板状态。
- 安全：API 鉴权、租户隔离、出网控制、审计日志。
- 性能测试：与 Pod Job、Kata、gVisor 等路径做同口径对比。

## 小结

Cube on Kubernetes 的核心不是“把 Cube 变成另一种 Pod”，而是让 Cube 和 Kubernetes 各自站在更合适的位置上。

Kubernetes 适合做运维底座，Cube 适合做 Agent Sandbox runtime。对于 Agent 时代的安全执行环境，这种边界更自然，也更容易发挥 Cube 的快启动、模板预热、PVM 隔离和暂停恢复能力。

一句话总结：

> K8s 管部署和资源池，Cube 管 sandbox 快路径。
