---
title: "镜像版本不可变（tccli）"
description: "· page_id `58200`"
---

> 对照官方：[镜像版本不可变](https://cloud.tencent.com/document/product/1141/58200) · page_id `58200`

## 概述

TCR 企业版支持对容器镜像版本启用不可变（immutable）保护。启用后，同一命名空间下匹配规则的镜像 Tag 仅能被成功推送一次，后续对同一 Tag 的 `docker push` 将被拒绝，有效防止生产环境中的版本覆盖事故。

通过 `tccli tcr CreateImmutableTagRules` 创建规则，通过 `RepositoryDecoration` 与 `TagDecoration` 两个维度组合控制规则生效范围：

| 维度 | 枚举值 | 语义 |
|------|--------|------|
| `RepositoryDecoration` | `repoMatches` | **匹配**指定仓库模式生效（带 `repo` 前缀） |
| | `repoExcludes` | **排除**指定仓库模式生效（带 `repo` 前缀） |
| `TagDecoration` | `matches` | **匹配**指定 Tag 模式生效（不带 `repo` 前缀） |
| | `excludes` | **排除**指定 Tag 模式生效（不带 `repo` 前缀） |

> **关键易错点（务必先读）：** `RepositoryDecoration` 的枚举值为 `repoMatches`/`repoExcludes`（带 `repo` 前缀），**不是** `matches`/`excludes`。而 `TagDecoration` 的枚举值为 `matches`/`excludes`（**不带** `repo` 前缀）。两者不对称，传入裸 `matches` 给 `RepositoryDecoration` 将触发校验失败。详见 [排障](#排障)。

规则创建后默认立即生效（`Disabled: false`），同一命名空间可创建多条规则，重叠时以最严格条件为准（任一规则阻断即拒绝推送）。

## 前置条件

- 已 [创建企业版实例](../../create)，实例状态为 `Running`。
- 已配置 `tccli` 凭证（参见 [环境准备](../../../index.md)）。
- 实例内已有目标命名空间（参见 [管理命名空间](../../image-creation/namespace)）。
- 若使用子账号操作，需授予 `tcr:CreateImmutableTagRules`、`tcr:DescribeImmutableTagRules`、`tcr:ModifyImmutableTagRules`、`tcr:DeleteImmutableTagRules` 权限，参见 [企业版授权方案示例](https://cloud.tencent.com/document/product/1141/41417)。

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0（真机实测 3.1.107.1）

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域（如 ap-guangzhou）

# 3. 检查实例状态为 Running
tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --output json
# expected: Status == "Running"

# 4. 检查目标命名空间已存在
tccli tcr DescribeNamespaces --RegistryId <RegistryId> --region <Region> --output json
# expected: NamespaceList 含目标命名空间名称

# 5. 验证 CAM 权限 — 需要以下 Action 名
#    tcr:DescribeImmutableTagRules, tcr:CreateImmutableTagRules
#    tcr:ModifyImmutableTagRules, tcr:DeleteImmutableTagRules
# 验证：执行 DescribeImmutableTagRules 确认权限（via cli-input-json）
tccli tcr DescribeImmutableTagRules --cli-input-json file://check.json --region <Region> --output json
# expected: exit 0，返回 Rules 数组（可为空）
```

> `check.json` 内容为 `{"RegistryId":"<RegistryId>","NamespaceName":"<NamespaceName>"}`。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 / 参数 | 幂等 |
|-----------|------------------|:--:|
| 选择地域（控制台顶部菜单） | `--region <Region>` | 是 |
| 选择实例 | `--RegistryId <RegistryId>` | — |
| 选择命名空间 | `--NamespaceName <NamespaceName>`（via `--cli-input-json`） | — |
| 查看版本不可变规则列表 | `DescribeImmutableTagRules` | 是 |
| 新建规则 — 仓库匹配/排除 | `--Rule.RepositoryDecoration repoMatches/repoExcludes` | 否（重复创建生成多条规则） |
| 新建规则 — 版本匹配/排除 | `--Rule.TagDecoration matches/excludes` | — |
| 新建规则 — 仓库过滤模式 | `--Rule.RepositoryPattern '**'` | — |
| 新建规则 — 版本过滤模式 | `--Rule.TagPattern '**'` | — |
| 新建规则 — 暂不启用 | `--Rule.Disabled true` | — |
| 新建规则（立即购买/确认） | `CreateImmutableTagRules` | 否（重复创建生成多条规则） |
| 编辑规则 | `ModifyImmutableTagRules --RuleId <RuleId> --Rule '{...}'` | 是（重复修改幂等） |
| 启用/禁用规则 | `ModifyImmutableTagRules --Rule.Disabled true/false` | 是 |
| 删除规则 | `DeleteImmutableTagRules --RuleId <RuleId>` | 否 |

## 关键字段说明

以下说明 `CreateImmutableTagRules` / `ModifyImmutableTagRules` 的主要参数。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | 实例 ID，格式 `tcr-xxxxxxxx` | 实例不存在 → `ResourceNotFound`: "registry ... not found" |
| `NamespaceName` | String | 是 | 目标命名空间名称（非 ID）。命名空间不可变，创建规则后不可修改 | 命名空间不存在 → `ResourceNotFound.TcrResourceNotFound`: "namespace ... not found" |
| `Rule.RepositoryPattern` | String | 是 | 仓库匹配模式，支持 `*`（单级）与 `**`（多级）通配符，如 `**` 表示全部仓库 | — |
| `Rule.TagPattern` | String | 是 | Tag 匹配模式，支持 `*`（单级）与 `**`（多级）通配符，如 `v*` 匹配 `v1.0.0` | — |
| `Rule.RepositoryDecoration` | String | 是 | **仅** `repoMatches` 或 `repoExcludes`（带 `repo` 前缀）。**不是** `matches`/`excludes` | 传 `matches` → `InvalidParameter.ErrorTcrInvalidParameter`: "RepositoryDecoration: matches does not validate as in(repoMatches\|repoExcludes)" |
| `Rule.TagDecoration` | String | 是 | `matches` 或 `excludes`（**不带** `repo` 前缀） | 传 `repoMatches` → 校验失败；缺省 → "TagDecoration: non zero value required" |
| `Rule.Disabled` | Boolean | 否 | `true` = 创建后暂不启用，`false` = 立即生效（默认） | — |
| `RuleId` | Integer | 修改/删除时必填 | 规则 ID，来自 `DescribeImmutableTagRules` 输出的 `Rules[].RuleId` | 缺省 → "RuleId: non zero value required" |

## 操作步骤

### 步骤1：查看已有规则

创建前先查看当前命名空间下是否已有规则，避免重复创建（`CreateImmutableTagRules` 不做去重，重复创建会生成多条相同规则）：

```bash
# 推荐：via --cli-input-json（兼容所有 tccli 版本）
tccli tcr DescribeImmutableTagRules \
    --cli-input-json file://describe-rule.json \
    --region <Region> \
    --output json
# expected: exit 0，返回 Rules 数组（可为空）
```

`describe-rule.json`：

```json
{
    "RegistryId": "<RegistryId>",
    "NamespaceName": "<NamespaceName>"
}
```

**输出（命名空间尚无规则）**：

```json
{
    "Rules": [],
    "EmptyNs": null,
    "Total": 0,
    "RequestId": "361f7ce4-fa42-4869-949f-1392a9e7dce1"
}
```

**输出（命名空间已有规则）**：

```json
{
    "Rules": [
        {
            "RepositoryPattern": "**",
            "TagPattern": "**",
            "RepositoryDecoration": "repoMatches",
            "TagDecoration": "matches",
            "Disabled": false,
            "RuleId": 1,
            "NsName": "<NamespaceName>"
        }
    ],
    "EmptyNs": [
        "other-ns-without-rules"
    ],
    "Total": 1,
    "RequestId": "9be15a35-d86c-4f96-b670-f10247562a2c"
}
```

> `EmptyNs` 列出当前实例下尚无任何不可变规则的命名空间。若目标命名空间已有规则，先确认是否需要保留，避免重复创建。

### 步骤2：创建版本不可变规则

`CreateImmutableTagRules` 必填字段较多（`RegistryId`、`NamespaceName`、`Rule` 内 4 个字段），且部分 tccli 版本不接受 `--NamespaceName` 作为直接 CLI flag（详见 [版本差异](#版本差异namespacename-与-namespceid)）。推荐使用 `--cli-input-json` 桥接，兼容性最佳。

#### 版本差异：NamespaceName 与 NamespaceId

| 传参方式 | 真机实测（tccli 3.1.107.1） | 说明 |
|---------|:--:|------|
| `--cli-input-json file://x.json`（JSON 含 `NamespaceName`） | 成功 | **推荐**，所有版本通用，API 接受 `NamespaceName` |
| `--NamespaceName <NS>`（直接 flag） | 失败：`Unknown options: --NamespaceName` | 部分 tccli 版本未将 `NamespaceName` 暴露为 CLI flag |
| `--NamespaceId <NS>`（直接 flag） | 失败：`Unknown options: --NamespaceId` | 部分 tccli 版本未将 `NamespaceId` 暴露为 CLI flag |

> **结论：** 本指南所有命令统一采用 `--cli-input-json` 传参。若你的 tccli 版本支持 `--NamespaceName` 直接 flag，也可改用内联形式（见 [步骤2 示例2](#示例2内联---rule-json-方式)），但需自行验证版本兼容性。API 层面参数名始终为 `NamespaceName`。

#### 场景决策表

| 场景 | RepositoryDecoration | RepositoryPattern | TagDecoration | TagPattern | 典型用途 |
|------|---------------------|-------------------|---------------|------------|---------|
| 保护全部仓库全部版本 | `repoMatches` | `**` | `matches` | `**` | 命名空间内所有 Tag 仅可推送一次 |
| 保护全部仓库的正式版本 | `repoMatches` | `**` | `matches` | `v*` | 所有 `v1.0.0`、`v2.3.1` 等正式版本锁定 |
| 除 latest 外全部不可变 | `repoMatches` | `**` | `excludes` | `latest` | 仅 `latest` 可覆盖，其余 Tag 锁定 |
| 仅保护特定仓库 | `repoMatches` | `prod-*` | `matches` | `*` | `prod-*` 仓库内全部 Tag 锁定 |
| 排除测试仓库 | `repoExcludes` | `test-*` | `matches` | `*` | 除 `test-*` 外的全部 Tag 锁定 |
| 排除测试仓库的 latest | `repoExcludes` | `test-*` | `excludes` | `latest` | 除 `test-*` 仓库的 `latest` 外全部锁定 |

> `RepositoryDecoration` 选 `repoMatches` 表示**匹配**指定模式的仓库生效，选 `repoExcludes` 表示**排除**指定模式的仓库。与 `RepositoryPattern` 通配符（`*` 单级、`**` 多级）组合使用。`TagDecoration` 语义同理，作用于 `TagPattern`。

#### 示例1：最小创建（保护全部仓库全部版本，via cli-input-json）

仅含必填字段，匹配全部仓库的全部 Tag：

`immutable-rule-minimal.json`：

```json
{
    "RegistryId": "<RegistryId>",
    "NamespaceName": "<NamespaceName>",
    "Rule": {
        "RepositoryPattern": "**",
        "TagPattern": "**",
        "RepositoryDecoration": "repoMatches",
        "TagDecoration": "matches",
        "Disabled": false
    }
}
```

```bash
tccli tcr CreateImmutableTagRules \
    --cli-input-json file://immutable-rule-minimal.json \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

**输出**：

```json
{
    "RequestId": "5dbbfb07-595c-4e5f-9150-18b2fc741a4e"
}
```

> `CreateImmutableTagRules` 仅返回 `RequestId`，不返回 `RuleId`。需通过 `DescribeImmutableTagRules` 查询获取 `RuleId`（见 [步骤3](#步骤3查询已创建的规则)）。

#### 示例2：内联 `--Rule` JSON 方式

若你的 tccli 版本支持 `--NamespaceName` / `--Rule` 直接 flag，可使用内联形式。**注意：tccli 3.1.107.1 实测不支持 `--NamespaceName` 直接 flag，此方式需自行验证版本兼容性。**

```bash
tccli tcr CreateImmutableTagRules \
    --RegistryId <RegistryId> \
    --NamespaceName <NamespaceName> \
    --Rule '{"RepositoryPattern":"**","TagPattern":"**","RepositoryDecoration":"repoMatches","TagDecoration":"matches","Disabled":false}' \
    --region <Region>
# expected: exit 0，返回 RequestId
```

> 内联 `--Rule` 的 JSON 必须用单引号包裹，内部双引号转义。若 shell 为 zsh，单引号内 JSON 无需额外转义。

#### 示例3：增强创建（除 latest 外全部锁定 + 暂不启用）

`immutable-rule-enhanced.json`：

```json
{
    "RegistryId": "<RegistryId>",
    "NamespaceName": "<NamespaceName>",
    "Rule": {
        "RepositoryPattern": "**",
        "TagPattern": "latest",
        "RepositoryDecoration": "repoMatches",
        "TagDecoration": "excludes",
        "Disabled": true
    }
}
```

```bash
tccli tcr CreateImmutableTagRules \
    --cli-input-json file://immutable-rule-enhanced.json \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

> `Disabled: true` 下规则创建但不生效，适合先建立规则、确认配置无误后再手动启用（见 [步骤5](#步骤5启用禁用规则)）。

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<RegistryId>` | 实例 ID | 格式 `tcr-xxxxxxxx` | `tccli tcr DescribeInstances --region <Region>` |
| `<NamespaceName>` | 命名空间名称 | 已存在于实例内 | `tccli tcr DescribeNamespaces --RegistryId <RegistryId> --region <Region>` |
| `<Region>` | 地域 | 如 `ap-guangzhou` | `tccli tcr DescribeRegions` 查看可用地域 |
| `<RuleId>` | 规则 ID | 整数，来自查询结果 | `tccli tcr DescribeImmutableTagRules` 输出的 `Rules[].RuleId` |

### 步骤3：查询已创建的规则

创建后查询，获取 `RuleId` 供后续修改/删除使用：

```bash
tccli tcr DescribeImmutableTagRules \
    --cli-input-json file://describe-rule.json \
    --region <Region> \
    --output json
# expected: exit 0，Rules 数组含新规则，RuleId 非零
```

**输出**：

```json
{
    "Rules": [
        {
            "RepositoryPattern": "**",
            "TagPattern": "**",
            "RepositoryDecoration": "repoMatches",
            "TagDecoration": "matches",
            "Disabled": false,
            "RuleId": 1,
            "NsName": "<NamespaceName>"
        }
    ],
    "EmptyNs": [
        "other-ns-without-rules"
    ],
    "Total": 1,
    "RequestId": "9be15a35-d86c-4f96-b670-f10247562a2c"
}
```

> 记录返回的 `RuleId`（示例 `1`），后续修改和删除均依赖此 ID。`Rules` 数组每条规则字段：`RuleId`、`NsName`、`RepositoryPattern`、`TagPattern`、`RepositoryDecoration`、`TagDecoration`、`Disabled`。

仅提取 `RuleId` 与关键字段：

```bash
tccli tcr DescribeImmutableTagRules \
    --cli-input-json file://describe-rule.json \
    --region <Region> \
    --output json \
    --filter "Rules[0].{RuleId:RuleId,Repo:RepositoryPattern,Tag:TagPattern,Disabled:Disabled}"
# expected: {"RuleId": 1, "Repo": "**", "Tag": "**", "Disabled": false}
```

### 步骤4：修改规则

通过 `ModifyImmutableTagRules` 更新规则配置。需同时传入 `RuleId` 和完整 `Rule` 对象（全量覆盖，非增量）：

`immutable-rule-modify.json`：

```json
{
    "RegistryId": "<RegistryId>",
    "NamespaceName": "<NamespaceName>",
    "RuleId": 1,
    "Rule": {
        "RepositoryPattern": "**",
        "TagPattern": "stable-*",
        "RepositoryDecoration": "repoMatches",
        "TagDecoration": "matches",
        "Disabled": false
    }
}
```

```bash
tccli tcr ModifyImmutableTagRules \
    --cli-input-json file://immutable-rule-modify.json \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

**输出**：

```json
{
    "RequestId": "c3d7b9d0-ccad-407f-84dc-a015cbeaf7dc"
}
```

> - `ModifyImmutableTagRules` 为全量覆盖：`Rule` 对象必须包含全部必填字段（`RepositoryPattern`、`TagPattern`、`RepositoryDecoration`、`TagDecoration`），遗漏字段会被清空。
> - 不支持修改规则的生效命名空间（`NamespaceName` 不可变）。如需更换命名空间，需删除原规则后在新命名空间重新创建。
> - 内联 `--Rule` 方式（需版本支持 `--NamespaceName` flag）：`tccli tcr ModifyImmutableTagRules --RegistryId <RegistryId> --NamespaceName <NamespaceName> --RuleId <RuleId> --Rule '{"RepositoryPattern":"**","TagPattern":"stable-*","RepositoryDecoration":"repoMatches","TagDecoration":"matches","Disabled":false}' --region <Region>`

### 步骤5：启用/禁用规则

通过 `ModifyImmutableTagRules` 切换 `Disabled` 字段。以下为禁用规则（`Disabled: true`）：

`immutable-rule-toggle.json`：

```json
{
    "RegistryId": "<RegistryId>",
    "NamespaceName": "<NamespaceName>",
    "RuleId": 1,
    "Rule": {
        "RepositoryPattern": "**",
        "TagPattern": "stable-*",
        "RepositoryDecoration": "repoMatches",
        "TagDecoration": "matches",
        "Disabled": true
    }
}
```

```bash
tccli tcr ModifyImmutableTagRules \
    --cli-input-json file://immutable-rule-toggle.json \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

> 切换 `Disabled` 时仍需提供完整 `Rule` 对象（含原有 `RepositoryPattern`/`TagPattern` 等），否则字段会被清空。启用规则改为 `"Disabled": false` 即可。

### 步骤6：删除规则

```bash
tccli tcr DeleteImmutableTagRules \
    --cli-input-json file://delete-rule.json \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

`delete-rule.json`：

```json
{
    "RegistryId": "<RegistryId>",
    "NamespaceName": "<NamespaceName>",
    "RuleId": 1
}
```

**输出**：

```json
{
    "RequestId": "faf792f4-452b-493d-975a-0ec97bb1f035"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `RegistryId` | String | 是 | 实例 ID |
| `NamespaceName` | String | 是 | 命名空间名称 |
| `RuleId` | Integer | 是 | 规则 ID，来自 `DescribeImmutableTagRules` 输出的 `RuleId` 字段 |

> 内联方式（需版本支持 `--NamespaceName` flag）：`tccli tcr DeleteImmutableTagRules --RegistryId <RegistryId> --NamespaceName <NamespaceName> --RuleId <RuleId> --region <Region>`

### 步骤7：验证规则已生效（数据面）

规则创建并启用后，推送已受保护版本的镜像，预期被拒绝：

```bash
# expected: DENIED (rule blocks re-push of same tag)
docker tag <Image> <RegistryDomain>/<NamespaceName>/<Repo>:<ProtectedTag>
docker push <RegistryDomain>/<NamespaceName>/<Repo>:<ProtectedTag>
```

> `docker push` 返回 `DENIED` 即说明不可变规则已生效。**首次推送不受影响**，仅对同一 Tag 的二次及后续推送生效。

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 规则已创建 | `DescribeImmutableTagRules --cli-input-json file://describe-rule.json --region <Region>` | `Rules` 数组含目标规则，`RuleId` 非零，`Total >= 1` |
| 规则字段正确 | 同上 | `RepositoryDecoration`、`TagDecoration`、`RepositoryPattern`、`TagPattern` 与创建参数一致 |
| 规则生效状态 | 同上，取 `Disabled` | `false`（若创建时未指定 `Disabled: true`） |
| 修改后字段更新 | 同上，取 `TagPattern` 等 | 与 `ModifyImmutableTagRules` 传入值一致（如 `stable-*`） |
| 规则已删除 | 同上 | `Total` 减少，`Rules` 数组不再含该 `RuleId` |
| 规则可删除 | `DeleteImmutableTagRules --cli-input-json file://delete-rule.json --region <Region>` | 返回 `RequestId`，再 `Describe` 确认 `Total` 减少 |

### 数据面

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 受保护 Tag 二次推送被拒 | `docker push <RegistryDomain>/<NamespaceName>/<Repo>:<ProtectedTag>` | 返回 `DENIED` |
| 受保护 Tag 首次推送正常 | 同上（首次） | 推送成功 |
| 未匹配 Tag 推送正常 | `docker push <RegistryDomain>/<NamespaceName>/<Repo>:<UnmatchedTag>` | 推送成功 |

> 获取 `RegistryDomain`：`tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --filter "Registries[0].PublicDomain"`。

## 清理

> **警告：** 删除不可变规则后，对应 Tag 的保护立即失效，后续推送相同 Tag 将正常覆盖镜像版本。删除前确认生产环境无依赖该规则的版本保护需求。

### 1. 清理前状态检查

```bash
tccli tcr DescribeImmutableTagRules \
    --cli-input-json file://describe-rule.json \
    --region <Region> \
    --output json
# expected: 确认待删除规则的 RuleId、NsName、RepositoryPattern、TagPattern
```

### 2. 删除规则

```bash
tccli tcr DeleteImmutableTagRules \
    --cli-input-json file://delete-rule.json \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

### 3. 验证已删除

```bash
tccli tcr DescribeImmutableTagRules \
    --cli-input-json file://describe-rule.json \
    --region <Region> \
    --output json
# expected: Total 减少，Rules 数组中不再包含该 RuleId 的条目
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateImmutableTagRules` 返回 `InvalidParameter.ErrorTcrInvalidParameter`: "RepositoryDecoration: matches does not validate as in(repoMatches\|repoExcludes)" | 检查 `Rule.RepositoryDecoration` 值 | `RepositoryDecoration` 必须带 `repo` 前缀，裸 `matches` 不合法 | 改为 `"RepositoryDecoration": "repoMatches"`（匹配）或 `"repoExcludes"`（排除） |
| `CreateImmutableTagRules` 返回 `InvalidParameter.ErrorTcrInvalidParameter`（TagDecoration 相关） | 检查 `Rule.TagDecoration` 值 | `TagDecoration` 仅接受 `matches` 或 `excludes`（**不带** `repo` 前缀） | 使用 `"TagDecoration": "matches"` 或 `"excludes"` |
| `CreateImmutableTagRules` 返回 "TagDecoration: non zero value required" | 检查 `Rule` JSON 是否包含 `TagDecoration` | `TagDecoration` 为**必填**字段，不可省略 | 添加 `"TagDecoration": "matches"` 或 `"excludes"` |
| `CreateImmutableTagRules` 返回 "NamespaceName: non zero value required" | 检查 JSON 顶层是否传入 `NamespaceName` | `NamespaceName` 为**必填**顶层参数 | 在 JSON 顶层添加 `"NamespaceName": "<NamespaceName>"` |
| `ModifyImmutableTagRules` 返回 "RuleId: non zero value required" | 检查 JSON 顶层是否含 `RuleId` 字段 | `ModifyImmutableTagRules` 需 `RuleId` 指定目标规则 | 添加 `"RuleId": <数字ID>`（来自 `DescribeImmutableTagRules` 输出） |
| `CreateImmutableTagRules` 返回 `ResourceNotFound`: "registry ... not found" | `tccli tcr DescribeInstances --region <Region>` 确认实例存在 | `RegistryId` 错误或实例已销毁 | 核对 `RegistryId`，确认实例状态为 `Running` |
| `CreateImmutableTagRules` 返回 `ResourceNotFound.TcrResourceNotFound`: "namespace ... not found" | `tccli tcr DescribeNamespaces --RegistryId <RegistryId> --region <Region>` 确认命名空间存在 | `NamespaceName` 错误或命名空间未创建 | 核对命名空间名称，参考 [管理命名空间](../../image-creation/namespace) 创建 |
| CLI 返回 `Unknown options: --NamespaceName` | 检查 tccli 版本：`tccli --version` | 部分 tccli 版本未将 `NamespaceName` 暴露为直接 CLI flag | 改用 `--cli-input-json file://x.json` 传参（JSON 内含 `NamespaceName`） |
| CLI 返回 `Unknown options: --NamespaceId` | 同上 | 部分 tccli 版本未将 `NamespaceId` 暴露为直接 CLI flag | 同上，改用 `--cli-input-json` |
| CAM 权限拒绝 (`UnauthorizedOperation`) | — | 子账号缺少 TCR 不可变规则权限 | 主账号授予 `tcr:CreateImmutableTagRules` / `tcr:ModifyImmutableTagRules` / `tcr:DescribeImmutableTagRules` / `tcr:DeleteImmutableTagRules` |
| `CreateImmutableTagRules` 返回 `InternalError` / `FailedOperation` | 保留返回的 `RequestId` | 云端服务暂时不可用 | 稍后重试（间隔 30 秒以上）；若持续失败，凭 `RequestId` [在线咨询](https://cloud.tencent.com/online-service?from=doc_1141) |

### 行为异常（规则创建成功但未按预期生效）

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 规则已创建但推送相同 Tag 未被拒绝 | `DescribeImmutableTagRules` 检查 `Disabled` 字段 | `Disabled: true`，规则处于禁用状态 | `ModifyImmutableTagRules` 将 `Disabled` 改为 `false` |
| 规则已启用但特定 Tag 仍可覆盖 | `DescribeImmutableTagRules` 对比 `RepositoryPattern`/`TagPattern` 与实际仓库名和 Tag | 仓库名或 Tag 不匹配规则的过滤模式（如 `v*` 不匹配 `V1.0` 大小写；`prod-*` 不匹配 `prod/app`） | 调整 `RepositoryPattern` 或 `TagPattern` 覆盖目标仓库和 Tag |
| 重复创建生成多条相同规则 | `DescribeImmutableTagRules` 检查 `Total` 与规则列表 | `CreateImmutableTagRules` 不做去重，重复调用生成多条规则 | 创建前先 `Describe` 检查；多余规则用 `DeleteImmutableTagRules` 逐条删除 |
| 规则重叠时行为不明确 | `DescribeImmutableTagRules` 列出所有规则，逐条对比覆盖范围 | 多条规则重叠时以最严格条件为准（任一规则阻断即拒绝推送） | 确认重叠规则组合符合预期；删除多余规则 |
| `DescribeImmutableTagRules` 返回 `EmptyNs: ["ns"]` | — | 该命名空间尚无不可变规则，为正常状态 | 按 [步骤2](#步骤2创建版本不可变规则) 创建规则即可 |
| 修改规则后某些字段被清空 | `DescribeImmutableTagRules` 对比修改前后字段 | `ModifyImmutableTagRules` 为全量覆盖，`Rule` 对象遗漏字段会被清空 | 修改时 `Rule` 必须包含全部必填字段，建议从查询结果复制完整对象再改 |

### 排障记录：RepositoryDecoration 枚举首次失败

> **真机排障记录：** 首次调用 `CreateImmutableTagRules` 时传入 `"RepositoryDecoration": "matches"`，API 返回 `InvalidParameter.ErrorTcrInvalidParameter`（RequestId: `c351d168-965a-481d-8760-770681a5ce47`），错误信息为：
>
> ```bash
> Rule.RepositoryDecoration: matches does not validate as in(repoMatches|repoExcludes)
> ```
>
> 修正为 `"RepositoryDecoration": "repoMatches"` 后创建成功（RequestId: `bce40f14-44c5-4626-a40b-0de9ab0dc476`）。
>
> **教训：** `RepositoryDecoration` 和 `TagDecoration` 的枚举值不对称——前者带 `repo` 前缀（`repoMatches`/`repoExcludes`），后者不带（`matches`/`excludes`）。创建前务必对照 [场景决策表](#场景决策表) 确认枚举值，切勿凭直觉填写。

## 下一步

- [容器镜像安全扫描](../vulnerability-scan) — 对镜像进行漏洞扫描与修复
- [容器镜像签名](../image-signing) — 镜像签名与验签
- [按策略自动删除镜像版本](../../image-cleanup/auto-delete) — 自动清理过期镜像版本
- [触发器（Webhook）](../../devops/webhook) — 镜像推送/删除自动触发 CI/CD
- [环境准备](../../../index.md) — 返回 TCR 工具链入口

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 选择实例 → 左侧导航栏 **版本管理** > **版本不可变** → 单击 **新建规则**，选择命名空间，配置仓库匹配（匹配/排除）和版本匹配（匹配/排除），填写过滤模式，确认创建。在规则列表行可启用/禁用、编辑或删除规则。
