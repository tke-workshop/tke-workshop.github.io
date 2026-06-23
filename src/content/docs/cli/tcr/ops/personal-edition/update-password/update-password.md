---
title: "更新登录密码"
description: "· page_id `63912`"
---

> 对照官方：[更新登录密码](https://cloud.tencent.com/document/product/1141/63912) · page_id `63912`

## 概述

通过 `tccli tcr ModifyUserPasswordPersonal` 更新 TCR **个人版**全局登录密码。个人版使用账号级统一密码——同一个腾讯云账号在所有地域共享同一套登录凭证，修改后所有地域立即生效。

> **本页仅适用于 TCR 个人版。** 企业版实例使用访问令牌机制，不适用本页。

关键事实：

- `ModifyUserPasswordPersonal` 无 `--region` 参数（个人版 API 为账号级操作，不绑定地域）。
- 密码修改后全地域即时生效，无需在不同地域重复执行。
- 密码修改不影响已缓存的 `docker login` 会话，下次 `docker login` 时需使用新密码。
- 个人版登录用户名为**腾讯云账号 ID**（纯数字串），在 [账号信息](https://console.cloud.tencent.com/developer) 查看。
- **首次使用前必须在控制台初始化个人版实例**，否则 CLI 操作会返回未初始化错误（详见[排障](#排障)）。

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据
tccli configure list
# expected: secretId, secretKey 已配置

# 3. 检查 CAM 权限 — 需要以下 Action
#    tcr:ModifyUserPasswordPersonal, tcr:DescribeUserQuotaPersonal
# 验证：执行 DescribeUserQuotaPersonal 确认账号已初始化
tccli tcr DescribeUserQuotaPersonal
# expected: exit 0，返回 LimitInfo 配额列表
```

**预期输出**（`DescribeUserQuotaPersonal` 成功）：

```json
{
    "Data": {
        "LimitInfo": [
            {"Type": "namespace", "Value": 2000},
            {"Type": "repo", "Value": 10000},
            {"Type": "tag", "Value": 9999},
            {"Type": "trigger", "Value": 10}
        ]
    },
    "RequestId": "23d1f0c4-eaf9-4b8e-973e-36297d5edcf1"
}
```

### 资源检查

```bash
# 4. 确认个人版已在控制台初始化（必须在 CLI 操作前完成）
# 以下命令若返回 "has not initialized user info" 错误，说明尚未初始化
tccli tcr DescribeUserQuotaPersonal
# expected: exit 0（返回配额数据则表示已初始化）
```

> **重要**：个人版需先在控制台完成初始化后才能使用 CLI 操作。若 `DescribeUserQuotaPersonal` 返回 `exit 0` 且包含 `LimitInfo`，即表示已初始化。若返回 "has not initialized user info in the TCR Personal" 错误，需前往 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) 的**实例管理**页面，在个人版实例卡片上单击"初始化密码"完成初始化。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 参数 / 操作 | 幂等 |
|-----------|------------------|:--:|
| 登录控制台 → 选择个人版实例 | 无需指定，个人版为账号全局操作 | — |
| 更多 → 重置登录密码 | `ModifyUserPasswordPersonal` | 是 |
| 输入新密码 | `--Password`（String，必填） | — |
| 确认密码（二次输入） | CLI 无二次确认，执行前仔细核对 | — |
| 单击确定 | API 返回 `RequestId` 即生效 | — |

## 操作步骤

### 步骤 1：更新登录密码

#### 选择依据

- **密码复杂度**：8--16 位，必须同时包含大写字母、小写字母、数字和特殊字符（四类全含）。注意与部分官方文档所述"至少三种"有差异——实跑验证要求四类全含才能通过。
- **个人版无需 `--region`**：`ModifyUserPasswordPersonal` 为账号级 API，不绑定地域。与 `*Personal` 系列其他 API 一致，无需指定地域参数。
- **无二次确认**：CLI 直接提交，无确认步骤。执行前务必确认 `--Password` 值正确，避免误输入导致无法登录。

#### 最小执行

```bash
tccli tcr ModifyUserPasswordPersonal --Password 'NEW_PASSWORD'
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "eac6b301-a322-493a-8e36-83b295459397"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `NEW_PASSWORD` | 新登录密码 | 8--16 位，必须同时包含大写字母、小写字母、数字和特殊字符（四类全含）。不含单引号或双引号字符 | 自定义，建议使用密码管理器生成 |

> **注意事项**：
> - 密码修改后全地域即时生效，无需在不同地域分别修改。
> - `--Password` 含特殊字符时，用单引号包裹避免 Shell 转义。若密码含单引号本身，需用双引号包裹并转义内部 Shell 元字符。建议密码避免含引号字符。
> - 密码修改不影响已缓存的 `docker login` 会话，下次 `docker login` 时需使用新密码。

## 验证

### 控制面（tccli）

`ModifyUserPasswordPersonal` 没有对应的 Read API（无法查询当前密码或上次更新时间），控制面验证方式为通过 `DescribeUserQuotaPersonal` 确认账号状态正常：

```bash
tccli tcr DescribeUserQuotaPersonal
# expected: exit 0，返回 Data.LimitInfo 配额列表（表示账号状态正常，密码修改不影响配额）
```

### 数据面（Docker）

使用新密码执行 `docker login`：

```bash
docker login ccr.ccs.tencentyun.com \
  --username TEN CENT_CLOUD_ACCOUNT_ID \
  --password 'NEW_PASSWORD'
# expected: Login Succeeded
```

| 维度 | 命令 | 预期 |
|------|------|------|
| 新密码生效 | `docker login ccr.ccs.tencentyun.com --username ACCOUNT_ID --password 'NEW_PASSWORD'` | `Login Succeeded` |
| 旧密码失效 | `docker login ccr.ccs.tencentyun.com --username ACCOUNT_ID --password 'OLD_PASSWORD'` | `incorrect username or password` |
| 账号状态正常 | `DescribeUserQuotaPersonal` | exit 0，返回 `Data.LimitInfo` 配额列表 |

## 清理

本操作为密码更新，不产生新增资源，无需清理。

> 若因误操作忘记新密码，可通过控制台重新设置：登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 实例管理 → 个人版实例卡片 → **更多 > 重置登录密码**。

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ModifyUserPasswordPersonal` 返回 `The current login account(ACCOUNT_ID) has not initialized user info in the TCR Personal`，RequestId `a7f3bfce-4760-4eb4-806d-cc5b0803d6ee` | 执行 `tccli tcr DescribeUserQuotaPersonal` 确认是否返回同样错误 | 个人版实例尚未在控制台初始化。首次使用 TCR 个人版前，必须在控制台完成初始化后才能调用 CLI API（包括 `DescribeUserQuotaPersonal` 和 `ModifyUserPasswordPersonal`） | 登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 实例管理 → 个人版实例卡片 → 单击"初始化密码"并按提示设置初始密码。初始化完成后 CLI 操作即可正常使用 |
| `ModifyUserPasswordPersonal` 返回 `MissingParameter` | 检查是否指定了 `--Password` 参数 | 缺少必填参数 `--Password` | 添加 `--Password 'NEW_PASSWORD'` 参数 |
| `ModifyUserPasswordPersonal` 返回 `LimitExceeded.Password` | 检查最近是否频繁修改密码 | API 有频控限制，短时间内多次修改被限频 | 等待数分钟后重试 |
| `ModifyUserPasswordPersonal` 返回 `UnauthorizedOperation` | 执行 `tccli configure list` 确认当前账号类型 | 子账号缺少 `tcr:ModifyUserPasswordPersonal` 权限 | 联系主账号授予 `QcloudTCRFullAccess` 或包含 `tcr:ModifyUserPasswordPersonal` 的自定义策略 |
| `ModifyUserPasswordPersonal` 返回 `AuthFailure` | `tccli configure list` 检查 secretId/secretKey 配置 | API 密钥无效或已过期 | 执行 `tccli configure` 重新配置有效密钥，或前往 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 确认密钥状态 |
| `ModifyUserPasswordPersonal` 返回 `InternalError` | 检查 RequestId 并记录时间点 | 服务端内部异常 | 稍后重试；若持续失败，[提交工单](https://console.cloud.tencent.com/workorder/category) 并附 RequestId |

### 修改成功但登录异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `docker login` 用新密码返回 `incorrect username or password` | 确认用户名是否为腾讯云账号 ID（非子账号名或邮箱）；确认密码不含 Shell 转义字符导致的输入偏差 | 用户名错误或密码 Shell 转义问题 | 用户名为腾讯云账号 ID（[账号信息](https://console.cloud.tencent.com/developer) 查看的纯数字串）；密码含 `$`、`!` 等特殊字符时用单引号包裹 |
| `docker login` 用新密码仍失败，但旧密码也失效 | 等待 30 秒后重试新密码；若仍失败，可能是修改过程中密码未正确提交 | 密码修改操作本身出现问题或 API 端点返回成功但后端未同步 | 重新执行 `ModifyUserPasswordPersonal` 设置新密码，确认 `exit 0` 和 RequestId 后，等待 10 秒再用新密码 `docker login` |
| 密码修改后已有 `docker login` 会话未中断 | 执行 `docker logout ccr.ccs.tencentyun.com` 后重新 `docker login` | 密码修改不影响已缓存的 Docker 本地凭据（此为正常行为，非故障） | 需要时主动 `docker logout` 使旧凭据失效，下次 `docker push`/`pull` 时需用新密码重新登录 |

## 下一步

- [个人版快速入门](../../../quickstart/personal) — 推送/拉取镜像的完整流程
- [设置镜像清理](../image-cleanup) — 配置镜像版本自动清理策略
- [配置访问权限](../配置访问权限) — 管理仓库的访问控制策略
- [个人版接入 CAM 的 API 列表](https://cloud.tencent.com/document/product/1141/41415) — 各 API 对应的 CAM 授权 Action
- [个人版常见问题](https://cloud.tencent.com/document/product/1141/39277) — 常见使用问题及解答

## 控制台替代

[容器镜像服务控制台 → 实例管理](https://console.cloud.tencent.com/tcr)：选择任意地域的个人版实例 → **更多** > **重置登录密码** → 输入并确认新密码 → 单击**确定**。
