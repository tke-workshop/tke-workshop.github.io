# 存储方案

## 概述

OpenClaw 为每个用户提供独立的持久化存储，使用 CBS（云硬盘）方案。

## CBS 云硬盘方案

### 原理

- **独立挂载**: 每个 Pod 挂载独立的 CBS 云硬盘
- **持久化存储**: 数据持久化在云硬盘中，Pod 销毁后数据保留
- **按需挂载**: Pod 启动时自动挂载，停止时可选择保留或释放

### 技术限制

| 限制项 | 说明 | 应对策略 |
|--------|------|---------|
| **挂载速度** | 10-15 秒 | 预挂载机制 |
| **单节点限制** | 10-20 块/节点 | 扩展节点数量 |
| **并发挂载** | 大规模并发可能成为瓶颈 | 分批启动 |

### 配置示例

#### StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cbs-ssd-retain
provisioner: com.tencent.cloud.csi.cbs
parameters:
  diskType: CLOUD_SSD
reclaimPolicy: Retain          # 保留云盘
volumeBindingMode: WaitForFirstConsumer
```

#### PVC 模板

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: openclaw-user-${USER_ID}
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cbs-ssd-retain
  resources:
    requests:
      storage: 20Gi
```

## 应对策略

### 1. 节点规模扩展

通过增加节点数量分散单节点挂载压力：

```
节点数 = 总 Pod 数 / 单节点 Pod 上限
例：10万 Pod / 300 Pod/节点 = 334 节点
```

### 2. 分批启动

避免短时间内大规模并发创建 Pod：

```python
# 伪代码：分批创建 Pod
batch_size = 1000
for batch in chunks(users, batch_size):
    create_pods(batch)
    wait(30)  # 等待 30 秒
```

### 3. 预挂载机制

对高活跃用户提前创建并保持 Pod 运行。

### 4. 盘缓存策略

卸载 Pod 时保留云盘一段时间（如 7 天），避免频繁挂载/卸载。

## 方案对比

| 存储类型 | 挂载速度 | 单节点限制 | 推荐度 |
|---------|---------|-----------|--------|
| **CBS**（推荐） | 10-15秒 | 10-20个 | ⭐⭐⭐⭐ |
| CFS | < 5秒 | 无限制 | ⭐⭐⭐ |
| COS/COSFS | 很慢 | 无限制 | ⭐⭐ |

## 相关文档

- [网络方案](networking.md)
- [弹性管理](elasticity.md)
