# TKE 部署指南

## 📚 概述

本文档介绍如何在 TKE 集群中解包和部署 ModelKit，实现模型的快速部署和管理。我们将介绍多种部署模式，帮助你选择最适合业务场景的方案。

## 🎯 文档元信息

- **适用产品**: TKE 标准集群 / TKE Serverless
- **适用场景**: 模型推理服务部署、批量预测任务
- **Agent 友好度**: ⭐⭐⭐⭐⭐

## 📋 部署方式对比

| 方式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **Init Container** | 启动时加载 | 简单直接、资源占用少 | 更新需重启 Pod |
| **Sidecar** | 运行时更新 | 支持热更新 | 资源占用多 |
| **定时任务** | 定期同步 | 自动化、批量更新 | 延迟较大 |
| **PV 预加载** | 共享模型 | 多 Pod 共享、节省带宽 | 配置复杂 |

## 🚀 方式一：Init Container 部署（推荐）

Init Container 是最常用的部署方式，在主容器启动前完成模型加载。

### 基本配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-inference
  labels:
    app: model-inference
spec:
  replicas: 3
  selector:
    matchLabels:
      app: model-inference
  template:
    metadata:
      labels:
        app: model-inference
    spec:
      # 拉取 TCR 镜像的凭证
      imagePullSecrets:
        - name: tcr-secret
      
      # Init Container 加载模型
      initContainers:
        - name: model-loader
          image: ghcr.io/kitops-ml/kit:latest
          command:
            - sh
            - -c
            - |
              kit login $TCR_REGISTRY -u $TCR_USERNAME -p $TCR_PASSWORD
              kit unpack $MODEL_REFERENCE --filter=model -d /models -o
          env:
            - name: TCR_REGISTRY
              value: "ml-registry-xxxx.tencentcloudcr.com"
            - name: MODEL_REFERENCE
              value: "ml-registry-xxxx.tencentcloudcr.com/ml-models/bert-sentiment:v1.2.0"
            - name: TCR_USERNAME
              valueFrom:
                secretKeyRef:
                  name: tcr-credentials
                  key: username
            - name: TCR_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: tcr-credentials
                  key: password
          volumeMounts:
            - name: model-volume
              mountPath: /models
      
      # 主容器运行推理服务
      containers:
        - name: inference-server
          image: your-inference-image:latest
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: model-volume
              mountPath: /app/models
              readOnly: true
          resources:
            requests:
              memory: "2Gi"
              cpu: "1"
            limits:
              memory: "4Gi"
              cpu: "2"
      
      volumes:
        - name: model-volume
          emptyDir: {}
```

### 使用 ConfigMap 管理模型版本

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: model-config
data:
  MODEL_VERSION: "v1.2.0"
  MODEL_NAME: "bert-sentiment"
  MODEL_NAMESPACE: "ml-models"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-inference
spec:
  template:
    spec:
      initContainers:
        - name: model-loader
          image: ghcr.io/kitops-ml/kit:latest
          command:
            - sh
            - -c
            - |
              MODEL_REF="${TCR_REGISTRY}/${MODEL_NAMESPACE}/${MODEL_NAME}:${MODEL_VERSION}"
              echo "Loading model: $MODEL_REF"
              kit login $TCR_REGISTRY -u $TCR_USERNAME -p $TCR_PASSWORD
              kit unpack $MODEL_REF --filter=model -d /models -o
              echo "Model loaded successfully"
          envFrom:
            - configMapRef:
                name: model-config
          env:
            - name: TCR_REGISTRY
              value: "ml-registry-xxxx.tencentcloudcr.com"
            # ... 凭证配置
```

### 选择性加载组件

```yaml
initContainers:
  - name: model-loader
    image: ghcr.io/kitops-ml/kit:latest
    command:
      - sh
      - -c
      - |
        # 仅加载模型
        kit unpack $MODEL_REF --filter=model -d /models -o
        
        # 加载模型和配置
        # kit unpack $MODEL_REF --filter=model --filter=docs -d /models -o
        
        # 加载模型和特定数据集
        # kit unpack $MODEL_REF --filter=model --filter=datasets:validation -d /models -o
```

## 🔄 方式二：Sidecar 部署（支持热更新）

Sidecar 模式允许在运行时更新模型，无需重启主容器。

