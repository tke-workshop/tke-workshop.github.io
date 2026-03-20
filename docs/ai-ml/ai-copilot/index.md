# TKE with AI Copilot

本模块介绍如何利用 AI 能力增强 TKE 的使用体验，让 AI 成为你的 K8s 全栈运维助手。

## 核心理念

> **AI Coding 不应该只是"写代码"，而是从编码到部署到运维的全链路能力增强。**

- **AI on TKE** = 在 TKE 上运行 AI 工作负载（AI 是工作负载）
- **TKE with AI Copilot** = 用 AI 管理 TKE（AI 是运维助手）

## 学习目标

- [x] 了解 AI Agent 如何与 TKE 集成
- [x] 使用自然语言查询和管理 K8s 集群
- [x] 一句话部署应用到 TKE（静态页面、复杂应用）
- [x] 借助 AI 进行智能运维和排障（日志查看、问题诊断）
- [x] 使用 RBAC 多租户管理为团队分配权限

## 章节列表

| 章节 | 内容 | 状态 |
|------|------|------|
| [TKE Skill](tke-skill.md) | AI Agent 扩展能力，TKE 集群管理、K8s 资源操作、Helm 部署、TCR 镜像仓库、RBAC 多租户管理 | ✅ v2.0 |
| [使用场景指南](user-stories.md) | 8 个典型使用场景，从新员工接入到多租户管理 | ✅ 完成 |

## TKE Skill v2.0 能力概览

TKE Skill 通过两个 CLI 工具提供完整的云原生运维能力：

- **tke_cli.py** — 腾讯云 API 操作（集群管理、TCR 镜像仓库）
- **k8s_cli.py** — Kubernetes 集群内操作（资源管理、Pod 操作、Helm 部署、RBAC 租户管理）

### 📋 TKE 集群管理

```
帮我查一下广州地域的 TKE 集群
获取集群 cls-xxx 的 kubeconfig
```

### ☸️ K8s 资源操作

```
帮我查看 default 命名空间的 Pod 状态
查看 my-app Pod 的日志
执行进入 my-app Pod 的 shell
```

### 🚀 一句话部署应用

```
帮我部署一个"你好，猴哥"静态页面到 TKE 集群
帮我把本地项目打包成镜像并部署到 TKE
```

AI 将自动完成：
- 编写 Deployment、Service、ConfigMap 等 YAML
- 执行 kubectl apply 部署资源
- 设计架构方案（如 Nginx + Sidecar 模式解决 ARM/x86 兼容问题）

### 🔧 智能运维排障

```
帮我检查 my-app 为什么部署失败
分析 Pod 状态、查看日志、排查问题原因
```

AI 将自动完成：
- 分析 Pod 状态和事件
- 查看容器日志
- 诊断问题根因并给出修复建议

### ⛵ Helm 包管理

```
帮我用 Helm 安装 nginx，3 副本，开启等待
帮我列出所有已安装的 Helm Release
```

### 🐳 TCR 镜像仓库

```
帮我查看广州地域的 TCR 实例
创建一个镜像仓库 my-app
```

### 🔐 多租户 RBAC 管理

一句话为团队成员创建权限：

```
帮我创建一个账号 team-frontend，权限级别 developer，可以访问 frontend 命名空间
帮我生成 team-frontend 的安装 Prompt
```

AI 将自动创建：
- ServiceAccount
- Role（基于预定义模板：readonly/developer/admin）
- RoleBinding

并可生成一键安装 Prompt，发给租户直接使用。

## 开始学习

[:octicons-arrow-right-24: TKE Skill 详细介绍](tke-skill.md)

[:octicons-arrow-right-24: 使用场景指南](user-stories.md)
