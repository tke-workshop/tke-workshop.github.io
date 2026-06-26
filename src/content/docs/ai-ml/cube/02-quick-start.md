---
title: "快速开始"
---

# 快速开始

本文介绍如何在 TKE 集群中启用 Cube Agent Sandbox，并使用 E2B 兼容 SDK 运行第一段代码。

## 前提条件

开始前，请确认：

- 已创建 TKE 集群。
- 集群中至少有一个可用于运行沙箱的原生节点池。
- 节点规格、操作系统和内核满足 Micro-VM runtime 要求。
- 集群已启用可用的 CNI 和 CSI 组件。
- 当前账号具备安装插件、管理节点池、创建 Service、管理安全组和创建 Kubernetes 资源的权限。

## 步骤一：安装 Cube Agent Sandbox 插件

1. 登录 TKE 控制台。
2. 进入目标集群。
3. 打开“插件管理”。
4. 找到“Cube Agent Sandbox”插件。
5. 单击“安装”。
6. 等待插件状态变为“运行中”。

插件安装完成后，系统会在集群中创建控制面组件、CRD、网关组件和节点侧 DaemonSet。

## 步骤二：启用节点池高级特性

1. 进入“节点池”页面。
2. 选择一个原生节点池。
3. 在“高级特性”中开启“Micro-VM 沙箱”。
4. 保存配置。
5. 等待节点池状态变为“已启用”。

启用过程中，系统会检查节点的 runtime、内核、KVM/PVM 支持和组件健康状态。检查失败时，可在节点池详情页查看失败原因。

## 步骤三：创建 SandboxTemplate

创建一个 Python 代码解释器模板：

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxTemplate
metadata:
  name: code-interpreter-python
  namespace: agent-demo
spec:
  image: ccr.ccs.tencentyun.com/demo/code-interpreter:py311
  resources:
    cpu: "2"
    memory: 4Gi
  command:
    - /usr/local/bin/start-runtime
  ports:
    - name: runtime
      containerPort: 49999
  runtime:
    type: cube-pvm
    warmPool:
      replicas: 2
      maxReplicas: 20
      ttlSeconds: 1800
```

执行：

```bash
kubectl create namespace agent-demo
kubectl apply -f sandbox-template.yaml
kubectl get sandboxtemplate -n agent-demo
```

当模板状态为 `Ready` 后，可以创建沙箱实例。

## 步骤四：创建 SandboxGateway

创建内网访问入口：

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxGateway
metadata:
  name: default
  namespace: agent-demo
spec:
  access:
    internal: true
    public: false
  routing:
    splitControlAndDataPlane: true
```

执行：

```bash
kubectl apply -f sandbox-gateway.yaml
kubectl get sandboxgateway -n agent-demo
```

## 步骤五：创建 Team 和 API Key

创建 Team：

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxTeam
metadata:
  name: demo-team
  namespace: agent-demo
spec:
  namespaceRef: agent-demo
  quota:
    maxRunningSandboxes: 100
    maxCPU: "200"
    maxMemory: 400Gi
```

执行：

```bash
kubectl apply -f sandbox-team.yaml
```

在控制台中进入“Agent Sandbox > Team”，为 `demo-team` 创建 API Key，并记录访问地址和 Key。

## 步骤六：使用 SDK 运行代码

安装 SDK：

```bash
pip install e2b-code-interpreter
```

运行示例：

```python
from e2b_code_interpreter import Sandbox

sbx = Sandbox.create(
    template="code-interpreter-python",
    api_key="YOUR_API_KEY",
    timeout=1800,
    metadata={
        "team": "demo-team",
        "namespace": "agent-demo"
    }
)

execution = sbx.run_code("print('hello from TKE Cube Agent Sandbox')")
print(execution.logs.stdout)

sbx.kill()
```

如果输出 `hello from TKE Cube Agent Sandbox`，说明沙箱创建和代码执行成功。

## 使用 SandboxClaim 创建实例

您也可以通过 Kubernetes 声明式方式创建沙箱：

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
kubectl get sandboxclaim demo-claim -n agent-demo
```

查看实例状态：

```bash
kubectl describe sandboxclaim demo-claim -n agent-demo
```
