# 快速开始

## 📚 概述

本文档将带你在 10 分钟内完成 KitOps 的完整工作流：从打包模型到推送 TCR，再到在 TKE 中解包部署。

## 🎯 学习目标

- [x] 安装和配置 Kit CLI
- [x] 创建第一个 ModelKit
- [x] 推送到 TCR 容器镜像仓库
- [x] 在 TKE 中拉取和解包

## 📋 前置条件

| 条件 | 说明 |
|------|------|
| 腾讯云账号 | 用于访问 TCR 和 TKE |
| TCR 实例 | 企业版或个人版均可 |
| TKE 集群 | Kubernetes 1.20+ |
| kubectl | 已配置并可访问集群 |

## 🛠️ 安装 Kit CLI

### macOS

```bash
# 使用 Homebrew
brew install kitops-ml/kitops/kit

# 验证安装
kit version
```

### Linux

```bash
# 一键安装脚本
curl -fsSL https://get.kitops.org | sh

# 或手动下载
VERSION=1.11.0
curl -LO https://github.com/kitops-ml/kitops/releases/download/v${VERSION}/kit-linux-amd64.tar.gz
tar -xzf kit-linux-amd64.tar.gz
sudo mv kit /usr/local/bin/

# 验证安装
kit version
```

### Windows

```powershell
# 使用 Scoop
scoop bucket add kitops https://github.com/kitops-ml/scoop-kitops.git
scoop install kit

# 验证安装
kit version
```

## 📦 创建示例项目

### 1. 初始化项目结构

```bash
# 创建项目目录
mkdir kitops-demo && cd kitops-demo

# 创建标准目录结构
mkdir -p models data notebooks config

# 创建示例模型文件（实际场景替换为真实模型）
echo '{"model_type": "bert", "version": "1.0"}' > models/config.json
dd if=/dev/urandom of=models/model.bin bs=1M count=10 2>/dev/null

# 创建示例数据集
cat > data/train.csv << 'EOF'
text,label
"这个产品非常好用",1
"服务态度很差",0
"性价比很高，推荐购买",1
"不值得购买",0
EOF

# 创建示例代码
cat > notebooks/inference.py << 'EOF'
#!/usr/bin/env python3
"""模型推理脚本"""

import json

def load_model(model_path):
    """加载模型配置"""
    with open(f"{model_path}/config.json") as f:
        return json.load(f)

def predict(text, model):
    """执行推理（示例）"""
    # 实际场景替换为真实推理逻辑
    return {"text": text, "sentiment": "positive", "confidence": 0.95}

if __name__ == "__main__":
    model = load_model("../models")
    result = predict("这个产品非常好用", model)
    print(f"推理结果: {result}")
EOF
```

### 2. 编写 Kitfile

```bash
cat > Kitfile << 'EOF'
manifestVersion: v1.0.0

package:
  name: sentiment-classifier
  version: 1.0.0
  description: 中文情感分类模型 - 用于评论情感分析
  authors:
    - TKE Workshop Team
  license: Apache-2.0

model:
  name: bert-sentiment
  path: ./models
  framework: PyTorch
  description: 基于 BERT 的情感分类模型
  version: 1.0.0

datasets:
  - name: training-data
    path: ./data/train.csv
    description: 情感分类训练数据

code:
  - path: ./notebooks
    description: 推理代码
EOF
```

### 3. 查看项目结构

```bash
tree .
# 输出:
# .
# ├── Kitfile
# ├── config/
# ├── data/
# │   └── train.csv
# ├── models/
# │   ├── config.json
# │   └── model.bin
# └── notebooks/
#     └── inference.py
```

## 📤 打包和推送到 TCR

### 1. 打包为 ModelKit

```bash
# 打包并标记
# 格式: kit pack <目录> -t <仓库地址>:<标签>
kit pack . -t ccr.ccs.tencentyun.com/<命名空间>/sentiment-model:v1.0.0

# 输出示例:
# Packing from context: .
# Model: bert-sentiment
# Datasets: training-data
# Code: ./notebooks
# Created ModelKit: ccr.ccs.tencentyun.com/<命名空间>/sentiment-model:v1.0.0
```

### 2. 查看本地 ModelKit

```bash
# 列出本地所有 ModelKit
kit list

# 输出示例:
# REPOSITORY                                          TAG       DIGEST         SIZE
# ccr.ccs.tencentyun.com/<命名空间>/sentiment-model   v1.0.0    sha256:abc123  10.5 MB

# 查看 ModelKit 详情
kit inspect ccr.ccs.tencentyun.com/<命名空间>/sentiment-model:v1.0.0
```

### 3. 登录 TCR

```bash
# 获取 TCR 访问凭证（腾讯云控制台 -> 容器镜像服务 -> 访问管理）
# 方式 1: 使用用户名密码
kit login ccr.ccs.tencentyun.com -u <用户名> -p <密码>

# 方式 2: 使用临时凭证（推荐）
kit login ccr.ccs.tencentyun.com -u <临时用户名> -p <临时密码>

# 输出: Login Succeeded
```

