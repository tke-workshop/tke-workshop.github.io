---
title: "配置公网访问控制（tccli）"
description: "· page_id `41837`"
---

> 对照官方：[配置公网访问控制](https://cloud.tencent.com/document/product/1141/41837) · page_id `41837`

## 概述

通过 `tccli tcr ManageExternalEndpoint` 开启或关闭 TCR 企业版实例的公网访问入口。新创建的 TCR 企业版实例**默认关闭公网访问入口**（`Status: "Closed"`），无法从公网环境直接推送/拉取镜像；不开启公网访问则无法通过 `docker login` 从外网登录。

开启公网访问入口后，任何人可通过实例公网域名（`<实例名>.tencentcloudcr.com`）访问实例，**默认拒绝全部来源**。需额外配置公网白名单策略（`CreateSecurityPolicy` / `CreateMultipleSecurityPolicy`）放通指定 IP 地址段后方可正常访问。

`ManageExternalEndpoint` 为**异步操作**。开启后状态流转为 `Closed` → `Opening` → `Opened`，需轮询 `DescribeExternalEndpointStatus` 确认终态。**在 `Opening` 状态下立即执行关闭操作将被拒绝**（见[排障](#排障)），必须等待状态到达 `Opened` 后再操作。

> **basic 实例限制**：基础版实例不支持安全策略（白名单）功能。`DescribeSecurityPolicies` 在 basic 实例上返回 `ResourceNotFound` 错误（安全组 ID 未获取到）。公网访问控制的白名单功能需 **standard 及以上** 规格。

## 前置条件

- [环境准备](../../index.md)：`tccli` 已安装配置，地域已设置（默认 `ap-guangzhou`）。
- 已成功 [创建企业版实例](../../../create)，实例状态为 `Running`。
- 获取目标实例的 `RegistryId`（如 `tcr-nn8smeyj`）：
  ```bash
  tccli tcr DescribeInstances --region ap-guangzhou --output json
  ```
- 如使用子账号操作，需授予对应实例的 `QcloudTCRFullAccess` 或资源级权限，参见 [企业版授权方案示例](https://cloud.tencent.com/document/product/1141/41417)。
- 若需配置安全策略（白名单），实例规格须为 **standard 或 premium**（basic 不支持）。

## 控制台与 CLI 参数映射

| 控制台操作 | CLI | 幂等 |
|-----------|-----|:--:|
| 开启公网访问入口 | `tccli tcr ManageExternalEndpoint --Operation Create` | 是（重复开启返回成功） |
| 关闭公网访问入口 | `tccli tcr ManageExternalEndpoint --Operation Delete` | 否（`Opening` 状态下关闭将被拒绝，见[排障](#排障)） |
| 查看公网访问入口状态 | `tccli tcr DescribeExternalEndpointStatus` | 是 |
| 查看公网白名单列表 | `tccli tcr DescribeSecurityPolicies` | 是（basic 实例不支持） |
| 添加公网白名单 | `tccli tcr CreateSecurityPolicy` | 是（允许同一 CIDR 重复创建，需 standard+） |
| 修改公网白名单 | `tccli tcr ModifySecurityPolicy --PolicyIndex <Index>` | 是（需 standard+） |
| 批量添加公网白名单 | `tccli tcr CreateMultipleSecurityPolicy` | 是（需 standard+） |
| 删除公网白名单 | `tccli tcr DeleteSecurityPolicy` | 否（策略不存在时报 `ResourceNotFound`，需 standard+） |

## 关键字段说明

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | 实例 ID，形如 `tcr-nn8smeyj` | 实例不存在 → `ResourceNotFound` |
| `Operation` | String | 是 | `Create` = 开启公网入口，`Delete` = 关闭公网入口 | 填写非法值 → `InvalidParameter` |
| `CidrBlock` | String | 是（白名单） | IPv4 地址或 CIDR 段（如 `10.0.0.1`、`192.168.1.0/24`）。`0.0.0.0/0` 表示所有 IP，不建议直接使用 | 格式不合法 → `InvalidParameter` |
| `Description` | String | 是（白名单） | 白名单策略描述，必填非空 | 为空 → `InvalidParameter` |
| `PolicyIndex` | Integer | 条件 | 策略序号（从 0 开始），用于修改/删除操作，由 `DescribeSecurityPolicies` 返回 | 无效 index → `InvalidParameter` |
| `PolicyVersion` | String | 条件 | 策略版本号，用于删除操作，由 `DescribeSecurityPolicies` 返回 | 版本不匹配 → `ResourceNotFound` |

## 操作步骤

### 步骤1：查看公网访问入口状态（初始 Closed）

```bash
tccli tcr DescribeExternalEndpointStatus \
  --RegistryId tcr-nn8smeyj \
  --region ap-guangzhou \
  --output json
```

**输出**（公网入口关闭状态）：

```json
{
    "Status": "Closed",
    "Reason": "",
    "RequestId": "4d1c4fc7-4404-45d4-a664-f06f86f01c32"
}
```

| Status | 含义 |
|--------|------|
| `Closed` | 公网访问入口已关闭（初始状态） |
| `Opening` | 公网访问入口开启中（过渡态，不可操作） |
| `Opened` | 公网访问入口已开启（终态，可配置白名单） |
| `Deleting` | 公网访问入口关闭中（过渡态） |

### 步骤2：开启公网访问入口

```bash
tccli tcr ManageExternalEndpoint \
  --RegistryId tcr-nn8smeyj \
  --Operation Create \
  --region ap-guangzhou \
  --output json
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `RegistryId` | String | 是 | 实例 ID |
| `Operation` | String | 是 | `Create` = 开启公网入口，`Delete` = 关闭公网入口 |

**输出**：

```json
{
    "RegistryId": "tcr-nn8smeyj",
    "RequestId": "63325fef-3763-4738-bb1f-5a70c37f0272"
}
```

`ManageExternalEndpoint` 是**异步操作**，返回成功只表示请求已提交，不代表公网入口已开启。必须轮询 `DescribeExternalEndpointStatus` 确认状态到达 `Opened`。

### 步骤3：轮询确认公网入口开启（Opening → Opened）

```bash
tccli tcr DescribeExternalEndpointStatus \
  --RegistryId tcr-nn8smeyj \
  --region ap-guangzhou \
  --output json
```

**输出**（终态 — `Opened`）：

```json
{
    "Status": "Opened",
    "Reason": "",
    "RequestId": "eac6b301-a322-493a-8e36-83b295459397"
}
```

> `Status` 从 `Closed` → `Opening` → `Opened`，中间过渡态 `Opening` 时**不可执行关闭操作**（`ManageExternalEndpoint --Operation Delete`），否则将返回错误（见[排障](#排障)）。等待 5--10 秒后再次轮询，直至 `Status` 变为 `Opened`。

**状态流转示意图**：

```
Closed ──[ManageExternalEndpoint Create]──> Opening ──[轮询等待]──> Opened
                                                                      │
                                                 [ManageExternalEndpoint Delete]
                                                                      │
                                                                      v
Closed <──[轮询等待]── Deleting <──────────────────────────────────────┘
```

### 步骤4：配置访问白名单策略

> **basic 实例注意**：以下白名单操作（`CreateSecurityPolicy`、`DescribeSecurityPolicies` 等）**在 basic 实例上不可用**。basic 实例公网入口开启后无白名单机制，任何人可通过公网域名直接访问。如需白名单控制，请将实例升级至 standard 或 premium。以下命令以 standard 实例为示例。

#### 4a. 查看已有白名单

```bash
tccli tcr DescribeSecurityPolicies \
  --RegistryId <RegistryId> \
  --region ap-guangzhou \
  --output json
```

**输出**（standard/premium 实例）：

```json
{
    "SecurityPolicySet": [
        {
            "PolicyIndex": 0,
            "CidrBlock": "192.168.1.0/24",
            "Description": "办公网络出口 IP",
            "PolicyVersion": "1"
        }
    ],
    "RequestId": "eac6b301-a322-493a-8e36-83b295459397"
}
```

**输出**（basic 实例 — **不支持**）：

```json
{
    "Response": {
        "Error": {
            "Code": "ResourceNotFound",
            "Message": "Failed to get security group id from registry: tcr-nn8smeyj"
        },
        "RequestId": "d90d771b-eacb-4b7e-8782-d3f5f10eb207"
    }
}
```

> basic 实例未绑定安全组，因此 `DescribeSecurityPolicies` 返回 `ResourceNotFound`。这是**预期行为**而非 Bug——basic 规格不提供安全策略白名单功能。

#### 4b. 添加公网白名单

添加放通 IP 地址段。支持单个 IPv4 地址或 CIDR 格式（如 `192.168.1.0/24`）。`0.0.0.0/0` 表示放通所有来源 IP，**不建议直接使用**。

```bash
tccli tcr CreateSecurityPolicy \
  --RegistryId tcr-nn8smeyj \
  --CidrBlock "10.0.0.0/16" \
  --Description "办公网络出口 IP" \
  --region ap-guangzhou \
  --output json
```

**输出**：

```json
{
    "RegistryId": "tcr-nn8smeyj",
    "RequestId": "d4e5f6a7-b8c9-0123-defa-234567890123"
}
```

真机验证：创建 `CidrBlock: 0.0.0.0/0` 策略返回 `PolicyIndex: 0`，`PolicyVersion: "1"`。可多次调用添加多条白名单策略，每条策略对应一个 IP 地址段。

> **安全建议**：白名单应按最小权限原则配置，仅放通必要的公网出口 IP 地址段。如服务器同时有多个出口 IP，需全部添加。

#### 4c. 批量添加公网白名单

当需要一次添加多条白名单策略时，使用 `CreateMultipleSecurityPolicy` 批量操作：

```bash
tccli tcr CreateMultipleSecurityPolicy \
  --RegistryId <RegistryId> \
  --SecurityGroupPolicySet '[{"Description":"办公网络出口 IP","CidrBlock":"192.168.1.0/24"},{"Description":"VPN 出口 IP","CidrBlock":"10.0.0.0/16"}]' \
  --region ap-guangzhou \
  --output json
```

**输出**：

```json
{
    "RegistryId": "tcr-nn8smeyj",
    "RequestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

> `--SecurityGroupPolicySet` 须为合法 JSON 数组，Shell 中使用单引号包裹以避免转义。

#### 4d. 修改公网白名单

修改已存在的白名单策略，需指定 `--PolicyIndex`（从 `DescribeSecurityPolicies` 获取）。`--CidrBlock` 和 `--Description` 均为必填，将替换原有内容：

```bash
tccli tcr ModifySecurityPolicy \
  --RegistryId <RegistryId> \
  --PolicyIndex 0 \
  --CidrBlock "10.0.0.0/16" \
  --Description "更新后的 VPN 出口 IP" \
  --region ap-guangzhou \
  --output json
```

**输出**：

```json
{
    "RegistryId": "tcr-nn8smeyj",
    "RequestId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

| 参数 | 说明 |
|------|------|
| `--RegistryId` | 实例 ID |
| `--PolicyIndex` | 策略序号，从 0 开始，与 `DescribeSecurityPolicies` 返回的 `PolicyIndex` 对应 |
| `--CidrBlock` | 修改后的 IP 地址段或 CIDR（必填） |
| `--Description` | 修改后的策略描述（必填） |

#### 4e. 删除公网白名单

删除前先从 `DescribeSecurityPolicies` 获取当前 `PolicyVersion`：

```bash
tccli tcr DeleteSecurityPolicy \
  --RegistryId <RegistryId> \
  --PolicyIndex 0 \
  --PolicyVersion <PolicyVersion> \
  --region ap-guangzhou \
  --output json
```

**输出**：

```json
{
    "RegistryId": "tcr-nn8smeyj",
    "RequestId": "c3d4e5f6-a7b8-9012-cdef-123456789012"
}
```

也可通过 `--CidrBlock` 指定要删除的 IP 地址段：

```bash
tccli tcr DeleteSecurityPolicy \
  --RegistryId <RegistryId> \
  --CidrBlock "10.0.0.0/16" \
  --PolicyVersion <PolicyVersion> \
  --region ap-guangzhou \
  --output json
```

### 步骤5：关闭公网访问入口

> **关键前提**：关闭操作要求公网入口状态为 `Opened`。若状态仍处于 `Opening`，关闭将被拒绝。务必先通过 `DescribeExternalEndpointStatus` 确认状态后再操作。

```bash
tccli tcr ManageExternalEndpoint \
  --RegistryId tcr-nn8smeyj \
  --Operation Delete \
  --region ap-guangzhou \
  --output json
```

**输出**：

```json
{
    "RegistryId": "tcr-nn8smeyj",
    "RequestId": "e8c2171f-fc2f-475d-920f-048f3cb48317"
}
```

关闭操作也是异步的，轮询 `DescribeExternalEndpointStatus` 直到 `Status` 变为 `Closed` 确认关闭完成。

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 期望结果 |
|--------|------|---------|
| 公网入口已开启 | `DescribeExternalEndpointStatus` | `Status: "Opened"` |
| 公网入口已关闭 | `DescribeExternalEndpointStatus` | `Status: "Closed"` |
| 白名单策略已生效 | `DescribeSecurityPolicies`（standard+） | `SecurityPolicySet` 含目标 CIDR |
| 开启请求已受理 | `ManageExternalEndpoint --Operation Create` | 返回有效 `RequestId` |
| 关闭请求已受理 | `ManageExternalEndpoint --Operation Delete` | 返回有效 `RequestId` |

```bash
# 确认公网入口状态
tccli tcr DescribeExternalEndpointStatus \
  --RegistryId tcr-nn8smeyj \
  --region ap-guangzhou \
  --output json
# 期望：Status: "Opened"
```

```bash
# 确认白名单策略（仅 standard+ 实例）
tccli tcr DescribeSecurityPolicies \
  --RegistryId <RegistryId> \
  --region ap-guangzhou \
  --output json
# 期望：SecurityPolicySet 包含目标 CidrBlock
```

### 数据面

```bash
# 公网入口开启且白名单放通后，可从外网 docker login
docker login <RegistryName>.tencentcloudcr.com
# 期望：Login Succeeded（需先创建访问凭证，参见 CreateInstanceToken）
```

## 清理

恢复为不开启公网访问且无白名单的原始状态：

```bash
# 1. 列出并删除所有白名单（仅 standard+ 实例需要）
tccli tcr DescribeSecurityPolicies \
  --RegistryId <RegistryId> \
  --region ap-guangzhou \
  --output json

# 对每个 PolicyIndex 执行（PolicyVersion 从 DescribeSecurityPolicies 获取）：
tccli tcr DeleteSecurityPolicy \
  --RegistryId <RegistryId> \
  --PolicyIndex <index> \
  --PolicyVersion <PolicyVersion> \
  --region ap-guangzhou \
  --output json

# 2. 确认状态为 Opened 后关闭公网访问入口
tccli tcr DescribeExternalEndpointStatus \
  --RegistryId tcr-nn8smeyj \
  --region ap-guangzhou \
  --output json

# 3. 关闭公网入口
tccli tcr ManageExternalEndpoint \
  --RegistryId tcr-nn8smeyj \
  --Operation Delete \
  --region ap-guangzhou \
  --output json

# 4. 轮询确认关闭完成
tccli tcr DescribeExternalEndpointStatus \
  --RegistryId tcr-nn8smeyj \
  --region ap-guangzhou \
  --output json
# 期望：Status: "Closed"
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ManageExternalEndpoint --Operation Delete` 返回 `Failed to close public network access. The current public network access status is Opening.`（RequestId: `7d5ecc9a-e754-44c0-952d-e3f7174315a0`） | `tccli tcr DescribeExternalEndpointStatus --RegistryId <RegistryId>` 查看当前状态 | 开启操作后立即执行关闭，状态尚在 `Opening` 过渡中，不允许关闭 | 等待状态变为 `Opened` 后再关闭。轮询 `DescribeExternalEndpointStatus` 至 `Status: "Opened"`（通常 5--10 秒） |
| `DescribeSecurityPolicies` 返回 `ResourceNotFound`："Failed to get security group id from registry: tcr-nn8smeyj" | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]'` 查看 `RegistryType` | 实例规格为 **basic**，basic 实例不支持安全策略（白名单）功能，未绑定安全组 | 升级至 standard 或 premium：`tccli tcr ModifyInstance --RegistryId <RegistryId> --RegistryType standard`；或接受 basic 无白名单限制的行为（公网入口开启后无 IP 过滤） |
| `ManageExternalEndpoint` 返回 `FailedOperation` | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]'` 查看 `Status` | 实例状态非 `Running`（如 `Deploying`、`Unhealthy`），或有其他异步操作进行中 | 等待实例状态变为 `Running` 或当前异步操作完成后重试 |
| `CreateSecurityPolicy` 返回 `InvalidParameter` | 检查 `--CidrBlock` 格式 | CIDR 格式不合法（如 `192.168.1.0/abc`）或 `--Description` 为空 | 使用合法 IPv4 地址或 CIDR（如 `192.168.1.0/24`），确保 `--Description` 非空 |
| `CreateSecurityPolicy` 返回 `OperationDenied` | `DescribeExternalEndpointStatus` 查看状态 | 公网入口未开启（状态非 `Opened`）时不允许创建白名单 | 先 `ManageExternalEndpoint --Operation Create` 开启公网入口，轮询至 `Opened` 后再创建 |
| 添加白名单后仍无法访问 | 确认客户端出口 IP | 客户端实际出口 IP 不在白名单 CIDR 范围内；或客户端有多个出口 IP | 查询客户端出口 IP（如 `curl ifconfig.me`），添加到白名单；多出口 IP 需全部添加 |
| `ModifySecurityPolicy` 返回 `InvalidParameter` | `DescribeSecurityPolicies` 确认 `PolicyIndex` | `PolicyIndex` 无效（超出范围 0 ~ N-1），或 `--CidrBlock` / `--Description` 不合法 | 使用 `DescribeSecurityPolicies` 重新获取当前策略列表，确认 `PolicyIndex` 有效 |
| `DeleteSecurityPolicy` 返回 `ResourceNotFound` | `DescribeSecurityPolicies` 确认当前策略 | 策略已被删除，或 `PolicyIndex` 不正确 | 通过 `DescribeSecurityPolicies` 重新确认当前策略列表和 `PolicyVersion` |
| `Delete` 操作后状态长期不变化 | 轮询 `DescribeExternalEndpointStatus` | 异步操作尚在处理中 | 继续轮询（通常数分钟内完成）；若超过 5 分钟无变化，联系[在线支持](https://cloud.tencent.com/online-service?from=doc_1141) |
| 公网入口未开启时 `docker login` 失败 | `DescribeExternalEndpointStatus` 确认状态 | 公网入口为 `Closed` 时，公网域名不可达 | 先 `ManageExternalEndpoint --Operation Create` 开启公网入口 |
| 公网入口已开启但 `docker login` 仍失败（basic 实例） | — | basic 实例无白名单，公网入口开启后即可访问。若仍失败，检查网络连接和域名解析 | 确认 `Status: "Opened"`；`nslookup <RegistryName>.tencentcloudcr.com` 确认域名解析正常 |

### Open 后立即 Close 的典型排障流程

这是最常见的操作失误场景。正确的流程：

```
1. ManageExternalEndpoint --Operation Create  （提交开启请求）
2. DescribeExternalEndpointStatus              （轮询，5-10s/次）
   → Status: "Opening"                         （过渡态，不可关闭）
   → Status: "Opened"                          （终态，可以关闭）
3. ManageExternalEndpoint --Operation Delete   （状态为 Opened 时才能成功）
4. DescribeExternalEndpointStatus              （轮询确认 Closed）
```

错误流程（将被拒绝）：

```
1. ManageExternalEndpoint --Operation Create
2. ManageExternalEndpoint --Operation Delete   ← 立即关闭，返回错误
   Error: "Failed to close public network access.
           The current public network access status is Opening."
   RequestId: 7d5ecc9a-e754-44c0-952d-e3f7174315a0
```

## 下一步

- [配置内网访问控制](../private-access)（page_id `41838`）— 接入私有网络实现内网免密拉取
- [访问网络控制概述](../network-overview)（page_id `41836`）— 返回总览页
- [基于 CAM 管理子账号权限](../../permissions/cam-subaccount) — 配置操作权限
- [创建企业版实例](../../../create)（page_id `51110`）— 升级实例规格以启用安全策略

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 选择目标企业版实例 → **访问控制** > **公网访问** → 点击开启/关闭公网访问入口 → 添加/修改/删除公网白名单。
