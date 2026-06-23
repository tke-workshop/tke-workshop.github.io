---
title: "OCI 制品管理概述（tccli）"
description: "· page_id `63918`"
---

> 对照官方：[OCI 制品管理概述](https://cloud.tencent.com/document/product/1141/63918) · page_id `63918`

## 概述

腾讯云容器镜像服务（TCR）企业版和个人版均遵循 [OCI（Open Container Initiative）](https://opencontainers.org/) 标准，支持托管和管理多种云原生制品类型，不仅限于 Docker 容器镜像。通过统一的 OCI 分发协议，TCR 为容器镜像、Helm Chart、CNAB 及自定义 OCI Artifacts 提供一致的推送、存储、分发和生命周期管理体验。

---

### 制品类型

TCR 支持以下 OCI 兼容制品类型：

| 制品类型 | 媒体类型（OCI `mediaType`） | 管理工具 | TCR 角色 |
|---------|--------------------------|---------|---------|
| **容器镜像** | `application/vnd.oci.image.manifest.v1+json` | `docker` / `podman` / `nerdctl` | 存储与分发（镜像仓库） |
| **Helm Chart**（OCI 模式） | `application/vnd.cncf.helm.chart.config.v1+json` | `helm` v3+ | 存储与分发（镜像仓库内托管） |
| **Helm Chart**（ChartMuseum 模式） | — | `helm` v2/v3 | 托管（企业版内置 ChartMuseum 服务） |
| **加速镜像**（按需加载） | OCI 镜像变体，`-apparate` 后缀 | `docker` / `nerdctl` | 格式转换 + 分发（`CreateImageAccelerateTask`） |
| **CNAB** 及自定义 OCI Artifacts | 自定义 `application/vnd.*` 类型 | 对应 OCI 兼容客户端 | 存储与分发（镜像仓库内托管） |

---

### 容器镜像

容器镜像是 TCR 的核心制品类型，遵循 OCI Image Spec（`v1.0+`）。所有已创建的镜像仓库默认支持容器镜像的推送和拉取。

**管理方式**：
- `docker` / `podman` / `nerdctl` 等 OCI 兼容客户端负责镜像的推送（`push`）和拉取（`pull`）
- `tccli tcr` 负责仓库维度的管理：创建/删除仓库（`CreateRepository` / `DeleteRepository`）、查询镜像列表（`DescribeImages`）、查询镜像 Manifest（`DescribeImageManifests`）、管理版本生命周期（保留策略/不可变规则）

---

### Helm Chart

TCR 提供两种 Helm Chart 托管模式，适用于不同阶段的使用需求：

#### 模式一：OCI 模式（推荐）

将 Helm Chart 作为 OCI 制品推送至镜像仓库，实现与容器镜像统一的存储和分发管理。

- **前提**：Helm v3+（v3.8.0+ 内置 OCI 支持更完善）
- **工作流**：
  ```bash
  helm registry login <RegistryName>.tencentcloudcr.com
  helm package <chart-dir>
  helm push <chart>.tgz oci://<RegistryName>.tencentcloudcr.com/<namespace>
  helm pull oci://<RegistryName>.tencentcloudcr.com/<namespace>/<chart> --version <ver>
  ```
- **优势**：与容器镜像共享仓库、权限模型和分发链路；无需额外运维 ChartMuseum 实例

#### 模式二：ChartMuseum 模式

企业版实例内置基于 [ChartMuseum](https://chartmuseum.com/) 开源项目的 Helm Chart 托管服务，提供独立的 Chart 仓库 URL 和 Web 管理界面。

- **前提**：企业版实例（basic 及以上 tier）
- **管理方式**：通过控制台或 TCR API 上传/管理 Chart，独立的 Chart 仓库地址格式 `<RegistryName>.tencentcloudcr.com/chartrepo/<repo-name>`
- **适用场景**：使用 Helm v2 的存量环境、习惯传统 Chart 仓库管理方式的团队

---

### 加速镜像（按需加载）

TCR 企业版（standard 及以上）支持将标准容器镜像转换为按需加载（lazy-pull）的加速格式镜像。加速镜像在传统 OCI 镜像基础上增加了文件系统元数据索引，使容器运行时（如 Nydus）无需等待完整的镜像拉取即可启动容器。

- **CLI 入口**：`CreateImageAccelerateTask` 创建加速转换任务
- **生成制品**：加速镜像仓库名格式为 `<原仓库名>-apparate`，自动生成
- **加速引擎**：Nydus（需容器运行时支持）
- **适用场景**：大镜像（GB 级）的秒级启动、AI/ML 训练任务、Serverless 容器
- **依赖**：实例 tier >= `standard`，需预先推送原始镜像（加速任务仅对已有镜像执行格式转换）

---

### CNAB 及自定义 OCI Artifacts

对于遵循 OCI Artifact Spec（`opencontainers/artifacts`）的自定义制品，TCR 镜像仓库可充当通用 OCI 制品注册中心：

- **CNAB**（Cloud Native Application Bundle）：多云应用打包格式
- **签名/证明文件**：如 Cosign 签名（`application/vnd.dev.cosign.simplesigning.v1+json`）、SBOM 证明
- **自定义制品**：任何遵循 OCI 分发规范的制品类型

推送自定义 OCI 制品需使用支持该制品类型的客户端工具（如 `oras` CLI），TCR 镜像仓库作为 OCI 分发端点负责存储和分发。自定义制品的 `mediaType` 与容器镜像不同，在控制台和 `DescribeImages` 返回结果中会区分显示。

---

### 企业版 vs 个人版支持范围

| 制品类型 | 企业版 | 个人版 |
|---------|-------|-------|
| 容器镜像 | 支持 | 支持 |
| Helm Chart（OCI 模式） | 支持 | 支持（镜像仓库内托管） |
| Helm Chart（ChartMuseum） | 支持 | 不支持 |
| 加速镜像（按需加载） | 支持（standard+） | 不支持 |
| CNAB / 自定义 OCI Artifacts | 支持（镜像仓库内） | 支持（镜像仓库内） |

## 前置条件

- [环境准备](../../index.md)：`tccli` 版本 >= 3.1.x，地域与凭据已配置
- 已成功 [购买企业版实例](../../create)（企业版 `basic`/`standard`/`premium`），实例状态为 `Running`
- **容器镜像**：安装 `docker`/`podman`/`nerdctl` 客户端（非 tccli 依赖）
- **Helm Chart（OCI 模式）**：安装 `helm` v3.8.0+
- **加速镜像**：实例 tier >= `standard`，容器运行时需支持 Nydus
- 如使用子账号操作，需主账号授予 `tcr:*` 相关权限

## 控制台与 CLI 参数映射

本文为概念概述页。以下列出各制品类型的 CLI 命令入口，具体参数和操作步骤见对应子页面。

| 制品类型 | 核心 tccli 命令 | 对应客户端命令 | 页面 |
|---------|---------------|--------------|------|
| 容器镜像 — 仓库管理 | `CreateRepository` / `DeleteRepository` | — | [管理镜像仓库](../../image-creation/repository) |
| 容器镜像 — 版本管理 | `DescribeImages` / `DescribeImageManifests` | `docker push`/`pull` | 同上 + [自动删除镜像版本](../../image-cleanup/auto-delete) |
| 容器镜像 — 版本不可变 | `CreateImmutableTagRules` | — | [镜像版本不可变](../../image-security/immutable-tags) |
| Helm Chart — OCI 模式 | `DescribeImages`（Chart 以 OCI 制品形式出现） | `helm push`/`pull oci://` | [托管 Helm Chart](../helm-chart) |
| Helm Chart — ChartMuseum | 企业版内置 ChartMuseum API | `helm repo add`/`push`（传统模式） | 同上 |
| 加速镜像 | `CreateImageAccelerateTask` | `docker`/`nerdctl` 配合 Nydus | [按需加载容器镜像](../../image-distribution/accelerated-image) |

## 操作步骤

本文为概念概述页，无可独立执行的 tccli 命令操作。具体操作步骤请进入以下子页面：

- [管理镜像仓库](../../image-creation/repository) — 创建、查看、删除镜像仓库（page_id `41811`）
- [托管 Helm Chart](../helm-chart) — 推送与管理 Helm Chart 制品（page_id `41944`）
- [按需加载容器镜像](../../image-distribution/accelerated-image) — 将镜像转换为 OCI 加速格式（page_id `53928`）

## 验证

### 概念关系验证（交叉引用）

| 验证关系 | 验证方式 | 期望结论 |
|----------|---------|---------|
| 镜像仓库默认托管 OCI 制品 | 创建一个镜像仓库，分别推送容器镜像和 Helm Chart（OCI 模式）至同一仓库 | 两种制品在仓库内共存，`DescribeImages` 返回的 `ImageInfoList` 中通过 `Kind`/`mediaType` 字段区分 |
| OCI Helm Chart 与容器镜像共享权限模型 | 创建服务级账号授予对命名空间 `ns-a` 的 `pull` 权限，用该账号 `helm pull oci://` 拉取 `ns-a` 下的 Chart | 拉取成功（OCI Chart 复用镜像仓库的访问控制） |
| 加速镜像与原镜像的命名关联 | 对仓库 `ns/repo` 提交加速任务，完成后查看仓库列表 | 自动生成仓库 `ns/repo-apparate`（`-apparate` 后缀） |
| 企业版 vs 个人版 Helm Chart 模式差异 | 在企业版实例使用 ChartMuseum 模式 (`chartrepo`)，在个人版尝试同样路径 | 企业版支持 ChartMuseum URL 模式，个人版仅支持 OCI 模式 |

## 清理

不适用。本文为概念概述页，不涉及资源创建与清理。

## 排障

| 现象 | 诊断命令/步骤 | 根因 | 修复 |
|------|-------------|------|------|
| `helm push oci://` 报 `unauthorized` | `helm registry login <RegistryName>.tencentcloudcr.com` 确认登录状态 | OCI 模式下 Helm Chart 的认证复用 `docker login` 凭证 | 先 `docker login` 或 `helm registry login` 到目标 Registry |
| `docker push` 成功但 `DescribeImages` 返回空/无记录 | `tccli tcr DescribeImages --RegistryId <Id> --NamespaceName <Ns> --RepositoryName <Repo> --region <Region>` | 可能 `NamespaceName` 或 `RepositoryName` 参数拼写错误，或镜像尚未索引完成 | 确认参数值与 `docker push` 的命名空间/仓库名称一致；等待几秒后重试 |
| `DescribeImageManifests` 返回 `tag latest not found` | `docker images <full-tag>` 在本地确认 tag 存在 | 镜像尚未推送到仓库，或 tag 拼写错误 | 确认已推送正确的 tag 至仓库 |
| `CreateImageAccelerateTask` 执行失败 | `tccli tcr DescribeInstances --Registryids '["<Id>"]' --region <Region>` 检查 `RegistryType` | 实例 tier 低于 `standard`（basic 不支持加速） | 升级实例 tier 至 `standard` 或更高 |
| OCI Helm Chart 推送成功，控制台"Helm Chart"页面看不到 | — | 控制台 Helm Chart 页面仅展示 ChartMuseum 模式的 Chart，OCI 模式的 Chart 在镜像仓库列表中显示 | 进入对应镜像仓库页面查看 OCI Chart 制品 |
| `DescribeImages` 中看到的制品 `Kind` 不是期望的类型 | 检查制品 `mediaType` | 自定义 OCI 制品的媒体类型决定了 `Kind` 字段的显示值 | 确认客户端工具使用了正确的 `mediaType` |

## 下一步

- [托管 Helm Chart](../helm-chart) — 推送与管理 Helm Chart 制品（OCI 模式 + ChartMuseum 模式）（page_id `41944`）
- [管理镜像仓库](../../image-creation/repository) — 创建与管理容器镜像仓库（page_id `41811`）
- [按需加载容器镜像](../../image-distribution/accelerated-image) — 将镜像转换为 OCI 加速格式（page_id `53928`）
- [容器镜像安全扫描](../../image-security/vulnerability-scan) — 扫描镜像漏洞与恶意文件
- [自动删除镜像版本](../../image-cleanup/auto-delete) — 配置版本保留策略

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 选择目标企业版实例 → 进入 **镜像仓库** 页面：
- **制品列表**：点击仓库名称进入详情，查看该仓库下的所有 OCI 制品（镜像、Chart 等），按 `mediaType` 区分类型
- **Helm Chart**（ChartMuseum 模式）：进入 **Helm Chart** 页面（独立于镜像仓库页面），上传/管理 Chart
- **加速镜像**：在镜像仓库详情中创建加速任务，或进入 **镜像加速** 页面统一管理
