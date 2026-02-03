# TKE Workshop

[![Deploy](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

Hands-on labs for Tencent Kubernetes Engine (TKE)

🌐 **Website**: [https://tke-workshop.github.io](https://tke-workshop.github.io)

**[中文文档](README_zh.md)**

---

## 🤖 Agent-First Design

This documentation is **designed for AI Agents** (like Claude, GPT-4, etc.) to understand and execute TKE operations autonomously. Each document follows a structured format optimized for machine parsing and human readability.

### Why Agent-First?

Modern cloud operations increasingly rely on AI Agents for automation, troubleshooting, and infrastructure management. Traditional documentation is often:
- ❌ Unstructured and hard to parse
- ❌ Missing critical API parameters
- ❌ Lacking executable code examples
- ❌ Unclear about verification steps

Our **Agent-First** approach ensures:
- ✅ **Structured Metadata** — Every doc has machine-readable headers (API version, prerequisites, agent-friendliness score)
- ✅ **Complete API Tables** — Full parameter specifications with types, defaults, and constraints
- ✅ **Multi-Format Examples** — cURL, SDK (Python/Go), kubectl, and declarative YAML
- ✅ **Executable Cookbook** — Ready-to-run scripts in `cookbook/` directory
- ✅ **Clear Verification** — Step-by-step validation procedures
- ✅ **Error Handling** — Common errors with solutions and troubleshooting flows

### How to Use with AI Agents

**For Developers**:
```prompt
Please create a TKE cluster using the documentation at:
https://tke-workshop.github.io/basics/cluster/01-create-cluster/

Cluster requirements:
- Region: ap-guangzhou
- K8s version: 1.28.3
- 3 nodes (SA2.MEDIUM4)
```

**For Operations**:
```prompt
Deploy a microservice to my TKE cluster following best practices.
Reference: https://tke-workshop.github.io/basics/workload/01-create-deployment/
```

**For Automation**:
```python
# Use cookbook scripts directly
from cookbook.cluster import create_cluster
cluster_id = create_cluster.main(name="prod", region="ap-guangzhou")
```

### Document Structure Standards

Each operational document follows this template:

```markdown
# Document Title

## 文档元信息
- API Version: 2018-05-25
- Agent 友好度: ⭐⭐⭐⭐⭐
- 适用集群版本: All

## 功能概述
[Clear task objective]

## 前置条件
- [ ] Checklist format

## API 参数表
| Parameter | Required | Type | Description | Example |

## 操作步骤
### cURL Example
### SDK Example (Python/Go)
### kubectl/YAML Example

## 验证步骤
[Step-by-step validation]

## 异常处理
| Error Code | Cause | Solution |

## Agent Prompt 模板
[Copy-paste prompts for common scenarios]

## Cookbook 示例
[Link to executable script]
```

---

## Principles

- **🤖 Agent-First** — Optimized for AI Agent understanding and execution
- **📦 Executable** — Every operation has runnable code in `cookbook/`
- **🔄 Modular** — Independent modules, each completable in 30-60 minutes
- **🎯 TKE Focused** — Best practices specific to Tencent Kubernetes Engine
- **🌐 Community Driven** — Open source, contributions welcome

## Modules

| Module | Description |
|--------|-------------|
| **Basics** | Cluster creation, kubectl, app deployment |
| **Networking** | Service, Ingress, Network Policy, VPC-CNI |
| **Observability** | Monitoring, Logging, Tracing |
| **Security** | RBAC, Pod Security, Image Security |
| **AI/ML** | GPU scheduling, Model inference, Training |
| **Data** | Storage, Data processing |
| **Control Plane** | Cluster upgrades, High availability |

## Quick Start

### For Documentation

```bash
# Clone
git clone https://github.com/tke-workshop/tke-workshop.github.io.git
cd tke-workshop.github.io

# Setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run locally
mkdocs serve
# Open http://127.0.0.1:8000
```

### For Cookbook (Executable Scripts)

```bash
# Navigate to cookbook
cd cookbook

# Install dependencies
pip install -r requirements.txt

# Configure API credentials
cp config.example.yaml config.yaml
vim config.yaml  # Fill in your SecretId and SecretKey

# Run example: Create a TKE cluster
python3 cluster/create_cluster.py \
  --cluster-name my-cluster \
  --region ap-guangzhou \
  --wait

# Run example: Deploy Nginx
python3 workload/deploy_nginx.py \
  --replicas 3 \
  --expose \
  --service-type LoadBalancer
```

See [Cookbook README](cookbook/README.md) for more examples.

### Cookbook Web Interface

The project includes a **dynamic Cookbook aggregation platform** that showcases executable examples from multiple GitHub repositories:

**Features**:
- 🔗 **Dynamic Content Loading** — Aggregates cookbooks from external GitHub repos
- 📦 **Multi-Level Caching** — LocalStorage (1 hour) + GitHub API fallback
- 🚀 **Zero Maintenance** — Auto-syncs with source repositories
- 🎯 **Easy Extension** — Add new projects by editing config file

**Access**:
- **List Page**: [https://tke-workshop.github.io/cookbook-patterns.html](https://tke-workshop.github.io/cookbook-patterns.html)
- **Add New Cookbook**: Edit `docs/data/cookbook-config.js`

**Example Configuration**:
```javascript
{
  id: 'your-cookbook',
  title: 'Your TKE Cookbook',
  category: 'cluster|workload|gpu|networking|storage|testing',
  language: 'Python|Go|Bash|YAML',
  tags: ['tag1', 'tag2'],
  github: {
    repo: 'owner/repo-name',
    path: 'subfolder',  // Optional
    branch: 'main'
  },
  icon: '🚀'
}
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick edit**: Click the ✏️ button on any page to edit directly on GitHub.

## Project Structure

```
tke-workshop.github.io/
├── docs/                 # 📚 Documentation content
│   ├── index.md         # Homepage with Agent-First intro
│   ├── basics/          # Getting started (cluster, node, workload)
│   ├── networking/      # Networking module (service, ingress)
│   ├── observability/   # Observability module (monitoring, logging)
│   ├── security/        # Security module (RBAC, policies)
│   ├── ai-ml/           # AI/ML module (GPU scheduling)
│   ├── data/            # Data module (storage, databases)
│   ├── control-plane/   # Control plane module (upgrades, HA)
│   ├── cookbook-patterns.html      # 🍳 Cookbook list page
│   ├── cookbook-detail-v2.html     # Cookbook detail page
│   ├── data/
│   │   └── cookbook-config.js      # Cookbook configuration
│   └── js/
│       └── cookbook-loader.js      # Dynamic GitHub content loader
├── cookbook/            # 🍳 Executable scripts (Agent-ready)
│   ├── cluster/         # Cluster operations (create, delete)
│   ├── node/            # Node management (add, remove)
│   ├── workload/        # Workload deployment (Nginx, microservices)
│   ├── service/         # Service creation (ClusterIP, LoadBalancer)
│   ├── scenarios/       # Complete scenarios (blue-green, canary)
│   ├── common/          # Shared utilities (auth, logger)
│   ├── requirements.txt # Python dependencies
│   └── config.example.yaml  # Configuration template
├── mkdocs.yml           # Site configuration
├── CODEBUDDY.md         # AI Agent development guide
└── requirements.txt     # Documentation dependencies
```

## License

[Apache License 2.0](LICENSE)

**Copyright © 2024-2026 Tencent Cloud TKE Team**
