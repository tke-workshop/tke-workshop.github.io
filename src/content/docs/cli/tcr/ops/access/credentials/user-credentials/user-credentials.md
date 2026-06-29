---
title: "用户级账号管理（tccli）"
description: "· page_id `41829`"
---

> 对照官方：[用户级账号管理](https://cloud.tencent.com/document/product/1141/41829) · page_id `41829`

## 概述

管理 TCR 企业版实例的**用户级账号 Token**——用于 `docker login` 登录 TCR 实例域名的长期访问凭证。每个实例下可创建多条 Token，支持按 `TokenId` 启停与删除。

Token 分两种类型：

| 类型 | `TokenType` | 有效期 | 典型场景 |
|------|-------------|--------|---------|
| 临时 Token | `temp` | 短期（约数小时至数天） | CI/CD 单次构建、临时授权 |
| 长期 Token | `longterm` | 长期（约 10 年） | 开发者本地终端、持久化流水线 |

创建长期 Token 后返回 `Username` 和 `Token`，可直接用于：

```bash
docker login <PublicDomain> -u <Username> -p <Token>
```

> 与服务级账号（[服务级账号管理](../service-credentials)）不同，用户级账号 Token 面向人机身份，**不具备命名空间级权限隔离**。如需细粒度权限控制，请使用服务级账号。

## 前置条件

| # | 条件 | 验证命令（可 COPY-PASTE 直跑） |
|---|------|------------------------------|
| 1 | 企业版实例已创建且状态为 `Running` | `tccli tcr DescribeInstances --Registryids '["tcr-example"]' --region ap-guangzhou --output json --filter "Registries[0].Status"` # Expected: `"Running"` |
| 2 | `tccli` 已安装并配置凭证 | `tccli tcr DescribeRegions --region ap-guangzhou --output json --filter "TotalCount"` # Expected: `>= 1` |
| 3 | `docker` CLI 已安装（用于登录验证） | `docker --version` # Expected: `Docker version X.Y.Z` |
| 4 | 子账号需具备 `tcr:CreateInstanceToken` 权限 | 如使用子账号，联系主账号授予 `QcloudTCRFullAccess` 或最小权限策略（参见 [企业版授权方案示例](https://cloud.tencent.com/document/product/1141/41417)） |

## 控制台与 CLI 参数映射

| 控制台操作 | CLI | 幂等 |
|-----------|-----|------|
| 查看凭证列表 | `tccli tcr DescribeInstanceToken --RegistryId <RegistryId>` | 是 |
| 新建临时访问凭证 | `tccli tcr CreateInstanceToken --RegistryId <RegistryId> --TokenType temp --Desc <desc>` | 否（同名 Desc 可多条） |
| 新建长期访问凭证 | `tccli tcr CreateInstanceToken --RegistryId <RegistryId> --TokenType longterm --Desc <desc>` | 否（同名 Desc 可多条） |
| 启用/禁用凭证 | `tccli tcr ModifyInstanceToken --RegistryId <RegistryId> --TokenId <TokenId> --Enable true/false` | 是（重复执行结果一致） |
| 删除凭证 | `tccli tcr DeleteInstanceToken --RegistryId <RegistryId> --TokenId <TokenId>` | 否（已删除后再次执行报 `ResourceNotFound`） |

### CreateInstanceToken 关键字段说明

| 字段名 | 类型 | 必填 | 取值与约束 | 错误后果 |
|--------|------|------|-----------|---------|
| `RegistryId` | String | **是** | 实例 ID，格式 `tcr-xxxxxxxx` | 非法格式 → `InvalidParameter`；实例不存在 → `ResourceNotFound` |
| `TokenType` | String | **是** | `temp`（临时）或 `longterm`（长期）。大小写敏感，仅小写有效 | 非法值 → `InvalidParameterValue` |
| `Desc` | String | 否 | 凭证描述，建议填写用途便于管理。留空时系统不生成描述 | 无后果，但不填将增加后期审计成本 |
| `--region` | String | **是** | CLI 参数，需与实例所在地域一致（如 `ap-guangzhou`） | 实例在其他地域 → `ResourceNotFound` |

### ModifyInstanceToken 关键字段说明

| 字段名 | 类型 | 必填 | 取值与约束 | 错误后果 |
|--------|------|------|-----------|---------|
| `RegistryId` | String | **是** | 实例 ID | 不匹配 → `ResourceNotFound` |
| `TokenId` | String | **是** | 凭证 ID，来自 `DescribeInstanceToken` 返回的 `Id` 字段或 `CreateInstanceToken` 返回的 `TokenId` 字段 | TokenId 不存在或不属于该实例 → `ResourceNotFound` |
| `Enable` | Boolean | **是** | `true` 启用，`false` 禁用 | 禁用后使用该凭证的 `docker login` 返回 `401 Unauthorized` |
| `--region` | String | **是** | CLI 参数 | 同 CreateInstanceToken |

## 操作步骤

### 步骤1：创建临时 Token（短期访问）

```bash
# 最小示例（仅必填字段）
tccli tcr CreateInstanceToken \
  --RegistryId 'tcr-example' \
  --TokenType temp \
  --region ap-guangzhou \
  --output json
```

Output:

```json
{
    "Username": "100049208872",
    "Token": "<TOKEN>",
    "ExpTime": 1781602701406,
    "RequestId": "1cbb4de4-6a8a-487d-af93-38801ae5b234"
}
```

| 返回字段 | 说明 |
|---------|------|
| `Username` | TCR 用户 ID，即腾讯云主账号 UIN。所有 Token 共享同一 Username |
| `Token` | 临时凭证密码，**仅创建时返回一次**，`docker login` 的 `--password` 参数 |
| `ExpTime` | 过期时间，毫秒级 Unix 时间戳（本例约数天后过期） |

> 临时 Token 不返回 `TokenId`，无法通过 `ModifyInstanceToken` 启停或按 ID 删除，过期后自动失效。

### 步骤2：创建长期 Token（用于 docker login）

```bash
# 最小示例（仅必填字段）
tccli tcr CreateInstanceToken \
  --RegistryId 'tcr-example' \
  --TokenType longterm \
  --Desc 'my-longterm-token' \
  --region ap-guangzhou \
  --output json
```

Output:

```json
{
    "Username": "100049208872",
    "Token": "eyJhbGciOi...",
    "TokenId": "d8ogn8g08kblvtqbiun0",
    "ExpTime": 2096959138174,
    "RequestId": "e7aa94fa-c311-461f-af61-937433038b9d"
}
```

| 返回字段 | 说明 |
|---------|------|
| `Username` | TCR 用户 ID（同临时 Token） |
| `Token` | 长期访问凭证密码，**仅在创建时返回一次**。用于 `docker login` 的 `--password` 参数 |
| `TokenId` | 凭证唯一标识符，用于后续 `ModifyInstanceToken` / `DeleteInstanceToken` 的 `--TokenId` 参数 |
| `ExpTime` | 过期时间，毫秒级 Unix 时间戳。本例约 10 年有效期 |

> **重要**：`Token` 值**仅在创建时返回一次**。创建后务必立即保存——`DescribeInstanceToken` 不返回 `Token` 密码值，遗失后无法找回，只能删除旧凭证后重新创建。

### 步骤3：查看已有 Token

```bash
tccli tcr DescribeInstanceToken \
  --RegistryId 'tcr-example' \
  --region ap-guangzhou \
  --output json
```

Output:

```json
{
    "TotalCount": 1,
    "Tokens": [
        {
            "Id": "d8ogn8g08kblvtqbiun0",
            "Desc": "my-longterm-token",
            "RegistryId": "tcr-example",
            "Enabled": true,
            "CreatedAt": "2026-06-16T12:37:50+08:00",
            "ExpiredAt": 2096959138174
        }
    ],
    "RequestId": "29618872-20f3-4673-b1ea-46a59bd9f2c7"
}
```

> 注意：查询结果中字段名为 `Id`（非 `TokenId`），用于 `ModifyInstanceToken` / `DeleteInstanceToken` 的 `--TokenId` 参数。`Token` 密码值不会在查询结果中返回。

### 步骤4：启用/禁用 Token

```bash
# 启用
tccli tcr ModifyInstanceToken \
  --RegistryId 'tcr-example' \
  --TokenId 'd8ogn8g08kblvtqbiun0' \
  --Enable true \
  --region ap-guangzhou \
  --output json

# 禁用
tccli tcr ModifyInstanceToken \
  --RegistryId 'tcr-example' \
  --TokenId 'd8ogn8g08kblvtqbiun0' \
  --Enable false \
  --region ap-guangzhou \
  --output json
```

禁用后，使用该凭证的 `docker login` 将失败（返回 `401 Unauthorized`）。生产环境中建议对不再使用但暂不删除的凭证先执行禁用。

### 步骤5：删除 Token

```bash
tccli tcr DeleteInstanceToken \
  --RegistryId 'tcr-example' \
  --TokenId 'd8ogn8g08kblvtqbiun0' \
  --region ap-guangzhou \
  --output json
```

Output:

```json
{
    "RequestId": "fcb487f7-68e0-41ed-9141-6b7dd62694f8"
}
```

> 删除操作不可逆。删除后，使用该凭证的 `docker login` 会话将在凭证缓存过期后失效。建议先禁用（步骤4）再删除，确保无活跃流水线依赖该凭证。

## 验证

### Control plane (tccli)——多维度验证

| # | 验证项 | 命令 | 期望结果 |
|---|--------|------|---------|
| 1 | Token 已创建 | `tccli tcr DescribeInstanceToken --RegistryId 'tcr-example' --region ap-guangzhou` | 列表中包含新创建的 `Id`，`Desc` 与创建时一致 |
| 2 | Token 已启用 | 同上 | 对应 `Enabled` 为 `true` |
| 3 | Token 已禁用 | 同上（禁用后执行） | 对应 `Enabled` 为 `false` |
| 4 | Token 已删除 | 同上（删除后执行） | 该 `Id` 不再出现在 `Tokens` 数组中 |
| 5 | 创建同名 Token（非幂等验证） | 重复执行步骤2 | 返回新的 `TokenId`（允许同名多条） |

### Data plane (docker login)

使用 Token 登录 TCR 实例：

```bash
docker login tcr-example.tencentcloudcr.com --username 100049208872 --password <Token>
```

- 将 `tcr-example.tencentcloudcr.com` 替换为实例实际公网域名（`DescribeInstances` 返回的 `PublicDomain`）
- `<Username>` 和 `<Token>` 替换为创建时返回的对应值
- 预期输出 `Login Succeeded`

## 清理

> **删除 Token 不可逆。** 正在使用该 Token 的 CI/CD 流水线、开发者终端、TKE 集群（通过 TCR 插件）将在凭证缓存过期后丢失拉取/推送权限。建议清理前：
> 1. 先禁用（`ModifyInstanceToken --Enable false`）观察数日
> 2. 确认无流水线告警后再执行删除
> 3. TKE 插件或 CODING DevOps 自动创建的凭证，删除前需先解除关联

```bash
# 1. 先禁用
tccli tcr ModifyInstanceToken \
  --RegistryId 'tcr-example' \
  --TokenId 'd8ogn8g08kblvtqbiun0' \
  --Enable false \
  --region ap-guangzhou

# 2. 确认禁用生效
tccli tcr DescribeInstanceToken \
  --RegistryId 'tcr-example' \
  --region ap-guangzhou \
  --filter "Tokens[?Id=='d8ogn8g08kblvtqbiun0'].Enabled"
# Expected: [false]

# 3. 再删除
tccli tcr DeleteInstanceToken \
  --RegistryId 'tcr-example' \
  --TokenId 'd8ogn8g08kblvtqbiun0' \
  --region ap-guangzhou
```

## 排障

| 现象 | 诊断命令 | 根因 | 修复 |
|------|---------|------|------|
| `docker login` 返回 `401 Unauthorized` | `tccli tcr DescribeInstanceToken --RegistryId 'tcr-example' --region ap-guangzhou` 检查 `Enabled` 与 Token 是否存在 | Token 已禁用或已删除 | 若禁用，执行 `ModifyInstanceToken --Enable true` 重新启用 |
| `docker login` 返回 `401 Unauthorized`（Token 状态正常） | 确认域名是否正确：`tccli tcr DescribeInstances --Registryids '["tcr-example"]' --region ap-guangzhou --filter "Registries[0].PublicDomain"` | 实例域名拼写错误，或使用了内网地址但当前网络不在 VPC 内 | 使用 `PublicDomain` 值重新登录 |
| `CreateInstanceToken` 返回 `UnauthorizedOperation` | — | 子账号缺少 `tcr:CreateInstanceToken` 权限 | 联系主账号授予 `QcloudTCRFullAccess` 或添加 `CreateInstanceToken` 到自定义策略 |
| `ModifyInstanceToken` / `DeleteInstanceToken` 报 `ResourceNotFound` | `tccli tcr DescribeInstanceToken --RegistryId 'tcr-example' --region ap-guangzhou` 核实 TokenId | `TokenId` 不存在或不属于指定 `RegistryId` | 使用 `DescribeInstanceToken` 返回的 `Id` 字段值作为 `--TokenId` |
| `Token` 密码值遗失 | `tccli tcr DescribeInstanceToken --RegistryId 'tcr-example' --region ap-guangzhou` | 查询接口不返回 `Token` 密码值 | 无法找回原始 Token，需删除旧凭证后重新创建（步骤5+步骤2） |
| 多个 Token 管理混乱 | `tccli tcr DescribeInstanceToken --RegistryId 'tcr-example' --region ap-guangzhou --output json` 审计列表 | 创建时未填写 `Desc`，或凭证数量过多 | 创建时填写有意义的 `Desc`，定期审计并清理无用 Token |
| TKE 插件或 CODING DevOps 自动创建的凭证删除被拒 | — | 凭证由外部服务自动创建并关联 | 先解除 TKE 集群关联或 CODING DevOps 集成，再删除凭证 |
| `CreateInstanceToken` 返回 `InvalidParameterValue` | — | `TokenType` 参数值非法（非 `temp` 或 `longterm`） | 确认 `--TokenType` 小写，值为 `temp` 或 `longterm` |
| `docker login` 提示 `Error saving credentials` | `docker --version` | Docker credential helper 配置问题 | 检查 `~/.docker/config.json` 中的 `credsStore` 设置，或使用 `--password-stdin` 替代 |

## 下一步

- [服务级账号管理](../service-credentials)（page_id `89137`）——创建命名空间级权限隔离的机器人账号
- [基于 CAM 管理子账号权限](../permissions/cam-subaccount)——管理子账号的 TCR 操作权限
- [管理命名空间](../../image-creation/namespace)——创建命名空间后使用 Token 推送镜像
- [获取实例访问域名](../../create)——确认 `PublicDomain` 用于 `docker login`

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 选择实例 → **访问凭证** → **新建访问凭证** → 填写描述 → 确认后**立即复制生成的 Token**（仅显示一次）。在凭证列表中可启用、禁用或删除凭证。
