---
title: "在自有 TKE 集群中交付 Agent Platform 执行面"
---

# 在自有 TKE 集群中交付 Agent Platform 执行面

许多企业或 Agent 服务商已经拥有自己的 Agent 控制面：负责用户、会话、任务编排、模型调用、权限、计费和运营。他们需要的不是替换整个平台，而是在自有云账号、自有网络和自有 TKE 集群中交付一个安全、快速、可治理的执行面。

TKE Cube Agent Sandbox 可作为 Agent Platform 的 BYOC 执行面，让客户保留现有控制面和业务流程，同时在自有 TKE 集群中运行 Cube Micro-VM 沙箱。

## 适用场景

| 场景 | 说明 |
| --- | --- |
| Agent SaaS 私有化交付 | 将 Agent 产品部署到客户自有云账号或 VPC |
| 企业内部 Agent 平台 | 在企业 TKE 集群中统一运行员工 Agent、代码沙箱和浏览器沙箱 |
| AI Coding 平台 | 保留现有 IDE / Agent 控制面，将执行环境迁移到 TKE |
| 长任务 Agent 平台 | 将请求驱动容器迁移为任务驱动沙箱 |
| 多租户 Agent Runtime | 为不同部门、项目或客户提供隔离执行资源 |

## 参考架构

```text
客户 Agent Platform 控制面
        |
        +-- 用户 / 会话 / 任务
        +-- 模型网关 / 工具注册
        +-- 权限 / 计费 / 运营
        |
        | E2B 兼容 API / Kubernetes CRD / Provider Adapter
        v
TKE Cube Agent Sandbox 执行面
        |
        +-- SandboxTemplate
        +-- SandboxClaim
        +-- SandboxGateway
        +-- SandboxTeam
        +-- SandboxNetworkPolicy
        v
客户自有 TKE 集群 / 原生节点池
```

## 控制面和执行面边界

| 模块 | Agent Platform 控制面 | TKE Cube Agent Sandbox 执行面 |
| --- | --- | --- |
| 用户和租户 | 管理用户、组织、项目、计费关系 | 映射为 Team、Namespace、配额 |
| Agent 编排 | 管理 Agent Loop、任务队列、工具调用 | 提供隔离执行环境 |
| 模型调用 | 管理模型路由、提示词、Token 统计 | 可通过网络策略访问模型网关 |
| 工具和插件 | 管理工具注册、权限和 UI | 在沙箱中运行工具依赖 |
| 生命周期 | 决定何时创建、复用、暂停或销毁工作区 | 执行创建、回收、暂停和状态上报 |
| 安全治理 | 定义业务权限、审批和策略 | 执行网络、凭证、审计和隔离 |

## 交付模式

### 模式一：SDK 接入

Agent Platform 通过 E2B 兼容 SDK 调用执行面。

适合：

- 已有应用代码。
- 想快速替换自建沙箱。
- 不希望控制面直接管理 Kubernetes 资源。

### 模式二：CRD 接入

Agent Platform 通过 Kubernetes API 创建 `SandboxClaim` 或 `Sandbox`。

适合：

- 控制面本身已经运行在 Kubernetes 中。
- 需要 GitOps、审计和声明式管理。
- 客户有平台工程团队维护 CRD。

### 模式三：Provider Adapter 接入

Agent Platform 保留原有 Provider 抽象，通过 Adapter 将创建请求转成 TKE Cube Agent Sandbox 资源。

适合：

- 已支持多个执行 Provider。
- 需要灰度迁移。
- 同时保留自建、云托管和 BYOC 多种执行面。

## 租户隔离

建议将业务租户映射为：

```text
Tenant / Project
        -> Kubernetes Namespace
        -> SandboxTeam
        -> API Key
        -> ResourceQuota
        -> SandboxNetworkPolicy
        -> Storage Prefix / PVC
```

示例：

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxTeam
metadata:
  name: team-a
  namespace: tenant-a
spec:
  namespaceRef: tenant-a
  quota:
    maxRunningSandboxes: 200
    maxCPU: "400"
    maxMemory: 800Gi
