---
title: "连接集群"
---

# 连接集群

## 文档元信息

- **功能名称**: 连接 TKE 集群
- **主要工具**: `tccli`、`kubectl`
- **文档更新时间**: 2026-06-17
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

连接集群的目标是获取 TKE 集群 kubeconfig，并让本地或自动化环境中的 `kubectl` 能访问目标集群。完成后即可执行 Kubernetes 对象操作，例如查看节点、部署 Deployment、创建 Service 和排查 Pod。

---

## 前置条件

- [ ] TKE 集群状态为 `Running`
- [ ] 已安装 `kubectl`
- [ ] 已安装并配置 `tccli`，或可从控制台下载 kubeconfig
- [ ] 当前账号具备读取集群凭证的权限
- [ ] 本地网络可以访问集群 API Server

---

## 方式一: 使用 tccli 获取 kubeconfig

```bash
tccli tke DescribeClusterKubeconfig \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx
```

将返回的 kubeconfig 内容保存到独立文件：

```bash
mkdir -p ~/.kube
vim ~/.kube/tke-cls-xxxxxxxx.yaml
```

配置环境变量：

```bash
export KUBECONFIG=~/.kube/tke-cls-xxxxxxxx.yaml
```

验证连接：

```bash
kubectl cluster-info
kubectl get nodes
kubectl get ns
```

---

## 方式二: 使用控制台下载 kubeconfig

1. 打开 TKE 控制台。
2. 进入目标集群详情页。
3. 复制或下载 kubeconfig。
4. 保存到 `~/.kube/tke-<cluster-id>.yaml`。
5. 设置 `KUBECONFIG` 后使用 `kubectl` 验证。

```bash
export KUBECONFIG=~/.kube/tke-cls-xxxxxxxx.yaml
kubectl get nodes
```

---

## 管理多个集群

### 合并 kubeconfig

```bash
export KUBECONFIG=~/.kube/config:~/.kube/tke-dev.yaml:~/.kube/tke-prod.yaml
kubectl config view --flatten > ~/.kube/config.merged
mv ~/.kube/config.merged ~/.kube/config
chmod 600 ~/.kube/config
```

### 查看 context

```bash
kubectl config get-contexts
kubectl config current-context
```

### 切换 context

```bash
kubectl config use-context <context-name>
```

### 设置默认命名空间

```bash
kubectl config set-context --current --namespace=<namespace>
```

---

## 常见检查命令

```bash
# 当前集群信息
kubectl cluster-info

# 当前用户和 context
kubectl config view --minify

# API Server 健康检查
kubectl get --raw='/readyz?verbose'

# 节点连通性验证
kubectl get nodes -o wide

# 命名空间验证
kubectl get ns
```

---

## 常见问题

| 问题 | 可能原因 | 处理方式 |
|------|----------|----------|
| `Unable to connect to the server` | 网络不可达或 API Server 地址不通 | 检查公网/内网访问方式、安全组和网络连通性 |
| `Unauthorized` | kubeconfig 用户凭证无效 | 重新获取 kubeconfig，确认账号权限 |
| `context not found` | 当前 kubeconfig 未包含目标 context | 使用 `kubectl config get-contexts` 检查 |
| 操作到错误集群 | context 未切换 | 执行 `kubectl config current-context` 确认 |
| 默认 namespace 错误 | context namespace 配置不符合预期 | 使用 `kubectl config set-context --current --namespace=...` |

---

## 相关文档

- [常用 kubectl 命令操作](./02-kubectl-common-operations.md)
- [创建 TKE 集群](../cluster/01-create-cluster.md)
- [查询 TKE 节点列表](../node/04-describe-nodes.md)
