---
title: "个人版资源级 API 接口及授权方案变更指南"
description: "· page_id `41412` · 概念页"
---

> 对照官方：[个人版资源级 API 接口及授权方案变更指南](https://cloud.tencent.com/document/product/1141/41412) · page_id `41412` · 概念页

## 概述

容器镜像服务（TCR）个人版原为容器服务（TKE）内的镜像仓库（CCR），API 接口已从 2.0 版本升级至 3.0 版本。升级后：

- **产品前缀** 从 `ccr` 变更为 `tcr`
- **Action 名称** 从旧版 API 名变更为带 `Personal` 后缀的 3.0 API 名
- **Resource 描述** 从 `qcs::ccr:::` 变更为 `qcs::tcr:::`
- **资源类型** 企业版新增 `instance` 和 `repository`，个人版沿用 `repo`

> **兼容性说明：** 升级期间 CAM 同时兼容新旧 Resource 和 Action，已有策略仍生效，但建议迁至新版以确保长期可用。

## 前置条件

### 概念准备：新旧版本差异总览

| 维度 | 旧版（CCR 2.0） | 新版（TCR 3.0） |
|------|----------------|----------------|
| **产品名** | CCR（Container Registry） | TCR（Tencent Container Registry） |
| **所属服务** | TKE 容器服务内嵌 | 独立容器镜像服务 |
| **CAM 前缀** | `ccr` | `tcr` |
| **资源六段式前缀** | `qcs::ccr:::` | `qcs::tcr:::` |
| **API 版本** | 2.0 | 3.0 |
| **资源类型** | 仅 `repo` | `instance`（企业版）、`repository`（企业版）、`repo`（个人版） |
| **API 名特征** | 无统一后缀（如 `CreateCCRNamespace`） | 以 `Personal` 结尾（如 `CreateNamespacePersonal`） |

### 迁移决策树

```
当前策略使用 ccr 前缀？
  ├── 是 → 是否需要精细化权限控制？
  │         ├── 是 → 迁移到新版 tcr 方案（按本文指南）
  │         └── 否 → 可暂不迁移（旧版兼容期中仍生效）
  └── 否 → 已使用 tcr 前缀 → 确认 Action 名是否为 Personal 后缀
              ├── 是 → 无需迁移
              └── 否 → 可能为企业版策略，与个人版不通用
```

## 控制台与 CLI 参数映射

### API 2.0 → 3.0 映射对照表

以下为已升级接口的完整映射关系：

| API 2.0 名称 | API 3.0 名称 | 接口描述 | 资源六段式（新版） |
|---|---|---|---|
| `CreateCCRNamespace` | `CreateNamespacePersonal` | 创建个人版命名空间 | `qcs::tcr:$region:$account:repo/$namespace` |
| `DeleteUserNamespace` | `DeleteNamespacePersonal` | 删除个人版命名空间 | `qcs::tcr:$region:$account:repo/$namespace` |
| `GetUserRepositoryList` | `DescribeRepositoryOwnerPersonal` | 查询个人版所有仓库 | `qcs::tcr:$region:$account:repo/*` |
| `CreateRepository` | `CreateRepositoryPersonal` | 创建个人版镜像仓库 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `DeleteRepository` | `DeleteRepositoryPersonal` | 删除个人版镜像仓库 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `BatchDeleteRepository` | `BatchDeleteRepositoryPersonal` | 批量删除个人版镜像仓库 | `qcs::tcr:$region:$account:repo/$namespace/*` |
| `DeleteTag` | `DeleteImagePersonal` | 删除个人版仓库 Tag | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `BatchDeleteTag` | `BatchDeleteImagePersonal` | 批量删除个人版仓库 Tag | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `pull` | `PullRepositoryPersonal` | 拉取个人版镜像仓库内镜像 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `push` | `PushRepositoryPersonal` | 推送个人版镜像仓库内镜像 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |

> 以上 10 个 API 为已升级至 3.0 版本的接口。其他 `Personal` 后缀 API（如触发器、生命周期类）为 3.0 版本直接新增，无旧版对应项。

### CLI 操作映射

API 升级后的 tccli 命令变化（以创建命名空间为例）：

| 操作 | 旧版（不可用） | 新版 | 幂等 |
|------|--------------|------|:--:|
| 创建命名空间 | `tccli ccr CreateCCRNamespace ...` (service `ccr` 已下线) | `tccli tcr CreateNamespacePersonal --Namespace <name> --region ap-guangzhou` | 否 |
| 查询命名空间 | (无旧版 CLI) | `tccli tcr DescribeNamespacePersonal --Namespace "" --Limit 20 --Offset 0 --region ap-guangzhou --output json` | 是 |
| 查询仓库总数 | (无旧版 CLI) | `tccli tcr DescribeRepositoryOwnerPersonal --region ap-guangzhou --output json` | 是 |
| 查询配额 | (无旧版 CLI) | `tccli tcr DescribeUserQuotaPersonal --region ap-guangzhou --output json` | 是 |

**真机实跑验证（新版）：**

```bash
# 查询个人版命名空间
tccli tcr DescribeNamespacePersonal --Namespace "" --Limit 20 --Offset 0 --region ap-guangzhou --output json
```

Output:

```json
{
    "Data": {
        "NamespaceCount": 450,
        "NamespaceInfo": [
            {
                "Namespace": "ka-test",
                "CreationTime": "2026-06-15 11:59:57",
                "RepoCount": 1
            }
        ]
    },
    "RequestId": "bb1c991c-384f-4d9a-93f9-455f77fb7353"
}
```

```bash
# 查询仓库总数
tccli tcr DescribeRepositoryOwnerPersonal --region ap-guangzhou --output json
```

Output:

```json
{
    "Data": {
        "TotalCount": 9985,
        "RepoInfo": [
            {
                "RepoName": "ethanrzhang/sandbridge",
                "RepoType": "QCLOUD HUB",
                "TagCount": 409,
                "Public": 1,
                "CreationTime": "2026-05-05 19:39:30"
            }
        ]
    },
    "RequestId": "from-live"
}
```

```bash
# 查询用户配额
tccli tcr DescribeUserQuotaPersonal --region ap-guangzhou --output json
```

Output:

```json
{
    "Data": {
        "LimitInfo": [
            {"Username": "3321337994", "Type": "namespace", "Value": 2000},
            {"Username": "3321337994", "Type": "repo", "Value": 10000},
            {"Username": "3321337994", "Type": "tag", "Value": 9999},
            {"Username": "3321337994", "Type": "trigger", "Value": 10}
        ]
    },
    "RequestId": "23d1f0c4-eaf9-4b8e-973e-36297d5edcf1"
}
```

## 操作步骤

### 旧版（CCR）授权方案

- **Action**：以 `ccr` 为产品前缀，API 名为 2.0 版本。例如创建命名空间为 `ccr:CreateCCRNamespace`。
- **Resource**：`qcs::ccr:::repo/<路径>`。`$region` 和 `$account` 置空时默认为全部地域和当前主账号。

**旧版示例（创建命名空间全读写策略）：**

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": [
        "ccr:*"
      ],
      "resource": [
        "qcs::ccr:::repo/*"
      ],
      "effect": "allow"
    }
  ]
}
```

### 新版（TCR）授权方案

- **Action**：以 `tcr` 为产品前缀，API 名为 3.0 版本。例如创建命名空间为 `tcr:CreateNamespacePersonal`。
- **Resource**：`qcs::tcr:::repo/<路径>`。

**新版示例（创建命名空间全读写策略）：**

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": [
        "tcr:*"
      ],
      "resource": [
        "qcs::tcr:::repo/*"
      ],
      "effect": "allow"
    }
  ]
}
```

