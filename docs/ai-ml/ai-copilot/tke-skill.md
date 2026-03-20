# TKE Skill：让 AI 成为你的 K8s 运维助手

TKE Skill 是一个 **AI Agent 扩展能力**，让任何支持 Skill/Tool 机制的 AI Agent（如 CodeBuddy、Claude、GPT 等）可以直接调用腾讯云 TKE API 和 Kubernetes 集群，完成 K8s 集群的查询、部署和运维任务。

**简单说：给 AI 装上 K8s 全栈运维能力。**

!!! tip "🔗 获取 TKE Skill"
    **GitHub 地址**：[https://github.com/tkestack/tke-skill](https://github.com/tkestack/tke-skill)
    
    包含源码、安装说明和使用示例。

---

## 🤔 为什么需要这个？

AI Coding 已经能帮我们写出很不错的代码了。但写完之后呢？

- 代码写完了，怎么部署到 K8s？
- 部署上去了，怎么配置高可用？
- 跑起来了，出问题怎么排查？
- 流量上来了，怎么自动扩容？
- 多个团队共享集群，怎么快速分配权限？

**AI 能帮你写代码，但写完代码只是开始。**

TKE Skill 要解决的问题——让 AI 不仅能写代码，还能帮你部署、运维、排障、管理权限。

---

## 🛠️ 当前能力（v2.0）

TKE Skill 通过两个 CLI 工具提供完整的云原生运维能力：

- **tke_cli.py** — 腾讯云 API 操作（集群管理、TCR 镜像仓库）
- **k8s_cli.py** — Kubernetes 集群内操作（资源管理、Pod 操作、Helm 部署、RBAC 租户管理）

### 📋 TKE 集群管理

| 能力 | 说明 | 状态 |
|------|------|------|
| 集群列表/状态查询 | 查看所有集群、运行状态、版本信息 | ✅ |
| kubeconfig 获取 | 一句话获取集群访问凭证 | ✅ |
| 节点池查询 | 查看节点池配置和节点状态 | ✅ |
| 集群规格查询 | 查看集群资源限制和配置 | ✅ |
| 访问端点管理 | 开启/关闭内网/外网访问 | ✅ |

### 🐳 TCR 镜像仓库管理

| 能力 | 说明 | 状态 |
|------|------|------|
| 实例管理 | 创建/删除/查询 TCR 实例 | ✅ |
| 命名空间管理 | 创建/删除/查询命名空间 | ✅ |
| 镜像仓库管理 | 创建/删除/查询镜像仓库 | ✅ |
| 镜像版本查询 | 查看镜像 Tag 列表 | ✅ |

### ☸️ Kubernetes 资源操作

| 能力 | 说明 | 状态 |
|------|------|------|
| 资源查询 | get/describe 各类 K8s 资源 | ✅ |
| 资源创建 | apply/create 部署应用 | ✅ |
| 资源删除 | delete 清理资源 | ✅ |
| Pod 日志 | logs 查看应用日志 | ✅ |
| Pod 执行 | exec 进入容器执行命令 | ✅ |
| 事件查看 | events 监控集群事件 | ✅ |
| 资源监控 | top 查看资源使用情况 | ✅ |

### ⛵ Helm 包管理

| 能力 | 说明 | 状态 |
|------|------|------|
| Chart 安装 | helm-install 部署 Chart | ✅ |
| Release 升级 | helm-upgrade 更新版本 | ✅ |
| Release 卸载 | helm-uninstall 清理 | ✅ |
| Release 列表 | helm-list 查看已部署 | ✅ |
| Release 状态 | helm-status 查看详情 | ✅ |

### 🔐 多租户 RBAC 管理（🆕 新功能）

| 能力 | 说明 | 状态 |
|------|------|------|
| 租户创建 | 一句话创建 ServiceAccount + Role + RoleBinding | ✅ |
| 租户列表 | 查看所有已创建的租户 | ✅ |
| 租户删除 | 清理租户 RBAC 资源 | ✅ |
| Token 获取 | 获取租户访问 Token | ✅ |
| Prompt 生成 | 为租户生成一键安装 Prompt | ✅ |
| Context 管理 | 多集群上下文切换 | ✅ |
| Kubeconfig 合并 | 合并多个 kubeconfig 文件 | ✅ |

### 🎯 角色模板

RBAC 租户管理支持 4 种预定义角色：

| 角色 | 权限范围 | 适用场景 |
|------|----------|----------|
| `readonly` | get/list/watch | 只读访问，适合查看和调试 |
| `developer` | 完整的工作负载管理权限 | 开发者日常操作 |
| `admin` | 命名空间管理员权限 | 团队负责人 |
| `custom` | 自定义规则 | 特殊需求（需 --rules-file）|

**示例**：

```bash
# 集群管理
帮我查一下广州地域的 TKE 集群
获取集群 cls-xxx 的 kubeconfig

# K8s 资源操作
帮我查看 default 命名空间的 Pod 状态
帮我部署 nginx 到 production 命名空间

# Helm 部署
帮我用 Helm 安装 nginx，3 副本

# 多租户管理
帮我创建一个账号 team-frontend，权限级别 developer，可以访问 frontend 命名空间
帮我生成 team-frontend 的安装 Prompt
```

---

## 🚀 一句话部署应用

**痛点**：用 AI 写完一个 Web 应用，想部署到 K8s 上，发现还要：
- 写 Dockerfile
- 构建镜像、推送镜像仓库
- 写 Deployment/Service/Ingress YAML
- 配置资源限制、健康检查
- 考虑高可用（多副本、反亲和性、PDB）
- ...

这些对熟悉 K8s 的人来说不难，但确实繁琐。对不熟悉 K8s 的开发者来说，更是一道门槛。

**使用 TKE Skill**：

```
帮我部署一个"你好，猴哥"静态页面到 TKE 集群
```

AI 将自动完成：

```
✅ 分析需求，设计部署方案
✅ 编写 Deployment、Service、ConfigMap 等 YAML
✅ 执行 kubectl apply 部署资源
✅ 设计架构方案（如 Nginx + Sidecar 模式解决 ARM/x86 兼容问题）
✅ 部署完成，访问地址: http://119.91.184.206
```

**实际验证**：

| 应用 | 类型 | 部署结果 | 访问地址 |
|------|------|----------|----------|
| 应用1 | 静态页面（"你好，猴哥"） | ✅ 成功 | http://119.91.184.206 |
| 应用2 | 复杂应用（需打包镜像） | ✅ 成功 | http://119.91.188.55 |

**核心价值**：

> 让 AI Coding 出来的应用，**一句话部署到 K8s 环境**，而不是永远停留在 `npm run dev`。

---

## 🔧 智能运维排障

**痛点**：生产环境出问题了，排查流程通常是：

1. 看告警 → 登录控制台 → 找到集群
2. 看 Pod 状态 → 看 Events → 看日志
3. 检查资源使用 → 检查节点状态
4. 搜索文档/Google → 尝试解决
5. 不行就找 SRE...

**使用 TKE Skill**：

```
帮我检查 my-app 为什么部署失败
分析 Pod 状态、查看日志、排查问题原因
```

AI 将自动执行排障流程：

```
🔍 正在分析 Pod 状态...

📋 发现问题 Pod: my-app-7d9f8b6c5d-xxxxx
   - 状态: CrashLoopBackOff
   - 原因: 容器启动失败

📊 日志分析:
   - 查看 Pod 日志，发现配置文件缺失
   - 检查 Events，发现镜像拉取正常

💡 诊断结论: 应用配置问题

🔧 解决方案:
   1. 补充缺失的 ConfigMap
   2. 更新 Deployment 挂载配置
   3. 重新部署
```

**实际验证**：在部署复杂应用时，AI 成功完成了：
- 分析 Pod 状态和事件
- 查看容器日志
- 诊断问题根因（如 ARM/x86 架构不兼容）
- 设计解决方案（Nginx + Sidecar 模式）

**核心价值**：

> 把 SRE 的排障经验固化成 AI 能力，**让普通开发者也能快速定位和解决 K8s 问题**。

---

## 🔮 后续规划

### ⚡ AI 应用运维增强

AI 帮你写完代码、部署上线后，运维才刚刚开始。我们计划支持一系列运维增强能力：

#### 自动伸缩配置

```
给 my-app 配置自动伸缩，CPU 超过 70% 就扩容，最多 10 个副本
```

AI 自动配置 HPA：
- 分析应用特点，推荐伸缩指标（CPU/内存/自定义指标）
- 设置合理的阈值和副本范围
- 配置缩容稳定窗口，避免频繁抖动

#### 故障自愈

```
给 my-app 配置故障自愈，应用挂了自动重启
```

AI 自动配置：
- 健康检查探针（HTTP/TCP/Exec）
- 重启策略和失败阈值
- PodDisruptionBudget 保证可用性

#### 资源优化建议

```
分析 my-app 最近 7 天的资源使用情况，看看配置是否合理
```

AI 分析后给出建议：
```
📊 my-app 资源分析报告（过去 7 天）

CPU:
  - 请求: 500m, 限制: 1000m
  - 实际平均: 120m, P99: 380m
  - 建议: requests 200m, limits 500m（可节省 60%）

内存:
  - 请求: 1Gi, 限制: 2Gi
  - 实际平均: 450Mi, P99: 680Mi
  - 建议: requests 512Mi, limits 1Gi（可节省 50%）

💰 优化后预计节省成本: ¥xxx/月
```

#### 灰度发布

```
把 my-app 更新到 v2 版本，先灰度 10% 流量
```

AI 自动执行金丝雀发布：
- 创建新版本 Deployment
- 配置流量权重（基于 Istio/Nginx Ingress）
- 监控错误率和延迟
- 异常自动回滚

---

## 💡 核心理念

> **AI Coding 不应该只是"写代码"，而是从编码到部署到运维的全链路能力增强。**

我们希望 TKE Skill 能让 AI 帮你写的代码：

| 阶段 | 传统方式 | 使用 TKE Skill |
|------|---------|---------------|
| **部署** | 手写 Dockerfile + YAML，学习 K8s 概念 | 一句话高可用部署 |
| **监控** | 配置 Prometheus + Grafana，写告警规则 | AI 自动配置，异常主动通知 |
| **伸缩** | 理解 HPA/VPA，调参优化 | 描述需求，AI 自动配置 |
| **排障** | 看日志、查文档、问 SRE | 一句话定位问题，给出方案 |
| **优化** | 定期人工分析资源使用 | AI 持续分析，主动建议 |

**这才是 AI + 云原生的正确打开方式 🚀**

---

## 🚧 当前状态

| 能力 | 状态 |
|------|------|
| TKE 集群管理（列表/状态/kubeconfig） | ✅ 已发布 |
| TCR 镜像仓库管理 | ✅ 已发布 |
| K8s 资源操作（get/apply/delete/logs/exec） | ✅ 已发布 |
| Helm 包管理（install/upgrade/uninstall） | ✅ 已发布 |
| 多租户 RBAC 管理 | ✅ 已发布 |
| Context/Kubeconfig 管理 | ✅ 已发布 |
| 一句话部署应用 | ✅ 已验证 |
| 智能运维排障 | ✅ 已验证 |
| 自动伸缩/故障自愈 | 📝 规划中 |
| 资源优化建议 | 📝 规划中 |
| 灰度发布 | 📝 规划中 |

---

## 🔗 相关文档

- [AI Copilot 概述](index.md) - 模块介绍和学习目标
- [用户故事](user-stories.md) - TKE Skill 使用场景和验收标准
- [POC 演示案例](poc-examples.md) - 实际验证案例（一句话部署、智能排障）
- [kubernetes-mcp-server 集成](k8s-mcp-integration.md) - MCP 协议集成方案

### 外部链接

- [TKE Skill GitHub](https://github.com/tkestack/tke-skill) - 源码和安装说明
- [TKE 产品文档](https://cloud.tencent.com/document/product/457)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
