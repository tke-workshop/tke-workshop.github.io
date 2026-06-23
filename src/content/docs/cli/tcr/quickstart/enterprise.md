---
title: "企业版快速入门"
description: "· page_id `39287`"
---

> 对照官方：[企业版快速入门](https://cloud.tencent.com/document/product/1141/39287) · page_id `39287`

## 概述

通过 `tccli tcr` 命令行完成 TCR 企业版从零到推送镜像的全流程。企业版实例提供独立的 Registry 域名（格式 `INSTANCE_NAME.tencentcloudcr.com`），支持容器镜像托管、安全扫描、跨地域同步和访问控制。

实例规格分三档，按需选择：

| 规格 | RegistryType | 适用场景 |
|------|-------------|------|
| 基础版 | `basic` | 小团队或个人开发者，低并发拉取 |
| 标准版 | `standard` | 中型团队，日常 CI/CD，中等并发 |
| 高级版 | `premium` | 企业生产环境，高并发，跨地域同步 |

本文为快速体验流程，各步骤的详细参数和高级配置请参见对应操作指南专页。

## 前置条件

- [环境准备](../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:CreateInstance, tcr:DescribeInstances, tcr:CreateNamespace
#    tcr:CreateRepository, tcr:CreateInstanceToken, tcr:CreateSecurityPolicy
#    tcr:ManageExternalEndpoint, tcr:DescribeExternalEndpointStatus
#    tcr:DescribeSecurityPolicies, tcr:DescribeNamespaces
#    tcr:DescribeRepositories, tcr:DescribeInstanceToken
#    验证：执行 DescribeInstances 确认权限
tccli tcr DescribeInstances --region <Region>
# expected: exit 0，返回实例列表（可为空）

# 4. 检查 Docker 是否安装（用于推送/拉取镜像）
docker --version
# expected: Docker version 20.10 或更高

# 5. 确认已开通 COS 服务（企业版实例依赖 COS 存储镜像数据）
#    登录 https://console.cloud.tencent.com/cos5 确认 COS 已开通
#    若未开通，访问控制台开通即可，无需额外 CLI 操作
```

### 实例名预检

```bash
# 6. 确认目标实例名可用
tccli tcr CheckInstanceName --RegistryName INSTANCE_NAME
# expected: IsValidated: true, DetailCode: 0，表示名称可用
```

**预期输出**：

```json
{
    "IsValidated": true,
    "DetailCode": 0,
    "RequestId": "xxxx"
}
```

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 检查实例名可用性 | `CheckInstanceName` | 是 |
| 购买企业版实例 | `CreateInstance` | 否 |
| 查看实例状态 | `DescribeInstances` | 是 |
| 开启公网访问入口 | `ManageExternalEndpoint --Operation Create` | 否 |
| 关闭公网访问入口 | `ManageExternalEndpoint --Operation Delete` | 否 |
| 查看公网端点状态 | `DescribeExternalEndpointStatus` | 是 |
| 添加公网白名单 | `CreateSecurityPolicy` | 否 |
| 查看公网白名单 | `DescribeSecurityPolicies` | 是 |
| 创建命名空间 | `CreateNamespace` | 否 |
| 查看命名空间列表 | `DescribeNamespaces` | 是 |
| 创建镜像仓库 | `CreateRepository` | 否 |
| 查看镜像仓库列表 | `DescribeRepositories` | 是 |
| 生成访问凭证 | `CreateInstanceToken` | 否 |
| 查看访问凭证列表 | `DescribeInstanceToken` | 是 |

## 关键字段说明

以下说明 `CreateInstance` 的主要参数。完整参数定义见 `tccli tcr CreateInstance --help`。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryName` | String | 是 | 全局唯一，长度 2-30 字符，字母开头。创建后不可修改，自动生成域名 `RegistryName.tencentcloudcr.com` | 重名 → `InstanceNameAlreadyExists` |
| `RegistryType` | String | 是 | `basic`（基础版）/ `standard`（标准版）/ `premium`（高级版）。创建后不可降级 | 无效值 → `InvalidParameter` |
| `RegistryChargeType` | Integer | 否 | `0` = 按量计费（后付费），`1` = 预付费（包年包月）。默认 `0` | 选错计费类型 → 计费方式与预期不符，创建后不可切换 |
| `EnableCosMAZ` | Boolean | 否 | 是否开启 COS 多 AZ 存储。默认 `false`。开启可提高数据可靠性，但存储费用较高 | 未开启 → 单 AZ 故障可能导致数据不可用 |
| `DeletionProtection` | Boolean | 否 | 默认 `false`。`true` 时需先关闭才能删除实例 | 忘开 → 可能误删生产实例及所有镜像数据 |
| `EnableCosVersioning` | Boolean | 否 | 是否开启 COS 版本控制。默认 `false` | 未开启 → 误删或覆盖镜像后无法恢复历史版本 |
| `SyncTag` | Boolean | 否 | 是否同步实例标签到 COS 桶。默认 `false` | — |

## 操作步骤

### 步骤1：创建企业版实例

#### 选择依据

- **实例规格**：本文选 `basic`（基础版按量计费），适合快速体验。生产环境推荐 `premium`（高级版），支持更高并发和跨地域同步。
- **多 AZ 存储**：开启 `EnableCosMAZ` 可跨可用区容灾，提高数据可靠性。体验场景可关闭以节省费用。
- **删除保护**：体验场景建议 `false`，便于实验后清理。生产环境务必开启 `DeletionProtection: true`。

#### 最小创建（空实例，只含必填字段）

`create-instance-minimal.json`：

```json
{
  "RegistryName": "INSTANCE_NAME",
  "RegistryType": "basic"
}
```

```bash
tccli tcr CreateInstance --region <Region> \
    --cli-input-json file://create-instance-minimal.json
# expected: exit 0，返回 RegistryId
```

**预期输出**：

```json
{
    "RegistryId": "tcr-example",
    "RequestId": "xxxx"
}
```

记录返回的 `RegistryId`（下文以 `REGISTRY_ID` 代指），后续所有实例操作均依赖此 ID。

#### 增强配置（加多 AZ、版本控制、删除保护）

`create-instance-enhanced.json`：

```json
{
  "RegistryName": "INSTANCE_NAME",
  "RegistryType": "basic",
  "RegistryChargeType": 0,
  "SyncTag": false,
  "EnableCosMAZ": true,
  "DeletionProtection": true,
  "EnableCosVersioning": true
}
```

```bash
tccli tcr CreateInstance --region <Region> \
    --cli-input-json file://create-instance-enhanced.json
# expected: exit 0，返回 RegistryId
```

#### 轮询实例状态

实例创建是异步操作。轮询直到状态为 `Running`：

```bash
tccli tcr DescribeInstances --region <Region> \
    --Registryids '["REGISTRY_ID"]'
# expected: Status: "Running"
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "INSTANCE_NAME",
            "RegistryType": "basic",
            "Status": "Running",
            "PublicDomain": "INSTANCE_NAME.tencentcloudcr.com",
            "RegionName": "ap-guangzhou",
            "InternalEndpoint": "10.0.0.0",
            "PayMod": 0,
            "DeletionProtection": false,
            "EnableCosMAZ": true,
            "EnableCosVersioning": true,
            "CreatedAt": "2025-01-01T00:00:00+08:00"
        }
    ]
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `INSTANCE_NAME` | 实例名称 | 全局唯一，2-30 字符，字母开头 | 自定义，建议组合公司、地域或项目缩写 |
| `REGISTRY_ID` | 实例 ID | 由 CreateInstance 返回 | 记录上一步输出中的 `RegistryId` 字段 |
| `REGION` | 地域 | 如 `ap-guangzhou` | `tccli configure list` 查看已配置的 region |

> 最长等待约 2 分钟（基础版）。超时参见 [排障](#排障)。

### 步骤2：配置公网访问

实例创建后**默认拒绝全部公网及内网访问**，必须先配置访问策略才能推送/拉取镜像。

#### 开启公网访问端点

```bash
tccli tcr ManageExternalEndpoint --region <Region> \
    --RegistryId REGISTRY_ID \
    --Operation Create
# expected: exit 0，返回 RegistryId
```

**预期输出**：

```json
{
    "RegistryId": "tcr-example",
    "RequestId": "xxxx"
}
```

> `ManageExternalEndpoint` 的 `Operation` 参数取值为 `Create`（开启）或 `Delete`（关闭），非 `Open`/`Close`。

#### 轮询公网端点状态

```bash
tccli tcr DescribeExternalEndpointStatus --region <Region> \
    --RegistryId REGISTRY_ID
# expected: Status: "Opened"
```

**预期输出**：

```json
{
    "Status": "Opened",
    "Reason": "",
    "RequestId": "xxxx"
}
```

状态变化：`Opening` 到 `Opened`，约需 1-3 分钟。

#### 添加公网访问白名单

公网端点 `Opened` 后，添加白名单放通访问来源 IP：

```bash
tccli tcr CreateSecurityPolicy --region <Region> \
    --RegistryId REGISTRY_ID \
    --CidrBlock CIDR_BLOCK \
    --Description "POLICY_DESC"
# expected: exit 0
```

**预期输出**：

```json
{
    "RegistryId": "tcr-example",
    "RequestId": "xxxx"
}
```

> 公网端点未 `Opened` 时调用 `CreateSecurityPolicy` 会返回 `OperationDenied`。务必先确认 `DescribeExternalEndpointStatus` 返回 `Status: "Opened"` 再执行。排障参见 [排障](#排障)。

> 安全建议：不要直接使用 `0.0.0.0/0` 放通全部来源公网访问。完成内网配置后建议尽快关闭公网入口。

#### 查看白名单

```bash
tccli tcr DescribeSecurityPolicies --region <Region> \
    --RegistryId REGISTRY_ID
# expected: SecurityPolicySet 含目标策略
```

**预期输出**：

```json
{
    "SecurityPolicySet": [
        {
            "PolicyIndex": 0,
            "Description": "POLICY_DESC",
            "CidrBlock": "CIDR_BLOCK",
            "PolicyVersion": "1"
        }
    ],
    "RequestId": "xxxx"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `CIDR_BLOCK` | 白名单 IP 或地址段 | 如 `1.2.3.4/32` 或 `10.0.0.0/8` | 当前机器的出口 IP |
| `POLICY_DESC` | 策略备注 | 任意字符串 | 自定义 |

### 步骤3：创建命名空间

命名空间用于组织管理实例内的镜像仓库，不直接存储容器镜像。可映射为企业内团队、项目或其他自定义层级。

#### 选择依据

- **访问级别**：`IsPublic: true` = 公开（命名空间内仓库允许匿名拉取），`IsPublic: false` = 私有（需凭据访问）。本文选 `true` 方便体验。

```bash
tccli tcr CreateNamespace --region <Region> \
    --RegistryId REGISTRY_ID \
    --NamespaceName NAMESPACE_NAME \
    --IsPublic true
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "xxxx"
}
```

#### 查看命名空间

```bash
tccli tcr DescribeNamespaces --region <Region> \
    --RegistryId REGISTRY_ID
# expected: NamespaceList 含目标命名空间
```

**预期输出**：

```json
{
    "NamespaceList": [
        {
            "Name": "ns-example",
            "NamespaceId": 1,
            "Public": true,
            "CreationTime": "2025-01-01T00:00:00.000Z"
        }
    ],
    "TotalCount": 1,
    "RequestId": "xxxx"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `NAMESPACE_NAME` | 命名空间名称 | 小写字母、数字、连字符，实例内唯一 | 自定义，建议用团队或项目命名 |

### 步骤4：创建镜像仓库（可选）

镜像仓库可手动创建，也可在 `docker push` 时自动创建。手动创建可预设描述和访问级别。

`create-repository.json`：

```json
{
  "RegistryId": "REGISTRY_ID",
  "NamespaceName": "NAMESPACE_NAME",
  "RepositoryName": "REPO_NAME",
  "BriefDescription": "BRIEF_DESC",
  "Description": "DESCRIPTION"
}
```

```bash
tccli tcr CreateRepository --region <Region> \
    --cli-input-json file://create-repository.json
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "xxxx"
}
```

#### 查看镜像仓库

```bash
tccli tcr DescribeRepositories --region <Region> \
    --RegistryId REGISTRY_ID \
    --NamespaceName NAMESPACE_NAME
# expected: RepositoryList 含目标仓库
```

**预期输出**：

```json
{
    "RepositoryList": [
        {
            "Name": "ns-example/repo-example",
            "Namespace": "ns-example",
            "Public": true,
            "CreationTime": "2025-01-01 00:00:00.000000 +0000 UTC"
        }
    ],
    "TotalCount": 1,
    "RequestId": "xxxx"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `REPO_NAME` | 仓库名称 | 小写字母、数字、连字符、下划线、正斜杠，支持多级路径如 `team/app` | 自定义 |
| `BRIEF_DESC` | 简短描述 | 任意字符串 | 自定义 |
| `DESCRIPTION` | 详细描述 | 支持 Markdown 语法 | 自定义 |

### 步骤5：创建访问凭证

#### 选择依据

- **TokenType**：`longterm`（长期，有效期 87600 小时约 10 年）适用于 CI/CD 或长期开发环境；`temp`（临时，有效期 1 小时）适用于一次性操作。本文选 `longterm`。

```bash
tccli tcr CreateInstanceToken --region <Region> \
    --RegistryId REGISTRY_ID \
    --TokenType longterm \
    --Desc "TOKEN_DESC"
# expected: exit 0，返回 Username 和 Token
```

**预期输出**：

```json
{
    "Username": "100000000000",
    "Token": "eyJhbGciOiJSUzI1NiIs...",
    "TokenId": "tkn-example",
    "ExpTime": 2096954604521,
    "RequestId": "xxxx"
}
```

> 立即记录 `Token` 字段——它只在创建时返回一次，关闭终端后将无法再次查看。若丢失，需重新创建新令牌。Docker 登录时用 `Token` 值作为密码。

#### 查看访问凭证列表

```bash
tccli tcr DescribeInstanceToken --region <Region> \
    --RegistryId REGISTRY_ID
# expected: Tokens 列表含目标令牌
```

**预期输出**：

```json
{
    "TotalCount": 1,
    "Tokens": [
        {
            "Id": "tkn-example",
            "Desc": "TOKEN_DESC",
            "Enabled": true,
            "CreatedAt": "2025-01-01T00:00:00+08:00"
        }
    ],
    "RequestId": "xxxx"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `TOKEN_DESC` | 令牌描述 | 任意字符串 | 自定义，如 `dev-token-2025` |

### 步骤6：推送与拉取镜像

获取实例公网域名：

```bash
tccli tcr DescribeInstances --region <Region> \
    --Registryids '["REGISTRY_ID"]'
# expected: PublicDomain 字段为 INSTANCE_NAME.tencentcloudcr.com
```

记下 `PublicDomain` 字段（下文以 `PUBLIC_DOMAIN` 代指），其格式为 `INSTANCE_NAME.tencentcloudcr.com`。

#### 登录 Registry

```bash
docker login PUBLIC_DOMAIN --username USERNAME --password TOKEN
# expected: Login Succeeded
```

`USERNAME` 和 `TOKEN` 来自步骤5 `CreateInstanceToken` 的输出。

#### 推送镜像

```bash
docker pull nginx:latest
docker tag nginx:latest PUBLIC_DOMAIN/NAMESPACE_NAME/REPO_NAME:latest
docker push PUBLIC_DOMAIN/NAMESPACE_NAME/REPO_NAME:latest
# expected: push 进度条结束，显示 digest: sha256:xxxx
```

#### 拉取镜像

```bash
docker pull PUBLIC_DOMAIN/NAMESPACE_NAME/REPO_NAME:latest
# expected: pull 进度条结束，显示 Status: Downloaded newer image
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `PUBLIC_DOMAIN` | 实例公网域名 | `DescribeInstances` 输出的 `PublicDomain` 字段，格式 `INSTANCE_NAME.tencentcloudcr.com` |
| `USERNAME` | 登录用户名 | `CreateInstanceToken` 输出的 `Username` 字段 |
| `TOKEN` | 登录密码/令牌 | `CreateInstanceToken` 输出的 `Token` 字段 |

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 实例状态 | `tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'` | `Status: "Running"` |
| 实例域名 | 同上，检查 `PublicDomain` | `INSTANCE_NAME.tencentcloudcr.com` |
| 规格 | 同上，检查 `RegistryType` | `basic`（与创建参数一致） |
| 多 AZ | 同上，检查 `EnableCosMAZ` | 与创建参数一致 |
| 删除保护 | 同上，检查 `DeletionProtection` | 与创建参数一致 |
| 公网端点 | `tccli tcr DescribeExternalEndpointStatus --region <Region> --RegistryId REGISTRY_ID` | `Status: "Opened"` |
| 白名单 | `tccli tcr DescribeSecurityPolicies --region <Region> --RegistryId REGISTRY_ID` | `SecurityPolicySet` 含目标策略 |
| 命名空间 | `tccli tcr DescribeNamespaces --region <Region> --RegistryId REGISTRY_ID` | `NamespaceList` 含目标命名空间 |
| 镜像仓库 | `tccli tcr DescribeRepositories --region <Region> --RegistryId REGISTRY_ID --NamespaceName NAMESPACE_NAME` | `RepositoryList` 含目标仓库 |
| 访问凭证 | `tccli tcr DescribeInstanceToken --region <Region> --RegistryId REGISTRY_ID` | `Tokens` 含目标令牌 |

### 数据面（Docker）

```bash
# 验证登录
docker login PUBLIC_DOMAIN --username USERNAME --password TOKEN
# expected: Login Succeeded

# 验证推送
docker pull alpine:latest
docker tag alpine:latest PUBLIC_DOMAIN/NAMESPACE_NAME/REPO_NAME:test
docker push PUBLIC_DOMAIN/NAMESPACE_NAME/REPO_NAME:test
# expected: 推送成功

# 验证拉取
docker rmi PUBLIC_DOMAIN/NAMESPACE_NAME/REPO_NAME:test
docker pull PUBLIC_DOMAIN/NAMESPACE_NAME/REPO_NAME:test
# expected: 拉取成功
```

## 清理

> **警告**：`DeleteInstance` 会不可逆清除实例下所有命名空间、镜像仓库、Helm Chart 及关联 COS 存储桶数据。所有数据将被清除且不可恢复。如果不删除，按量计费实例将持续产生费用。

### 清理前状态检查

```bash
tccli tcr DescribeInstances --region <Region> \
    --Registryids '["REGISTRY_ID"]'
# expected: 确认是待删除的目标实例，核对 RegistryId、RegistryName
```

### 1. 删除访问令牌

```bash
tccli tcr DeleteInstanceToken --region <Region> \
    --RegistryId REGISTRY_ID \
    --TokenId TOKEN_ID
# expected: exit 0
```

`TOKEN_ID` 来自 `DescribeInstanceToken` 输出中的 `Id` 字段。

### 2. 关闭删除保护（如启用）

```bash
tccli tcr ModifyInstance --region <Region> \
    --RegistryId REGISTRY_ID \
    --DeletionProtection false
# expected: exit 0
```

如未开启删除保护，跳过此步。

### 3. 删除实例

```bash
tccli tcr DeleteInstance --region <Region> \
    --RegistryId REGISTRY_ID
# expected: exit 0
```

### 4. 验证已删除

```bash
tccli tcr DescribeInstances --region <Region> \
    --Registryids '["REGISTRY_ID"]'
# expected: TotalCount: 0 或 ResourceNotFound
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateInstance` 返回 `InstanceNameAlreadyExists` | `tccli tcr CheckInstanceName --RegistryName INSTANCE_NAME` | 实例名已被占用（全局唯一） | 更换 `RegistryName`，建议组合公司、地域或项目缩写以确保唯一 |
| `CreateSecurityPolicy` 返回 `OperationDenied`，错误信息含"check instance occur error" | `tccli tcr DescribeExternalEndpointStatus --region <Region> --RegistryId REGISTRY_ID` 检查公网端点状态 | 公网端点尚未 `Opened`（状态为 `Opening` 或 `Closed`） | 等待公网端点 `Opened`（1-3 分钟）后重试。先执行 `DescribeExternalEndpointStatus` 确认 `Status: "Opened"`，再执行 `CreateSecurityPolicy`。若 `Status` 为 `Closed`，先执行 `ManageExternalEndpoint --Operation Create` 开启 |
| `ManageExternalEndpoint` 返回 `OperationDenied` | 检查 `Operation` 参数值 | 填了 `Open` 或 `Close` 而非 API 枚举 `Create`/`Delete` | 用 `--Operation Create` 开启，`--Operation Delete` 关闭 |
| `CreateInstanceToken` 返回 `UnauthorizedOperation` | `tccli configure list` 检查当前凭据 | 子账号缺少 `tcr:CreateInstanceToken` 权限 | 联系主账号授予 `QcloudTCRFullAccess` 或对应的 CAM Action 权限 |
| `DeleteInstance` 返回 `OperationDenied` | `tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'` 检查 `DeletionProtection` 字段 | 实例开启了删除保护 | 先执行 `tccli tcr ModifyInstance --region <Region> --RegistryId REGISTRY_ID --DeletionProtection false`，再重试删除 |
| `docker login` 返回 `401 Unauthorized` | 检查 `CreateInstanceToken` 返回的 `Token` 是否正确复制 | 令牌无效、已过期或复制错误 | 重新执行 `CreateInstanceToken` 获取新令牌。确认 `--password` 使用 `Token` 字段值而非 `TokenId` |

### 创建成功但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 返回了 `RegistryId` 但 `DescribeInstances` 5 分钟后状态仍非 `Running` | `tccli tcr DescribeInstances --region <Region> --Registryids '["REGISTRY_ID"]'` 查看 `Status` 字段 | 后端创建缓慢（COS/依赖初始化）或卡住。`Status` 可能为 `Deploying` | 继续等待至 10 分钟。超 15 分钟则保留 `region`、`RegistryId`、`RequestId`、创建 JSON → 登录 [TCR 控制台](https://console.cloud.tencent.com/tcr/instance) 查看详细状态 → 仍无法解决则 [提交工单](https://console.cloud.tencent.com/workorder) |
| 公网端点 `Status` 长时间 `Opening`（超 5 分钟） | `tccli tcr DescribeExternalEndpointStatus --region <Region> --RegistryId REGISTRY_ID` | 后端开启公网端点卡住 | 继续等待。超 10 分钟仍 `Opening` 则保留 `RegistryId` 和 `RequestId` → 提交工单 |

## 下一步

- [创建企业版实例](https://cloud.tencent.com/document/product/1141/40716) -- 完整创建选项（多 AZ、版本控制、包年包月、标签等）
- [管理命名空间](https://cloud.tencent.com/document/product/1141/38432) -- 命名空间详细管理（公开/私有切换、权限控制）
- [管理镜像仓库](https://cloud.tencent.com/document/product/1141/38433) -- 仓库创建、描述和自动创建机制
- [销毁退还实例](../../ops/instances/delete) -- 实例生命周期管理（包年包月退还、删除保护）
- [个人版快速入门](../personal) -- 个人版（免费）操作对比

## 控制台替代

[容器镜像服务控制台 → 实例列表 → 新建](https://console.cloud.tencent.com/tcr/instance)：选择地域，填写实例名、规格，按需启用多 AZ 与版本控制，勾选协议后购买。实例运行后创建命名空间、仓库，在「访问凭证」获取登录命令。
