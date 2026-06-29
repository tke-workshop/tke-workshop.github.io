---
title: "实例级公网访问白名单（tccli）"
description: "· page_id `63869`"
---

> 对照官方：[实例公网访问白名单](https://cloud.tencent.com/document/product/1141/63869) · page_id `63869`

## 概述

通过 `tccli tcr` 管理企业版实例的**公网访问白名单策略**（CIDR 安全策略）。该策略在**实例层级**生效，通过 CIDR 网段白名单控制**谁能访问 Registry 域名**（公网 `docker login` / `docker push` / `docker pull`）。

### 安全模型

TCR 实例公网访问采用 CIDR 白名单模型：

- **`SecurityPolicySet` 为空** → 所有公网 IP 均可访问（默认开放）。
- **`SecurityPolicySet` 非空** → 仅匹配已列入 CIDR 白名单的 IP 可访问，其余公网请求被拒绝。
- **删除最后一条策略** → 实例恢复为对所有公网 IP 开放。

每条策略包含一个 CIDR 网段（`CidrBlock`）和备注（`Description`）。系统为每条策略自动分配 `PolicyIndex`（从 0 开始）和全局递增的 `PolicyVersion`。

> **注意：这是实例级 CIDR 访问控制，与命名空间级"高危镜像部署阻断"（`ModifyNamespace --IsPreventVUL`）是两个独立功能。** CIDR 策略控制"谁能访问 Registry"（IP 维度），部署阻断控制"哪些镜像能被拉取"（漏洞扫描结果维度）。两者互不影响，可同时配置。

> **警告：`CidrBlock: 0.0.0.0/0` 表示放通所有公网 IP，仅适用于测试环境。生产环境应限定为已知出口 IP 网段，避免 Registry 暴露在公网。**

## 前置条件

- [环境准备](../../../index.md)
- 已完成 [创建企业版实例](../../create)，实例 `Status` 为 `Running`
- 已知目标实例的 `RegistryId`（如 `tcr-dg284imq`），可通过 `DescribeInstances` 获取
- 如使用子账号操作，需授予 `tcr:CreateSecurityPolicy`、`tcr:DescribeSecurityPolicies`、`tcr:ModifySecurityPolicy`、`tcr:DeleteSecurityPolicy`、`tcr:CreateMultipleSecurityPolicy` 权限

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 3.1.107.1

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域（如 ap-guangzhou）

# 3. 检查 CAM 权限 — 需要以下 Action
#    tcr:DescribeInstances, tcr:DescribeSecurityPolicies
#    tcr:CreateSecurityPolicy, tcr:CreateMultipleSecurityPolicy
#    tcr:ModifySecurityPolicy, tcr:DeleteSecurityPolicy
# 验证：执行 DescribeSecurityPolicies 确认权限（任意已有实例）
tccli tcr DescribeSecurityPolicies --RegistryId <RegistryId> --region ap-guangzhou
# expected: exit 0，返回 SecurityPolicySet（可为空数组）

# 4. 确认目标实例存在且 Running
tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region ap-guangzhou --output json \
  --filter "Registries[0].{RegistryId:RegistryId,Status:Status}"
# expected: {"RegistryId": "<RegistryId>", "Status": "Running"}
```

```bash
# 5. 查询目标实例当前白名单状态（确认起点）
tccli tcr DescribeSecurityPolicies --RegistryId <RegistryId> --region ap-guangzhou --output json
# expected: 返回 SecurityPolicySet，可能为空（表示当前对所有公网 IP 开放）
```

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 / 参数 | 幂等 |
|-----------|------------------|:--:|
| 选择地域（控制台顶部菜单） | `--region ap-guangzhou` | 是 |
| 查看实例公网白名单 | `DescribeSecurityPolicies --RegistryId <RegistryId>` | 是 |
| 新增单条白名单策略 | `CreateSecurityPolicy --CidrBlock <CidrBlock> --Description <描述>` | 否（同 CIDR 可重复创建多条） |
| 批量新增白名单策略 | `CreateMultipleSecurityPolicy --SecurityGroupPolicySet '[...]'` | 否（追加，同 CIDR 可重复） |
| 修改某条策略的 CIDR / 备注 | `ModifySecurityPolicy --PolicyIndex <Index> --CidrBlock <新Cidr> --Description <新描述>` | 是（重复提交结果一致） |
| 删除某条白名单策略 | `DeleteSecurityPolicy --PolicyIndex <Index> --PolicyVersion <版本>` | 是 |

## 关键字段说明

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | 目标企业版实例 ID，如 `tcr-dg284imq` | 填错 → `ResourceNotFound` |
| `CidrBlock` | String | 是（Create/Modify） | 合法 CIDR 网段，如 `10.0.0.0/8`、`0.0.0.0/0`、`192.168.1.0/24` | 格式非法 → `InvalidParameter` |
| `Description` | String | 是（Create/Modify） | 策略备注，如 `"内网访问"` | — |
| `PolicyIndex` | Integer | 是（Modify/Delete） | 系统自动分配，从 0 起。删除后剩余策略会被**重新编号（紧凑化）**，不可视为稳定 ID | 引用已删除的 Index → `InvalidParameter.Range` |
| `PolicyVersion` | String | 删除时必填 | 全局递增版本号，每次增删改均自增。删除时需传入**当前最新版本**，可通过 `DescribeSecurityPolicies` 获取 | 缺失 → `InvalidParameterValue`（参数 `.SecurityGroupPolicySet.Version` 值为空） |
| `SecurityGroupPolicySet` | Array | 是（CreateMultiple） | JSON 数组，每项含 `CidrBlock`、`Description`（`PolicyIndex`/`PolicyVersion` 可省略，由系统分配） | 格式错误 → `InvalidParameter` |

## 操作步骤

### 步骤1：新增单条白名单策略

为实例添加一条 CIDR 白名单。`PolicyIndex` 由系统自动分配，无需（也不应）手动指定：

```bash
tccli tcr CreateSecurityPolicy \
    --RegistryId <RegistryId> \
    --CidrBlock 0.0.0.0/0 \
    --Description "<Description>" \
    --region <Region>
# expected: exit 0，返回 RegistryId 与 RequestId
```

**输出**：

```json
{
    "RegistryId": "tcr-dg284imq",
    "RequestId": "e432eb07-bd4c-477d-ad50-681b5613c61a"
}
```

> `CreateSecurityPolicy` 仅返回 `RegistryId`，**不返回 `PolicyIndex`**。新增策略的 `PolicyIndex` 需通过步骤3 `DescribeSecurityPolicies` 查询获取。

> 一旦策略列表非空，仅匹配 CIDR 的 IP 可访问 Registry。新增 `0.0.0.0/0` 等价于"放通所有公网 IP"，仅用于测试。

### 步骤2：批量新增多条白名单策略

一次追加多条策略。`CreateMultipleSecurityPolicy` 为**追加**语义，不会清空已有策略：

```bash
tccli tcr CreateMultipleSecurityPolicy \
    --RegistryId <RegistryId> \
    --SecurityGroupPolicySet '[{"CidrBlock":"10.0.0.0/8","Description":"内网访问"},{"CidrBlock":"0.0.0.0/0","Description":"公网访问"}]' \
    --region <Region>
# expected: exit 0，返回 RegistryId 与 RequestId
```

**输出**：

```json
{
    "RegistryId": "tcr-dg284imq",
    "RequestId": "244ca1a7-48d4-4193-a67a-c8122f297d9f"
}
```

> 注意参数名为 `--SecurityGroupPolicySet`（非 `PolicyGroup`）。新策略的 `PolicyIndex` 接在已有列表末尾递增分配。如需"替换全部策略"，应先逐条 `DeleteSecurityPolicy` 清空，再 `CreateMultipleSecurityPolicy`。

### 步骤3：查询白名单策略列表

查询实例当前所有白名单策略，获取每条的 `PolicyIndex` 与 `PolicyVersion`（修改、删除均需引用）：

```bash
tccli tcr DescribeSecurityPolicies \
    --RegistryId <RegistryId> \
    --region <Region> \
    --output json
# expected: exit 0，返回 SecurityPolicySet 数组
```

**输出**：

```json
{
    "SecurityPolicySet": [
        {
            "PolicyIndex": 0,
            "Description": "测试放通所有公网访问",
            "CidrBlock": "0.0.0.0/0",
            "PolicyVersion": "1"
        },
        {
            "PolicyIndex": 1,
            "Description": "内网访问",
            "CidrBlock": "10.0.0.0/8",
            "PolicyVersion": "1"
        }
    ],
    "RequestId": "a6cfa802-3d03-45c2-86bb-0dcac320d6ea"
}
```

- `SecurityPolicySet` 为空数组 `[]` 表示当前实例对所有公网 IP 开放。
- `PolicyVersion` 为全局版本号，所有策略共享同一值，每次增删改后自增。删除策略时需传入**当前查询到的最新版本**。

仅查看 CIDR 与备注（精简输出）：

```bash
tccli tcr DescribeSecurityPolicies \
    --RegistryId <RegistryId> \
    --region <Region> \
    --output json \
    --filter "SecurityPolicySet[*].{Index:PolicyIndex,CIDR:CidrBlock,Desc:Description,Version:PolicyVersion}"
# expected: 返回精简数组
```

**输出**：

```json
[
    {
        "Index": 0,
        "CIDR": "0.0.0.0/0",
        "Desc": "测试放通所有公网访问",
        "Version": "1"
    },
    {
        "Index": 1,
        "CIDR": "10.0.0.0/8",
        "Desc": "内网访问",
        "Version": "1"
    }
]
```

### 步骤4：修改单条策略

修改指定 `PolicyIndex` 的 CIDR 与备注。`ModifySecurityPolicy` **仅支持修改 `CidrBlock` 和 `Description`**，不能改 `PolicyIndex`，且两者均为必填：

```bash
tccli tcr ModifySecurityPolicy \
    --RegistryId <RegistryId> \
    --PolicyIndex <PolicyIndex> \
    --CidrBlock <CidrBlock> \
    --Description <Description> \
    --region <Region>
# expected: exit 0，返回 RegistryId 与 RequestId
```

**输出**：

```json
{
    "RegistryId": "tcr-dg284imq",
    "RequestId": "de364645-0e1b-4070-a0f4-201cb50de233"
}
```

示例：将 `PolicyIndex 1` 的网段从 `10.0.0.0/8` 收窄为 `10.1.0.0/16`：

```bash
tccli tcr ModifySecurityPolicy \
    --RegistryId <RegistryId> \
    --PolicyIndex 1 \
    --CidrBlock 10.1.0.0/16 \
    --Description "内网访问-收窄" \
    --region <Region>
# expected: exit 0，返回 RegistryId 与 RequestId
```

> 修改后 `PolicyVersion` 自增。后续若需删除该策略，应重新 `DescribeSecurityPolicies` 获取最新 `PolicyVersion`。

### 步骤5：删除单条策略

删除指定策略。**`PolicyVersion` 在实践中为必填**（help 标注 Optional，但省略会报 `InvalidParameterValue`），需先通过步骤3查询获取：

```bash
tccli tcr DeleteSecurityPolicy \
    --RegistryId <RegistryId> \
    --PolicyIndex <PolicyIndex> \
    --PolicyVersion <PolicyVersion> \
    --region <Region>
# expected: exit 0，返回 RegistryId 与 RequestId
```

**输出**：

```json
{
    "RegistryId": "tcr-dg284imq",
    "RequestId": "308892a9-ea4e-4231-852d-b082a3416c9e"
}
```

> **删除后 `PolicyIndex` 会被紧凑化重排**：若原有索引 0、1、2，删除索引 1 后，原索引 2 的策略会被重编为索引 1。因此删除操作后，务必重新 `DescribeSecurityPolicies` 获取最新索引，再执行下一次按索引的操作。

> **删除最后一条策略会使实例恢复为对所有公网 IP 开放**。生产环境清理前确认是否需要保留至少一条限定 CIDR 的策略。

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 策略列表已更新 | `DescribeSecurityPolicies --RegistryId <RegistryId> --region <Region>` | `SecurityPolicySet` 含新增/修改后的条目 |
| 新增策略已生效 | 同上，`--filter "SecurityPolicySet[?CidrBlock=='<CidrBlock>']"` | 返回非空数组，含目标 CIDR |
| 修改后 CIDR 正确 | 同上，`--filter "SecurityPolicySet[?PolicyIndex==<PolicyIndex>].CidrBlock"` | 与 `ModifySecurityPolicy` 传入值一致 |
| 删除后策略已移除 | 同上，`--filter "SecurityPolicySet[?PolicyIndex==<PolicyIndex>]"` | 返回空数组 `[]` |
| PolicyVersion 已自增 | 同上，`--filter "SecurityPolicySet[0].PolicyVersion"` | 较操作前数值增大 |
| 全部清空后状态 | 同上，`--filter "SecurityPolicySet"` | `[]`（表示对所有公网 IP 开放） |

验证示例（确认修改后某条策略的 CIDR）：

```bash
tccli tcr DescribeSecurityPolicies \
    --RegistryId <RegistryId> \
    --region <Region> \
    --output json \
    --filter "SecurityPolicySet[?PolicyIndex==\`1\`].{CidrBlock:CidrBlock,Description:Description}"
# expected: 返回 PolicyIndex 1 的当前 CIDR 与备注
```

## 清理

> **警告：删除白名单策略会立即生效。若删除后列表为空，实例将恢复为对所有公网 IP 开放，可能暴露 Registry。**

### 1. 清理前状态检查

```bash
tccli tcr DescribeSecurityPolicies \
    --RegistryId <RegistryId> \
    --region <Region> \
    --output json
# expected: 确认当前策略条目数与 CIDR，记录待删除条目的 PolicyIndex 与 PolicyVersion
```

### 2. 逐条删除测试策略

按 `PolicyIndex` 从大到小逐条删除，避免删除导致的重排影响后续索引引用：

```bash
# 先删除高索引，再删低索引（每删一条后重新查询最新索引更稳妥）
tccli tcr DeleteSecurityPolicy \
    --RegistryId <RegistryId> \
    --PolicyIndex <PolicyIndex> \
    --PolicyVersion <PolicyVersion> \
    --region <Region> \
    --output json
# expected: exit 0，返回 RegistryId 与 RequestId
```

> 由于删除后 `PolicyIndex` 会紧凑化重排，**每次删除前都应重新 `DescribeSecurityPolicies` 获取最新索引与版本**，不要沿用旧索引连续删除。

### 3. 验证清理结果

```bash
tccli tcr DescribeSecurityPolicies \
    --RegistryId <RegistryId> \
    --region <Region> \
    --output json
# expected: SecurityPolicySet 为空数组 []（实例恢复对所有公网 IP 开放）
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `DescribeSecurityPolicies` 返回 `ResourceNotFound`，提示 "Failed to get security group id from registry" | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>` 确认实例存在 | `RegistryId` 填错或实例不在该 `--region` | 核对 `RegistryId` 与 `--region`，确保实例在该地域且 `Status: Running` |
| `CreateSecurityPolicy` 返回 `InvalidParameter`，CidrBlock 相关 | 检查 `--CidrBlock` 是否为合法 CIDR | 网段格式错误（如缺少掩码、掩码越界） | 使用合法 CIDR，如 `10.0.0.0/8`、`192.168.1.0/24`、`0.0.0.0/0` |
| `CreateSecurityPolicy` 返回 `UnauthorizedOperation` | `tccli tcr DescribeSecurityPolicies --RegistryId <RegistryId> --region <Region>` 验证权限 | 子账号缺少 `tcr:CreateSecurityPolicy` 权限 | 联系主账号授予 `QcloudTCRFullAccess` 或最小权限策略（含 `tcr:CreateSecurityPolicy`） |
| `CreateMultipleSecurityPolicy` 返回 `InvalidParameter`，提示 SecurityGroupPolicySet 相关 | 检查 JSON 数组格式与字段名 | 误用 `--PolicyGroup` 参数名，或 JSON 格式错误 | 参数名为 `--SecurityGroupPolicySet`，值为 JSON 数组，每项含 `CidrBlock`、`Description` |
| `ModifySecurityPolicy` 返回 `MissingParameter`，提示 CidrBlock 或 Description | 检查命令参数 | `ModifySecurityPolicy` 中 `CidrBlock` 与 `Description` 均为必填，缺一报错 | 同时提供 `--CidrBlock` 与 `--Description`，即使只想改其一也要传入原值 |
| `ModifySecurityPolicy` 返回 `InvalidParameter`，提示 PolicyIndex 相关 | `tccli tcr DescribeSecurityPolicies --RegistryId <RegistryId> --region <Region>` 查询有效索引 | `PolicyIndex` 不存在（已被删除或重排） | 重新查询获取最新 `PolicyIndex` 后再修改 |
| `DeleteSecurityPolicy` 返回 `InvalidParameterValue`，提示 "参数 `.SecurityGroupPolicySet.Version` 值为空" | 检查是否传入了 `--PolicyVersion` | `PolicyVersion` 在实践中为必填，省略报错 | 先 `DescribeSecurityPolicies` 获取当前 `PolicyVersion`，删除时一并传入 |
| `DeleteSecurityPolicy` 返回 `InvalidParameter.Range`，提示 PolicyIndex 超出范围 | `tccli tcr DescribeSecurityPolicies --RegistryId <RegistryId> --region <Region>` 查询当前最大索引 | 引用了已不存在的 `PolicyIndex`（删除后索引被紧凑化重排） | 重新查询最新索引，引用当前列表中实际存在的 `PolicyIndex` |
| 删除最后一条策略后 Registry 无法访问 | `tccli tcr DescribeSecurityPolicies --RegistryId <RegistryId> --region <Region>` 确认列表为空 | 列表为空 = 对所有公网 IP 开放，但客户端可能来自未放通的 IP（此为误解，空列表应为全开放） | 空列表即全开放；若仍无法访问，检查实例 `Status`、CAM 权限或网络 ACL，与本策略无关 |
| 策略已配置但仍可从任意 IP 访问 | `tccli tcr DescribeSecurityPolicies` 检查是否含 `0.0.0.0/0` | 白名单中存在 `0.0.0.0/0`，等于放通所有 IP | 删除或收窄 `0.0.0.0/0` 策略，仅保留限定 CIDR |

### 常见误操作预防

| 场景 | 预防措施 |
|------|---------|
| 误以为 `CreateSecurityPolicy` 返回 `PolicyIndex` | 该命令仅返回 `RegistryId` + `RequestId`，`PolicyIndex` 需 `DescribeSecurityPolicies` 查询 |
| 误以为 `CreateMultipleSecurityPolicy` 会替换全部策略 | 该命令为**追加**语义，不清空已有策略。需"替换全部"时先逐条删除再批量创建 |
| 引用旧 `PolicyIndex` 连续删除导致失败 | 删除后索引会紧凑化重排，每删一条都重新查询最新索引 |
| 漏传 `--PolicyVersion` 导致删除失败 | `PolicyVersion` 实践中必填，删除前先查询当前版本 |
| 删除最后一条策略使 Registry 公网全开放 | 生产环境保留至少一条限定 CIDR 的策略，清理前确认后果 |
| `0.0.0.0/0` 留在生产白名单 | 仅测试环境使用，生产环境应限定为已知出口 IP 网段 |

## 下一步

- [创建企业版实例](../../create)（page_id `51110`） — 创建实例以配置白名单
- [容器镜像安全扫描](../vulnerability-scan) — 镜像漏洞扫描（与访问控制独立）
- [容器镜像签名](../image-signing) — 镜像内容完整性校验
- [环境准备](../index.md) — 返回 TCR 工具链入口

## 控制台替代

[容器镜像服务 → 实例管理 → 选择实例 → 网络安全](https://console.cloud.tencent.com/tcr/instance)：选择地域与目标实例，进入"网络安全"页签，查看公网访问白名单列表。单击"新建"添加 CIDR 策略（填写网段与备注），单击已有策略行的"编辑"修改 CIDR/备注，单击"删除"移除策略。删除最后一条策略后实例恢复为对所有公网 IP 开放。
