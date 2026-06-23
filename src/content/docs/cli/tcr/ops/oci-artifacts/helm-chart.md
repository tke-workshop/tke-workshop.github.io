---
title: "托管 Helm Chart（tccli）"
description: "· page_id `41944`"
---

> 对照官方：[托管 Helm Chart](https://cloud.tencent.com/document/product/1141/41944) · page_id `41944`

## 概述

TCR 企业版实例支持托管 Helm Chart，用户可在同个命名空间内同时管理容器镜像及 Helm Chart，实现在业务项目内统一管理容器镜像和 Helm Chart 两种云原生交付物。

Helm Chart 仓库继承其所属命名空间的公开及私有属性。在权限管理上，Helm Chart 与容器镜像共用 **repository** 资源类型（如 `qcs::tcr:$region:$account:repository/tcr-xxxxxx/project-a/*` 包含命名空间内全部镜像仓库及 Helm Chart）。

TCR 支持两种 Helm Chart 管理方式：

- **OCI 制品**（Helm 3.8+，推荐）：将 Helm Chart 作为 OCI 制品，通过 `helm registry login`、`helm push`、`helm pull` 操作 TCR OCI 端点
- **Chart Museum API**（传统方式）：通过 `helm repo add` 添加 TCR 提供的 Chart Museum 端点（`chartrepo`），使用 `helm cm-push` / `helm fetch` 上传下载

> **注意**：仅企业版实例支持托管 Helm Chart。Helm 的上传/下载操作通过 `helm` CLI（非 tccli）完成，tccli 仅用于查询 Chart 信息和下载链接。

## 前置条件

- [环境准备](../../index.md)
- 已 [购买企业版实例](../../create)，实例 `Status` 为 `Running`
- 已 [创建命名空间](../../image-creation/namespace)
- 已 [获取实例访问凭证](https://cloud.tencent.com/document/product/1141/41829)（用户名及 Token）
- 本机已安装 Helm 客户端（v3.8+ 推荐，OCI 方式必须 v3.8+）
- 如使用子账号操作，详见 [企业版授权方案示例](https://cloud.tencent.com/document/product/1141/41417)

### 环境检查

```bash
# 1. 确认实例存在且状态正常
tccli tcr DescribeInstances --Registryids '["tcr-0e2hz15l"]' --region ap-guangzhou --output json
```

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-0e2hz15l",
            "RegistryName": "kerwinwjyan-rewrite-001",
            "RegistryType": "basic",
            "Status": "Running",
            "PublicDomain": "kerwinwjyan-rewrite-001.tencentcloudcr.com",
            "InternalEndpoint": "10.1.67.13",
            "EnableAnonymous": true,
            "TokenValidTime": 87600,
            "DeletionProtection": false
        }
    ],
    "RequestId": "bf6d6053-85c2-4f10-853b-4492ad4a98b5"
}
```

```bash
# 2. 确认命名空间已存在
tccli tcr DescribeNamespaces --RegistryId tcr-0e2hz15l --region ap-guangzhou --output json
```

```json
{
    "NamespaceList": [
        {
            "Name": "skillhub",
            "CreationTime": "2026-06-16T08:37:05.263Z",
            "Public": false,
            "NamespaceId": 1
        }
    ],
    "TotalCount": 1,
    "RequestId": "329610f4-308b-442f-b72e-a0a0fabed229"
}
```

```bash
# 3. 确认 helm 客户端版本（OCI 方式需 v3.8+）
helm version --short
```

```text
v3.14.0+g3333d44
```

### 命名约束

Helm Chart 名称需符合 Helm 命名规范，版本号遵循 SemVer 2.0（如 `1.0.0`）。Chart 的 `name` 和 `version` 定义在 `Chart.yaml` 中。

## 控制台与 CLI 参数映射

| 控制台操作 | CLI | 幂等 |
|-----------|-----|------|
| 查看 Helm Chart 列表 | `tccli tcr DescribeRepositories --RegistryId <RegistryId> --NamespaceName <NS>` | 是 |
| 获取 Chart 版本下载信息 | `tccli tcr DescribeChartDownloadInfo --RegistryId <Id> --NamespaceName <NS> --ChartName <Name> --ChartVersion <Ver>` | 是 |
| 下载 Helm Chart（API 触发） | `tccli tcr DownloadHelmChart --RegistryId <Id> --NamespaceName <NS> --ChartName <Name> --ChartVersion <Ver>` | 是 |
| OCI 登录 | `helm registry login <instance>.tencentcloudcr.com --username <user> --password <token>` | -- |
| 推送 Helm Chart（OCI） | `helm push <chart>.tgz oci://<instance>.tencentcloudcr.com/<namespace>` | 是（覆盖同版本） |
| 拉取 Helm Chart（OCI） | `helm pull oci://<instance>.tencentcloudcr.com/<namespace>/<chart> --version <ver>` | 是 |
| 安装 Helm Chart | `helm install <release> oci://<instance>.tencentcloudcr.com/<namespace>/<chart> --version <ver>` | 否（同名 release 冲突） |
| 添加 Helm 仓库（Chart Museum） | `helm repo add <name> https://<instance>.tencentcloudcr.com/chartrepo/<namespace> --username <user> --password <token>` | 否（重名报错） |
| 推送 Helm Chart（Chart Museum） | `helm cm-push <chart> <repo-name>` | 是（覆盖同版本） |
| 拉取 Helm Chart（Chart Museum） | `helm fetch <repo>/<chart> --version <ver>` | 是 |

