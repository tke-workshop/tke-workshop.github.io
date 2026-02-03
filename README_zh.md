# TKE Workshop

[![Deploy](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

腾讯云容器服务 TKE 动手实践教程

🌐 **在线访问**: [https://tke-workshop.github.io](https://tke-workshop.github.io)

**[English](README.md)**

---

## 🤖 Agent-First 设计理念

本文档专为 **AI Agent**（如 Claude、GPT-4 等）设计，使其能够自主理解和执行 TKE 操作。每篇文档都遵循结构化格式，兼顾机器解析和人类可读性。

### 为什么选择 Agent-First？

现代云运维越来越依赖 AI Agent 进行自动化、故障排查和基础设施管理。传统文档存在诸多问题：
- ❌ 结构不清晰，难以解析
- ❌ 缺少关键 API 参数
- ❌ 没有可执行代码示例
- ❌ 验证步骤不明确

我们的 **Agent-First** 方法确保：
- ✅ **结构化元数据** — 每篇文档都有机器可读的头部（API 版本、前置条件、Agent 友好度评分）
- ✅ **完整 API 参数表** — 包含类型、默认值和约束的完整参数规范
- ✅ **多格式示例** — cURL、SDK（Python/Go）、kubectl 和声明式 YAML
- ✅ **可执行 Cookbook** — `cookbook/` 目录中的即用型脚本
- ✅ **清晰验证步骤** — 逐步验证流程
- ✅ **错误处理** — 常见错误及解决方案和故障排查流程

### 如何与 AI Agent 配合使用

**开发人员场景**:
```prompt
请使用以下文档创建一个 TKE 集群:
https://tke-workshop.github.io/basics/cluster/01-create-cluster/

集群要求:
- 地域: ap-guangzhou
- K8s 版本: 1.28.3
- 3 个节点 (SA2.MEDIUM4)
```

**运维场景**:
```prompt
按照最佳实践部署一个微服务到我的 TKE 集群。
参考文档: https://tke-workshop.github.io/basics/workload/01-create-deployment/
```

**自动化场景**:
```python
# 直接使用 cookbook 脚本
from cookbook.cluster import create_cluster
cluster_id = create_cluster.main(name="prod", region="ap-guangzhou")
```

### 文档结构标准

每篇操作文档遵循以下模板：

```markdown
# 文档标题

## 文档元信息
- API 版本: 2018-05-25
- Agent 友好度: ⭐⭐⭐⭐⭐
- 适用集群版本: 所有版本

## 功能概述
[明确的任务目标]

## 前置条件
- [ ] 清单格式

## API 参数表
| 参数名 | 必填 | 类型 | 说明 | 示例值 |

## 操作步骤
### cURL 示例
### SDK 示例 (Python/Go)
### kubectl/YAML 示例

## 验证步骤
[逐步验证流程]

## 异常处理
| 错误码 | 原因 | 解决方案 |

## Agent Prompt 模板
[常见场景的可复制提示词]

## Cookbook 示例
[可执行脚本链接]
```

---

## 设计原则

- **🤖 Agent-First** — 面向 AI Agent 优化，易于理解和执行
- **📦 可执行** — 每个操作都有 `cookbook/` 中的可运行代码
- **🔄 模块化** — 独立模块，每个 30-60 分钟可完成
- **🎯 聚焦 TKE** — 腾讯云容器服务专属最佳实践
- **🌐 社区共建** — 开源协作，欢迎贡献

## 学习模块

| 模块 | 内容 |
|------|------|
| **快速入门** | 集群创建、kubectl 操作、应用部署 |
| **网络** | Service、Ingress、网络策略、VPC-CNI |
| **可观测性** | 监控告警、日志采集、链路追踪 |
| **安全** | RBAC、Pod 安全、镜像安全 |
| **AI/ML** | GPU 调度、模型推理、训练任务 |
| **Data** | 存储配置、数据处理 |
| **控制面** | 集群升级、高可用 |

## 快速开始

### 文档站点

```bash
# 克隆仓库
git clone https://github.com/tke-workshop/tke-workshop.github.io.git
cd tke-workshop.github.io

# 环境准备
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 本地预览
mkdocs serve
# 浏览器打开 http://127.0.0.1:8000
```

### Cookbook（可执行脚本）

```bash
# 进入 cookbook 目录
cd cookbook

# 安装依赖
pip install -r requirements.txt

# 配置 API 密钥
cp config.example.yaml config.yaml
vim config.yaml  # 填入你的 SecretId 和 SecretKey

# 示例：创建 TKE 集群
python3 cluster/create_cluster.py \
  --cluster-name my-cluster \
  --region ap-guangzhou \
  --wait

# 示例：部署 Nginx
python3 workload/deploy_nginx.py \
  --replicas 3 \
  --expose \
  --service-type LoadBalancer
```

更多示例请参考 [Cookbook README](cookbook/README.md)。

### Cookbook 网页界面

本项目包含一个**动态 Cookbook 聚合平台**，展示来自多个 GitHub 仓库的可执行示例：

**核心特性**:
- 🔗 **动态内容加载** — 聚合来自外部 GitHub 仓库的 Cookbook
- 📦 **多级缓存机制** — LocalStorage（1小时） + GitHub API 降级
- 🚀 **零维护成本** — 自动同步源仓库内容
- 🎯 **轻松扩展** — 通过编辑配置文件即可添加新项目

**访问入口**:
- **列表页**: [https://tke-workshop.github.io/cookbook-patterns.html](https://tke-workshop.github.io/cookbook-patterns.html)
- **添加新 Cookbook**: 编辑 `docs/data/cookbook-config.js`

**配置示例**:
```javascript
{
  id: 'your-cookbook',
  title: '你的 TKE Cookbook',
  category: 'cluster|workload|gpu|networking|storage|testing',
  language: 'Python|Go|Bash|YAML',
  tags: ['标签1', '标签2'],
  github: {
    repo: 'owner/repo-name',
    path: 'subfolder',  // 可选
    branch: 'main'
  },
  icon: '🚀'
}
```

## 参与贡献

欢迎各种形式的贡献！详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

**快速编辑**：点击任意页面右上角的 ✏️ 按钮，直接在 GitHub 上编辑。

## 目录结构

```
tke-workshop.github.io/
├── docs/                 # 📚 文档内容
│   ├── index.md         # 首页（Agent-First 介绍）
│   ├── basics/          # 快速入门（集群、节点、工作负载）
│   ├── networking/      # 网络（Service、Ingress）
│   ├── observability/   # 可观测性（监控、日志）
│   ├── security/        # 安全（RBAC、策略）
│   ├── ai-ml/           # AI/ML（GPU 调度）
│   ├── data/            # Data（存储、数据库）
│   ├── control-plane/   # 控制面（升级、高可用）
│   ├── cookbook-patterns.html      # 🍳 Cookbook 列表页
│   ├── cookbook-detail-v2.html     # Cookbook 详情页
│   ├── data/
│   │   └── cookbook-config.js      # Cookbook 配置文件
│   └── js/
│       └── cookbook-loader.js      # 动态 GitHub 内容加载器
├── cookbook/            # 🍳 可执行脚本（Agent 就绪）
│   ├── cluster/         # 集群操作（创建、删除）
│   ├── node/            # 节点管理（添加、移除）
│   ├── workload/        # 工作负载部署（Nginx、微服务）
│   ├── service/         # 服务创建（ClusterIP、LoadBalancer）
│   ├── scenarios/       # 完整场景（蓝绿部署、金丝雀）
│   ├── common/          # 共享工具（认证、日志）
│   ├── requirements.txt # Python 依赖
│   └── config.example.yaml  # 配置模板
├── mkdocs.yml           # 站点配置
├── CODEBUDDY.md         # AI Agent 开发指南
└── requirements.txt     # 文档依赖
```

## License

[Apache License 2.0](LICENSE)

**Copyright © 2024-2026 Tencent Cloud TKE Team**