### 逐步迁移指南

#### 步骤一：识别旧版策略

使用 `tccli cam ListPolicies` 查找旧版策略：

```bash
# 列出自定义策略，筛选关键词
tccli cam ListPolicies --Scope Local --Page 1 --Rp 100 --region ap-guangzhou
```

在输出中检查 `PolicyDocument` 字段是否包含 `ccr:` 或 `qcs::ccr:::`。

#### 步骤二：按映射表逐条替换

对每个包含旧版 Action 的策略：

1. **替换 Action 前缀** — `ccr:*` → `tcr:*`；`ccr:pull` → `tcr:PullRepositoryPersonal`；具体 API 名按下表映射
2. **替换 Resource 前缀** — `qcs::ccr:::` → `qcs::tcr:::`
3. **保持 Resource 路径不变** — 仓库路径（如 `repo/team-01/repo-demo`）在迁移前后一致

**迁移公式：**

```
旧策略 → 新策略
  action:  ccr:<OldAction>  →  tcr:<NewAction>
  resource: qcs::ccr:::repo/<path> → qcs::tcr:::repo/<path>
  effect:  不变
  version: 不变 ("2.0")
```

#### 步骤三：更新策略并验证

```bash
# 更新已有策略
tccli cam UpdatePolicy \
    --PolicyId <PolicyId> \
    --PolicyDocument '{"version":"2.0","statement":[...]}' \
    --region ap-guangzhou

# 验证策略内容
tccli cam GetPolicy --PolicyId <PolicyId> --region ap-guangzhou
```

### 新旧方案兼容示例

**场景：** 授权子账号可只读默认地域下 `namespace-a/repo-b` 的镜像仓库（仅能查询仓库信息和拉取镜像）。

