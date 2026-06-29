---
title: "基于 CAM 管理子账号权限（tccli）"
description: "· page_id `41417`"
---

> 对照官方：[基于 CAM 管理子账号权限](https://cloud.tencent.com/document/product/1141/41417) · page_id `41417`

## 概述

访问管理（Cloud Access Management，CAM）是腾讯云跨产品的统一权限体系。通过 CAM 可为子账号（用户/用户组）授予 TCR 资源的最小粒度访问权限，颗粒度可达**仓库级**。

TCR 权限管控全部通过 `tccli cam`（非 `tccli tcr`）完成。CAM 是**账号级别**的服务——无需 `RegistryId`，无实例 tier 依赖，操作对象为策略（Policy）与子账号（User/Uin）。

TCR 在 CAM 中的核心概念：

| 概念 | 说明 | 示例 |
|------|------|------|
| 预设策略（QCS） | 腾讯云预置的 TCR 权限模板，不可删除 | `QcloudTCRFullAccess`、`QcloudTCRReadOnlyAccess` |
| 自定义策略（Local） | 用户按需创建的细粒度权限策略 | 只读某个仓库、管理某个命名空间 |
| CAM Action | 可授权的 API 操作名 | `tcr:CreateInstance`、`tcr:DescribeInstances`、`tcr:DeleteInstance`、`tcr:PullRepository` |
| 资源六段式（QCS） | 授权策略中描述资源的格式 | `qcs::tcr:$region:uin/$uin:instance/$registryId` |

**QCS 资源六段式格式**：

```
qcs::tcr:$region:uin/${uin}:instance/${RegistryId}
qcs::tcr:$region:uin/${uin}:repository/${RegistryId}/${Namespace}/${Repo}/*
```

| 段 | 含义 | 常见取值 |
|----|------|---------|
| `qcs` | QCS 协议前缀 | 固定 |
| `tcr` | 产品 ServiceType | 固定 |
| `$region` | 地域（`ap-guangzhou` 等），空值表示所有地域 | `ap-guangzhou`、`""` |
| `uin/$uin` | 主账号 UIN，空值表示创建策略的主账号 | `uin/100049208872`、`""` |
| `instance/$RegistryId` | 实例资源描述 | `instance/tcr-0e2hz15l`、`instance/*` |
| `repository/$RegistryId/$Ns/$Repo` | 仓库资源描述 | `repository/tcr-0e2hz15l/kerwinwjyan-ns/test-repo/*` |

> 完整的 TCR CAM Action 列表参见 [企业版接入 CAM 的 API 列表](https://cloud.tencent.com/document/product/1141/41605)。常用 Action 前缀：`tcr:Create*`（写入）、`tcr:Describe*`（查询）、`tcr:Delete*`（删除）、`tcr:Modify*`（修改）、`tcr:PullRepository*`（镜像拉取）。

## 前置条件

- 已完成 [环境准备](../../index.md)，安装并配置 `tccli`（默认地域 `ap-guangzhou`）。
- 使用**主账号**或拥有以下 CAM 管理权限的子账号：
  - `cam:CreatePolicy` — 创建自定义策略
  - `cam:AttachUserPolicy` — 为子账号绑定策略
  - `cam:GetPolicy` — 查看策略详情
- 已存在待授权的子账号（Uin），可通过 `tccli cam ListUsers` 获取。
- **此页面不依赖 TCR 实例**，无需提前创建实例或仓库。

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    cam:CreatePolicy, cam:AttachUserPolicy, cam:GetPolicy, cam:ListPolicies, cam:ListUsers
# 验证：执行 ListPolicies 和 ListUsers 确认 CAM 读权限
tccli cam ListPolicies --Scope Local --Rp 20 --Page 1 --region ap-guangzhou --output json
# expected: exit 0，返回策略列表（可为空）

tccli cam ListUsers --region ap-guangzhou --output json
# expected: exit 0，返回子账号列表
```

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 / 参数 | 幂等 |
|-----------|------------------|------|
| 查看预设策略列表 | `tccli cam ListPolicies --Scope QCS --Keyword tcr` | 是 |
| 查看策略完整 JSON | `tccli cam GetPolicy --PolicyId <PolicyId>` | 是 |
| 按标签搜索策略 | `tccli cam ListPolicies --Scope QCS --TagKey <Key>` | 是 |
| 查看自定义策略 | `tccli cam ListPolicies --Scope Local` | 是 |
| 创建自定义策略（可视化） | —（控制台独有，CLI 需手写 PolicyDocument JSON） | — |
| 创建自定义策略（JSON） | `tccli cam CreatePolicy --PolicyName <Name> --PolicyDocument '<JSON>'` | 否（同名报错） |
| 为子账号/用户组绑定策略 | `tccli cam AttachUserPolicy --PolicyId <Id> --AttachUin <Uin>` | 否（重复绑定幂等） |
| 为子账号/用户组解绑策略 | `tccli cam DetachUserPolicy --PolicyId <Id> --DetachUin <Uin>` | 否（重复解绑幂等） |
| 查看子账号已绑定策略 | `tccli cam ListAttachedUserPolicies --TargetUin <Uin>` | 是 |
| 删除自定义策略 | `tccli cam DeletePolicy --PolicyId '[<PolicyId>]'` | 否 |
| 列出所有子账号 | `tccli cam ListUsers` | 是 |
| 查询子账号详情 | `tccli cam GetUser --Name <UserName>` | 是 |
| 策略生效验证 | 子账号执行 `tccli tcr DescribeInstances` 等操作 | — |

## 操作步骤

### 步骤1：查看 TCR 预设策略

腾讯云为 TCR 提供两个预设策略（Scope=QCS），可直接绑定给子账号：

```bash
tccli cam ListPolicies \
  --Scope QCS \
  --Keyword tcr \
  --Rp 20 \
  --Page 1 \
  --region ap-guangzhou \
  --output json
```

Output（仅 `ServiceType: "tcr"` 的条目）：

```json
{
    "TotalNum": 2,
    "List": [
        {
            "PolicyId": 30100465,
            "PolicyName": "QcloudTCRFullAccess",
            "AddTime": "2019-12-31 19:04:19",
            "Type": 2,
            "Description": "容器镜像服务（TCR）全读写权限",
            "CreateMode": 2,
            "Attachments": 18,
            "ServiceType": "tcr",
            "Deactived": 0,
            "IsServiceLinkedPolicy": 0,
            "AttachEntityCount": 18,
            "AttachEntityBoundaryCount": 0,
            "UpdateTime": "2020-09-29 11:37:49"
        },
        {
            "PolicyId": 30100579,
            "PolicyName": "QcloudTCRReadOnlyAccess",
            "AddTime": "2019-12-31 19:08:27",
            "Type": 2,
            "Description": "容器镜像服务（TCR）只读权限",
            "CreateMode": 2,
            "Attachments": 6,
            "ServiceType": "tcr",
            "Deactived": 0,
            "IsServiceLinkedPolicy": 0,
            "AttachEntityCount": 6,
            "AttachEntityBoundaryCount": 0,
            "UpdateTime": "2020-09-29 11:37:49"
        }
    ],
    "RequestId": "07831f36-9765-498a-a72f-4aca037c343d"
}
```

| 策略名 | PolicyId | 说明 | Attachments |
|--------|----------|------|-------------|
| `QcloudTCRFullAccess` | 30100465 | TCR 全读写权限 | 18 |
| `QcloudTCRReadOnlyAccess` | 30100579 | TCR 只读权限 | 6 |

> `--Keyword tcr` 返回所有 ServiceType 含 "tcr" 的策略（含其他产品的 TCR 关联策略）。仅 `ServiceType: "tcr"` 的条目为 TCR 专属预设策略。若只需 TCR 相关而不限定 ServiceType，去掉 `--Keyword` 过滤可获得完整预设策略列表。

### 步骤2：查看策略完整 JSON（PolicyDocument）

```bash
tccli cam GetPolicy \
  --PolicyId 30100465 \
  --region ap-guangzhou \
  --output json
```

Output（`QcloudTCRFullAccess`）：

```json
{
    "PolicyName": "QcloudTCRFullAccess",
    "Description": "容器镜像服务（TCR）全读写权限",
    "Type": 2,
    "AddTime": "2019-12-31 19:04:19",
    "UpdateTime": "2020-09-29 11:37:49",
    "PolicyDocument": "{\"statement\":[{\"action\":[\"tcr:*\"],\"effect\":\"allow\",\"resource\":\"*\"},{\"action\":[\"cam:GetRole\"],\"effect\":\"allow\",\"resource\":[\"*\"]}],\"version\":\"2.0\"}",
    "PresetAlias": "",
    "IsServiceLinkedRolePolicy": 0,
    "RequestId": "eb493bdd-f809-44dc-aa67-1dec1ae45eff"
}
```

格式化后的 PolicyDocument：

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": ["tcr:*"],
      "effect": "allow",
      "resource": "*"
    },
    {
      "action": ["cam:GetRole"],
      "effect": "allow",
      "resource": ["*"]
    }
  ]
}
```

**`QcloudTCRReadOnlyAccess`** 的 PolicyDocument：

```bash
tccli cam GetPolicy --PolicyId 30100579 --region ap-guangzhou --output json
```

```json
{
    "PolicyName": "QcloudTCRReadOnlyAccess",
    "Description": "容器镜像服务（TCR）只读权限",
    "Type": 2,
    "AddTime": "2019-12-31 19:08:27",
    "UpdateTime": "2020-09-29 11:37:49",
    "PolicyDocument": "{\"statement\":[{\"action\":[\"tcr:Describe*\",\"tcr:PullRepository*\"],\"effect\":\"allow\",\"resource\":\"*\"},{\"action\":[\"cam:GetRole\"],\"effect\":\"allow\",\"resource\":[\"*\"]}],\"version\":\"2.0\"}",
    "PresetAlias": "",
    "IsServiceLinkedRolePolicy": 0,
    "RequestId": "753872d4-4943-4b17-bbde-188c7a53bbb9"
}
```

格式化 PolicyDocument：

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": ["tcr:Describe*", "tcr:PullRepository*"],
      "effect": "allow",
      "resource": "*"
    },
    {
      "action": ["cam:GetRole"],
      "effect": "allow",
      "resource": ["*"]
    }
  ]
}
```

> **注意**：两个预设策略均包含 `cam:GetRole` 声明（Statement 第 2 条）。这是 TCR 内部所需的服务角色查询权限，自定义策略时通常不需要添加此项。

**两个预设策略对照**：

| 维度 | QcloudTCRFullAccess | QcloudTCRReadOnlyAccess |
|------|--------------------|------------------------|
| TCR Actions | `tcr:*` | `tcr:Describe*` + `tcr:PullRepository*` |
| 资源范围 | `*`（全部） | `*`（全部） |
| 额外权限 | `cam:GetRole` | `cam:GetRole` |
| 适用场景 | 运维/管理员 | 开发/只读用户 |
| 能否删除 | 否 | 否 |

> 判断标准：若预设策略满足需求，直接绑定（跳至[步骤5](#步骤5为子账号绑定策略)）；若需更细颗粒度（如仅授权某个仓库、某个命名空间、或限制地域），继续[步骤3](#步骤3获取子账号-uin)——[步骤4](#步骤4创建自定义策略)。

### 步骤3：获取子账号 Uin

列出所有子账号：

```bash
tccli cam ListUsers --region ap-guangzhou --output json
```

Output：

```json
{
    "Data": [
        {
            "Uin": 100003627333,
            "Name": "foxzhong",
            "Uid": 1194262,
            "NickName": "foxzhong"
        },
        {
            "Uin": 100006594350,
            "Name": "caryguo",
            "Uid": 1542771,
            "NickName": "caryguo"
        }
    ],
    "RequestId": "41cc9a1b-ec77-428f-a9e5-1024a88ce355"
}
```

按名称精确查找：

```bash
tccli cam GetUser --Name kerwinwjyan --region ap-guangzhou --output json
```

Output：

```json
{
    "Uin": 100049208872,
    "Name": "kerwinwjyan",
    "Uid": 25414444,
    "Remark": "kerwinwjyan-tag管控用户",
    "ConsoleLogin": 1,
    "CountryCode": "86",
    "RecentlyLoginTime": "2026-06-09 16:51:03",
    "RequestId": "91f2f52c-b760-4077-93b9-b818d825c4a9"
}
```

> 记录目标子账号的 `Uin`（数字），后续绑定/解绑策略时需使用。

### 步骤4：创建自定义策略

当预设策略不满足精细化需求时，创建自定义策略（Scope=Local）。核心是构造 `PolicyDocument` JSON——包含 `version` 和 `statement` 数组。

**PolicyDocument 结构**：

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": ["tcr:<ActionName>"],
      "resource": ["qcs::tcr:<region>:uin/<uin>:<ResourceType>/<ResourcePath>"],
      "effect": "allow"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | String | 固定 `"2.0"` |
| `statement` | Array | 声明数组，每条声明定义一组权限 |
| `statement[].action` | Array of String | CAM Action 名，格式 `tcr:<ActionName>`，支持 `*` 通配（如 `tcr:Describe*`） |
| `statement[].resource` | Array of String | QCS 六段式资源描述，支持 `*` 通配 |
| `statement[].effect` | String | `"allow"` 或 `"deny"` |

#### 4a. 常用 CAM Action 速查

| 权限层级 | Action 示例 | 适用场景 |
|----------|------------|---------|
| 全读写 | `tcr:*` | 管理员 |
| 全部只读 | `tcr:Describe*`、`tcr:PullRepository*` | 开发/审计 |
| 实例管理 | `tcr:CreateInstance`、`tcr:DeleteInstance`、`tcr:ModifyInstance` | 实例生命周期 |
| 实例查询 | `tcr:DescribeInstances`、`tcr:DescribeInstanceStatus` | 查看实例信息 |
| 命名空间管理 | `tcr:CreateNamespace`、`tcr:DeleteNamespace` | 命名空间 CRUD |
| 仓库管理 | `tcr:CreateRepository`、`tcr:DeleteRepository`、`tcr:DescribeRepositories` | 仓库 CRUD |
| 镜像操作 | `tcr:PullRepository`、`tcr:PushRepository` | 镜像推拉 |
| 访问控制 | `tcr:ManageInternalEndpoint`、`tcr:ManageExternalEndpoint` | 网络策略 |
| Token 管理 | `tcr:CreateInstanceToken`、`tcr:DeleteInstanceToken` | 长期凭证 |
| 复制实例 | `tcr:CreateReplicationInstance`、`tcr:DescribeReplicationInstances` | 实例同步 |

> 完整列表参见 [企业版接入 CAM 的 API 列表](https://cloud.tencent.com/document/product/1141/41605)。

#### 4b. 策略模板一：授权子账号管理指定实例

```bash
tccli cam CreatePolicy \
  --PolicyName "TCR-Manage-tcr-0e2hz15l" \
  --PolicyDocument '{"version":"2.0","statement":[{"action":["tcr:*"],"resource":["qcs::tcr:ap-guangzhou::instance/tcr-0e2hz15l","qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/*"],"effect":"allow"}]}' \
  --Description "全读写 TCR 实例 tcr-0e2hz15l" \
  --region ap-guangzhou \
  --output json
