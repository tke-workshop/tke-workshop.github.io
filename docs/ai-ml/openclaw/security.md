# 安全隔离

## 概述

OpenClaw 支持三种安全隔离方案，适用于不同的安全需求场景。

## 方案对比

| 方案 | 隔离强度 | 成本 | 适用场景 |
|------|---------|------|---------|
| **方案 A：普通容器 + 网络策略** | ⭐⭐ | 基准成本 | 同公司用户，低风险 |
| **方案 B：调度亲和性 + 网络策略** | ⭐⭐⭐ | 基准成本 | 同公司用户，中风险 |
| **方案 C：Kata Containers + 裸金属** | ⭐⭐⭐⭐⭐ | +30-50% | 跨公司，高安全要求 |

## 方案 A：普通容器运行时

### 原理

- 标准 Linux 容器隔离（Namespace + Cgroup）
- 使用 containerd/runc 运行时

### 配置

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: openclaw-user
spec:
  containers:
  - name: openclaw
    image: openclaw:latest
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      runAsNonRoot: true
```

### 网络策略

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: openclaw-isolation
spec:
  podSelector:
    matchLabels:
      app: openclaw
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: ingress
  egress:
  - to:
    - podSelector:
        matchLabels:
          role: nat-gateway
```

### 适用场景

- 同公司内部用户
- 风险可控场景
- 成本敏感

## 方案 B：调度亲和性策略

### 原理

将同公司用户的 Pod 固定到同一节点，即使发生逃逸，也只能访问同公司数据。

### 配置

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: openclaw-company-a
  labels:
    company: company-a
spec:
  affinity:
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            company: company-a
        topologyKey: kubernetes.io/hostname
  containers:
  - name: openclaw
    image: openclaw:latest
```

### 适用场景

- 多租户场景
- 需要隔离不同公司用户
- 成本与方案 A 相同

## 方案 C：Kata Containers + 裸金属

### 原理

- 每个 Pod 运行在独立的轻量级虚拟机中
- 使用裸金属服务器（无二次虚拟化损耗）
- 虚拟机级别隔离，安全性接近物理隔离

### 配置

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: openclaw-secure
spec:
  runtimeClassName: kata-containers
  containers:
  - name: openclaw
    image: openclaw:latest
```

### RuntimeClass 配置

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata-containers
handler: kata
scheduling:
  nodeSelector:
    node.kubernetes.io/instance-type: bare-metal
```

### 成本考虑

- 裸金属价格比虚拟机高 30-50%
- 超卖后成本可控
- 适合高安全要求场景

### 适用场景

- 金融/政务等敏感场景
- 跨公司数据强隔离
- 合规要求

## 推荐选择

| 阶段 | 推荐方案 | 理由 |
|------|---------|------|
| **初期试点** | 方案 A | 成本最低，快速验证 |
| **规模上线** | 方案 B | 成本不变，风险降低 |
| **高安全要求** | 方案 C | 金融/政务等敏感场景 |

## 相关文档

- [网络方案](networking.md)
- [生产实践](production.md)
