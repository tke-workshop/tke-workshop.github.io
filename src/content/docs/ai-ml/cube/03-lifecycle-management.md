---
title: "生命周期管理"
---

# 生命周期管理

本文介绍 TKE Cube Agent Sandbox 的创建、查询、释放、TTL 回收和强制销毁方式。

## 生命周期状态

沙箱实例通常包含以下状态：

| 状态 | 说明 |
| --- | --- |
| Pending | 实例已创建，正在等待资源或预热池分配 |
| Preparing | 正在准备模板、网络、存储或 runtime |
| Running | 实例已运行，可执行代码或服务 |
| Releasing | 实例正在释放 |
| Succeeded | 实例已正常结束 |
| Failed | 实例创建或运行失败 |
| Terminated | 实例已销毁 |

## 使用 SDK 创建和释放

创建沙箱：

```python
from e2b_code_interpreter import Sandbox

sbx = Sandbox.create(
    template="code-interpreter-python",
    api_key="YOUR_API_KEY",
    timeout=1800
)
```

执行代码：

```python
execution = sbx.run_code("print(1 + 1)")
print(execution.logs.stdout)
```

释放沙箱：

```python
sbx.kill()
```

## 使用 SandboxClaim 创建

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxClaim
metadata:
  name: demo-claim
  namespace: agent-demo
spec:
  templateRef: code-interpreter-python
  teamRef: demo-team
  ttlSeconds: 1800
```

执行：

```bash
kubectl apply -f sandbox-claim.yaml
```

查询：

```bash
kubectl get sandboxclaim demo-claim -n agent-demo
kubectl describe sandboxclaim demo-claim -n agent-demo
```

释放：

```bash
kubectl delete sandboxclaim demo-claim -n agent-demo
```

## TTL 自动回收

您可以在 `SandboxClaim` 中配置 `ttlSeconds`。到期后，系统会自动回收实例，释放 CPU、内存、网络和临时存储资源。

```yaml
spec:
  ttlSeconds: 1800
```

建议：

- 任务型沙箱配置较短 TTL，例如 10 到 30 分钟。
- 交互式调试沙箱配置中等 TTL，例如 1 到 4 小时。
- 常驻型工作空间应配合配额、审计和存储策略使用。

## 强制销毁实例

当实例长时间无法释放、状态异常或存在安全风险时，可以强制销毁。

通过控制台：

1. 进入“节点池详情 > Agent Sandbox > 实例”。
2. 找到目标实例。
3. 单击“强制销毁”。
4. 确认操作。

通过 kubectl：

```bash
kubectl delete sandbox <sandbox-id> -n agent-demo --force
```

强制销毁会中断实例中的任务，请确认任务可以丢弃或已完成数据保存。

## Warm Pool 管理

Warm Pool 用于预热常用模板，减少实例创建时延。您可以在 `SandboxTemplate` 中配置：

```yaml
runtime:
  type: cube-pvm
  warmPool:
    replicas: 2
    maxReplicas: 20
    ttlSeconds: 1800
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| replicas | 常驻预热实例数量 |
| maxReplicas | 突发场景下最大可扩展实例数量 |
| ttlSeconds | 分配后默认存活时间 |

建议为高频模板配置 Warm Pool，为低频模板使用按需创建。

## 查看失败原因

执行：

```bash
kubectl describe sandboxclaim demo-claim -n agent-demo
kubectl get events -n agent-demo --sort-by=.lastTimestamp
```

常见失败原因：

| 原因 | 处理建议 |
| --- | --- |
| TemplateNotReady | 检查模板镜像、节点分布和预热状态 |
| WarmPoolExhausted | 提高预热池容量或等待实例释放 |
| NodeRuntimeNotReady | 检查节点池 Micro-VM 沙箱特性状态 |
| ImagePullFailed | 检查镜像地址和镜像仓库凭证 |
| QuotaExceeded | 提高 Team 配额或释放不再使用的实例 |
| NetworkDenied | 检查 SandboxNetworkPolicy 和安全组配置 |