```

## 节点池规划

BYOC 场景建议为执行面创建独立节点池：

- 便于控制 runtime 版本。
- 便于独立扩缩容。
- 便于设置安全组和网络策略。
- 便于统计执行面成本。
- 便于灰度升级和故障隔离。

如需多租户共享节点池，应配置配额、调度约束和容量水位告警。

## 模板分层

建议将模板分为三层：

| 模板层 | 说明 |
| --- | --- |
| 基础模板 | 包含操作系统、语言 runtime、基础工具和安全组件 |
| 场景模板 | 面向 Coding、Browser、Data Analysis、CLI 等场景 |
| 租户模板 | 租户自定义依赖、内部工具、代理和配置 |

通过模板分层，可减少重复镜像构建，并降低租户自定义带来的维护成本。

## 网络设计

BYOC 执行面通常需要同时访问企业内网和外部服务。建议采用：

- SandboxGateway 分离控制面和数据面。
- 默认内网访问，公网入口显式开启。
- 每个租户独立出网策略。
- 禁止访问云元数据服务。
- 模型网关、Git、制品库、数据库等服务按需放行。
- 所有外部访问记录审计日志。

示例策略：

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxNetworkPolicy
metadata:
  name: tenant-a-default
  namespace: tenant-a
spec:
  egress:
    defaultAction: deny
    allow:
      - type: service
        value: platform/model-gateway
      - type: service
        value: platform/git-proxy
      - type: cidr
        value: 10.0.0.0/8
  ingress:
    defaultAction: deny
    allow:
      - type: gateway
        value: tenant-a-gateway
```

## 存储设计

建议按数据类型选择存储：

| 数据 | 建议 |
| --- | --- |
| 临时任务文件 | 临时存储 |
| 用户工作区 | PVC / CFS |
| 大文件结果 | 对象存储 |
| 依赖缓存 | 共享缓存卷 |
| 审计日志 | 日志服务 |

租户之间应使用独立 PVC、目录前缀或存储桶策略隔离数据。

## 运维和可观测

BYOC 执行面需要同时服务平台团队和租户团队。建议提供两层视图：

平台视图：

- 集群插件状态。
- 节点池容量。
- 全局创建失败率。
- 网关请求量和错误率。
- 租户资源使用排行。

租户视图：

- 当前运行实例。
- 模板状态。
- 任务失败原因。
- 用量和配额。
- 日志和事件。

## 灰度迁移

从自建沙箱、Pod 池、CI Runner 或云开发机迁移时，建议按以下步骤灰度：

1. 选择一个低风险租户或业务线。
2. 创建等价 SandboxTemplate。
3. 将少量任务流量切到新执行面。
4. 对比创建耗时、执行成功率、资源成本和失败原因。
5. 扩大到更多任务类型。
6. 保留回滚到旧 Provider 的能力。

## 验收指标

| 指标 | 说明 |
| --- | --- |
| 首次接入耗时 | 从安装插件到第一段代码运行成功的时间 |
| 创建成功率 | 沙箱 create / claim 成功比例 |
| 创建耗时 | P50 / P95 / P99 |
| 任务成功率 | Agent 任务在沙箱内成功完成比例 |
| 资源利用率 | CPU、内存、存储和预热池利用率 |
| 隔离有效性 | 租户间文件、网络、凭证不可互访 |
| 审计完整性 | 命令、网络、凭证和高敏操作可追踪 |

## 最佳实践

- 控制面和执行面解耦，避免把业务编排逻辑写入沙箱组件。
- 每个租户使用独立 Team、Namespace、配额和网络策略。
- 默认内网部署，公网访问作为显式能力开放。
- 使用 Provider Adapter 支持灰度和回滚。
- 将模板、网络策略和配额纳入 GitOps 管理。
- 对自定义镜像建立审核、扫描和版本管理流程。
- 将成本拆分到租户、模板和任务类型。

## 相关文档

- [产品介绍](../01-overview.md)
- [快速开始](../02-quick-start.md)
- [网络配置](../05-network.md)
- [存储配置](../04-storage.md)
- [可观测性](../06-observability.md)