```

Output：

```json
{
    "PolicyId": 14089,
    "RequestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

> `resource` 中 `uin` 段留空表示创建策略的主账号。

#### 4c. 策略模板二：授权子账号只读某个仓库

```bash
tccli cam CreatePolicy \
  --PolicyName "TCR-ReadOnly-repo-demo" \
  --PolicyDocument '{"version":"2.0","statement":[{"action":["tcr:DescribeRepositories","tcr:PullRepository"],"resource":["qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/kerwinwjyan-ns/test-repo","qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/kerwinwjyan-ns/test-repo/*"],"effect":"allow"},{"action":["tcr:DescribeInstances","tcr:DescribeInstanceStatus","tcr:DescribeNamespaces"],"resource":["qcs::tcr:ap-guangzhou::instance/tcr-0e2hz15l","qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/kerwinwjyan-ns"],"effect":"allow"}]}' \
  --Description "只读 kerwinwjyan-ns/test-repo 仓库" \
  --region ap-guangzhou \
  --output json
```

**PolicyDocument 格式化**：

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": ["tcr:DescribeRepositories", "tcr:PullRepository"],
      "resource": [
        "qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/kerwinwjyan-ns/test-repo",
        "qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/kerwinwjyan-ns/test-repo/*"
      ],
      "effect": "allow"
    },
    {
      "action": ["tcr:DescribeInstances", "tcr:DescribeInstanceStatus", "tcr:DescribeNamespaces"],
      "resource": [
        "qcs::tcr:ap-guangzhou::instance/tcr-0e2hz15l",
        "qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/kerwinwjyan-ns"
      ],
      "effect": "allow"
    }
  ]
}
```

> **设计要点**：只读仓库场景需两个 Statement——第一条授予仓库/镜像的读权限；第二条授予实例和命名空间的查询权限（否则子账号进入控制台或 CLI 无法看到实例列表）。

#### 4d. 策略模板三：授权子账号管理指定命名空间

```bash
tccli cam CreatePolicy \
  --PolicyName "TCR-Manage-ns-kerwinwjyan-ns" \
  --PolicyDocument '{"version":"2.0","statement":[{"action":["tcr:*"],"resource":["qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/kerwinwjyan-ns","qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/kerwinwjyan-ns/*"],"effect":"allow"},{"action":["tcr:DescribeInstances","tcr:DescribeInstanceStatus"],"resource":["qcs::tcr:ap-guangzhou::instance/tcr-0e2hz15l"],"effect":"allow"}]}' \
  --Description "管理 kerwinwjyan-ns 命名空间下的全部仓库" \
  --region ap-guangzhou \
  --output json
