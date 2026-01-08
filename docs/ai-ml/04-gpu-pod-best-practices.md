# 超级节点上运行 GPU Pod 最佳实践

## 文档元信息

- **功能名称**: 超级节点 GPU Pod 运行
- **API 版本**: 2018-05-25
- **适用集群版本**: 所有支持超级节点的版本
- **文档更新时间**: 2026-01-07
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

在 TKE 超级节点上运行 GPU 工作负载，无需管理 GPU 节点，按 Pod 实际使用的 GPU 资源按量计费。

**核心优势**:
- **免节点运维**: 无需购买和管理 GPU 云服务器
- **按需计费**: 仅按 Pod 实际使用的 GPU 资源和时长计费
- **快速启动**: 秒级获取 GPU 资源，无需等待节点创建
- **多 GPU 规格**: 支持 V100、T4、A10 等多种 GPU 型号
- **弹性灵活**: 支持整卡和 vGPU（1/4 卡、1/2 卡）

**适用场景**: AI 模型训练、推理、视频处理、科学计算等 GPU 密集型任务

---

## 前置条件

- [ ] 已创建 TKE 集群并启用超级节点
- [ ] 已创建超级节点池（参考 [创建超级节点池](../basics/supernode/01-create-supernode-pool.md)）
- [ ] 了解所需的 GPU 型号和规格
- [ ] 准备好支持 GPU 的容器镜像（含 CUDA 运行时）

---

## 支持的 GPU 规格

### GPU 型号与 Annotation 配置

| GPU 型号 | Annotation Value | 显存 | CUDA 版本 | 适用场景 |
|---------|------------------|------|-----------|---------|
| **NVIDIA V100** | `V100` | 16GB | 11.4 | 高性能训练、大模型推理 |
| **NVIDIA T4** | `T4` | 16GB | 11.4 | 通用推理、小模型训练 |
| **1/4 NVIDIA T4** | `1/4*T4` | 4GB | 11.0 | 轻量推理、开发测试 |
| **1/2 NVIDIA T4** | `1/2*T4` | 8GB | 11.0 | 中等推理、批处理 |
| **NVIDIA A10 - GNV4** | `A10*GNV4` | 24GB | 11.4 | AI 推理、图形渲染 |
| **NVIDIA A10 - GNV4v** | `A10*GNV4v` | 24GB | 11.4 | 虚拟化 GPU 工作负载 |
| **NVIDIA A10 - PNV4** | `A10*PNV4` | 24GB | 11.4 | 高性能图形和计算 |
| **NVIDIA PNV5b** | `L20` | 48GB | 12.7 | 高端图形工作负载 |
| **NVIDIA PNV5i** | `L40` | 48GB | 12.7 | 高端图形工作负载 |

### GPU 规格与 CPU/内存对应关系

#### V100 系列

| GPU 卡数 | CPU 核数选项 | 支持内存范围 (GiB) | 典型配置 | 适用场景 |
|---------|-------------|-------------------|---------|---------|
| 1 卡 | 2, 4, 8 | 2-40 | 8核/40GiB | 单模型训练/推理 |
| 2 卡 | 2, 4, 8, 16, 18 | 2-80 | 18核/80GiB | 中型模型训练 |
| 4 卡 | 32, 36 | 32-160 | 36核/160GiB | 大型模型训练 |
| 8 卡 | 64, 72 | 64-320 | 72核/320GiB | 分布式训练 |

#### T4 系列

| GPU 规格 | CPU 核数选项 | 支持内存范围 (GiB) | 典型配置 | 适用场景 |
|---------|-------------|-------------------|---------|---------|
| 1/4 卡 | 2, 4 | 2-16 | 4核/16GiB | 轻量推理、开发测试 |
| 1/2 卡 | 2, 4, 8 | 2-32 | 8核/32GiB | 批量推理、API 服务 |
| 1 卡 | 2, 4, 8, 16, 20, 32 | 2-128 | 8核/32GiB | 小模型训练、推理 |
| 4 卡 | 64, 80 | 64-320 | 80核/320GiB | 大规模推理、并行训练 |

#### A10 - GNV4 系列

| GPU 卡数 | CPU 核数选项 | 支持内存范围 (GiB) | 典型配置 | 适用场景 |
|---------|-------------|-------------------|---------|---------|
| 1 卡 | 2, 4, 8, 12 | 2-44 | 12核/44GiB | AI 推理、轻量图形 |

#### A10 - GNV4v 系列（虚拟化）

| GPU 规格 | CPU 核数选项 | 支持内存范围 (GiB) | 典型配置 | 适用场景 |
|---------|-------------|-------------------|---------|---------|
| 1/2 卡 | 2, 4, 8, 14 | 2-58 | 8核/32GiB | 中等推理任务 |
| 1 卡 | 2, 4, 8, 16, 28 | 2-116 | 28核/116GiB | AI 训练、高性能推理 |

#### A10 - PNV4 系列

| GPU 卡数 | CPU 核数选项 | 支持内存范围 (GiB) | 典型配置 | 适用场景 |
|---------|-------------|-------------------|---------|---------|
| 1 卡 | 2, 4, 8, 16, 28 | 2-116 | 28核/116GiB | 高性能图形渲染 |
| 2 卡 | 2, 4, 8, 16, 32, 56 | 2-232 | 56核/232GiB | 大规模渲染、多 GPU 训练 |
| 4 卡 | 2, 4, 8, 16, 32, 64, 112 | 2-466 | 112核/466GiB | 超大规模计算 |

#### PNV5b 系列（最新一代）

| GPU 卡数 | CPU 核数选项 | 支持内存范围 (GiB) | 典型配置 | 适用场景 |
|---------|-------------|-------------------|---------|---------|
| 1 卡 | 2, 4, 8, 16, 32, 48 | 2-192 | 48核/192GiB | 高端图形工作负载、大模型推理 |

