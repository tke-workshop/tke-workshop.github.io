---
title: "访问网络控制概述（tccli）"
description: "· page_id `41836`"
---

> 对照官方：[访问控制](https://cloud.tencent.com/document/product/1141/41836) · page_id `41836`

## 概述

腾讯云容器镜像服务（TCR）企业版提供多层级的访问网络控制能力，从网络入口层面保障实例及容器镜像的数据安全。

**默认安全姿态**：新创建的 TCR 企业版实例**默认不开启公网访问入口**，也无法从私有网络（VPC）直接内网访问。这是一种默认拒绝（deny-by-default）的安全设计——需由管理员主动、按需配置公网或内网访问控制策略，遵循最小范围放通原则，仅允许必要的业务客户端访问实例。

访问网络控制分为两大模块：

| 模块 | 控制粒度 | 适用场景 | CLI 核心命令 |
|------|---------|---------|-------------|
| **公网访问控制** | IP/CIDR 白名单策略 | 本地开发测试、非腾讯云环境、跨地域公网访问 | `ManageExternalEndpoint` / `CreateSecurityPolicy` |
| **内网访问控制** | VPC + 子网 + 私有域解析 PrivateDNS | 同地域 VPC 内云服务器访问，免公网带宽成本、拉取速度更快 | `ManageInternalEndpoint` / `CreateInternalEndpointDns` |

两种访问模式可独立配置、并行使用——同一实例可同时开放公网访问（配合白名单限制来源 IP）和内网访问（接入 VPC），客户端根据自身网络环境选择合适的接入方式。

---

### 公网访问控制

公网访问控制由两层构成：

1. **公网访问入口**（开关）：控制实例是否对公网暴露。调用 `ManageExternalEndpoint` 开启/关闭，操作为异步，须通过 `DescribeExternalEndpointStatus` 轮询确认终态（`Opened` / `Closed`）。处于过渡状态 `Opening` 时不可执行关闭操作。

2. **白名单策略**（精细化控制）：入口开启后，通过安全策略决定**哪些来源 IP 或 IP 段**可以访问实例。白名单策略由 `CreateSecurityPolicy` 创建，每条策略包含 `CidrBlock`（来源 IP 或 CIDR 地址段）和 `Description`（备注）。策略创建、修改、删除均要求公网入口状态为 `Opened`；入口关闭时调用策略查询/操作将返回错误。

**典型工作流**：

```
CreateInstance（默认入口关闭）
  → ManageExternalEndpoint Open（开启入口，异步）
  → 轮询 DescribeExternalEndpointStatus 至 Opened
  → CreateSecurityPolicy（添加白名单，放通来源 IP）
  → docker login <PublicDomain>（从白名单内 IP 发起访问）
```

---

### 内网访问控制

内网访问控制通过在 VPC 内建立专用访问链路实现：

1. **内网访问链路**：调用 `ManageInternalEndpoint` 在指定 VPC 和子网中创建/删除内网访问链路，返回该链路的私有 IP 地址（`AccessIp`）。

2. **内网域名解析**：内网链路建立后，可选开启自动内网解析（`CreateInternalEndpointDns`），利用[私有域解析 PrivateDNS](https://console.cloud.tencent.com/privatedns) 将实例域名在 VPC 内解析为内网 IP。开启后，VPC 内云服务器访问 `<RegistryName>.tencentcloudcr.com` 将自动解析到内网链路 IP，无需修改 hosts 文件或额外配置 DNS。

**内网访问特点**：
- 依赖跨产品资源：需预先准备 `VpcId` 和 `SubnetId`
- 仅同地域 VPC 生效（内网访问链路基于地域内网络）
- 免公网带宽成本，镜像拉取速度显著优于公网访问
- 配合 [TKE 集群使用 TCR 插件内网免密拉取](../../../../practices/tke-plugin-pull) 实现 Kubernetes 集群内网免密镜像拉取

## 前置条件

- [环境准备](../../index.md)：`tccli` 版本 >= 3.1.x，地域与凭据已配置
- 已成功 [购买企业版实例](../../../create)（`--RegistryType basic`/`standard`/`premium`），实例状态为 `Running`
- **公网访问控制**：无需额外前提
- **内网访问控制**：需预先准备 VPC 和子网资源（`VpcId`、`SubnetId`），以及开启 [私有域解析 PrivateDNS](https://console.cloud.tencent.com/privatedns) 服务
- 如使用子账号操作，需为其授予对应实例的 `QcloudTCRFullAccess` 或相应的资源级权限

## 控制台与 CLI 参数映射

本文为概念概述页。以下列出公网和内网访问控制的 tccli 命令入口，具体参数和操作步骤见对应子页面。

### 公网访问控制 — CLI 命令入口

| 控制台操作 | CLI 命令 | 页面 |
|-----------|----------|------|
| 开启/关闭公网访问入口 | `ManageExternalEndpoint` | [配置公网访问控制](../public-access) |
| 查看公网访问入口状态 | `DescribeExternalEndpointStatus` | 同上 |
| 添加单条白名单策略 | `CreateSecurityPolicy` | 同上 |
| 批量添加白名单策略 | `CreateMultipleSecurityPolicy` | 同上 |
| 查看白名单策略列表 | `DescribeSecurityPolicies` | 同上 |
| 修改白名单策略 | `ModifySecurityPolicy` | 同上 |
| 删除白名单策略 | `DeleteSecurityPolicy` | 同上 |

### 内网访问控制 — CLI 命令入口

| 控制台操作 | CLI 命令 | 页面 |
|-----------|----------|------|
| 新建/删除内网访问链路 | `ManageInternalEndpoint` | [配置内网访问控制](../private-access) |
| 查看内网访问链路列表 | `DescribeInternalEndpoints` | 同上 |
| 查看 DNS 解析状态 | `DescribeInternalEndpointDnsStatus` | 同上 |
| 开启自动内网解析 | `CreateInternalEndpointDns` | 同上 |
| 关闭自动内网解析 | `DeleteInternalEndpointDns` | 同上 |

### 关键 API 行为约束

| CLI 命令 | 关键行为 | 易错点 |
|----------|---------|--------|
| `ManageExternalEndpoint` | 异步操作，`Open` → 轮询至 `Opened` 后方可创建安全策略 / `Close` → 轮询至 `Closed` 后方可再次 `Open` | `Open` 后立即 `Close` 将失败（状态尚在 `Opening` 过渡中） |
| `CreateSecurityPolicy` | 要求公网入口状态为 `Opened`；否则返回 `OperationDenied` | 入口未开启时无法创建策略 |
| `DescribeSecurityPolicies` | 公网入口未开启时调用返回 `ResourceNotFound` | 入口关闭时无法查询已有策略 |
| `ManageInternalEndpoint` | 依赖跨产品 VPC/Subnet 资源 | 需预先从 [VPC 控制台](https://console.cloud.tencent.com/vpc) 获取 `VpcId` 和 `SubnetId` |
| `CreateInternalEndpointDns` | 要求内网访问链路已建立且 `AccessIp` 不为空；依赖私有域解析 PrivateDNS 服务 | 需预先开通 PrivateDNS 服务 |

## 操作步骤

本文为概念概述页，无可独立执行的 tccli 命令操作。具体操作步骤请进入以下子页面：

- [配置公网访问控制](../public-access) — 开启/关闭公网入口、管理白名单策略（page_id `41837`）
- [配置内网访问控制](../private-access) — 接入私有网络、管理内网私有域解析（page_id `41838`）

## 验证

### 概念关系验证（交叉引用）

| 验证关系 | 验证方式 | 期望结论 |
|----------|---------|---------|
| 默认入口关闭 → 拒绝公网访问 | 新创建实例后，从公网环境执行 `docker login <PublicDomain>` | 连接超时或拒绝连接 |
| 公网入口开启后白名单策略空 → 拒绝全部 | `ManageExternalEndpoint Open` 后等至 `Opened`，从任意公网 IP 执行 `docker login` | 被安全策略拦截（白名单为空时默认拒绝全部来源） |
| 公网入口开启 + 白名单放通 → 允许访问 | 添加白名单包含当前公网 IP，执行 `docker login` | 登录成功 |
| 内网链路 + 私有域解析 → VPC 内自动解析 | VPC 内云服务器 `ping <RegistryName>.tencentcloudcr.com` | 解析到内网 `AccessIp`（非公网 IP） |
| 公网入口 `Open` 后立即 `Close` → 被拒绝 | `ManageExternalEndpoint Open` 后不等待立即 `Close` | 返回错误：`current public network access status is Opening` |

## 清理

不适用。本文为概念概述页，不涉及资源创建与清理。

## 排障

| 现象 | 诊断命令/步骤 | 根因 | 修复 |
|------|-------------|------|------|
| 实例创建后无法 `docker push`/`docker pull` | `tccli tcr DescribeExternalEndpointStatus --RegistryId <Id> --region <Region>` | 默认公网入口关闭 | 先开启公网入口（`ManageExternalEndpoint Open`），或配置内网访问链路 |
| 公网入口已 `Opened`，但仍无法访问 | `tccli tcr DescribeSecurityPolicies --RegistryId <Id> --region <Region>` | 白名单为空时默认拒绝全部来源 | 添加包含当前 IP 的白名单策略 |
| `ManageExternalEndpoint Close` 失败，报 `current public network access status is Opening` | `tccli tcr DescribeExternalEndpointStatus --RegistryId <Id> --region <Region>` | `Open` 后立即 `Close`，状态尚在 `Opening` 过渡中 | 等待 `DescribeExternalEndpointStatus` 返回 `Opened` 后，再执行 `Close` |
| `DescribeSecurityPolicies` 返回 `ResourceNotFound` | `tccli tcr DescribeExternalEndpointStatus --RegistryId <Id> --region <Region>` | 公网入口未开启时无法查询策略列表 | 先开启公网入口 |
| VPC 内云服务器无法通过内网访问实例 | `tccli tcr DescribeInternalEndpoints --RegistryId <Id> --region <Region>` | 未创建内网访问链路 | 调用 `ManageInternalEndpoint` 新建链路，传入正确的 `VpcId` 和 `SubnetId` |
| 内网链路已建立，但域名未自动解析到内网 IP | `tccli tcr DescribeInternalEndpointDnsStatus --RegistryId <Id> --VpcSet <VpcInfo>` | 未开启自动内网解析 | 调用 `CreateInternalEndpointDns` 开启自动解析 |
| 不知道用公网还是内网 | — | — | **公网**：本地开发测试、非腾讯云环境、跨地域访问。**内网**：同地域 VPC 内云服务器，免公网带宽成本、拉取更快 |
| `ManageInternalEndpoint` 创建失败 | 确认 VPC 和子网 ID 正确，且子网可用 IP 数充足 | VPC/子网不存在或 IP 资源不足 | 在 [VPC 控制台](https://console.cloud.tencent.com/vpc) 确认资源状态，选择可用 IP 充足的子网 |

## 下一步

- [配置公网访问控制](../public-access)（page_id `41837`）— 开启/关闭公网入口、管理白名单策略
- [配置内网访问控制](../private-access)（page_id `41838`）— 接入私有网络、管理内网私有域解析
- [访问权限管理概述](../../permissions/permission-overview)（page_id `40718`）— 理解用户级/服务级账号权限管理
- [TKE 集群使用 TCR 插件内网免密拉取容器镜像](../../../../practices/tke-plugin-pull) — 实战：K8s 集群内网免密拉取

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 选择目标企业版实例 → 进入 **访问控制** 页面：
- **公网访问** 标签页：开启/关闭公网访问入口，管理白名单策略（添加/编辑/删除 IP 或 CIDR 地址段）
- **内网访问** 标签页：管理内网访问链路（新建/删除 VPC 接入），开启/关闭自动内网解析
