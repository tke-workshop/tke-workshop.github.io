# kubectl 基础

kubectl 是 Kubernetes 的命令行工具，本章节介绍常用操作。

## 1. 基本命令

### 1.1 查看资源

```bash
# 查看所有 Pod
kubectl get pods

# 查看所有命名空间的 Pod
kubectl get pods -A

# 查看 Pod 详细信息
kubectl get pods -o wide

# 查看特定命名空间
kubectl get pods -n kube-system
```

### 1.2 描述资源

```bash
# 查看 Pod 详情
kubectl describe pod <pod-name>

# 查看节点详情
kubectl describe node <node-name>
```

### 1.3 查看日志

```bash
# 查看 Pod 日志
kubectl logs <pod-name>

# 实时查看日志
kubectl logs -f <pod-name>

# 查看多容器 Pod 的特定容器日志
kubectl logs <pod-name> -c <container-name>
```

## 2. 资源操作

### 2.1 创建资源

```bash
# 从 YAML 文件创建
kubectl apply -f deployment.yaml

# 从目录创建
kubectl apply -f ./manifests/

# 创建命名空间
kubectl create namespace workshop
```

### 2.2 更新资源

```bash
# 应用更新
kubectl apply -f deployment.yaml

# 编辑资源
kubectl edit deployment <deployment-name>

# 扩缩容
kubectl scale deployment <deployment-name> --replicas=3
```

### 2.3 删除资源

```bash
# 删除资源
kubectl delete -f deployment.yaml

# 删除特定 Pod
kubectl delete pod <pod-name>

# 强制删除
kubectl delete pod <pod-name> --force --grace-period=0
```

## 3. 调试技巧

### 3.1 进入容器

```bash
# 进入 Pod 执行命令
kubectl exec -it <pod-name> -- /bin/bash

# 多容器 Pod
kubectl exec -it <pod-name> -c <container-name> -- /bin/sh
```

### 3.2 端口转发

```bash
# 转发 Pod 端口到本地
kubectl port-forward <pod-name> 8080:80

# 转发 Service 端口
kubectl port-forward svc/<service-name> 8080:80
```

### 3.3 复制文件

```bash
# 从 Pod 复制到本地
kubectl cp <pod-name>:/path/to/file ./local-file

# 从本地复制到 Pod
kubectl cp ./local-file <pod-name>:/path/to/file
```

## 4. 实用技巧

### 4.1 设置别名

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deployments'
```

### 4.2 自动补全

=== "Bash"

    ```bash
    source <(kubectl completion bash)
    echo 'source <(kubectl completion bash)' >> ~/.bashrc
    ```

=== "Zsh"

    ```bash
    source <(kubectl completion zsh)
    echo 'source <(kubectl completion zsh)' >> ~/.zshrc
    ```

### 4.3 上下文切换

```bash
# 查看所有上下文
kubectl config get-contexts

# 切换上下文
kubectl config use-context <context-name>

# 设置默认命名空间
kubectl config set-context --current --namespace=workshop
```

## 5. 练习

尝试完成以下操作：

- [ ] 列出所有命名空间
- [ ] 查看 kube-system 命名空间中的 Pod
- [ ] 创建一个名为 `workshop` 的命名空间
- [ ] 设置 `workshop` 为默认命名空间

??? example "参考答案"

    ```bash
    # 列出所有命名空间
    kubectl get namespaces
    
    # 查看 kube-system 中的 Pod
    kubectl get pods -n kube-system
    
    # 创建命名空间
    kubectl create namespace workshop
    
    # 设置默认命名空间
    kubectl config set-context --current --namespace=workshop
    ```

## 下一步

[:octicons-arrow-right-24: 部署应用](deploy-app.md)
