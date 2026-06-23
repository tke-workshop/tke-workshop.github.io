---
title: "管理命名空间（tccli）"
description: "· page_id `41803`"
---

> 对照官方：[管理命名空间](https://cloud.tencent.com/document/product/1141/41803) · page_id `41803`

## 概述

通过 tccli 管理 TCR 企业版实例内的命名空间。命名空间是容器镜像仓库和 Helm Chart 的逻辑分组单元，用于按团队、项目或环境划分资源边界。自身不直接存储镜像数据，但对下级仓库的访问权限、安全扫描和部署阻断策略由命名空间统一控制。

核心操作覆盖：创建（含公开/私有策略）、查询、修改（自动扫描、漏洞阻断）、删除。所有操作依赖 `--RegistryId`（实例 ID），由 `DescribeInstances` 获取。

命名空间不收费，但创建后若在内部上传镜像，会产生 COS 存储费用。详见[计费概述](https://cloud.tencent.com/document/product/1141/40540)。

## 前置条件

- [环境准备](../../../index.md)
- 已 [购买企业版实例](../../../create) 且实例 `Status` 为 `Running`
- CAM 权限包含：`tcr:CreateNamespace`、`tcr:DescribeNamespaces`、`tcr:ModifyNamespace`、`tcr:DeleteNamespace`

### 环境检查

```bash
# 1. 确认实例存在且状态正常
tccli tcr DescribeInstances --Registryids '["tcr-example"]' --region ap-guangzhou --output json
```

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "tcr-example",
            "RegistryType": "basic",
            "Status": "Running",
            "PublicDomain": "tcr-example.tencentcloudcr.com",
            "InternalEndpoint": "10.1.67.13",
            "EnableAnonymous": true,
            "TokenValidTime": 87600,
            "DeletionProtection": false
        }
    ],
    "RequestId": "..."
}
```

```bash
# 2. 确认 CAM 权限（查询命名空间列表不报 UnauthorizedOperation）
tccli tcr DescribeNamespaces --RegistryId tcr-example --region ap-guangzhou --output json
```

### 命名约束

命名空间名仅支持小写字母、数字及连字符（`-`），不能以连字符开头或结尾，不能出现连续连字符。长度限制 2--30 个字符，同一实例内名称必须唯一。名称一旦创建不可修改。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 / 参数 | 幂等 |
|-----------|------------------|:--:|
| 查看命名空间列表 | `DescribeNamespaces --RegistryId <RegistryId>` | 是 |
| 新建命名空间（输入名称） | `CreateNamespace --NamespaceName <Name>` | 否（同名报错） |
| 选择公开/私有 | `--IsPublic true/false` | — |
| 开启自动扫描 | `ModifyNamespace --IsAutoScan true` | 是 |
| 阻断高危镜像部署 | `ModifyNamespace --IsPreventVUL true` | 是 |
| 设置漏洞严重级别 | `ModifyNamespace --Severity <level>` | 是 |
| 删除命名空间 | `DeleteNamespace --RegistryId <Id> --NamespaceName <Name>` | 否（级联删除不可恢复） |

## 关键字段说明

### CreateNamespace

| 字段 | 类型 | 必填 | 取值与约束 |
|------|------|:--:|------|
| `RegistryId` | String | 是 | 目标实例 ID（`DescribeInstances` 获取） |
| `NamespaceName` | String | 是 | 命名空间名，小写字母+数字+连字符，2--30 字符，实例内唯一 |
| `IsPublic` | Boolean | 否 | 默认 `false`。`true` = 公开（允许匿名拉取），`false` = 私有（需凭证访问） |
| `TagSpecification` | Object | 否 | `ResourceType`: `"namespace"`，`Tags`: 标签数组 |

### ModifyNamespace

| 字段 | 类型 | 必填 | 取值与约束 |
|------|------|:--:|------|
| `RegistryId` | String | 是 | 目标实例 ID |
| `NamespaceName` | String | 是 | 命名空间名 |
| `IsAutoScan` | Boolean | 否 | `true` = 开启自动扫描（新推送镜像自动触发安全扫描） |
| `IsPreventVUL` | Boolean | 否 | `true` = 阻断漏洞镜像拉取（需配合 `Severity` 使用） |
| `Severity` | String | 否 | 漏洞严重级别阈值：`low` / `medium` / `high` |

## 操作步骤

以下操作以实例 `tcr-example`、地域 `ap-guangzhou` 为例。命名空间名为自定义值（本例 `example-ns`）。

### 步骤1：创建命名空间

#### 选择依据

- **`is_public` 选 `true`**（公开）：允许匿名拉取镜像，无需凭证，适用于开源项目或公共基础镜像。备选方案为 `false`（私有命名空间，拉取需 `docker login` 认证），适合企业内部项目。
- **名称规划**：按团队/项目命名（如 `team-backend`、`project-api`），名称一旦创建不可修改。

```bash
tccli tcr CreateNamespace \
  --RegistryId tcr-example \
  --NamespaceName example-ns \
  --IsPublic true \
  --region ap-guangzhou --output json