### 基本配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-inference-with-sidecar
spec:
  template:
    spec:
      containers:
        # 主推理容器
        - name: inference-server
          image: your-inference-image:latest
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: model-volume
              mountPath: /app/models
              readOnly: true
          # 监听文件变化并重新加载模型
          lifecycle:
            postStart:
              exec:
                command:
                  - /bin/sh
                  - -c
                  - |
                    # 等待模型加载完成
                    while [ ! -f /app/models/.ready ]; do sleep 1; done
        
        # Sidecar 容器：模型更新器
        - name: model-updater
          image: ghcr.io/kitops-ml/kit:latest
          command:
            - sh
            - -c
            - |
              # 初始加载
              kit login $TCR_REGISTRY -u $TCR_USERNAME -p $TCR_PASSWORD
              kit unpack $MODEL_REF --filter=model -d /models -o
              touch /models/.ready
              
              # 定期检查更新
              while true; do
                sleep 300  # 每 5 分钟检查一次
                
                # 检查是否有新版本
                LOCAL_DIGEST=$(cat /models/.digest 2>/dev/null || echo "")
                REMOTE_DIGEST=$(kit info $MODEL_REF --format '{{.Digest}}' 2>/dev/null || echo "")
                
                if [ "$LOCAL_DIGEST" != "$REMOTE_DIGEST" ] && [ -n "$REMOTE_DIGEST" ]; then
                  echo "New model version detected, updating..."
                  kit unpack $MODEL_REF --filter=model -d /models -o
                  echo "$REMOTE_DIGEST" > /models/.digest
                  touch /models/.updated
                  echo "Model updated successfully"
                fi
              done
          env:
            - name: MODEL_REF
              value: "ml-registry-xxxx.tencentcloudcr.com/ml-models/bert-sentiment:latest"
            # ... 凭证配置
          volumeMounts:
            - name: model-volume
              mountPath: /models
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "200m"
      
      volumes:
        - name: model-volume
          emptyDir: {}
```

## ⏰ 方式三：定时任务更新

使用 CronJob 定期将模型同步到共享存储，适合多 Pod 共享同一模型的场景。

### CronJob 配置

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: model-sync-job
spec:
  schedule: "0 */6 * * *"  # 每 6 小时执行一次
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: model-syncer
              image: ghcr.io/kitops-ml/kit:latest
              command:
                - sh
                - -c
                - |
                  set -e
                  
                  # 登录 TCR
                  kit login $TCR_REGISTRY -u $TCR_USERNAME -p $TCR_PASSWORD
                  
                  # 同步多个模型
                  MODELS="bert-sentiment:v1.2.0 image-classifier:v2.0.0 text-generator:v1.0.0"
                  
                  for model in $MODELS; do
                    MODEL_REF="${TCR_REGISTRY}/ml-models/${model}"
                    MODEL_NAME=$(echo $model | cut -d: -f1)
                    
                    echo "Syncing model: $MODEL_REF"
                    kit unpack $MODEL_REF --filter=model -d /models/$MODEL_NAME -o
                    echo "Model $MODEL_NAME synced successfully"
                  done
                  
                  # 更新同步时间戳
                  date > /models/.last_sync
              env:
                - name: TCR_REGISTRY
                  value: "ml-registry-xxxx.tencentcloudcr.com"
                - name: TCR_USERNAME
                  valueFrom:
                    secretKeyRef:
                      name: tcr-credentials
                      key: username
                - name: TCR_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: tcr-credentials
                      key: password
              volumeMounts:
                - name: model-storage
                  mountPath: /models
          volumes:
            - name: model-storage
              persistentVolumeClaim:
                claimName: model-pvc
```

### 共享 PVC 配置

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: model-pvc
spec:
  accessModes:
    - ReadWriteMany  # 支持多 Pod 同时读取
  storageClassName: cfs  # 使用 CFS 共享存储
  resources:
    requests:
      storage: 100Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-inference
spec:
  replicas: 10
  template:
    spec:
      containers:
        - name: inference-server
          image: your-inference-image:latest
          volumeMounts:
            - name: model-storage
              mountPath: /app/models
              readOnly: true
      volumes:
        - name: model-storage
          persistentVolumeClaim:
            claimName: model-pvc
```

## 🎯 方式四：与推理框架集成

### 与 Triton Inference Server 集成

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-inference-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: triton-server
  template:
    metadata:
      labels:
        app: triton-server
    spec:
      initContainers:
        - name: model-loader
          image: ghcr.io/kitops-ml/kit:latest
          command:
            - sh
            - -c
            - |
              kit login $TCR_REGISTRY -u $TCR_USERNAME -p $TCR_PASSWORD
              
              # 加载多个模型到 Triton 模型仓库格式
              # Triton 要求的目录结构: /models/<model-name>/<version>/model.xxx
              
              kit unpack $TCR_REGISTRY/ml-models/bert-classifier:v1.0.0 \
                --filter=model -d /model-repository/bert-classifier/1 -o
              
              kit unpack $TCR_REGISTRY/ml-models/resnet50:v2.0.0 \
                --filter=model -d /model-repository/resnet50/1 -o
              
              # 创建配置文件
              cat > /model-repository/bert-classifier/config.pbtxt << EOF
              name: "bert-classifier"
              platform: "pytorch_libtorch"
              max_batch_size: 32
              input [
                {
                  name: "input_ids"
                  data_type: TYPE_INT64
                  dims: [ -1 ]
                }
              ]
              output [
                {
                  name: "logits"
                  data_type: TYPE_FP32
                  dims: [ -1, 2 ]
                }
              ]
              EOF
          env:
            - name: TCR_REGISTRY
              value: "ml-registry-xxxx.tencentcloudcr.com"
            # ... 凭证配置
          volumeMounts:
            - name: model-repository
              mountPath: /model-repository
      
      containers:
        - name: triton-server
          image: nvcr.io/nvidia/tritonserver:24.01-py3
          args:
            - tritonserver
            - --model-repository=/models
            - --strict-model-config=false
          ports:
            - containerPort: 8000
              name: http
            - containerPort: 8001
              name: grpc
            - containerPort: 8002
              name: metrics
          volumeMounts:
            - name: model-repository
              mountPath: /models
              readOnly: true
          resources:
            requests:
              nvidia.com/gpu: 1
            limits:
              nvidia.com/gpu: 1
      
      volumes:
        - name: model-repository
          emptyDir: {}
```

