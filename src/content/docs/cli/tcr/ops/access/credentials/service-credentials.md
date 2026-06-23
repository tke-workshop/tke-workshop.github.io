---
title: "管理服务级账号"
description: "· page_id `89137`"
---

> 对照官方：[服务级账号管理](https://cloud.tencent.com/document/product/1141/89137) · page_id `89137`

## 概述

管理 TCR 企业版实例的**服务级账号**（Service Account）。服务级账号是一种命名空间级别的机器人账号，不与腾讯云子账号绑定，适用于 CI/CD 流水线、Kubernetes 集群 ImagePullSecret 等自动化场景。

核心特性：

- **细粒度权限**：通过 `Permissions` 数组精确控制账号可执行的操作（push、pull、create 等）及可访问的命名空间。
- **时效性**：通过 `Duration`（天数）或 `ExpiresAt`（毫秒时间戳）设定过期时间，到期后自动失效。两者二选一必填。
- **自动前缀**：创建指定的 `Name` 后，系统自动添加 `tcr$` 前缀作为最终用户名（如 `Name=my-sa` -> `tcr$my-sa`）。
- **密码一次性返回**：`Password` 仅在创建时返回，后续无法查询，需立即保存。

> **注意**：服务级账号权限模型独立于 CAM。拥有 `tcr:CreateServiceAccount` 等 API 权限的子账号可为服务账号配置超出自身权限的命名空间操作权限，存在越权风险。请严格限制服务级账号功能的授权范围。

## 前置条件

- [环境准备](../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:CreateServiceAccount, tcr:DescribeServiceAccounts,
#    tcr:ModifyServiceAccount, tcr:DeleteServiceAccount
# 验证：执行 DescribeServiceAccounts 确认权限
tccli tcr DescribeServiceAccounts \
    --RegistryId '<RegistryId>' \
    --region '<Region>' \
    --output json
# expected: exit 0，返回服务级账号列表（可为空）
```

### 资源检查

```bash
# 4. 确认实例存在且状态为 Running
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region '<Region>' \
    --output json
# expected: Registries 列表中实例 Status 为 "Running"

# 5. 确认目标命名空间存在
tccli tcr DescribeNamespaces \
    --RegistryId '<RegistryId>' \
    --region '<Region>' \
    --output json
# expected: 返回命名空间列表，含目标命名空间 <NamespaceName>
```

| # | 条件 | 验证方式 |
|---|------|---------|
| 1 | 企业版实例已创建且状态为 `Running` | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>` |
| 2 | 目标命名空间已创建 | `tccli tcr DescribeNamespaces --RegistryId <RegistryId> --region <Region>` |
| 3 | `tccli` 已安装并配置凭证 | `tccli tcr DescribeServiceAccounts --RegistryId <RegistryId> --region <Region>` |

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看服务级账号列表 | `DescribeServiceAccounts` | 是 |
| 新建服务级账号 | `CreateServiceAccount` | 否 |
| 修改服务级账号（权限/描述/有效期） | `ModifyServiceAccount` | 否 |
| 删除服务级账号 | `DeleteServiceAccount` | 否 |

## 关键字段说明

以下说明 `CreateServiceAccount` 的主要参数。完整参数定义见 `tccli tcr CreateServiceAccount --generate-cli-skeleton`。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | 实例 ID，格式 `tcr-xxxxxxxx` | 非法格式 → `InvalidParameter`；实例不存在 → `ResourceNotFound` |
| `Name` | String | 是 | 账号名称，系统自动添加 `tcr$` 前缀。实例内唯一 | 同名冲突 → `InvalidParameter` |
| `Permissions` | Array | 是 | 权限策略数组，元素结构 `{"Resource": "<NsName>", "Actions": ["tcr:PushRepository", ...]}` | 空数组 → `custom account's permission can not be empty` |
| `Permissions[].Resource` | String | 是 | 命名空间名称（非 `namespace/repo` 路径，无需通配符） | 填仓库全路径 → `custom account for resource(...) is illegal` |
| `Permissions[].Actions` | Array | 是 | TCR 自定义 Action 名：`tcr:PushRepository`、`tcr:PullRepository`、`tcr:CreateRepository`、`tcr:CreateHelmChart`、`tcr:DescribeHelmChart` 等，至少一个 | 空数组或不支持 Action → `not support action` |
| `Description` | String | 否 | 账号描述，建议填写用途便于管理 | 无直接后果，不填增加后期审计成本 |
| `Duration` | Integer | 条件必填 | 有效期（天），从当前时间起算。与 `ExpiresAt` 二选一必填 | 两者都不填 → `MissingParameter` |
| `ExpiresAt` | Integer | 条件必填 | 过期时间（Unix 毫秒时间戳）。`Duration` 优先级高于 `ExpiresAt` | 同上 |
| `Disable` | Boolean | 否 | `true` 创建即禁用，默认 `false` | 创建即禁用需手动 Enable 后才能使用 |

## 操作步骤

### 步骤 1：查看已有服务级账号

```bash
tccli tcr DescribeServiceAccounts \
    --RegistryId '<RegistryId>' \
    --region '<Region>' \
    --output json
# expected: exit 0，ServiceAccounts 列表
```

**预期输出**：

```json
{
    "ServiceAccounts": [],
    "TotalCount": 0,
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

当前实例无已有服务级账号。`DescribeServiceAccounts` 为只读操作，可随时安全执行。

如需按名称过滤，使用 `--Filters` 参数：

```bash
tccli tcr DescribeServiceAccounts \
    --RegistryId '<RegistryId>' \
    --Filters '[{"Name":"ServiceAccountName","Values":["<SAName>"]}]' \
    --region '<Region>' \
    --output json
# expected: exit 0，匹配的 ServiceAccounts
```

### 步骤 2：创建服务级账号

#### 选择依据

*为什么选这个值而不是其他：*

- **Actions**：使用 `tcr:PushRepository`、`tcr:PullRepository`、`tcr:CreateRepository`（TCR 自定义 Action 格式，带 `tcr:` 前缀）。这是服务级账号权限体系的专有命名格式，非 CAM IAM Action 名。
- **Resource**：填命名空间名称（如 `<NamespaceName>`），非仓库全路径。无需通配符，一个 Permission 条目对应一个命名空间。
- **Duration vs ExpiresAt**：推荐使用 `Duration`（天数），从当前时间起算，语义清晰不易出错。长期 CI/CD 场景建议设 365 天（1 年）或更长。
- **Permissions 不可为空**：API 对空权限数组执行硬校验，必须提供至少一个权限条目。

#### 最小创建（仅必填字段，长期有效）

```bash
tccli tcr CreateServiceAccount \
    --RegistryId '<RegistryId>' \
    --Name '<SAName>' \
    --Permissions '[{"Resource":"<NamespaceName>","Actions":["tcr:PushRepository","tcr:PullRepository","tcr:CreateRepository"]}]' \
    --Duration 87600 \
    --region '<Region>' \
    --output json
# expected: exit 0，返回 Name（含 tcr$ 前缀）和 Password
```

**预期输出**：

```json
{
    "Name": "tcr$<SAName>",
    "Password": "<Password>",
    "ExpiresAt": 1740000000000,
    "CreateTime": "2026-06-18T12:00:00+08:00",
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 返回字段 | 说明 |
|---------|------|
| `Name` | 实际用户名，含 `tcr$` 前缀（如 `tcr$my-sa`），用于 `docker login` |
| `Password` | 访问密码，**仅在创建时返回一次**，需立即保存 |
| `ExpiresAt` | 过期时间（毫秒时间戳） |
| `CreateTime` | 创建时间 |

#### 增强配置（加描述、精确有效期）

```bash
tccli tcr CreateServiceAccount \
    --RegistryId '<RegistryId>' \
    --Name '<SAName>' \
    --Permissions '[{"Resource":"<NamespaceName>","Actions":["tcr:PushRepository","tcr:PullRepository","tcr:CreateRepository"]}]' \
    --Duration 365 \
    --Description '<Description>' \
    --region '<Region>' \
    --output json
# expected: exit 0，返回 Name 和 Password
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `<RegistryId>` | TCR 实例 ID，格式 `tcr-xxxxxxxx` | `tccli tcr DescribeInstances` |
| `<SAName>` | 服务级账号名称（不含 `tcr$` 前缀） | 自定义 |
| `<NamespaceName>` | 目标命名空间名称 | `tccli tcr DescribeNamespaces --RegistryId <RegistryId>` |
| `<Region>` | 实例所在地域，如 `ap-guangzhou` | `tccli tcr DescribeInstances` |
| `<Description>` | 账号用途描述 | 自定义 |

> **重要**：`Password` 值仅在创建时返回一次。`DescribeServiceAccounts` 不返回密码，遗失后无法找回，只能删除后重新创建。

### 步骤 3：修改服务级账号

修改已有服务级账号的权限、描述或有效期：

```bash
tccli tcr ModifyServiceAccount \
    --RegistryId '<RegistryId>' \
    --Name '<SAName>' \
    --Permissions '[{"Resource":"<NamespaceName>","Actions":["tcr:PushRepository","tcr:PullRepository"]}]' \
    --region '<Region>' \
    --output json
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

> `ModifyServiceAccount` 的 `Permissions` 参数会**全量替换**原有权限，而非追加。修改前建议先通过 `DescribeServiceAccounts` 确认当前权限配置。

### 步骤 4：删除服务级账号

```bash
tccli tcr DeleteServiceAccount \
    --RegistryId '<RegistryId>' \
    --Name '<SAName>' \
    --region '<Region>' \
    --output json
# expected: exit 0
```

**预期输出**：

```json
{
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

| 占位符 | 说明 |
|--------|------|
| `<SAName>` | 创建时的原始名称（**不含** `tcr$` 前缀） |

> 删除操作不可逆。`Name` 为创建时传入的原始名称（不含 `tcr$` 前缀）。生产环境建议先确认无 CI/CD 流水线依赖后再删除。

## 验证

### 控制面（tccli）

| # | 验证项 | 命令 | 期望结果 |
|---|--------|------|---------|
| 1 | 服务级账号已创建 | `tccli tcr DescribeServiceAccounts --RegistryId '<RegistryId>' --region '<Region>'` | `ServiceAccounts` 列表中包含新建账号，`Name` 含 `tcr$` 前缀 |
| 2 | 权限策略正确 | 同上，检查 `Permissions[].Actions` | 与创建时指定的 Actions 一致 |
| 3 | 有效期正确 | 同上，检查 `ExpiresAt` | 时间戳与创建时的 Duration 对应 |
| 4 | 修改已生效 | 同上（修改后执行） | `Permissions` 或 `Description` 已更新 |
| 5 | 账号已删除 | 同上（删除后执行） | 该账号不再出现在 `ServiceAccounts` 列表中 |

### 数据面（docker login）

创建成功后，用返回的 `Name`（含 `tcr$` 前缀）和 `Password` 登录：

```bash
docker login <RegistryId>.tencentcloudcr.com \
    --username 'tcr$<SAName>' \
    --password '<Password>'
# expected: Login Succeeded
```

如果服务级账号只被授予了 `tcr:PullRepository` 权限，则 `docker push` 会被拒绝——这是预期行为，验证了权限隔离生效。

## 清理

> **删除操作不可逆。** 正在使用该服务账号的 CI/CD 流水线、Kubernetes 集群（通过 ImagePullSecret）将在凭证缓存过期后丢失拉取/推送权限。建议清理前先确认无活跃流水线依赖该账号。

### 1. 清理前状态检查

```bash
tccli tcr DescribeServiceAccounts \
    --RegistryId '<RegistryId>' \
    --region '<Region>' \
    --output json
# 确认待删除的账号名称、权限、创建时间
```

### 2. 删除服务级账号

```bash
tccli tcr DeleteServiceAccount \
    --RegistryId '<RegistryId>' \
    --Name '<SAName>' \
    --region '<Region>' \
    --output json
```

### 3. 验证已删除

```bash
tccli tcr DescribeServiceAccounts \
    --RegistryId '<RegistryId>' \
    --Filters '[{"Name":"ServiceAccountName","Values":["<SAName>"]}]' \
    --region '<Region>' \
    --output json
# expected: ServiceAccounts 为空数组，TotalCount 为 0
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateServiceAccount` 返回 `custom account's permission can not be empty` | 检查 `--Permissions` 参数值 | `Permissions` 为空数组 `[]` | 至少传入一条权限记录，含 `Resource` 和 `Actions`，如 `'[{"Resource":"<NsName>","Actions":["tcr:PullRepository"]}]'` |
| `CreateServiceAccount` 返回 `not support action: <ActionName>` | 检查 `Actions` 列表中的值 | `Actions` 使用了不支持的 Action 名 | 使用 TCR 服务级账号支持的 Action：`tcr:PushRepository`、`tcr:PullRepository`、`tcr:CreateRepository`、`tcr:CreateHelmChart`、`tcr:DescribeHelmChart` |
| `CreateServiceAccount` 返回 `custom account for resource(...) is illegal` | 检查 `Resource` 值 | `Resource` 填了仓库全路径（如 `ns/repo`）而非命名空间名 | `Resource` 填命名空间名称（仅 `<NamespaceName>`），非仓库全路径 |
| `CreateServiceAccount` 返回 `MissingParameter` | 检查是否传了 `Duration` 或 `ExpiresAt` | `Duration` 和 `ExpiresAt` 至少填一个 | 添加 `--Duration <天数>` 或 `--ExpiresAt <毫秒时间戳>` |
| `DeleteServiceAccount` / `ModifyServiceAccount` 返回 `ResourceNotFound` | `tccli tcr DescribeServiceAccounts --RegistryId '<RegistryId>' --region '<Region>'` 核实 `Name` | `Name` 不存在或拼写错误 | 使用创建时的原始名称（不含 `tcr$` 前缀），或通过 `DescribeServiceAccounts` 确认正确的 `Name` |
| 创建时同名冲突 | `tccli tcr DescribeServiceAccounts --RegistryId '<RegistryId>' --Filters '[{"Name":"ServiceAccountName","Values":["<SAName>"]}]' --region '<Region>'` | 实例内服务级账号名称必须唯一 | 更换 `Name` 或先删除同名账号 |

### 使用过程中常见问题

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `docker login` 返回 `401 Unauthorized` | 检查 `ExpiresAt` 是否已过期：`tccli tcr DescribeServiceAccounts --RegistryId '<RegistryId>' --region '<Region>'` | 服务账号已过期或被禁用 | 过期需删除重新创建；被禁用需通过控制台启用（tccli 暂无 Enable/Disable 接口） |
| `Password` 遗失 | 执行 `tccli tcr DescribeServiceAccounts --RegistryId '<RegistryId>' --region '<Region>'` | 查询接口不返回 `Password` 字段 | 无法找回原始密码，需删除后重新创建（步骤 4 + 步骤 2） |
| CI/CD 平台不支持 `$` 字符 | — | `tcr$` 前缀中的 `$` 被部分平台转义 | 部分平台支持用 `tcr@` 替代 `tcr$` 前缀 |
| 子账号操作被 CAM 拒绝 | — | 子账号缺少 `tcr:CreateServiceAccount` 等权限 | 联系主账号授予 `QcloudTCRFullAccess` 或添加对应 Action 到自定义策略 |

## 下一步

- [用户级账号管理](../user-credentials) — 创建用于个人开发者的长期登录 Token
- [管理命名空间](../../../image-creation/namespace) — 为服务级账号绑定目标命名空间
- [基于 CAM 管理子账号权限](../../permissions/基于cam管理子账号权限) — 管理子账号的 TCR 操作权限
- [访问权限管理概述](../../permissions/permission-overview) — 了解用户级账号与服务级账号的差异

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) -> 选择实例 -> **访问凭证** -> **服务级账号** -> **新建** -> 填写名称、描述、有效期、权限策略（选择命名空间及操作）-> 确认后复制生成的用户名（`tcr$<Name>`）和密码。在服务级账号列表中可查看详情、修改权限或删除账号。
