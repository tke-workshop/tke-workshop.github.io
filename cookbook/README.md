# TKE Workshop Cookbook

> 🍳 **可一键运行的 TKE 操作场景脚本库**

## 📖 简介

Cookbook 提供完整的、可立即执行的 TKE 操作脚本和场景示例，帮助用户快速上手并在实际环境中验证功能。

**设计理念**:
- ✅ **一键运行**: 配置好 API 密钥即可执行
- ✅ **完整错误处理**: 包含详细的异常捕获和日志
- ✅ **Agent 友好**: 结构化输出，易于 AI Agent 理解和调用
- ✅ **生产就绪**: 可直接应用于生产环境的最佳实践代码

---

## 🚀 快速开始

### 前置条件

1. **Python 3.8+** 或 **Go 1.19+**
2. **腾讯云 API 密钥** (SecretId 和 SecretKey)
3. **kubectl** (用于 Kubernetes 操作)

### 安装依赖

```bash
# Python 依赖
pip install -r requirements.txt

# Go 依赖
go mod download
```

### 配置 API 密钥

```bash
# 复制配置模板
cp config.example.yaml config.yaml

# 编辑配置文件
vim config.yaml
```

**config.yaml 示例**:

```yaml
tencent_cloud:
  secret_id: "YOUR_SECRET_ID"
  secret_key: "YOUR_SECRET_KEY"
  region: "ap-guangzhou"

cluster:
  cluster_id: "cls-xxxxxxxx"
  vpc_id: "vpc-xxxxxxxx"
  subnet_id: "subnet-xxxxxxxx"

kubeconfig:
  path: "~/.kube/config"
```

---

## 📂 目录结构

```
cookbook/
├── README.md                    # 本文件
├── requirements.txt             # Python 依赖
├── go.mod                       # Go 依赖
├── config.example.yaml          # 配置模板
├── common/                      # 通用工具库
│   ├── auth.py                  # 认证工具
│   ├── logger.py                # 日志工具
│   └── k8s_client.py            # Kubernetes 客户端
├── cluster/                     # 集群管理
│   ├── README.md
│   ├── create_cluster.py        # 创建集群
│   ├── delete_cluster.py        # 删除集群
│   ├── create_cluster.go        # Go 版本
│   └── create_cluster.sh        # Shell 版本
├── node/                        # 节点管理
│   ├── README.md
│   ├── add_node.py              # 添加节点
│   ├── delete_node.py           # 删除节点
│   └── batch_add_nodes.py       # 批量添加节点
├── workload/                    # 工作负载
│   ├── README.md
│   ├── deploy_nginx.py          # 部署 Nginx
│   ├── deploy_nginx.yaml        # Nginx YAML 配置
│   ├── deploy_microservice.py  # 部署微服务
│   └── update_deployment.py    # 更新 Deployment
├── service/                     # 服务管理
│   ├── README.md
│   ├── create_clusterip.py     # 创建 ClusterIP Service
│   ├── create_loadbalancer.py  # 创建 LoadBalancer Service
│   └── expose_service.yaml     # Service YAML 配置
└── scenarios/                   # 完整场景
    ├── blue_green_deployment/   # 蓝绿部署
    │   ├── README.md
    │   ├── blue_green.py
    │   └── manifests/
    ├── canary_release/          # 金丝雀发布
    │   ├── README.md
    │   ├── canary.py
    │   └── manifests/
    ├── disaster_recovery/       # 灾难恢复
    │   ├── README.md
    │   ├── backup.py
    │   └── restore.py
    └── auto_scaling/            # 自动扩缩容
        ├── README.md
        ├── setup_hpa.py
        └── load_test.sh
```

---

## 🎯 使用示例

### 示例 1: 创建 TKE 集群

```bash
# Python 版本
python3 cluster/create_cluster.py \
  --cluster-name my-cluster \
  --region ap-guangzhou \
  --k8s-version 1.28.3

# Go 版本
go run cluster/create_cluster.go \
  -name my-cluster \
  -region ap-guangzhou \
  -version 1.28.3

# Shell 版本
bash cluster/create_cluster.sh my-cluster ap-guangzhou
```

### 示例 2: 部署 Nginx 应用

```bash
# 使用 Python SDK
python3 workload/deploy_nginx.py \
  --cluster-id cls-xxxxxxxx \
  --replicas 3

# 使用 YAML 配置
kubectl apply -f workload/deploy_nginx.yaml
```

### 示例 3: 蓝绿部署场景

```bash
cd scenarios/blue_green_deployment

# 部署蓝色版本
python3 blue_green.py deploy --version blue

# 部署绿色版本
python3 blue_green.py deploy --version green

# 切换流量到绿色版本
python3 blue_green.py switch --to green

# 回滚到蓝色版本
python3 blue_green.py rollback --to blue
```

---

## 📚 分类索引

### 集群管理 (cluster/)

