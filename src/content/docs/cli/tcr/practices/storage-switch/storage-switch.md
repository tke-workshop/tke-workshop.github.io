---
title: "TCR 实例后端存储切换"
description: "· page_id `128966`"
---

> 对照官方：[TCR 实例后端存储切换](https://cloud.tencent.com/document/product/1141/128966) · page_id `128966`

## 概述

TCR 企业版实例以 COS（对象存储）桶作为容器镜像的后端存储。COS 桶分为单 AZ 存储和多 AZ（Multi-AZ）存储。单 AZ 架构下，单个可用区遭遇自然灾害、断电等极端情况会导致 COS 桶不可访问，影响镜像拉取与推送。

TCR 提供后端存储切换能力：将主实例的后端存储从原 COS 桶切换至位于其他地域的复制实例关联的 COS 桶。切换后，实例的读请求（拉取镜像）被路由到目标地域的 COS 桶，保障业务可持续拉取镜像。

> **计费提示：** 此操作可能产生额外费用。切换至异地复制桶后，跨地域复制流量和备份桶存储将持续产生 COS 费用。回切至原桶后可停止备份桶的额外费用。详见 [COS 计费说明](https://cloud.tencent.com/document/product/436/16871)。

**方案对比：**

| 方案 | 适用场景 | 可用性 | 成本 | 切换后限制 |
|------|---------|--------|------|-----------|
| COS 桶原地升级多 AZ | COS 单 AZ 地域支持多 AZ（北京、广州、上海、中国香港、新加坡、上海金融） | 同地域跨 AZ 容灾 | 多 AZ 存储费用略高 | 无，实例保持完整读/写能力 |
| 后端存储切换至异地复制桶 | 单 AZ 地域故障、地域级 COS 中断、网络不可达 | 跨地域容灾 | 跨地域复制流量 + 目标桶存储 | **只读模式**：仅 `docker pull`，不可 `docker push` |

**建议：** 在支持多 AZ 的地域，优先联系 COS 团队将桶原地升级为多 AZ；后端存储切换为临时应急手段，切换后需尽快回切以恢复推送能力。

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置

# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:DescribeInstances, tcr:DescribeReplicationInstances, tcr:ModifyInstanceStorage, tcr:CreateInstanceToken
#    cos:GetBucketAccelerate, cos:PutBucketAccelerate
# 验证：执行 DescribeInstances 确认 TCR 权限
tccli tcr DescribeInstances --region <Region>
# expected: exit 0，返回实例列表（可为空）
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

```bash
# 4. 验证 DescribeReplicationInstances 权限
tccli tcr DescribeReplicationInstances --region <Region> --RegistryId '<RegistryId>'
# expected: exit 0
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "RegistryId": "tcr-example",
            "ReplicationRegistryId": "tcr-example-4-ghbzyc",
            "ReplicationRegionId": 4,
            "ReplicationRegionName": "ap-shanghai",
            "Status": "Running"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

> **注意：** `tccli cos` 模块不存在。COS 桶相关操作（查询桶列表、开启/查看全球加速）需通过 [COS 控制台](https://console.cloud.tencent.com/cos/bucket) 执行。CAM Action: `cos:GetBucketAccelerate`, `cos:PutBucketAccelerate`。

### 资源检查

```bash
# 5. 确认主实例存在且状态为 Running
tccli tcr DescribeInstances --region <Region> --Registryids '["<RegistryId>"]'
# expected: exit 0, TotalCount >= 1, Status: "Running"
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "tcr-example.tencentcloudcr.com",
            "RegionName": "ap-guangzhou",
            "InternalEndpoint": "10.1.67.137",
            "EnableCosMAZ": false
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

```bash
# 6. 确认复制实例存在且状态为 Running
tccli tcr DescribeReplicationInstances --region <Region> --RegistryId '<RegistryId>'
# expected: exit 0; premium 实例至少一个 Status: "Running"；basic 实例 TotalCount: 0
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "RegistryId": "tcr-example",
            "ReplicationRegistryId": "tcr-example-4-ghbzyc",
            "ReplicationRegionId": 4,
            "ReplicationRegionName": "ap-shanghai",
            "Status": "Running"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

```bash
# 7. 确认目标 COS 桶存在且已开启全球加速
#    打开 COS 控制台 -> 选择目标桶 -> 域名与传输管理 -> 全球加速
#    无 tccli 对应命令，通过控制台验证
# expected: 全球加速状态为"已开启"
```

### 使用限制

- 仅 TCR 企业版支持（含标准版和高级版），个人版不支持
- 切换后实例仅支持镜像拉取（`docker pull`），不支持镜像推送（`docker push`）
- 需确认目标地域与复制实例所在地域一致

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看实例详情 | `DescribeInstances` | 是 |
| 查看复制实例列表 | `DescribeReplicationInstances` | 是 |
| 执行后端存储切换 | `ModifyInstanceStorage` | 否（覆盖性操作） |
| 开启 COS 桶全球加速 | COS 控制台（无 tccli 模块） | 是 |
| 查看 COS 桶加速状态 | COS 控制台（无 tccli 模块） | 是 |

### 关键字段说明

以下说明 `ModifyInstanceStorage` 的主要参数。完整参数定义见 `tccli tcr ModifyInstanceStorage --generate-cli-skeleton`。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | TCR 主实例 ID，格式 `tcr-` 开头。由 `DescribeInstances` 获取 | `ResourceNotFound`：实例不存在 |
| `TargetRegion` | String | 是 | 复制实例 COS 桶所在地域，须与 `DescribeReplicationInstances` 返回的 `ReplicationRegionName` 一致 | `InvalidParameter`：地域不匹配 |
| `TargetStorageName` | String | 是 | COS 桶名称（格式 `<RegistryId>-<RegionCode>-<RandomString>-<AppId>`），非加速域名 | `InvalidParameter`：填入加速域名而非桶名 |

### COS 桶操作说明（控制台）

COS 桶相关操作无法通过 tccli 执行（`tccli cos` 模块不存在）。以下操作需在 [COS 控制台](https://console.cloud.tencent.com/cos/bucket) 完成：

| 操作 | 控制台路径 | 说明 |
|------|-----------|------|
| 查看桶列表 | COS 控制台 -> 存储桶列表 | 搜索目标桶名称 |
| 查看全球加速状态 | COS 控制台 -> 选择目标桶 -> 域名与传输管理 -> 全球加速 | 状态字段显示"已开启"或"已关闭" |
| 开启全球加速 | COS 控制台 -> 选择目标桶 -> 域名与传输管理 -> 全球加速 -> 编辑 -> 开启 | 立即生效，无需等待 |

**备选：** 可安装 `coscmd` 命令行工具（`pip install coscmd`）执行 COS 操作。配置和命令语法见 [COSCMD 工具文档](https://cloud.tencent.com/document/product/436/10976)。

## 操作步骤

### 步骤 1：确认主实例状态

查看主实例状态，确认处于 `Running`。

```bash
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region>
# expected: exit 0, Status: "Running"
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "tcr-example.tencentcloudcr.com",
            "RegionName": "ap-guangzhou",
            "InternalEndpoint": "10.1.67.137",
            "EnableCosMAZ": false
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

| 字段 | 说明 | 期望 |
|------|------|------|
| `Status` | 实例状态 | `Running` |
| `EnableCosMAZ` | `false` 表示当前为单 AZ 存储，确认需要切换 | -- |
| `RegionName` | 主实例所在地域，用于后续回切 | -- |

### 步骤 2：确认复制实例状态

查看复制实例列表，确认目标复制实例处于 `Running`。

```bash
tccli tcr DescribeReplicationInstances \
    --RegistryId '<RegistryId>' \
    --region <Region>
# expected: exit 0, at least one ReplicationRegistry with Status: "Running"
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "RegistryId": "tcr-example",
            "ReplicationRegistryId": "tcr-example-4-ghbzyc",
            "ReplicationRegionId": 4,
            "ReplicationRegionName": "ap-shanghai",
            "Status": "Running"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

| 字段 | 说明 |
|------|------|
| `Status` | 须为 `Running` |
| `ReplicationRegionName` | 目标地域，即后续 `--TargetRegion` 参数值 |
| `ReplicationRegionId` | 目标地域的数字编码，用于推导 COS 桶命名 |
| `ReplicationRegistryId` | 复制实例 ID，用于识别目标 COS 桶 |

### 步骤 3：获取 COS 存储桶信息

TCR 实例创建时自动关联 COS 桶，桶名遵循固定格式。需获取复制实例关联的 COS 桶名称，作为 `--TargetStorageName` 参数。

**COS 桶命名规则：**

复制实例关联的桶名格式为：

```
<RegistryId>-<RegionCode>-<RandomString>-<AppId>
```

| 组成部分 | 说明 | 示例值 |
|---------|------|--------|
| `RegistryId` | 主实例 ID | `tcr-example` |
| `RegionCode` | 目标地域数字编码（即 `ReplicationRegionId`） | `4`（ap-shanghai） |
| `RandomString` | 系统随机生成标识（6 位字母） | `ghbzyc` |
| `AppId` | 主账号 AppId（在 [账号信息](https://console.cloud.tencent.com/developer) 查看） | `1250000000` |

**完整桶名示例：** `tcr-example-4-ghbzyc-1250000000`

**常见 RegionCode 对照：**

| 地域 | RegionCode |
|------|----------|
| 广州 `ap-guangzhou` | `1` |
| 上海 `ap-shanghai` | `4` |
| 北京 `ap-beijing` | `8` |
| 成都 `ap-chengdu` | `16` |
| 香港 `ap-hongkong` | `5` |
| 新加坡 `ap-singapore` | `9` |
| 硅谷 `na-siliconvalley` | `15` |

**通过 CLI 定位目标桶：**

```bash
# 从 DescribeReplicationInstances 获取 ReplicationRegistryId 和 ReplicationRegionId
tccli tcr DescribeReplicationInstances \
    --RegistryId '<RegistryId>' \
    --region <Region>
# expected: ReplicationRegistryId 含 RegionCode 和 RandomString（如 "tcr-example-4-ghbzyc"）
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "RegistryId": "tcr-example",
            "ReplicationRegistryId": "tcr-example-4-ghbzyc",
            "ReplicationRegionId": 4,
            "ReplicationRegionName": "ap-shanghai",
            "Status": "Running"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

然后打开 [COS 控制台 - 存储桶列表](https://console.cloud.tencent.com/cos/bucket)，在搜索框中输入主实例 ID（如 `tcr-example`），找到名称匹配 `<RegistryId>-<RegionCode>-<RandomString>-<AppId>` 格式的桶即为目标桶。

> **注意：** `--TargetStorageName` 须填 COS 桶**名称**（如 `tcr-example-4-ghbzyc-1250000000`），不可填加速域名（如 `tcr-example-4-ghbzyc-1250000000.cos.accelerate.myqcloud.com`）。填入域名将导致 `InvalidParameter` 错误。

### 步骤 4：启用 COS 桶全球加速

复制实例的 COS 桶在创建时默认**未开启**全球加速。`ModifyInstanceStorage` 要求目标桶已启用全球加速，否则接口返回 `FailedOperation`。

#### 选择依据

- 全球加速使 COS 桶可被跨地域客户端通过内网高速访问。在存储切换场景中，TCR 后端从主实例地域访问异地复制桶，需要全球加速以保证读取性能。

#### 4.1 检查当前加速状态

打开 [COS 控制台](https://console.cloud.tencent.com/cos/bucket)，选择目标桶，进入 **域名与传输管理** -> **全球加速**，查看状态。

- 状态为"已关闭"或显示为空 -> 未开启，需执行下一步
- 状态为"已开启" -> 已生效，可直接跳到步骤 5

#### 4.2 开启全球加速

在 COS 控制台 **域名与传输管理** -> **全球加速** 页面，点击 **编辑**，开启全球加速开关，保存。开启后立即生效。

#### 4.3 验证加速已开启

刷新 **全球加速** 页面，确认状态变为"已开启"。

**备选（若已安装 coscmd）：**

```bash
# 查看状态
coscmd getbucketaccelerate --bucket '<BucketName>-<AppId>' --region '<TargetRegion>'
# expected: enabled

# 开启
coscmd putbucketaccelerate --bucket '<BucketName>-<AppId>' --region '<TargetRegion>' --enable
```

### 步骤 5：执行存储切换

#### 选择依据

- **目标 COS 桶**：选择与主实例已建立复制关系的复制实例关联的桶。此桶内的镜像数据与主实例同步，切换后数据一致性有保障。不支持任意指定 COS 桶。
- **目标地域**：必须与复制实例所在地域（`ReplicationRegionName`）一致，否则 `--TargetRegion` 与桶所在地域不匹配导致 `InvalidParameter`。
- **桶名而非加速域名**：`--TargetStorageName` 必须填 COS 桶名称，不可填加速域名。
- **只读模式代价**：切换后实例进入只读模式，仅支持 `pull`。此为临时应急手段，故障恢复后应尽快回切。

```bash
tccli tcr ModifyInstanceStorage \
    --RegistryId '<RegistryId>' \
    --TargetRegion '<TargetRegion>' \
    --TargetStorageName '<BucketName-APPID>' \
    --region <Region>
# expected: exit 0, 返回 RegistryId
```

**预期输出：**

```json
{
    "RegistryId": "tcr-example",
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<RegistryId>` | TCR 主实例 ID | 格式 `tcr-` 开头 | 步骤 1 `DescribeInstances` 输出的 `RegistryId` |
| `<TargetRegion>` | 目标 COS 桶所在地域 | 须与 `ReplicationRegionName` 一致 | 步骤 2 `DescribeReplicationInstances` 输出的 `ReplicationRegionName` |
| `<BucketName-APPID>` | 复制实例关联的 COS 桶名称 | 格式 `<RegistryId>-<RegionCode>-<RandomString>-<AppId>` | 步骤 3 确认的目标桶名 |
| `<Region>` | 主实例所在地域 | -- | `tccli configure list` 或步骤 1 `RegionName` |

> **警告：此操作是破坏性的，不可逆。** 切换后实例进入**只读模式** -- 仅支持镜像拉取（`docker pull`），不支持镜像推送（`docker push`）。如需恢复推送能力，必须再次调用 `ModifyInstanceStorage` 将存储指向原 COS 桶（见[清理](#清理)）。切换至异地桶后将产生跨地域复制流量和备份桶存储费用。

### 步骤 6：等待切换生效

`ModifyInstanceStorage` 返回成功后，后端服务需要约 1-2 分钟滚动更新。轮询确认实例恢复 `Running` 状态：

```bash
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region>
# expected: exit 0, Status: "Running"
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "tcr-example.tencentcloudcr.com",
            "InternalEndpoint": "10.1.67.137"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

多维度验证切换是否真正生效：

| 维度 | 检查内容 | 命令 | 预期 |
|------|---------|------|------|
| 状态 | 实例是否恢复 Running | `DescribeInstances --Registryids '["<RegistryId>"]'` | `Status: "Running"` |
| 控制面 | `ModifyInstanceStorage` 返回 `RegistryId` | 步骤 5 输出 | `RegistryId` 非空，与主实例 ID 一致 |
| 复制实例 | 目标复制实例状态正常 | `DescribeReplicationInstances --RegistryId '<RegistryId>'` | 目标复制实例 `Status: "Running"` |
| 数据面 | 镜像拉取可达 | `docker pull <RegistryId>.tencentcloudcr.com/<namespace>/<image>:<tag>` | 拉取成功（见[验证](#验证)） |
| 只读模式 | 推送被拒绝 | `docker push <RegistryId>.tencentcloudcr.com/<namespace>/<image>:<tag>` | 推送失败（预期行为） |

> 直到所有维度确认无误后继续。最长等待约 3 分钟。超时参见 [排障](#排障)。

## 验证

### 控制面（tccli）

```bash
# 确认主实例状态
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region>
# expected: exit 0, Status: "Running"
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "tcr-example.tencentcloudcr.com"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

```bash
# 确认复制实例状态
tccli tcr DescribeReplicationInstances \
    --RegistryId '<RegistryId>' \
    --region <Region>
# expected: exit 0, 目标复制实例 Status: "Running"
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "RegistryId": "tcr-example",
            "ReplicationRegistryId": "tcr-example-4-ghbzyc",
            "ReplicationRegionId": 4,
            "ReplicationRegionName": "ap-shanghai",
            "Status": "Running"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

### COS 全球加速验证（控制台）

确认目标桶全球加速仍为"已开启"状态：
打开 [COS 控制台](https://console.cloud.tencent.com/cos/bucket) -> 选择目标桶 -> **域名与传输管理** -> **全球加速**。

### 数据面（docker）

切换完成后，用 Docker 客户端拉取实例内已有镜像，验证存储切换生效。

首先获取临时登录凭证：

```bash
tccli tcr CreateInstanceToken \
    --RegistryId '<RegistryId>' \
    --TokenType temp \
    --Desc "存储切换验证用临时凭证" \
    --region <Region>
# expected: exit 0, 返回 Username 和 Token
```

**预期输出：**

```json
{
    "Username": "100012345678",
    "Token": "eyJhbGciOi...",
    "ExpTime": 1718552800,
    "TokenId": "tcr-example-token-abc123",
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

```bash
docker login <RegistryId>.tencentcloudcr.com \
    --username <Username> \
    --password <Token>
# expected: Login Succeeded
```

然后拉取镜像：

```bash
docker pull <RegistryId>.tencentcloudcr.com/<namespace>/<image>:<tag>
# expected: 拉取成功
```

```text
TAG: Pulling from <namespace>/<image>
Digest: sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Status: Downloaded newer image for <RegistryId>.tencentcloudcr.com/<namespace>/<image>:<tag>
```

**预期结果：**

- 拉取成功 -- 存储切换已生效，镜像数据从目标 COS 桶被正常读取
- 推送失败 -- 预期行为，实例处于只读模式（仅 `pull`，不可 `push`）

## 清理

后端存储切换操作本身不新建资源，但切换后实例处于只读模式且持续产生跨地域 COS 费用。如需**回切到原 COS 桶**并恢复推送能力，按以下步骤操作。

> **计费警告：** 切换至备份桶后，跨地域复制流量和备份桶存储将持续产生 COS 费用。回切至原桶后可停止备份桶的额外费用。详见 [COS 计费说明](https://cloud.tencent.com/document/product/436/16871)。

> **副作用警告：** 再次调用 `ModifyInstanceStorage` 回切时，实例的后端存储指向将变更。回切期间（约 1-2 分钟）实例不可用。回切后恢复完整读/写能力。此操作不删除任何资源（原桶和备份桶均保留），仅变更实例的路由指向。

### 1. 清理前状态检查

```bash
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region>
# expected: exit 0, Status: "Running"，确认是待回切的实例
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

```bash
tccli tcr DescribeReplicationInstances \
    --RegistryId '<RegistryId>' \
    --region <Region>
# expected: exit 0, 确认复制实例 ID，记录当前后端存储指向的地域
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "ReplicationRegistries": [
        {
            "RegistryId": "tcr-example",
            "ReplicationRegistryId": "tcr-example-4-ghbzyc",
            "ReplicationRegionId": 4,
            "ReplicationRegionName": "ap-shanghai",
            "Status": "Running"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

### 2. 回切至原 COS 桶

```bash
tccli tcr ModifyInstanceStorage \
    --RegistryId '<RegistryId>' \
    --TargetRegion '<OriginalRegion>' \
    --TargetStorageName '<OriginalBucketName-APPID>' \
    --region <Region>
# expected: exit 0, 返回 RegistryId
```

**预期输出：**

```json
{
    "RegistryId": "tcr-example",
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

| 参数 | 回切时的值 | 获取方式 |
|------|----------|---------|
| `--TargetRegion` | 主实例所在地域 | 步骤 1 `DescribeInstances` 输出中的 `RegionName`（如 `ap-guangzhou`） |
| `--TargetStorageName` | 原主实例的 COS 桶名称 | 打开 [COS 控制台](https://console.cloud.tencent.com/cos/bucket)，搜索主实例 ID（如 `tcr-example`），**不含**异地 RegionCode 和复制实例 ID 的桶即为原桶 |

**原 COS 桶命名格式：** `<RegistryId>-<LocalRegionCode>-<RandomString>-<AppId>`，其中 `LocalRegionCode` 为主实例所在地域的数字编码（广州为 `1`）。

### 3. 等待回切生效并验证

回切后等待约 1-2 分钟：

```bash
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region>
# expected: exit 0, Status: "Running"
```

**预期输出：**

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "tcr-example.tencentcloudcr.com"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

### 4. 验证推送能力已恢复

```bash
docker login <RegistryId>.tencentcloudcr.com \
    --username <Username> \
    --password <Token>
# expected: Login Succeeded

docker push <RegistryId>.tencentcloudcr.com/<namespace>/<image>:<tag>
# expected: 推送成功
```

推送成功即表明回切完成，实例恢复完整读/写（pull/push）能力。

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ModifyInstanceStorage` 返回 `InvalidParameter` | 检查 `--TargetStorageName` 是否包含 `.cos.accelerate.myqcloud.com` 后缀 | 填入了 COS 加速域名而非桶名称 | 确认参数值为 COS 桶名称（格式 `<RegistryId>-<RegionCode>-<RandomString>-<AppId>`），不含域名后缀 |
| `ModifyInstanceStorage` 返回 `InvalidParameter` 且桶名正确 | `tccli tcr DescribeReplicationInstances --RegistryId '<RegistryId>' --region <Region>` 查看 `ReplicationRegionName` | `--TargetRegion` 与复制实例所在地域不匹配 | 将 `--TargetRegion` 改为 `ReplicationRegionName` 的值 |
| `ModifyInstanceStorage` 返回 `FailedOperation` | 打开 [COS 控制台](https://console.cloud.tencent.com/cos/bucket) -> 选择目标桶 -> 域名与传输管理 -> 全球加速，检查加速状态 | COS 桶未开启全球加速 | 在 COS 控制台开启全球加速后重试 |
| `ModifyInstanceStorage` 返回 `FailedOperation` 且加速已开启 | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>` 检查实例状态 | 实例 `Status` 非 `Running` | 等待实例恢复 `Running` 后重试 |
| `ModifyInstanceStorage` 返回 `InternalError` | 记录返回的 `RequestId`，等待 1 分钟后重试 | TCR 后端服务临时异常 | 稍后重试；若持续失败则保留 `RegistryId`、`RequestId`、调用时间 -> [提交工单](https://console.cloud.tencent.com/workorder) |
| `ModifyInstanceStorage` 返回 `UnauthorizedOperation` | `tccli tcr DescribeInstances --region <Region>` 确认权限 | 缺少 `tcr:ModifyInstanceStorage` 权限（环境限制，非命令错误） | 联系主账号授予 `tcr:ModifyInstanceStorage` 权限 |
| `PutBucketAccelerate` 返回 `UnauthorizedOperation` | 检查 COS 控制台是否可访问目标桶设置 | 缺少 COS 桶操作权限（环境限制，非命令错误） | 联系主账号授予 `cos:PutBucketAccelerate` 权限，或前往 COS 控制台手动开启 |
| 无法查询 COS 桶加速状态 | 打开 [COS 控制台](https://console.cloud.tencent.com/cos/bucket) 确认桶名和地域 | 桶名或地域错误，或桶不存在 | 在 COS 控制台存储桶列表中搜索主实例 ID 确认桶名正确，并在正确的地域下查看 |

### 切换成功但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ModifyInstanceStorage` 返回成功但实例长期非 `Running` | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>` 轮询 `Status` | 后端存储切换滚动更新缓慢 | 继续轮询，每次间隔 15 秒；超过 5 分钟则保留 `RegistryId`、`RequestId` -> [提交工单](https://console.cloud.tencent.com/workorder) |
| 实例 `Running` 但 Docker 拉取失败 | `docker pull <RegistryId>.tencentcloudcr.com/<namespace>/<image>:<tag>` 查看具体错误 | 镜像未同步至复制桶、VPC 网络不可达、或后端路由未完全生效 | 1) 确认镜像已同步至复制桶（检查复制实例同步日志）；2) `ping <RegistryId>.tencentcloudcr.com` 检查网络可达性；3) 等待 2-3 分钟后重试 |
| 实例 `Running` 但无法推送镜像 | `docker push <RegistryId>.tencentcloudcr.com/<namespace>/<image>:<tag>` | 此为预期行为：切换后实例进入只读模式 | 正常现象，非故障。如需恢复推送能力，执行[清理](#清理)中的回切操作 |
| COS 桶名称无法确认 | 打开 [COS 控制台](https://console.cloud.tencent.com/cos/bucket) 搜索桶列表 | 桶格式不明确或存在多个桶 | 以主实例 ID 搜索；名称含目标 `RegionCode` 且含复制实例 ID 的桶即为目标桶；如仍无法确认，[提交工单](https://console.cloud.tencent.com/workorder) |
| `DescribeReplicationInstances` 返回空列表 | `tccli tcr DescribeReplicationInstances --RegistryId '<RegistryId>' --region <Region>` | 未创建复制实例或复制实例已删除 | 参见 [同实例多地域复制镜像](../../ops/image-distribution/cross-region-replication) 创建复制实例 |

## 下一步

- [同实例多地域复制镜像](../../ops/image-distribution/cross-region-replication) -- 创建复制实例详细指南
- [创建企业版实例](../../ops/instances/create) -- 实例创建与升级
- [使用自定义域名及云联网实现跨地域内网访问](../custom-domain-ccn) -- 跨地域内网访问
- [混合云下的多平台镜像数据同步复制](../hybrid-cloud-sync) -- 跨平台同步场景

## 控制台替代

- [容器镜像服务控制台](https://console.cloud.tencent.com/tcr/instance) -- 实例管理、查看后端存储桶
- [COS 控制台](https://console.cloud.tencent.com/cos/bucket) -- COS 桶全球加速管理
- [API Explorer: ModifyInstanceStorage](https://console.cloud.tencent.com/api/explorer?Product=tcr&Version=2019-09-24&Action=ModifyInstanceStorage)
