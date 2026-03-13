# TKE Skill：让 AI 成为你的 K8s 运维助手

TKE Skill 是一个 **AI Agent 扩展能力**，让任何支持 Skill/Tool 机制的 AI Agent（如 CodeBuddy、Claude、GPT 等）可以直接调用腾讯云 TKE API，完成 K8s 集群的查询、部署和运维任务。

**简单说：给 AI 装上 K8s 运维能力。**

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

**AI 能帮你写代码，但写完代码只是开始。**

TKE Skill 要解决的问题——让 AI 不仅能写代码，还能帮你部署、运维、排障。

---

## 🛠️ 当前能力（v1.0）

当前版本主要支持**只读查询**，为后续部署和运维能力打基础：

| 能力 | 说明 |
|------|------|
| 集群列表/状态查询 | 查看所有集群、运行状态、版本信息 |
| kubeconfig 获取 | 一句话获取集群访问凭证 |
| 节点池查询 | 查看节点池配置和节点状态 |

**示例**：

```
帮我查一下广州地域的 TKE 集群
获取集群 cls-xxx 的 kubeconfig
```

这些基础能力已经能解决一些日常痛点（比如新入职配置 N 个集群的 kubeconfig），但这只是开始。

---

## 🔮 后续规划：AI + K8s 的完整闭环

我们正在扩展更多能力，目标是让 AI 真正成为你的"云原生全栈助手"——**从编码到部署到运维的全链路能力增强**。

### 🚀 一句话部署应用

**痛点**：用 AI 写完一个 Web 应用，想部署到 K8s 上，发现还要：
- 写 Dockerfile
- 构建镜像、推送镜像仓库
- 写 Deployment/Service/Ingress YAML
- 配置资源限制、健康检查
- 考虑高可用（多副本、反亲和性、PDB）
- ...

这些对熟悉 K8s 的人来说不难，但确实繁琐。对不熟悉 K8s 的开发者来说，更是一道门槛。

**使用 TKE Skill（规划中）**：

```
帮我把当前项目部署到 cls-xxx 集群，3 副本高可用
```

AI 将自动完成：

```
✅ 分析项目结构，识别为 Node.js 应用
✅ 生成 Dockerfile（基于 node:20-alpine）
✅ 构建镜像并推送到 TCR（镜像地址：ccr.ccs.tencentyun.com/xxx/my-app:v1）
✅ 生成生产级 K8s 配置：
   - Deployment: 3 副本 + Pod 反亲和性
   - 资源限制: requests 100m/128Mi, limits 500m/512Mi
   - 健康检查: readinessProbe + livenessProbe
   - 安全上下文: non-root user
✅ 创建 Service (ClusterIP) + Ingress
✅ 部署完成，访问地址: https://my-app.example.com
```

**核心价值**：

> 让 AI Coding 出来的应用，**一键高可用部署到生产级 K8s 环境**，而不是永远停留在 `npm run dev`。

---

### 🔧 智能运维排障

**痛点**：生产环境出问题了，排查流程通常是：

1. 看告警 → 登录控制台 → 找到集群
2. 看 Pod 状态 → 看 Events → 看日志
3. 检查资源使用 → 检查节点状态
4. 搜索文档/Google → 尝试解决
5. 不行就找 SRE...

**使用 TKE Skill（规划中）**：

```
集群 cls-xxx 有 Pod 一直 Pending，帮我排查一下
```

AI 将自动执行排障流程：

```
🔍 正在分析 Pending Pod...

📋 发现问题 Pod: my-app-7d9f8b6c5d-xxxxx
   - 状态: Pending (已持续 5 分钟)
   - 原因: 0/3 nodes are available: 3 Insufficient memory

📊 集群资源分析:
   - 节点总数: 3
   - 可分配内存: 2.1Gi / 12Gi (已用 82%)
   - Pod 请求内存: 1Gi

💡 诊断结论: 集群内存资源不足

🔧 建议解决方案:
   1. [推荐] 扩容节点池 np-xxx，增加 1-2 个节点
   2. 降低 Pod 内存请求（当前 1Gi，建议 512Mi）
   3. 检查是否有可释放的低优先级 Pod

是否需要我帮你执行扩容？
```

**核心价值**：

> 把 SRE 的排障经验固化成 AI 能力，**让普通开发者也能快速定位和解决 K8s 问题**。

---

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
| 集群查询（列表/状态/kubeconfig） | ✅ 已发布 |
| 节点池查询 | ✅ 已发布 |
| 一句话部署应用 | 🚧 开发中 |
| 智能运维排障 | 📝 规划中 |
| 自动伸缩/故障自愈 | 📝 规划中 |
| 资源优化建议 | 📝 规划中 |
| 灰度发布 | 📝 规划中 |

---

## 🔗 相关链接

- [TKE Skill GitHub](https://github.com/tkestack/tke-skill) - 源码和安装说明
- [TKE 产品文档](https://cloud.tencent.com/document/product/457)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
