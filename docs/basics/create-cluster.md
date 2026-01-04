# 创建集群

本章节将指导您创建第一个 TKE 集群。

## 1. 集群类型选择

TKE 提供多种集群类型：

| 类型 | 说明 | 适用场景 |
|------|------|----------|
| 标准集群 | 自建 Master，完全控制 | 生产环境、定制化需求 |
| 托管集群 | 托管 Master，免运维 | 快速上手、中小规模 |
| Serverless 集群 | 无需管理节点 | 弹性负载、按需付费 |

!!! tip "推荐"
    初学者建议选择**托管集群**，可以专注于应用部署而无需管理控制面。

## 2. 创建托管集群

### 2.1 通过控制台创建

1. 登录 [TKE 控制台](https://console.cloud.tencent.com/tke2)
2. 点击「新建」→「标准集群」
3. 配置集群基本信息：
    - **集群名称**: `tke-workshop-cluster`
    - **地域**: 选择就近地域
    - **集群版本**: 选择最新稳定版本
    - **容器网络插件**: VPC-CNI（推荐）

### 2.2 配置节点

```yaml
# 推荐配置
节点规格: 4核8G
节点数量: 2
操作系统: TencentOS Server 3.1
```

### 2.3 等待集群就绪

集群创建通常需要 5-10 分钟，创建完成后状态变为「运行中」。

## 3. 连接集群

### 3.1 获取 kubeconfig

1. 在集群列表点击集群名称
2. 选择「基本信息」→「集群凭证」
3. 点击「复制」或「下载」kubeconfig

### 3.2 配置本地连接

```bash
# 方式一：设置环境变量
export KUBECONFIG=/path/to/kubeconfig

# 方式二：合并到默认配置
mkdir -p ~/.kube
cp /path/to/kubeconfig ~/.kube/config
```

### 3.3 验证连接

```bash
# 查看集群信息
kubectl cluster-info

# 查看节点状态
kubectl get nodes
```

预期输出：

```
NAME           STATUS   ROLES    AGE   VERSION
10.0.0.1       Ready    <none>   5m    v1.28.3-tke.1
10.0.0.2       Ready    <none>   5m    v1.28.3-tke.1
```

!!! success "集群创建成功"
    看到节点状态为 `Ready` 表示集群已就绪。

## 4. 常见问题

### Q: 集群创建失败怎么办？

检查以下几点：

1. 账户余额是否充足
2. 地域配额是否足够
3. VPC/子网配置是否正确

### Q: 节点一直处于 NotReady 状态？

可能原因：

1. 安全组未放行必要端口
2. 节点初始化脚本执行失败
3. 容器运行时启动异常

## 下一步

[:octicons-arrow-right-24: kubectl 基础](kubectl-basics.md)
