---
title: TKE Skill + AI Copilot 实践记录
date: 2026-03-12
tags: ['AI编程', '云原生', 'TKE', '工作流自动化']
description: 记录使用 TKE Skill 和 kubernetes-mcp-server 部署项目到 TKE 的真实体验和改进建议
---

# TKE Skill + AI Copilot 实践记录

## 🤔 为什么要做这件事

作为 TKE 的产品经理，我一直在思考：**AI 编程助手时代，用户管理 Kubernetes 集群的体验能不能更简单？**

理想场景是这样的：

```
用户: 把当前项目部署到 TKE 集群 cls-xxx
AI: 好的，已完成部署！访问地址是 http://x.x.x.x
```

一句话，AI 全搞定。不需要手动写 Dockerfile、不需要配置 kubeconfig、不需要写 K8s YAML。

为了验证这个想法，我决定用自己的 TKE Workshop 项目来实测一下。

---

## 🎯 目标和工具

### 期望达成的效果

1. ✅ 一句话部署：用户说"部署到 TKE"，AI 自动完成所有步骤
2. ✅ 智能排障：Pod 有问题时，AI 自动分析并给出建议
3. ✅ 端到端闭环：从代码到运行，无需人工干预

### 使用的工具组合

| 工具 | 作用 | 来源 |
|------|------|------|
| **TKE Skill** | 腾讯云 TKE 平台操作（集群管理、获取 kubeconfig） | CodeBuddy 内置 |
| **kubernetes-mcp-server** | K8s 集群内操作（部署、日志、Helm） | 开源 MCP Server |
| **本地 Docker** | 构建镜像 | 本地环境 |
| **TCR 个人版** | 托管镜像 | 腾讯云免费服务 |

坦白说，看到需要组合这么多工具，我心里就有点打鼓了。

---

## 🛠️ 实际动手过程

### 第一步：配置工具

**TKE Skill 配置**（比较简单）：

```bash
# 配置腾讯云凭证
export TENCENTCLOUD_SECRET_ID="xxx"
export TENCENTCLOUD_SECRET_KEY="xxx"
```

**kubernetes-mcp-server 配置**：

编辑 `~/.codebuddy/mcp.json`：

```json
{
  "mcpServers": {
    "kubernetes": {
      "command": "npx",
      "args": ["-y", "kubernetes-mcp-server@latest"]
    }
  }
}
```

这一步其实还好，按照文档配置就行。

### 第二步：尝试部署

我信心满满地说：

```
把 TKE Workshop 项目部署到集群 cls-1l0io2fu
```

然后... AI 开始了它的"自主发挥"：

```
AI 执行流程:
  1. [TKE Skill] 获取 kubeconfig ✅
  2. [保存文件] 把 kubeconfig 写到本地 ✅
  3. [分析项目] 这是个文档站点项目，需要 Dockerfile ✅
  4. [生成文件] 创建 Dockerfile ✅
  5. [终端] docker build... ❌ 报错
  6. [修复] 换个基础镜像... ✅
  7. [终端] docker build... ✅
  8. [终端] docker push... ❌ 没登录 TCR
  9. [提示] 需要先登录 TCR...
  10. [手动] 我去控制台获取登录命令...
  11. [终端] docker push... ✅
  12. [kubernetes-mcp] 创建 Deployment... ❌ 404
  13. [排查] kubeconfig 路径不对...
  14. [修复] 重新配置...
  15. [kubernetes-mcp] 创建 Deployment... ✅
  16. [验证] Pod 状态... ✅ Running
```

实际上经历了好几轮对话才完成部署。😅

### 第三步：问题诊断

最大的问题是：**TKE Skill 和 kubernetes-mcp 是两个独立的工具，中间的数据流转全靠 AI "猜"**。

举个例子：

```
TKE Skill 获取的 kubeconfig:
  → AI 需要自己决定保存到哪个路径
  → kubernetes-mcp 需要读取这个路径
  → 如果路径不一致，就 404

这个过程完全依赖 AI 的"自主发挥"，没有标准流程。
```

---

## 😕 真实遇到的问题

### 问题 1：能力割裂

**TKE Skill 只能做"一半"的事**：

| 能力 | TKE Skill | kubernetes-mcp | 备注 |
|------|-----------|----------------|------|
| 获取 kubeconfig | ✅ | - | 但用户需要手动保存 |
| 部署 Deployment | ❌ | ✅ | TKE Skill 不支持 |
| 查看 Pod 日志 | ❌ | ✅ | TKE Skill 不支持 |
| 查看 Events | ❌ | ✅ | TKE Skill 不支持 |
| 镜像推送 | ❌ | ❌ | 都不支持 |

这意味着：**装好 TKE Skill，你还是什么都做不了**，必须再装 kubernetes-mcp。

### 问题 2：kubeconfig 流转不顺畅

```
TKE Skill: 这是 kubeconfig 内容
AI: 我保存到 ~/.kube/config...（自己决定的）
kubernetes-mcp: 我默认读 ~/.kube/config...（可能不一致）

中间全靠 AI 自己协调，容易出错。
```

### 问题 3：镜像构建/推送是断点

```
项目代码 → [构建镜像] → [推送镜像] → [部署到 K8s]
               ❌ 没有自动化     ❌ 没有自动化
```

目前需要：
1. 手动登录 TCR（去控制台拿命令）
2. 手动 docker build
3. 手动 docker push

这和"一句话部署"的理想差太远了。

---

## 🎯 最终实现的效果

经过一番折腾，最终还是成功部署了。但过程比我预期的复杂很多。

**实际步骤**：

