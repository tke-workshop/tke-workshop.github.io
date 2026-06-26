---
title: "FAQ"
---

# FAQ

## TKE Cube Agent Sandbox 和普通 Pod 有什么区别？

普通 Pod 适合运行可信、稳定、长期服务化的容器工作负载。TKE Cube Agent Sandbox 面向不可信代码、Agent 工具调用和高频短任务，提供 Micro-VM 级隔离、快速创建、模板预热、E2B 兼容 API 和沙箱生命周期管理。

## 是否需要创建新的 TKE 集群类型？

不需要。您可以在已有 TKE 集群中安装 Cube Agent Sandbox 插件，并在原生节点池中启用 Micro-VM 沙箱高级特性。

## 是否必须使用 E2B SDK？

不是。您可以选择：

- 使用 E2B 兼容 SDK。
- 使用 Kubernetes `SandboxClaim`。
- 使用 Kubernetes `Sandbox` CR。
- 通过兼容 HTTP API 集成自有 Agent 平台。

## 沙箱可以访问公网吗？

可以，但默认不建议开放。您需要显式配置 SandboxGateway 公网入口，并配置 TLS、来源白名单、安全组、API Key 和访问审计。

## 沙箱可以挂载共享存储吗？

可以。您可以通过 SandboxTemplate 挂载 PVC / CFS 等共享存储，并配置挂载路径和只读/读写权限。

## 如何降低创建时延？

建议：

- 为高频模板配置 Warm Pool。
- 使用精简镜像。
- 预装稳定依赖。
- 使用镜像缓存。
- 避免启动时安装大量依赖。
- 保持节点池容量水位充足。

## 为什么 SandboxClaim 一直处于 Pending？

常见原因包括：

- SandboxTemplate 未 Ready。
- Warm Pool 可用实例不足。
- Team 配额不足。
- 节点 runtime 不可用。
- 节点资源不足。

请查看：

```bash
kubectl describe sandboxclaim <name> -n <namespace>
kubectl get events -n <namespace> --sort-by=.lastTimestamp
```

## 为什么 SDK 认证失败？

请检查：

- API Key 是否有效。
- API Key 是否属于正确 Team。
- SDK endpoint 是否指向正确 SandboxGateway。
- Team 是否映射到正确 Namespace。
- Gateway 日志中是否存在认证错误。

## 为什么沙箱内无法访问外部服务？

可能原因：

- 出网策略默认拒绝。
- 安全组未放行。
- DNS 服务未放行。
- 目标服务不在允许列表中。

请检查 `SandboxNetworkPolicy` 和集群安全组。

## 为什么沙箱内服务无法从外部访问？

请检查：

- SandboxTemplate 是否声明了对应端口。
- SandboxGateway 是否启用数据面入口。
- 路由域名或路径是否正确。
- 入方向策略是否允许 Gateway 访问。
- 公网访问是否配置 TLS 和白名单。

## 如何强制销毁异常实例？

通过控制台进入“Agent Sandbox > 实例”，选择目标实例并单击“强制销毁”。

也可以使用：

```bash
kubectl delete sandbox <sandbox-id> -n <namespace> --force
```

## 是否支持休眠、唤醒和 Checkpoint？

如果集群和插件版本支持，您可以在控制台或 CRD 中使用相关能力。使用前请确认当前版本的功能说明和限制。对于生产环境，建议先在测试 Namespace 中验证数据一致性和恢复耗时。

## 如何排查创建失败？

建议按以下顺序排查：

1. 查看 SandboxClaim 或 Sandbox 事件。
2. 查看 SandboxTemplate 是否 Ready。
3. 查看 Team 配额是否耗尽。
4. 查看节点池 Micro-VM 沙箱特性状态。
5. 查看控制面和 runtime 日志。
6. 查看 Gateway 和网络策略。

常用命令：

```bash
kubectl describe sandboxclaim <name> -n <namespace>
kubectl describe sandboxtemplate <template> -n <namespace>
kubectl get events -n <namespace> --sort-by=.lastTimestamp
```
