---
title: "使用 CFS PVC"
---

# 使用 CFS PVC

CFS PVC 提供多节点共享文件系统能力，常用于多个 Pod 读写同一目录。

---

## 前置条件

- 集群已安装 CFS-CSI 组件
- 已准备 VPC、子网和 CFS 权限组
- 节点网络可以访问 CFS 挂载点
- 已确认 CFS 类型、NFS 协议版本和容量成本

---

## 创建 StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cfs-standard
provisioner: com.tencent.cloud.csi.cfs
parameters:
  pgroupid: pgroup-xxxxxxxx
  storagetype: SD
  vpcid: vpc-xxxxxxxx
  subnetid: subnet-xxxxxxxx
  vers: "3"
  zone: ap-guangzhou-3
reclaimPolicy: Retain
volumeBindingMode: Immediate
```

```bash
kubectl apply -f cfs-storageclass.yaml
kubectl get storageclass cfs-standard
```

参数说明：

| 参数 | 说明 |
|------|------|
| `pgroupid` | CFS 权限组 ID |
| `storagetype` | `SD` 标准型或 `HP` 性能型 |
| `vpcid` / `subnetid` | 文件系统所在私有网络和子网 |
| `vers` | NFS 协议版本，常见为 `"3"` 或 `"4"` |
| `zone` | 文件系统所在可用区 |

---

## 创建 PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: cfs-standard
  resources:
    requests:
      storage: 10Gi
  volumeMode: Filesystem
```

```bash
kubectl apply -f cfs-pvc.yaml
kubectl get pvc shared-data
```

CFS 文件系统容量会按产品能力扩展，PVC 中的 `storage` 更多用于 Kubernetes 资源声明和绑定。

---

## 挂载到 Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-shared
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-shared
  template:
    metadata:
      labels:
        app: web-shared
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          volumeMounts:
            - name: shared
              mountPath: /usr/share/nginx/html
      volumes:
        - name: shared
          persistentVolumeClaim:
            claimName: shared-data
```

```bash
kubectl apply -f web-shared.yaml
kubectl get pods -l app=web-shared -o wide
```

---

## 验证共享写入

```bash
POD=$(kubectl get pod -l app=web-shared -o jsonpath='{.items[0].metadata.name}')
kubectl exec "${POD}" -- sh -c 'date > /usr/share/nginx/html/index.html'
kubectl exec "${POD}" -- cat /usr/share/nginx/html/index.html
```

再进入另一个 Pod 检查同一文件是否可见。

---

## 注意事项

- CFS 适合共享文件，不适合替代高 IOPS 本地块存储。
- 权限组需要允许节点或 Pod 所在网络访问。
- 多 Pod 并发写同一文件时，应用需要自己处理锁和一致性。
- 性能敏感场景评估 CFS 类型、NFS 版本、目录结构和小文件数量。

---

## 参考

- [腾讯云 TKE PV 和 PVC 管理文件存储](https://cloud.tencent.com/document/product/457/44236)
- [腾讯云 TKE StorageClass 管理文件存储模板](https://cloud.tencent.com/document/product/457/44235)