## 操作步骤

### 步骤1：查看 Helm Chart 仓库列表

列出指定命名空间内的 Helm Chart 仓库（与镜像仓库共用 `DescribeRepositories`）。

当前实例 `tcr-0e2hz15l` 的 `skillhub` 命名空间尚无仓库：

```bash
tccli tcr DescribeRepositories \
  --RegistryId tcr-0e2hz15l \
  --NamespaceName skillhub \
  --region ap-guangzhou \
  --output json
```

```json
{
    "RepositoryList": [],
    "TotalCount": 0,
    "RequestId": "31b6c3f5-863a-4147-8414-192278df5728"
}
```

> 上传 Helm Chart 后，Chart 对应的仓库会出现在 `RepositoryList` 中。

### 步骤2：获取 Helm Chart 下载信息（控制面）

获取指定 Chart 版本的预签名下载 URL。**四个参数全部必填**，Chart 必须已上传至 TCR。

当前实例尚无 Chart 上传，因此查询返回 `chart not found`：

```bash
tccli tcr DescribeChartDownloadInfo \
  --RegistryId tcr-0e2hz15l \
  --NamespaceName skillhub \
  --ChartName nginx \
  --ChartVersion 1.0.0 \
  --region ap-guangzhou \
  --output json
```

```text
[TencentCloudSDKException] code:InternalError message:{"errors":[{"code":"ERROR","message":"chart skillhub/nginx:1.0.0 not found"}]} requestId:d2f0ec63-fc4a-4b0e-8084-8f6e435d2aef
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `RegistryId` | String | **是** | 实例 ID |
| `NamespaceName` | String | **是** | 命名空间名称 |
| `ChartName` | String | **是** | Chart 名称 |
| `ChartVersion` | String | **是** | Chart 版本号（如 `1.0.0`） |

> 上传 Chart 后，成功调用返回 `PreSignedDownloadURL`，配合 `curl` 或 `wget` 即可下载 Chart 包。

### 步骤3：下载 Helm Chart 包（控制面 API 触发）

通过 `DownloadHelmChart` 获取 COS 临时凭证以直接下载 Chart 包内容。当前实例尚无 Chart，返回相同错误：

```bash
tccli tcr DownloadHelmChart \
  --RegistryId tcr-0e2hz15l \
  --NamespaceName skillhub \
  --ChartName nginx \
  --ChartVersion 1.0.0 \
  --region ap-guangzhou \
  --output json
```

```text
[TencentCloudSDKException] code:InternalError message:{"errors":[{"code":"ERROR","message":"chart skillhub/nginx:1.0.0 not found"}]} requestId:e49e7a6e-f6ff-46a8-8b7d-b0d215855dd5
```

> **注意**：`DownloadHelmChart` 返回 COS 临时凭证（`TmpSecretId`、`TmpSecretKey`、`Bucket`、`Path` 等），适用于需要编程方式获取 Chart 包的场景。日常使用建议首选 `DescribeChartDownloadInfo` + `curl`/`wget`，或直接使用下文的 Helm CLI 方式拉取。

### 步骤4：通过 OCI 协议推送 Helm Chart（数据面）

以下为数据面操作，需 `helm` CLI（v3.8+）且已配置 TCR 访问凭证。**前提条件**：

- Helm 客户端 v3.8+ 已安装（`helm version` 确认）
- 已通过 `CreateInstanceToken` 获取 TCR 长期访问凭证

> 本机未安装 `helm`，以下为操作示例。

#### 4a. OCI 登录

```bash
helm registry login kerwinwjyan-rewrite-001.tencentcloudcr.com \
  --username <用户名> \
  --password <实例Token>