---

## 配置方式

在超级节点上运行 GPU Pod，需要配置两个核心要素：

### 核心配置要素

#### 1. GPU 型号（必需）

通过 Annotation 指定 GPU 类型：

| Annotation Key | 说明 | 示例 |
|---------------|------|------|
| `eks.tke.cloud.tencent.com/gpu-type` | GPU 型号（必填） | `'V100'` 或 `'T4,V100'` |

**说明**:
- 必须显式声明 GPU 型号
- 支持优先级列表（逗号分隔）: `'T4,V100'` 表示优先使用 T4，不可用时使用 V100
- vGPU 需要带分数前缀: `'1/4*T4'`、`'1/2*T4'`

#### 2. 资源规格（卡数-CPU-内存）

有两种方式指定资源规格：

### 方式 A: 通过 Annotation 显式指定（精确控制）

同时通过 Annotation 显式指定 GPU 卡数、CPU 核数和内存大小。

**Annotation 配置**:

| Annotation Key | 说明 | 示例 | 必填 |
|---------------|------|------|------|
| `eks.tke.cloud.tencent.com/gpu-type` | GPU 型号 | `'V100'` | 是 |
| `eks.tke.cloud.tencent.com/gpu-count` | GPU 卡数 | `'1'` | 是 |
| `eks.tke.cloud.tencent.com/cpu` | CPU 核数 | `'8'` | 是 |
| `eks.tke.cloud.tencent.com/mem` | 内存大小 | `'40Gi'` | 是 |

**配置示例**:

```yaml
metadata:
  annotations:
    # 显式指定 GPU 型号
    eks.tke.cloud.tencent.com/gpu-type: 'V100'
    # 显式指定资源规格（必须完全匹配支持的规格）
    eks.tke.cloud.tencent.com/gpu-count: '1'
    eks.tke.cloud.tencent.com/cpu: '8'
    eks.tke.cloud.tencent.com/mem: '40Gi'
```

**关键约束**:
- ⚠️ **三个值必须同时指定**（gpu-count、cpu、mem）
- ⚠️ **必须与该 GPU 类型支持的规格完全一致**（参考上方规格表）
- ⚠️ 任何一个参数不匹配都会导致 Pod 创建失败

**适用场景**:
- 需要精确控制资源分配
- 对性能和成本有明确要求
- 生产环境需要固定规格

---

### 方式 B: 基于 Request/Limit 自动计算（推荐）

仅通过 Annotation 指定 GPU 型号，让系统根据 Pod 的 `resources.requests` 和 `resources.limits` 自动计算并向上匹配合适的规格。

**Annotation 配置**:

| Annotation Key | 说明 | 示例 | 必填 |
|---------------|------|------|------|
| `eks.tke.cloud.tencent.com/gpu-type` | GPU 型号 | `'V100'` | 是 |

**配置示例**:

```yaml
metadata:
  annotations:
    # 仅指定 GPU 型号
    eks.tke.cloud.tencent.com/gpu-type: 'V100'
spec:
  containers:
  - name: training
    resources:
      requests:
        cpu: "6"              # 后台根据此值向上匹配
        memory: "32Gi"        # 后台根据此值向上匹配
        nvidia.com/gpu: 1     # GPU 卡数
      limits:
        cpu: "8"              # 后台取 requests 和 limits 的较大值
        memory: "40Gi"
        nvidia.com/gpu: 1
```

**匹配逻辑**:
1. **GPU 卡数**: 从 `resources.requests.nvidia.com/gpu` 或 `resources.limits.nvidia.com/gpu` 获取
2. **CPU 核数**: 取 `requests.cpu` 与 `limits.cpu` 的较大值，向上匹配到支持的 CPU 规格
3. **内存大小**: 取 `requests.memory` 与 `limits.memory` 的较大值，向上匹配到支持的内存规格
4. **最终规格**: 系统自动选择满足以上条件的最小规格（向上取整）

**匹配示例**:

```yaml
# 示例 1: 请求 6核/32GiB，1张 V100
# 后台匹配: V100 1卡支持 8核/40GiB（向上匹配）
# 最终分配: 8核/40GiB/1*V100

# 示例 2: 请求 10核/50GiB，1张 T4
# 后台匹配: T4 1卡支持 16核/64GiB（向上匹配）
# 最终分配: 16核/64GiB/1*T4

# 示例 3: 请求 100核/400GiB，2张 A10 PNV4
# 后台匹配: A10 PNV4 2卡支持 56核/232GiB 不足，需更高规格
# 后台会选择 A10 PNV4 4卡 或返回错误
```

**优势**:
- ✅ 配置简单，无需查询规格表
- ✅ 避免手动配置错误
- ✅ 自动向上匹配，保证资源充足
- ✅ 灵活适应不同的资源需求

**注意事项**:
- ⚠️ 向上匹配可能导致分配的资源超出实际需求
- ⚠️ 建议合理设置 requests 和 limits，避免资源浪费
- ⚠️ 如果匹配不到合适的规格，Pod 创建会失败

**适用场景**:
- 快速开发和测试
- 资源需求不固定
- 希望系统自动优化配置

---

## YAML 配置示例

### 示例 1: 使用 V100 GPU 运行 TensorFlow 训练（方式 B: 自动匹配）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: tensorflow-training-v100
  annotations:
    # 配置方式 B: 仅指定 GPU 型号，自动匹配规格
    eks.tke.cloud.tencent.com/gpu-type: 'V100'
spec:
  restartPolicy: OnFailure
  containers:
  - name: tensorflow
    image: tensorflow/tensorflow:latest-gpu
    command:
    - python3
    - /workspace/train.py
    resources:
      requests:
        cpu: "6"              # 系统取 max(6, 8) = 8 向上匹配
        memory: "30Gi"        # 系统取 max(30, 40) = 40 向上匹配
        nvidia.com/gpu: 1     # GPU 卡数
      limits:
        cpu: "8"
        memory: "40Gi"
        nvidia.com/gpu: 1
    volumeMounts:
    - name: data
      mountPath: /workspace
  volumes:
  - name: data
    emptyDir: {}
