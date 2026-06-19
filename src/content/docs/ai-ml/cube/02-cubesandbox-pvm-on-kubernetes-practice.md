---
title: "在 Kubernetes 节点资源池上部署 CubeSandbox PVM 的实践"
---

# 在 Kubernetes 节点资源池上部署 CubeSandbox PVM 的实践

## 摘要

本文介绍一种 CubeSandbox PVM 与 Kubernetes 节点资源池结合的实践方式：使用 Kubernetes 部署控制面和节点侧组件，使用专用节点承载 Cube VMM 和 PVM/Micro-VM sandbox，最终通过 Cube API 或 E2B 兼容 API 对外提供 Agent Sandbox 能力。

这不是把每个 sandbox 做成 Pod，而是把 Kubernetes 作为部署和运维底座，把 Cube 作为 sandbox runtime 控制面。

## 实践目标

这次实践主要验证三个问题：

1. CubeSandbox PVM 是否可以运行在云上 Kubernetes 节点资源池中。
2. 外部应用是否可以通过统一入口调用 Cube API 创建 PVM sandbox。
3. Agent 应用是否可以通过 E2B SDK 这类方式执行 `run_code`。

目标不是做一个完整产品，而是先跑通一条可复现路径，为后续最佳实践和社区文档沉淀基础。

## 整体架构

推荐的实践架构如下：

```text
Client / Agent Application
        |
        v
LoadBalancer / Gateway
        |
        v
Cube API / Cube Proxy
        |
        v
CubeSandbox nodes in Kubernetes node pool
        |
        v
PVM / Micro-VM Sandbox
```

在这个架构中，Kubernetes 主要承担：

- 部署 Cube 控制面。
- 部署节点侧 Daemon 或安装脚本。
- 管理节点标签、污点和节点池。
- 暴露统一访问入口。
- 接入监控、日志和告警。

Cube 主要承担：

- 管理 sandbox 生命周期。
- 管理模板和 rootfs。
- 创建 PVM/Micro-VM sandbox。
- 提供代码执行和端口访问能力。
- 提供 Cube API 或 E2B 兼容 API。

## 节点准备

CubeSandbox PVM 节点通常需要满足几个条件：

- 使用支持 PVM 的 host kernel。
- 安装 CubeSandbox 运行时组件。
- 准备镜像、rootfs 和模板缓存。
- 节点最好作为 sandbox 专用节点使用。
- 通过 label / taint 避免普通业务误调度。

在 Kubernetes 中，可以用节点标签标识 sandbox 节点：

```text
cubesandbox.io/pvm-node=true
```

也可以使用 taint 将其声明为专用节点：

```text
cubesandbox.io/dedicated=true:NoSchedule
```

这样 Kubernetes 仍然能管理节点，但普通业务 Pod 不会自然落到这些节点上。

## 控制面和节点侧组件

Cube 控制面可以部署在 Kubernetes 中。节点侧组件可以通过 DaemonSet、安装脚本或节点初始化流程部署到指定节点。

一个常见组合是：

- Cube 控制面：Deployment / StatefulSet。
- Cube 节点组件：DaemonSet 或节点初始化脚本。
- Cube API：Service / Gateway 暴露。
- Cube Proxy：负责 sandbox 运行时端口访问。
- 监控日志：复用 Kubernetes 集群已有采集体系。

这里需要注意一点：即使使用 DaemonSet 部署节点组件，也不代表每个 sandbox 是 Pod。DaemonSet 只是安装和运维手段，sandbox 生命周期仍然由 Cube 管理。

## 网络入口

Agent Sandbox 通常需要两类入口。

第一类是控制面入口，用于创建、查询和销毁 sandbox：

```text
POST /sandboxes
GET  /sandboxes/{id}
DELETE /sandboxes/{id}
```

第二类是运行时入口，用于访问 sandbox 内部服务，例如代码解释器、Jupyter、HTTP 服务或调试端口。

常见设计有两种：

```text
https://<port>-<sandbox-id>.sandbox.example.com
```

或者：

```text
https://sandbox.example.com/sandbox/<sandbox-id>/<port>
```