```

**输出**：

```json
{
    "RequestId": "3c890bbf-de40-486d-ab6a-b38450cb99fa"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `tcr-example` | 实例 ID | 实例状态须 `Running` | `DescribeInstances` 获取 |
| `example-ns` | 命名空间名称 | 小写字母+数字+连字符，2--30 字符，实例内唯一 | 自定义 |

> `CreateNamespace` 同步返回，无需等待异步完成。

### 步骤2：查询命名空间列表

```bash
tccli tcr DescribeNamespaces --RegistryId tcr-example --region ap-guangzhou --output json
```

**输出**：

```json
{
    "NamespaceList": [
        {
            "Name": "example-ns",
            "NamespaceId": 2,
            "Public": true,
            "AutoScan": false,
            "CreationTime": "2026-06-18T09:32:47.946Z"
        }
    ],
    "TotalCount": 1,
    "RequestId": "..."
}
```

- `NamespaceId`：系统分配的整数 ID，部分内层 API（如 `CreateTagRetentionRule`）使用该数字引用命名空间
- `Public`：对应创建时 `IsPublic` 参数
- `AutoScan`：是否已开启自动安全扫描，默认 `false`
- `CreationTime`：命名空间创建时间（UTC）

### 步骤3：开启自动安全扫描

`auto_scan` 按需开启：开启后，新推送至该命名空间内任意镜像仓库的镜像将自动触发安全扫描，适合生产环境或 CI/CD 频繁推送场景。已有历史镜像不会回溯扫描，需重新推送或手动触发。

```bash
tccli tcr ModifyNamespace \
  --RegistryId tcr-example \
  --NamespaceName example-ns \
  --IsAutoScan true \
  --region ap-guangzhou --output json
```

**输出**：

```json
{
    "RequestId": "..."
}
```

> **注意**：`IsAutoScan` 状态更新存在延迟，执行 `DescribeNamespaces` 确认可能需要等待 10--30 秒。开启后仅对新推送的镜像生效。`ModifyNamespace` 的 `IsPreventVUL`、`Severity` 等漏洞阻断参数也可后续按需修改。

### 步骤4：删除命名空间

> **危险警告**：删除命名空间将**级联删除**其下所有镜像仓库和镜像版本，数据不可恢复。删除前务必用 `DescribeRepositories` 确认仓库列表。

#### 4a. 删除前检查

```bash
tccli tcr DescribeRepositories \
  --RegistryId tcr-example \
  --NamespaceName example-ns \
  --region ap-guangzhou --output json
```

**输出**（示例为空）：

```json
{
    "RepositoryList": [],
    "TotalCount": 0,
    "RequestId": "..."
}
```

> 若 `TotalCount > 0`，需先逐仓库删除镜像 Tag，再 `DeleteRepository` 清理仓库后，方可删除命名空间。

#### 4b. 执行删除

```bash
tccli tcr DeleteNamespace \
  --RegistryId tcr-example \
  --NamespaceName example-ns \
  --region ap-guangzhou --output json
```

**输出**：

```json
{
    "RequestId": "..."
}
```

## 验证

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 命名空间已创建 | `DescribeNamespaces --RegistryId tcr-example --region ap-guangzhou` | `NamespaceList` 包含 `example-ns` |
| 公开/私有属性正确 | 同上，过滤 `NamespaceList[?Name=='example-ns'].Public` | 与创建参数一致（如 `true`） |
| 自动扫描已开启 | 同上，过滤 `NamespaceList[?Name=='example-ns'].AutoScan` | `true`（等待 10--30 秒刷新） |
| 命名空间已删除 | `DescribeNamespaces --RegistryId tcr-example --region ap-guangzhou` | `NamespaceList` 中无 `example-ns` |

JMESPath 精确验证示例：

```bash
# 验证 Public 属性
tccli tcr DescribeNamespaces --RegistryId tcr-example --region ap-guangzhou --output json \
  --filter "NamespaceList[?Name=='example-ns']|[0].Public"
# expected: true

# 验证 AutoScan
tccli tcr DescribeNamespaces --RegistryId tcr-example --region ap-guangzhou --output json \
  --filter "NamespaceList[?Name=='example-ns']|[0].AutoScan"
# expected: true
```

## 清理

```bash
# 1. 检查命名空间下残留仓库
tccli tcr DescribeRepositories --RegistryId tcr-example --NamespaceName example-ns --region ap-guangzhou --output json
# expected: TotalCount: 0（若有残留，先逐仓库删除镜像 Tag 后 DeleteRepository）

# 2. 删除命名空间
tccli tcr DeleteNamespace --RegistryId tcr-example --NamespaceName example-ns --region ap-guangzhou --output json
# expected: exit 0

# 3. 验证已删除
tccli tcr DescribeNamespaces --RegistryId tcr-example --region ap-guangzhou --output json
# expected: NamespaceList 中无 example-ns
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateNamespace` 返回 `MissingParameter.RegistryId` | 检查命令行 | 忘记传 `--RegistryId` 参数 | 所有命名空间操作都需要指定 `RegistryId`，用 `DescribeInstances` 获取 |
| `CreateNamespace` 返回 `InvalidParameter.NamespaceName` | 检查 `--NamespaceName` 值 | 命名空间名格式不合法 | 命名空间名必须符合规则：仅小写字母、数字和连字符（`-`），不能以连字符开头/结尾/连续 |
| `CreateNamespace` 返回命名空间名重复错误 | `DescribeNamespaces` 查看已有名称列表 | 同实例下名称已存在 | 更换名称，或先删除同名命名空间后重试 |
| `ModifyNamespace` 返回 `ResourceNotFound` | `DescribeNamespaces` 确认目标命名空间存在 | `RegistryId` 或 `NamespaceName` 错误 | 用 `DescribeNamespaces` 获取正确的 `Name` 值 |
| `DeleteNamespace` 返回 `ResourceNotFound` | 同上 | 命名空间已不存在或已被删除 | 确认参数正确，或命名空间已由其他操作删除 |
| `DeleteNamespace` 返回资源不空错误 | `DescribeRepositories --NamespaceName <Name>` 检查 | 命名空间下仍有镜像仓库或 Helm Chart | 先删除仓库内所有镜像 Tag，再 `DeleteRepository` 逐一清理仓库 |
| 子账号操作被拒绝 | 联系主账号确认 CAM 策略 | 缺少 `tcr:CreateNamespace` / `tcr:ModifyNamespace` / `tcr:DeleteNamespace` 权限 | 主账号授予 `QcloudTCRFullAccess` 或添加命名空间相关最小权限策略 |

### 状态不一致

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ModifyNamespace --IsAutoScan true` 后 `AutoScan` 仍然 `false` | 再次执行 `DescribeNamespaces` 等待 10--30 秒 | IsAutoScan 状态更新存在延迟 | 等待后重试确认。注意仅新推送镜像生效，已有镜像不受影响 |

## 下一步

- [管理镜像仓库](../repository)（page_id `41811`） — 在命名空间下创建和管理镜像仓库
- [容器镜像安全扫描](../../../image-security/vulnerability-scan)（page_id `43941`） — 查看和管理镜像安全扫描结果
- [镜像版本不可变](../../../image-security/immutable-tags)（page_id `58147`） — 设置镜像 Tag 不可变策略
- [高危镜像部署阻断](../../../image-security/deployment-block)（page_id `58145`） — 配合 `IsPreventVUL` 阻断漏洞镜像拉取
- [托管 Helm Chart](../../../oci-artifacts/helm-chart)（page_id `41944`） — 在同一命名空间管理 Helm Chart
- [创建企业版实例](../../../create)（page_id `51110`） — 创建新的 TCR 企业版实例

## 控制台替代

[容器镜像服务 -> 命名空间](https://console.cloud.tencent.com/tcr/namespace)：选择目标实例，进入命名空间列表页。单击"新建"，填写命名空间名称、选择公开或私有访问级别，按需添加标签后确认。在命名空间行可直接切换访问级别、开关自动扫描、执行删除操作。