# 最终分配: V100 1卡, 8核/40GiB
```

### 示例 2: 使用 1/4 T4 vGPU 运行轻量推理服务（方式 B: 自动匹配）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inference-service-t4-mini
spec:
  replicas: 3
  selector:
    matchLabels:
      app: inference
  template:
    metadata:
      labels:
        app: inference
      annotations:
        # 配置方式 B: 仅指定 GPU 型号
        eks.tke.cloud.tencent.com/gpu-type: '1/4*T4'
    spec:
      containers:
      - name: inference
        image: your-registry/inference-service:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "2"              # 系统向上匹配到支持的规格
            memory: "8Gi"
            nvidia.com/gpu: 1
          limits:
            cpu: "4"
            memory: "16Gi"
            nvidia.com/gpu: 1
        env:
        - name: CUDA_VISIBLE_DEVICES
          value: "0"
# 最终分配: 1/4 T4, 4核/16GiB

---

### 示例 2b: 使用 1/2 T4 vGPU 运行中等推理服务（方式 B: 自动匹配）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inference-service-t4-half
spec:
  replicas: 2
  selector:
    matchLabels:
      app: inference-medium
  template:
    metadata:
      labels:
        app: inference-medium
      annotations:
        # 配置方式 B: 仅指定 GPU 型号
        eks.tke.cloud.tencent.com/gpu-type: '1/2*T4'
    spec:
      containers:
      - name: inference
        image: your-registry/inference-service:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "4"              # 系统向上匹配
            memory: "16Gi"
            nvidia.com/gpu: 1
          limits:
            cpu: "8"
            memory: "32Gi"
            nvidia.com/gpu: 1
# 最终分配: 1/2 T4, 8核/32GiB
```

### 示例 3: 使用完整规格配置运行 PyTorch 训练（方式 A: 显式指定）

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pytorch-training-job
spec:
  template:
    metadata:
      annotations:
        # 配置方式 A: 显式指定完整规格
        eks.tke.cloud.tencent.com/gpu-type: 'T4'
        eks.tke.cloud.tencent.com/gpu-count: '2'
        eks.tke.cloud.tencent.com/cpu: '40'      # 必须与 T4 2卡规格匹配
        eks.tke.cloud.tencent.com/mem: '160Gi'   # 必须与 T4 2卡规格匹配
    spec:
      restartPolicy: Never
      containers:
      - name: pytorch
        image: pytorch/pytorch:latest
        command:
        - python3
        - -m
        - torch.distributed.launch
        - --nproc_per_node=2
        - train.py
        resources:
          requests:
            nvidia.com/gpu: 2
          limits:
            nvidia.com/gpu: 2
# 最终分配: T4 2卡, 40核/160GiB（精确匹配）
```

### 示例 4: 多 GPU 优先级配置（方式 B: 自动匹配）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-gpu-priority
  annotations:
    # 配置方式 B: GPU 优先级列表
    # 优先使用 T4，如果不可用则使用 V100
    eks.tke.cloud.tencent.com/gpu-type: 'T4,V100'
spec:
  containers:
  - name: training
    image: nvidia/cuda:11.4.0-runtime-ubuntu20.04
    command: ["nvidia-smi"]
    resources:
      requests:
        cpu: "4"
        memory: "16Gi"
        nvidia.com/gpu: 1
      limits:
        cpu: "8"
        memory: "32Gi"
        nvidia.com/gpu: 1
# 系统会优先尝试 T4 规格，不可用时尝试 V100
```

### 示例 5: GPU Pod 与节点亲和性配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-workload-affinity
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gpu-app
  template:
    metadata:
      labels:
        app: gpu-app
      annotations:
        eks.tke.cloud.tencent.com/gpu-type: 'A10*GNV4'
    spec:
      # 确保调度到超级节点
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: type
                operator: In
                values:
                - virtual-kubelet
      tolerations:
      - key: serverless
        operator: Exists
        effect: NoSchedule
      containers:
      - name: gpu-container
        image: nvidia/cuda:11.4.0-base-ubuntu20.04
        command: ["nvidia-smi", "-L"]
        resources:
          requests:
            nvidia.com/gpu: 1
          limits:
            nvidia.com/gpu: 1
```

### 示例 6: 使用 PNV5b 运行大模型推理（方式 A: 显式指定）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: large-model-inference-pnv5b
  annotations:
    # 配置方式 A: 显式指定 PNV5b 高性能配置
    eks.tke.cloud.tencent.com/gpu-type: 'PNV5b'
    eks.tke.cloud.tencent.com/gpu-count: '1'
    eks.tke.cloud.tencent.com/cpu: '48'       # PNV5b 最高配置
    eks.tke.cloud.tencent.com/mem: '192Gi'    # PNV5b 最高配置
spec:
  restartPolicy: OnFailure
  containers:
  - name: inference
    image: your-registry/llm-inference:latest
    command:
    - python3
    - serve.py
    - --model-path
    - /models/llama-70b
    resources:
      requests:
        nvidia.com/gpu: 1
      limits:
        nvidia.com/gpu: 1
    env:
    - name: CUDA_VISIBLE_DEVICES
      value: "0"
    - name: MODEL_MAX_LENGTH
      value: "8192"
    volumeMounts:
    - name: model-storage
      mountPath: /models
  volumes:
  - name: model-storage
    persistentVolumeClaim:
      claimName: llm-model-pvc
# 最终分配: PNV5b 1卡, 48核/192GiB（精确匹配）
```

