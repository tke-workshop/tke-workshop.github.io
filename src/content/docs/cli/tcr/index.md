---
title: "TCR · tccli 操作参考"
description: "TCR (容器镜像服务) tccli 操作契约：JSON bridge、waiter 模式、参数骨架与常用命令模式。"
---

> P0 done · 对照 [TCR 官方文档](https://cloud.tencent.com/document/product/1141) · tccli ≥ 3.1.107.1 · API 2019-09-24

TCR (Tencent Container Registry) 任务页使用以下 tccli 契约。环境准备见 [CLI 操作指南概览](../)。

## Read actions (Describe* / Get*)

使用单行命令加 `--output json`：

```bash
tccli tcr DescribeInstances --region ap-guangzhou --output json
```

命名空间和仓库查询：

```bash
tccli tcr DescribeNamespaces --RegistryId <RegistryId> --region ap-guangzhou --output json
tccli tcr DescribeRepositories --RegistryId <RegistryId> --NamespaceName <NamespaceName> --region ap-guangzhou --output json
```

## 复杂写操作：JSON bridge

创建/修改操作（如 `CreateInstance`）使用 **JSON bridge** 模式：

1. 通过 `--cli-input-json file://examples/...` 传入精选最小模板
2. 使用 `DescribeInstances` 或 `DescribeInstanceStatus` 轮询至目标状态

```bash
tccli tcr CreateInstance --cli-input-json file://examples/CreateTcrInstance.min.json --region ap-guangzhou --output json
```

## 个人版操作

TCR 个人版使用独立的 `Personal` 后缀 Action，无需 `RegistryId`：

```bash
tccli tcr CreateNamespacePersonal --Namespace <namespace-name> --region ap-guangzhou --output json
tccli tcr CreateRepositoryPersonal --RepoName "<namespace>/<repo>" --region ap-guangzhou --output json
```

## 查看完整参数骨架

```bash
tccli tcr CreateInstance --generate-cli-skeleton --output json > /tmp/CreateInstance.skeleton.json
```

任务页上优先使用 `examples/*.min.json`；从骨架中只取需要的字段。

## 已覆盖的接口

| 分类 | 接口数 | 状态 |
|------|:---:|:---:|
| TKE 接口 | 271 | P0 done |
| TCR 接口 | 115 | P0 done |
| **合计** | **386** | **100%** |

## 快速导航

### 快速入门
- [企业版快速入门](./quickstart/enterprise/)
- [个人版快速入门](./quickstart/personal/)

### 操作指南
- **实例**: [创建企业版实例](./ops/instances/create/) · [销毁退还实例](./ops/instances/delete/)
- **访问配置**: [用户级账号管理](./ops/access/credentials/user-credentials/) · [服务级账号管理](./ops/access/credentials/service-credentials/) · [公网访问控制](./ops/access/network/public-access/) · [内网访问控制](./ops/access/network/private-access/)
- **镜像创建**: [管理命名空间](./ops/image-creation/namespace/) · [管理镜像仓库](./ops/image-creation/repository/)
- **镜像分发**: [同实例多地域复制](./ops/image-distribution/cross-region-replication/) · [跨实例同步](./ops/image-distribution/cross-instance-sync/) · [按需加载](./ops/image-distribution/accelerated-image/)
- **镜像安全**: [安全扫描](./ops/image-security/vulnerability-scan/) · [版本不可变](./ops/image-security/immutable-tags/) · [部署阻断](./ops/image-security/deployment-block/) · [镜像签名](./ops/image-security/image-signing/)
- **镜像清理**: [清理 COS](./ops/image-cleanup/cos-cleanup/) · [自动删除版本](./ops/image-cleanup/auto-delete/)
- **OCI 制品**: [制品概述](./ops/oci-artifacts/overview/) · [托管 Helm Chart](./ops/oci-artifacts/helm-chart/)
- **DevOps**: [触发器 Webhook](./ops/devops/webhook/)
- **个人版**: [更新密码](./ops/personal-edition/update-password/) · [CAM API 列表](./ops/personal-edition/cam-api-list/) · [授权方案](./ops/personal-edition/auth-examples/) · [镜像清理](./ops/personal-edition/image-cleanup/)

### 实践教程
- [Harbor 迁移](./practices/harbor-migration/)
- [TKE Serverless 拉取 TCR 镜像](./practices/tke-serverless-pull/)
- [TKE 插件内网免密拉取](./practices/tke-plugin-pull/)
- [混合云多平台同步](./practices/hybrid-cloud-sync/)
- [全球多地域同步](./practices/global-replication/)
- [自定义域名 + 云联网](./practices/custom-domain-ccn/)
- [实例后端存储切换](./practices/storage-switch/)
- [个人版迁移至企业版](./practices/personal-migration/)
- [个人版域名访问企业版](./practices/personal-domain-access/)
