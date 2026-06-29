---
title: "个人版授权方案示例"
description: "· page_id `41409` · 概念页"
---

> 对照官方：[个人版授权方案示例](https://cloud.tencent.com/document/product/1141/41409) · page_id `41409` · 概念页

## 概述

本文档提供 TCR 个人版的 CAM 自定义策略 JSON 示例，覆盖全读写、只读、命名空间管理、单仓库只读四种典型授权场景。所有示例仅适用于个人版使用场景（资源类型为 `repo`）。

**四种方案速览：**

| 方案 | 适用角色 | 权限范围 |
|------|---------|---------|
| 方案一：全读写 | 管理员 / CI/CD 服务账号 | 所有命名空间下所有仓库的完整读写 |
| 方案二：只读 | 开发者（只读） | 查询所有仓库信息 + 拉取所有镜像 |
| 方案三：管理指定命名空间 | 团队 namespace 管理员 | 指定命名空间下所有仓库的完整读写 |
| 方案四：只读某个镜像仓库 | 外部协作者 | 仅拉取指定仓库的镜像，无法修改或推送 |

## 前置条件

### 概念准备：个人版资源六段式

个人版 CAM 授权使用 `repo` 资源类型，六段式格式为：

```
qcs::tcr:$region:$account:repo/$namespace/$repo
```

| 段位 | 值 | 说明 |
|------|---|------|
| 第 1 段 | `qcs` | 腾讯云资源标识前缀 |
| 第 2 段 | (空) | 项目 ID（个人版不使用） |
| 第 3 段 | `tcr` | 产品名称 |
| 第 4 段 | `$region` | 地域，留空表示所有地域 |
| 第 5 段 | `$account` | 主账号 UIN，留空表示当前主账号 |
| 第 6 段 | `repo/<路径>` | 资源路径 |

> **关键区别：** 个人版使用 `repo` 类型，企业版使用 `instance` 和 `repository` 类型。两者不可混用。

### 操作索引：方案涉及的 CAM Action

| Action | 作用 | 涉及方案 |
|--------|------|---------|
| `tcr:*` | TCR 全部操作 | 方案一、三 |
| `tcr:Describe*` | 全部查询类 API | 方案二、四 |
| `tcr:PullRepositoryPersonal` | 拉取镜像 | 方案二、四 |
| `tcr:PushRepositoryPersonal` | 推送镜像 | 方案一、三 |

## 控制台与 CLI 参数映射

CAM 策略是声明式配置，无对应的 tccli 创建命令（策略通过 CAM API 管理），但可通过以下 CLI 操作实现策略的等效验证。

### CAM 策略管理 CLI

```bash
# 创建自定义策略
tccli cam CreatePolicy \
    --PolicyName "<StrategyName>" \
    --PolicyDocument "<JSON>" \
    --Description "<Description>" \
    --region ap-guangzhou

# 将策略绑定到子账号
tccli cam AttachUserPolicy \
    --AttachUin <SubAccountUin> \
    --PolicyId <PolicyId> \
    --region ap-guangzhou

# 查询子账号关联的策略列表
tccli cam ListAttachedUserPolicies \
    --TargetUin <SubAccountUin> \
    --Page 1 \
    --Rp 20 \
    --region ap-guangzhou
```

对应 CAM 控制台操作：

| 控制台操作 | CLI | 幂等 |
|-----------|-----|------|
| 新建自定义策略 | `tccli cam CreatePolicy` | 否（同名报错） |
| 关联策略到用户 | `tccli cam AttachUserPolicy` | 是（重复关联不报错） |
| 查看用户关联策略 | `tccli cam ListAttachedUserPolicies` | 是 |
| 解绑用户策略 | `tccli cam DetachUserPolicy` | 是 |
| 删除自定义策略 | `tccli cam DeletePolicy` | 是 |

## 操作步骤

### 方案一：全读写权限

**场景：** 授予子账号 TCR 个人版内全部资源的全读写操作权限。适用于 CI/CD Pipeline 服务账号或团队管理员。

**策略 JSON：**

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

| 要素 | 取值 | 说明 |
|------|------|------|
| `action` | `tcr:*` | 通配所有 TCR 个人版 API |
| `resource` | `qcs::tcr:::repo/*` | 所有命名空间下所有仓库 |
| `effect` | `allow` | 允许 |

**权限覆盖范围：**

- 命名空间的增删查
- 镜像仓库的增删查改
- 镜像 Tag 的查询、删除、复制
- 镜像生命周期策略管理
- 触发器管理
- 用户配额查询

> **安全建议：** 生产环境中尽量避免使用 `tcr:*` 全量授权。优先使用方案三按命名空间收敛权限范围。

### 方案二：只读权限

**场景：** 授予子账号 TCR 个人版内全部资源的只读操作权限（可查看仓库信息 + 拉取镜像，不可推送、修改或删除）。适用于只需读取镜像的开发者。

**策略 JSON：**

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": [
        "tcr:Describe*",
        "tcr:PullRepository*"
      ],
      "resource": [
        "qcs::tcr:::repo/*"
      ],
      "effect": "allow"
    }
  ]
}
```

| 要素 | 取值 | 说明 |
|------|------|------|
| `action[0]` | `tcr:Describe*` | 所有查询类 API（命名空间/仓库/镜像/触发器/配额） |
| `action[1]` | `tcr:PullRepository*` | 拉取镜像（含 `PullRepositoryPersonal`） |
| `resource` | `qcs::tcr:::repo/*` | 所有仓库 |

**权限覆盖范围：**

- `DescribeNamespacePersonal` — 查询命名空间
- `DescribeRepositoryOwnerPersonal` / `DescribeRepositoryPersonal` — 查询仓库
- `DescribeImagePersonal` — 查询镜像 Tag
- `DescribeUserQuotaPersonal` — 查询配额
- `DescribeFavorRepositoryPersonal` — 查询收藏列表
- `PullRepositoryPersonal` — 拉取镜像（docker pull）

**权限排除范围：**

- `Create*` — 不可创建命名空间/仓库
- `Delete*` — 不可删除任何资源
- `Modify*` — 不可修改仓库属性
- `PushRepositoryPersonal` — 不可推送镜像（docker push）

**验证示例：**

```bash
# 验证只读权限见效 — 可以查询
tccli tcr DescribeNamespacePersonal --region ap-guangzhou --output json
# expected: exit 0

# 验证只读权限见效 — 不可创建
tccli tcr CreateNamespacePersonal --Namespace test-ns --region ap-guangzhou --output json
# expected: UnauthorizedOperation（CAM 拦截）
```

### 方案三：管理指定命名空间

**场景：** 授权子账号管理指定地域内的指定命名空间（含其下所有仓库的完整读写权限）。适用于按团队划分命名空间的场景。

**示例：** 授予 `team-01` 命名空间及其下所有仓库的完整管理权限。

**策略 JSON：**

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": [
        "tcr:*"
      ],
      "resource": [
        "qcs::tcr:::repo/team-01",
        "qcs::tcr:::repo/team-01/*"
      ],
      "effect": "allow"
    }
  ]
}
```

| 要素 | 取值 | 说明 |
|------|------|------|
| `resource[0]` | `qcs::tcr:::repo/team-01` | 命名空间本身（允许对该命名空间的操作） |
| `resource[1]` | `qcs::tcr:::repo/team-01/*` | 命名空间下所有仓库 |
| `action` | `tcr:*` | 对上述资源的所有操作 |

> **为什么需要两个 resource？** `repo/team-01` 匹配命名空间级的操作（如 `DeleteNamespacePersonal`），`repo/team-01/*` 匹配仓库级的操作（如 `CreateRepositoryPersonal`）。仅配一个会导致部分操作被 CAM 拦截。

**权限覆盖范围（限定在 `team-01` 内）：**

- 删除命名空间 `team-01`（操作命名空间本身）
- 在 `team-01` 下创建/删除/查看仓库
- 推送/拉取 `team-01/*` 下的镜像
- 管理 `team-01/*` 下仓库的触发器和生命周期

**权限排除范围：**

- 无法操作 `team-02` 等其他命名空间
- 无法查看全局配额（`DescribeUserQuotaPersonal` 使用 `repo/*` 资源）

### 方案四：只读某个镜像仓库

**场景：** 授权子账号只读单个镜像仓库（仅能拉取该仓库内镜像，无法删除仓库、修改仓库属性及推送镜像）。适用于外部协作者或跨团队只读访问。

**示例：** 授予 `team-01/repo-demo` 仓库的只读权限。

**策略 JSON：**

```json
{
  "version": "2.0",
  "statement": [
    {
      "action": [
        "tcr:Describe*",
        "tcr:PullRepositoryPersonal"
      ],
      "resource": [
        "qcs::tcr:::repo/team-01",
        "qcs::tcr:::repo/team-01/repo-demo",
        "qcs::tcr:::repo/team-01/repo-demo/*"
      ],
      "effect": "allow"
    }
  ]
}
```

| 要素 | 取值 | 说明 |
|------|------|------|
| `resource[0]` | `qcs::tcr:::repo/team-01` | 命名空间（需要命名空间的读权限以发现仓库） |
| `resource[1]` | `qcs::tcr:::repo/team-01/repo-demo` | 仓库本身（查看仓库信息） |
| `resource[2]` | `qcs::tcr:::repo/team-01/repo-demo/*` | 仓库内镜像 Tag |

> **为什么需要三个 resource？** `team-01` 表示命名空间本身的查询权限；`team-01/repo-demo` 匹配仓库级的查询操作；`team-01/repo-demo/*` 匹配镜像 Tag 的查询和拉取操作。三者缺一不可。

**权限覆盖范围（限定在 `team-01/repo-demo` 内）：**

- 查询命名空间 `team-01`（命名空间级 Describe）
- 查询仓库 `team-01/repo-demo` 信息
- 查询仓库内镜像 Tag 信息
- 拉取仓库内镜像（docker pull）

**权限排除范围：**

- 不可推送镜像到 `repo-demo`
- 不可删除 `repo-demo` 或其中 Tag
- 不可查看 `team-01` 下其他仓库（如 `repo-other`）

## 验证

授予子账号策略后，可在子账号环境中执行以下命令验证权限矩阵：

### 方案一（全读写）验证矩阵

| 验证操作 | 命令 | 预期 |
|---------|------|------|
| 查询命名空间 | `tccli tcr DescribeNamespacePersonal --region ap-guangzhou` | exit 0 |
| 创建命名空间 | `tccli tcr CreateNamespacePersonal --Namespace test-ns --region ap-guangzhou` | exit 0 |
| 删除命名空间 | `tccli tcr DeleteNamespacePersonal --Namespace test-ns --region ap-guangzhou` | exit 0 |
| 查询配额 | `tccli tcr DescribeUserQuotaPersonal --region ap-guangzhou` | exit 0 |

### 方案二（只读）验证矩阵

| 验证操作 | 命令 | 预期 |
|---------|------|------|
| 查询命名空间 | `tccli tcr DescribeNamespacePersonal --region ap-guangzhou` | exit 0 |
| 查询配额 | `tccli tcr DescribeUserQuotaPersonal --region ap-guangzhou` | exit 0 |
| 创建命名空间（应被拒） | `tccli tcr CreateNamespacePersonal --Namespace test-ns --region ap-guangzhou` | UnauthorizedOperation |

### 方案三（管理指定命名空间）验证矩阵

| 验证操作 | 命令 | 预期 |
|---------|------|------|
| 在授权命名空间下查询 | `tccli tcr DescribeRepositoryPersonal --RepoName team-01/<repo> --region ap-guangzhou` | exit 0 |
| 在未授权命名空间下查询 | `tccli tcr DescribeRepositoryPersonal --RepoName other-ns/<repo> --region ap-guangzhou` | UnauthorizedOperation |

### 方案四（只读单仓库）验证矩阵

| 验证操作 | 命令 | 预期 |
|---------|------|------|
| 查询授权仓库 | `tccli tcr DescribeRepositoryPersonal --RepoName team-01/repo-demo --region ap-guangzhou` | exit 0 |
| 查询未授权仓库 | `tccli tcr DescribeRepositoryPersonal --RepoName team-01/repo-other --region ap-guangzhou` | UnauthorizedOperation |

## 清理

CAM 策略的解绑与清理遵循以下规则：

```bash
# 解绑用户策略
tccli cam DetachUserPolicy --AttachUin <SubAccountUin> --PolicyId <PolicyId> --region ap-guangzhou
# expected: exit 0，返回 RequestId

# 删除策略（已解绑所有关联用户后）
tccli cam DeletePolicy --PolicyId <PolicyId> --region ap-guangzhou
# expected: exit 0，返回 RequestId
```

| 操作 | 方法 | 效果 |
|------|------|------|
| 解绑用户策略 | `tccli cam DetachUserPolicy --AttachUin <Uin> --PolicyId <PolicyId>` | 立即回收权限 |
| 删除策略 | `tccli cam DeletePolicy --PolicyId <PolicyId>` | 策略从系统中移除（前提：已解绑所有关联用户） |
| 更新策略内容 | `tccli cam UpdatePolicy --PolicyId <PolicyId> --PolicyDocument "<JSON>"` | 实时生效（缓存最多 1 分钟） |

> CAM 策略变更实时生效，无需重启或被授权方重新登录。

## 排障

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 策略 JSON 保存时提示 "resource format error" | 检查 resource 六段式中的 `repo` 拼写（小写）和双冒号 `:::` | `resource` 格式不合法 | 确保格式为 `qcs::tcr:::repo/<路径>`，注意三组冒号：`:::` |
| 方案三只配 `repo/team-01/*` 时不生效 | 子账号尝试 `DeleteNamespacePersonal --Namespace team-01` | 缺少 `repo/team-01` — 命名空间级操作需要精确匹配命名空间 resource | 在 resource 数组中同时添加 `qcs::tcr:::repo/team-01` |
| 方案四配置后无法拉取镜像 | `docker pull` 返回 unauthorized | 缺少 `tcr:PullRepositoryPersonal` Action 或 resource 不完整 | 确认 Action 包含 `tcr:PullRepositoryPersonal`，resource 包含仓库名和 `/*` |
| `tcr:*` 授权后仍提示无权限 | 检查策略中是否有 `deny` 效应的同名 statement | CAM `deny` 优先级高于 `allow` | 移除或缩小 `deny` 语句的作用范围 |
| 策略变更后 1 分钟内未生效 | 等待 2 分钟后重试 | CAM 的最终一致性：策略变更传播到各个 Region 需要数秒到 1 分钟 | 等待最多 2 分钟后重试操作，属正常现象 |

## 下一步

- [个人版接入 CAM 的 API 列表](../cam-api-list) — 完整的 Action 列表与资源六段式对照
- [个人版资源级 API 接口及授权方案变更指南](../api-migration) — 旧版 CCR → 新版 TCR Personal 迁移对照
- [个人版命名空间管理](../命名空间管理) — 个人版命名空间的 CLI 操作
- [环境准备](../../index.md) — tccli 安装与凭证配置

## 控制台替代

- **CAM 策略管理：** [访问管理控制台 → 策略](https://console.cloud.tencent.com/cam/policy) — 可视化管理自定义策略
- **子账号授权：** [访问管理控制台 → 用户 → 用户列表](https://console.cloud.tencent.com/cam) — 为用户关联/解绑策略
- **策略生成器：** [访问管理控制台 → 策略 → 新建自定义策略 → 按策略生成器创建](https://console.cloud.tencent.com/cam/policy/create) — 可视化勾选 Action，自动生成 JSON
