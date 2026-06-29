---
title: "容器镜像签名（tccli）"
description: "· page_id `80862`"
---

> 对照官方：[容器镜像签名](https://cloud.tencent.com/document/product/1141/80862) · page_id `80862`

## 概述

通过 `tccli tcr CreateSignaturePolicy` 为 TCR 企业版实例的命名空间配置 KMS 镜像签名策略。签名策略绑定后，新推送至该命名空间的镜像将自动使用腾讯云密钥管理服务（KMS）的非对称密钥完成加签，保障镜像从分发到部署的全链路内容可信。对签名策略创建前已存在的镜像，需通过 `CreateSignature` 手动触发加签。

容器镜像签名功能仅支持 TCR 企业版**高级版（premium）**实例，当前为 Beta 功能。

### 为什么签名功能需要高级版（premium）

签名功能依赖 premium 实例的独占资源链路，基础版（basic）和标准版（standard）均不支持，原因如下：

1. **KMS 基础设施依赖**：镜像签名依赖腾讯云 KMS 的非对称签名验签能力。每次镜像推送触发签名、每次拉取触发验签，均为实时 KMS API 调用，产生 KMS 请求开销。premium 实例的架构预留了 KMS 集成通道。
2. **计算资源差异**：basic 共享计算资源，不承载额外的 KMS 加解密链路。premium 提供独占计算资源配额，保障签名/验签的吞吐与低延迟。
3. **产品功能分层**：basic = 核心镜像托管（push/pull），standard = + 安全扫描 + 部署阻断，premium = + 镜像签名 + 跨地域同步 + 复制实例。签名处于安全链最顶端，是标准版功能的增强，而非替代。
4. **成本模型**：KMS API 调用按量计费，premium 定价中已内嵌 KMS 签名调用成本预算。basic/standard 的定价模型未包含此部分成本。

## 前置条件

- [环境准备](../../../index.md)
- 已完成 [创建企业版实例](../../create)，实例 `RegistryType` 为 `premium`，`Status` 为 `Running`
- 已 [创建命名空间](../../image-creation/namespace)
- 已开通 [密钥管理服务（KMS）](https://cloud.tencent.com/document/product/573/38406)
- 已配置 `TCR_QCSRole` 角色对 KMS 的访问权限
- 如使用子账号操作，需授予 `tcr:CreateSignaturePolicy`、`tcr:DeleteSignaturePolicy`、`tcr:CreateSignature`、`tcr:DescribeNamespaces` 权限，参见 [企业版授权方案示例](https://cloud.tencent.com/document/product/1141/41417)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域（如 ap-guangzhou）

# 3. 确认实例类型为 premium（签名功能仅支持高级版）
tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --output json | jq '.Registries[0].RegistryType'
# expected: "premium"

# 4. 确认命名空间已存在
tccli tcr DescribeNamespaces --RegistryId <RegistryId> --NamespaceName <NamespaceName> --region <Region>
# expected: exit 0，目标命名空间在 NamespaceList 中

# 5. 确认 KMS 服务可用
tccli kms ListKey --MatchKeyid "" --region <KmsRegion> --output json | jq '.TotalCount'
# expected: exit 0，返回 KMS 密钥总数（可为 0）
```

> 若步骤 3 返回 `"basic"` 或 `"standard"`，需先升级实例至 premium：`tccli tcr ModifyInstance --RegistryId <RegistryId> --RegistryType premium --region <Region>`。升级后 `Status` 回到 `Running` 即可使用签名功能。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 / 参数 | 幂等 |
|-----------|------------------|:--:|
| 选择地域（控制台顶部菜单） | `--region <Region>` | 是 |
| 查看实例类型 | `DescribeInstances --Registryids '["<RegistryId>"]'` | 是 |
| 列出已绑定签名策略的命名空间 | `DescribeNamespaces --KmsSignPolicy true` | 是 |
| 查看命名空间签名策略详情 | `DescribeNamespaces --NamespaceName <NamespaceName>`（读 `Metadata` 中 `kms_sign` 字段） | 是 |
| 新建签名策略 | `CreateSignaturePolicy --Name --NamespaceName --KmsId --KmsRegion --Disabled` | 是（同名同参数重复创建成功） |
| 对已有镜像手动触发签名 | `CreateSignature --RepositoryName --ImageVersion` | 是 |
| 删除签名策略 | `DeleteSignaturePolicy --NamespaceName` | 是（删除不存在的策略也返回成功） |

## 关键字段说明

以下说明 `CreateSignaturePolicy` 的主要参数。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | 企业版实例 ID，格式 `tcr-xxxxxxxx`，须为 premium 类型 | basic/standard 实例 → `UnsupportedOperation` |
| `Name` | String | 是 | 策略名称，2--50 字符，仅小写字母、数字及分隔符 `._-/`，不能以分隔符开头、结尾或连续 | 非法值 → `InvalidParameter` |
| `NamespaceName` | String | 是 | 已存在的命名空间名称。**一个命名空间仅支持一个签名策略** | 命名空间不存在 → `ResourceNotFound.TcrResourceNotFound`；已有策略 → 覆盖更新 |
| `KmsId` | String | 是 | KMS 密钥 ID。仅支持**非对称签名验签 RSA_2048**（`KeyUsage: ASYMMETRIC_SIGN_VERIFY_RSA_2048`） | 密钥用途为 `ENCRYPT_DECRYPT` → 签名无效；空值 → `InvalidParameter.ErrorTcrInvalidParameter` |
| `KmsRegion` | String | 是 | KMS 密钥所在地域，如 `ap-guangzhou`。建议与 TCR 实例同地域以降低延迟 | 不匹配 → 签名调用失败 |
| `Domain` | String | 否 | 用户自定义域名，为空时使用 TCR 实例默认域名生成签名 | — |
| `Disabled` | Boolean | 否 | 是否禁用策略，默认 `false`（启用）。`true` = 策略暂停生效，`false` = 策略启用 | — |

> **注意**：`CreateSignaturePolicy` 的启用/禁用控制参数为 `--Disabled`（默认 `false` 即启用），**不是** `--Enabled`。`--Enabled` 不是有效参数，传入会报 `Unknown options: --Enabled`。

## 操作步骤

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<RegistryId>` | 实例 ID | 格式 `tcr-xxxxxxxx`，须为 premium | `tccli tcr DescribeInstances` |
| `<NamespaceName>` | 命名空间名称 | 已存在，每个命名空间仅支持一个签名策略 | `tccli tcr DescribeNamespaces` |
| `<KmsId>` | KMS 密钥 ID | 用途必须为 `ASYMMETRIC_SIGN_VERIFY_RSA_2048` | `tccli kms CreateKey` 返回的 `KeyId` |
| `<KmsRegion>` | KMS 密钥所在地域 | 如 `ap-guangzhou`，建议与实例同地域 | 创建密钥时指定的 `--region` |
| `<SignaturePolicyName>` | 签名策略名称 | 2--50 字符，仅小写字母、数字及 `._-/` | 自定义 |
| `<Region>` | TCR 实例地域 | 如 `ap-guangzhou` | `tccli tcr DescribeRegions` |
| `<RepositoryName>` | 镜像仓库名称 | 格式 `<NamespaceName>/<RepoName>` | `tccli tcr DescribeRepositories` |
| `<ImageVersion>` | 镜像版本 tag | 如 `v1.0.0` | `tccli tcr DescribeImages` |

### 步骤1：创建 KMS 非对称签名验签密钥

容器签名功能要求 KMS 密钥用途为**非对称签名验签**，算法为 **RSA_2048**。普通加密密钥（`ENCRYPT_DECRYPT`）不可用。

```bash
tccli kms CreateKey \
    --KeyUsage ASYMMETRIC_SIGN_VERIFY_RSA_2048 \
    --Alias "tcr-signing-key" \
    --region <KmsRegion> \
    --output json
# expected: exit 0，返回 KeyId 和 KeyState: "Enabled"
```

**输出**：

```json
{
    "KeyId": "7c99b7de-6afb-11f1-9b26-525400f27fe5",
    "Alias": "tcr-signing-key",
    "CreateTime": 1781776378,
    "Description": "",
    "KeyState": "Enabled",
    "KeyUsage": "ASYMMETRIC_SIGN_VERIFY_RSA_2048",
    "TagCode": 0,
    "TagMsg": "",
    "HsmClusterId": "",
    "RequestId": "b6b7cf67-1aec-46d0-92a4-fc264f07bf89"
}
```

> 记录返回的 `KeyId`（示例 `7c99b7de-6afb-11f1-9b26-525400f27fe5`），后续 `CreateSignaturePolicy` 的 `--KmsId` 参数使用此值。
>
> 也可在 [KMS 控制台](https://console.cloud.tencent.com/kms2) → **密钥管理 > 用户密钥** → **新建**，选择**非对称签名验签**用途、**RSA_2048** 算法。
>
> 建议将 KMS 密钥和 TCR 实例放在相同地域，降低跨地域通信开销。

### 步骤2：授权 TCR_QCSRole 访问 KMS

TCR 服务需要通过 `TCR_QCSRole` 角色调用 KMS API 完成签名。需在 CAM 中为该角色关联 `QcloudKMSFullAccess` 预设策略：

```bash
tccli cam AttachRolePolicy \
    --AttachRoleName TCR_QCSRole \
    --PolicyName QcloudKMSFullAccess \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

**输出**：

```json
{
    "RequestId": "0e93cff0-6aa7-4c6c-97ab-b403bc90bf74"
}
```

> 也可登录 [访问管理控制台](https://console.cloud.tencent.com/cam/overview) → **角色** → **TCR_QCSRole** → 关联预设策略 `QcloudKMSFullAccess`。
>
> 此操作幂等——重复关联已绑定的策略不会报错。

### 步骤3：创建镜像签名策略

为命名空间创建签名策略。策略创建后对新推送的镜像**立即生效**——推送镜像到仓库时自动匹配策略并加签。

```bash
tccli tcr CreateSignaturePolicy \
    --RegistryId <RegistryId> \
    --Name <SignaturePolicyName> \
    --NamespaceName <NamespaceName> \
    --KmsId <KmsId> \
    --KmsRegion <KmsRegion> \
    --Disabled false \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

**输出**：

```json
{
    "RequestId": "0b0d90ff-a9be-40b1-b801-111439dc357c"
}
```

> **注意**：
>
> - 启用参数为 `--Disabled false`（默认值，可省略）。`--Enabled` 不是有效参数，传入会报错。
> - 签名策略对仓库中**已存在的镜像不生效**，需手动触发签名（见[步骤5](#步骤5对已有镜像手动触发签名)）。
> - 一个命名空间仅支持一个签名策略。对已有策略的命名空间再次创建，会覆盖更新原有策略。

也可使用 `--cli-input-json` 传入完整 JSON：

```bash
tccli tcr CreateSignaturePolicy \
    --cli-input-json '{"RegistryId":"<RegistryId>","Name":"<SignaturePolicyName>","NamespaceName":"<NamespaceName>","KmsId":"<KmsId>","KmsRegion":"<KmsRegion>","Disabled":false}' \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

### 步骤4：验证策略已绑定（DescribeNamespaces --KmsSignPolicy true）

TCR 没有 `DescribeSignaturePolicy` API（见[排障 - API 缺口](#api-缺口)）。使用 `DescribeNamespaces --KmsSignPolicy true` 筛选已绑定签名策略的命名空间作为变通验证方案：

```bash
tccli tcr DescribeNamespaces \
    --RegistryId <RegistryId> \
    --KmsSignPolicy true \
    --region <Region> \
    --output json
# expected: exit 0，NamespaceList 含目标命名空间，TotalCount >= 1
```

**输出**：

```json
{
    "NamespaceList": [
        {
            "Name": "spegel",
            "CreationTime": "2026-05-20T12:37:32Z",
            "Public": true,
            "NamespaceId": 4,
            "TagSpecification": {
                "ResourceType": "namespace",
                "Tags": []
            },
            "Metadata": [
                {
                    "Key": "prevent_vul",
                    "Value": "false"
                },
                {
                    "Key": "public",
                    "Value": "true"
                },
                {
                    "Key": "auto_scan",
                    "Value": "false"
                },
                {
                    "Key": "kms_sign",
                    "Value": "{\"name\":\"tcr-sig-policy\",\"domain\":\"\",\"kms_id\":\"7c99b7de-6afb-11f1-9b26-525400f27fe5\",\"kms_region\":\"ap-guangzhou\",\"disabled\":false,\"create_at\":\"2026-06-18T17:53:08.725330486+08:00\"}"
                }
            ],
            "CVEWhitelistItems": [],
            "AutoScan": false,
            "PreventVUL": false,
            "Severity": ""
        }
    ],
    "TotalCount": 1,
    "RequestId": "e09fffbd-f280-4edd-a104-386e3ebfa6b8"
}
```

签名策略详情存储在命名空间的 `Metadata` 中，`Key` 为 `kms_sign`，`Value` 为 JSON 字符串：

| kms_sign 字段 | 说明 |
|---------------|------|
| `name` | 策略名称（对应 `--Name` 参数） |
| `domain` | 签名域名（对应 `--Domain` 参数，空字符串表示使用实例默认域名） |
| `kms_id` | KMS 密钥 ID（对应 `--KmsId` 参数） |
| `kms_region` | KMS 密钥所在地域（对应 `--KmsRegion` 参数） |
| `disabled` | 策略是否禁用（对应 `--Disabled` 参数） |
| `create_at` | 策略创建时间 |

> 也可通过 `--NamespaceName` 精确查询单个命名空间，在其 `Metadata` 中读取 `kms_sign` 字段确认策略绑定状态。

### 步骤5：对已有镜像手动触发签名

签名策略仅对新推送的镜像自动生效。对于策略创建前已推送至仓库的镜像，使用 `CreateSignature` 手动触发加签：

```bash
tccli tcr CreateSignature \
    --RegistryId <RegistryId> \
    --NamespaceName <NamespaceName> \
    --RepositoryName <RepositoryName> \
    --ImageVersion <ImageVersion> \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

**输出**：

```json
{
    "RequestId": "f38dfd36-6abb-490c-b6d3-6fc00b6e089b"
}
```

> `CreateSignature` 为异步操作，返回 `RequestId` 后签名在后台进行。通过 `DescribeImages` 查看镜像的 `KmsSignature` 字段，非空即表示签名已完成。
>
> **前置条件**：命名空间必须已绑定签名策略（步骤3），否则签名无法执行。

### 步骤6：删除签名策略

删除命名空间的签名策略。删除后该命名空间不再自动加签新镜像，且**存量签名数据一并删除**。

```bash
tccli tcr DeleteSignaturePolicy \
    --RegistryId <RegistryId> \
    --NamespaceName <NamespaceName> \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

**输出**：

```json
{
    "RequestId": "db9518fa-3914-4af5-a363-bab0f13e487b"
}
```

> **危险警告**：删除签名策略会同时删除该命名空间内已有的镜像签名数据，可能导致签名验证失败。请确认影响后再操作。
>
> `DeleteSignaturePolicy` 是幂等的——删除不存在的策略也返回成功。

删除后验证策略已移除：

```bash
tccli tcr DescribeNamespaces \
    --RegistryId <RegistryId> \
    --KmsSignPolicy true \
    --region <Region> \
    --output json
# expected: TotalCount: 0，NamespaceList: []
```

**输出**：

```json
{
    "NamespaceList": [],
    "TotalCount": 0,
    "RequestId": "461baea5-ff3f-4f5e-ba78-602802c6cf61"
}
```

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 实例为 premium | `DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --filter "Registries[0].RegistryType"` | `"premium"` |
| 签名策略已绑定 | `DescribeNamespaces --RegistryId <RegistryId> --KmsSignPolicy true --region <Region>` | `TotalCount >= 1`，目标命名空间在 `NamespaceList` 中 |
| 策略详情可读 | `DescribeNamespaces --RegistryId <RegistryId> --NamespaceName <NamespaceName> --region <Region>` | `Metadata` 含 `Key: "kms_sign"`，`Value` 为含策略名称、KmsId 等字段的 JSON |
| KMS 密钥用途正确 | `tccli kms DescribeKey --KeyId <KmsId> --region <KmsRegion> --filter "KeyMetadata.KeyUsage"` | `"ASYMMETRIC_SIGN_VERIFY_RSA_2048"` |
| 镜像已签名 | `DescribeImages --RegistryId <RegistryId> --NamespaceName <NamespaceName> --RepositoryName <RepositoryName> --region <Region>` | `ImageInfoList[].KmsSignature` 非空 |
| 策略已删除 | `DescribeNamespaces --RegistryId <RegistryId> --KmsSignPolicy true --region <Region>` | `TotalCount: 0`，`NamespaceList: []` |

## 清理

### 1. 删除签名策略

```bash
tccli tcr DeleteSignaturePolicy \
    --RegistryId <RegistryId> \
    --NamespaceName <NamespaceName> \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

### 2. 验证策略已删除

```bash
tccli tcr DescribeNamespaces \
    --RegistryId <RegistryId> \
    --KmsSignPolicy true \
    --region <Region> \
    --output json
# expected: TotalCount: 0，NamespaceList: []
```

### 3. 清理 KMS 密钥（可选）

签名策略删除后，KMS 密钥仍保留。如不再使用，可计划删除：

```bash
# 先禁用密钥
tccli kms DisableKey --KeyId <KmsId> --region <KmsRegion> --output json
# expected: exit 0，返回 RequestId

# 计划删除（7 天后执行）
tccli kms ScheduleKeyDeletion --KeyId <KmsId> --PendingWindowInDays 7 --region <KmsRegion> --output json
# expected: exit 0，返回 DeletionDate 和 KeyId
```

> KMS 密钥必须先 `DisableKey` 再 `ScheduleKeyDeletion`，直接计划删除启用状态的密钥会返回 `ResourceUnavailable.CmkShouldBeDisabled` 错误。
>
> CAM 角色策略解绑（`DetachRolePolicy`）不属于 TCR 操作范畴，如需清理请在 [访问管理控制台](https://console.cloud.tencent.com/cam/overview) 完成。`QcloudKMSFullAccess` 为通用预设策略，其他服务可能也在使用，解绑前请确认影响。

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateSignaturePolicy` 返回 `UnsupportedOperation` | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --filter "Registries[0].RegistryType"` 查看 `RegistryType` | 签名策略仅支持 premium 实例，basic/standard 不支持。这是产品能力分层设计——签名需 KMS 非对称密钥集成，依赖 premium 实例的独占计算资源 | 升级实例：`tccli tcr ModifyInstance --RegistryId <RegistryId> --RegistryType premium --region <Region>`，确认 `Status: Running` 后重试 |
| `CreateSignaturePolicy` 返回 `ResourceNotFound.TcrResourceNotFound` 提示 "project not found" | `tccli tcr DescribeNamespaces --RegistryId <RegistryId> --region <Region>` 确认命名空间存在 | `--NamespaceName` 指定的命名空间不存在 | 先 `tccli tcr CreateNamespace` 创建命名空间，再创建签名策略 |
| `CreateSignaturePolicy` 返回 `InvalidParameter.ErrorTcrInvalidParameter` 提示 "KmsId: non zero value required" | 检查 `--KmsId` 是否为空 | KMS 密钥 ID 必填，不能为空字符串 | 先 `tccli kms CreateKey --KeyUsage ASYMMETRIC_SIGN_VERIFY_RSA_2048` 创建密钥，用返回的 `KeyId` 填入 `--KmsId` |
| `tccli` 返回 `Unknown options: --Enabled, true` | 检查命令参数 | `--Enabled` 不是有效参数。启用/禁用控制参数为 `--Disabled`（默认 `false` 即启用） | 使用 `--Disabled false` 启用策略，或 `--Disabled true` 禁用策略 |
| `CreateSignature` 返回错误提示命名空间未绑定策略 | `DescribeNamespaces --KmsSignPolicy true` 确认目标命名空间不在列表中 | 命名空间尚未创建签名策略 | 先执行步骤3创建签名策略，再调用 `CreateSignature` |
| CAM 权限拒绝（`UnauthorizedOperation`） | `tccli cam DescribeRoleList --Filters '{"RoleName":"TCR_QCSRole"}' --region <Region>` 检查角色和策略 | 子账号缺少 TCR 操作权限，或 `TCR_QCSRole` 未授权 KMS 访问 | ① 确保子账号有 `tcr:*` 权限；② `tccli cam AttachRolePolicy --AttachRoleName TCR_QCSRole --PolicyName QcloudKMSFullAccess --region <Region>` |
| KMS 密钥不可用或用途不对 | `tccli kms DescribeKey --KeyId <KmsId> --region <KmsRegion> --filter "KeyMetadata.KeyUsage"` 检查用途 | 签名策略要求 KMS 密钥用途为 `ASYMMETRIC_SIGN_VERIFY_RSA_2048`，`ENCRYPT_DECRYPT` 密钥不可用 | 重新创建正确用途的 KMS 密钥 |
| `ScheduleKeyDeletion` 返回 `ResourceUnavailable.CmkShouldBeDisabled` | 检查密钥状态 | KMS 密钥必须先禁用才能计划删除 | 先 `tccli kms DisableKey --KeyId <KmsId> --region <KmsRegion>`，再 `ScheduleKeyDeletion` |

### API 缺口

| 问题 | 说明 | 应对方式 |
|------|------|---------|
| **无 `DescribeSignaturePolicy` API** | TCR API 清单中仅有 `CreateSignaturePolicy`、`DeleteSignaturePolicy` 和 `CreateSignature`，没有 Read/Describe 类接口。无法通过 CLI 直接查询实例下已创建的签名策略列表 | 变通方案：① `tccli tcr DescribeNamespaces --RegistryId <RegistryId> --KmsSignPolicy true --region <Region>` 列出已绑定签名策略的命名空间；② 通过 `--NamespaceName` 精确查询，读取 `Metadata` 中 `kms_sign` 字段获取策略详情（名称、KmsId、KmsRegion、disabled 状态、创建时间）；③ 通过唯一策略名称自行维护策略清单 |

### 读者常见错误

| 错误 | 后果 | 正确做法 |
|------|------|---------|
| 在 basic/standard 实例上调用 `CreateSignaturePolicy` | 返回 `UnsupportedOperation` | 先 `DescribeInstances` 确认 `RegistryType` 为 `premium`，若非则升级 |
| 使用 `--Enabled true` 参数 | 返回 `Unknown options: --Enabled, true` | 使用 `--Disabled false` 启用策略（`--Disabled` 默认 `false`，可省略） |
| 使用普通加密密钥（`ENCRYPT_DECRYPT`）创建签名策略 | 策略创建可能成功但签名无效 | 仅使用 `KeyUsage: ASYMMETRIC_SIGN_VERIFY_RSA_2048` 的 KMS 密钥 |
| 误以为签名策略对已有镜像生效 | 策略创建后旧镜像无签名 | 策略仅对新推送镜像自动生效；对已有镜像需手动调用 `CreateSignature` |
| 误以为可查询签名策略列表 | 无 `DescribeSignaturePolicy` API | 使用 `DescribeNamespaces --KmsSignPolicy true` 变通查询 |
| 删除策略后仍期望保留签名数据 | 存量签名数据被一并删除 | 删除前确认影响，必要时先导出签名信息 |

## 下一步

- [容器镜像安全扫描](../vulnerability-scan) — 配置自动安全扫描，识别镜像内已知漏洞
- [高危镜像部署阻断](../deployment-block)（page_id `63869`） — 基于扫描结果阻断高危镜像部署（需 standard/premium）
- [容器镜像签名验证](https://cloud.tencent.com/document/product/457/80899) — 在 TKE 集群中使用增强组件 Cerberus 进行自动验签，设置策略在验签失败时阻断镜像部署
- [管理命名空间](../../image-creation/namespace) — 创建和管理命名空间
- [环境准备](../../../index.md) — 返回 TCR 工具链入口

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 选择目标 premium 实例 → 左侧导航栏选择**镜像安全** → **镜像签名** → 单击**新建**，填写策略名称、选择命名空间、选择 KMS 密钥、配置域名，单击**确认**完成创建。在**镜像仓库 > 版本管理**中可手动触发已有镜像的加签操作。在**镜像签名**页面选择策略行，单击**删除**可删除签名策略。
