# 环境准备

本章节帮助您准备 TKE Workshop 所需的环境。

## 1. 腾讯云账号

### 1.1 注册账号

如果您还没有腾讯云账号，请先 [注册账号](https://cloud.tencent.com/register)。

### 1.2 开通 TKE 服务

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 搜索「容器服务」或访问 [TKE 控制台](https://console.cloud.tencent.com/tke2)
3. 按提示完成服务开通

!!! tip "提示"
    首次使用 TKE 需要授权相关云资源访问权限。

## 2. 本地环境

### 2.1 安装 kubectl

=== "macOS"

    ```bash
    # 使用 Homebrew 安装
    brew install kubectl
    
    # 验证安装
    kubectl version --client
    ```

=== "Linux"

    ```bash
    # 下载最新版本
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    
    # 安装
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
    
    # 验证安装
    kubectl version --client
    ```

=== "Windows"

    ```powershell
    # 使用 Chocolatey 安装
    choco install kubernetes-cli
    
    # 或使用 Scoop 安装
    scoop install kubectl
    
    # 验证安装
    kubectl version --client
    ```

### 2.2 配置 kubeconfig

创建集群后，您需要配置 kubeconfig 以连接集群：

```bash
# 从 TKE 控制台下载 kubeconfig 文件
# 放置到 ~/.kube/config

# 验证连接
kubectl cluster-info
```

## 3. 验证环境

运行以下命令验证环境配置：

```bash
# 检查 kubectl 版本
kubectl version --client

# 检查集群连接（创建集群后）
kubectl get nodes
```

!!! success "环境准备完成"
    如果以上命令都能正常执行，说明您的环境已准备就绪。

## 下一步

[:octicons-arrow-right-24: 创建集群](create-cluster.md)
