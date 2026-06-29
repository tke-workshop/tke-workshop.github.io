---
title: "触发器（Webhook）（tccli）"
description: "· page_id `44369`"
---

> 对照官方：[触发器（Webhook）](https://cloud.tencent.com/document/product/1141/44369) · page_id `44369`

## 概述

TCR 企业版支持配置 Webhook 触发器，在镜像推送/拉取/删除或 Helm Chart 推送/拉取/删除时自动向指定 URL 发起 HTTP POST 请求，便于接入 CI/CD 流程实现自动部署等 DevOps 场景。

触发器支持的 `EventTypes`：

| 事件类型 | 说明 |
|---------|------|
| `pushImage` | 推送镜像 |
| `pullImage` | 拉取镜像 |
| `deleteImage` | 删除镜像 |
| `chartPush` | 推送 Helm Chart |
| `chartPull` | 拉取 Helm Chart |
| `chartDelete` | 删除 Helm Chart |

`Condition` 字段为字符串类型，支持事件类型过滤（如 `"pushImage"`）或 JSON 格式的正则过滤（含命名空间、仓库名、Tag 匹配规则）。

> **注意：** 本功能仅适用于 **TCR 企业版**实例。个人版不支持。

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:CreateWebhookTrigger, tcr:DescribeWebhookTrigger, tcr:ModifyWebhookTrigger
#    tcr:DeleteWebhookTrigger, tcr:DescribeWebhookTriggerLog
# 验证：执行 DescribeWebhookTrigger 确认权限
tccli tcr DescribeWebhookTrigger --region <Region> --RegistryId <RegistryId> --Limit 1
# expected: exit 0，返回触发器列表（可为空）
```

### 资源检查

```bash
# 4. 确认实例存在且状态为 Running
tccli tcr DescribeInstances --region <Region> --RegistryIds '["<RegistryId>"]'
# expected: Status 为 "Running"

# 5. 确认命名空间存在 — 触发器必须在已有命名空间下创建
tccli tcr DescribeNamespaces --region <Region> --RegistryId <RegistryId>
# expected: 至少有一个命名空间，记录目标 NamespaceName

# 6. 确认 Webhook 目标 URL 已就绪（可选，但未就绪则触发时请求失败）
# 触发器创建时不校验目标 URL 可达性，建议先用 curl 验证
curl -X POST -I <WebhookURL>
# expected: HTTP 响应（2xx 或 4xx 均可，证明可达）
```

## 关键字段说明

以下说明 `CreateWebhookTrigger` 中 `--Trigger` JSON 的主要字段。完整参数定义见 API 文档。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `Name` | String | 是 | 规则名称，支持小写字母、数字及 `-`、`.`、`_`，须以字母数字开头。同命名空间下不可重复 | 缺此字段 → `InvalidParameter.ErrorTcrInvalidParameter`："Name: non zero value required" |
| `Enabled` | Boolean | 是 | `true`（启用）或 `false`（禁用） | 缺此字段 → `InvalidParameter.ErrorTcrInvalidParameter`："Enabled: non zero value required" |
| `Targets` | Array | 是 | Webhook 目标列表。每个元素含 `Address`（目标 URL，String）和可选 `Headers`（Array，每项含 `Key` 和 `Values`） | 空数组或格式错误 → 创建失败 |
| `EventTypes` | Array | 是 | 触发事件类型数组，枚举值：`pushImage`、`pullImage`、`deleteImage`、`chartPush`、`chartPull`、`chartDelete` | 无此字段 → 创建失败 |
| `Condition` | **String** | 是 | 触发条件字符串。简单场景填事件类型（如 `"pushImage"`）；高级场景填 JSON 字符串（含 `EventType` 和 `Filter` 对象）。**注意：Condition 是 String 类型，不是 Object** | 填成 Object → `InvalidParameter`："Trigger.Condition 取值类型错误。参数类型应为 string" |
| `Description` | String | 否 | 规则描述，支持中文 | — |

> **重要：** `--Namespace` 是 CLI 顶层独立参数，**不在 `--Trigger` JSON 内部**。缺少此参数将导致命令失败。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看触发器列表 | `tccli tcr DescribeWebhookTrigger --RegistryId <RegistryId>` | 是 |
| 新建触发器 | `tccli tcr CreateWebhookTrigger --RegistryId <RegistryId> --Trigger '{...}' --Namespace <NamespaceName>` | 否（同名冲突） |
| 修改触发器 | `tccli tcr ModifyWebhookTrigger --RegistryId <RegistryId> --Trigger '{...}' --Namespace <NamespaceName>` | 是 |
| 删除触发器 | `tccli tcr DeleteWebhookTrigger --RegistryId <RegistryId> --Id <Id> --Namespace <NamespaceName>` | 否 |
| 查看触发日志 | `tccli tcr DescribeWebhookTriggerLog --RegistryId <RegistryId> --Id <Id> --Namespace <NamespaceName>` | 是 |

## 操作步骤

### 1. 创建触发器

#### 选择依据

- **EventTypes**：按实际需求选择事件类型。常见场景：CI/CD 镜像构建完成后触发自动部署 → 选 `pushImage`；镜像版本淘汰 → 选 `deleteImage`。
- **Condition**：简单场景用事件类型字符串（如 `"pushImage"`），高级场景用 JSON 字符串做正则过滤（按命名空间、仓库名、Tag 过滤）。
- **Namespace**：`--Namespace` 是 CLI 顶层独立参数，传命名空间名称（非 ID）。不是 `--Trigger` JSON 的一部分。

#### 最小创建（仅必填字段，监听 pushImage 事件）

```bash
tccli tcr CreateWebhookTrigger \
    --RegistryId '<RegistryId>' \
    --Trigger '{"Name":"<TriggerName>","Enabled":true,"Targets":[{"Address":"<WebhookURL>"}],"EventTypes":["pushImage"],"Condition":"pushImage"}' \
    --Namespace '<NamespaceName>' \
    --region <Region>
# expected: exit 0，返回 Trigger 对象含 Id
```

```json
{
    "Trigger": {
        "Name": "rewrite-test-webhook",
        "Id": 1,
        "Enabled": true,
        "EventTypes": ["pushImage", "pullImage"],
        "Condition": "pushImage"
    },
    "RequestId": "06af6288-50d6-4585-a2ba-8245ecd15107"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<RegistryId>` | 实例 ID | 格式 `tcr-xxxxxxxx` | `tccli tcr DescribeInstances --region <Region>` |
| `<TriggerName>` | 触发器名称 | 支持小写字母、数字及 `-`、`.`、`_`，须以字母数字开头 | 自定义，同命名空间不可重复 |
| `<WebhookURL>` | Webhook 目标 URL | 完整 HTTP/HTTPS 地址 | 由 Webhook Server 提供 |
| `<NamespaceName>` | 命名空间名称 | 已存在的命名空间 | `tccli tcr DescribeNamespaces --region <Region> --RegistryId <RegistryId>` |
| `<Region>` | 地域 | 如 `ap-guangzhou` | `tccli tcr DescribeRegions` |

#### 增强配置（多事件 + 自定义 Header）

```bash
tccli tcr CreateWebhookTrigger \
    --RegistryId '<RegistryId>' \
    --Trigger '{"Name":"<TriggerName>","Enabled":true,"Targets":[{"Address":"<WebhookURL>","Headers":[{"Key":"X-Custom-Auth","Values":["<AuthToken>"]}]}],"EventTypes":["pushImage","pullImage","deleteImage"],"Condition":"pushImage","Description":"生产环境自动部署触发器"}' \
    --Namespace '<NamespaceName>' \
    --region <Region>
# expected: exit 0，返回 Trigger 对象含 Id
```

#### 高级过滤（Condition 用 JSON 字符串做正则匹配）

```bash
tccli tcr CreateWebhookTrigger \
    --RegistryId '<RegistryId>' \
    --Trigger '{"Name":"<TriggerName>","Enabled":true,"Targets":[{"Address":"<WebhookURL>"}],"EventTypes":["pushImage"],"Condition":"{\"EventType\":\"pushImage\",\"Filter\":{\"Namespace\":\"<NsName>\",\"Repositories\":[\"<RepoName>\"],\"Tags\":[\"v[0-9]+.*\"]}}"}' \
    --Namespace '<NamespaceName>' \
    --region <Region>
# expected: exit 0，返回 Trigger 对象含 Id
```

> **注意**：当 `Condition` 包含 JSON 内容时，需对内部引号做转义（`\"`）。因为 Shell 中 `'...'` 单引号内的双引号不需要转义，但 JSON 内的 `"` 在整个 `--Trigger` 值里已经是合法的 JSON 字符串字段值，只需确保 Condition 的值整体是合法 JSON 字符串即可。

### 2. 查看触发器列表

列出指定实例的所有触发器：

```bash
tccli tcr DescribeWebhookTrigger \
    --RegistryId '<RegistryId>' \
    --Limit 20 \
    --Offset 0 \
    --region <Region>
# expected: exit 0，返回触发器列表
```

```json
{
    "TotalCount": 0,
    "Triggers": [],
    "RequestId": "d5d75baf-bd9c-4aff-9fb3-288c9eca5925"
}
```

按命名空间过滤：

```bash
tccli tcr DescribeWebhookTrigger \
    --RegistryId '<RegistryId>' \
    --Namespace '<NamespaceName>' \
    --region <Region>
# expected: exit 0，返回该命名空间下的触发器列表
```

### 3. 修改触发器

修改触发器的任意参数（名称、事件类型、启用状态、目标 URL 等）。`--Trigger` JSON 内需包含 `Id` 字段以标识目标规则。`Id` 来自 `DescribeWebhookTrigger` 输出的 `Id` 字段：

```bash
tccli tcr ModifyWebhookTrigger \
    --RegistryId '<RegistryId>' \
    --Trigger '{"Id":<TriggerId>,"Name":"<NewName>","Enabled":true,"Targets":[{"Address":"<NewWebhookURL>","Headers":[{"Key":"X-Custom","Values":["<Val>"]}]}],"EventTypes":["pushImage","pullImage"],"Condition":"pushImage","Description":"修改后的触发器"}' \
    --Namespace '<NamespaceName>' \
    --region <Region>
# expected: exit 0
```

```json
{
    "RequestId": "<UUID>"
}
```

### 4. 删除触发器

**`--Id`**（非 `--TriggerId`）来自 `DescribeWebhookTrigger` 输出中的 `Id` 字段。`--Namespace` 为必填顶层参数：

```bash
tccli tcr DeleteWebhookTrigger \
    --RegistryId '<RegistryId>' \
    --Id <TriggerId> \
    --Namespace '<NamespaceName>' \
    --region <Region>
# expected: exit 0
```

```json
{
    "RequestId": "d11b2944-ead8-4837-88ee-cb759d56c3ef"
}
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `<TriggerId>` | 触发器数字 ID | `tccli tcr DescribeWebhookTrigger --RegistryId <RegistryId> --Namespace <NamespaceName> --region <Region>` 输出中的 `Id` 字段 |

### 5. 查看触发日志

查看指定触发器的触发历史记录。`--Id` 为必填参数，`--Namespace` 为必填参数：

```bash
tccli tcr DescribeWebhookTriggerLog \
    --RegistryId '<RegistryId>' \
    --Id <TriggerId> \
    --Namespace '<NamespaceName>' \
    --region <Region>
# expected: exit 0，返回触发日志列表
```

```json
{
    "TotalCount": 2,
    "Logs": [
        {
            "Id": 1001,
            "TriggerId": 1,
            "EventType": "pushImage",
            "Repository": "team-a/nginx",
            "Tag": "v1.10.0",
            "Status": "SUCCESS",
            "CreationTime": "2025-06-03 14:30:00 +0800 CST",
            "Detail": "HTTP 200 OK"
        },
        {
            "Id": 1002,
            "TriggerId": 1,
            "EventType": "pushImage",
            "Repository": "team-a/nginx",
            "Tag": "v1.9.0",
            "Status": "FAILED",
            "CreationTime": "2025-06-03 13:00:00 +0800 CST",
            "Detail": "HTTP 500 Internal Server Error"
        }
    ],
    "RequestId": "<UUID>"
}
```

**日志字段说明：**

| 字段 | 说明 |
|------|------|
| `TriggerId` | 所属触发器 ID |
| `EventType` | 触发事件类型 |
| `Repository` | 产生触发的仓库（`namespace/repo` 格式） |
| `Tag` | 触发版本的 Tag |
| `Status` | 执行状态：`SUCCESS`（成功）、`FAILED`（失败） |
| `Detail` | 请求结果详情（HTTP 状态码或错误信息） |

## 验证

### Control plane (tccli)

```bash
# 确认触发器存在且配置正确
tccli tcr DescribeWebhookTrigger \
    --RegistryId '<RegistryId>' \
    --Namespace '<NamespaceName>' \
    --region <Region>
# expected: 目标触发器 Enabled 为 true，EventTypes 和 Condition 符合预期

# 查看触发日志确认已有事件触发
tccli tcr DescribeWebhookTriggerLog \
    --RegistryId '<RegistryId>' \
    --Id <TriggerId> \
    --Namespace '<NamespaceName>' \
    --region <Region>
# expected: 返回日志列表，Status 为 SUCCESS 或 FAILED（取决于目标 URL 可达性）
```

验证维度：

| 维度 | 命令 | 预期 |
|------|------|------|
| 存在性 | `DescribeWebhookTrigger --Namespace <NamespaceName>` | 目标触发器在列表中 |
| 启用状态 | 同上，检查 `Enabled` | `true` |
| 事件类型 | 同上，检查 `EventTypes` | 与创建时指定的一致 |
| 触发日志 | `DescribeWebhookTriggerLog --Id <TriggerId>` | 有日志记录，确认触发器已响应事件 |

## 清理

### Control plane (tccli)

> **注意**：删除触发器不会影响已发出的 Webhook 请求。删除操作不可逆，确认 `Id` 正确后再执行。

```bash
# 清理前确认目标触发器
tccli tcr DescribeWebhookTrigger \
    --RegistryId '<RegistryId>' \
    --Namespace '<NamespaceName>' \
    --region <Region>
# 确认 Id 与待删除的一致

# 删除触发器
tccli tcr DeleteWebhookTrigger \
    --RegistryId '<RegistryId>' \
    --Id <TriggerId> \
    --Namespace '<NamespaceName>' \
    --region <Region>
# expected: exit 0

# 验证已删除
tccli tcr DescribeWebhookTrigger \
    --RegistryId '<RegistryId>' \
    --Namespace '<NamespaceName>' \
    --region <Region>
# expected: 目标触发器不再出现在列表中
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateWebhookTrigger` 返回 `the following arguments are required: --Namespace` | 检查 CLI 命令中是否有 `--Namespace` 参数 | `--Namespace` 是 CLI 顶层独立参数，**不在 `--Trigger` JSON 内部**。漏写导致 tccli 参数验证失败 | 在 CLI 命令中加上 `--Namespace '<NamespaceName>'`，作为独立参数（与 `--RegistryId`、`--Trigger` 并列） |
| `CreateWebhookTrigger` 返回 `InvalidParameter.ErrorTcrInvalidParameter` 提示 "Name: non zero value required" | 检查 `--Trigger` JSON 中是否包含 `Name` 字段 | `Name` 为 Trigger JSON 的必填字段 | 确保 Trigger JSON 包含 `"Name":"<TriggerName>"` |
| `CreateWebhookTrigger` 返回 `InvalidParameter.ErrorTcrInvalidParameter` 提示 "Enabled: non zero value required" | 检查 `--Trigger` JSON 中是否包含 `Enabled` 字段 | `Enabled` 为 Trigger JSON 的必填字段 | 确保 Trigger JSON 包含 `"Enabled":true` 或 `"Enabled":false` |
| `CreateWebhookTrigger` 返回 `InvalidParameter` 提示 "Trigger.Condition 取值类型错误。参数类型应为 string" | 检查 `Condition` 是否为 JSON 对象（`{...}`）而非字符串（`"..."`） | `Condition` 是 **String 类型**，不能传 Object。若写成 `"Condition":{"EventType":"pushImage"}` 会触发此错误 | 将 Condition 改为字符串：简单场景用 `"Condition":"pushImage"`，高级场景用 JSON 字符串 `"Condition":"{\"EventType\":\"pushImage\",\"Filter\":{...}}"` |
| `CreateWebhookTrigger` 返回 `InternalError.ErrorTcrInternal` 内嵌 "notification policy named ... already exists" | `tccli tcr DescribeWebhookTrigger --RegistryId <RegistryId> --Namespace <NamespaceName> --region <Region>` 查看已有触发器名称 | 同一命名空间下触发器名称不可重复（注：TCR 将此错误包装在 `InternalError.ErrorTcrInternal` 内，实际根因在嵌套 JSON 的 error message 中） | 修改 `Name` 字段为唯一名称 |
| `DeleteWebhookTrigger` 返回 `the following arguments are required: --Namespace, --Id` | 检查 CLI 命令中是否用了 `--TriggerId` 而非 `--Id` | **删除参数是 `--Id`，不是 `--TriggerId`**。同时 `--Namespace` 也是删除操作的必填参数 | 使用 `--Id <TriggerId> --Namespace '<NamespaceName>'` 替代 `--TriggerId` |
| `DeleteWebhookTrigger` 返回 `InternalError.ErrorTcrInternal` 内嵌 "notificationPolicy ... not found" | `tccli tcr DescribeWebhookTrigger --RegistryId <RegistryId> --Offset 0 --Limit 50 --region <Region>` 确认 ID 是否存在 | 触发器 ID 不存在（注：TCR 将此错误包装在 `InternalError.ErrorTcrInternal` 内，非独立 `ResourceNotFound` 错误码） | 通过 `DescribeWebhookTrigger` 确认正确的 `Id` |

### 创建成功但行为异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 触发器已创建但不触发 | `tccli tcr DescribeWebhookTriggerLog --RegistryId <RegistryId> --Id <TriggerId> --Namespace <NamespaceName> --region <Region>` 查看触发日志 | `Condition` 正则不匹配实际事件、`Enabled` 为 `false`、或目标 URL 不可达 | 检查 `Condition` 过滤条件是否匹配；确认 `Enabled: true`；用 `curl -X POST <WebhookURL>` 验证目标 URL 可达性 |
| 触发日志显示 `FAILED` | 查看触发日志中 `Detail` 字段 | 目标 URL 返回非 2xx HTTP 状态码（如 500） | 检查 Webhook Server 端日志，确认服务正常处理 POST 请求 |
| 触发器已达配额上限 | — | 单实例触发器数量受限 | 先删除不再使用的触发器 |
| CAM 权限拒绝 | — | 子账号缺少触发器操作权限 | 确认子账号已配置 `tcr:CreateWebhookTrigger`、`tcr:ModifyWebhookTrigger`、`tcr:DescribeWebhookTrigger`、`tcr:DeleteWebhookTrigger` 等权限 |

> **关于 TCR 错误码包装**：TCR 将部分域名错误（如触发器名字重复、ID 不存在）统一包装在 `InternalError.ErrorTcrInternal`（或 `InternalError.ErrorTcrUnauthorized`）通用错误码内，而非返回独立的语义化错误码（如 `InvalidParameter.ErrTriggerExist`、`ResourceNotFound.ErrNoTrigger`）。排障时需查看嵌套 JSON 中的 message 文本获取实际错误原因。

## Webhook 请求格式参考

触发器执行时，向目标 URL 发送的 HTTP POST 请求 Body 格式如下：

```json
{
    "type": "pushImage",
    "occur_at": 1589106605,
    "event_data": {
        "resources": [
            {
                "digest": "sha256:89a42c3ba15f09a3fbe39856bddacdf9e94cd03df7403cad4fc105xxxx268fc9",
                "tag": "v1.10.0",
                "resource_url": "xxx-bj.tencentcloudcr.com/public/nginx:v1.10.0"
            }
        ],
        "repository": {
            "date_created": 1587119137,
            "name": "nginx",
            "namespace": "public",
            "repo_full_name": "public/nginx",
            "repo_type": "public"
        }
    },
    "operator": "332133xxxx"
}
```

## 下一步

- [自动删除镜像版本](../../../image-cleanup/auto-delete)
- [容器镜像安全扫描](../../../image-security/vulnerability-scan)
- [镜像版本不可变](../../../image-security/immutable-tags)
- [管理命名空间](../../../image-creation/namespace)

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 选择实例 → 左侧导航栏 **触发器** → 单击 **新建**，配置名称、触发动作、命名空间、仓库/版本过滤、目标 URL 和 Header 后确认。在触发器列表可启用/禁用、重新配置或删除规则，单击规则名称查看触发日志。
