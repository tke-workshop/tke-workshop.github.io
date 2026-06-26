---
title: "可观测性"
---

# 可观测性

本文介绍如何查看 TKE Cube Agent Sandbox 的状态、事件、日志、指标和告警。

## 观测对象

| 对象 | 关注内容 |
| --- | --- |
| 插件 | 控制面、CRD、网关和节点组件是否正常 |
| 节点池 | Micro-VM 沙箱特性是否启用，节点是否 Ready |
| 节点 | runtime、KVM/PVM、镜像缓存、容量水位 |
| SandboxTemplate | 模板准备状态、失败节点、镜像拉取状态 |
| Warm Pool | 预热实例数量、可用实例数量、补齐状态 |
| Sandbox | 状态、节点、创建时间、TTL、失败原因 |
| SandboxGateway | 控制面和数据面流量、错误率、证书状态 |

## 控制台查看

进入：

```text
TKE 控制台 -> 集群 -> 节点池 -> 节点池详情 -> Agent Sandbox
```

可查看：

- Ready 节点数和异常节点数。
- Ready 模板数。
- Warm Pool 可用实例数。
- 运行中沙箱数量。
- 创建耗时 P50 / P95。
- 最近失败原因。
- 网关请求量和错误率。

## 使用 kubectl 查看状态

查看模板：

```bash
kubectl get sandboxtemplate -n agent-demo
kubectl describe sandboxtemplate code-interpreter-python -n agent-demo
```

查看实例：

```bash
kubectl get sandbox -n agent-demo
kubectl describe sandbox <sandbox-id> -n agent-demo
```

查看 Claim：

```bash
kubectl get sandboxclaim -n agent-demo
kubectl describe sandboxclaim demo-claim -n agent-demo
```

查看事件：

```bash
kubectl get events -n agent-demo --sort-by=.lastTimestamp
```

## 日志

建议关注三类日志：

| 日志 | 用途 |
| --- | --- |
| 控制面日志 | 排查模板、调度、配额、生命周期和 API 问题 |
| 网关日志 | 排查 SDK 连接、数据面路由、认证和 TLS 问题 |
| runtime 日志 | 排查沙箱启动、代码执行、文件和进程问题 |

通过控制台：

1. 进入“Agent Sandbox > 日志和事件”。
2. 选择日志类型。
3. 按 Team、Template、Sandbox ID 或节点筛选。

通过 kubectl：

```bash
kubectl logs -n sandbox-system deploy/cube-sandbox-controller
kubectl logs -n sandbox-system deploy/sandbox-gateway
```

## 指标

建议监控以下指标：

| 指标 | 说明 |
| --- | --- |
| sandbox_create_latency_p50 / p95 | 沙箱创建耗时 |
| sandbox_running_total | 运行中实例数 |
| sandbox_failed_total | 创建或运行失败次数 |
| warm_pool_available | 预热池可用实例数 |
| warm_pool_refill_latency | 预热池补齐耗时 |
| gateway_request_total | 网关请求量 |
| gateway_error_rate | 网关错误率 |
| node_runtime_ready | 节点 runtime 是否 Ready |
| node_sandbox_capacity_used | 节点沙箱容量使用率 |

## 告警建议

| 告警 | 建议阈值 |
| --- | --- |
| 创建失败率过高 | 5 分钟内失败率超过 5% |
| 创建耗时升高 | P95 超过基线 2 倍 |
| Warm Pool 不足 | 可用实例数连续 5 分钟低于目标值 |
| 节点 runtime 异常 | Ready 节点数下降 |
| 网关错误率升高 | 5xx 错误率超过 1% |
| Team 配额耗尽 | 使用率超过 90% |

## Smoke Test

安装或升级后，建议运行 smoke test：

```bash
kubectl -n agent-demo apply -f smoke-test.yaml
kubectl -n agent-demo logs job/sandbox-smoke-test
```

Smoke test 通常检查：

- 模板是否 Ready。
- Warm Pool 是否可分配。
- SDK create 是否成功。
- `run_code` 是否成功。
- 文件写入和读取是否成功。
- 实例释放是否成功。

## 常见问题定位

| 现象 | 优先查看 |
| --- | --- |
| 创建慢 | Warm Pool、镜像拉取、节点容量 |
| 创建失败 | SandboxTemplate 事件、节点 runtime、配额 |
| SDK 认证失败 | API Key、Team、Gateway 日志 |
| 代码执行失败 | runtime 日志、镜像入口命令、端口 |
| 访问沙箱服务失败 | Gateway 路由、端口声明、网络策略 |
