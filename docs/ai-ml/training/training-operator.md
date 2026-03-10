# Training Operator

## 📚 概述

Kubeflow Training Operator 是一个 Kubernetes 原生项目，用于在 Kubernetes 上运行分布式机器学习训练任务。它支持多种主流 ML 框架，包括 PyTorch、TensorFlow、XGBoost 等。

本文档介绍如何在 TKE 上安装和使用 Training Operator 进行分布式模型训练。

## 🎯 文档元信息

- **适用版本**: Training Operator v1.8+
- **Kubernetes 版本**: 1.23+
- **适用场景**: 分布式训练、大规模模型微调
- **Agent 友好度**: ⭐⭐⭐⭐⭐

## 📋 支持的训练框架

| CRD 类型 | 框架 | 分布式策略 | 状态 |
|----------|------|-----------|------|
| PyTorchJob | PyTorch | DDP/FSDP | ✅ 推荐 |
| TFJob | TensorFlow | PS/AllReduce | ✅ 成熟 |
| MPIJob | Horovod/MPI | AllReduce | ✅ 成熟 |
| XGBoostJob | XGBoost | 分布式 | ✅ 支持 |
| PaddleJob | PaddlePaddle | Collective | ✅ 支持 |
| MXJob | MXNet | PS | ⚠️ 维护模式 |

## 🛠️ 安装 Training Operator

### 方式一：使用 kubectl 安装（推荐）

```bash
# 安装 Training Operator（使用 release 分支）
kubectl apply -k "github.com/kubeflow/training-operator/manifests/overlays/standalone?ref=v1.8.0"

# 或使用 master 分支（最新功能）
kubectl apply -k "github.com/kubeflow/training-operator/manifests/overlays/standalone"
```

### 方式二：使用 Helm 安装

```bash
# 添加 Kubeflow Helm 仓库
helm repo add kubeflow https://kubeflow.github.io/manifests
helm repo update

# 安装 Training Operator
helm install training-operator kubeflow/training-operator \
  --namespace kubeflow \
  --create-namespace \
  --version 1.8.0
```

### 验证安装

```bash
# 检查 Operator Pod 状态
kubectl get pods -n kubeflow

# 预期输出
NAME                                 READY   STATUS    RESTARTS   AGE
training-operator-xxxxxxxxx-xxxxx    1/1     Running   0          1m

# 检查 CRD 安装
kubectl get crd | grep kubeflow

# 预期输出
mpijobs.kubeflow.org
pytorchjobs.kubeflow.org
tfjobs.kubeflow.org
xgboostjobs.kubeflow.org
```

## 🔥 PyTorchJob 使用指南

PyTorchJob 是最常用的分布式训练 CRD，支持 PyTorch 的 DistributedDataParallel (DDP) 和 FullyShardedDataParallel (FSDP)。

### 基本结构

```yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: pytorch-training-job
  namespace: default
spec:
  # Pod 清理策略
  cleanPodPolicy: None  # None: 保留 Pod，Running: 保留运行中的 Pod
  
  pytorchReplicaSpecs:
    # Master 节点（可选，用于协调）
    Master:
      replicas: 1
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: pytorch
              image: your-training-image:latest
              # ...
    
    # Worker 节点
    Worker:
      replicas: 3
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: pytorch
              image: your-training-image:latest
              # ...
```

### 完整示例：MNIST 分布式训练

```yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: pytorch-mnist-ddp
  namespace: kubeflow
spec:
  cleanPodPolicy: None
  pytorchReplicaSpecs:
    Master:
      replicas: 1
      restartPolicy: OnFailure
      template:
        metadata:
          annotations:
            # 如果启用了 Istio，需要禁用 sidecar 注入
            sidecar.istio.io/inject: "false"
        spec:
          containers:
            - name: pytorch
              image: pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime
              imagePullPolicy: IfNotPresent
              command:
                - python
                - -m
                - torch.distributed.launch
                - --nproc_per_node=1
                - --nnodes=$(WORLD_SIZE)
                - --node_rank=$(RANK)
                - --master_addr=$(MASTER_ADDR)
                - --master_port=$(MASTER_PORT)
                - train.py
                - --epochs=10
                - --batch-size=64
              env:
                - name: WORLD_SIZE
                  value: "4"
              ports:
                - containerPort: 23456
                  name: pytorchjob-port
              resources:
                requests:
                  cpu: "2"
                  memory: "4Gi"
                limits:
                  cpu: "4"
                  memory: "8Gi"
                  nvidia.com/gpu: 1
              volumeMounts:
                - name: data
                  mountPath: /data
                - name: output
                  mountPath: /output
          volumes:
            - name: data
              persistentVolumeClaim:
                claimName: training-data-pvc
            - name: output
              persistentVolumeClaim:
                claimName: model-output-pvc
    
    Worker:
      replicas: 3
      restartPolicy: OnFailure
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
        spec:
          containers:
            - name: pytorch
              image: pytorch/pytorch:2.0.0-cuda11.7-cudnn8-runtime
              imagePullPolicy: IfNotPresent
              command:
                - python
                - -m
                - torch.distributed.launch
                - --nproc_per_node=1
                - --nnodes=$(WORLD_SIZE)
                - --node_rank=$(RANK)
                - --master_addr=$(MASTER_ADDR)
                - --master_port=$(MASTER_PORT)
                - train.py
                - --epochs=10
                - --batch-size=64
              env:
                - name: WORLD_SIZE
                  value: "4"
              ports:
                - containerPort: 23456
                  name: pytorchjob-port
              resources:
                requests:
                  cpu: "2"
                  memory: "4Gi"
                limits:
                  cpu: "4"
                  memory: "8Gi"
                  nvidia.com/gpu: 1
              volumeMounts:
                - name: data
                  mountPath: /data
                - name: output
                  mountPath: /output
          volumes:
            - name: data
              persistentVolumeClaim:
                claimName: training-data-pvc
            - name: output
              persistentVolumeClaim:
                claimName: model-output-pvc
```