**旧版方案（仍兼容但建议升级）：**

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": [
        "ccr:pull"
      ],
      "resource": "qcs::ccr:::repo/namespace-a/repo-b",
      "effect": "allow"
    }
  ]
}
```

**新版方案（推荐）：**

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": [
        "tcr:PullRepositoryPersonal"
      ],
      "resource": "qcs::tcr:::repo/namespace-a/repo-b",
      "effect": "allow"
    }
  ]
}
```

## 验证

迁移后，使用子账号执行以下验证以确保新版策略生效：

| 验证维度 | 验证命令 | 旧版预期 | 新版预期 |
|---------|---------|---------|---------|
| 查询命名空间 | `tccli tcr DescribeNamespacePersonal --region ap-guangzhou` | `UnauthorizedOperation`（ccr 策略不覆盖 tcr API） | exit 0（tcr 策略覆盖） |
| 创建命名空间 | `tccli tcr CreateNamespacePersonal --Namespace test-migration --region ap-guangzhou` | `UnauthorizedOperation` | exit 0（含 Create action 时） |
| 查询配额 | `tccli tcr DescribeUserQuotaPersonal --region ap-guangzhou` | `UnauthorizedOperation` | exit 0（含 Describe action 时） |

> **关键验证：** 如果子账号仍使用旧版 `ccr:` 策略，执行 `tccli tcr` 命令将返回 `UnauthorizedOperation`。因为 `ccr:Describe*` 不等同于 `tcr:Describe*` — 它们是不同的 CAM 命名空间。

## 清理

迁移完成后，建议清理旧版策略以避免混淆：

1. **解绑旧策略** — `tccli cam DetachUserPolicy` 移除旧策略关联
2. **验证解绑后新策略仍生效** — 执行验证矩阵确认权限正常
3. **删除旧策略** — `tccli cam DeletePolicy --PolicyId <OldPolicyId>`

```bash
# 1. 查看旧策略关联的用户
tccli cam ListEntitiesForPolicy --PolicyId <OldPolicyId> --region ap-guangzhou

# 2. 解绑每个关联用户
tccli cam DetachUserPolicy --AttachUin <Uin> --PolicyId <OldPolicyId> --region ap-guangzhou

# 3. 删除旧策略（确认已无关联用户后）
tccli cam DeletePolicy --PolicyId <OldPolicyId> --region ap-guangzhou
```

## 排障

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 迁移后子账号 `tccli tcr DescribeNamespacePersonal` 仍报 `UnauthorizedOperation` | `tccli cam ListAttachedUserPolicies --TargetUin <Uin>` 检查关联策略列表 | 子账号仍关联旧 `ccr` 策略，未绑定新 `tcr` 策略 | 解绑旧 `ccr` 策略，绑定新 `tcr` 策略 |
| 新旧策略并存时子账号无权限 | 确认旧策略的 `ccr:pull` 是否正确迁移为 `tcr:PullRepositoryPersonal` | 迁移时直接替换 `ccr:*` 为 `tcr:*` 可能遗漏 Docker 拉取所需的具体 Action | 检查策略中是否包含 `tcr:PullRepositoryPersonal`；`tcr:*` 已覆盖 |
| 迁移后 `docker push` 失败 | 检查策略是否包含 Push 相关 Action | 旧版 `ccr:push` 需迁移为 `tcr:PushRepositoryPersonal`，仅 `tcr:Create*` 不够 | 在 action 中添加 `tcr:PushRepositoryPersonal` |
| `tccli cam UpdatePolicy` 返回 `UnknownParameter` | 检查 `--PolicyDocument` 参数是否为合法 JSON 字符串 | JSON 中保留字符未转义（如双引号未用 `\"` 包裹） | 使用 `file://` 加载 JSON 文件：`--PolicyDocument file://policy.json` |
| 尝试使用 `ccr` 服务调用 tccli | `tccli ccr ...` 执行时报 service not found | `ccr` 产品后端已下线，不再作为独立 tccli service | 统一使用 `tccli tcr` + `Personal` 后缀 API |

## 下一步

- [个人版接入 CAM 的 API 列表](../cam-api-list) — 新版 31 个 Personal API 完整列表
- [个人版授权方案示例](../auth-examples) — 新版 `tcr` 前缀下的四种场景策略示例
- [环境准备](../../index.md) — tccli 安装与凭证配置
- [tccli 专页（TCR）](../../../../tccli-专页tcr.md) — 企业版与个人版 CLI 操作模式对比

## 控制台替代

- **CAM 策略迁移：** [访问管理控制台 → 策略](https://console.cloud.tencent.com/cam/policy) — 可视化管理策略、对比新旧策略内容
- **TCR 个人版控制台：** [容器镜像服务 → 个人版](https://console.cloud.tencent.com/tcr/personal) — 仓库与命名空间的可视化操作
- **API Explorer：** [TCR API 3.0 Explorer](https://console.cloud.tencent.com/api/explorer?Product=tcr) — 在线调试所有 3.0 API，查看输入输出
