# TKE Cookbook

完整可执行的代码示例，帮助您快速上手 TKE API 和 Kubernetes 操作。

---

## 📦 快速开始

### 环境准备

```bash
# 克隆仓库
git clone https://github.com/tke-workshop/tke-workshop.github.io.git
cd tke-workshop.github.io/docs/cookbook

# 安装依赖
pip install -r requirements.txt

# 配置认证（复制并编辑配置文件）
cp config.example.yaml config.yaml
vim config.yaml  # 填入您的 SecretId 和 SecretKey
```

### 配置文件说明

参考 [`config.example.yaml`](https://github.com/tke-workshop/tke-workshop.github.io/blob/main/docs/cookbook/config.example.yaml) 配置您的 TKE 凭证和集群信息。

---

## 📚 Cookbook 目录

### 🖥️ 集群管理

创建和管理 TKE 集群的完整示例。

- **[创建集群脚本](https://github.com/tke-workshop/tke-workshop.github.io/blob/main/docs/cookbook/cluster/create_cluster.py)** (`cluster/create_cluster.py`)
  - 支持托管集群和独立集群
  - 自动配置 VPC 和安全组
  - 完整的错误处理和日志

**使用示例**:
```bash
python cluster/create_cluster.py --name my-cluster --cluster-type managed
```

---

### 🚀 工作负载部署

部署应用到 TKE 的实用脚本和配置。

#### Nginx 部署示例

- **[Python 部署脚本](https://github.com/tke-workshop/tke-workshop.github.io/blob/main/docs/cookbook/workload/deploy_nginx.py)** (`workload/deploy_nginx.py`)
  - 自动化 Deployment 创建
  - Service 配置和暴露
  - 健康检查和资源限制

- **[YAML 配置文件](https://github.com/tke-workshop/tke-workshop.github.io/blob/main/docs/cookbook/workload/deploy_nginx.yaml)** (`workload/deploy_nginx.yaml`)
  - 生产级配置示例
  - 包含 HPA、PDB 等高级配置

**使用示例**:
```bash
# 使用 Python 脚本部署
python workload/deploy_nginx.py --namespace default --replicas 3

# 使用 YAML 部署
kubectl apply -f workload/deploy_nginx.yaml
```

---

### 🎮 超级节点 GPU Pod

在 TKE 超级节点上部署 GPU 工作负载的完整解决方案。

- **[GPU Pod 部署脚本](https://github.com/tke-workshop/tke-workshop.github.io/blob/main/docs/cookbook/supernode/deploy_gpu_pod.py)** (`supernode/deploy_gpu_pod.py`)
  - 支持所有 GPU 型号（V100/T4/A10/L20/L40/vGPU）
  - 自动/手动镜像缓存配置
  - 完整的参数验证和错误处理
  
- **[GPU Pod YAML 示例](https://github.com/tke-workshop/tke-workshop.github.io/blob/main/docs/cookbook/supernode/gpu_pod_examples.yaml)** (`supernode/gpu_pod_examples.yaml`)
  - 8 个生产级配置示例
  - 涵盖推理、训练、批处理等场景
  
- **[使用文档](https://github.com/tke-workshop/tke-workshop.github.io/blob/main/docs/cookbook/supernode/README.md)** (`supernode/README.md`)
  - 详细的使用说明
  - GPU 型号对照表
  - 故障排查指南

**使用示例**:

```bash
# 1. 基础 GPU Pod（自动匹配规格）
python supernode/deploy_gpu_pod.py \
  --name gpu-inference \
  --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \
  --gpu-type T4

# 2. 多 GPU 训练（显式指定规格）
python supernode/deploy_gpu_pod.py \
  --name gpu-training \
  --image tensorflow/tensorflow:2.13.0-gpu \
  --gpu-type V100 \
  --gpu-count 2 \
  --cpu 18 \
  --memory 80Gi

# 3. vGPU 推理服务
python supernode/deploy_gpu_pod.py \
  --name vgpu-inference \
  --image your-registry/inference:v1 \
  --gpu-type "1/4*T4" \
  --replicas 3 \
  --workload-type deployment

# 4. 使用自动镜像缓存加速启动
python supernode/deploy_gpu_pod.py \
  --name fast-gpu-pod \
  --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \
  --gpu-type T4 \
  --use-image-cache auto \
  --disk-size 200

# 5. 或直接使用 YAML
kubectl apply -f supernode/gpu_pod_examples.yaml
```

**相关文档**: [GPU Pod 最佳实践](../ai-ml/04-gpu-pod-best-practices.md)

---

### 🔧 通用工具

可复用的工具模块，支持所有 Cookbook 脚本。

- **[认证工具](https://github.com/tke-workshop/tke-workshop.github.io/blob/main/docs/cookbook/common/auth.py)** (`common/auth.py`)
  - 腾讯云 API 签名认证
  - 支持多种认证方式
  - Kubernetes 配置加载

- **[日志工具](https://github.com/tke-workshop/tke-workshop.github.io/blob/main/docs/cookbook/common/logger.py)** (`common/logger.py`)
  - 统一日志格式
  - 多级别日志输出
  - 日志文件持久化

---

## 🌟 核心特性

### 1. 生产级质量

所有代码示例均经过充分测试，包含：
- ✅ 完整的错误处理
- ✅ 详细的日志记录
- ✅ 参数验证和默认值
- ✅ 资源清理和回滚

### 2. 最佳实践

代码遵循 TKE 和 Kubernetes 最佳实践：
- ✅ 资源配额和限制
- ✅ 健康检查和就绪探针
- ✅ 标签和注解规范
- ✅ 安全配置（SecurityContext）

### 3. 易于定制

所有脚本支持命令行参数和配置文件：
- ✅ 丰富的 CLI 参数
- ✅ YAML 配置文件
- ✅ 环境变量支持
- ✅ 模块化设计

---

## 📖 使用指南

### 方式一：Python 脚本

适合自动化和集成场景。

```bash
# 查看帮助
python supernode/deploy_gpu_pod.py --help

# 执行脚本
python supernode/deploy_gpu_pod.py --name my-pod --image <image> --gpu-type T4
```

### 方式二：YAML 配置

适合 GitOps 和声明式管理。

```bash
# 直接应用
kubectl apply -f supernode/gpu_pod_examples.yaml

# 或编辑后应用
kubectl apply -f my-custom-config.yaml
```

### 方式三：作为模块导入

适合集成到自己的项目。

```python
from supernode.deploy_gpu_pod import GPUPodDeployer

deployer = GPUPodDeployer(namespace='ai-workloads')
deployer.create_gpu_pod(
    name='inference',
    image='pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime',
    gpu_type='T4',
    gpu_count=1
)
```

---

## 🐛 故障排查

### 常见问题

**Q: 认证失败**
```bash
# 检查配置文件
cat config.yaml

# 确保 SecretId 和 SecretKey 正确
# 确保有足够的权限（QcloudTKEFullAccess）
```

**Q: kubectl 命令找不到**
```bash
# 安装 kubectl
# macOS: brew install kubectl
# Linux: 参考 https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/

# 配置 kubeconfig
export KUBECONFIG=~/.kube/config
```

**Q: GPU Pod 创建失败**
```bash
# 查看 Pod 事件
kubectl describe pod <pod-name>

# 查看日志
kubectl logs <pod-name>

# 参考文档
# https://cloud.tencent.com/document/product/457/44173
```

---

## 🔗 相关资源

### 官方文档

- [TKE 产品文档](https://cloud.tencent.com/document/product/457)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [腾讯云 API 文档](https://cloud.tencent.com/document/api/457/31853)

### 项目资源

- [GitHub 仓库](https://github.com/tke-workshop/tke-workshop.github.io)
- [问题反馈](https://github.com/tke-workshop/tke-workshop.github.io/issues)
- [贡献指南](https://github.com/tke-workshop/tke-workshop.github.io/blob/main/CONTRIBUTING.md)

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](https://github.com/tke-workshop/tke-workshop.github.io/blob/main/LICENSE) 文件。

---

**最后更新**: 2026-01-08  
**维护者**: TKE Documentation Team