### 示例 7: 使用 A10 PNV4 多卡并行训练（方式 A: 显式指定）

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: multi-gpu-training-a10
spec:
  template:
    metadata:
      annotations:
        # 配置方式 A: 显式指定 A10 PNV4 4卡配置
        eks.tke.cloud.tencent.com/gpu-type: 'A10*PNV4'
        eks.tke.cloud.tencent.com/gpu-count: '4'
        eks.tke.cloud.tencent.com/cpu: '112'      # A10 PNV4 4卡最高配置
        eks.tke.cloud.tencent.com/mem: '466Gi'    # A10 PNV4 4卡最高配置
    spec:
      restartPolicy: Never
      containers:
      - name: training
        image: pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime
        command:
        - python3
        - -m
        - torch.distributed.launch
        - --nproc_per_node=4
        - train.py
        resources:
          requests:
            nvidia.com/gpu: 4
          limits:
            nvidia.com/gpu: 4
        env:
        - name: NCCL_DEBUG
          value: "INFO"
# 最终分配: A10 PNV4 4卡, 112核/466GiB（精确匹配）
```

### 示例 8: 灵活 CPU/内存配置（方式 A: 显式指定最小规格）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: flexible-v100-pod
  annotations:
    # 配置方式 A: V100 最小规格（用于开发测试）
    eks.tke.cloud.tencent.com/gpu-type: 'V100'
    eks.tke.cloud.tencent.com/gpu-count: '1'
    eks.tke.cloud.tencent.com/cpu: '2'        # V100 支持的最小 CPU
    eks.tke.cloud.tencent.com/mem: '2Gi'      # V100 支持的最小内存
spec:
  containers:
  - name: dev-test
    image: tensorflow/tensorflow:latest-gpu
    command: ["python3", "test.py"]
    resources:
      requests:
        nvidia.com/gpu: 1
      limits:
        nvidia.com/gpu: 1
# 最终分配: V100 1卡, 2核/2GiB（最小配置，节省成本）
```

---

## Annotation 详细说明

### 必需 Annotation

#### 1. GPU 型号配置

```yaml
eks.tke.cloud.tencent.com/gpu-type: 'V100'
```

**说明**:
- 指定使用的 GPU 型号
- 支持优先级列表，用逗号分隔: `'T4,V100,A10*GNV4'`
- vGPU 需要带分数前缀: `'1/4*T4'` 或 `'1/2*T4'`

**示例**:
```yaml
# 单一型号
eks.tke.cloud.tencent.com/gpu-type: 'V100'

# 优先级列表（优先 T4，不可用时选 V100）
eks.tke.cloud.tencent.com/gpu-type: 'T4,V100'

# vGPU
eks.tke.cloud.tencent.com/gpu-type: '1/4*T4'

# A10 特定型号
eks.tke.cloud.tencent.com/gpu-type: 'A10*GNV4v'
```

### 可选 Annotation

#### 2. GPU 数量配置

```yaml
eks.tke.cloud.tencent.com/gpu-count: '2'
```

**说明**:
- 指定需要的 GPU 卡数
- 默认值为 1
- 必须与规格表中支持的卡数匹配

#### 3. CPU 核数配置

```yaml
eks.tke.cloud.tencent.com/cpu: '8'
```

**说明**:
- 手动指定 CPU 核数
- 必须与 GPU 规格对应的 CPU 核数匹配
- 不推荐手动指定，建议让系统自动匹配

#### 4. 内存大小配置

```yaml
eks.tke.cloud.tencent.com/mem: '40Gi'
```

**说明**:
- 手动指定内存大小
- 单位必须使用 `Gi`（不支持 `G`）
- 必须与 GPU 规格对应的内存大小匹配

---

## 验证步骤

### Step 1: 创建 GPU Pod

```bash
# 应用 YAML 配置
kubectl apply -f gpu-pod.yaml

# 查看 Pod 状态
kubectl get pod -o wide
```

### Step 2: 验证 GPU 可见性

```bash
# 进入 Pod 查看 GPU
kubectl exec -it <pod-name> -- nvidia-smi

# 查看 GPU 详细信息
kubectl exec -it <pod-name> -- nvidia-smi -L
```

**期望输出**:

```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 470.161.03   Driver Version: 470.161.03   CUDA Version: 11.4     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  Tesla V100-SXM2...  Off  | 00000000:00:07.0 Off |                    0 |
| N/A   40C    P0    42W / 300W |      0MiB / 16160MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
```

### Step 3: 测试 CUDA 功能

```bash
# 运行 CUDA 测试
kubectl exec -it <pod-name> -- python3 -c "
import torch
print(f'CUDA Available: {torch.cuda.is_available()}')
print(f'GPU Count: {torch.cuda.device_count()}')
print(f'GPU Name: {torch.cuda.get_device_name(0)}')
"
```

### Step 4: 查看 Pod 资源分配

```bash
# 查看 Pod 详情
kubectl describe pod <pod-name>

# 查看分配的资源
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[0].resources}'
```

---

## 异常处理

### 常见错误及解决方案

| 错误类型 | 错误信息 | 原因 | 解决方案 |
|---------|---------|------|---------|
| **规格不匹配** | `FailedScheduling: 0/1 nodes are available` | GPU 型号不支持或规格不存在 | 检查 GPU 型号拼写和规格配置 |
| **资源不足** | `Insufficient nvidia.com/gpu` | GPU 资源不足 | 等待资源释放或更换其他 GPU 型号 |
| **Annotation 错误** | `InvalidParameter.Param` | Annotation 格式或取值错误 | 检查 Annotation key 和 value |
| **内存单位错误** | `Invalid memory format` | 内存单位使用了 G 而非 Gi | 使用 `Gi` 作为内存单位 |
| **CPU/内存不匹配** | `No matching instance type` | CPU 和内存与 GPU 规格不对应 | 参考规格表调整或移除手动配置 |
| **镜像不支持 GPU** | `CUDA driver version is insufficient` | 镜像中 CUDA 版本不兼容 | 使用与 GPU 驱动匹配的镜像 |

