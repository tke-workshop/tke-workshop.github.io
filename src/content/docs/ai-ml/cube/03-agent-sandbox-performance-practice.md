---
title: "Agent 短任务场景下，Cube PVM 与 Pod 启动路径的一次对比"
---

# Agent 短任务场景下，Cube PVM 与 Pod 启动路径的一次对比

## 摘要

Agent Sandbox 常见任务往往很短：创建环境、执行一段代码、读取结果、销毁环境。如果 sandbox 创建路径本身较长，整体体验会被明显拉低。

本文基于一次小规模 demo 测试，对比 CubeSandbox PVM 快路径、Kubernetes Pod Job 启动路径和 warm Pod `exec` 路径在短任务场景下的表现。本文数据用于理解路径差异，不作为生产级压测结论。

## 为什么要测短任务路径

传统服务更关注长期运行后的吞吐、稳定性和资源利用率。Agent Sandbox 场景还额外关注：

- cold create 耗时。
- 首次执行耗时。
- warm run 耗时。
- 暂停和恢复耗时。
- 高频短任务下的调度路径开销。

原因很简单：如果一次 Agent 工具调用只执行几百毫秒，创建环境却要几秒，那么用户感知的大部分时间都消耗在基础设施路径上。

因此，评估 Agent Sandbox 时，不能只看“能不能跑”，还要看“创建和执行路径是否足够短”。

## 测试对象

本次 demo 测试对比了三类路径。

第一类是 CubeSandbox PVM：

```text
Client
  -> Cube API
  -> Cube runtime
  -> PVM / Micro-VM sandbox
  -> run_code
```

第二类是 Kubernetes Pod Job：

```text
Client
  -> kube-apiserver
  -> scheduler
  -> kubelet
  -> container runtime
  -> Pod / Job
```

第三类是 warm Pod `kubectl exec`：

```text
Client
  -> kube-apiserver exec channel
  -> kubelet
  -> existing Pod
  -> command execution
```

这三类路径并不完全等价。Pod Job 是 Kubernetes 原生工作负载路径，warm exec 是已经存在 Pod 上的命令通道，Cube PVM 是 sandbox runtime API 路径。对比的目的不是证明某个系统在所有场景都更好，而是观察 Agent 短任务下路径开销的差异。

## 测试口径

本次测试包含以下样本：

| 场景 | 样本数 |
|---|---:|
| PVM cold create + hello run | 10 |
| PVM warm run_code | 20 |
| Pod Job create + hello run | 10 |
| Pod warm kubectl exec | 20 |

测试任务包括：

- 输出一行 hello。
- 执行一个简单 Python CPU loop。

测试环境为 demo 环境，样本量较小，路径中包含网络、网关和客户端抖动。因此本文更关注数量级和路径差异，而不是单个数字的绝对精度。

## 测试结果

本次 demo 测试结果如下：

| Case | P50 | P95 | Avg | Success |
|---|---:|---:|---:|---:|
| PVM cold create + hello run | 0.192s | 0.511s | 0.231s | 10/10 |
| PVM create only | 0.125s | 0.199s | 0.138s | 10/10 |
| PVM first hello run | 0.056s | 0.385s | 0.094s | 10/10 |
| PVM warm hello run_code | 0.071s | 0.207s | 0.092s | 20/20 |
| PVM warm CPU 1M loop | 0.098s | 0.110s | 0.100s | 20/20 |
| Pod warm kubectl exec hello | 1.742s | 2.413s | 2.067s | 20/20 |
| Pod warm kubectl exec CPU 1M loop | 1.775s | 2.830s | 1.943s | 20/20 |
| Pod Job create + hello run | 4.990s | 6.048s | 5.267s | 10/10 |

从这个 demo 口径看，CubeSandbox PVM 在短任务路径上的延迟明显更低。尤其是 `cold create + hello run`，P50 在 200ms 左右，而 Pod Job `create + hello run` 的 P50 接近 5s。

## 如何理解这些数字

这些数字不应该被理解成“Cube 在所有维度上都替代 Pod”。更准确的理解是：两者服务的抽象不同。

Pod Job 走的是 Kubernetes 声明式工作负载路径。它提供了调度、状态管理、事件、容器生命周期和集群治理能力，但这条路径天然较长。

Cube PVM 走的是 sandbox runtime API 路径。它围绕模板预热、快速创建和代码执行做优化，更适合高频短任务。

warm Pod `kubectl exec` 的结果也需要谨慎理解。`kubectl exec` 经过 apiserver 和 kubelet 的 exec 通道，并不等价于 Pod 内部已经暴露一个 HTTP code server 后的直接调用。因此它可以作为“通过 Kubernetes 控制面执行命令”的参考，但不能代表所有 warm Pod 内执行方式。

## 为什么 Cube 更适合 Agent 短任务

Agent 短任务通常希望得到的是：

```text
Create sandbox quickly
Run code quickly
Return result quickly
Destroy or reuse sandbox
```

Cube 的优势在于它直接围绕这个流程设计：

- 模板可以提前预热。
- sandbox 创建不必走完整 Pod 调度路径。
- runtime API 可以直接表达 `run_code`。
- PVM/Micro-VM 提供比普通容器更强的隔离边界。
- 后续可以扩展暂停、恢复、快照和复用。

这也是为什么在 Agent Sandbox 场景中，不应简单把“是否兼容 Kubernetes API”作为唯一目标。更重要的是运行时路径是否匹配业务。

## 还需要补哪些测试

本次只是 demo 规模测试，后续还需要更完整的测试矩阵。

建议补充：

- Cube PVM 与 Kata、gVisor 的同口径对比。
- 内网入口和公网入口分别测试。
- 不同模板大小下的 cold create。
- 多并发创建 sandbox。
- 长时间运行稳定性。
- pause / resume 耗时。
- snapshot / restore 耗时。
- CPU、内存、磁盘占用。
- sandbox 密度和节点资源利用率。
- 异常清理和失败重试。

只有补齐这些测试，才能形成更完整的生产级评估。

## 对架构选择的启发

这次测试给出的启发是：Agent Sandbox 不应该只用传统工作负载启动方式来评估。

如果目标是长期服务，Kubernetes Pod 是非常成熟的选择。如果目标是高频、短生命周期、安全隔离的 Agent 执行环境，Cube 这样的 sandbox runtime API 更贴近需求。

更合理的组合是：

```text
Kubernetes:
  deploy, operate, observe, scale nodes

Cube:
  create sandbox, warm template, run code, pause, resume
```

也就是：Kubernetes 做底座，Cube 走快路径。

## 小结

本次 demo 测试显示，在 Agent 短任务场景下，CubeSandbox PVM 的创建和执行路径具有明显优势。它不是通过替代 Kubernetes 的运维能力来实现这一点，而是把每个 sandbox 的生命周期交给更合适的 runtime API。

后续如果将这套实践沉淀到社区，建议把性能数据和部署最佳实践放在一起看：一方面说明 Cube 为什么适合 Agent Sandbox，另一方面说明 Kubernetes 如何继续承担部署、节点和运维底座的角色。