```

```text
Login Succeeded
```

> `<用户名>` 为 TCR 实例访问凭证用户名（`CreateInstanceToken` 返回的 `Username`，通常为主账号 UIN），`<实例Token>` 为长期访问凭证 Token。

#### 4b. 打包 Chart

```bash
helm package ./mychart/
```

```text
Successfully packaged chart and saved it to: mychart-0.1.0.tgz
```

#### 4c. 推送至 TCR（OCI）

```bash
helm push mychart-0.1.0.tgz oci://kerwinwjyan-rewrite-001.tencentcloudcr.com/skillhub
```

```text
Pushed: kerwinwjyan-rewrite-001.tencentcloudcr.com/skillhub/mychart:0.1.0
Digest: sha256:abc123...
```

### 步骤5：通过 OCI 协议拉取 Helm Chart（数据面）

**前提条件**：已通过 `helm registry login` 登录 TCR（见步骤4a）。

```bash
helm pull oci://kerwinwjyan-rewrite-001.tencentcloudcr.com/skillhub/mychart --version 0.1.0
```

```text
Pulled: kerwinwjyan-rewrite-001.tencentcloudcr.com/skillhub/mychart:0.1.0
Digest: sha256:abc123...
```

### 步骤6：从 TCR 直接安装 Helm Chart（数据面）

```bash
helm install my-release oci://kerwinwjyan-rewrite-001.tencentcloudcr.com/skillhub/mychart \
  --version 0.1.0 \
  --namespace default \
  --create-namespace
```

```text
NAME: my-release
LAST DEPLOYED: Mon Jun 16 12:00:00 2026
NAMESPACE: default
STATUS: deployed
REVISION: 1
```

### 步骤7（备选）：通过 Chart Museum API 管理 Helm Chart

TCR 企业版为每个命名空间提供 Chart Museum 兼容端点：`https://<实例名>.tencentcloudcr.com/chartrepo/<命名空间>`。

#### 安装 helm-push 插件

```bash
helm plugin install https://github.com/chartmuseum/helm-push
```

```text
Installed plugin: cm-push
```

#### 添加 TCR Helm 仓库

```bash
helm repo add tcr-skillhub \
  https://kerwinwjyan-rewrite-001.tencentcloudcr.com/chartrepo/skillhub \
  --username <用户名> \
  --password <实例Token>
```

```text
"tcr-skillhub" has been added to your repositories
```

#### 推送 Helm Chart（Chart Museum）

```bash
helm cm-push mychart tcr-skillhub
```

```text
remote: + mychart-0.1.0.tgz
```

#### 拉取 Helm Chart（Chart Museum）

```bash
helm repo update
helm fetch tcr-skillhub/mychart --version 0.1.0
```

## 验证

### 控制面（tccli）

Chart 上传后，通过以下命令验证控制面操作：

```bash
# 验证1：仓库列表中出现 Chart 对应仓库
tccli tcr DescribeRepositories \
  --RegistryId tcr-0e2hz15l \
  --NamespaceName skillhub \
  --region ap-guangzhou \
  --output json
# 期望：RepositoryList 中包含 Chart 对应的仓库条目

# 验证2：获取 Chart 下载信息成功
tccli tcr DescribeChartDownloadInfo \
  --RegistryId tcr-0e2hz15l \
  --NamespaceName skillhub \
  --ChartName mychart \
  --ChartVersion 0.1.0 \
  --region ap-guangzhou \
  --output json
# 期望：返回有效的 PreSignedDownloadURL
```

### 数据面（helm）

**前提条件**：`helm` CLI 已安装（v3.8+），均已通过 `helm registry login` 登录 TCR。