!!! tip "TCR 凭证获取"
    1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/tcr)
    2. 进入容器镜像服务 -> 访问管理
    3. 生成长期凭证或临时凭证

### 4. 推送到 TCR

```bash
# 推送 ModelKit
kit push ccr.ccs.tencentyun.com/<命名空间>/sentiment-model:v1.0.0

# 输出示例:
# Pushing to ccr.ccs.tencentyun.com/<命名空间>/sentiment-model:v1.0.0
# Layer sha256:abc123: Pushed
# Layer sha256:def456: Pushed
# v1.0.0: digest: sha256:789xyz size: 10.5 MB
# Push complete!
```

## 📥 在 TKE 中拉取和解包

### 方式 1: 在 TKE 节点上直接操作

```bash
# SSH 到 TKE 节点
ssh root@<节点IP>

# 安装 Kit CLI（如果未安装）
curl -fsSL https://get.kitops.org | sh

# 登录 TCR（使用内网地址，更快）
kit login <实例名>.tencentcloudcr.com -u <用户名> -p <密码>

# 拉取 ModelKit
kit pull <实例名>.tencentcloudcr.com/<命名空间>/sentiment-model:v1.0.0

# 解包到指定目录
kit unpack <实例名>.tencentcloudcr.com/<命名空间>/sentiment-model:v1.0.0 \
  -d /opt/models/sentiment

# 验证
ls -la /opt/models/sentiment
```

### 方式 2: 使用 Init Container（推荐）

创建一个带有 Kit CLI 的 Init Container，自动拉取和解包 ModelKit：

```yaml
# kitops-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sentiment-inference
  namespace: ai-workloads
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sentiment-inference
  template:
    metadata:
      labels:
        app: sentiment-inference
    spec:
      # Init Container: 使用 KitOps 解包模型
      initContainers:
        - name: model-loader
          image: ghcr.io/kitops-ml/kit:latest
          command:
            - /bin/sh
            - -c
            - |
              kit login ${TCR_REGISTRY} -u ${TCR_USERNAME} -p ${TCR_PASSWORD}
              kit pull ${MODEL_IMAGE}
              kit unpack ${MODEL_IMAGE} -d /model-data
          env:
            - name: TCR_REGISTRY
              value: "<实例名>.tencentcloudcr.com"
            - name: TCR_USERNAME
              valueFrom:
                secretKeyRef:
                  name: tcr-credentials
                  key: username
            - name: TCR_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: tcr-credentials
                  key: password
            - name: MODEL_IMAGE
              value: "<实例名>.tencentcloudcr.com/<命名空间>/sentiment-model:v1.0.0"
          volumeMounts:
            - name: model-volume
              mountPath: /model-data
      
      # 主容器: 运行推理服务
      containers:
        - name: inference
          image: python:3.10-slim
          command:
            - python
            - /model-data/notebooks/inference.py
          volumeMounts:
            - name: model-volume
              mountPath: /model-data
          ports:
            - containerPort: 8080
      
      volumes:
        - name: model-volume
          emptyDir: {}
---
# TCR 凭证 Secret
apiVersion: v1
kind: Secret
metadata:
  name: tcr-credentials
  namespace: ai-workloads
type: Opaque
stringData:
  username: "<TCR用户名>"
  password: "<TCR密码>"
```

部署到 TKE：

```bash
# 创建命名空间
kubectl create namespace ai-workloads

# 应用配置
kubectl apply -f kitops-deployment.yaml

# 检查状态
kubectl get pods -n ai-workloads -w

# 查看日志
kubectl logs -n ai-workloads -l app=sentiment-inference -c model-loader
```

## ✅ 验证部署

```bash
# 检查 Pod 状态
kubectl get pods -n ai-workloads

# 输出示例:
# NAME                                  READY   STATUS    RESTARTS   AGE
# sentiment-inference-7b8f9c6d4-x2k9m   1/1     Running   0          2m

# 进入 Pod 验证模型文件
kubectl exec -it -n ai-workloads deployment/sentiment-inference -- ls -la /model-data

# 输出示例:
# total 10568
# drwxr-xr-x 5 root root     4096 Mar  6 10:00 .
# -rw-r--r-- 1 root root      423 Mar  6 10:00 Kitfile
# drwxr-xr-x 2 root root     4096 Mar  6 10:00 data
# drwxr-xr-x 2 root root     4096 Mar  6 10:00 models
# drwxr-xr-x 2 root root     4096 Mar  6 10:00 notebooks
```

## 🎉 恭喜完成！

你已经完成了 KitOps on TKE 的快速入门：

1. ✅ 安装了 Kit CLI
2. ✅ 创建了第一个 ModelKit
3. ✅ 推送到了 TCR 镜像仓库
4. ✅ 在 TKE 中成功解包和部署

## 下一步

[:octicons-arrow-right-24: 学习 Kitfile 编写](kitfile-guide.md)

[:octicons-arrow-right-24: 配置 CI/CD 自动化](cicd-integration.md)

[:octicons-arrow-right-24: 查看最佳实践](best-practices.md)
