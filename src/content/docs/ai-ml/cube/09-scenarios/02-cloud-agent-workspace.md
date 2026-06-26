---
title: "构建常驻型 Cloud Agent 工作空间"
---

# 构建常驻型 Cloud Agent 工作空间

常驻型 Cloud Agent 不只是执行一次代码或命令。它通常拥有自己的工作区、文件、浏览器状态、工具配置、凭证上下文和长期任务队列。用户离开后，Agent 仍可能继续执行任务；用户回来时，又希望恢复到上次的工作状态。

TKE Cube Agent Sandbox 可用于构建这类 Cloud Agent 工作空间，为员工 Agent、自主代理、长期会话 Agent 和企业自动化 Agent 提供隔离、持久、可恢复、可治理的执行环境。

## 场景挑战

常驻型 Agent 通常会遇到以下问题：

- 会话生命周期不等于 HTTP 请求生命周期。
- 用户离线后，Agent 仍可能继续执行后台任务。
- Agent 需要保存文件、浏览器状态、工具缓存和任务上下文。
- 长期运行的环境成本较高，需要暂停恢复或自动回收。
- Agent 需要访问企业系统、第三方平台和内部文件。
- 凭证不能暴露给模型或用户代码。
- 企业需要审计 Agent 的命令、文件、网络和高敏操作。

## 参考架构

```text
Cloud Agent 产品
        |
        +-- 用户会话 / 任务队列 / Agent Loop
        |
        v
Agent Runtime API
        |
        +-- SandboxClaim
        +-- SandboxTeam
        +-- SandboxGateway
        +-- SandboxNetworkPolicy
        v
Cloud Agent Workspace
        |
        +-- 代码 / Shell 工具
        +-- 浏览器 / WebShell
        +-- 持久化工作区
        +-- 凭证代理
        +-- 审计日志
```

## 工作空间组成

| 组成 | 说明 |
| --- | --- |
| 执行环境 | 运行 Agent 工具、Shell 命令、代码和本地服务 |
| 持久化存储 | 保存用户文件、任务中间结果、工具缓存和工作目录 |
| 网络入口 | 提供 WebShell、浏览器、预览服务或调试端口 |
| 出网策略 | 控制 Agent 可访问的内部系统和外部域名 |
| 凭证代理 | 为 Git、文档、CRM、工单、云资源等服务注入短期凭证 |
| 审计日志 | 记录命令、文件、网络、凭证使用和高敏操作 |

## 生命周期设计

常驻型工作空间建议采用四种状态：

| 状态 | 说明 | 典型动作 |
| --- | --- | --- |
| Running | Agent 正在执行任务或等待用户交互 | 执行代码、浏览器操作、工具调用 |
| Idle | 短时间无活动，但仍保留计算资源 | 等待用户继续操作 |
| Paused | 释放 CPU 和内存，保留状态和存储 | 用户离线、低峰降本 |
| Terminated | 工作空间已删除 | 用户关闭项目或超过保留期 |

建议策略：

- 交互活跃时保持 Running。
- 短时间无活动进入 Idle。
- 长时间无活动自动 Paused。
- 超过保留期后归档数据并 Terminated。

## SandboxTemplate 示例

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxTemplate
metadata:
  name: cloud-agent-workspace
  namespace: agent-workspace
spec:
  image: ccr.ccs.tencentyun.com/demo/cloud-agent-workspace:latest
  resources:
    cpu: "4"
    memory: 8Gi
  ports:
    - name: runtime
      containerPort: 49999
    - name: webshell
      containerPort: 7681
    - name: browser
      containerPort: 9222
  env:
    - name: WORKSPACE_DIR
      value: /workspace
  storage:
    volumes:
      - name: workspace
        type: pvc
        claimName: cloud-agent-workspace
        mountPath: /workspace
        readOnly: false
  network:
    policyRef: cloud-agent-network
  runtime:
    type: cube-pvm
    warmPool:
      replicas: 1
      maxReplicas: 20
      ttlSeconds: 7200
```

## 持久化设计

建议将工作空间数据拆分为：

| 数据 | 建议存储方式 |
| --- | --- |
| 用户文件和项目目录 | PVC / CFS |
| 浏览器下载文件 | PVC / CFS，按用户隔离 |
| 临时缓存 | 临时存储或缓存卷 |
| 任务结果 | 对象存储或业务数据库 |
| 审计日志 | 日志服务或审计系统 |

不要把长期业务数据只保存在沙箱本地临时目录中。

## 凭证和身份

Cloud Agent 常需要访问多个外部系统。推荐采用以下模式：

1. 用户在平台侧完成授权。
2. 平台侧保存长期凭证或 Refresh Token。
3. 沙箱内仅获得短期 Token 或占位符凭证。
4. 凭证代理在请求时完成真实凭证注入。
5. 凭证使用行为写入审计日志。

适合托管的凭证包括：

- Git Token。
- 文档、网盘、IM、邮箱等 OAuth Token。
- 企业内部系统 Session。
- 云资源临时凭证。
- API Key。

## 网络和高敏操作

建议将 Agent 操作分为普通操作和高敏操作。

普通操作：

- 读取公开文档。
- 查询低敏数据。
- 写入工作区文件。
- 运行本地测试。

高敏操作：

- 删除文件或批量修改数据。
- 访问客户、合同、保单、财务等敏感系统。
- 发送外部消息。
- 创建订单、审批、支付或变更生产系统。

对高敏操作建议配置：

- Human-in-the-loop 确认。
- 操作前后审计。
- 临时授权。
- 数据脱敏或拦截。
- 可撤销的短期凭证。

## 观测指标

| 指标 | 说明 |
| --- | --- |
| workspace_running_total | 运行中工作空间数量 |
| workspace_paused_total | 暂停态工作空间数量 |
| workspace_resume_latency | 恢复耗时 |
| workspace_idle_duration | 空闲时长 |
| credential_injection_total | 凭证注入次数 |
| credential_injection_failed_total | 凭证注入失败次数 |
| sensitive_action_total | 高敏操作次数 |
| network_denied_total | 出网拦截次数 |

## 成本优化

常驻工作空间的主要成本来自：

- 长时间占用 CPU 和内存。
- 持久化存储。
- 预热池。
- 网关和日志。

优化建议：

- 对低活跃工作空间自动暂停。
- 对长期未访问工作空间归档后删除。
- 使用较小默认规格，按任务升配。
- 将大文件和历史结果转移到对象存储。
- 对预热池设置低水位和突发上限。

## 最佳实践

- 每个用户或项目使用独立工作区目录。
- 凭证由平台托管，不写入镜像和持久卷。
- 默认禁止沙箱访问公网和云元数据服务。
- 所有外部系统访问都经过网关或代理。
- 为高敏操作配置用户确认。
- 将命令、文件、网络和凭证使用纳入审计。
- 为暂停恢复配置明确的用户体验提示。

## 相关文档

- [生命周期管理](../03-lifecycle-management.md)
- [存储配置](../04-storage.md)
- [网络配置](../05-network.md)
- [可观测性](../06-observability.md)