### GPU Pod Pending 处理

```bash
# 1. 查看 Pod 事件
kubectl describe pod <pod-name>

# 2. 查看调度日志
kubectl get events --sort-by='.lastTimestamp' | grep <pod-name>

# 3. 检查 Annotation 配置
kubectl get pod <pod-name> -o jsonpath='{.metadata.annotations}'

# 4. 验证 GPU 类型配置
kubectl get pod <pod-name> -o yaml | grep gpu-type
```

### GPU 不可见处理

```bash
# 1. 检查容器运行时
kubectl exec -it <pod-name> -- nvidia-smi

# 2. 检查 CUDA 环境变量
kubectl exec -it <pod-name> -- env | grep CUDA

# 3. 验证 GPU 资源声明
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[0].resources}'
```

---

## 最佳实践

### 1. GPU 型号选择策略

**轻量推理服务** (< 4GB 显存需求):
- 最低成本: 使用 `1/4*T4` (4GB 显存, 2-4核 CPU)
- 推荐配置: 使用 `1/2*T4` (8GB 显存, 2-8核 CPU)

**中等推理服务** (4-16GB 显存需求):
- 通用推理: 使用 `T4` (16GB 显存, 2-32核 CPU 灵活选择)
- 高性能推理: 使用 `A10*GNV4` (24GB 显存, 2-12核 CPU)
- 虚拟化场景: 使用 `1/2*A10*GNV4v` (12GB 显存, 2-14核 CPU)

**大模型推理** (16GB+ 显存需求):
- 标准配置: 使用 `V100` (16GB 显存, 2-8核 CPU)
- 超大模型: 使用 `A10*GNV4v` (24GB 显存, 最高 28核/116GiB)
- 高端场景: 使用 `PNV5b` (48GB 显存, 最高 48核/192GiB)

**小规模训练** (单卡训练):
- 入门训练: 使用 `T4` (16GB 显存, 建议 8-16核)
- 标准训练: 使用 `V100` (16GB 显存, 建议 8核/40GiB)
- 高性能训练: 使用 `A10*PNV4` (24GB 显存, 建议 28核/116GiB)

**中等规模训练** (2-4 卡):
- 双卡训练: 使用 `V100` 2卡 (建议 18核/80GiB)
- 四卡训练: 使用 `V100` 4卡 (建议 36核/160GiB) 或 `T4` 4卡 (80核/320GiB)
- 图形加速: 使用 `A10*PNV4` 2卡 (56核/232GiB) 或 4卡 (112核/466GiB)

**大规模训练** (4+ 卡):
- 分布式训练: 使用 `V100` 8卡 (72核/320GiB)
- 超大规模: 使用 `A10*PNV4` 4卡 (112核/466GiB)

**图形渲染与可视化**:
- 轻量渲染: 使用 `A10*GNV4` (12核/44GiB)
- 中等渲染: 使用 `A10*PNV4` 1卡 (28核/116GiB)
- 高端渲染: 使用 `PNV5b` (48核/192GiB)
- 大规模渲染: 使用 `A10*PNV4` 2卡或4卡

### 2. 配置方式选择建议

#### 推荐场景对比

| 对比项 | 方式 A: 显式指定 | 方式 B: 自动匹配（推荐） |
|--------|----------------|----------------------|
| **配置复杂度** | 高（需查规格表） | 低（仅指定 GPU 类型） |
| **灵活性** | 低（必须完全匹配） | 高（自动向上匹配） |
| **适用场景** | 生产环境固定规格 | 开发测试、动态需求 |
| **出错风险** | 高（配置易错） | 低（系统自动匹配） |
| **成本控制** | 精确控制 | 可能过度分配 |

#### 方式 A: 显式指定示例

**场景 1: 精确成本控制**
```yaml
# 使用 V100 最小规格（2核/2GiB），降低成本
metadata:
  annotations:
    eks.tke.cloud.tencent.com/gpu-type: 'V100'
    eks.tke.cloud.tencent.com/gpu-count: '1'
    eks.tke.cloud.tencent.com/cpu: '2'
    eks.tke.cloud.tencent.com/mem: '2Gi'
```

**场景 2: 固定高性能配置**
```yaml
# 使用 A10 PNV4 4卡最高配置
metadata:
  annotations:
    eks.tke.cloud.tencent.com/gpu-type: 'A10*PNV4'
    eks.tke.cloud.tencent.com/gpu-count: '4'
    eks.tke.cloud.tencent.com/cpu: '112'
    eks.tke.cloud.tencent.com/mem: '466Gi'
```

**场景 3: 特定 CPU/内存比例**
```yaml
# T4 1卡，使用 16核/128GiB 高内存配置
metadata:
  annotations:
    eks.tke.cloud.tencent.com/gpu-type: 'T4'
    eks.tke.cloud.tencent.com/gpu-count: '1'
    eks.tke.cloud.tencent.com/cpu: '16'
    eks.tke.cloud.tencent.com/mem: '128Gi'
```

#### 方式 B: 自动匹配示例（推荐）

**场景 1: 灵活开发测试**
```yaml
metadata:
  annotations:
    eks.tke.cloud.tencent.com/gpu-type: 'T4'
spec:
  containers:
  - name: app
    resources:
      requests:
        cpu: "4"
        memory: "16Gi"
        nvidia.com/gpu: 1
      limits:
        cpu: "8"
        memory: "32Gi"
        nvidia.com/gpu: 1
# 系统自动匹配: T4 1卡，8核/32GiB
```

