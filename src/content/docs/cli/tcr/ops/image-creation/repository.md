---
title: "管理镜像仓库"
description: "· page_id `41811`"
---

> 对照官方：[管理镜像仓库](https://cloud.tencent.com/document/product/1141/41811) · page_id `41811`

## 概述

TCR 企业版镜像仓库用于管理容器镜像。单个镜像仓库可包含不同版本的容器镜像（以 Tag 区分），归属于命名空间并从命名空间继承公开/私有属性及安全扫描触发方式。镜像仓库是 TCR 权限管理的最小单位，实例管理员可按仓库粒度授予子账号管理或只读权限。

## 前置条件

- [环境准备](../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:CreateRepository, tcr:DescribeRepositories, tcr:ModifyRepository, tcr:DeleteRepository
#    tcr:DescribeImages, tcr:DescribeImageManifests, tcr:DeleteImage
# 验证：执行 DescribeRepositories 确认权限
tccli tcr DescribeRepositories --RegistryId '<RegistryId>' --region <Region>
# expected: exit 0，返回仓库列表（可为空）
```

### 资源检查

```bash
# 4. 确认实例存在且状态正常
tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>
# expected: exit 0，Status 为 "Running"

# 5. 确认命名空间已存在
tccli tcr DescribeNamespaces --RegistryId '<RegistryId>' --region <Region>
# expected: target 命名空间在 NamespaceList 中
```

### 命名约束

镜像仓库名称长度 2–200 个字符，只能包含小写字母、数字及分隔符（`.`、`_`、`-`、`/`），不能以分隔符开头、结尾或连续。名称支持多级路径，例如 `team-01/front/nginx`。

### `BriefDescription` 字段

`BriefDescription` 是 `CreateRepository` 的必填字段，在仓库列表中展示，帮助识别仓库用途。建议填写有意义的简短描述（如"用户服务 API 镜像"）。创建后可随时通过 `ModifyRepository` 修改。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 创建镜像仓库 | `CreateRepository` | 否 |
| 查看仓库列表 | `DescribeRepositories` | 是 |
| 筛选指定命名空间 | `DescribeRepositories --NamespaceName` | 是 |
| 模糊搜索仓库名 | `DescribeRepositories --RepositoryName` | 是 |
| 编辑简短描述/详细描述 | `ModifyRepository` | 是 |
| 删除镜像仓库 | `DeleteRepository` | 否 |
| 查看镜像版本列表 | `DescribeImages` | 是 |
| 搜索镜像版本 | `DescribeImages --ImageVersion` | 是 |
| 查看镜像 Manifest | `DescribeImageManifests` | 是 |
| 删除镜像版本 | `DeleteImage` | 否 |
| 推送/拉取镜像 | `docker push` / `docker pull` | — |

## 关键字段说明

以下说明 `CreateRepository` 和 `ModifyRepository` 的主要参数。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | 实例 ID，格式 `tcr-xxxxxxxx` | 实例不存在 → `ResourceNotFound` |
| `NamespaceName` | String | 是 | 已存在的命名空间名称 | 命名空间不存在 → `ResourceNotFound` |
| `RepositoryName` | String | 是 | 长度 2–200 字符，小写字母/数字/`._-/`，不能以分隔符开头结尾或连续。同命名空间内唯一 | 格式不合法 → `InvalidParameter`；重名 → 创建失败 |
| `BriefDescription` | String | 是 | 简短描述，最长 100 字符。`ModifyRepository` 时必填 | 缺失 → `InvalidParameter` |
| `Description` | String | 否 | 详细描述，支持 Markdown，最长 1000 字符。`ModifyRepository` 时必填 | 缺失 → `InvalidParameter` |

> **注意**：`ModifyRepository` 的 `BriefDescription` 和 `Description` 均为必填参数。修改任一字段时需同时传入另一个字段的当前值，否则将被清空。

## 操作步骤

### 创建镜像仓库

#### 选择依据

- **命名空间归属**：仓库必须归属于一个已存在的命名空间。命名空间决定了仓库的公开/私有属性和安全扫描策略。
- **名称规划**：支持多级路径（如 `backend/api/user`），可按微服务层级组织。名称创建后不可修改。
- **简短描述**：在仓库列表中展示，建议写清楚仓库用途（如"用户服务 API 镜像"）。

#### 最小创建（只含必填字段）

`create-repository.json`：

```json
{
  "RegistryId": "<RegistryId>",
  "NamespaceName": "<NamespaceName>",
  "RepositoryName": "<RepoName>",
  "BriefDescription": "<Description>"
}
```

```bash
tccli tcr CreateRepository --cli-input-json file://create-repository.json --region <Region>
# expected: exit 0，返回 RequestId
```

**输出**：

```json
{
  "RequestId": "b7995733-3abb-4c44-95d3-1e87942973b3"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<RegistryId>` | 实例 ID | 格式 `tcr-xxxxxxxx` | `tccli tcr DescribeInstances` |
| `<NamespaceName>` | 命名空间名称 | 已存在 | `tccli tcr DescribeNamespaces` |
| `<RepoName>` | 仓库名称 | 长度 2–200，小写字母/数字/`._-/`，不以分隔符开头结尾或连续 | 自定义 |
| `<Region>` | 地域 | 如 `ap-guangzhou` | `tccli configure list` |

#### 增强配置（含详细描述）

`create-repository-enhanced.json`：

```json
{
  "RegistryId": "<RegistryId>",
  "NamespaceName": "<NamespaceName>",
  "RepositoryName": "<RepoName>",
  "BriefDescription": "<Description>",
  "Description": "<Markdown 格式的详细描述，如使用说明、团队联系方式等>"
}
```

```bash
tccli tcr CreateRepository --cli-input-json file://create-repository-enhanced.json --region <Region>
# expected: exit 0，返回 RequestId
```

### 查看镜像仓库列表

列出实例内所有仓库：

```bash
tccli tcr DescribeRepositories --RegistryId '<RegistryId>' --region <Region>
# expected: exit 0，返回 RepositoryList 和 TotalCount
```

**输出**：

```json
{
  "RepositoryList": [
    {
      "Name": "example-ns/example-repo",
      "Namespace": "example-ns",
      "Public": true,
      "BriefDescription": "tccli rewrite example repository",
      "Description": ""
    }
  ],
  "TotalCount": 1,
  "RequestId": "7b568344-2d2c-454a-aaab-422ee390d42d"
}
```

**筛选指定命名空间**：

```bash
tccli tcr DescribeRepositories \
    --RegistryId '<RegistryId>' \
    --NamespaceName '<NamespaceName>' \
    --region <Region>
```

**模糊搜索仓库名**：

```bash
tccli tcr DescribeRepositories \
    --RegistryId '<RegistryId>' \
    --RepositoryName '<keyword>' \
    --region <Region>
```

### 编辑仓库描述

#### 选择依据

- `BriefDescription` 和 `Description` 均为 `ModifyRepository` 的必填参数。修改任一字段时，必须同时传入另一个字段的当前值，否则未传入字段的值将被清空。
- **建议做法**：修改前先用 `DescribeRepositories` 获取当前值，再构造修改命令。

`modify-repository.json`：

```json
{
  "RegistryId": "<RegistryId>",
  "NamespaceName": "<NamespaceName>",
  "RepositoryName": "<RepoName>",
  "BriefDescription": "<NewDescription>",
  "Description": "<NewMarkdownDescription>"
}
```

```bash
tccli tcr ModifyRepository --cli-input-json file://modify-repository.json --region <Region>
# expected: exit 0，返回 RequestId
```

### 查看镜像版本

列出指定仓库内的所有镜像版本：

```bash
tccli tcr DescribeImages \
    --RegistryId '<RegistryId>' \
    --NamespaceName '<NamespaceName>' \
    --RepositoryName '<RepoName>' \
    --region <Region>
# expected: exit 0，返回 ImageInfoList 和 TotalCount
```

**输出**：

```json
{
  "ImageInfoList": [],
  "TotalCount": 0,
  "RequestId": "da668a99-0af3-4a9f-9d7e-b1c376e637bd"
}
```

> 新仓库创建后尚未推送镜像时，`ImageInfoList` 为空是正常行为。使用 `docker push` 推送镜像后重新执行即可看到版本列表。

**搜索特定版本**：

```bash
tccli tcr DescribeImages \
    --RegistryId '<RegistryId>' \
    --NamespaceName '<NamespaceName>' \
    --RepositoryName '<RepoName>' \
    --ImageVersion '<VersionKeyword>' \
    --region <Region>
```

### 查看镜像 Manifest

查看指定 Tag 的镜像 Manifest 信息：

```bash
tccli tcr DescribeImageManifests \
    --RegistryId '<RegistryId>' \
    --NamespaceName '<NamespaceName>' \
    --RepositoryName '<RepoName>' \
    --ImageVersion '<Tag>' \
    --region <Region>
# expected: 仓库有镜像时 exit 0；无镜像时 exit 255
```

**预期输出（仓库为空，无镜像时）**：

```
Error: tag latest not found in example-ns/example-repo
```

> `DescribeImageManifests` 需要仓库中已存在目标 Tag 的镜像。仓库为空时该命令会失败。需先用 `docker push` 推送镜像后重试。

### 删除镜像版本

`delete-image.json`：

```json
{
  "RegistryId": "<RegistryId>",
  "NamespaceName": "<NamespaceName>",
  "RepositoryName": "<RepoName>",
  "ImageVersion": "<Tag>"
}
```

```bash
tccli tcr DeleteImage --cli-input-json file://delete-image.json --region <Region>
# expected: exit 0，返回 RequestId
```

**输出**：

```json
{
  "RequestId": "a0c88b58-ade2-4756-99fb-e1a21dc0fe17"
}
```

> **注意**：`DeleteImage` 只删除指定版本，不影响同一仓库中其他版本。但若被删版本与其他版本共享同一 Digest（相同镜像内容的不同 Tag），则共享该 Digest 的所有其他 Tag 也会变为不可用。

### 删除镜像仓库

#### 选择依据

- 删除仓库会同时清除其下所有镜像版本，不可逆。执行前须二次确认。
- `ForceDelete` 参数可跳过部分依赖校验（如触发器、复制规则），仅在有明确需要时使用。

```bash
tccli tcr DeleteRepository \
    --RegistryId '<RegistryId>' \
    --NamespaceName '<NamespaceName>' \
    --RepositoryName '<RepoName>' \
    --region <Region>
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
  "RequestId": "b5499668-30a7-4da3-b516-d2c0ae32ea60"
}
```

> **高危警告**：`DeleteRepository` 会删除仓库及其下所有镜像版本，不可恢复。执行前务必确认仓库内无需要保留的镜像。仅需清理部分版本时优先使用 `DeleteImage`。

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 仓库已创建 | `DescribeRepositories --NamespaceName '<NamespaceName>'` | 目标仓库在 `RepositoryList` 中，`Name`/`Description` 与创建参数一致 |
| 描述已更新 | `DescribeRepositories --NamespaceName '<NamespaceName>' --RepositoryName '<RepoName>'` | `Description` 与修改参数一致 |
| 镜像版本存在 | `DescribeImages --NamespaceName '<NamespaceName>' --RepositoryName '<RepoName>'` | `ImageInfoList` 包含预期版本 |
| 版本已删除 | `DescribeImages --NamespaceName '<NamespaceName>' --RepositoryName '<RepoName>'` | 目标版本不再出现在 `ImageInfoList` 中 |
| 仓库已删除 | `DescribeRepositories --NamespaceName '<NamespaceName>'` | 目标仓库不再出现在 `RepositoryList` 中 |

验证仓库详情：

```bash
tccli tcr DescribeRepositories \
    --RegistryId '<RegistryId>' \
    --NamespaceName '<NamespaceName>' \
    --RepositoryName '<RepoName>' \
    --region <Region>
# expected: 返回目标仓库完整信息，Description 与预期一致
```

### 数据面（docker）

推送和拉取验证需配置访问凭证后执行：

```bash
# 登录实例
docker login <PublicDomain> --username <username>
# expected: Login Succeeded

# 拉取镜像（验证仓库可访问）
docker pull <PublicDomain>/<NamespaceName>/<RepoName>:<Tag>
# expected: 镜像拉取成功，显示 Digest
```

## 清理

> **警告**：`DeleteRepository` 不可逆，会同时删除其下所有镜像版本。`DeleteImage` 删除共享 Digest 的版本会影响其他同名 Tag。生产环境执行前务必用 `DescribeRepositories` / `DescribeImages` 确认目标。

### 1. 清理前检查

```bash
# 确认待删除仓库及其镜像版本
tccli tcr DescribeRepositories \
    --RegistryId '<RegistryId>' \
    --NamespaceName '<NamespaceName>' \
    --RepositoryName '<RepoName>' \
    --region <Region>
# 记录 RepositoryName，确认是目标仓库

tccli tcr DescribeImages \
    --RegistryId '<RegistryId>' \
    --NamespaceName '<NamespaceName>' \
    --RepositoryName '<RepoName>' \
    --region <Region>
# 记录所有 ImageVersion，确认无遗漏
```

### 2. 删除镜像版本

`delete-image.json`：

```json
{
  "RegistryId": "<RegistryId>",
  "NamespaceName": "<NamespaceName>",
  "RepositoryName": "<RepoName>",
  "ImageVersion": "<Tag>"
}
```

```bash
tccli tcr DeleteImage --cli-input-json file://delete-image.json --region <Region>
# expected: exit 0，返回 RequestId
```

### 3. 删除镜像仓库

```bash
tccli tcr DeleteRepository \
    --RegistryId '<RegistryId>' \
    --NamespaceName '<NamespaceName>' \
    --RepositoryName '<RepoName>' \
    --region <Region>
# expected: exit 0，返回 RequestId
```

### 4. 验证已删除

```bash
tccli tcr DescribeRepositories \
    --RegistryId '<RegistryId>' \
    --NamespaceName '<NamespaceName>' \
    --region <Region>
# expected: 目标仓库不再出现在 RepositoryList 中
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateRepository` 返回 `ResourceNotFound.Namespace` | `tccli tcr DescribeNamespaces --RegistryId '<RegistryId>' --region <Region>` 确认命名空间是否存在 | 指定的 `NamespaceName` 不存在，或拼写错误 | 先 [创建命名空间](../namespace)，确认 `NamespaceName` 拼写正确 |
| `CreateRepository` 返回 `ResourceAlreadyExists.Repository` | `DescribeRepositories --NamespaceName '<NamespaceName>'` 查看已有仓库 | 同命名空间下仓库名已存在 | 更换 `<RepoName>` 或先删除已有仓库 |
| `CreateRepository` 返回 `InvalidParameter` | 检查 `<RepoName>` 是否符合命名规则 | 仓库名含非法字符、长度超限或以分隔符开头/结尾/连续 | 修正名称：小写字母/数字/`._-/`，长度 2–200，不以分隔符开头结尾或连续 |
| `ModifyRepository` 返回 `InvalidParameter` | 检查是否同时传入了 `BriefDescription` 和 `Description` | 两个字段均为必填，缺少任一字段 | 确保 JSON 中同时包含 `BriefDescription` 和 `Description`，修改其中一个时传入另一个的当前值 |
| `DeleteRepository` 返回 `FailedOperation` | `DescribeRepositories` 确认仓库状态 | 仓库存在依赖（如镜像复制规则、触发器绑定） | 先解除依赖后重试，或使用 `"ForceDelete": true` 跳过校验 |
| `DeleteImage` 返回错误 | `DescribeImages` 确认版本存在 | 目标版本不存在或 Digest 已被引用 | 检查 `<Tag>` 是否正确，确认版本存在 |
| `DescribeImages` 返回空列表 | 确认 `NamespaceName` 和 `RepositoryName` 均正确 | 仓库下未推送过镜像，或仓库/命名空间不存在 | 确认仓库已创建；若已创建，推送镜像后重试 |
| `DescribeImageManifests` 返回 `tag latest not found in <ns>/<repo>` | `DescribeImages` 查看仓库是否有镜像版本 | 仓库为空或指定 Tag 不存在——尚未 `docker push` 镜像，或 Tag 名错误 | 先 `docker push <PublicDomain>/<NamespaceName>/<RepoName>:<Tag>` 推送镜像，再执行 `DescribeImageManifests` |
| CAM 权限拒绝 | `tccli tcr DescribeRepositories --RegistryId '<RegistryId>' --region <Region>` 检查返回 | 子账号缺少 `tcr:CreateRepository` / `tcr:DeleteRepository` 等权限 | 联系主账号授予 `QcloudTCRFullAccess` 或添加仓库相关最小权限策略 |

### 操作成功但有数据影响

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `DeleteImage` 成功后其他版本不可用 | `DescribeImages` 检查剩余版本的 `Digest` 值 | 被删版本与其他 Tag 共享同一 Digest，删除 Tag 后 Digest 被移除导致共享版本不可用 | 不可恢复。删除前确认版本间 Digest 关系 |
| `ModifyRepository` 后 Description 被清空 | `DescribeRepositories` 检查 `Description` 字段 | 修改 `BriefDescription` 时未传入 `Description` 当前值 | 重新执行 `ModifyRepository`，同时传入两个字段的期望值 |

## 下一步

- [管理命名空间](../namespace)（page_id `41803`）
- [同实例多地域复制镜像](../../image-distribution/cross-region-replication)（page_id `52095`）
- [触发器（Webhook）](../../devops/webhook)
- [企业版快速入门](../../../quickstart/enterprise)

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 选择实例 → **镜像仓库** → 单击 **新建**，选择命名空间、填写仓库名称和描述后确认。在仓库详情页可编辑信息、管理镜像版本、查看 Manifest。