### 与 vLLM 集成（LLM 推理）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vllm-server
  template:
    metadata:
      labels:
        app: vllm-server
    spec:
      initContainers:
        - name: model-loader
          image: ghcr.io/kitops-ml/kit:latest
          command:
            - sh
            - -c
            - |
              kit login $TCR_REGISTRY -u $TCR_USERNAME -p $TCR_PASSWORD
              
              # 加载 LLM 模型（含 LoRA 权重）
              kit unpack $TCR_REGISTRY/ml-models/qwen-7b-chat:v1.0.0 \
                --filter=model -d /models -o
              
              echo "Model loaded successfully"
              ls -la /models/
          env:
            - name: TCR_REGISTRY
              value: "ml-registry-xxxx.tencentcloudcr.com"
            # ... 凭证配置
          volumeMounts:
            - name: model-volume
              mountPath: /models
      
      containers:
        - name: vllm-server
          image: vllm/vllm-openai:latest
          args:
            - --model=/models
            - --host=0.0.0.0
            - --port=8000
            - --tensor-parallel-size=1
          ports:
            - containerPort: 8000
          volumeMounts:
            - name: model-volume
              mountPath: /models
              readOnly: true
          resources:
            requests:
              nvidia.com/gpu: 1
              memory: "32Gi"
            limits:
              nvidia.com/gpu: 1
              memory: "64Gi"
      
      volumes:
        - name: model-volume
          emptyDir:
            medium: Memory  # 使用内存加速
            sizeLimit: "50Gi"
```

## 📊 性能优化

### 模型缓存策略

使用节点本地存储缓存模型，减少重复下载：

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: model-cache
spec:
  selector:
    matchLabels:
      app: model-cache
  template:
    metadata:
      labels:
        app: model-cache
    spec:
      containers:
        - name: cache-manager
          image: ghcr.io/kitops-ml/kit:latest
          command:
            - sh
            - -c
            - |
              # 预加载常用模型到节点本地
              kit login $TCR_REGISTRY -u $TCR_USERNAME -p $TCR_PASSWORD
              
              MODELS="bert-sentiment:v1.2.0 image-classifier:v2.0.0"
              
              for model in $MODELS; do
                MODEL_REF="${TCR_REGISTRY}/ml-models/${model}"
                kit pull $MODEL_REF  # 拉取到本地缓存
              done
              
              # 保持运行
              sleep infinity
          volumeMounts:
            - name: kit-cache
              mountPath: /root/.kitops
      volumes:
        - name: kit-cache
          hostPath:
            path: /var/lib/kitops
            type: DirectoryOrCreate
```

### 并行解包

```bash
# 使用多个 Init Container 并行加载
initContainers:
  - name: load-model
    image: ghcr.io/kitops-ml/kit:latest
    command: ["sh", "-c", "kit unpack $MODEL_REF --filter=model -d /models -o"]
    
  - name: load-config
    image: ghcr.io/kitops-ml/kit:latest
    command: ["sh", "-c", "kit unpack $MODEL_REF --filter=docs -d /config -o"]
```

### 增量更新

```bash
# 仅在有变化时更新
CURRENT_DIGEST=$(kit info $MODEL_REF --format '{{.Digest}}')
CACHED_DIGEST=$(cat /models/.digest 2>/dev/null || echo "")

if [ "$CURRENT_DIGEST" != "$CACHED_DIGEST" ]; then
  kit unpack $MODEL_REF --filter=model -d /models -o
  echo "$CURRENT_DIGEST" > /models/.digest
fi
```

## 🔒 Secret 配置

### 创建 TCR 凭证 Secret

```bash
# 创建包含 TCR 凭证的 Secret
kubectl create secret generic tcr-credentials \
  --from-literal=username=<TCR用户名> \
  --from-literal=password=<TCR密码> \
  -n <命名空间>
```

### 使用 ServiceAccount 的 ImagePullSecret

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: model-inference-sa
imagePullSecrets:
  - name: tcr-secret
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-inference
spec:
  template:
    spec:
      serviceAccountName: model-inference-sa
      # 无需在 Pod 中配置 imagePullSecrets
```

## 🔗 相关资源

- [TKE 产品文档](https://cloud.tencent.com/document/product/457)
- [TCR 集成指南](tcr-integration.md)
- [CI/CD 集成](cicd-integration.md)
- [返回 KitOps on TKE](index.md)