**场景 2: 动态资源需求**
```yaml
metadata:
  annotations:
    eks.tke.cloud.tencent.com/gpu-type: 'V100'
spec:
  containers:
  - name: training
    resources:
      requests:
        cpu: "6"
        memory: "30Gi"
        nvidia.com/gpu: 1
      limits:
        cpu: "8"
        memory: "40Gi"
        nvidia.com/gpu: 1
# 系统自动匹配: V100 1卡，8核/40GiB
```

**场景 3: 多卡训练自动匹配**
```yaml
metadata:
  annotations:
    eks.tke.cloud.tencent.com/gpu-type: 'V100'
spec:
  containers:
  - name: training
    resources:
      requests:
        cpu: "16"
        memory: "64Gi"
        nvidia.com/gpu: 2
      limits:
        cpu: "18"
        memory: "80Gi"
        nvidia.com/gpu: 2
# 系统自动匹配: V100 2卡，18核/80GiB
```

#### 最佳实践建议

**推荐使用方式 B（自动匹配）的情况**:
- ✅ 开发和测试环境
- ✅ 资源需求会变化的应用
- ✅ 不熟悉 GPU 规格配置
- ✅ 希望减少配置错误

**推荐使用方式 A（显式指定）的情况**:
- ✅ 生产环境需要固定规格
- ✅ 严格控制成本预算
- ✅ 需要特定的 CPU/内存比例
- ✅ 已明确知道最优规格配置

**注意事项**:
- ⚠️ 方式 A 和方式 B 不可混用（如果使用方式 A，三个参数必须全部指定）
- ⚠️ 方式 B 向上匹配可能导致实际分配资源大于请求值
- ⚠️ 建议先在测试环境验证配置，再应用到生产环境

### 3. 成本优化

**使用 vGPU 降低成本**:
```yaml
# 推理服务使用 1/4 T4 可节省 75% GPU 成本
annotations:
  eks.tke.cloud.tencent.com/gpu-type: '1/4*T4'
```

**GPU 优先级配置**:
```yaml
# 优先使用性价比高的 T4，不可用时降级到 V100
annotations:
  eks.tke.cloud.tencent.com/gpu-type: 'T4,V100'
```

**合理设置副本数**:
```yaml
# 根据实际负载动态调整副本
spec:
  replicas: 2  # 避免过多闲置 GPU Pod
```

### 4. 调度优化

**确保调度到超级节点**:
```yaml
spec:
  nodeSelector:
    type: virtual-kubelet
  tolerations:
  - key: serverless
    operator: Exists
    effect: NoSchedule
```

**使用亲和性实现就近调度**:
```yaml
spec:
  affinity:
    podAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: data-service
          topologyKey: kubernetes.io/hostname
```

### 5. 镜像选择

**使用官方 GPU 镜像**:
```yaml
# TensorFlow GPU
image: tensorflow/tensorflow:2.13.0-gpu

# PyTorch GPU
image: pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime

# NVIDIA CUDA
image: nvidia/cuda:11.4.0-runtime-ubuntu20.04
```

**确保 CUDA 版本匹配**:
- V100 / T4 / A10: CUDA 11.4 (驱动 470)
- T4 vGPU: CUDA 11.0 (驱动 450)

### 6. Pod 创建加速（高级配置）

在超级节点上创建 GPU Pod 时，如果镜像较大（如深度学习框架镜像），首次拉取镜像可能需要较长时间。通过配置**镜像缓存**可以显著提升 Pod 创建速度，实现秒级启动。

#### 工作原理

镜像缓存通过提前拉取镜像并创建快照，在创建 Pod 时直接基于快照挂载数据盘，避免重复下载镜像层：

```
传统方式: 创建 Pod → 分配资源 → 拉取镜像（3-10分钟） → 启动容器
使用缓存: 创建 Pod → 分配资源 → 挂载快照（5-30秒） → 启动容器
```

**性能提升**:
- 小镜像 (< 1GB): 节省 30-60 秒
- 中等镜像 (1-5GB): 节省 2-5 分钟
- 大镜像 (> 5GB): 节省 5-15 分钟

#### 方式一：自动匹配镜像缓存（推荐）

系统自动查找匹配的镜像缓存，无需手动管理缓存 ID。

**1. 配置 Pod Annotation**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-inference-fast
  annotations:
    # 启用自动镜像缓存匹配
    eks.tke.cloud.tencent.com/use-image-cache: auto
    # 定义磁盘大小（与缓存大小匹配）
    eks.tke.cloud.tencent.com/pod-resource: '{"disk": {"size": 200}}'
    # GPU 配置
    eks.tke.cloud.tencent.com/gpu-type: T4
spec:
  containers:
  - name: inference
    image: pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime  # 约 5GB
    resources:
      limits:
        nvidia.com/gpu: 1
  nodeSelector:
    type: virtual-kubelet
  tolerations:
  - key: serverless
    operator: Exists
    effect: NoSchedule
```

**2. 磁盘大小配置说明**

自动镜像缓存依据磁盘大小创建，需正确配置 `disk.size`：

| 镜像大小 | 推荐磁盘大小 | 适用场景 |
|---------|------------|---------|
| < 2GB | 50GB | 轻量推理服务 |
| 2-5GB | 100GB | 中等深度学习镜像 |
| 5-10GB | 200GB | 大型 AI 框架镜像 |
| > 10GB | 300GB+ | 多模型或完整开发环境 |

**磁盘大小计算公式**:
```
推荐磁盘大小 = 镜像总大小 × 1.5 + 工作空间 (20-50GB)
```

**3. 自动匹配策略**

系统按以下优先级自动选择缓存：

1. **镜像名称和版本完全相同**
2. **优先使用小容量缓存**（节省磁盘费用）
3. **优先使用较新的缓存**（更新时间晚）

**示例：多容器 Pod 配置**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-training-multi
  annotations:
    eks.tke.cloud.tencent.com/use-image-cache: auto
    eks.tke.cloud.tencent.com/pod-resource: '{"disk": {"size": 300}}'
    eks.tke.cloud.tencent.com/gpu-type: V100
spec:
  containers:
  - name: trainer
    image: tensorflow/tensorflow:2.13.0-gpu  # 约 4GB
    resources:
      limits:
        nvidia.com/gpu: 1
  - name: monitor
    image: nvidia/cuda:11.4.0-runtime-ubuntu20.04  # 约 2GB
  nodeSelector:
    type: virtual-kubelet
  tolerations:
  - key: serverless
    operator: Exists
    effect: NoSchedule
```

