# TKE with AI Copilot

本模块介绍如何利用 AI 能力增强 TKE 的使用体验，让 AI 成为你的 K8s 运维助手。

## 核心理念

> **AI Coding 不应该只是"写代码"，而是从编码到部署到运维的全链路能力增强。**

- **AI on TKE** = 在 TKE 上运行 AI 工作负载（AI 是工作负载）
- **TKE with AI Copilot** = 用 AI 管理 TKE（AI 是运维助手）

## 学习目标

- [ ] 了解 AI Agent 如何与 TKE 集成
- [ ] 使用自然语言查询和管理 K8s 集群
- [ ] 实现一句话部署应用到 TKE
- [ ] 借助 AI 进行智能运维和排障
- [ ] 使用 RBAC 多租户管理为团队分配权限

## 章节列表

| 章节 | 内容 | 状态 |
|------|------|------|
| [TKE Skill](tke-skill.md) | AI Agent 扩展能力，集群管理、K8s 资源操作、Helm 部署、TCR 镜像仓库、RBAC 多租户管理 | ✅ v2.0 |
| [使用场景指南](user-stories.md) | 7 个典型使用场景，从新员工接入到多租户管理 | ✅ 完成 |
| [kubernetes-mcp 集成](k8s-mcp-integration.md) | 与 k8s-mcp-server 组合，实现 AI + K8s 完整闭环 | 🆕 新增 |
| [POC 示例](poc-examples.md) | 完整的配置和测试脚本，快速验证集成效果 | 🆕 新增 |

## TKE Skill v2.0 新增能力

### 🔐 多租户 RBAC 管理

一句话为团队成员创建权限：

```
帮我创建一个账号 team-frontend，权限级别 developer，可以访问 frontend 命名空间
```

AI 将自动创建：
- ServiceAccount
- Role（基于预定义模板）
- RoleBinding

并可生成一键安装 Prompt，发给租户直接使用。

### ⛵ Helm 包管理

用自然语言部署 Helm Chart：

```
帮我用 Helm 安装 nginx，3 副本，开启等待
```

### 🐳 TCR 镜像仓库

完整的 TCR 镜像仓库管理：

```
帮我查看广州地域的 TCR 实例
创建一个镜像仓库 my-app
```

## 开始学习

[:octicons-arrow-right-24: TKE Skill](tke-skill.md)

[:octicons-arrow-right-24: 使用场景指南](user-stories.md)

[:octicons-arrow-right-24: kubernetes-mcp 集成](k8s-mcp-integration.md)
