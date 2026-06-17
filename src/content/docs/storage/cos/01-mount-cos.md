---
title: "挂载 COS"
---

# 挂载 COS

TKE 支持通过 COS-CSI 创建 PV/PVC，并将对象存储 Bucket 挂载到工作负载。COS 挂载适合读多写少、数据集、模型、备份等场景。

---

## 前置条件

- 集群已安装 COS-CSI 扩展组件
- 已创建 COS Bucket 和需要挂载的子目录
- 已准备具备访问权限的 SecretId/SecretKey
- 已确认应用能接受对象存储挂载的语义和性能差异

---

## 创建 Secret

Secret 建议创建在 `kube-system` 命名空间：

```yaml
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: cos-secret
  namespace: kube-system
stringData:
  SecretId: "<SecretId>"
  SecretKey: "<SecretKey>"
```

```bash
kubectl apply -f cos-secret.yaml
```

生产环境不要把真实密钥提交到 Git。推荐使用子账号、最小权限和定期轮换。

---

## 创建 PV

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: cos-pv
spec:
  accessModes:
    - ReadWriteMany
  capacity:
    storage: 10Gi
  persistentVolumeReclaimPolicy: Retain
  csi:
    driver: com.tencent.cloud.csi.cosfs
    nodePublishSecretRef:
      name: cos-secret
      namespace: kube-system
    volumeAttributes:
      url: "https://<bucket-appid>.cos.<region>.myqcloud.com"
      path: "/dataset"
```

```bash
kubectl apply -f cos-pv.yaml
kubectl get pv cos-pv
```

`url` 和 `path` 按实际 Bucket、地域和子目录填写。

---

## 创建 PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cos-pvc
spec:
  accessModes:
    - ReadWriteMany
  volumeName: cos-pv
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f cos-pvc.yaml
kubectl get pvc cos-pvc
```

---

## 挂载到 Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cos-check
spec:
  containers:
    - name: busybox
      image: busybox:1.36
      command: ["sh", "-c", "sleep 3600"]
      volumeMounts:
        - name: cos
          mountPath: /cos
  volumes:
    - name: cos
      persistentVolumeClaim:
        claimName: cos-pvc
```

```bash
kubectl apply -f cos-check.yaml
kubectl exec -it cos-check -- ls -lah /cos
```

---

## 注意事项

- COS 是对象存储，不是本地 POSIX 文件系统。
- 高频随机写、小文件元数据密集场景不建议直接依赖 COS 挂载。
- 大文件读取、数据集分发、模型加载可评估 GooseFS-Lite 或缓存策略。
- 密钥必须使用最小权限，定期轮换，并限制 Bucket/路径范围。

---

## 参考

- [腾讯云 TKE 使用对象存储 COS](https://cloud.tencent.com/document/product/457/44232)
