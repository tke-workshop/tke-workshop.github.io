---
title: 环境准备
description: 准备本地工具、腾讯云凭据和 Cookbook 运行配置。
---

# 环境准备

开始 Workshop 前，建议准备以下环境。

## 本地工具

| 工具 | 用途 |
| --- | --- |
| Node.js 20+ | 构建和预览新版 Astro 站点 |
| Python 3.11+ | 运行 Cookbook Python 脚本 |
| kubectl | 管理 Kubernetes 集群资源 |
| tccli | 调用腾讯云 API 和验证 TKE 资源 |
| Git | 获取源码和提交改动 |

## Cookbook 配置

复制配置模板：

```bash
cd cookbook
cp config.example.yaml config.yaml
```

填写腾讯云 API 凭据和默认地域：

```yaml
tencent_cloud:
  secret_id: "YOUR_SECRET_ID_HERE"
  secret_key: "YOUR_SECRET_KEY_HERE"
  region: "ap-guangzhou"
```

不要提交 `cookbook/config.yaml`，它包含敏感凭据。

## 验证站点构建

新版站点使用 Astro：

```bash
npm install
npm run build
```

## 验证 Cookbook 语法

```bash
python3 -m py_compile cookbook/cluster/create_cluster.py
python3 -m py_compile cookbook/workload/deploy_nginx.py
python3 -m py_compile cookbook/supernode/deploy_gpu_pod.py
```
