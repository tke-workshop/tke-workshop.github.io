---
title: "访问权限管理概述"
description: "· page_id `40718`"
---

> 对照官方：[访问权限管理概述](https://cloud.tencent.com/document/product/1141/40718) · page_id `40718`

## 概述

TCR 企业版提供两种独立的访问权限管理模式，使实例管理员能够为研发/运维人员和内部 CI/CD 自动化系统分别分配独立的访问凭证，并精细化管理人员权限，保障镜像数据安全。

两种模式的设计出发点对应两个核心场景：

| 场景 | 需求 | 对应模式 |
|------|------|---------|
| **人员权限控制** | 多团队共用实例，不同角色（研发/运维/测试）需最小权限隔离，防止误删镜像或镜像泄露；需审计追溯 | 用户级账号（基于 CAM） |
| **系统权限控制** | CI/CD 流水线、Kubernetes 集群等自动化系统需独立于具体人员的凭证，不受人员离职/调岗影响 | 服务级账号（实例级） |

两种模式可组合使用：人员使用用户级账号完成日常 `docker login`/`docker push`/`docker pull`，CI/CD 系统使用服务级账号完成自动化部署，各自独立管理、互不干扰。

---

### 用户级账号（基于 CAM）

用户级账号**直接关联腾讯云子账号**，权限管理基于[访问管理 CAM](https://cloud.tencent.com/document/product/598)。

**工作流程**：

1. 主账号在 [CAM 控制台](https://console.cloud.tencent.com/cam) 为指定人员创建子账号
2. 通过 CAM 策略（如 `QcloudTCRFullAccess` 或自定义资源级策略）授予子账号相应权限
3. 子账号登录 TCR 控制台，进入 **访问凭证 -> 用户级账号**，创建专属长期访问凭证（`CreateInstanceToken`）
4. 使用凭证进行 `docker login` 操作，实际权限受 CAM 策略约束

**生命周期约束**：
- 凭证与子账号绑定，子账号被禁用或删除后，关联的访问凭证**立即失效**
- 因此**不应**在 CI/CD 等自动化系统中配置子账号关联的访问凭证——人员离职或子账号变更会导致自动化流程中断

**权限粒度**：CAM 支持资源级授权，可按实例（`instance`）和仓库（`repository`）两个维度授予最小权限策略。详见 [基于 CAM 管理子账号权限](../基于cam管理子账号权限)。

**CLI 视角**：用户级账号的凭证管理通过 `tccli tcr` 子命令操作（`CreateInstanceToken`、`DescribeInstanceToken`、`DeleteInstanceToken` 等），权限授权则通过 `tccli cam` 子命令操作。两套 CLI 命令集分别对应"凭证"和"权限"两个独立层面。

---

### 服务级账号（实例级）

服务级账号**不与腾讯云子账号关联**，属于实例级资源，权限管理独立于 CAM。

**工作机制**：
- 在实例内通过 `tccli tcr CreateServiceAccount` 创建服务账号，指定其可访问的**命名空间**和**操作权限**（如 `tcr:PushRepository`、`tcr:PullRepository`）
- 权限使用 TCR 自定义 Action 名格式（带 `tcr:` 前缀），存储于实例内部
- 通过 `tccli tcr DescribeServiceAccounts` 查询列表

**适用的自动化场景**：
- CI/CD 流水线（如 Jenkins、GitLab CI、腾讯云 CODING DevOps）
- Kubernetes 集群（通过 ImagePullSecret 挂载服务账号凭证拉取镜像）

**权限隔离**：服务级账号仅能操作被授予的命名空间，无法跨命名空间访问。权限由 `Permissions` 数组定义，每条权限记录指定 `Resource`（命名空间名）和 `Actions`（TCR 自定义 Action 列表）。

**安全注意事项**：
- 任何具有服务级账号 API 权限的子账号均可查询/管理服务级账号（因为权限模型独立于 CAM）
- 存在**权限放大风险**：主账号在授予子账号 `tcr:CreateServiceAccount` 等 API 权限时需严格控制授权范围
- 服务级账号的访问凭证与人员无关，人员离职不影响其有效性——这既是优点（系统连续性），也是需管控的点（凭证泄露后影响面可能更大）

**CLI 视角**：服务级账号全程通过 `tccli tcr` 子命令操作，无需交叉使用 `tccli cam`。`Permissions` 参数的 `Actions` 字段使用 TCR 自定义 Action 名（`tcr:PushRepository`、`tcr:PullRepository` 等）。

---

### 两种模式对比

| 维度 | 用户级账号 | 服务级账号 |
|------|-----------|-----------|
| 关联对象 | 腾讯云子账号 | 无云账号关联，实例级资源 |
| 权限系统 | CAM（`tccli cam`） | TCR 自定义权限模型（`tccli tcr`） |
| 适用场景 | 人员手动操作 | CI/CD、K8s 等自动化系统 |
| 凭证可见性 | 仅关联子账号可见/管理 | 有 API 权限的子账号均可管理 |
| 人员变更影响 | 子账号禁用/删除 -> 凭证失效 | 无影响 |
| 权限粒度 | CAM 策略（实例级/仓库级） | 命名空间级（push/pull/create） |
| 审计追溯 | CAM 操作日志 | 实例内部记录 |
| 权限放大风险 | 低（CAM 统一治理） | 需关注（独立权限模型，子账号可能越权管理服务账号） |

## 前置条件

- [环境准备](../../index.md)：`tccli` 已安装并配置凭证和地域
- 已成功 [创建企业版实例](../../../create)（`basic`/`standard`/`premium`），实例状态为 `Running`
- 理解腾讯云 [访问管理 CAM](https://cloud.tencent.com/document/product/598) 的基本概念（子账号、策略、授权）

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置

# 3. 查询实例列表验证基础连通性
tccli tcr DescribeInstances \
    --region '<Region>' \
    --output json
# expected: exit 0，返回实例列表
```

## 控制台与 CLI 参数映射

本文为概念概述页。以下列出两种模式的 tccli 命令入口，具体参数和操作步骤见对应子页面。

### 用户级账号 — CLI 命令入口

| 控制台操作 | tccli 命令 | 幂等 | 页面 |
|-----------|----------|:--:|------|
| 创建长期访问凭证 | `CreateInstanceToken` | 否 | [用户级账号管理](../../credentials/user-credentials) |
| 查看凭证列表 | `DescribeInstanceToken` | 是 | 同上 |
| 启用/禁用凭证 | `ModifyInstanceToken` | 是 | 同上 |
| 删除凭证 | `DeleteInstanceToken` | 否 | 同上 |
| CAM 策略授权 | `tccli cam` 系列 | — | [基于 CAM 管理子账号权限](../基于cam管理子账号权限) |

### 服务级账号 — CLI 命令入口

| 控制台操作 | tccli 命令 | 幂等 | 页面 |
|-----------|----------|:--:|------|
| 创建服务级账号 | `CreateServiceAccount` | 否 | [服务级账号管理](../../credentials/service-credentials) |
| 查看服务级账号列表 | `DescribeServiceAccounts` | 是 | 同上 |
| 修改服务级账号权限 | `ModifyServiceAccount` | 否 | 同上 |
| 删除服务级账号 | `DeleteServiceAccount` | 否 | 同上 |

## 操作步骤

本文为概念概述页，无独立可执行的 tccli 命令操作。以下为 CLI 环境下快速确认当前实例状态的基础命令。

### 查询实例信息

查看当前账号下的所有 TCR 企业版实例，确认实例状态、类型和域名：

```bash
tccli tcr DescribeInstances \
    --region '<Region>' \
    --output json
# expected: exit 0，返回 Registries 列表
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "basic",
            "Status": "Running",
            "PublicDomain": "tcr-example.tencentcloudcr.com",
            "CreatedAt": "2026-06-01T10:00:00+08:00",
            "RegionName": "ap-guangzhou",
            "EnableAnonymous": false,
            "TokenValidTime": 87600
        }
    ],
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

如需查看所有地域的实例：

```bash
tccli tcr DescribeInstances \
    --AllRegion true \
    --output json
# expected: exit 0，返回所有地域的实例
```

> 具体操作请进入以下子页面：
> - [用户级账号管理](../../credentials/user-credentials) — 创建与管理长期访问凭证（`CreateInstanceToken` / `DescribeInstanceToken` / `DeleteInstanceToken`）
> - [服务级账号管理](../../credentials/service-credentials) — 为 CI/CD 系统创建服务账号（`CreateServiceAccount` / `DescribeServiceAccounts` / `ModifyServiceAccount` / `DeleteServiceAccount`）
> - [基于 CAM 管理子账号权限](../基于cam管理子账号权限) — 通过 CAM 策略控制子账号对 TCR 资源的访问（page_id `41417`）

## 验证

### 控制面（tccli）

| # | 验证项 | 命令 | 期望结果 |
|---|--------|------|---------|
| 1 | 实例可查询 | `tccli tcr DescribeInstances --region '<Region>' --output json` | `TotalCount >= 1`，含实例信息 |
| 2 | 实例状态正常 | 同上，检查 `Registries[].Status` | `Status` 为 `"Running"` |
| 3 | 两种模式功能入口可访问 | 分别执行 `DescribeInstanceToken` 和 `DescribeServiceAccounts` | 均返回 exit 0（列表可为空） |

### 概念关系验证（交叉引用）

| 验证关系 | 验证方式 | 期望结论 |
|----------|---------|---------|
| 用户级账号 -> CAM 绑定 | 子账号创建 Token 后主账号在 CAM 删除该子账号，用该凭证 `docker login` | 凭证立即失效，登录失败 |
| 服务级账号 -> CAM 独立 | 子账号 A 创建服务级账号，子账号 B（有 `tcr:DescribeServiceAccounts` 权限）查询 | 子账号 B 可见子账号 A 创建的服务级账号（实例级资源，非 CAM 隔离） |
| 两种模式独立共存 | 同一实例同时创建 1 个用户级凭证 + 1 个服务级凭证，分别 `docker push` | 两份凭证各自独立工作，互不影响 |

## 清理

不适用。本文为概念概述页，不涉及资源创建与清理。

## 排障

### 查询错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `DescribeInstances` 返回 `UnauthorizedOperation` | — | 子账号缺少 `tcr:DescribeInstances` 权限 | 联系主账号授予 `QcloudTCRReadOnlyAccess` 或添加 `tcr:DescribeInstances` 到自定义策略 |
| `DescribeInstances` 返回空列表 | `tccli tcr DescribeInstances --AllRegion true --output json` | 当前地域无实例，或 `--region` 参数与实际实例地域不一致 | 使用 `--AllRegion true` 查看所有地域实例 |

### 模式选择常见困惑

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 不确定该用哪种模式 | — | 场景不明确 | 人员手动操作（开发/运维） -> 用户级账号；CI/CD 流水线/K8s 自动化 -> 服务级账号 |
| 服务级账号创建失败：`custom account's permission can not be empty` | — | `Permissions` 参数为空数组 `[]` | 至少传入一条权限记录，含 `Resource` 和 `Actions` |
| 服务级账号创建失败：`not support action: <ActionName>` | — | `Actions` 使用了不支持的 Action 名 | 使用支持的动作：`tcr:PushRepository`、`tcr:PullRepository`、`tcr:CreateRepository` 等 |
| 用户级账号创建凭证后 `docker login` 失败 | `tccli tcr DescribeInstanceToken --RegistryId '<RegistryId>' --region '<Region>'` 确认凭证状态 | 子账号被禁用/删除，或凭证已过期 | 确认 CAM 子账号状态正常；凭证过期需重新 `CreateInstanceToken` |

## 下一步

- [用户级账号管理](../../credentials/user-credentials) — 创建与管理长期访问凭证
- [服务级账号管理](../../credentials/service-credentials) — 为 CI/CD 系统创建服务级账号
- [基于 CAM 管理子账号权限](../基于cam管理子账号权限) — 通过 CAM 策略控制子账号对 TCR 资源的访问
- [访问网络控制概述](../../network/network-overview) — 理解公网/内网访问网络层面的安全控制
- [创建企业版实例](../../../create) — 创建实例后配置访问权限

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) -> 选择目标企业版实例 -> 进入 **访问控制** 页面：
- **用户级账号**：切换至 **访问凭证** 标签页，由子账号自行创建和管理
- **服务级账号**：切换至 **服务级账号** 标签页，由实例管理员创建、授权、分发凭证至 CI/CD 系统
- **CAM 策略授权**：跳转至 [CAM 控制台](https://console.cloud.tencent.com/cam) 进行子账号策略管理
