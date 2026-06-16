# 存储配置

TKE 支持多种持久化存储方案，满足无状态和有状态工作负载的不同需求。本文介绍如何在 TKE 集群中配置 StorageClass、PersistentVolume (PV) 和 PersistentVolumeClaim (PVC)。

---

## 📋 前置条件

- [ ] 已创建 TKE 集群（版本 1.20+）
- [ ] 已获取集群 kubeconfig
- [ ] 了解基本的 Kubernetes 存储概念

---

## 🗄️ TKE 支持的存储类型

| 存储类型 | 适用场景 | 访问模式 | TKE 集成 |
|----------|---------|---------|---------|
| **CBS 云硬盘** | 数据库、单 Pod 持久化 | ReadWriteOnce | ✅ 自动 |
| **CFS 文件存储** | 多 Pod 共享读写 | ReadWriteMany | ✅ 自动 |
| **COS 对象存储** | 大文件、备份、静态资源 | ReadWriteMany | ✅ 插件 |
| **本地存储** | 高性能缓存、日志 | ReadWriteOnce | ⚠️ 手动 |

---

## 📦 StorageClass

TKE 默认提供以下 StorageClass：

```bash
kubectl get storageclass
```

预期输出：
```text
NAME                 PROVISIONER                    AGE
cbs                  com.tencent.cloud.csi.cbs      xxx
cbs-encrypted        com.tencent.cloud.csi.cbs      xxx
cfs                  com.tencent.cloud.csi.cfs       xxx
```

### 创建自定义 CBS StorageClass

不同场景选择不同磁盘类型：

```yaml
# storageclass-cbs-ssd.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cbs-ssd
provisioner: com.tencent.cloud.csi.cbs
parameters:
  type: CLOUD_HSSD       # 增强型 SSD，高 IOPS 场景
  diskChargeType: POSTPAID_BY_HOUR
  # type 可选值：
  # CLOUD_PREMIUM    - 高性能云硬盘（通用场景）
  # CLOUD_SSD        - SSD 云硬盘
  # CLOUD_HSSD       - 增强型 SSD（数据库场景）
  # CLOUD_BSSD       - 通用型 SSD
reclaimPolicy: Delete     # PVC 删除后自动回收
allowVolumeExpansion: true  # 允许在线扩容
volumeBindingMode: WaitForFirstConsumer  # 延迟绑定，跟随 Pod 调度
```

```bash
kubectl apply -f storageclass-cbs-ssd.yaml
```

### 创建 CFS StorageClass（多读写场景）

```yaml
# storageclass-cfs.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cfs-standard
provisioner: com.tencent.cloud.csi.cfs
parameters:
  vpcid: vpc-xxxxxxxx     # 替换为你的 VPC ID
  subnetid: subnet-xxxxxxxx  # 替换为你的子网 ID
  storagetype: SD          # SD=标准, HP=高性能
reclaimPolicy: Retain      # 保留数据，手动回收
```

---

## 📝 PersistentVolumeClaim (PVC)

### 动态创建 PVC（推荐）

```yaml
# pvc-mysql-data.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce       # CBS 只支持单节点读写
  storageClassName: cbs-ssd
  resources:
    requests:
      storage: 50Gi
```

```bash
kubectl apply -f pvc-mysql-data.yaml
kubectl get pvc mysql-data
```

预期输出（等待几秒变为 Bound）：
```text
NAME         STATUS   VOLUME         CAPACITY   ACCESS MODES   STORAGECLASS   AGE
mysql-data   Bound    pvc-xxx-xxx    50Gi       RWO            cbs-ssd        30s
```

### 在 Pod/Deployment 中使用 PVC

```yaml
# deployment-mysql.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "yourpassword"
        ports:
        - containerPort: 3306
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mysql-data   # 引用上面创建的 PVC
```

---

## 🔄 StatefulSet 自动创建 PVC

StatefulSet 使用 `volumeClaimTemplates` 为每个 Pod 自动创建独立 PVC：

```yaml
# statefulset-redis.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7.0
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:             # 每个 Pod 自动创建一个 PVC
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: cbs-ssd
      resources:
        requests:
          storage: 20Gi
```

创建后每个 Pod 对应一个 PVC：
```text
data-redis-cluster-0   Bound   pvc-aaa   20Gi   RWO   cbs-ssd
data-redis-cluster-1   Bound   pvc-bbb   20Gi   RWO   cbs-ssd
data-redis-cluster-2   Bound   pvc-ccc   20Gi   RWO   cbs-ssd
```

---

## 📈 PVC 在线扩容

CBS StorageClass 设置了 `allowVolumeExpansion: true` 后，可以直接修改 PVC 的 storage 大小，**无需重启 Pod**：

```bash
# 将 PVC 从 50Gi 扩容到 100Gi
kubectl patch pvc mysql-data -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# 查看扩容状态
kubectl get pvc mysql-data
kubectl describe pvc mysql-data | grep -A5 Conditions
```

!!! warning "注意事项"
    - CBS 只支持**扩容**，不支持缩容
    - 扩容后需要等待约 1-2 分钟完成
    - 若 Pod 未重启，文件系统需要手动执行 `resize2fs`（TKE 1.24+ 会自动处理）

---

## 🔍 验证步骤

```bash
# 1. 查看 StorageClass
kubectl get sc

# 2. 查看 PVC 状态（Status 必须为 Bound）
kubectl get pvc -A

# 3. 查看 PV 详情
kubectl get pv
kubectl describe pv <pv-name>

# 4. 进入 Pod 验证挂载
kubectl exec -it <pod-name> -- df -h | grep /var/lib/mysql

# 5. 验证数据持久化（重启 Pod 后数据应保留）
kubectl delete pod <pod-name>  # StatefulSet 会自动重建
kubectl exec -it <new-pod-name> -- ls /var/lib/mysql
```

---

## ⚠️ 常见问题

### Q1: PVC 一直处于 Pending 状态

**原因排查**：
```bash
kubectl describe pvc <pvc-name>
```

常见原因：
- `WaitForFirstConsumer`：正常，等待 Pod 调度后自动 Bound
- 存储容量不足：检查账户 CBS 配额
- Zone 不匹配：`WaitForFirstConsumer` 模式可避免此问题

### Q2: Pod 挂载失败（FailedMount）

```bash
kubectl describe pod <pod-name> | grep -A10 Events
```

常见原因：
- PVC 未绑定到 PV（先解决 Pending 问题）
- 节点没有挂载权限（检查节点 CAM 角色）
- CBS 已被其他节点挂载（ReadWriteOnce 限制）

### Q3: 如何迁移 PVC 数据到新集群

```bash
# 推荐使用 Velero 备份恢复
velero backup create my-backup --include-namespaces default
velero restore create --from-backup my-backup
```

---

## 📖 相关资源

- [TKE 存储概述](https://cloud.tencent.com/document/product/457/46962)
- [CBS CSI 插件说明](https://cloud.tencent.com/document/product/457/51099)
- [CFS CSI 插件说明](https://cloud.tencent.com/document/product/457/44232)
- [数据处理](data-processing.md)

---

**文档维护者**: TKE Workshop Agent  
**最后更新**: 2026-04-03  
**Agent 友好度**: ⭐⭐⭐⭐⭐