#### 方式二：手动匹配镜像缓存

通过指定镜像缓存 ID 实现精确控制，适用于生产环境固定配置。

**步骤 1：创建镜像缓存**

有两种创建方式：控制台创建或使用 CRD 创建。

**方式 2A：通过控制台创建**

1. 登录 [TKE 控制台](https://console.cloud.tencent.com/tke2)
2. 选择左侧 **运维中心 > 镜像缓存**，点击 **新建实例**
3. 配置参数：
   - **实例名称**: `gpu-pytorch-cache`
   - **所在地域**: 与集群相同
   - **容器网络**: 自动分配
   - **安全组**: default（或自定义）
   - **镜像列表**: 添加需要缓存的镜像
     ```
     pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime
     nvidia/cuda:11.4.0-runtime-ubuntu20.04
     ```
   - **缓存大小**: 200GB（根据镜像总大小设置）
   - **绑定 EIP**: 如果镜像仓库在外网则启用
   - **过期策略**: 设置保留天数（0 表示永久保留）
4. 点击 **创建实例**，等待状态变为"已完成"
5. 记录镜像缓存 ID（格式如 `imc-xxxxxx`）

**方式 2B：使用 CRD 创建（推荐 IaC）**

1. 确保集群已安装 `imc-operator` 组件：
   - 进入集群详情页 → **组件管理**
   - 搜索 `imc-operator`（镜像缓存）并安装

2. 创建 `ImageCache` 资源：

```yaml
apiVersion: eks.cloud.tencent.com/v1
kind: ImageCache
metadata:
  name: gpu-training-cache
spec:
  # 需要缓存的镜像列表
  images:
  - pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime
  - tensorflow/tensorflow:2.13.0-gpu
  - nvidia/cuda:11.4.0-runtime-ubuntu20.04
  
  # 缓存大小（GB）
  imageCacheSize: 200
  
  # 过期时间（天），0 表示永不过期
  retentionDays: 30
  
  # 可选：指定子网（建议与超级节点相同子网）
  # subnetId: subnet-xxxxxx
  
  # 可选：指定安全组
  # securityGroupIds:
  # - sg-xxxxxx
  
  # 可选：自动创建 EIP（访问公网镜像仓库需要）
  autoCreateEip: false
  
  # 可选：私有镜像仓库凭证
  # imagePullSecrets:
  # - my-registry-secret
  
  # 可选：自定义 DNS
  # resolveConfig: |
  #   nameserver 8.8.8.8
  #   nameserver 8.8.4.4
```

3. 应用配置并查看状态：

```bash
# 创建镜像缓存
kubectl apply -f imagecache.yaml

# 查看缓存状态
kubectl get imagecache

# 输出示例：
# NAME                  PHASE       IMAGECACHEID        AGE
# gpu-training-cache    Ready       imc-abc123xyz       5m

# 查看详细信息和事件
kubectl describe imagecache gpu-training-cache
```

**步骤 2：在 Pod 中使用镜像缓存**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-inference-cached
  annotations:
    # 手动指定镜像缓存 ID
    eks.tke.cloud.tencent.com/use-image-cache: imc-abc123xyz
    eks.tke.cloud.tencent.com/gpu-type: T4
spec:
  containers:
  - name: inference
    image: pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime
    resources:
      limits:
        nvidia.com/gpu: 1
  nodeSelector:
    type: virtual-kubelet
  tolerations:
  - key: serverless
    operator: Exists
    effect: NoSchedule
```

**步骤 3：验证缓存使用**

创建 Pod 后，检查事件确认是否使用了缓存：

```bash
# 查看 Pod 事件
kubectl describe pod gpu-inference-cached

# 成功使用缓存的事件示例：
# Events:
#   Type    Reason   Age   From            Message
#   ----    ------   ----  ----            -------
#   Normal  Pulling  30s   kubelet         Using image cache imc-abc123xyz
#   Normal  Pulled   25s   kubelet         Successfully pulled image (from cache)
#   Normal  Created  25s   kubelet         Created container
#   Normal  Started  24s   kubelet         Started container

# 如果未匹配到缓存，将显示正常拉取镜像的事件：
#   Normal  Pulling  2m    kubelet         Pulling image "pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime"
```

#### 两种方式对比

| 对比项 | 自动匹配 | 手动指定 |
|-------|---------|---------|
| **配置复杂度** | 低（仅需配置 annotation） | 中（需先创建缓存） |
| **管理成本** | 低（无需管理缓存 ID） | 高（需维护缓存列表） |
| **适用场景** | 开发测试、动态环境 | 生产环境、固定配置 |
| **匹配灵活性** | 高（自动选择最优） | 低（必须精确指定） |
| **成本控制** | 较难预测 | 精确可控 |
| **推荐等级** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

#### 最佳实践建议

**1. 选择合适的方式**

- ✅ **自动匹配**：开发测试、快速迭代、多团队共享
- ✅ **手动指定**：生产环境、成本敏感、需要审计追踪

**2. 磁盘大小优化**

```yaml
# 推荐：根据实际镜像大小设置
annotations:
  eks.tke.cloud.tencent.com/pod-resource: '{"disk": {"size": 150}}'  # PyTorch 5GB → 150GB

# 避免：过度分配导致浪费
# eks.tke.cloud.tencent.com/pod-resource: '{"disk": {"size": 500}}'  # 不必要
```

**3. 缓存生命周期管理**

```yaml
# 为测试缓存设置过期时间
spec:
  retentionDays: 7  # 7 天后自动清理

# 生产缓存设置永久保留
spec:
  retentionDays: 0  # 永不过期
```

**4. 镜像缓存分层策略**

```yaml
# 基础缓存：包含常用基础镜像
apiVersion: eks.cloud.tencent.com/v1
kind: ImageCache
metadata:
  name: base-gpu-cache
spec:
  images:
  - nvidia/cuda:11.4.0-runtime-ubuntu20.04
  - ubuntu:20.04
  imageCacheSize: 50
  retentionDays: 0

---
# 框架缓存：包含深度学习框架
apiVersion: eks.cloud.tencent.com/v1
kind: ImageCache
metadata:
  name: framework-cache
spec:
  images:
  - pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime
  - tensorflow/tensorflow:2.13.0-gpu
  imageCacheSize: 200
  retentionDays: 30
```

**5. 监控缓存效果**

```bash
# 对比 Pod 启动时间
# 无缓存
time kubectl run test-no-cache --image=pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \
  --overrides='{"spec":{"nodeSelector":{"type":"virtual-kubelet"}}}' \
  -- sleep 3600

# 有缓存
time kubectl run test-with-cache --image=pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \
  --overrides='{"metadata":{"annotations":{"eks.tke.cloud.tencent.com/use-image-cache":"auto"}},
               "spec":{"nodeSelector":{"type":"virtual-kubelet"}}}' \
  -- sleep 3600
