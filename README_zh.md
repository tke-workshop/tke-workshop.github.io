# TKE Workshop

[![Deploy](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

腾讯云容器服务 TKE 动手实践教程

🌐 **在线访问**: [https://tke-workshop.github.io](https://tke-workshop.github.io)

**[English](README.md)**

---

## 设计原则

- **模块化** — 独立模块，每个 30-60 分钟可完成
- **统一示例应用** — 所有模块使用同一套微服务示例
- **聚焦 TKE** — 腾讯云容器服务最佳实践
- **社区共建** — 开源协作，欢迎贡献

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

## 参与贡献

欢迎各种形式的贡献！详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

**快速编辑**：点击任意页面右上角的 ✏️ 按钮，直接在 GitHub 上编辑。

## 目录结构

```
tke-workshop.github.io/
├── docs/                 # 文档内容
│   ├── index.md         # 首页
│   ├── basics/          # 快速入门
│   ├── networking/      # 网络
│   ├── observability/   # 可观测性
│   ├── security/        # 安全
│   ├── ai-ml/           # AI/ML
│   ├── data/            # Data
│   └── control-plane/   # 控制面
├── mkdocs.yml           # 站点配置
└── requirements.txt     # Python 依赖
```

## License

[Apache License 2.0](LICENSE)

**Copyright © 2024-2026 Tencent Cloud TKE Team**
