# 快速开始

## 前置条件

在开始之前，请确保满足以下条件：

- [x] TKE 集群（Kubernetes 1.20+）
- [x] 至少 3 个节点（推荐 48C192G）
- [x] kubectl 已配置并可访问集群
- [x] GlobalRouter 网络模式已启用
- [x] CBS 存储类已配置

## 部署步骤

### 1. 创建命名空间

```bash
kubectl create namespace openclaw
```

### 2. 配置存储类

确保 CBS 存储类已配置：

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cbs-ssd
provisioner: com.tencent.cloud.csi.cbs
parameters:
  diskType: CLOUD_SSD
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

### 3. 部署 OpenClaw 实例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openclaw-demo
  namespace: openclaw
spec:
  replicas: 1
  selector:
    matchLabels:
      app: openclaw
  template:
    metadata:
      labels:
        app: openclaw
    spec:
      containers:
      - name: openclaw
        image: your-registry/openclaw:latest
        resources:
          requests:
            cpu: "200m"      # 0.2C
            memory: "800Mi"  # 800MB
          limits:
            cpu: "1"         # 1C
            memory: "2Gi"    # 2GB
        volumeMounts:
        - name: user-data
          mountPath: /data
      volumes:
      - name: user-data
        persistentVolumeClaim:
          claimName: openclaw-demo-pvc
```

### 4. 创建 PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: openclaw-demo-pvc
  namespace: openclaw
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cbs-ssd
  resources:
    requests:
      storage: 20Gi
```

### 5. 验证部署

```bash
# 检查 Pod 状态
kubectl get pods -n openclaw

# 查看日志
kubectl logs -f deployment/openclaw-demo -n openclaw
```

## 下一步

- [了解完整架构方案](architecture.md)
- [配置网络方案](networking.md)
- [优化存储性能](storage.md)