```

> `repository/<RegistryId>/<Ns>/*` 覆盖命名空间下所有仓库及子路径（tag/artifact）。

#### 4e. Shell 中 PolicyDocument 传入技巧

| Shell | 方式 | 示例 |
|-------|------|------|
| bash/zsh | 单引号包裹整个 JSON，内部用双引号 | `--PolicyDocument '{"version":"2.0",...}'` |
| bash/zsh（长 JSON） | `--cli-input-json file://policy.json` | 见下方 |
| PowerShell | here-string `@'...'@` | `--PolicyDocument @'{"version":"2.0",...}'@` |
| PowerShell（文件） | `--cli-input-json file://policy.json` | 同 bash |

文件模式（推荐复杂策略）：

```bash
# 将 PolicyDocument 写入文件
cat > /tmp/tcr-readonly-repo.json << 'EOF'
{
  "version": "2.0",
  "statement": [
    {
      "action": ["tcr:DescribeRepositories", "tcr:PullRepository"],
      "resource": [
        "qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/kerwinwjyan-ns/test-repo",
        "qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/kerwinwjyan-ns/test-repo/*"
      ],
      "effect": "allow"
    },
    {
      "action": ["tcr:DescribeInstances", "tcr:DescribeInstanceStatus", "tcr:DescribeNamespaces"],
      "resource": [
        "qcs::tcr:ap-guangzhou::instance/tcr-0e2hz15l",
        "qcs::tcr:ap-guangzhou::repository/tcr-0e2hz15l/kerwinwjyan-ns"
      ],
      "effect": "allow"
    }
  ]
}
EOF

tccli cam CreatePolicy \
  --PolicyName "TCR-ReadOnly-repo-demo" \
  --Description "只读 kerwinwjyan-ns/test-repo 仓库" \
  --cli-input-json file:///tmp/tcr-readonly-repo.json \
  --region ap-guangzhou \
  --output json
```

### 步骤5：为子账号绑定策略

将策略（预设或自定义）绑定到目标子账号：

```bash
tccli cam AttachUserPolicy \
  --PolicyId <PolicyId> \
  --AttachUin <子账号Uin> \
  --region ap-guangzhou \
  --output json
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `PolicyId` | Integer | **是** | 策略 ID（从 `ListPolicies` 或 `CreatePolicy` 获取） |
| `AttachUin` | Integer | **是** | 子账号 Uin（从 `GetUser` / `ListUsers` 获取） |

Output：

```json
{
    "RequestId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

> **幂等**：同一策略重复绑定同一子账号不会报错，返回有效 `RequestId`。

### 步骤6：验证绑定结果

```bash
tccli cam ListAttachedUserPolicies \
  --TargetUin 100049208872 \
  --Rp 20 \
  --Page 1 \
  --region ap-guangzhou \
  --output json
```

Output：

```json
{
    "TotalNum": 2,
    "List": [
        {
            "PolicyId": 30100465,
            "PolicyName": "QcloudTCRFullAccess",
            "AddTime": "2025-06-15 16:53:22",
            "CreateMode": 2
        },
        {
            "PolicyId": 14089,
            "PolicyName": "TCR-Manage-tcr-0e2hz15l",
            "AddTime": "2026-06-16 10:30:15",
            "CreateMode": 1
        }
    ],
    "RequestId": "c3d4e5f6-a7b8-9012-cdef-123456789012"
}
```

> `CreateMode`：`1` = 自定义策略，`2` = 预设策略（QCS）。

### 步骤7：解绑策略

```bash
tccli cam DetachUserPolicy \
  --PolicyId <PolicyId> \
  --DetachUin <子账号Uin> \
  --region ap-guangzhou \
  --output json
```

Output：

```json
{
    "RequestId": "d4e5f6a7-b8c9-0123-defa-234567890123"
}
```

### 步骤8：删除自定义策略

```bash
tccli cam DeletePolicy \
  --PolicyId '[<PolicyId>]' \
  --region ap-guangzhou \
  --output json
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `PolicyId` | Array of Integer | **是** | 策略 ID 数组，格式 `'[14089]'`。**预设策略不可删除** |

Output：

```json
{
    "RequestId": "e5f6a7b8-c9d0-1234-efab-345678901234"
}
```

> **注意**：`--PolicyId` 在 `DeletePolicy` 中是 **数组类型**，即使删除单个策略也需传入 `'[14089]'`（而非 `14089`）。

## 验证

### Control plane (tccli)

| 验证项 | 命令 | 期望结果 |
|--------|------|---------|
| 预设策略存在 | `tccli cam ListPolicies --Scope QCS --Keyword tcr` | `TotalNum >= 2`，含 `QcloudTCRFullAccess`、`QcloudTCRReadOnlyAccess` |
| 策略详情可查 | `tccli cam GetPolicy --PolicyId <PolicyId>` | 返回 `PolicyName` + 有效 `PolicyDocument` JSON |
| 自定义策略已创建 | `tccli cam ListPolicies --Scope Local` | 列表中含新创建的策略名 |
| 绑定成功 | `tccli cam ListAttachedUserPolicies --TargetUin <Uin>` | 列表含目标 `PolicyId` |
| 解绑成功 | 同上（解绑后） | 列表中不含目标 `PolicyId` |
| 策略已删除 | `tccli cam ListPolicies --Scope Local` | 列表中不含已删除的策略 |

### Data plane（权限生效验证）

子账号绑定策略后，用该子账号的密钥执行 TCR 操作验证权限生效：

| 验证项 | 命令（子账号执行） | 期望结果 |
|--------|-------------------|---------|
| 只读用户可 Describe | `tccli tcr DescribeInstances --AllRegion true --region ap-guangzhou --output json` | 返回实例列表 |
| 只读用户不可 Delete | `tccli tcr DeleteInstance --RegistryId tcr-0e2hz15l` | `UnauthorizedOperation` 错误 |
| 仓库只读可 Pull | `docker pull kerwinwjyan-rewrite-001.tencentcloudcr.com/kerwinwjyan-ns/test-repo:latest` | 拉取成功 |
| 仓库只读不可 Push | `docker push kerwinwjyan-rewrite-001.tencentcloudcr.com/kerwinwjyan-ns/test-repo:latest` | `denied` 错误 |
| 命名空间管理者可创建仓库 | `tccli tcr CreateRepository --RegistryId tcr-0e2hz15l --Namespace kerwinwjyan-ns --Repository test-repo-2` | 创建成功 |

> **注意**：CAM 策略变更有 1--2 分钟传播延迟。若刚绑定策略后子账号仍报权限拒绝，等待 1--2 分钟后重试。

## 清理

### 解绑策略

```bash
tccli cam DetachUserPolicy \
  --PolicyId <PolicyId> \
  --DetachUin <子账号Uin> \
  --region ap-guangzhou \
  --output json
```

### 删除自定义策略

```bash
tccli cam DeletePolicy \
  --PolicyId '[<PolicyId>]' \
  --region ap-guangzhou \
  --output json
```

> **不可逆提醒**：
> - 删除策略将立即影响所有已绑定该策略的子账号权限。
> - 预设策略（`QcloudTCRFullAccess` / `QcloudTCRReadOnlyAccess`）不可删除，`DeletePolicy` 将返回 `FailedOperation`。
> - 若策略仍有绑定关系，`DeletePolicy` 将失败——需先执行 `DetachUserPolicy` 解绑所有关联子账号后重试。

## 排障

| 现象 | 诊断命令 | 根因 | 修复 |
|------|---------|------|------|
| `CreatePolicy` 返回 `InvalidParameter.PolicyName` | — | 策略名重复（同一主账号下策略名必须唯一） | 更换 `PolicyName` |
| `CreatePolicy` 返回 `InvalidParameter.PolicyDocument` | 用 `python3 -m json.tool` 或 `jq` 校验 JSON | PolicyDocument JSON 格式错误（引号、逗号、数组结构） | 确保 `"version":"2.0"`、`statement` 为数组、`effect` 为 `"allow"` 或 `"deny"` |
| `CreatePolicy` 返回 `InvalidParameter.Resource` | 检查 QCS 资源格式 | QCS 六段式格式错误（段数不对、Arn 拼写错误） | 确认格式 `qcs::tcr:$region:uin/$uin:instance/$RegistryId`，段间用 `:` 分隔 |
| `AttachUserPolicy` 返回 `FailedOperation.PolicyFull` | `tccli cam ListAttachedUserPolicies --TargetUin <Uin>` 统计数量 | 子账号绑定策略数已达上限 | 解绑不再需要的策略后重试 |
| `AttachUserPolicy` 返回 `FailedOperation.UserNotExist` | `tccli cam GetUser --Name <Name>` 确认 | `AttachUin` 不存在 | 用 `ListUsers` 获取正确的子账号 Uin |
| `DeletePolicy` 返回 `FailedOperation.PolicyIdNotExist` | `tccli cam GetPolicy --PolicyId <Id>` 确认存在 | PolicyId 不存在或已被删除 | 检查 `--PolicyId` 格式（必须为 `'[14089]'` 数组形式） |
| `DeletePolicy` 返回 `FailedOperation.PolicyInUse` | `tccli cam ListEntitiesForPolicy --PolicyId <Id>` | 策略仍有子账号/用户组绑定 | 先执行 `DetachUserPolicy` 解绑所有关联实体 |
| 子账号访问 TCR 报 `UnauthorizedOperation` | 子账号执行 `tccli tcr DescribeInstances` 等操作 | 策略 Action/Resource 不匹配，或策略尚未生效 | 1) 确认 Action 包含对应操作 2) 确认 Resource QCS 匹配实例/仓库 3) 等待 1--2 分钟传播延迟 |
| `ListPolicies --Keyword tcr` 不返回 TCR 策略 | `tccli cam ListPolicies --Scope QCS` 查看全部 | `--Keyword` 区分大小写 | 使用 `--Keyword tcr`（全小写） |
| Shell 中 PolicyDocument JSON 解析失败 | — | 外部双引号被 Shell 解析 | bash/zsh 用单引号包裹：`--PolicyDocument '{...}'`；PowerShell 用 here-string `@'...'@` |

## 下一步

- [企业版接入 CAM 的 API 列表](https://cloud.tencent.com/document/product/1141/41605) — 可授权的全部 TCR Action 清单
- [个人版授权方案示例](https://cloud.tencent.com/document/product/1141/41409)（page_id `41409`）
- [访问权限管理概述](../permission-overview)（page_id `40718`）
- [服务级账号管理](../../credentials/service-credentials) — TCR 实例级服务账号（与 CAM 子账号互补）
- [创建企业版实例](../../../create)（page_id `51110`）— 实例创建后配置访问权限

## 控制台替代

[访问管理控制台 → 策略](https://console.cloud.tencent.com/cam/policy)：可视化创建/编辑/删除 CAM 策略，按用户/用户组/角色筛选绑定策略。

[容器镜像服务 → 实例列表](https://console.cloud.tencent.com/tcr/instance)：查看 TCR 实例的 RegistryId、地域、状态等信息，用于构造 QCS 资源描述。
