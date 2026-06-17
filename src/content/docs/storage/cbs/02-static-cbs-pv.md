---
title: "使用已有 CBS"
---

# 使用已有 CBS

已有 CBS 云硬盘可以通过静态 PV 绑定到 TKE 工作负载，适合数据迁移、故障恢复或复用存量云硬盘。

---

## 前置条件

- 云硬盘与集群节点在同一地域和可用区
- 云硬盘未被其他节点挂载
- 已确认文件系统类型和数据目录
- 已安装 CBS-CSI 组件

---

## 创建 PV

将 `disk-xxxxxxxx` 替换为已有云硬盘 ID：

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: existing-cbs-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: cbs-static
  csi:
    driver: com.tencent.cloud.csi.cbs
    volumeHandle: disk-xxxxxxxx
    fsType: ext4
```

```bash
kubectl apply -f existing-cbs-pv.yaml
kubectl get pv existing-cbs-pv
```

---

## 创建 PVC 绑定 PV

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: existing-cbs-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: cbs-static
  volumeName: existing-cbs-pv
  resources:
    requests:
      storage: 100Gi
```

```bash
kubectl apply -f existing-cbs-pvc.yaml
kubectl get pvc existing-cbs-pvc
```

PVC 的 `storageClassName`、`accessModes`、容量和指定 PV 需要匹配，否则会停留在 Pending。

---

## 挂载验证

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cbs-check
spec:
  containers:
    - name: busybox
      image: busybox:1.36
      command: ["sh", "-c", "sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: existing-cbs-pvc
```

```bash
kubectl apply -f cbs-check.yaml
kubectl exec -it cbs-check -- df -h /data
```

---

## 注意事项

- CBS 通常只能挂载到一个节点，不适合多 Pod 跨节点共享写入。
- 静态 PV 删除前确认是否仍需保留云硬盘数据。
- 从其他环境迁移来的云硬盘，先在测试 Pod 中只读检查数据，再交给正式业务。
