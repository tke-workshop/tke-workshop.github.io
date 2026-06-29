---
title: "配置内网访问控制"
description: "· page_id `41838`"
---

> 对照官方：[配置内网访问控制](https://cloud.tencent.com/document/product/1141/41838) · page_id `41838`

## 概述

腾讯云容器镜像服务（TCR）企业版支持内网访问控制，通过将私有网络（VPC）接入至企业版实例，实现 VPC 内客户端通过内网链路访问实例。内网访问能够提升镜像拉取速度、避免公网带宽成本，并基于私有网络边界实现访问隔离。

一个 TCR 企业版实例可绑定**多个**私有网络。完成内网访问链路接入后，需配置内网域名解析（私有域解析 PrivateDNS 自动配置，或自建 DNS / 手动 hosts），使 VPC 内云服务器可通过实例域名解析到内网 IP。

**跨产品依赖**：本页操作依赖 [私有网络 VPC](https://cloud.tencent.com/document/product/215) 和 [私有域解析 PrivateDNS](https://cloud.tencent.com/document/product/1338)。需先在实例所在地域创建 VPC 和子网，再执行本页命令。

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0

# 2. 检查 CAM 权限（TCR 读写）
tccli tcr DescribeInstances --region ap-guangzhou
# expected: exit 0，返回实例列表（可为空）

# 3. 检查 CAM 权限（VPC 读写）
tccli vpc DescribeVpcs --region ap-guangzhou
# expected: exit 0，返回 VPC 列表（可为空）
```

### 资源检查

```bash
# 4. 确认 TCR 实例存在且状态正常
tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>
# expected: exit 0, Status: "Running", RegistryType: "standard" 或以上

# 5. 确认 VPC 存在（目标实例所在地域）
tccli vpc DescribeVpcs --VpcIds '["<VpcId>"]' --region <Region>
# expected: exit 0，VpcSet 中包含目标 VPC

# 6. 确认子网存在且可用 IP 数量 >= 1
tccli vpc DescribeSubnets --SubnetIds '["<SubnetId>"]' --region <Region>
# expected: exit 0, AvailableIpAddressCount >= 1
```

## 控制台与 CLI 参数映射

### 操作索引

| 控制台操作 | CLI | 幂等 |
|-----------|-----|:--:|
| 新建内网访问链路（接入私有网络） | `tccli tcr ManageInternalEndpoint --Operation Create` | 否（同一 VPC 重复创建报错） |
| 查看内网访问链路列表 | `tccli tcr DescribeInternalEndpoints` | 是 |
| 开启自动内网解析 | `tccli tcr CreateInternalEndpointDns` | 否（同一 VPC+EniLBIp 组合重复创建报错） |
| 查看内网解析状态 | `tccli tcr DescribeInternalEndpointDnsStatus` | 是 |
| 关闭自动内网解析 | `tccli tcr DeleteInternalEndpointDns` | 是 |
| 删除内网访问链路 | `tccli tcr ManageInternalEndpoint --Operation Delete` | 否 |

### 关键字段说明（`ManageInternalEndpoint`）

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|------|-----------|---------|
| RegistryId | String | 是 | 目标实例 ID，由 `DescribeInstances` 返回 | 实例不存在返回 `FailedOperation` |
| Operation | String | 是 | `Create`（新建）/ `Delete`（删除） | 无效值返回 `InvalidParameter` |
| VpcId | String | 是 | 私有网络 ID，**须与实例同地域**，须提前通过 `tccli vpc CreateVpc` 创建 | VPC 不存在或跨地域返回 `FailedOperation` |
| SubnetId | String | 是 | 子网 ID，**须属于目标 VPC**，须提前通过 `tccli vpc CreateSubnet` 创建，`AvailableIpAddressCount` >= 1 | 子网不存在或 IP 枯竭返回 `FailedOperation` |

### 关键字段说明（`CreateInternalEndpointDns`）

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|------|-----------|---------|
| InstanceId | String | 是 | TCR 实例 ID，**注意参数名为 `--InstanceId` 而非常见的 `--RegistryId`** | 使用 `--RegistryId` 返回 `MissingParameter` |
| VpcId | String | 是 | 已接入实例的 VPC ID | VPC 与已有内网链路不匹配返回 `FailedOperation` |
| EniLBIp | String | 是 | 内网解析 IP（即 `DescribeInternalEndpoints` 返回的 `AccessIp`），**须在目标子网 CIDR 范围内** | IP 不在子网 CIDR 内返回 `FailedOperation` |

> **陷阱汇总：**
>
> | # | 陷阱 | 说明 |
> |---|------|------|
> | 1 | VPC 和 Subnet 是前提 | `ManageInternalEndpoint` 要求 VPC 和子网已存在。需先通过 `tccli vpc CreateVpc` 和 `tccli vpc CreateSubnet` 创建后再执行本页命令 |
> | 2 | EniLBIp 须在 Subnet CIDR 内 | `CreateInternalEndpointDns` 的 `--EniLBIp` 必须是子网 CIDR 内的合法 IP，通常使用 `DescribeInternalEndpoints` 返回的 `AccessIp` |
> | 3 | `--InstanceId` 非 `--RegistryId` | `CreateInternalEndpointDns` 和 `DeleteInternalEndpointDns` 的参数名为 `--InstanceId`，与其他 TCR API 的 `--RegistryId` 不同。传错参数名会触发 `MissingParameter` 错误 |

## 操作步骤

### 1. 新建内网访问链路

将 VPC 接入 TCR 实例，在指定子网内分配一个内网 IP（`AccessIp`）。

一个实例可绑定多个 VPC。如需接入多个 VPC，重复执行本命令，每次指定不同的 `--VpcId` / `--SubnetId` 组合。

#### 选择依据

- **VpcId**：选择实例所在地域的 VPC。实例与 VPC 跨地域将导致 `FailedOperation`。
- **SubnetId**：选择目标 VPC 下有可用 IP 的子网（`AvailableIpAddressCount` >= 1）。

#### 执行创建

```bash
tccli tcr ManageInternalEndpoint \
    --RegistryId <RegistryId> \
    --Operation Create \
    --VpcId <VpcId> \
    --SubnetId <SubnetId> \
    --region <Region>
```

参考输出：

```json
{
    "RequestId": "b063c21b-0000-0000-0000-000000000000"
}
```

#### 轮询确认链路就绪

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId <RegistryId> \
    --region <Region>
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 链路状态 | `AccessVpcSet[].Status` | `Running` |
| 内网 IP | `AccessVpcSet[].AccessIp` | 非空，子网 CIDR 内 IP |

参考输出：

```json
{
    "AccessVpcSet": [
        {
            "VpcId": "<VpcId>",
            "SubnetId": "<SubnetId>",
            "Status": "Running",
            "AccessIp": "10.0.0.5"
        }
    ],
    "TotalCount": 1,
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

> **注意**：新建操作是**异步**的，通常 1-2 分钟完成。轮询到 `Status: "Running"` 且 `AccessIp` 不为空后即可进行后续 DNS 配置。

### 2. 配置内网域名解析

内网访问链路就绪后，需配置内网域名解析。推荐使用私有域解析 PrivateDNS 自动配置。以下为 CLI 完整操作流程。

#### 2.1 创建内网 DNS 解析

##### 选择依据

- **InstanceId**：即 TCR 实例 ID（`RegistryId`），注意参数名是 `--InstanceId` 而非 `--RegistryId`（陷阱 #3）。
- **EniLBIp**：使用 `DescribeInternalEndpoints` 返回的 `AccessIp`。该 IP 须在目标子网 CIDR 范围内（陷阱 #2），否则返回 `FailedOperation`。
- **UsePublicDomain**：`true` 解析默认公网域名，`false` 解析 VPC 专用域名（`<实例名>-vpc.tencentcloudcr.com`）。推荐 `true`，与现有 docker login / pull 命令兼容。

##### 执行创建

```bash
tccli tcr CreateInternalEndpointDns \
    --InstanceId <RegistryId> \
    --VpcId <VpcId> \
    --EniLBIp <AccessIp> \
    --UsePublicDomain true \
    --region <Region>
```

参考输出：

```json
{
    "RequestId": "72d88a72-0000-0000-0000-000000000000"
}
```

#### 2.2 查询内网 DNS 解析状态

```bash
tccli tcr DescribeInternalEndpointDnsStatus \
    --InstanceId <RegistryId> \
    --region <Region>
```

参考输出：

```json
{
    "VpcSet": [
        {
            "VpcId": "<VpcId>",
            "EniLBIp": "<AccessIp>",
            "Status": "ENABLED"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 解析状态 | `VpcSet[].Status` | `ENABLED` |

`Status: "ENABLED"` 表示内网 DNS 解析已生效。DNS 解析完全生效通常有 1-2 分钟传播延迟。

#### 2.3 删除内网 DNS 解析（清理用）

```bash
tccli tcr DeleteInternalEndpointDns \
    --InstanceId <RegistryId> \
    --VpcId <VpcId> \
    --EniLBIp <AccessIp> \
    --region <Region>
```

参数名注意：此处同样是 `--InstanceId` 而非 `--RegistryId`（陷阱 #3）。

### 3. 删除内网访问链路

删除链路前，建议先执行 `DeleteInternalEndpointDns` 关闭对应 DNS 解析。

```bash
tccli tcr ManageInternalEndpoint \
    --RegistryId <RegistryId> \
    --Operation Delete \
    --VpcId <VpcId> \
    --SubnetId <SubnetId> \
    --region <Region>
```

参考输出：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

### 4. 备选方案（不推荐）

本节提供两种不需要 PrivateDNS 的备选方案，适用于 PrivateDNS 服务不可用的场景。

#### 4.1 TCR 插件自动配置（TKE 集群）

在 TKE 集群中安装 TCR 插件，勾选"启用内网解析功能"，插件自动为集群内节点配置内网解析。参见 [TCR 说明](https://cloud.tencent.com/document/product/457/49225)。

#### 4.2 手动配置云服务器 hosts

以 Linux 云服务器为例，登录后执行：

```bash
echo '<AccessIp> <RegistryName>.tencentcloudcr.com' >> /etc/hosts
```

## 验证

### Control plane（tccli）

```bash
# 1. 确认内网链路状态为 Running，AccessIp 不为空
tccli tcr DescribeInternalEndpoints \
    --RegistryId <RegistryId> \
    --region <Region>

# 2. 确认 DNS 解析状态为 ENABLED
tccli tcr DescribeInternalEndpointDnsStatus \
    --InstanceId <RegistryId> \
    --region <Region>
```

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 链路状态 | `AccessVpcSet[].Status` | `Running` |
| 内网 IP | `AccessVpcSet[].AccessIp` | 非空 |
| DNS 解析 | `VpcSet[].Status` | `ENABLED` |

### Data plane（VPC 内测试，可选）

在已接入 VPC 内的云服务器上执行：

```bash
# 测试内网连通性
curl -k https://<AccessIp>/v2/

# 测试域名解析
nslookup <RegistryName>.tencentcloudcr.com
```

## 清理

> **清理顺序**：先关闭 DNS 解析，再删除内网访问链路。若先删链路再关 DNS，`DeleteInternalEndpointDns` 的 `--EniLBIp` 将找不到对应 IP。

```bash
# 1. 关闭自动内网解析
tccli tcr DeleteInternalEndpointDns \
    --InstanceId <RegistryId> \
    --VpcId <VpcId> \
    --EniLBIp <AccessIp> \
    --region <Region>

# 2. 删除内网访问链路
tccli tcr ManageInternalEndpoint \
    --RegistryId <RegistryId> \
    --Operation Delete \
    --VpcId <VpcId> \
    --SubnetId <SubnetId> \
    --region <Region>

# 3. 确认链路已清理
tccli tcr DescribeInternalEndpoints \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: AccessVpcSet 为 null 或 TotalCount 为 0
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ManageInternalEndpoint Create` 返回 `FailedOperation` | `tccli vpc DescribeVpcs --VpcIds '["<VpcId>"]' --region <Region>` 确认 VPC 存在；`tccli vpc DescribeSubnets --SubnetIds '["<SubnetId>"]' --region <Region>` 确认子网有可用 IP | VPC/子网不存在、跨地域、或子网 IP 已耗尽。**这是陷阱 #1**：VPC 和 Subnet 需提前创建 | 确认 VPC/Subnet 与实例同地域；确认子网 `AvailableIpAddressCount` >= 1；必要时 `tccli vpc CreateVpc` 和 `tccli vpc CreateSubnet` |
| `CreateInternalEndpointDns` 返回 `MissingParameter` | 检查命令参数名 | 参数名为 `--InstanceId` 而非 `--RegistryId`。**这是陷阱 #3** | 将 `--RegistryId` 改为 `--InstanceId` |
| `CreateInternalEndpointDns` 返回 `FailedOperation` | 验证 `--EniLBIp` 是否在子网 CIDR 内：`tccli vpc DescribeSubnets --SubnetIds '["<SubnetId>"]' --region <Region>` 查看 `CidrBlock` | `--EniLBIp` 不在子网 CIDR 范围内。**这是陷阱 #2** | 使用 `DescribeInternalEndpoints` 返回的 `AccessIp` 作为 `--EniLBIp` |
| `DescribeInternalEndpointDnsStatus` 返回 `Status: "DISABLED"` | — | DNS 解析未开启，或之前已被 `DeleteInternalEndpointDns` 关闭 | 执行 `CreateInternalEndpointDns` 开启解析 |
| `DescribeInternalEndpoints` 返回 `AccessVpcSet: null, TotalCount: 0` | — | 实例尚未绑定任何 VPC，正常初始状态 | 执行 `ManageInternalEndpoint --Operation Create` 新建内网链路 |
| `ManageInternalEndpoint` 返回 `LimitExceeded` | `tccli vpc DescribeVpcs --region <Region>` 统计现有 VPC 数量 | VPC 数量达账号配额上限。**此为环境限制，非命令错误** | 复用已有 VPC；或删除不再使用的 VPC 释放配额；或联系腾讯云提升配额 |
| DNS 已启用（`Status: "ENABLED"`）但 VPC 内仍无法解析 | `nslookup <RegistryName>.tencentcloudcr.com` 在 VPC 内测试 | DNS 传播延迟（通常 1-2 分钟），或 PrivateDNS 未创建对应 A 记录 | 等待 2 分钟后重试；若持续失败，检查 PrivateDNS 控制台 A 记录 |
| 手动 `echo` 到 `/etc/hosts` 后仍不连通 | `curl -k https://<AccessIp>/v2/` 测试内网连通性 | VPC 安全组未放通 443/tcp | `tccli vpc CreateSecurityGroupPolicies` 添加入站规则放通目标端口 |

## 下一步

- [配置公网访问控制](../public-access) — 公网访问白名单管理
- [配置自定义域名](../../domain/custom-domain) — 自定义域名与内网链路的结合使用
- [TKE 集群使用 TCR 插件内网免密拉取容器镜像](https://cloud.tencent.com/document/product/1141/48184)
- [配置实例复制](../../../image-distribution/cross-region-replication) — 跨地域接入私有网络

## 控制台替代

登录 [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) → 选择目标实例 → **访问控制** > **内网访问** → 单击**接入私有网络** → 选择目标 VPC 和子网 → 等待链路状态变为**链路正常** → 单击**管理自动解析** → 开启域名解析。
