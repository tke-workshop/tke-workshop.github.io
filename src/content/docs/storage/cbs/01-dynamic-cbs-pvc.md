---
title: "动态创建 CBS PVC"
---

# 动态创建 CBS PVC

动态创建是使用 CBS 的推荐方式：先定义 StorageClass，再创建 PVC，TKE 通过 CBS-CSI 自动创建云硬盘并绑定给工作负载。

---

## 前置条件

- 集群已安装 CBS-CSI 组件
- 节点所在可用区支持目标云硬盘类型
- 账号具备 CBS 创建权限，配额和余额充足
- 生产环境已明确回收策略和快照策略

---

## 创建 StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cbs-premium
provisioner: com.tencent.cloud.csi.cbs
parameters:
  diskType: CLOUD_PREMIUM
  diskChargeType: POSTPAID_BY_HOUR
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f cbs-storageclass.yaml
kubectl get storageclass cbs-premium
```

常见 `diskType`：

| 类型 | 说明 |
|------|------|
| CLOUD_PREMIUM | 高性能云硬盘，通用场景 |
| CLOUD_SSD | SSD 云硬盘 |
| CLOUD_HSSD | 增强型 SSD 云硬盘 |
| CLOUD_BSSD | 通用型 SSD 云硬盘 |

---

## 创建 PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cbs-premium
  resources:
    requests:
      storage: 50Gi
```

```bash
kubectl apply -f mysql-pvc.yaml
kubectl get pvc mysql-data
```

如果 StorageClass 使用 `WaitForFirstConsumer`，PVC 可能会等到 Pod 创建后才完成绑定。

---

## 挂载到工作负载

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
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
              value: "change-me"
          ports:
            - containerPort: 3306
          volumeMounts:
            - name: data
              mountPath: /var/lib/mysql
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: mysql-data
```

```bash
kubectl apply -f mysql.yaml
kubectl get pod,pvc,pv
kubectl describe pod mysql-0
```

---

## 验证写入

```bash
kubectl exec -it mysql-0 -- sh -c 'date > /var/lib/mysql/storage-check.txt'
kubectl delete pod mysql-0
kubectl exec -it mysql-0 -- cat /var/lib/mysql/storage-check.txt
```

Pod 重建后文件仍存在，说明 PVC 挂载正常。

---

## 清理资源

```bash
kubectl delete statefulset mysql
kubectl delete pvc mysql-data
```

如果 StorageClass 使用 `Retain`，PVC 删除后后端云硬盘不会自动删除，需要人工确认后在云控制台或通过 PV 回收流程处理。

---

## 参考

- [腾讯云 TKE 使用云硬盘 CBS](https://cloud.tencent.com/document/product/457/44237)
- [腾讯云 TKE StorageClass 管理云硬盘模板](https://cloud.tencent.com/document/product/457/44239)