| 脚本 | 语言 | 功能 | 文档链接 |
|------|------|------|---------|
| `create_cluster.py` | Python | 创建 TKE 集群 | [docs](../docs/basics/cluster/01-create-cluster.md) |
| `delete_cluster.py` | Python | 删除 TKE 集群 | [docs](../docs/basics/cluster/02-delete-cluster.md) |
| `create_cluster.go` | Go | 创建集群 (Go 版本) | [docs](../docs/basics/cluster/01-create-cluster.md) |
| `create_cluster.sh` | Shell | 创建集群 (Shell 版本) | [docs](../docs/basics/cluster/01-create-cluster.md) |

### 节点管理 (node/)

| 脚本 | 语言 | 功能 | 文档链接 |
|------|------|------|---------|
| `add_node.py` | Python | 添加节点到集群 | [docs](../docs/basics/node/01-add-node.md) |
| `delete_node.py` | Python | 从集群删除节点 | [docs](../docs/basics/node/02-delete-node.md) |
| `batch_add_nodes.py` | Python | 批量添加节点 | [docs](../docs/basics/node/01-add-node.md) |

### 工作负载 (workload/)

| 脚本 | 语言 | 功能 | 文档链接 |
|------|------|------|---------|
| `deploy_nginx.py` | Python | 部署 Nginx 示例 | [docs](../docs/basics/workload/01-create-deployment.md) |
| `deploy_microservice.py` | Python | 部署微服务应用 | [docs](../docs/basics/workload/01-create-deployment.md) |
| `update_deployment.py` | Python | 滚动更新 Deployment | [docs](../docs/basics/workload/02-update-deployment.md) |

### 服务管理 (service/)

| 脚本 | 语言 | 功能 | 文档链接 |
|------|------|------|---------|
| `create_clusterip.py` | Python | 创建 ClusterIP Service | [docs](../docs/basics/service/01-create-service.md) |
| `create_loadbalancer.py` | Python | 创建 LoadBalancer Service | [docs](../docs/basics/service/01-create-service.md) |

### 完整场景 (scenarios/)

| 场景 | 语言 | 功能 | 难度 |
|------|------|------|------|
| `blue_green_deployment/` | Python | 蓝绿部署完整流程 | ⭐⭐⭐ |
| `canary_release/` | Python | 金丝雀发布 | ⭐⭐⭐ |
| `disaster_recovery/` | Python | 灾难恢复和备份 | ⭐⭐⭐⭐ |
| `auto_scaling/` | Python | 自动扩缩容配置 | ⭐⭐ |

---

## 🛠️ 开发指南

### 添加新脚本

1. **创建脚本文件**

   ```bash
   touch cluster/new_feature.py
   ```

2. **使用标准模板**

   ```python
   #!/usr/bin/env python3
   """
   脚本名称: 新功能脚本
   功能描述: 实现某个 TKE 功能
   使用方法: python3 new_feature.py --help
   """
   
   import argparse
   import sys
   from common.auth import get_tke_client
   from common.logger import setup_logger
   
   logger = setup_logger(__name__)
   
   def main():
       parser = argparse.ArgumentParser(description='新功能脚本')
       parser.add_argument('--param', required=True, help='参数说明')
       args = parser.parse_args()
       
       try:
           client = get_tke_client()
           # 实现功能逻辑
           logger.info("操作成功")
       except Exception as e:
           logger.error(f"操作失败: {e}")
           sys.exit(1)
   
   if __name__ == '__main__':
       main()
   ```

3. **添加文档**

   在对应目录的 `README.md` 中添加脚本说明。

4. **添加测试**

   在 `tests/` 目录下添加单元测试。

### 代码规范

- **Python**: 遵循 PEP 8
- **Go**: 遵循 Go Code Review Comments
- **Shell**: 遵循 Google Shell Style Guide
- **所有脚本**: 必须包含完整的错误处理和日志

---

## 🧪 测试

```bash
# Python 测试
pytest tests/

# Go 测试
go test ./...

# Shell 脚本检查
shellcheck cluster/*.sh
```

---

## 🤝 贡献

欢迎贡献新的 Cookbook 示例！请参考 [CONTRIBUTING.md](../CONTRIBUTING.md)。

**贡献要求**:
- ✅ 代码可运行且经过测试
- ✅ 包含完整的文档和注释
- ✅ 遵循项目代码规范
- ✅ 包含错误处理和日志

---

## 📄 许可证

[Apache License 2.0](../LICENSE)

---

## 🔗 相关链接

- **主文档**: [TKE Workshop](https://tke-workshop.github.io)
- **API 文档**: [腾讯云 TKE API](https://cloud.tencent.com/document/product/457)
- **SDK 文档**: [腾讯云 SDK](https://cloud.tencent.com/document/sdk)
- **问题反馈**: [GitHub Issues](https://github.com/tke-workshop/tke-workshop.github.io/issues)

---

**维护者**: TKE Workshop Team  
**最后更新**: 2026-01-07