```

#### 注意事项

⚠️ **成本说明**:
- **快照费用**: 按缓存大小和保留时间收费（如 200GB × 30天）
- **数据盘费用**: Pod 运行时额外按数据盘大小收费
- **创建费用**: 创建缓存时临时启动一个 2核4GiB Pod（完成后释放）

⚠️ **限制说明**:
- 自动匹配无法识别 TKE Serverless DaemonSet 镜像
- 手动指定的缓存 ID 如不匹配镜像，会回退到正常拉取
- 同一磁盘大小的缓存可被多个 Pod 共享使用

⚠️ **安全建议**:
- 私有镜像需配置 `imagePullSecrets`
- 建议使用与超级节点相同的子网和安全组
- 生产环境建议使用内网镜像仓库（避免 EIP 费用）

### 7. 监控与日志

**配置 GPU 监控**:
```yaml
env:
- name: NVIDIA_VISIBLE_DEVICES
  value: "all"
- name: NVIDIA_DRIVER_CAPABILITIES
  value: "compute,utility"
```

**查看 GPU 使用率**:
```bash
# 实时监控
kubectl exec -it <pod-name> -- watch -n 1 nvidia-smi

# 查看 GPU 详细信息
kubectl exec -it <pod-name> -- nvidia-smi -q
```

---

## 完整示例：GPU 推理服务

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-inference-service
  namespace: ai-workloads
spec:
  replicas: 3
  selector:
    matchLabels:
      app: inference
      gpu: enabled
  template:
    metadata:
      labels:
        app: inference
        gpu: enabled
      annotations:
        # GPU 配置：优先 T4，降级 V100
        eks.tke.cloud.tencent.com/gpu-type: 'T4,V100'
    spec:
      # 确保调度到超级节点
      nodeSelector:
        type: virtual-kubelet
      tolerations:
      - key: serverless
        operator: Exists
        effect: NoSchedule
      
      containers:
      - name: inference
        image: your-registry/inference-service:v1.0
        ports:
        - containerPort: 8080
          name: http
        
        resources:
          requests:
            cpu: "4"
            memory: "16Gi"
            nvidia.com/gpu: 1
          limits:
            cpu: "8"
            memory: "32Gi"
            nvidia.com/gpu: 1
        
        env:
        - name: CUDA_VISIBLE_DEVICES
          value: "0"
        - name: MODEL_PATH
          value: "/models/model.pb"
        
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        
        volumeMounts:
        - name: model-storage
          mountPath: /models
      
      volumes:
      - name: model-storage
        persistentVolumeClaim:
          claimName: model-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: inference-service
  namespace: ai-workloads
spec:
  selector:
    app: inference
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  type: LoadBalancer
```

---

## 相关文档

- [创建超级节点池](../basics/supernode/01-create-supernode-pool.md)
- [创建按量超级节点](../basics/supernode/02-create-supernode.md)
- [删除超级节点](../basics/supernode/03-delete-supernode.md)
- [TKE GPU 调度](./gpu-scheduling.md)

---

## 官方文档链接

- **超级节点 Annotation 说明**: https://cloud.tencent.com/document/product/457/44173
- **指定资源规格**: https://cloud.tencent.com/document/product/457/44174
- **GPU 资源规格详情**: https://cloud.tencent.com/document/product/457/39808
- **TKE Serverless 定价**: https://cloud.tencent.com/document/product/457/39807

---

## Cookbook 示例

完整可执行代码示例:

- **Python 脚本**: [deploy_gpu_pod.py](../../cookbook/supernode/deploy_gpu_pod.py) - 功能丰富的 GPU Pod 部署工具
- **YAML 配置**: [gpu_pod_examples.yaml](../../cookbook/supernode/gpu_pod_examples.yaml) - 8 个完整配置示例
- **使用文档**: [Supernode Cookbook README](../../cookbook/supernode/README.md) - 详细使用指南

**快速开始**:
```bash
# 下载脚本
cd cookbook/supernode

# 创建 GPU Pod
python3 deploy_gpu_pod.py \
  --name gpu-test \
  --image pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime \
  --gpu-type T4

# 或使用 YAML
kubectl apply -f gpu_pod_examples.yaml
```

---

**文档版本**: v1.1  
**最后更新**: 2026-01-08  
**维护者**: TKE Documentation Team