### 使用 torchrun（PyTorch 2.0+）

```yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: pytorch-fsdp-training
spec:
  pytorchReplicaSpecs:
    Worker:
      replicas: 4
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: pytorch
              image: your-training-image:latest
              command:
                - torchrun
                - --nnodes=$(PET_NNODES)
                - --nproc_per_node=gpu
                - --rdzv_id=$(PYTORCH_JOB_NAME)
                - --rdzv_backend=c10d
                - --rdzv_endpoint=$(PET_RDZV_ENDPOINT)
                - train_fsdp.py
              resources:
                limits:
                  nvidia.com/gpu: 4
```

## 📊 TFJob 使用指南

TFJob 用于运行 TensorFlow 分布式训练，支持 Parameter Server 和 AllReduce 策略。

### Parameter Server 模式

```yaml
apiVersion: kubeflow.org/v1
kind: TFJob
metadata:
  name: tensorflow-ps-job
spec:
  cleanPodPolicy: None
  tfReplicaSpecs:
    PS:
      replicas: 2
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: tensorflow
              image: tensorflow/tensorflow:2.12.0-gpu
              command:
                - python
                - train_ps.py
              ports:
                - containerPort: 2222
                  name: tfjob-port
              resources:
                limits:
                  cpu: "4"
                  memory: "8Gi"
    
    Worker:
      replicas: 4
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: tensorflow
              image: tensorflow/tensorflow:2.12.0-gpu
              command:
                - python
                - train_ps.py
              resources:
                limits:
                  nvidia.com/gpu: 1
```

### MultiWorkerMirroredStrategy 模式

```yaml
apiVersion: kubeflow.org/v1
kind: TFJob
metadata:
  name: tensorflow-multiworker-job
spec:
  tfReplicaSpecs:
    Worker:
      replicas: 4
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: tensorflow
              image: tensorflow/tensorflow:2.12.0-gpu
              command:
                - python
                - train_multiworker.py
              resources:
                limits:
                  nvidia.com/gpu: 1
```

## 🔧 MPIJob 使用指南

MPIJob 使用 Horovod 或 MPI 进行分布式训练，适合需要高效 AllReduce 通信的场景。

### 基本配置

```yaml
apiVersion: kubeflow.org/v1
kind: MPIJob
metadata:
  name: horovod-training-job
spec:
  slotsPerWorker: 1
  runPolicy:
    cleanPodPolicy: Running
  mpiReplicaSpecs:
    Launcher:
      replicas: 1
      template:
        spec:
          containers:
            - name: mpi-launcher
              image: horovod/horovod:latest-gpu
              command:
                - mpirun
                - -np
                - "4"
                - --allow-run-as-root
                - -bind-to
                - none
                - -map-by
                - slot
                - -x
                - NCCL_DEBUG=INFO
                - -x
                - LD_LIBRARY_PATH
                - -x
                - PATH
                - python
                - train_horovod.py
              resources:
                limits:
                  cpu: "1"
                  memory: "2Gi"
    
    Worker:
      replicas: 4
      template:
        spec:
          containers:
            - name: mpi-worker
              image: horovod/horovod:latest-gpu
              resources:
                limits:
                  nvidia.com/gpu: 1
                  rdma/hca: 1  # 如果使用 RDMA
```

## 📈 监控训练任务

### 查看任务状态

```bash
# 查看 PyTorchJob 列表
kubectl get pytorchjobs -n kubeflow

# 查看详细状态
kubectl describe pytorchjob pytorch-mnist-ddp -n kubeflow

# 查看任务 YAML（包含 status）
kubectl get pytorchjob pytorch-mnist-ddp -n kubeflow -o yaml
```

