---
title: 基础操作路径
description: 按日常 TKE 任务组织的集群、节点、工作负载和服务操作入口。
---

# 基础操作路径

Operate 路径面向日常集群操作。每个主题后续都会迁移为 Starlight 原生页面，并关联可执行 Cookbook。

## 集群管理

- 创建 TKE 托管集群。
- 删除集群与防误删策略。
- 查询集群状态和访问凭证。

相关 Cookbook：`cookbook/cluster/create_cluster.py`

## 节点与节点池

- 添加节点。
- 删除节点。
- 创建和扩缩节点池。
- 查询节点状态。

## 工作负载

- 创建 Deployment。
- 更新 Deployment。
- 删除 Deployment。
- 部署示例 Nginx 应用。

相关 Cookbook：`cookbook/workload/deploy_nginx.py`

## 服务管理

- 创建 ClusterIP、NodePort 和 LoadBalancer Service。
- 配置外部访问。
- 验证服务连通性。

## 推荐执行顺序

1. 创建集群。
2. 获取 kubeconfig 并验证连接。
3. 部署 Nginx 工作负载。
4. 暴露 Service。
5. 清理测试资源。
