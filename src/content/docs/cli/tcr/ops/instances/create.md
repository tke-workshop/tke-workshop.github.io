---
title: "创建企业版实例（tccli）"
description: "· page_id `51110` · tccli ≥3.1.107.1 · API 2019-09-24"
---

> 对照官方：[创建企业版实例](https://cloud.tencent.com/document/product/1141/51110) · page_id `51110` · tccli ≥3.1.107.1 · API 2019-09-24

## 概述

通过 `tccli tcr CreateInstance` 创建 TCR 企业版实例。企业版实例是 TCR 的核心资源，提供容器镜像托管、安全扫描、分发与生命周期管理。创建实例时系统自动关联 COS 存储桶存放镜像数据，并生成专用 Registry 域名（格式 `<RegistryName>.tencentcloudcr.com`），供 `docker login` / `docker push` / `docker pull` 使用。

实例规格分为三档：**基础版**（basic）、**标准版**（standard）、**高级版**（premium），不同规格功能差异如下，详见[计费概述](https://cloud.tencent.com/document/product/1141/40540)。

| 规格 | 适用场景 | 安全扫描 | 跨地域同步 | 自定义域名 |
|------|---------|:---:|:---:|:---:|
| basic | 个人开发、小型团队入门 | 不支持 | 不支持 | 不支持 |
| standard | 中型团队、企业测试 | 支持 | 不支持 | 不支持 |
| premium | 生产环境、企业级 | 支持 | 支持 | 支持 |

创建为异步操作，典型耗时约 1--2 分钟（基础版），需轮询 `DescribeInstances` 或 `DescribeInstanceStatus` 直至 `Status` 为 `Running`。

## 前置条件

- [环境准备](../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0
```

```bash
# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域（如 ap-guangzhou）
```

```bash
# 3. 检查 CAM 权限 — 需要以下 Action 名
#    tcr:CreateInstance, tcr:DescribeInstances, tcr:DescribeInstanceStatus
#    tcr:CheckInstanceName, tcr:DescribeRegions
#    tcr:ModifyInstance（如后续需升级规格或关闭删除保护）
#    tcr:DeleteInstance（如需清理测试实例）
# 验证：执行 DescribeInstances 确认权限
tccli tcr DescribeInstances --region ap-guangzhou
# expected: exit 0，返回实例列表（可为空）
```

**输出**：

```json
{
    "TotalCount": 0,
    "Registries": [],
    "RequestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

```bash
# 4. 检查关联服务权限
tccli vpc DescribeVpcs --region ap-guangzhou
# expected: exit 0，返回 VPC 列表（可为空）
```

**输出**：

```json
{
    "TotalCount": 0,
    "VpcSet": [],
    "RequestId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

### 资源检查

```bash
# 5. 查询 TCR 企业版实例数量（确认未达配额上限）
tccli tcr DescribeInstances --region ap-guangzhou --output json | jq '.TotalCount'
# expected: 当前实例数 < 配额上限（默认每地域 10 个）
```

**输出**：

```text
18
```

```bash
# 6. 验证目标实例名可用
tccli tcr CheckInstanceName --RegistryName '<RegistryName>' --region ap-guangzhou --output json
# expected: exit 0, "IsValidated": true, "DetailCode": 0（名称可用）
```

**输出**：

```json
{
    "IsValidated": true,
    "DetailCode": 0,
    "RequestId": "72379508-75b5-477c-96fd-3aaa855e5b59"
}
```

```bash
# 7. 确认目标地域支持企业版
tccli tcr DescribeRegions --region ap-guangzhou --output json | jq '.Regions[] | select(.RegionName=="ap-guangzhou")'
# expected: {"Alias": "gz", "RegionId": 1, "RegionName": "ap-guangzhou", "Status": "alluser"}
```

**输出**：

```json
{
    "Alias": "gz",
    "RegionId": 1,
    "RegionName": "ap-guangzhou",
    "Status": "alluser"
}
```

### 计费与命名决策

- **计费类型**：默认选择按量计费（`RegistryChargeType=0`），按小时计费，测试完成后销毁实例即停止费用。包年包月（`RegistryChargeType=1`）适合长期稳定运行的生产环境，但需额外填写 `RegistryChargePrepaid` 参数。
- **实例名**：全局唯一，创建后不可修改。建议组合公司缩写、地域、项目名，如 `myco-gz-dev`。
- **地域**：选择 `ap-guangzhou`（广州），应与容器集群所在地一致。实例地域购买后不可更改。

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 / 参数 | 幂等 |
|-----------|------------------|:--:|
| 选择地域（控制台顶部菜单） | `--region ap-guangzhou` | 是 |
| 查询可用地域列表 | `DescribeRegions` | 是 |
| 检查实例名是否可用 | `CheckInstanceName --RegistryName <RegistryName>` | 是 |
| 输入实例名（全局唯一） | `--RegistryName` | — |
| 选择实例规格 | `--RegistryType basic/standard/premium` | — |
| 计费类型选择 | `--RegistryChargeType 0/1` | — |
| 启用多 AZ 存储 | `--EnableCosMAZ` | — |
| 启用 COS 版本控制 | `--EnableCosVersioning` | — |
| 开启删除保护 | `--DeletionProtection` | — |
| 同步标签至 COS 桶 | `--SyncTag` | — |
| 添加实例标签 | `--TagSpecification` | — |
| 勾选协议 / 立即购买 | `CreateInstance` | 否（重复同名报错） |
| 查看实例进度至"运行中" | `DescribeInstances` / `DescribeInstanceStatus` 轮询 | 是 |
| 升级实例规格 | `ModifyInstance --RegistryType premium` | 是（重复升级幂等） |

## 关键字段说明

以下说明 `CreateInstance` 的主要参数。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryName` | String | 是 | 全局唯一，2-255 字符，创建后不可修改。自动生成域名 `<RegistryName>.tencentcloudcr.com` | 名称被占用 → `ResourceAlreadyExists.InstanceName`；`CheckInstanceName` 预验证可规避 |
| `RegistryType` | String | 是 | `basic`（基础版）/ `standard`（标准版）/ `premium`（高级版）。不同规格功能差异见[计费概述](https://cloud.tencent.com/document/product/1141/40540)。**仅支持升级，不支持降级** | 填写非法值 → `InvalidParameter.RegistryType` |
| `RegistryChargeType` | Integer | 否 | `0` = 按量计费（默认），`1` = 预付费（包年包月）。若为 `1` 必须同时填 `RegistryChargePrepaid` | 预付费模式缺 `RegistryChargePrepaid` → `MissingParameter.RegistryChargePrepaid` |
| `RegistryChargePrepaid` | Object | 条件 | `RegistryChargeType=1` 时必填。`Period`: 购买月数（1/3/6/12），`RenewFlag`: `0`=手动续费/`1`=自动续费/`2`=不续费 | 未填 → 参数校验失败 |
| `DeletionProtection` | Boolean | 否 | 默认 `false`。`true` 后需先 `ModifyInstance --DeletionProtection false` 才能 `DeleteInstance` | 忘开 → 可能误删生产实例 |
| `EnableCosMAZ` | Boolean | 否 | 默认 `false`。`true` = COS 多 AZ 冗余存储（容灾，费用较高） | 创建后不可更改；非必要勿开 |
| `EnableCosVersioning` | Boolean | 否 | 默认 `false`。`true` = COS 桶多版本控制 | 创建后不可更改 |
| `SyncTag` | Boolean | 否 | 默认 `false`。`true` = 实例标签自动同步至关联 COS 桶 | — |
| `TagSpecification` | Object | 否 | `ResourceType`: `"instance"`，`Tags`: `[{"Key": "env", "Value": "prod"}]` | — |

## 操作步骤

### 步骤1：选择地域

查询 TCR 企业版支持的地域列表：

```bash
tccli tcr DescribeRegions --region ap-guangzhou --output json
# expected: exit 0，Regions 数组各条目 Status: "alluser"
```

**输出**：

```json
{
    "TotalCount": 19,
    "Regions": [
        {
            "Alias": "gz",
            "RegionId": 1,
            "RegionName": "ap-guangzhou",
            "Status": "alluser"
        }
    ],
    "RequestId": "eac6b301-a322-493a-8e36-83b295459397"
}
```

> 各地域 `Status` 为 `alluser` 表示所有用户均可使用。选择实例地域后，后续所有操作需使用相同的 `--region` 值。

### 步骤2：检查实例名可用性

创建实例前，验证目标实例名是否已被占用：

```bash
tccli tcr CheckInstanceName --RegistryName '<RegistryName>' --region ap-guangzhou --output json
# expected: exit 0, "IsValidated": true（名称可用）
```

**名称可用时输出**：

```json
{
    "IsValidated": true,
    "DetailCode": 0,
    "RequestId": "72379508-75b5-477c-96fd-3aaa855e5b59"
}
```

> 若名称已被占用，返回 `ResourceAlreadyExists.InstanceName`（见[排障](#排障)）。建议在实例名后缀加随机字符规避冲突。

### 步骤3：创建实例（最简模式）

#### 选择依据

- **RegistryType 选 `basic`**：basic 类型 PayMod=0 后付费（`RegistryChargeType=0`），无预付扣费。开发测试场景最小化成本，满足镜像托管基本需求。需要 premium 功能时可在线升级（`ModifyInstance --RegistryType premium`），但**不支持降级**，升级前确认确实需要高级功能。
- **RegistryChargeType 选 `0`（按量计费）**：按小时计费，测试完成后销毁实例即停止费用。预付费（`RegistryChargeType=1`）需额外填写 `RegistryChargePrepaid` 参数（`Period` + `RenewFlag`），适合长期生产环境。
- **region 选 `ap-guangzhou`**：TCR 在广州 region 可用（`DescribeRegions` 返回 19 个 `alluser` region），与容器集群所在地一致以降低内网拉取延迟。可通过 `tccli tcr DescribeRegions --region ap-guangzhou | jq '.Regions[].RegionName'` 确认完整可用列表。

#### 最简创建

仅含必填字段的最小可运行命令：

```bash
tccli tcr CreateInstance \
    --RegistryName <RegistryName> \
    --RegistryType basic \
    --RegistryChargeType 0 \
    --region <Region>
# expected: exit 0，返回 RegistryId
```

**输出**：

```json
{
    "RegistryId": "tcr-example",
    "RequestId": "610fa61b-8d81-4cf4-8b24-2295ae96d0f2"
}
```

> 记录返回的 `RegistryId`（示例 `tcr-example`），后续所有实例操作均依赖此 ID。

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<RegistryName>` | 实例名称 | 全局唯一，2-255 字符 | 自定义，创建前 `CheckInstanceName` 验证 |
| `<Region>` | 地域 | 如 `ap-guangzhou` | `tccli tcr DescribeRegions` 查看可用地域 |

### 步骤4：增强配置（可选）

#### 4a. 开启删除保护

开启删除保护可防止误删生产实例。关闭保护需先执行 `ModifyInstance --DeletionProtection false`：

```bash
tccli tcr CreateInstance \
    --RegistryName <RegistryName> \
    --RegistryType basic \
    --RegistryChargeType 0 \
    --DeletionProtection true \
    --region <Region>
# expected: exit 0，返回 RegistryId
```

#### 4b. COS 多 AZ + 版本控制（standard+）

> `EnableCosMAZ` 和 `EnableCosVersioning` 创建后不可更改，非必要勿开。

```bash
tccli tcr CreateInstance \
    --RegistryName <RegistryName> \
    --RegistryType standard \
    --RegistryChargeType 0 \
    --EnableCosMAZ true \
    --EnableCosVersioning true \
    --region <Region>
# expected: exit 0，返回 RegistryId
```

#### 4c. 完整增强创建（含标签 + 保护）

```bash
tccli tcr CreateInstance \
    --RegistryName <RegistryName> \
    --RegistryType standard \
    --RegistryChargeType 0 \
    --DeletionProtection true \
    --EnableCosMAZ true \
    --EnableCosVersioning true \
    --SyncTag true \
    --TagSpecification '{"ResourceType":"instance","Tags":[{"Key":"env","Value":"prod"}]}' \
    --region <Region>
# expected: exit 0，返回 RegistryId
```

#### 4d. 预付费（包年包月）

预付费（`RegistryChargeType=1`）时必须同时提供 `RegistryChargePrepaid` 参数，指定购买月数和续费方式：

```bash
tccli tcr CreateInstance \
    --RegistryName <RegistryName> \
    --RegistryType standard \
    --RegistryChargeType 1 \
    --RegistryChargePrepaid '{"Period":1,"RenewFlag":0}' \
    --DeletionProtection true \
    --region <Region>
# expected: exit 0，返回 RegistryId
```

> 预付费实例销毁时按使用时长比例退还至腾讯云账户（含现金和赠送金），详见[退费说明](https://cloud.tencent.com/document/product/1141/53319)。

### 步骤5：升级实例规格（basic → premium）

basic 后付费实例可在线升级至 premium，无需预先创建高级版实例。升级为异步操作，按量计费模式下不触发预付扣费，仅单价随 tier 提升而提高：

```bash
tccli tcr ModifyInstance \
    --RegistryId <RegistryId> \
    --RegistryType premium \
    --region <Region>
# expected: exit 0，返回 RequestId
```

**输出**：

```json
{
    "RequestId": "d2656698-9594-48a2-8039-c2e736bb7b95"
}
```

| 场景 | CLI 命令 | 说明 |
|------|---------|------|
| basic → standard | `ModifyInstance --RegistryId <RegistryId> --RegistryType standard --region <Region>` | 解锁安全扫描、自动扫描、镜像加速等标准版功能 |
| standard → premium | `ModifyInstance --RegistryId <RegistryId> --RegistryType premium --region <Region>` | 解锁复制实例、签名策略、跨账号同步等高级版功能 |
| 升级耗时 | 约 30--60 秒，轮询至 `Status: Running` | 升级期间实例正常可用 |
| 降级 | **不支持降级** | 升级前确认确实需要高级功能 |

### 步骤6：查询实例列表（确认创建）

查询当前地域所有实例：

```bash
tccli tcr DescribeInstances --region <Region>
# expected: exit 0，TotalCount > 0
```

**输出**：

```json
{
    "TotalCount": 18,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "tcr-example",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "tcr-example.tencentcloudcr.com",
            "InternalEndpoint": "10.1.67.13",
            "EnableAnonymous": true,
            "TokenValidTime": 87600,
            "PayMod": 0,
            "DeletionProtection": false,
            "EnableCosMAZ": false,
            "EnableCosVersioning": false,
            "CreatedAt": "2026-06-18T17:29:53+08:00"
        }
    ],
    "RequestId": "5dcfc309-f2f9-4038-b831-f75acd4fa794"
}
```

按名称精确过滤查询：

```bash
tccli tcr DescribeInstances \
    --region <Region> \
    --Filters '[{"Name":"RegistryName","Values":["<RegistryName>"]}]'
# expected: 返回匹配实例的完整详情
```

**输出**：

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "tcr-example",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "tcr-example.tencentcloudcr.com",
            "CreatedAt": "2026-06-18T17:29:53+08:00"
        }
    ],
    "RequestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

> 创建后实例初始状态为 `Deploying`，等待 1--2 分钟后变为 `Running`。

### 步骤7：轮询实例状态至 Running

使用 `DescribeInstanceStatus` 精确获取创建进度：

```bash
tccli tcr DescribeInstanceStatus \
    --RegistryIds '["<RegistryId>"]' \
    --region <Region> \
    --output json
# expected: Status: "Running"
```

**输出（创建完成 — `Running`）**：

```json
{
    "RegistryStatusSet": [
        {
            "RegistryId": "tcr-example",
            "Status": "Running",
            "Conditions": [
                {
                    "Type": "",
                    "Status": "Running",
                    "Reason": ""
                }
            ]
        }
    ],
    "RequestId": "eac6b301-a322-493a-8e36-83b295459397"
}
```

> 若 `Status` 为 `Deploying`，等待 15--30 秒后再次轮询。真机实测：基础版实例 7 次轮询后进入 `Running`，累计约 60 秒。

也可用 JMESPath 过滤器仅返回状态字段：

```bash
tccli tcr DescribeInstanceStatus \
    --RegistryIds '["<RegistryId>"]' \
    --region <Region> \
    --output json \
    --filter "RegistryStatusSet[0].Status"
# expected: "Running"
```

### 步骤8：获取实例访问域名

实例状态 `Running` 后，记录 `PublicDomain` 供后续 `docker login` / `docker push` / `docker pull` 使用：

```bash
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region> \
    --output json \
    --filter "Registries[0].{PublicDomain:PublicDomain,InternalEndpoint:InternalEndpoint}"
# expected: PublicDomain 非空，InternalEndpoint 非空
```

**输出**：

```json
{
    "PublicDomain": "tcr-example.tencentcloudcr.com",
    "InternalEndpoint": "10.1.67.13"
}
```

- `PublicDomain`：公网访问域名，格式 `<RegistryName>.tencentcloudcr.com`
- `InternalEndpoint`：内网访问 IP，用于 VPC 内免密拉取

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 实例名可用 | `CheckInstanceName --RegistryName '<RegistryName>' --region <Region>` | `IsValidated: true`，无 Error |
| 地域支持 | `DescribeRegions --region <Region> --output json \| jq '.Regions[] \| select(.RegionName=="ap-guangzhou")'` | `Status: "alluser"` |
| 实例已创建 | `DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>` | `TotalCount >= 1`，`Registries` 含目标实例 |
| 实例状态 Running | `DescribeInstanceStatus --RegistryIds '["<RegistryId>"]' --region <Region>` | `Status: "Running"` |
| RegistryType 正确 | `DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --filter "Registries[0].RegistryType"` | 与创建参数一致（如 `"basic"` 或 `"premium"`） |
| 公网域名就绪 | `DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --filter "Registries[0].PublicDomain"` | `"<RegistryName>.tencentcloudcr.com"` |
| 内网端点就绪 | 同上，取 `InternalEndpoint` | 非空 IP 地址 |
| 删除保护状态 | 同上，取 `DeletionProtection` | 与创建参数一致 |

### 数据面

实例创建后无法直接推送镜像，还需后续配置：

- [访问配置](../access/permissions/cam-subaccount) — 配置公网/内网访问控制策略（白名单）
- `docker login <PublicDomain>` — 使用 `CreateInstanceToken` 获取长期登录凭证
- [镜像创建](../image-creation/namespace) — 创建命名空间与镜像仓库
- `docker push` / `docker pull` — 推送/拉取镜像

## 清理

> **危险警告：`DeleteInstance` 将不可逆清除实例下所有命名空间、镜像仓库、Helm Chart、访问令牌、安全策略、同步复制规则及关联 COS 桶数据。数据不可恢复。**

### 1. 清理前状态检查

```bash
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region> \
    --output json
# expected: 确认是待删除的目标实例，记录 RegistryId、RegistryName、DeletionProtection
```

**输出**：

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "tcr-example",
            "RegistryType": "basic",
            "Status": "Running",
            "DeletionProtection": false,
            "CreatedAt": "2026-06-18T17:29:53+08:00"
        }
    ],
    "RequestId": "c3d4e5f6-a7b8-9012-cdef-123456789012"
}
```

### 2. 关闭删除保护（若开启）

若实例开启了 `DeletionProtection`，需先关闭：

```bash
tccli tcr ModifyInstance \
    --RegistryId <RegistryId> \
    --DeletionProtection false \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

### 3. 删除实例

```bash
tccli tcr DeleteInstance \
    --RegistryId <RegistryId> \
    --region <Region> \
    --output json
# expected: exit 0，返回 RequestId
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `<RegistryId>` | String | 是 | 待删除的实例 ID |
| `--DeleteBucket` | Boolean | 否 | 是否同时删除关联 COS 存储桶。默认 `false`（保留 COS 桶，需手动前往 [COS 控制台](https://console.cloud.tencent.com/cos) 清理） |

> **计费警告**：按量计费实例删除后停止计费；包年包月实例按使用时长比例退还至腾讯云账户（含现金和赠送金），详见[退费说明](https://cloud.tencent.com/document/product/1141/53319)。
>
> **级联删除警告**：`DeleteInstance` 将同时删除实例下所有命名空间、仓库、令牌、安全策略、同步复制规则。如使用了 `--DeleteBucket true`，关联 COS 桶及其中全部镜像数据将被永久删除且不可恢复。
>
> **主从实例依赖警告**：如果实例有关联的复制实例（ReplicationInstance），必须先删除复制实例再删除主实例。使用 `tccli tcr DescribeReplicationInstances --RegistryId <RegistryId> --region <Region>` 检查是否存在从实例，确认 `TotalCount` 为 `0` 后再删除。

### 4. 验证已删除

```bash
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region> \
    --output json
# expected: TotalCount: 0，Registries: []
```

**输出**：

```json
{
    "TotalCount": 0,
    "Registries": [],
    "RequestId": "d4e5f6a7-b8c9-0123-defa-234567890123"
}
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CheckInstanceName` 返回 `ResourceAlreadyExists.InstanceName` | `tccli tcr CheckInstanceName --RegistryName '<RegistryName>' --region <Region> --output json` 确认 `IsValidated: false` | 实例名已被占用（全局唯一） | 更换 `RegistryName`，建议组合公司缩写、地域、项目名，如 `myco-gz-dev`；或在后缀加随机字符 |
| `CreateInstance` 返回 `InvalidParameter.RegistryType` | 检查请求参数中 `RegistryType` 字段值 | 填写了非 `basic`/`standard`/`premium` 的值 | 使用 `"basic"`（基础版）、`"standard"`（标准版）或 `"premium"`（高级版） |
| `CreateInstance` 返回 `MissingParameter.RegistryChargePrepaid` | 检查请求参数中 `RegistryChargeType` 是否为 `1` | `RegistryChargeType=1`（预付费）时忘记提供 `RegistryChargePrepaid` 参数 | 若为预付费，必须同时提供 `RegistryChargePrepaid`：`{"Period":1,"RenewFlag":0}`；若不需要预付费，改用 `RegistryChargeType=0` |
| `CreateInstance` 返回 `FailedOperation.DbError` | 创建前执行 `CheckInstanceName --RegistryName '<RegistryName>' --region <Region>` 预验证 | 实例名冲突（与已有实例同名） | 更换名称或先 `DeleteInstance` 删除同名实例。创建前务必执行 `CheckInstanceName` 预验证 |
| `CreateInstance` 返回 `UnauthorizedOperation` | `tccli tcr DescribeInstances --region <Region>` 验证是否有 list 权限 | 子账号缺少 `tcr:CreateInstance` 权限 | 联系主账号授予 `QcloudTCRFullAccess` 或最小权限策略（含 `tcr:CreateInstance`） |
| `CreateInstance` 返回 `LimitExceeded` | `tccli tcr DescribeInstances --region <Region> --output json \| jq '.TotalCount'` 统计已有实例数 | 企业版实例数量已达配额上限 | 此为环境限制，非命令错误。前往 [配额中心](https://console.cloud.tencent.com/tcr/instance) 申请提升，或退还闲置实例 |
| `CreateInstance` 返回 `InternalError` / `FailedOperation` | 保留返回的 `RequestId` | 云端服务暂时不可用 | 稍后重试（间隔 30 秒以上）；若持续失败，凭 `RequestId` [在线咨询](https://cloud.tencent.com/online-service?from=doc_1141) |
| `DescribeRegions` 未返回目标地域 | `tccli tcr DescribeRegions --region <Region> --output json \| jq '.Regions[] \| .RegionName'` 查看完整列表 | 目标地域未对企业版开放，或仅限白名单用户 | 确认 `Regions[].Status` 为 `alluser`；部分地域（如金融专区）需联系腾讯云开通白名单 |
| `DeleteInstance` 被拒绝 | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --output json \| jq '.Registries[0].DeletionProtection'` | 实例开启了删除保护 | `ModifyInstance --DeletionProtection false` 关闭后重试 |
| `DeleteInstance` 返回 "has N replication registry" | `tccli tcr DescribeReplicationInstances --RegistryId <RegistryId> --region <Region>` 检查从实例 | 主实例下存在未删除的从实例（复制实例），需先清空从实例 | 逐个执行 `DeleteReplicationInstance`，确认 `DescribeReplicationInstances` 返回 `TotalCount: 0` 后再删除主实例 |

### 创建已提交但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 返回了 `RegistryId` 但 `Status` 长时间为 `Deploying`（超过 5 分钟） | `tccli tcr DescribeInstanceStatus --RegistryIds '["<RegistryId>"]' --region <Region>` 循环轮询，查看 `Status` 和 `Conditions` | 异步创建缓慢（正常情况基础版 7 次轮询约 60 秒）或 COS/VPC 后端依赖创建卡住（异常） | 继续轮询；超过 5 分钟确认 [COS](https://console.cloud.tencent.com/cos5)、[VPC](https://console.cloud.tencent.com/vpc)、[PrivateDNS](https://console.cloud.tencent.com/privatedns) 已开通；凭 `RegistryId` 和 `RequestId` [在线咨询](https://cloud.tencent.com/online-service?from=doc_1141) |
| `Status: "Unhealthy"` | 同上，查看 `Conditions` 字段的 `Reason` | 后端存储或网络异常 | 查看 `Conditions.Reason` 定位问题；保留 `RegistryId`、`RequestId`、创建 JSON → 提交工单 |
| `Status: "FailedCreated"` | 同上 | 创建流程失败 | 保留 `RegistryId`、`RequestId`、创建 JSON → `DeleteInstance` 删除后修正参数重新创建 |
| 创建成功但某属性不符预期 | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>` 检查各可选字段 | 创建时遗漏可选参数（如 `DeletionProtection`） | 可调属性用 `ModifyInstance` 修改；不可调属性（如 `EnableCosMAZ`）需删除重建 |

### 常见误操作预防

| 场景 | 预防措施 |
|------|---------|
| 误删生产实例 | 生产实例开启 `DeletionProtection: true`，需双重确认才能删除 |
| `RegistryType` 填错 | 不确定规格时先用 `basic`（按量计费），需要高级功能时再 `ModifyInstance` 升级 |
| 预付费参数遗漏 | 若 `RegistryChargeType=1`，务必同时提供 `RegistryChargePrepaid: {"Period":1,"RenewFlag":0}` |
| 包年包月实例误删产生退费损失 | 确认退费金额（参考[退费说明](https://cloud.tencent.com/document/product/1141/53319)）后再操作 |

## 下一步

- [销毁退还实例](../delete)（page_id `51111`） — 退还或销毁不再使用的实例
- [访问配置](../access/permissions/cam-subaccount) — 配置公网/内网访问与安全策略
- [镜像创建](../image-creation/namespace) — 创建命名空间与镜像仓库
- [镜像安全](../image-security/vulnerability-scan) — 镜像安全扫描与漏洞修复
- [环境准备](../index.md) — 返回 TCR 工具链入口

## 控制台替代

[容器镜像服务 → 实例管理 → 新建](https://console.cloud.tencent.com/tcr/instance)：选择地域，填写实例名、规格（basic/standard/premium），按需启用多 AZ 与版本控制，配置标签与删除保护，阅读协议后购买，等待实例状态变为"运行中"。
