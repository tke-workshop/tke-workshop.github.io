---
title: "个人版接入 CAM 的 API 列表"
description: "· page_id `41415` · 概念页"
---

> 对照官方：[个人版接入 CAM 的 API 列表](https://cloud.tencent.com/document/product/1141/41415) · page_id `41415` · 概念页

## 概述

TCR 个人版（原 CCR）的 API 已接入 CAM（访问管理），支持资源级鉴权。本文档列出所有可授予子账号的 API 操作（Action）及其资源六段式描述，供编写 CAM 自定义策略时参考。

**核心概念：**

| 概念 | 说明 |
|------|------|
| **产品前缀** | `tcr` — 所有个人版 API 的 Action 以 `tcr:` 开头 |
| **资源类型** | `repo` — 个人版仅使用 `repo` 资源类型（企业版另有 `instance`、`repository`） |
| **资源六段式** | `qcs::tcr:$region:$account:repo/` — `$region` 和 `$account` 可省略，表示所有地域/当前主账号 |
| **鉴权粒度** | 支持命名空间级（`repo/$namespace`）、仓库级（`repo/$namespace/$repo`）、全量级（`repo/*`） |

## 前置条件

### 概念准备：理解 CAM 策略语法

编写 CAM 策略前需了解以下要素：

| 要素 | 含义 | 个人版取值 |
|------|------|-----------|
| `action` | 允许的操作 | `tcr:<ApiName>`，如 `tcr:CreateNamespacePersonal` |
| `resource` | 操作的目标资源 | `qcs::tcr:$region:$account:repo/<路径>` |
| `effect` | 策略效力 | `allow`（允许）/ `deny`（显式拒绝，优先级更高） |

> 个人版不支持按 `instance`（实例）或 `repository`（企业版仓库）做资源级授权。所有资源描述使用 `repo` 类型。

## 控制台与 CLI 参数映射

### API 分类索引

个人版 CAM 接入的 API 按功能分为以下类别：

| 类 | API 数量 | 典型 Action |
|---|---------|------------|
| 命名空间 | 3 | `CreateNamespacePersonal`、`DeleteNamespacePersonal`、`ValidateNamespaceExistPersonal` |
| 镜像仓库 | 9 | `CreateRepositoryPersonal`、`DescribeRepositoryOwnerPersonal`、`DeleteRepositoryPersonal`、`BatchDeleteRepositoryPersonal` 等 |
| 镜像（Tag） | 5 | `DescribeImagePersonal`、`DeleteImagePersonal`、`BatchDeleteImagePersonal`、`DuplicateImagePersonal`、`DescribeImageFilterPersonal` |
| 生命周期 | 4 | `DescribeImageLifecyclePersonal`、`ManageImageLifecycleGlobalPersonal`、`DeleteImageLifecycleGlobalPersonal`、`DescribeImageLifecycleGlobalPersonal` |
| 触发器 | 5 | `CreateApplicationTriggerPersonal`、`ModifyApplicationTriggerPersonal`、`DescribeApplicationTriggerPersonal` 等 |
| 用户与配额 | 3 | `CreateUserPersonal`、`ModifyUserPasswordPersonal`、`DescribeUserQuotaPersonal` |
| 仓库属性 | 3 | `ModifyRepositoryAccessPersonal`、`ModifyRepositoryInfoPersonal`、`DescribeRepositoryFilterPersonal` |
| 收藏 | 1 | `DescribeFavorRepositoryPersonal` |

### 完整 API 列表与资源描述

#### 命名空间相关接口

| Action | 描述 | 资源六段式 |
|--------|------|-----------|
| `tcr:CreateNamespacePersonal` | 创建个人版命名空间 | `qcs::tcr:$region:$account:repo/$namespace` |
| `tcr:DeleteNamespacePersonal` | 删除个人版命名空间 | `qcs::tcr:$region:$account:repo/$namespace` |
| `tcr:ValidateNamespaceExistPersonal` | 验证命名空间是否存在 | `qcs::tcr:$region:$account:repo/$namespace` |

#### 镜像仓库相关接口

| Action | 描述 | 资源六段式 |
|--------|------|-----------|
| `tcr:DescribeRepositoryOwnerPersonal` | 查询个人版所有仓库 | `qcs::tcr:$region:$account:repo/*` |
| `tcr:DescribeRepositoryPersonal` | 查询个人版单个仓库 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:DescribeRepositoryFilterPersonal` | 按条件筛选仓库 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:CreateRepositoryPersonal` | 创建个人版镜像仓库 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:DeleteRepositoryPersonal` | 删除个人版镜像仓库 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:BatchDeleteRepositoryPersonal` | 批量删除个人版镜像仓库 | `qcs::tcr:$region:$account:repo/$namespace/*` |
| `tcr:ModifyRepositoryAccessPersonal` | 修改仓库访问权限 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:ModifyRepositoryInfoPersonal` | 修改仓库描述信息 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:ValidateRepositoryExistPersonal` | 验证仓库是否存在 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |

#### 镜像（Tag）相关接口

| Action | 描述 | 资源六段式 |
|--------|------|-----------|
| `tcr:DescribeImagePersonal` | 查询个人版仓库 Tag | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:DescribeImageFilterPersonal` | 按条件筛选镜像 Tag | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:DeleteImagePersonal` | 删除个人版仓库 Tag | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:BatchDeleteImagePersonal` | 批量删除个人版仓库 Tag | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:DuplicateImagePersonal` | 复制个人版镜像 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |

#### 镜像生命周期相关接口

| Action | 描述 | 资源六段式 |
|--------|------|-----------|
| `tcr:DescribeImageLifecyclePersonal` | 查询个人版镜像生命周期 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:DescribeImageLifecycleGlobalPersonal` | 查询全局镜像生命周期策略 | `qcs::tcr:$region:$account:repo/*` |
| `tcr:ManageImageLifecycleGlobalPersonal` | 管理全局镜像生命周期策略 | `qcs::tcr:$region:$account:repo/*` |
| `tcr:DeleteImageLifecycleGlobalPersonal` | 删除全局镜像生命周期策略 | `qcs::tcr:$region:$account:repo/*` |

#### 应用触发器相关接口

| Action | 描述 | 资源六段式 |
|--------|------|-----------|
| `tcr:CreateApplicationTriggerPersonal` | 创建应用更新触发器 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:ModifyApplicationTriggerPersonal` | 修改应用更新触发器 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:DeleteApplicationTriggerPersonal` | 删除应用更新触发器 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:DescribeApplicationTriggerPersonal` | 查询应用更新触发器列表 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:DescribeApplicationTriggerLogPersonal` | 查询应用更新触发器日志 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |

#### 用户与配额相关接口

| Action | 描述 | 资源六段式 |
|--------|------|-----------|
| `tcr:CreateUserPersonal` | 创建个人版用户（初始化） | `qcs::tcr:$region:$account:repo/*` |
| `tcr:ModifyUserPasswordPersonal` | 修改个人版用户密码 | `qcs::tcr:$region:$account:repo/*` |
| `tcr:DescribeUserQuotaPersonal` | 查询个人版用户配额 | `qcs::tcr:$region:$account:repo/*` |

#### 收藏相关接口

| Action | 描述 | 资源六段式 |
|--------|------|-----------|
| `tcr:DescribeFavorRepositoryPersonal` | 查询收藏仓库列表 | `qcs::tcr:$region:$account:repo/*` |

#### Pull / Push 操作

| Action | 描述 | 资源六段式 |
|--------|------|-----------|
| `tcr:PullRepositoryPersonal` | 拉取个人版镜像仓库内镜像 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |
| `tcr:PushRepositoryPersonal` | 推送个人版镜像仓库内镜像 | `qcs::tcr:$region:$account:repo/$namespace/$repo` |

> **注意：** `PullRepositoryPersonal` 和 `PushRepositoryPersonal` 用于 CAM 策略授权（Docker 客户端通过 `docker login` 凭证鉴权），但不对应 `tccli tcr` 命令行 API。实际的 `docker pull`/`docker push` 操作通过 TCR 域名和长期访问凭证完成。

### 资源六段式通配规则

| 表达式 | 匹配范围 | 适用场景 |
|--------|---------|---------|
| `qcs::tcr:::repo/*` | 所有命名空间下所有仓库 | 全读写/全只读授权 |
| `qcs::tcr:::repo/team-01` | 命名空间 `team-01` 本身（含命名空间级操作） | 授予对命名空间的管理权限 |
| `qcs::tcr:::repo/team-01/*` | `team-01` 下所有仓库 | 授予对命名空间内所有仓库的操作权限 |
| `qcs::tcr:::repo/team-01/repo-demo` | 单个仓库 `team-01/repo-demo` | 授予对特定仓库的精确权限 |
| `qcs::tcr:$region:$account:repo/...` | 指定地域+主账号下的资源 | 跨账号授权或多地域精确控制 |

> `$region` 和 `$account` 留空（即 `qcs::tcr:::`）表示所有地域和当前策略所属主账号，是最常用的简化写法。

## 操作步骤

以下为个人版 API 的 `tccli tcr` 命令行示例（非 CAM 策略）。这些命令在环境就绪时可直接执行，也可用于验证子账号是否具备相应权限。

### 用户与配额查询

```bash
# 查询个人版用户配额
tccli tcr DescribeUserQuotaPersonal --region ap-guangzhou --output json
```

参考输出（`$exit === 0`）：

```json
{
  "Data": {
    "LimitInfo": [
      {
        "Type": "namespace",
        "Value": 2000
      },
      {
        "Type": "repo",
        "Value": 10000
      },
      {
        "Type": "tag",
        "Value": 9999
      },
      {
        "Type": "trigger",
        "Value": 10
      }
    ]
  },
  "RequestId": "23d1f0c4-eaf9-4b8e-973e-36297d5edcf1"
}
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 退出码 | `$?` | `0`（有权限）或非 0（无权限，CAM 拦截） |
| 命名空间配额 | `LimitInfo[type=namespace].Value` | 正整数（默认 2000） |
| 仓库配额 | `LimitInfo[type=repo].Value` | 正整数（默认 10000） |
| Tag 配额 | `LimitInfo[type=tag].Value` | 正整数（默认 9999） |
| 触发器配额 | `LimitInfo[type=trigger].Value` | 正整数（默认 10） |

### 命名空间查询

```bash
# 查询个人版命名空间（无需 --RegistryId）
tccli tcr DescribeNamespacePersonal --region ap-guangzhou --output json
```

参考输出（`$exit === 0`）：

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

### 仓库总量查询

```bash
# 查询个人版所有仓库总数
tccli tcr DescribeRepositoryOwnerPersonal --region ap-guangzhou --output json
```

参考输出（`$exit === 0`）：

```json
{
  "Data": {
    "TotalCount": 9985
  },
  "RequestId": "from-live"
}
```

### 最小权限原则

编写 CAM 策略时应遵循最小权限原则：

1. **先用通配读权限确认 API 可用性** — 使用 `tcr:Describe*` + `tcr:PullRepository*` 授权只读最小集
2. **逐步收敛 resource** — 从 `qcs::tcr:::repo/*` 收敛到具体命名空间或仓库
3. **避免 `tcr:*` 全量授权** — 除非确需管理员级权限，否则精确列出所需 Action
4. **使用命名空间/仓库双字段组合** — 如 `qcs::tcr:::repo/team-01` 和 `qcs::tcr:::repo/team-01/*` 同时授权

## 验证

授予子账号策略后，可利用以下 tccli 命令验证权限是否生效：

```bash
# 验证只读权限
tccli tcr DescribeNamespacePersonal --region ap-guangzhou --Namespace "" --Limit 20 --Offset 0
# expected: exit 0（有权限）或 UnauthorizedOperation（权限不足）

# 验证创建权限
tccli tcr CreateNamespacePersonal --Namespace test-ns --region ap-guangzhou
# expected: exit 0（有权限）或 UnauthorizedOperation（无权限）

# 验证删除权限
tccli tcr DeleteNamespacePersonal --Namespace test-ns --region ap-guangzhou
# expected: exit 0（有权限）或 UnauthorizedOperation（无权限）
```

| 验证维度 | 命令 | 预期 |
|---------|------|------|
| 只读权限 | `tccli tcr DescribeNamespacePersonal --region ap-guangzhou --Namespace "" --Limit 20 --Offset 0` | exit 0（有权限）或 UnauthorizedOperation（权限不足） |
| 创建权限 | `tccli tcr CreateNamespacePersonal --Namespace test-ns --region ap-guangzhou` | exit 0（有权限）或 UnauthorizedOperation（无权限） |
| 删除权限 | `tccli tcr DeleteNamespacePersonal --Namespace test-ns --region ap-guangzhou` | exit 0（有权限）或 UnauthorizedOperation（无权限） |

> **真实验证数据：** 上述 `DescribeNamespacePersonal`、`DescribeRepositoryOwnerPersonal`、`DescribeUserQuotaPersonal` 三组命令均已通过真机实跑验证（`$exit === 0`），输出为 live data。`ModifyUserPasswordPersonal` 真机实跑返回 `The current login account(100049208872) has not initialized user info in the TCR Personal`（需先在控制台初始化个人版账号）。

## 清理

CAM 策略的解绑与清理遵循以下规则：

| 操作 | 方法 | 效果 |
|------|------|------|
| 解绑用户策略 | `tccli cam DetachUserPolicy --AttachUin <Uin> --PolicyId <PolicyId>` | 立即回收权限 |
| 删除策略 | `tccli cam DeletePolicy --PolicyId <PolicyId>` | 策略从系统中移除（前提：已解绑所有关联用户） |
| 更新策略内容 | `tccli cam UpdatePolicy --PolicyId <PolicyId> --PolicyDocument "<JSON>"` | 实时生效（缓存最多 1 分钟） |

- CAM 策略为实时生效——解绑子账号策略后立即回收权限，无需等待
- 个人版 `repo` 资源类型不支持按时间期限授权（如需限时授权，需在 CAM 角色中配置临时凭证）
- `PullRepositoryPersonal` / `PushRepositoryPersonal` 仅影响 Docker 客户端操作，不影响 `tccli` 命令调用
- 若子账号持有长期访问凭证（`CreateInstanceToken`），需在 `DeleteInstanceToken` 删除凭证后权限方可彻底回收

## 排障

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 子账号执行 `DescribeNamespacePersonal` 返回 `UnauthorizedOperation` | 在主账号 CAM 控制台查看子账号关联策略 | CAM 策略未包含 `tcr:DescribeNamespacePersonal`，或 resource 不匹配 | 在策略中添加对应 Action 和 Resource；注意 resource 六段式中 `$namespace` 是否与目标命名空间一致 |
| 子账号 `docker push` 报 `denied` | `tccli tcr DescribeUserQuotaPersonal` 确认账号配额正常；查看 CAM 策略 | CAM 策略未包含 `tcr:PushRepositoryPersonal` | 在策略中添加 `tcr:PushRepositoryPersonal`，resource 指向目标仓库 |
| `ModifyUserPasswordPersonal` 返回 UserInfo Not Initialized | 控制台 > TCR 个人版确认账号初始化状态 | 个人版用户尚未初始化（首次使用需在控制台激活） | 前往 [TCR 控制台 - 个人版](https://console.cloud.tencent.com/tcr/personal) 完成初始化，或使用 `DescribeUserQuotaPersonal` 先确认账号状态 |
| `tcr:*` 策略授权后仍无权删除 | 检查策略中是否有 `deny` 语句 | `deny` 优先级高于 `allow` | 移除或调整 `deny` 语句的 resource 范围 |
| 策略中 resource 带 `$region` 参数但子账号无法访问 | 确认实际操作的 region 与策略中一致 | CAM 策略中 `$region` 与操作请求的 `--region` 不匹配 | 将 resource 六段式中的 `$region` 置空（`qcs::tcr:::repo/...`）或确保 region 一致 |

## 下一步

- [个人版授权方案示例](../auth-examples) — 四个典型场景的 CAM 策略 JSON 示例
- [个人版资源级 API 接口及授权方案变更指南](../api-migration) — 旧版 CCR → 新版 TCR Personal 迁移对照
- [环境准备](../../index.md) — tccli 安装与凭证配置
- [tccli 专页（TCR）](../../../../tccli-专页tcr.md) — TCR CLI 操作通用模式

## 控制台替代

- **CAM 策略管理：** [访问管理控制台 → 策略](https://console.cloud.tencent.com/cam/policy) — 新建/编辑自定义策略，搜索 TCR 相关 Action
- **子账号授权：** [访问管理控制台 → 用户 → 用户列表](https://console.cloud.tencent.com/cam) — 为用户关联 TCR 策略
- **TCR 个人版控制台：** [容器镜像服务 → 个人版](https://console.cloud.tencent.com/tcr/personal) — 命名空间、仓库、触发器可视化管理
