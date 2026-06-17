---
title: "COS Secret 与权限"
---

# COS Secret 与权限

COS 挂载依赖访问密钥。生产环境需要把密钥管理、权限边界和轮换流程作为存储设计的一部分。

---

## 权限原则

- 使用子账号或角色，不使用主账号密钥。
- 只授权需要访问的 Bucket 和路径。
- 区分只读数据集、读写目录和备份目录。
- 定期轮换 SecretId/SecretKey。
- 密钥不要写入镜像、ConfigMap、代码仓库或日志。

---

## Secret 示例

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
kubectl describe secret cos-secret -n kube-system
```

如果使用 GitOps，建议接入密钥管理方案，而不是把明文 Secret 存在仓库中。

---

## 轮换流程

1. 创建新的 COS 访问密钥。
2. 更新 Kubernetes Secret。
3. 重建使用该 Secret 的 Pod，使挂载重新读取凭证。
4. 验证读写正常。
5. 删除旧密钥。

```bash
kubectl apply -f cos-secret.yaml
kubectl rollout restart deployment/<deployment-name> -n <namespace>
```

---

## 排查权限问题

| 现象 | 可能原因 |
|------|----------|
| 挂载失败 | Secret 不存在、命名空间错误、密钥无效 |
| 读失败 | Bucket、路径或只读权限配置错误 |
| 写失败 | 缺少写权限、路径策略限制、Bucket 策略拒绝 |
| 轮换后仍失败 | Pod 未重建或仍使用旧挂载 |

```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl get secret cos-secret -n kube-system
```
