# 超级节点 Cookbook

> 🚀 **超级节点 GPU Pod 部署脚本和配置示例**

## 📖 简介

本目录提供在 TKE 超级节点上部署 GPU Pod 的完整示例，包括 Python 脚本和 YAML 配置文件。

**文档链接**: [GPU Pod 最佳实践](https://tke-workshop.github.io/ai-ml/04-gpu-pod-best-practices/)

---

## 📂 文件说明

| 文件 | 类型 | 功能 | 推荐场景 |
|------|------|------|---------|
| `deploy_gpu_pod.py` | Python | GPU Pod 部署脚本 | 自动化部署、批量操作 |
| `gpu_pod_examples.yaml` | YAML | GPU Pod 配置示例集合 | kubectl 直接部署 |

---

## 🚀 快速开始

### 前置条件

1. **Python 3.8+** (使用 Python 脚本)
2. **kubectl** (已配置 kubeconfig)
3. **TKE 集群** (已启用超级节点)
4. **超级节点池** (参考 [创建超级节点池](https://tke-workshop.github.io/basics/supernode/01-create-supernode-pool/))

### 安装依赖

```bash
# 安装 Python 依赖
pip install -r ../requirements.txt
```

---

## 📝 使用方法

### 方式一：使用 Python 脚本（推荐）

#### 1. 基础用法：自动匹配模式

```bash
# 创建 T4 GPU Pod（自动匹配资源）
python3 deploy_gpu_pod.py \
  --name gpu-inference \
  --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \
  --gpu-type T4 \
  --gpu-count 1
```

#### 2. 显式指定模式

```bash
# 精确控制 CPU 和内存配置
python3 deploy_gpu_pod.py \
  --name gpu-training \
  --image tensorflow/tensorflow:2.13.0-gpu \
  --gpu-type V100 \
  --gpu-count 1 \
  --cpu 8 \
  --memory 40Gi \
  --no-auto-match
```

#### 3. 使用镜像缓存加速

```bash
# 自动镜像缓存
python3 deploy_gpu_pod.py \
  --name gpu-fast \
  --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \
  --gpu-type T4 \
  --use-image-cache \
  --disk-size 200

# 手动指定镜像缓存 ID
python3 deploy_gpu_pod.py \
  --name gpu-cached \
  --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \
  --gpu-type T4 \
  --image-cache-id imc-xxxxxxxx
```

#### 4. 多 GPU 训练

```bash
# 创建 2 卡 V100 训练 Pod
python3 deploy_gpu_pod.py \
  --name gpu-multi-training \
  --image nvcr.io/nvidia/pytorch:23.08-py3 \
  --gpu-type V100 \
  --gpu-count 2
```

#### 5. vGPU Pod（成本优化）

```bash
# 使用 1/4 T4 卡
python3 deploy_gpu_pod.py \
  --name gpu-vgpu \
  --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \
  --gpu-type "1/4*T4" \
  --gpu-count 1
```

#### 6. 自定义命令和环境变量

```bash
# 传递启动命令和环境变量
python3 deploy_gpu_pod.py \
  --name gpu-custom \
  --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \
  --gpu-type T4 \
  --command '["python3", "-m", "http.server", "8080"]' \
  --env '{"MODEL_PATH": "/models/bert", "BATCH_SIZE": "32"}'
```

#### 7. 管理操作

```bash
# 查看 Pod 日志
python3 deploy_gpu_pod.py --logs --name gpu-inference --tail 100

# 删除 Pod
python3 deploy_gpu_pod.py --delete --name gpu-inference
```

#### 8. 查看帮助

```bash
python3 deploy_gpu_pod.py --help
```

### 方式二：使用 YAML 配置

#### 1. 部署单个示例

```bash
# 部署自动匹配 GPU Pod
kubectl apply -f gpu_pod_examples.yaml

# 或部署特定示例
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
  annotations:
    eks.tke.cloud.tencent.com/gpu-type: T4
spec:
  containers:
  - name: test
    image: pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime
    command: ["sleep", "3600"]
    resources:
      limits:
        nvidia.com/gpu: 1
  nodeSelector:
    type: virtual-kubelet
  tolerations:
  - key: serverless
    operator: Exists
    effect: NoSchedule
EOF
```

#### 2. 验证 GPU 可用性

```bash
# 查看 Pod 状态
kubectl get pod gpu-test

# 进入 Pod 并检查 GPU
kubectl exec -it gpu-test -- nvidia-smi

# 查看 Pod 事件
kubectl describe pod gpu-test
```

---

## 🎯 完整示例场景

### 场景 1: AI 推理服务

```bash
# 1. 创建推理 Pod（使用镜像缓存）
python3 deploy_gpu_pod.py \
  --name llm-inference \
  --image vllm/vllm-openai:latest \
  --gpu-type A10*GNV4 \
  --gpu-count 1 \
  --use-image-cache \
  --disk-size 300 \
  --env '{"MODEL_NAME": "meta-llama/Llama-2-7b-hf", "MAX_MODEL_LEN": "4096"}'

# 2. 查看启动日志
kubectl logs llm-inference -f

# 3. 测试 GPU
kubectl exec llm-inference -- nvidia-smi

# 4. 转发端口（如需本地访问）
kubectl port-forward llm-inference 8000:8000

# 5. 清理
python3 deploy_gpu_pod.py --delete --name llm-inference
```

### 场景 2: 模型训练任务

```bash
# 1. 创建训练 Pod
python3 deploy_gpu_pod.py \
  --name model-training \
  --image tensorflow/tensorflow:2.13.0-gpu \
  --gpu-type V100 \
  --gpu-count 2 \
  --cpu 18 \
  --memory 80Gi \
  --no-auto-match \
  --use-image-cache \
  --disk-size 500

# 2. 监控训练进度
kubectl logs model-training -f

# 3. 查看 GPU 使用率
kubectl exec model-training -- nvidia-smi

# 4. 训练完成后下载模型（需要配置存储卷）
kubectl cp model-training:/output/model.pth ./model.pth
```

### 场景 3: 批量推理任务

```bash
# 使用 vGPU 降低成本
for i in {1..5}; do
  python3 deploy_gpu_pod.py \
    --name gpu-batch-$i \
    --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \
    --gpu-type "1/4*T4" \
    --use-image-cache \
    --disk-size 150 &
done

# 等待所有任务完成
wait

# 查看所有批处理 Pod
kubectl get pods -l scenario=batch-inference
```

---

## 📊 支持的 GPU 型号

| GPU 型号 | 显存 | CUDA | 适用场景 | 推荐配置 |
|---------|------|------|---------|---------|
| **V100** | 16GB | 11.4 | 高性能训练、大模型推理 | 8核/40GiB |
| **T4** | 16GB | 11.4 | 通用推理、小模型训练 | 8核/32GiB |
| **1/4*T4** | 4GB | 11.0 | 轻量推理、开发测试 | 4核/16GiB |
| **1/2*T4** | 8GB | 11.0 | 中等推理、批处理 | 8核/32GiB |
| **A10*GNV4** | 24GB | 11.4 | AI 推理、图形渲染 | 12核/44GiB |
| **A10*GNV4v** | 24GB | 11.4 | 虚拟化 GPU 工作负载 | 28核/116GiB |
| **A10*PNV4** | 24GB | 11.4 | 高性能图形和计算 | 28核/116GiB |
| **L20** | 48GB | 12.7 | 高端图形工作负载 | 48核/192GiB |
| **L40** | 48GB | 12.7 | 高端图形工作负载 | 48核/192GiB |

完整规格表请参考: [GPU Pod 最佳实践文档](https://tke-workshop.github.io/ai-ml/04-gpu-pod-best-practices/#支持的-gpu-规格)

---

## ⚡ 性能优化建议

### 1. 使用镜像缓存

```bash
# 推荐磁盘大小配置
- 小镜像 (< 2GB): 50GB
- 中等镜像 (2-5GB): 100GB
- 大镜像 (5-10GB): 200GB
- 超大镜像 (> 10GB): 300GB+
```

### 2. 选择合适的 GPU 型号

```bash
# 轻量推理 → 使用 vGPU
--gpu-type "1/4*T4"  # 节省 75% GPU 成本

# 通用推理 → 使用 T4
--gpu-type T4

# 大模型推理/训练 → 使用 V100/A10
--gpu-type V100
--gpu-type A10*GNV4v
```

### 3. 资源配置最佳实践

```bash
# 开发测试：使用自动匹配
--gpu-type T4  # 系统自动选择合适的 CPU/内存

# 生产环境：使用显式指定
--gpu-type V100 --cpu 8 --memory 40Gi --no-auto-match
```

---

## 🔍 故障排查

### 问题 1: Pod 一直处于 Pending 状态

```bash
# 查看 Pod 事件
kubectl describe pod <pod-name>

# 常见原因：
# - 超级节点池资源不足
# - GPU 型号配置错误
# - 未正确配置 nodeSelector 和 tolerations
```

### 问题 2: GPU 不可用

```bash
# 检查 GPU 是否被识别
kubectl exec <pod-name> -- nvidia-smi

# 检查环境变量
kubectl exec <pod-name> -- env | grep NVIDIA

# 确保设置了以下环境变量：
# NVIDIA_VISIBLE_DEVICES=all
# NVIDIA_DRIVER_CAPABILITIES=compute,utility
```

### 问题 3: 镜像拉取失败

```bash
# 查看详细错误
kubectl describe pod <pod-name>

# 解决方案：
# 1. 检查镜像地址是否正确
# 2. 确认网络连接（可能需要 EIP）
# 3. 私有镜像需要配置 imagePullSecrets
```

### 问题 4: 镜像缓存未生效

```bash
# 查看 Pod 事件，确认是否使用了缓存
kubectl describe pod <pod-name> | grep -i cache

# 检查点：
# 1. 镜像名称和版本是否完全匹配
# 2. 磁盘大小是否与缓存一致
# 3. 镜像缓存状态是否为 Ready
```

---

## 📚 相关文档

- [GPU Pod 最佳实践](https://tke-workshop.github.io/ai-ml/04-gpu-pod-best-practices/)
- [创建超级节点池](https://tke-workshop.github.io/basics/supernode/01-create-supernode-pool/)
- [创建按量超级节点](https://tke-workshop.github.io/basics/supernode/02-create-supernode/)
- [镜像缓存文档](https://cloud.tencent.com/document/product/457/65908)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

[Apache License 2.0](../../LICENSE)

---

**维护者**: TKE Workshop Team  
**最后更新**: 2026-01-08