### 查看 Pod 状态

```bash
# 列出训练任务的所有 Pod
kubectl get pods -l training.kubeflow.org/job-name=pytorch-mnist-ddp -n kubeflow

# 查看 Master Pod 日志
MASTER_POD=$(kubectl get pods -l training.kubeflow.org/job-name=pytorch-mnist-ddp,training.kubeflow.org/replica-type=master -o name -n kubeflow)
kubectl logs -f $MASTER_POD -n kubeflow

# 查看 Worker Pod 日志
kubectl logs -f pytorch-mnist-ddp-worker-0 -n kubeflow
```

### 任务状态说明

| 状态 | 说明 |
|------|------|
| Created | 任务已创建，等待调度 |
| Running | 任务正在运行 |
| Succeeded | 任务成功完成 |
| Failed | 任务失败 |
| Restarting | 任务正在重启 |

## 🔄 弹性训练配置

### PyTorch 弹性训练

```yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: pytorch-elastic-job
spec:
  elasticPolicy:
    minReplicas: 2
    maxReplicas: 8
    rdzvBackend: c10d
    metrics:
      - type: Resource
        resource:
          name: cpu
          target:
            type: Utilization
            averageUtilization: 80
  pytorchReplicaSpecs:
    Worker:
      replicas: 4
      restartPolicy: OnFailure
      template:
        spec:
          containers:
            - name: pytorch
              image: your-training-image:latest
              command:
                - torchrun
                - --rdzv_backend=c10d
                - --rdzv_endpoint=$(MASTER_ADDR):$(MASTER_PORT)
                - --nproc_per_node=1
                - train_elastic.py
```

## 🎯 与 KitOps 集成

### 训练完成后自动打包模型

```yaml
apiVersion: kubeflow.org/v1
kind: PyTorchJob
metadata:
  name: train-and-package
spec:
  pytorchReplicaSpecs:
    Worker:
      replicas: 4
      template:
        spec:
          containers:
            - name: pytorch
              image: your-training-image:latest
              command:
                - /bin/sh
                - -c
                - |
                  # 训练模型
                  python train.py --output /output/model
                  
                  # 训练完成后，打包并推送到 TCR
                  if [ $RANK -eq 0 ]; then
                    cd /output
                    kit pack . -t $TCR_REGISTRY/ml-models/trained-model:$(date +%Y%m%d)
                    kit push $TCR_REGISTRY/ml-models/trained-model:$(date +%Y%m%d)
                  fi
              volumeMounts:
                - name: output
                  mountPath: /output
```

### 使用 Job 打包训练产物

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: package-trained-model
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: packager
          image: ghcr.io/kitops-ml/kit:latest
          command:
            - sh
            - -c
            - |
              # 等待训练任务完成
              kubectl wait --for=condition=Succeeded pytorchjob/pytorch-mnist-ddp --timeout=3600s
              
              # 打包模型
              kit login $TCR_REGISTRY -u $TCR_USERNAME -p $TCR_PASSWORD
              kit pack /output -t $TCR_REGISTRY/ml-models/mnist-model:v1.0.0
              kit push $TCR_REGISTRY/ml-models/mnist-model:v1.0.0
          volumeMounts:
            - name: output
              mountPath: /output
      volumes:
        - name: output
          persistentVolumeClaim:
            claimName: model-output-pvc
```

## 🔧 故障排查

### 常见问题

#### Pod 启动失败

```bash
# 检查 Pod 事件
kubectl describe pod <pod-name> -n kubeflow

# 常见原因：
# 1. 镜像拉取失败 - 检查镜像地址和凭证
# 2. 资源不足 - 检查 GPU/内存请求
# 3. PVC 挂载失败 - 检查 PVC 状态
```

#### 分布式通信失败

```bash
# 检查网络连通性
kubectl exec -it <worker-pod> -- ping <master-pod-ip>

# 检查端口是否开放
kubectl exec -it <worker-pod> -- nc -zv <master-pod-ip> 23456

# 常见原因：
# 1. 防火墙规则阻止通信
# 2. Pod 网络策略限制
# 3. NCCL 配置问题
```

#### 训练挂起

```bash
# 查看训练日志
kubectl logs -f <pod-name> -n kubeflow

# 启用 NCCL 调试
env:
  - name: NCCL_DEBUG
    value: INFO
  - name: NCCL_DEBUG_SUBSYS
    value: ALL
```

## 🔗 相关资源

- [Kubeflow Training Operator 官方文档](https://www.kubeflow.org/docs/components/training/)
- [PyTorchJob 参考](https://www.kubeflow.org/docs/components/training/user-guides/pytorch/)
- [TFJob 参考](https://www.kubeflow.org/docs/components/training/user-guides/tensorflow/)
- [GitHub 仓库](https://github.com/kubeflow/training-operator)
- [返回 Training on TKE](index.md)