```bash
# 1. 手动登录 TCR（一次性）
docker login ccr.ccs.tencentyun.com -u xxx

# 2. AI 构建和推送
AI: docker build -t tke-workshop:v1 .
AI: docker tag tke-workshop:v1 ccr.ccs.tencentyun.com/virgil/tke-workshop:v1
AI: docker push ccr.ccs.tencentyun.com/virgil/tke-workshop:v1

# 3. AI 获取 kubeconfig
AI: [TKE Skill] get_kubeconfig(cluster_id="cls-1l0io2fu")

# 4. AI 部署资源
AI: [kubernetes-mcp] resources_create_or_update(Deployment)
AI: [kubernetes-mcp] resources_create_or_update(Service)

# 5. AI 验证
AI: [kubernetes-mcp] pods_list() → 3 个 Pod Running
```

**最终效果**：

- ✅ 部署成功，服务可访问
- ⚠️ 过程需要多轮对话
- ⚠️ 需要手动配置 TCR 登录

---

## 💭 真实感受和反思

### 做得好的地方

1. **TKE Skill 的基础能力是 OK 的**：获取 kubeconfig、查看集群信息都没问题
2. **kubernetes-mcp 很强大**：Pod 操作、Helm 管理、Events 查看都支持
3. **组合起来确实能完成任务**：虽然麻烦，但最终能部署成功

### 需要改进的地方

1. **TKE Skill 应该是端到端的**：装一个 Skill 就能完成所有 TKE 操作
2. **kubeconfig 应该自动管理**：用户不需要关心保存在哪里
3. **镜像操作应该内置**：TCR 登录、推送应该是 TKE Skill 的一部分
4. **kubectl 操作应该内置**：部署、查看日志不应该依赖外部工具

### 对用户的影响

如果我是一个普通用户，看到"TKE Skill"：
- **期望**：装上就能用，一句话部署到 TKE
- **现实**：还要装 kubernetes-mcp，还要配 TCR，还要多轮对话

这个落差太大了。

---

## 🔧 改进建议

我把完整的改进建议整理成了一份文档，核心观点：

### TKE Skill 应该成为"TKE 全能助手"

**当前状态**：TKE API 查询器（查集群、获取 kubeconfig）

**期望状态**：TKE 端到端运维工具

### P0 必须支持的能力

```bash
# kubectl 操作（TKE Skill 内部管理 kubeconfig）
tke kubectl --cluster-id cls-xxx get pods
tke kubectl --cluster-id cls-xxx apply -f deployment.yaml
tke kubectl --cluster-id cls-xxx logs pod/xxx

# Pod 操作
tke pods-list --cluster-id cls-xxx
tke pods-logs --cluster-id cls-xxx --pod xxx
```

### P1 强烈建议的能力

```bash
# 排障
tke events --cluster-id cls-xxx
tke describe --cluster-id cls-xxx --resource pod --name xxx

# TCR 集成
tke tcr-login --region ap-guangzhou
tke tcr-push --image xxx --namespace xxx
```

### 核心原则

**用户装好 TKE Skill 后，应该能直接说：**

```
把当前项目部署到 TKE 集群 cls-xxx
```

**TKE Skill 自己完成**：
1. 分析项目，生成 Dockerfile
2. 构建镜像
3. 推送到 TCR
4. 获取 kubeconfig（内部完成）
5. 生成 K8s YAML
6. 部署资源
7. 验证 Pod 状态
8. 返回访问地址

**不需要**：
- ❌ 额外安装 kubernetes-mcp-server
- ❌ 手动配置 TCR 登录
- ❌ 多轮对话反复调整

---

## 📊 时间投入

| 阶段 | 预期时间 | 实际时间 |
|------|---------|---------|
| 配置工具 | 5 分钟 | 15 分钟 |
| 首次部署 | 1 分钟 | 30 分钟 |
| 排障和调整 | - | 20 分钟 |
| 总计 | 6 分钟 | 65 分钟 |

说实话，如果我直接手动 `kubectl apply`，可能 10 分钟就搞定了。😂

---

## 🎉 总结

### 核心结论

**TKE Skill 目前只是"半个能力"**，必须配合 kubernetes-mcp-server 才能完成基本的部署和运维场景。

这不符合用户的预期——用户装一个"TKE Skill"，期望的是它能搞定所有 TKE 相关的事情。

### 给 TKE Skills 研发的建议

1. **扩展 K8s 集群内操作**：kubectl apply/get/delete、Pod 日志、Events
2. **内置 kubeconfig 管理**：用户无需感知，TKE Skill 自己处理
3. **集成 TCR 操作**：登录、推送、列出镜像
4. **提供高级命令**：`tke deploy --cluster-id xxx` 一键完成所有步骤

### 这个实验的价值

虽然体验不如预期，但这次实验帮我：

1. 深入理解了 AI + K8s 运维的工具链
2. 明确了 TKE Skill 的改进方向
3. 产出了可复用的部署流程文档

---

## 🔗 相关资源

- TKE Skill + kubernetes-mcp 集成指南
- POC 场景示例
- TKE Skill 改进建议

---

## 📝 关于这篇文章

这篇文章基于真实的部署实验撰写，记录了使用 TKE Skill + AI Copilot 部署项目的完整过程。

写这篇文章的目的：
1. 如实记录体验，给 TKE Skills 研发提供改进参考
2. 帮助其他用户了解当前工具的能力边界
3. 探索 AI + K8s 运维的最佳实践

**说实话**：AI 编程助手 + K8s 运维这个方向很有价值，但目前的工具链还不够成熟。期待 TKE Skill 未来能做到真正的"一句话部署"。
