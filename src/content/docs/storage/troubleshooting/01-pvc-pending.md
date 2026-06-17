---
title: "PVC Pending"
---

# PVC Pending

PVC 长时间处于 Pending，通常是 StorageClass、可用区、配额、访问模式或静态 PV 匹配失败导致。

---

## 快速检查

```bash
NAMESPACE=default
PVC=mysql-data

kubectl get pvc "${PVC}" -n "${NAMESPACE}" -o wide
kubectl describe pvc "${PVC}" -n "${NAMESPACE}"
kubectl get storageclass
kubectl get events -n "${NAMESPACE}" --sort-by=.lastTimestamp
```

重点看 `Events` 中的 provision、binding、quota、zone、permission 错误。

---

## 常见原因

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 找不到 StorageClass | `storageClassName` 写错或未创建 | 修正 PVC 或创建 StorageClass |
| no persistent volumes available | 静态 PV 不匹配 | 检查容量、accessModes、storageClassName、volumeName |
| 云盘创建失败 | CBS 配额、余额、权限不足 | 检查云资源配额和 CAM 权限 |
| 可用区不匹配 | 云盘和节点不在同一可用区 | 使用 `WaitForFirstConsumer` 或指定正确可用区 |
| CFS 创建失败 | 权限组、VPC、子网参数错误 | 检查 StorageClass 参数 |

---

## 静态 PV 绑定检查

```bash
kubectl get pv
kubectl describe pv <pv-name>
kubectl get pvc "${PVC}" -n "${NAMESPACE}" -o yaml
```

PVC 和 PV 至少需要匹配：

- `storageClassName`
- `accessModes`
- 容量请求不超过 PV 容量
- `volumeName` 指定时与 PV 名称一致
- PV 状态为 `Available` 或可重新绑定

---

## 动态供给检查

```bash
kubectl describe storageclass <storage-class-name>
kubectl get pods -n kube-system | rg 'csi|cbs|cfs|cos'
```

如果 CSI 组件异常，先恢复 CSI 组件，再重试 PVC 创建。
