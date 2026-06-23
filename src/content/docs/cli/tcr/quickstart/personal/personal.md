---
title: "个人版快速入门"
description: "· page_id `63910`"
---

> 对照官方：[个人版快速入门](https://cloud.tencent.com/document/product/1141/63910) · page_id `63910`

## 概述

通过 `tccli tcr` 命令行开通并使用 TCR 个人版。个人版为共享实例，开箱即用，无需创建实例。登录凭据为腾讯云账号 ID + 控制台设置的固定密码，域名固定为 `ccr.ccs.tencentyun.com`，在中国大陆仅广州地域部署。

个人版与[企业版](../enterprise)的核心区别：

| 维度 | 个人版 | 企业版 |
|------|--------|--------|
| 资源层级 | 账号级共享实例，无需创建实例 | 实例级，需 `CreateInstance` 购买独立实例 |
| API 后缀 | `*Personal` 系列（如 `CreateNamespacePersonal`） | 通用 API（如 `CreateNamespace`） |
| `RegistryId` | 不需要 | 始终必填 |
| 命名空间唯一性 | 全局唯一（跨所有用户） | 实例内唯一 |
| 域名 | `ccr.ccs.tencentyun.com`（固定） | `<RegistryId>.tencentcloudcr.com` |
| 登录用户 | 腾讯云账号 ID（数字串） | 实例访问凭证（临时令牌或长期 Token） |
| 登录密码 | 账号级固定密码，控制台初始化 | 按实例管理，支持临时令牌和长期凭证 |

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey 已配置，region 设为 ap-guangzhou

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:CreateNamespacePersonal, tcr:DescribeNamespacePersonal
#    tcr:CreateRepositoryPersonal, tcr:DescribeRepositoryPersonal
#    tcr:DescribeUserQuotaPersonal
# 验证：执行 DescribeNamespacePersonal 确认权限
tccli tcr DescribeNamespacePersonal --region <Region> \
    --Namespace "" --Limit 1 --Offset 0
# expected: exit 0（空列表或已有命名空间数据）

# 4. 检查 Docker 安装（推送/拉取镜像需要）
docker --version
# expected: Docker version XX.XX.x 或以上
```

### 资源检查

```bash
# 5. 检查个人版配额
tccli tcr DescribeUserQuotaPersonal --region <Region>
# expected: exit 0，Data.LimitInfo 中 namespace 和 repo 配额未达上限
```

**预期输出**：

```json
{
    "Data": {
        "LimitInfo": [
            {"Username": "100012345678", "Type": "namespace", "Value": 2000},
            {"Type": "repo", "Value": 10000}
        ]
    },
    "RequestId": "eac6b301-a322-493a-8e36-83b295459397"
}
```

```bash
# 6. 确认个人版密码已在控制台初始化（无 CLI 命令）
# 登录 容器镜像服务控制台 → 实例管理 → 个人版实例卡片 → 确认密码已设置
# 未设置密码时 docker login 会失败，参见排障节
```

## 控制台与 CLI 参数映射

| 控制台操作 | tccli / docker | 幂等 |
|-----------|-----------|:--:|
| 初始化密码 | 控制台操作，无 CLI 命令 | — |
| 登录实例 | `docker login ccr.ccs.tencentyun.com` | 是 |
| 创建命名空间 | `CreateNamespacePersonal` | 否 |
| 查看命名空间 | `DescribeNamespacePersonal` | 是 |
| 创建镜像仓库 | `CreateRepositoryPersonal` | 否 |
| 推送镜像 | `docker tag` + `docker push` | 是 |
| 拉取镜像 | `docker pull` | 是 |
| 查询配额 | `DescribeUserQuotaPersonal` | 是 |

## 操作步骤

### 步骤 1：初始化密码

个人版密码必须在控制台初始化，无对应 CLI 命令。

> 登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr)，进入 **实例管理** 页面，在个人版实例卡片上单击"初始化密码"并按提示设置。忘记密码后可通过 **更多 > 重置登录密码** 重置。

### 步骤 2：Docker 登录个人版

以腾讯云账号 ID 作为用户名登录。登录前需确保已在控制台初始化密码。

```bash
docker login ccr.ccs.tencentyun.com --username=TENCENT_CLOUD_ACCOUNT_ID
# expected: 提示输入密码，正确输入后显示 "Login Succeeded"
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `TENCENT_CLOUD_ACCOUNT_ID` | 腾讯云账号 ID（纯数字串） | 必须，与密码初始化时的账号一致 | [腾讯云控制台-账号信息](https://console.cloud.tencent.com/developer) 查看 账号 ID |

### 步骤 3：创建命名空间

#### 选择依据

- **命名空间名称**：个人版为共享实例，命名空间名称**全局唯一**（跨所有用户）。建议以团队或项目命名。已被其他用户占用的名称无法创建，创建失败时更换一个未被占用的名称重试。
- **地域**：个人版在中国大陆仅在广州部署，统一使用 `--region ap-guangzhou`。

#### 最小创建

`CreateNamespacePersonal` 仅含一个必填参数 `--Namespace`：

```bash
tccli tcr CreateNamespacePersonal --region ap-guangzhou \
    --Namespace NAMESPACE_NAME
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "b2b28287-d220-482d-a9d1-fbc196158c52"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `NAMESPACE_NAME` | 命名空间名称 | 全局唯一，1-63 字符，支持小写字母、数字、`-`、`_` | 自定义，建议以团队/项目命名 |

#### 增强配置

`CreateNamespacePersonal` 只有一个必填参数，无需增强配置。若需更新命名空间属性，可通过控制台操作。

### 步骤 4：创建镜像仓库（可选）

> 此步骤为可选。命名空间创建后，直接通过 `docker push` 推送镜像时，若目标仓库不存在，Docker Registry 会自动创建对应仓库。

#### 选择依据

- **参数命名**：个人版 API 使用 `--RepoName`（区别于企业版的 `--RepositoryName`）。格式为 `命名空间/仓库名`（如 `NAMESPACE_NAME/REPO_NAME`）。注意这是**单个参数**，不是两个独立参数。
- **仓库类型**：`--Public` 为 Integer 类型，`0` 表示私有（需登录后拉取），`1` 表示公有（任何人可匿名拉取）。注意区分企业版 API 的 `--IsPublic`（Boolean 类型）。
- **描述**：`--Description` 为可选参数，支持 Markdown 格式。

#### 最小创建（只含必填字段）

```bash
tccli tcr CreateRepositoryPersonal --region ap-guangzhou \
    --RepoName "NAMESPACE_NAME/REPO_NAME" \
    --Public 0
# expected: exit 0，返回 RequestId
```

**预期输出**：

```json
{
    "RequestId": "66d972a4-a887-406b-b6b6-52d213271411"
}
```

#### 增强配置（加描述）

```bash
tccli tcr CreateRepositoryPersonal --region ap-guangzhou \
    --RepoName "NAMESPACE_NAME/REPO_NAME" \
    --Public 0 \
    --Description "REPO_DESCRIPTION"
# expected: exit 0，返回 RequestId
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `NAMESPACE_NAME` | 命名空间名称 | 必须已存在（步骤 3 创建） | `DescribeNamespacePersonal` |
| `REPO_NAME` | 镜像仓库名称 | 1-200 字符，仅小写字母、数字、`.`、`_`、`-`，不能以分隔符开头/结尾，不支持多级路径 | 自定义 |
| `REPO_DESCRIPTION` | 仓库描述 | 可选，支持 Markdown | 自定义 |

### 步骤 5：推送镜像

以 Docker Hub 官方 Nginx 镜像为例。先 `docker tag` 标记镜像地址，再 `docker push` 推送。若目标仓库不存在，推送时会自动创建。

```bash
docker pull nginx:latest
# expected: exit 0，拉取成功

docker tag nginx:latest ccr.ccs.tencentyun.com/NAMESPACE_NAME/REPO_NAME:latest
# expected: exit 0，无输出

docker push ccr.ccs.tencentyun.com/NAMESPACE_NAME/REPO_NAME:latest
# expected: exit 0，推送成功，显示各 layer 的 Pushed 状态
```

**预期输出**（docker push）：

```text
The push refers to repository [ccr.ccs.tencentyun.com/NAMESPACE_NAME/REPO_NAME]
5f70bf18a086: Pushed
2b0d8e4cce8e: Pushed
latest: digest: sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx size: 527
```

### 步骤 6：拉取镜像

```bash
docker pull ccr.ccs.tencentyun.com/NAMESPACE_NAME/REPO_NAME:latest
# expected: exit 0，拉取成功或显示 "Image is up to date"
```

**预期输出**（docker pull）：

```text
latest: Pulling from NAMESPACE_NAME/REPO_NAME
Digest: sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Status: Image is up to date for ccr.ccs.tencentyun.com/NAMESPACE_NAME/REPO_NAME:latest
ccr.ccs.tencentyun.com/NAMESPACE_NAME/REPO_NAME:latest
```

## 验证

### 控制面（tccli）

```bash
# 1. 确认命名空间已创建
tccli tcr DescribeNamespacePersonal --region ap-guangzhou \
    --Namespace NAMESPACE_NAME --Limit 20 --Offset 0
# expected: exit 0，Data.NamespaceInfo 中包含目标命名空间
```

**预期输出**：

```json
{
    "Data": {
        "NamespaceCount": 1,
        "NamespaceInfo": [
            {
                "Namespace": "ns-example",
                "CreationTime": "2026-06-16 15:23:34",
                "RepoCount": 0
            }
        ]
    },
    "RequestId": "eac6b301-a322-493a-8e36-83b295459397"
}
```

| 维度 | 命令 | 预期 |
|------|------|------|
| 命名空间存在性 | `DescribeNamespacePersonal --Namespace NAMESPACE_NAME --Limit 20 --Offset 0` | `Data.NamespaceCount` >= 1，`NamespaceInfo` 中包含目标 `Namespace` |
| 命名空间唯一性 | 同上 | 返回成功即表示名称未被占用 |
| 配额剩余 | `DescribeUserQuotaPersonal` | `Type: namespace` 的 `Value` 小于配额上限 |

> **注意**：`DescribeNamespacePersonal` 必须同时指定 `--Namespace`、`--Limit`、`--Offset` 三个参数，任一缺失会返回参数错误。

### 数据面（Docker）

```bash
# 2. 确认登录有效
docker login ccr.ccs.tencentyun.com --username=TENCENT_CLOUD_ACCOUNT_ID
# expected: 密码交互提示；输入密码后显示 "Login Succeeded"

# 3. 确认可拉取已推送的镜像
docker pull ccr.ccs.tencentyun.com/NAMESPACE_NAME/REPO_NAME:latest
# expected: 拉取成功或 "Image is up to date"
```

## 清理

> **注意**：删除命名空间会级联删除其下所有镜像仓库及镜像 Tag。个人版删除操作不可逆，执行前务必通过 `DescribeNamespacePersonal` 确认目标命名空间名称。

### 数据面（Docker）

数据面清理在控制面之前，避免引用已删除的资源。

```bash
# 1. 删除本地镜像（可选，释放磁盘空间）
docker rmi ccr.ccs.tencentyun.com/NAMESPACE_NAME/REPO_NAME:latest
# expected: Untagged 或 Deleted

# 2. 退出登录（可选）
docker logout ccr.ccs.tencentyun.com
# expected: Removing login credentials for ccr.ccs.tencentyun.com
```

### 控制面（tccli）

#### 1. 清理前状态检查

```bash
tccli tcr DescribeNamespacePersonal --region ap-guangzhou \
    --Namespace NAMESPACE_NAME --Limit 20 --Offset 0
# 确认是待删除的目标命名空间，记录命名空间名称和 RepoCount
```

#### 2. 删除镜像仓库

```bash
# 先查询命名空间下的仓库列表
tccli tcr DescribeRepositoryPersonal --region ap-guangzhou \
    --RepoName "NAMESPACE_NAME/" --Limit 20 --Offset 0
# expected: 返回命名空间下的仓库列表

# 逐个删除仓库
tccli tcr DeleteRepositoryPersonal --region ap-guangzhou \
    --RepoName "NAMESPACE_NAME/REPO_NAME"
# expected: exit 0，返回 RequestId
```

#### 3. 删除命名空间

```bash
tccli tcr DeleteNamespacePersonal --region ap-guangzhou \
    --Namespace NAMESPACE_NAME
# ⚠️ 会级联删除命名空间下所有仓库和镜像
# expected: exit 0，返回 RequestId
```

#### 4. 验证已删除

```bash
tccli tcr DescribeNamespacePersonal --region ap-guangzhou \
    --Namespace NAMESPACE_NAME --Limit 20 --Offset 0
# expected: Data.NamespaceCount 为 0 或返回 InvalidParameter（命名空间不存在）
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateNamespacePersonal` 返回命名空间已存在 | 更换一个 `--Namespace` 值重试，或用 `DescribeNamespacePersonal` 查询已有命名空间 | 命名空间名称已被其他用户占用（个人版全局唯一） | 更换一个新的 `--Namespace` 名称重试 |
| `CreateNamespacePersonal` 或 `CreateRepositoryPersonal` 返回 `AuthFailure` | `tccli configure list` 检查 secretId/secretKey 配置 | 密钥未配置或已过期 | 执行 `tccli configure` 重新配置密钥 |
| `CreateNamespacePersonal` 或 `CreateRepositoryPersonal` 返回 `UnauthorizedOperation` | `tccli tcr DescribeNamespacePersonal --region ap-guangzhou --Namespace "" --Limit 1 --Offset 0` 验证基本权限 | CAM 权限不足，缺少 `tcr:*Personal` Action | 联系 CAM 管理员授予 `tcr:CreateNamespacePersonal` 和 `tcr:CreateRepositoryPersonal` 权限 |
| `DescribeNamespacePersonal` 返回参数错误 | 检查命令是否同时指定了 `--Namespace`、`--Limit`、`--Offset` 三个参数 | 缺少必填参数。个人版此 API 的三个参数全为必填 | 同时指定三个参数：`--Namespace NAMESPACE_NAME --Limit 20 --Offset 0` |
| `CreateRepositoryPersonal` 返回 `InvalidParameter` | 检查 `--RepoName` 格式是否为 `NAMESPACE_NAME/REPO_NAME` | `--RepoName` 格式不正确或命名空间不存在 | 确保格式为 `命名空间/仓库名`，且命名空间已创建 |
| `CreateRepositoryPersonal` 返回 `InvalidParameter`，提示 Public 类型错误 | 检查 `--Public` 参数值 | 传入了非 Integer 值（如 "false" 或 "true"），个人版 `--Public` 为 Integer（`0`/`1`），不是 Boolean | 使用 `--Public 0`（私有）或 `--Public 1`（公有） |
| `docker login` 返回 `unauthorized: authentication required` | `tccli tcr DescribeUserQuotaPersonal --region ap-guangzhou` 确认服务已开通 | 密码未初始化或账号 ID 错误 | 登录 [TCR 控制台](https://console.cloud.tencent.com/tcr) 确认密码已初始化；核对中国站/国际站账号 ID |
| `docker push` 返回 `denied: requested access to the resource is denied` | 重新执行 `docker login` | 登录凭证过期或未登录 | 执行 `docker login ccr.ccs.tencentyun.com --username=TENCENT_CLOUD_ACCOUNT_ID` 重新登录后重试 |
| `DescribeUserQuotaPersonal` 返回配额不足 | 查看 `Data.LimitInfo` 中 `Type: namespace` 或 `Type: repo` 的 `Value` | 命名空间或仓库数量已达上限（此为环境限制，非命令错误） | 清理不再使用的命名空间或仓库后重试 |

### 创建成功但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 命名空间创建成功但 `DescribeNamespacePersonal` 查不到 | 检查是否用正确的 `--Namespace` 参数查询；确认指定了 `--Limit` 和 `--Offset` | 查询参数不正确或分页超出范围 | 同时指定 `--Namespace NAMESPACE_NAME --Limit 20 --Offset 0` 重试 |
| `docker push` 成功但 `docker pull` 拉不到 | 先 `docker login` 确认登录状态，检查是否为私有仓库 | 私有仓库（`--Public 0`）需登录后才能拉取；或未指定正确的 tag | 若为私有仓库，确保已 `docker login`；检查 tag 名称拼写 |

## 下一步

- [企业版快速入门](../enterprise) — 创建独立 TCR 实例并使用高级功能
- [更新登录密码](../../ops/personal-edition/update-password) — 管理个人版全局密码
- [设置镜像清理](../../ops/personal-edition/image-cleanup) — 镜像版本自动清理策略
- [TCR 常用 API 概览](https://cloud.tencent.com/document/api/1141/41570) — 查看完整 API 列表
- [TKE 集群使用 TCR 推送拉取镜像](https://cloud.tencent.com/document/product/457/118319) — 配合 TKE 使用

## 控制台替代

[容器镜像服务控制台 → 实例管理](https://console.cloud.tencent.com/tcr)：在个人版实例卡片上单击**初始化密码**设置登录密码 → [获取腾讯云账号 ID](https://console.cloud.tencent.com/developer) → 使用 `docker login ccr.ccs.tencentyun.com` 登录 → 在**命名空间**页面创建命名空间 → **镜像仓库**页面创建仓库或直接 `docker push` 自动创建 → 在**镜像版本**页面查看已推送的 Tag。
