---
title: "基础操作"
---

# 基础操作

本模块介绍 TKE（腾讯云容器服务）的核心操作，从集群创建到应用部署的完整实践流程。

## 学习目标

通过本模块的学习，你将掌握：

- [x] 创建和管理 TKE 集群
- [x] 配置和管理普通节点、标准节点池、原生节点和超级节点
- [x] 连接集群并使用 kubectl 操作 Kubernetes 对象
- [x] 查看集群和资源的监控信息

## 模块结构

本模块按照 TKE 操作的层次结构组织，从底层基础设施到上层应用服务：

### 🏗️ 集群管理
管理 TKE 集群的生命周期，包括创建、查询、删除等核心操作。

| 章节 | 内容 | 时间 |
|------|------|------|
| [创建集群](cluster/01-create-cluster.md) | 创建托管/独立集群 | 30 分钟 |
| [删除集群](cluster/02-delete-cluster.md) | 安全删除集群 | 15 分钟 |
| [查询集群](cluster/04-describe-clusters.md) | 获取集群详细信息 | 15 分钟 |

### 🖥️ 普通节点管理
管理集群中的单个 CVM 工作节点，适用于存量 CVM 加入、少量节点调整和节点维护。

| 章节 | 内容 | 时间 |
|------|------|------|
| [添加节点](node/01-add-node.md) | 向集群添加节点 | 25 分钟 |
| [删除节点](node/02-delete-node.md) | 从集群移除节点 | 20 分钟 |
| [维护节点](node/03-maintain-node.md) | cordon、drain、uncordon 和排障 | 20 分钟 |
| [查询节点](node/04-describe-nodes.md) | 获取节点详细信息 | 15 分钟 |

### 📦 标准节点池管理
使用标准节点池统一管理一组普通 CVM 节点，支持自动伸缩、统一标签、污点和批量操作。

| 章节 | 内容 | 时间 |
|------|------|------|
| [创建节点池](node-pool/01-create-node-pool.md) | 创建节点池配置 | 30 分钟 |
| [扩缩节点池](node-pool/02-scale-node-pool.md) | 调整节点池规模 | 20 分钟 |
| [查询节点池](node-pool/03-describe-node-pool.md) | 查询节点池列表和详情 | 15 分钟 |
| [删除节点池](node-pool/04-delete-node-pool.md) | 安全删除节点池 | 20 分钟 |

### 🧩 原生节点管理
使用 TKE 原生节点能力，以 `MachineSet` / `Machine` 声明式管理节点，适合高利用率和精细化运维场景。

| 章节 | 内容 | 时间 |
|------|------|------|
| [创建原生节点池](native-node/01-create-native-node-pool.md) | 使用 MachineSet 创建原生节点池 | 30 分钟 |
| [扩缩原生节点池](native-node/02-scale-native-node-pool.md) | 调整原生节点池副本和伸缩范围 | 20 分钟 |
| [管理原生节点](native-node/03-manage-native-node.md) | 查询、维护和删除 Machine | 20 分钟 |

### ⚡ 超级节点管理
使用超级节点池承载 Serverless 容器工作负载，适合秒级弹性、按需资源和免节点运维场景。

| 章节 | 内容 | 时间 |
|------|------|------|
| [创建超级节点池](supernode/01-create-supernode-pool.md) | 创建虚拟节点池 | 25 分钟 |
| [创建按量超级节点](supernode/02-create-supernode.md) | 添加按量虚拟节点 | 20 分钟 |
| [删除超级节点](supernode/03-delete-supernode.md) | 清理虚拟节点资源 | 15 分钟 |

### 🚀 Kubernetes 对象操作
连接 TKE 集群，并使用 `kubectl` 管理 Deployment、Service、ConfigMap、Secret、Ingress、Job 等 Kubernetes 对象。

| 章节 | 内容 | 时间 |
|------|------|------|
| [连接集群](kubernetes/01-connect-cluster.md) | 获取 kubeconfig 并验证 kubectl 访问 | 20 分钟 |
| [常用 kubectl 命令操作](kubernetes/02-kubectl-common-operations.md) | 查看、部署、更新、删除和排障 Kubernetes 对象 | 35 分钟 |

## 学习路径

### 🎯 快速入门路径（新手推荐）

适合首次接触 TKE 的用户，按以下顺序完成基础操作：

1. **创建集群** → 2. **创建标准节点池** → 3. **连接集群** → 4. **使用 kubectl 部署对象**

完成时间：约 **2 小时**

### 🏃 进阶实践路径

适合有 Kubernetes 基础的用户，深入了解 TKE 特性：

1. **查询集群详情** → 2. **手动添加节点** → 3. **节点维护** → 4. **节点池扩缩容** → 5. **kubectl 排障** → 6. **清理资源**

完成时间：约 **1.5 小时**

### 🧠 节点能力选型路径

适合需要理解 TKE 节点产品形态的用户：

1. **普通节点管理** → 2. **标准节点池管理** → 3. **原生节点管理** → 4. **超级节点管理**

完成后你将能判断不同工作负载应该使用普通节点池、原生节点还是超级节点。

## 前置准备

开始学习前，请确保已准备：

!!! note "必需条件"
    - 已开通腾讯云账号并完成实名认证
    - 已创建腾讯云 API 密钥（SecretId 和 SecretKey）
    - 账号具有 TKE 服务的操作权限（QcloudTKEFullAccess）
    - 已创建 VPC 网络和子网

!!! tip "推荐工具"
    - **tccli**: 腾讯云命令行工具（用于 API 调用）
    - **kubectl**: Kubernetes 命令行工具（用于集群操作）
    - **curl/Postman**: HTTP 客户端（用于测试 API）

### 工具安装

=== "安装 tccli"

    ```bash
    # 使用 pip 安装
    pip install tccli

    # 配置密钥
    tccli configure
    ```

=== "安装 kubectl"

    ```bash
    # macOS
    brew install kubectl

    # Linux
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    chmod +x kubectl
    sudo mv kubectl /usr/local/bin/

    # Windows
    # 从 https://kubernetes.io/docs/tasks/tools/ 下载
    ```

## 文档特色

本模块的每篇文档都包含：

- ✅ **云资源 API 示例**：集群、节点和节点池使用 tccli/API 示例
- ✅ **Kubernetes 对象操作**：使用 kubectl 管理集群内对象
- ✅ **验证步骤**：确认操作成功的检查方法
- ✅ **常见问题排查**：典型错误和解决方案
- ✅ **测试报告**：功能测试验证结果

## 注意事项

!!! warning "重要提示"
    - 创建集群和节点会产生费用，请关注资源成本
    - 删除集群前请备份重要数据
    - 生产环境建议使用标准节点池、原生节点池或超级节点池，而非长期手动管理单个节点
    - 所有操作都需要相应的 API 权限

!!! tip "最佳实践"
    - 为不同环境（开发/测试/生产）创建独立集群
    - 使用节点池标签实现节点分组管理
    - 明确区分 Kubernetes 节点标签和腾讯云资源标签
    - 为生产应用配置健康检查和资源限制
    - 定期检查集群和节点的监控指标

## 开始学习

准备好了吗？从创建第一个 TKE 集群开始你的云原生之旅！

[:octicons-arrow-right-24: 创建 TKE 集群](cluster/01-create-cluster.md){ .md-button .md-button--primary }

---

## 相关资源

- [TKE 官方文档](https://cloud.tencent.com/document/product/457)
- [TKE API 文档](https://cloud.tencent.com/document/api/457/31853)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [kubectl 命令参考](https://kubernetes.io/docs/reference/kubectl/)