```bash
# 验证1：OCi 方式查看 Chart 元数据
helm show chart oci://kerwinwjyan-rewrite-001.tencentcloudcr.com/skillhub/mychart --version 0.1.0
# 期望：输出 Chart.yaml 内容

# 验证2：拉取 Chart 包并校验
helm pull oci://kerwinwjyan-rewrite-001.tencentcloudcr.com/skillhub/mychart --version 0.1.0
ls -l mychart-0.1.0.tgz
# 期望：mychart-0.1.0.tgz 文件存在

# 验证3（Chart Museum）：搜索仓库中的 Chart
helm search repo tcr-skillhub/mychart --versions
# 期望：列出 mychart 的各版本
```

## 清理

### 数据面（helm）

```bash
# 卸载已安装的 Helm release（如有）
helm uninstall my-release --namespace default

# 移除本地仓库引用（Chart Museum 方式）
helm repo remove tcr-skillhub

# 登出 OCI registry
helm registry logout kerwinwjyan-rewrite-001.tencentcloudcr.com
```

### 控制面（tccli）

删除 Chart 对应的仓库（将同时清除其下所有 Chart 版本）：

```bash
# 当前实例尚无 Chart 上传，无需删除。
# 如已上传 Chart，执行以下命令（谨慎！数据不可恢复）：
tccli tcr DeleteRepository \
  --RegistryId tcr-0e2hz15l \
  --NamespaceName skillhub \
  --RepositoryName mychart \
  --region ap-guangzhou \
  --output json
```

```json
{
    "RequestId": "b5499668-30a7-4da3-b516-d2c0ae32ea60"
}
```

> **警告**：删除仓库将同时删除其下所有 Chart 版本及关联的容器镜像 Tag，不可恢复。

## 排障

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `DescribeChartDownloadInfo` 返回 `chart <ns>/<name>:<ver> not found` | 确认 Chart 是否已推送至 TCR | Chart 尚未上传或 ChartName/ChartVersion 参数错误 | 先通过 `helm push` 上传 Chart 后再查询 |
| `helm registry login` 返回 401 | 运行 `tccli tcr DescribeInstanceToken --RegistryId <Id>` 检查 Token 状态 | 用户名或 Token 错误/过期 | 确认用户名（主账号 UIN）和 Token 正确；若过期，`CreateInstanceToken` 重新生成 |
| `helm push`（OCI）报 401 | 同上 | 未登录或登录过期 | 先执行 `helm registry login` |
| `helm push`（OCI）报 `unsupported protocol scheme` | `helm version --short` 查看版本 | Helm 版本 < 3.8，不支持 OCI 协议 | 升级 Helm 至 v3.8+，或改用 Chart Museum 方式（见步骤7） |
| `helm cm-push` 报 `command not found` | `helm plugin list` 查看已安装插件 | 未安装 helm-push 插件 | 执行 `helm plugin install https://github.com/chartmuseum/helm-push` |
| `helm repo add` 返回 401 | 确认用户名和 Token | 凭据错误或 Token 过期 | 重新获取 Token 并重试 |
| 网络不通（超时/拒绝连接） | 确认当前网络能解析实例域名 | 当前机器 IP 不在实例公网白名单中，或未配置 VPC 内网访问 | `ManageExternalEndpoint Open` 开启公网访问并添加白名单，或配置内网访问 |
| 子账号无操作权限 | 与主账号确认 CAM 策略 | 子账号缺少 `tcr:DescribeRepositories` 等权限 | 参考 [企业版授权方案示例](https://cloud.tencent.com/document/product/1141/41417) 授权 |

## 下一步

- [管理镜像仓库](../../image-creation/repository)（page_id `41811`） — 在同一命名空间管理容器镜像
- [管理命名空间](../../image-creation/namespace)（page_id `41803`） — 管理命名空间的公开/私有属性
- [OCI 制品管理概述](../overview)（page_id `63918`） — 了解 TCR 支持的 OCI 制品类型
- [创建企业版实例](../../create)（page_id `51110`） — 创建新的 TCR 企业版实例

## 控制台替代

[容器镜像服务 -> Helm Chart](https://console.cloud.tencent.com/tcr/chart)：选择实例，进入 Helm Chart 管理页，上传 Chart 包、查看已上传 Chart 的版本列表、查看 Chart 包内文件详情。
