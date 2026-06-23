---
title: "TKE · tccli 操作参考"
description: "TKE (容器服务) tccli 操作契约：JSON bridge、waiter 模式、参数骨架与常用命令模式。"
---

> P0 done · 对照 [TKE 官方文档](https://cloud.tencent.com/document/product/457) · tccli ≥ 3.1.107.1

TKE (Tencent Kubernetes Engine) 任务页使用以下 tccli 契约。环境准备见 [CLI 操作指南概览](../)。

## Read actions (Describe*)

使用单行命令加 `--output json`，可选 `--filter` (JMESPath)：

```bash
tccli tke DescribeClusters --region ap-guangzhou --output json
# 可选 JMESPath 过滤:
# tccli tke DescribeClusters --region ap-guangzhou --output json --filter 'TotalCount'
```

## 复杂写操作：JSON bridge + waiter

异步创建/更新操作（如 `CreateCluster`）使用 **JSON bridge** 模式：

1. 通过 `--cli-input-json file://examples/...` 传入精选最小模板
2. 使用 `--waiter` 在后续 Describe* 调用中轮询至目标状态

```bash
tccli tke CreateCluster --cli-input-json file://examples/CreateCluster.min.json --region ap-guangzhou --output json
tccli tke DescribeClusters --ClusterIds '["<cluster-id>"]' --region ap-guangzhou --output json --waiter "{'expr':'Clusters[0].ClusterStatus','to':'Running'}"
```

## 查看完整参数骨架

```bash
tccli tke CreateCluster --generate-cli-skeleton --output json > /tmp/CreateCluster.skeleton.json
```

任务页上优先使用 `examples/*.min.json`；从骨架中只取需要的字段。

## 集群配置

### 集群管理

- [创建集群](./cluster-config/cluster-management/create/)
- [删除集群](./cluster-config/cluster-management/delete/)
- [升级集群](./cluster-config/cluster-management/upgrade/)
- [集群扩缩容](./cluster-config/cluster-management/scale/)
- [连接集群](./cluster-config/cluster-management/connect/)
- [集群生命周期](./cluster-config/cluster-management/lifecycle/)
- [集群管理模式说明](./cluster-config/cluster-management/management-modes/)
- [更改集群操作系统](./cluster-config/cluster-management/change-os/)
- [自定义控制面组件参数](./cluster-config/cluster-management/custom-control-plane/)