前者更贴近 E2B 等现有 SDK 的域名习惯，后者在没有 wildcard DNS 的环境中更容易落地。生产环境需要补齐 TLS、鉴权、访问日志和网络策略。

## E2B SDK 接入

为了降低 Agent 应用迁移成本，Cube API 可以提供 E2B 兼容入口。

应用侧理想体验应该接近：

```python
from e2b_code_interpreter import Sandbox

with Sandbox.create(template="python-agent") as sandbox:
    result = sandbox.run_code("print('hello from sandbox')")
    print(result.text)
```

平台侧需要解决三类问题：

- 控制面 API endpoint 如何映射到 Cube API。
- sandbox runtime URL 如何映射到 Cube Proxy。
- API Key、租户和鉴权如何与现有平台体系集成。

在早期 demo 中可以通过 SDK 参数或少量 patch 跑通；要形成最佳实践，则应尽量让 SDK 无 patch 使用。

## 模板预热

模板是 CubeSandbox 实践里非常关键的一环。

Agent Sandbox 的启动速度，很大程度依赖模板是否已经预热到节点本地。实践中需要注意：

- 模板应在每个可调度节点本地生成或预热。
- 不要假设 snapshot 文件可以在节点间简单复制后直接可用。
- 新节点加入后，需要自动补齐模板。
- 模板需要版本、状态和兼容性检查。
- 模板失败时，要能快速定位是镜像、rootfs、snapshot 还是节点环境问题。

一个比较稳的流程是：

```text
Build image
  -> Generate template
  -> Warm template on each Cube node
  -> Verify template status
  -> Mark node schedulable for this template
```

只有当节点上的模板状态为 ready 时，控制面才应把该节点纳入调度候选。

## 调度思路

如果每个 sandbox 不走 Kubernetes API，那么仍然需要一个轻量调度逻辑。

调度时至少考虑：

- 节点是否健康。
- 节点是否已安装 PVM host kernel。
- 节点是否有目标模板。
- 节点当前 sandbox 数量。
- CPU、内存、磁盘和网络余量。
- 租户隔离和资源配额。

一个简单策略是：

```text
Filter unhealthy nodes
  -> Filter nodes without template
  -> Filter nodes without enough resources
  -> Pick least-loaded node
  -> Call node-local Cube API
```

这条路径比完整 Pod 创建路径更贴近 sandbox 快速创建场景，同时仍然可以复用 Kubernetes 节点运维能力。

## 可观测和运维

最佳实践中至少需要暴露以下指标：

- sandbox 创建耗时。
- sandbox 创建成功率。
- `run_code` 耗时。
- 模板 ready 节点数。
- 节点 Cube 组件健康状态。
- 节点 PVM kernel 版本。
- sandbox 数量和资源使用。
- sandbox 销毁和残留资源清理情况。

日志上建议区分：

- 控制面 API 日志。
- 节点 runtime 日志。
- sandbox 创建事件。
- 模板构建和预热日志。
- Cube Proxy 访问日志。

这些信息会直接影响后续能否从 demo 走向可运维实践。

## 安全注意事项

Agent Sandbox 处理的是不完全可信代码，所以安全能力不能只依赖“跑起来”。

至少需要考虑：

- Cube API 鉴权。
- sandbox runtime 访问鉴权。
- 租户隔离。
- sandbox 出网控制。
- 镜像和模板可信来源。
- 凭证注入和回收。
- 审计日志。
- 节点权限收敛。

如果运行在云上 Kubernetes 环境中，还可以结合云厂商的安全组、私有网络、密钥管理、日志审计和访问控制能力。

## 小结

CubeSandbox PVM 与 Kubernetes 的结合方式，不应简单理解为“把 sandbox 做成 Pod”。更合适的方式是：

> Kubernetes 负责部署和运维，Cube 负责 sandbox runtime。

在这种模式下，Kubernetes 用户可以继续复用已有资源池、监控、日志和运维体系；Cube 则提供更适合 Agent 场景的 PVM 隔离、模板预热、快速创建和代码执行 API。

这也是后续沉淀 Cube on Kubernetes 最佳实践的基础。
