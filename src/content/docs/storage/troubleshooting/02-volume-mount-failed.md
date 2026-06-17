---
title: "VolumeMount 失败"
---

# VolumeMount 失败

Pod 卡在 `ContainerCreating` 或事件中出现 `FailedMount`、`FailedAttachVolume` 时，说明 PVC 已绑定但挂载到节点或容器失败。

---

## 快速检查

```bash
NAMESPACE=default
POD=<pod-name>

kubectl describe pod "${POD}" -n "${NAMESPACE}"
kubectl get pvc -n "${NAMESPACE}"
kubectl get pv
kubectl get events -n "${NAMESPACE}" --sort-by=.lastTimestamp
```

---

## CBS 挂载失败

| 可能原因 | 处理 |
|----------|------|
| 云硬盘仍挂载在其他节点 | 等待 detach 完成，避免强制删除正在使用的 Pod |
| 云硬盘和节点可用区不一致 | 重新调度到同可用区节点或重建卷 |
| 文件系统异常 | 使用维护 Pod 检查，必要时从快照恢复 |
| CSI attach/detach 异常 | 检查 kube-system 中 CBS-CSI 组件 |

---

## CFS 挂载失败

| 可能原因 | 处理 |
|----------|------|
| 权限组未放通节点网段 | 调整 CFS 权限组 |
| VPC 或路由不通 | 检查节点到 CFS 挂载点连通性 |
| NFS 版本不匹配 | 检查 StorageClass `vers` 参数 |
| 子目录不存在或权限错误 | 创建目录并修正权限 |

---

## COS 挂载失败

| 可能原因 | 处理 |
|----------|------|
| Secret 不存在或命名空间错误 | 确认 `nodePublishSecretRef` |
| 密钥无效或权限不足 | 轮换密钥并检查 CAM/Bucket 策略 |
| Bucket URL 或地域错误 | 核对 COS 域名和 region |
| 挂载参数不适配 | 检查 COSFS/GooseFS-Lite 参数 |

---

## CSI 日志

```bash
kubectl get pods -n kube-system | rg 'csi|cbs|cfs|cos'
kubectl logs -n kube-system <csi-pod-name> --tail=200
```

不同集群组件名称可能不同，优先根据 Pod 名称中的 `cbs`、`cfs`、`cos`、`csi` 识别。
