# TKE Workshop

[![Deploy](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

Hands-on labs for Tencent Kubernetes Engine (TKE)

🌐 **Website**: [https://tke-workshop.github.io](https://tke-workshop.github.io)

**[中文文档](README_zh.md)**

---

## Principles

- **Modular** — Independent modules, each completable in 30-60 minutes
- **Unified Sample App** — Consistent microservices demo across all modules
- **TKE Focused** — Best practices specific to Tencent Kubernetes Engine
- **Community Driven** — Open source, contributions welcome

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

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick edit**: Click the ✏️ button on any page to edit directly on GitHub.

## Project Structure

```
tke-workshop.github.io/
├── docs/                 # Documentation content
│   ├── index.md         # Homepage
│   ├── basics/          # Getting started
│   ├── networking/      # Networking module
│   ├── observability/   # Observability module
│   ├── security/        # Security module
│   ├── ai-ml/           # AI/ML module
│   ├── data/            # Data module
│   └── control-plane/   # Control plane module
├── mkdocs.yml           # Site configuration
└── requirements.txt     # Python dependencies
```

## License

[Apache License 2.0](LICENSE)

**Copyright © 2024-2026 Tencent Cloud TKE Team**
