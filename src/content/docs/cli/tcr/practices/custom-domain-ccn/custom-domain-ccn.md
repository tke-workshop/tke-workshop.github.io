---
title: "使用自定义域名及云联网实现跨地域内网访问"
description: "· page_id `76084`"
---

> 对照官方：[使用自定义域名及云联网实现跨地域内网访问](https://cloud.tencent.com/document/product/1141/76084) · page_id `76084`

## 概述

在多地域、多 VPC 场景中，需要不同地域的私有网络同时接入同一 TCR 企业版实例，实现跨地域内网推送、拉取容器镜像。本文介绍如何使用自定义域名，配合云联网（CCN）和 Private DNS，将多个 VPC 跨地域接入 TCR 实例并通过内网分发容器镜像。

**方案对比：**

| 方案 | 适用场景 | 网络路径 | 解析方式 | 复杂度 |
|------|---------|---------|---------|:--:|
| 公网域名 + CCN | 测试/开发、少量跨地域 VPC | 跨地域 VPC → CCN → TCR 所在地域 VPC → 内网端点 | 自动解析（VPC 内网端点 DNS） | 低 |
| 自定义域名 + CCN | 生产环境、多团队共享、需要自定义品牌域名 | 同上 | Private DNS A 记录指向内网 IP | 中 |

**架构链路：**

```
  广州 VPC（已接入 TCR 内网端点）
         │
         ├── CCN ── 上海 VPC（通过 CCN 打通）
         │
         └── Private DNS（自定义域名 → 内网 IP）
                 │
                 └── docker login <自定义域名>
```

涉及产品：

| 产品 | 作用 | CLI 模块 |
|------|------|----------|
| TCR | 容器镜像存储，内网端点接入 + 自定义域名绑定 | `tccli tcr` |
| VPC / CCN | 跨地域 VPC 网络互通 | `tccli vpc` |
| SSL 证书 | 自定义域名 HTTPS 证书（上传或签发） | `tccli ssl` |
| Private DNS | VPC 内自定义域名解析 | `tccli privatedns` |

**自定义域名前置要求：**

| 要求 | 说明 |
|------|------|
| ICP 备案 | 境内实例绑定的域名需完成 ICP 备案，境外实例无需备案 |
| SSL 证书 | 需通过 SSL 证书服务签发或上传，证书须绑定自定义域名 |
| 内网端点 DNS 已生效 | `DescribeInternalEndpointDnsStatus` 返回 `Status: "ENABLED"` 后方可绑定自定义域名 |

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId、secretKey、region 均已配置

# 3. 检查 CAM 权限 — 须具备以下 Action 名
#    tcr:DescribeInstances
#    tcr:ManageInternalEndpoint
#    tcr:DescribeInternalEndpoints
#    tcr:CreateInternalEndpointDns
#    tcr:DescribeInternalEndpointDnsStatus
#    tcr:DescribeInstanceCustomizedDomain
#    tcr:CreateInstanceCustomizedDomain
#    tcr:CreateInstanceToken
#    vpc:DescribeVpcs
#    vpc:DescribeSubnets
#    vpc:DescribeCcns
#    vpc:CreateCcn
#    vpc:AttachCcnInstances
#    ssl:DescribeCertificates
#    ssl:UploadCertificate
# 验证：执行 DescribeInstances 确认 TCR 权限
tccli tcr DescribeInstances --region <Region>
# expected: exit 0，返回实例列表（可为空）

# 验证 VPC 权限
tccli vpc DescribeVpcs --region <Region>
# expected: exit 0，返回 VPC 列表（可为空）

# 验证 SSL 证书权限
tccli ssl DescribeCertificates --region <Region>
# expected: exit 0，返回证书列表（可为空）
```

### 资源检查

```bash
# 4. 确认 TCR 实例存在且状态正常
tccli tcr DescribeInstances --region <Region> --Registryids '["<RegistryId>"]'
# expected: exit 0, TotalCount >= 1, Registries[0].Status: "Running", Registries[0].RegistryType: "premium"

# 5. 确认目标 VPC 和子网存在
tccli vpc DescribeVpcs --region <Region> --VpcIds '["<VpcId>"]'
# expected: exit 0, TotalCount >= 1

tccli vpc DescribeSubnets --region <Region> --SubnetIds '["<SubnetId>"]'
# expected: exit 0, TotalCount >= 1

# 6. 确认自定义域名已注册（境内须已 ICP 备案）
nslookup <DomainName>
# expected: 域名已注册并可解析

# 7. 确认 SSL 证书可用（已有则跳过步骤 3 上传环节）
tccli ssl DescribeCertificates --region <Region> --CertId <CertId>
# expected: exit 0，证书状态为已签发
```

## 控制台与 CLI 参数映射

### 操作索引

| 控制台操作 | tccli 命令 | 模块 | 幂等 |
|-----------|-----------|------|:--:|
| 查看 TCR 实例 | `DescribeInstances` | tcr | 是 |
| 接入 VPC 内网 | `ManageInternalEndpoint` | tcr | 否 |
| 查看内网接入列表 | `DescribeInternalEndpoints` | tcr | 是 |
| 配置内网端点 DNS | `CreateInternalEndpointDns` | tcr | 否 |
| 查看内网端点 DNS 状态 | `DescribeInternalEndpointDnsStatus` | tcr | 是 |
| 查看自定义域名 | `DescribeInstanceCustomizedDomain` | tcr | 是 |
| 添加自定义域名 | `CreateInstanceCustomizedDomain` | tcr | 否 |
| 删除自定义域名 | `DeleteInstanceCustomizedDomain` | tcr | 是 |
| 上传 SSL 证书 | `UploadCertificate` | ssl | 否 |
| 查看 SSL 证书 | `DescribeCertificates` | ssl | 是 |
| 创建云联网 | `CreateCcn` | vpc | 否 |
| 关联 VPC 至云联网 | `AttachCcnInstances` | vpc | 否 |
| 查看云联网关联 | `DescribeCcnAttachedInstances` | vpc | 是 |
| 创建私有域 | `CreatePrivateZone` | privatedns | 否 |
| 创建 DNS 记录 | `CreatePrivateZoneRecord` | privatedns | 否 |

### 关键字段说明（TCR）

以下说明 TCR 内网接入与自定义域名相关的主要参数。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | TCR 企业版实例 ID，格式 `tcr-xxxxxxxx`。从前置条件 `DescribeInstances` 获取 | `ResourceNotFound` |
| `Operation` | String | 是 | `Create`（接入）或 `Delete`（移除），区分大小写 | `InvalidParameter` |
| `VpcId` | String | 是 | 私有网络 VPC ID，格式 `vpc-xxxxxxxx`，须与 TCR 实例同地域 | `FailedOperation` |
| `SubnetId` | String | 是 | 子网 ID，格式 `subnet-xxxxxxxx`，须属于指定 VPC | `FailedOperation` |
| `DomainName` | String | 是 | 自定义域名，如 `test.example.com`。境内实例须已完成 ICP 备案 | `InvalidParameter` |
| `CertificateId` | String | 是 | SSL 证书 ID。购买证书格式 `cert-xxxxx`，上传证书为随机字符串 | `InvalidParameter` |
| `EniLbIp` | String | 是 | 内网端点 ENI 负载均衡 IP，来自 `DescribeInternalEndpoints` 返回的 `EniLbIp`，不是 `AccessIp` | `InvalidParameter` |
| `UsePublicDomain` | Boolean | 是 | 是否使用公网域名。设为 `true` 则 VPC 内可直接使用实例公网域名解析到内网 IP | `false` 时需自行管理 DNS |
| `InstanceId` | String | 是 | `CreateInternalEndpointDns` 中的实例 ID，等同于 `RegistryId` | `ResourceNotFound` |

### 关键字段说明（跨产品）

| 字段 | 类型 | 必填 | 模块 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|------|
| `CertificatePublicKey` | String | 是 | ssl | PEM 格式证书公钥，从证书文件读取 `$(cat cert.pem)` | `InvalidParameter` |
| `CertificatePrivateKey` | String | 是 | ssl | PEM 格式证书私钥，从密钥文件读取 `$(cat key.pem)` | `InvalidParameter` |
| `CertificateType` | String | 是 | ssl | 固定 `SVR`（服务器证书），TCR 自定义域名只接受服务器证书 | `InvalidParameter` |
| `CcnName` | String | 是 | vpc | 云联网名称，2-25 字符 | `InvalidParameterValue` |
| `QosLevel` | String | 是 | vpc | `AU`（金，推荐）/ `PT`（铂金，高带宽）/ `AG`（银，低带宽） | `InvalidParameterValue` |
| `Instances` | JSON | 是 | vpc | `[{"InstanceType":"VPC","InstanceId":"<VpcId>","InstanceRegion":"<Region>"}]` | `InvalidParameterValue` |
| `RecordType` | String | 是 | privatedns | `A`（直接解析到 IP）或 `CNAME`（指向域名） | `InvalidParameter` |
| `SubDomain` | String | 是 | privatedns | `"@"` 表示主域名本身，`"sub"` 表示子域名 | `InvalidParameter` |
| `RecordValue` | String | 是 | privatedns | A 记录填 `DescribeInternalEndpoints` 返回的 `AccessIp`；CNAME 填实例默认域名 | 解析指向错误 IP 导致连接失败 |

## 操作步骤

### 步骤 1：确认 TCR 实例状态

```bash
tccli tcr DescribeInstances \
    --Registryids '["<RegistryId>"]' \
    --region <Region>
# expected: exit 0, TotalCount >= 1, Registries[0].Status: "Running"
```

预期输出：

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-example",
            "RegistryName": "example-registry",
            "RegistryType": "premium",
            "Status": "Running",
            "PublicDomain": "example-registry.tencentcloudcr.com",
            "RegionName": "ap-guangzhou",
            "InternalEndpoint": ""
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

确认 `Status` 为 `Running`，记录 `RegistryId` 和 `PublicDomain`。

### 步骤 2：配置内网访问（接入 VPC）

为 TCR 实例接入 VPC，使该 VPC 内客户端可通过内网访问实例。

#### 选择依据

- **Operation**：选择 `Create` 接入新 VPC。若该 VPC 已接入，需先 `Delete` 移除旧链路再 `Create`。
- **VpcId**：选择 TCR 实例同地域的 VPC。跨地域 VPC 需通过云联网打通后方可访问。
- **SubnetId**：选择 IP 充裕的子网，TCR 内网接入需占用子网内 IP。
- **实例类型**：高级版（premium）及以上支持内网接入，标准版不支持。

#### 执行接入

```bash
tccli tcr ManageInternalEndpoint \
    --RegistryId <RegistryId> \
    --Operation Create \
    --VpcId <VpcId> \
    --SubnetId <SubnetId> \
    --region <Region>
# expected: exit 0, 返回 RegimentId
```

预期输出：

```json
{
    "RegistryId": "tcr-example",
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

#### 轮询确认 VPC 接入生效

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: exit 0, AccessVpcSet 包含已接入 VPC
```

预期输出：

```json
{
    "AccessVpcSet": [
        {
            "VpcId": "vpc-example",
            "SubnetId": "subnet-example",
            "Status": "Running",
            "AccessIp": "10.0.0.10",
            "EniLbIp": "10.0.0.11"
        }
    ],
    "TotalCount": 1,
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

验证维度：

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 状态 | `AccessVpcSet[].Status` | `Running` |
| VPC | `AccessVpcSet[].VpcId` | 与 `--VpcId` 一致 |
| 内网 IP | `AccessVpcSet[].AccessIp` | 非空，为内网地址 |
| ENI LB IP | `AccessVpcSet[].EniLbIp` | 非空 |

记录 `AccessIp` 和 `EniLbIp`，后续步骤使用。

> 若 VPC 已接入 TCR 实例，再次执行 `Create` 返回 `InternalError.ErrorConflict`（`Vpc already attach to registry`），需先 `Delete` 再 `Create`。

### 步骤 3：配置内网端点 DNS

VPC 接入后，需为新创建的内网端点配置 DNS 解析，使 VPC 内客户端可将实例域名解析到内网 IP。

#### 选择依据

- **UsePublicDomain**：设为 `true`，VPC 内客户端可直接使用实例公网域名（如 `example-registry.tencentcloudcr.com`）解析到内网 IP，无需额外配置 Private DNS。若后续要使用自定义域名（步骤 5），此项也需预先设为 `true`。
- **EniLbIp**：必须使用 `DescribeInternalEndpoints` 返回的 `EniLbIp`，不是 `AccessIp`。填错会导致 DNS 状态异常。

#### 执行配置

```bash
tccli tcr CreateInternalEndpointDns \
    --InstanceId <RegistryId> \
    --VpcId <VpcId> \
    --EniLbIp <EniLbIp> \
    --UsePublicDomain true \
    --region <Region>
# expected: exit 0
```

预期输出：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

#### 轮询确认 DNS 生效

```bash
tccli tcr DescribeInternalEndpointDnsStatus \
    --VpcSet '[{"InstanceId":"<RegistryId>","VpcId":"<VpcId>","EniLbIp":"<EniLbIp>","UsePublicDomain":true}]' \
    --region <Region>
# expected: exit 0, VpcSet[0].Status: "ENABLED"
```

预期输出：

```json
{
    "VpcSet": [
        {
            "Status": "ENABLED"
        }
    ],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

`Status: "ENABLED"` 表示内网端点 DNS 已生效，VPC 内可通过实例域名内网访问 TCR 实例。后续绑定自定义域名（步骤 5）也需此 DNS 生效。

### 步骤 4：上传 SSL 证书

自定义域名需绑定 SSL 证书。如无可用的已签发证书，可通过 `openssl` 生成自签名证书并上传。

#### 选择依据

- **CertificateType**：固定选 `SVR`（服务器证书），TCR 自定义域名只接受服务器证书类型。
- **自签名 vs 正式证书**：开发/测试环境用 `openssl` 生成自签名证书即可；生产环境须使用 CA 签发的正式证书。自签名证书会使 Docker 客户端提示 `x509: certificate signed by unknown authority`，需在各客户端添加 CA 信任。
- **Repeatable**：设为 `false` 表示不允许重复上传相同证书，防止意外创建重复证书。

#### 4a. 生成自签名证书（开发/测试）

一条 `openssl req` 命令生成 X.509 自签名证书和私钥，有效期 365 天：

```bash
openssl req -x509 -newkey rsa:2048 \
    -keyout tcr-self-signed.key \
    -out tcr-self-signed.crt \
    -days 365 \
    -nodes \
    -subj "/CN=<DomainName>"
# expected: exit 0，生成 tcr-self-signed.key 和 tcr-self-signed.crt
```

| 参数 | 说明 |
|------|------|
| `-x509` | 输出自签名 X.509 证书（非 CSR 请求） |
| `-newkey rsa:2048` | 同时生成 2048 位 RSA 私钥 |
| `-keyout` | 私钥输出文件路径 |
| `-out` | 证书输出文件路径 |
| `-days 365` | 证书有效期 365 天 |
| `-nodes` | 私钥不加密码保护（No DES），便于自动化 |
| `-subj "/CN=<DomainName>"` | 证书主题，CN 必须与自定义域名一致 |

#### 4b. 上传证书至 SSL 证书服务

##### 最小配置（仅含必填字段）

```bash
tccli ssl UploadCertificate \
    --CertificatePublicKey "$(cat tcr-self-signed.crt)" \
    --CertificatePrivateKey "$(cat tcr-self-signed.key)" \
    --CertificateType SVR \
    --Repeatable false \
    --region <Region>
# expected: exit 0, 返回 CertificateId
```

##### 增强配置（含别名便于识别）

```bash
tccli ssl UploadCertificate \
    --CertificatePublicKey "$(cat tcr-self-signed.crt)" \
    --CertificatePrivateKey "$(cat tcr-self-signed.key)" \
    --CertificateType SVR \
    --Alias "<证书别名>" \
    --Repeatable false \
    --region <Region>
# expected: exit 0, 返回 CertificateId
```

预期输出：

```json
{
    "CertificateId": "cert-example",
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

| 占位符 | 说明 | 约束 | 获取方式 |
|--------|------|------|---------|
| `<证书别名>` | 证书显示名称 | 64 字符以内 | 自定义，建议含业务标识和域名 |

记录返回的 `CertificateId`，后续步骤 5 使用。

### 步骤 5：配置自定义域名

#### 5.1 查看当前自定义域名列表

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: exit 0
```

预期输出（首次查询可能为空）：

```json
{
    "DomainInfoList": [],
    "TotalCount": 0,
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

#### 5.2 添加自定义域名

##### 选择依据

- **DomainName**：使用已完成 ICP 备案的域名（境内实例）或境外域名（境外实例）。域名须与 SSL 证书 CN（Common Name）一致。
- **CertificateId**：使用步骤 4 上传证书返回的 `CertificateId`。购买证书（格式 `cert-xxxxx`）或上传证书均可，确保证书状态为已签发且绑定了目标域名。

##### 执行添加

```bash
tccli tcr CreateInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --DomainName <DomainName> \
    --CertificateId <CertId> \
    --region <Region>
# expected: exit 0
```

预期输出：

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

#### 5.3 轮询确认域名生效

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: exit 0, DomainInfoList 包含目标域名, Status: "SUCCESS"
```

预期输出：

```json
{
    "DomainInfoList": [
        {
            "RegistryId": "tcr-example",
            "DomainName": "test.example.com",
            "CertId": "cert-example",
            "Status": "SUCCESS"
        }
    ],
    "TotalCount": 1,
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

验证维度：

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 状态 | `DomainInfoList[].Status` | `SUCCESS` |
| 域名 | `DomainInfoList[].DomainName` | 与 `--DomainName` 一致 |
| 证书绑定 | `DomainInfoList[].CertId` | 非空，与 `--CertificateId` 一致 |
| 数量 | `TotalCount` | 包含所有已绑定的自定义域名 |

`Status: "SUCCESS"` 表示自定义域名已生效。若状态为 `CREATING`，等待 1-2 分钟后重新查询。

### 步骤 6：通过云联网关联多地域 VPC

云联网（CCN）用于打通广州与上海等多个地域的 VPC，使不同地域的容器集群能通过内网跨地域互访。

#### 6.1 创建云联网实例

##### 选择依据

- **QosLevel**：推荐 `AU`（金），带宽保障和价格均衡。`PT`（铂金）适用高带宽生产场景，`AG`（银）适用低带宽测试场景。
- **CcnName**：建议遵循"用途-场景"命名，便于在多个云联网中识别。

##### 执行创建

```bash
tccli vpc CreateCcn \
    --CcnName "tcr-cross-region" \
    --CcnDescription "TCR 跨地域内网访问" \
    --QosLevel AU \
    --region <Region>
# expected: exit 0, 返回 CcnId
```

预期输出：

```json
{
    "Ccn": {
        "CcnId": "ccn-example",
        "CcnName": "tcr-cross-region",
        "CcnDescription": "TCR 跨地域内网访问",
        "State": "AVAILABLE",
        "QosLevel": "AU"
    },
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

记录返回的 `CcnId`。

#### 6.2 将多地域 VPC 关联至云联网

##### 选择依据

- **Instances**：每项含 `InstanceType`（此处为 `VPC`）、`InstanceId`、`InstanceRegion`。一次可关联多个实例。
- 关联顺序：先关联 TCR 实例所在地域（广州）的 VPC，再关联其他地域（上海）的 VPC。

##### 执行关联

```bash
# 关联 TCR 实例所在 VPC
tccli vpc AttachCcnInstances \
    --CcnId <CcnId> \
    --Instances '[{"InstanceType":"VPC","InstanceId":"<VpcId>","InstanceRegion":"<Region>"}]' \
    --region <Region>
# expected: exit 0

# 关联上海 VPC（通过 CCN 跨地域接入）
tccli vpc AttachCcnInstances \
    --CcnId <CcnId> \
    --Instances '[{"InstanceType":"VPC","InstanceId":"<VpcId-sh>","InstanceRegion":"ap-shanghai"}]' \
    --region <Region>
# expected: exit 0
```

> 关联后 CCN 路由默认自动学习，所有关联 VPC 间将自动互通。若需限速或自定义路由策略，前往 [云联网控制台](https://console.cloud.tencent.com/vpc/ccn) 配置。

#### 6.3 验证云联网关联状态

```bash
tccli vpc DescribeCcnAttachedInstances \
    --CcnId <CcnId> \
    --region <Region>
# expected: exit 0, InstanceSet 包含所有已关联 VPC, State: "AVAILABLE"
```

验证维度：

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 关联数量 | `InstanceSet` 长度 | ≥ 2（含 TCR 侧 VPC 和对端 VPC） |
| 实例状态 | `InstanceSet[].State` | `AVAILABLE` |
| 实例地域 | `InstanceSet[].InstanceRegion` | 包含广州、上海等目标地域 |

### 步骤 7：配置 Private DNS 私有域解析

业务 VPC 内需要将自定义域名解析到 TCR 实例的内网 IP（`AccessIp`），Docker 客户端才能通过自定义域名内网拉取/推送镜像。

#### 7.1 创建私有域

##### 选择依据

- **Domain**：填写步骤 5 中配置的自定义域名。Private DNS 私有域仅对关联的 VPC 生效，不影响公网解析。

```bash
tccli privatedns CreatePrivateZone \
    --Domain <DomainName> \
    --region <Region>
# expected: exit 0, 返回 ZoneId
```

预期输出：

```json
{
    "ZoneId": "zone-example",
    "Domain": "test.example.com",
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

记录返回的 `ZoneId`。

#### 7.2 将私有域关联至所有业务 VPC

前往 [Private DNS 控制台](https://console.cloud.tencent.com/privatedns)，选择刚创建的私有域，将广州、上海等所有业务 VPC 关联至该私有域。

> 此操作为控制台操作。私有域 VPC 关联也可以通过 `tccli privatedns ModifyPrivateZoneVpc` 完成，但需要完整 VPC 绑定参数集，建议直接在控制台操作。

#### 7.3 创建解析记录（A 记录）

##### 选择依据

- **RecordType**：选择 `A` 直接解析到内网 IP，路径最短。选择 `CNAME` 指向实例默认域名可减少 IP 变更维护成本，但多一次 DNS 解析。
- **SubDomain**：`"@"` 表示解析主域名本身。若需解析子域名（如 `registry.example.com`），填写 `registry`。
- **RecordValue**：必须使用 `DescribeInternalEndpoints` 返回的 `AccessIp`（步骤 2），不是 `EniLbIp`。

##### 最小配置

`create-record-minimal.json`：

```json
{
    "ZoneId": "<ZoneId>",
    "RecordType": "A",
    "SubDomain": "@",
    "RecordValue": "<AccessIp>"
}
```

##### 增强配置

`create-record-enhanced.json`：

```json
{
    "ZoneId": "<ZoneId>",
    "RecordType": "A",
    "SubDomain": "@",
    "RecordValue": "<AccessIp>",
    "TTL": 600,
    "Weight": 10
}
```

##### 执行创建

```bash
tccli privatedns CreatePrivateZoneRecord \
    --cli-input-json file://create-record-minimal.json \
    --region <Region>
# expected: exit 0, 返回 RecordId
```

> **CNAME 替代方案**：也可创建 CNAME 记录，`RecordValue` 填写实例默认域名（步骤 1 中的 `PublicDomain`）。使用 CNAME 需确保目标 VPC 已开通内网端点 DNS（步骤 3 的 `Status: "ENABLED"`），否则 CNAME 解析目标 IP 不可达。

## 验证

### 控制面（tccli）

```bash
# 1. 验证内网访问链路
tccli tcr DescribeInternalEndpoints \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: exit 0, AccessVpcSet 含目标 VPC, Status: "Running", AccessIp 与 EniLbIp 非空

# 2. 验证内网端点 DNS 状态
tccli tcr DescribeInternalEndpointDnsStatus \
    --VpcSet '[{"InstanceId":"<RegistryId>","VpcId":"<VpcId>","EniLbIp":"<EniLbIp>","UsePublicDomain":true}]' \
    --region <Region>
# expected: exit 0, VpcSet[0].Status: "ENABLED"

# 3. 验证自定义域名绑定
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: exit 0, DomainInfoList 含目标域名, Status: "SUCCESS"

# 4. 验证云联网关联状态
tccli vpc DescribeCcnAttachedInstances \
    --CcnId <CcnId> \
    --region <Region>
# expected: exit 0, InstanceSet 含所有关联 VPC, State: "AVAILABLE"
```

### 数据面（docker）

#### 场景 1：验证已接入 TCR 的 VPC（广州）——自定义域名内网访问

在位于 TCR 实例同地域、已接入内网端点的 VPC 内云服务器上执行：

```bash
# 获取临时访问凭证
tccli tcr CreateInstanceToken \
    --RegistryId <RegistryId> \
    --TokenType temp \
    --Desc "验证用临时凭证" \
    --region <Region>
# expected: exit 0, 返回 Username 和 Token

# 使用自定义域名登录
docker login <DomainName> \
    --username <Username> \
    --password <Token>
# expected: Login Succeeded

# 拉取镜像验证（须提前推送镜像至实例）
docker pull <DomainName>/<namespace>/<image>:<tag>
# expected: 镜像拉取成功
```

#### 场景 2：验证通过 CCN 关联的其他 VPC（上海）——跨地域内网访问

在位于上海、已关联云联网且已关联 Private DNS 私有域的 VPC 内云服务器上执行：

```bash
# 使用相同访问凭证登录
docker login <DomainName> \
    --username <Username> \
    --password <Token>
# expected: Login Succeeded

# 拉取镜像验证跨地域内网访问
docker pull <DomainName>/<namespace>/<image>:<tag>
# expected: 镜像拉取成功
```

镜像拉取成功则说明云联网 + Private DNS 配置正确，上海 VPC 可通过自定义域名跨地域内网访问广州 TCR 实例。

## 清理

> **计费提示：** 以下资源按量/按月计费，清理后释放资源、停止计费。
>
> | 资源 | 计费方式 |
> |------|---------|
> | TCR 企业版实例 | 按月（预付费），删除实例后停止计费 |
> | 云联网（CCN）实例 | 按月/按量（带宽计费），删除后停止计费 |
> | Private DNS 私有域 | 按量（按记录数/请求数），删除私有域后停止计费 |

清理顺序：依赖倒序，先拆上层（DNS 解析、域名绑定），再拆底层（VPC 接入、CCN 关联）。

### 1. 清理 Private DNS 私有域解析记录及私有域

> **副作用警告：** 删除私有域将导致所有关联 VPC 内对该域名的解析失效，Docker 客户端将无法通过自定义域名访问 TCR 实例。需先在控制台解除所有 VPC 关联，否则删除操作失败。

清理前状态检查：

```bash
tccli privatedns DescribePrivateZone \
    --ZoneId <ZoneId> \
    --region <Region>
# expected: 返回私有域信息，确认 ZoneId 正确
```

```bash
# 删除解析记录
tccli privatedns DeletePrivateZoneRecord \
    --ZoneId <ZoneId> \
    --RecordId <RecordId> \
    --region <Region>
# expected: exit 0

# 删除私有域（需先在控制台解除所有 VPC 关联）
tccli privatedns DeletePrivateZone \
    --ZoneId <ZoneId> \
    --region <Region>
# expected: exit 0
```

### 2. 删除自定义域名

> **副作用警告：** 删除自定义域名将导致所有使用该域名的 Docker 客户端无法拉取/推送镜像。删除后不可恢复，需重新 `CreateInstanceCustomizedDomain` 添加。不会删除绑定的 SSL 证书。

清理前状态检查：

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: DomainInfoList 中包含目标域名，确认是要删除的域名
```

```bash
tccli tcr DeleteInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --DomainName <DomainName> \
    --region <Region>
# expected: exit 0
```

验证已删除：

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: DomainInfoList 中不再包含目标域名，或 TotalCount 为 0
```

### 3. 从云联网解关联 VPC

> **副作用警告：** 解关联 VPC 将中断该 VPC 与 CCN 内其他 VPC 的网络互通。如有其他业务依赖此 CCN 链路，解关联将导致对应业务的跨地域通信中断。

清理前状态检查：

```bash
tccli vpc DescribeCcnAttachedInstances \
    --CcnId <CcnId> \
    --region <Region>
# expected: InstanceSet 中列出所有已关联 VPC
```

```bash
# 解关联上海 VPC
tccli vpc DetachCcnInstances \
    --CcnId <CcnId> \
    --Instances '[{"InstanceType":"VPC","InstanceId":"<VpcId-sh>","InstanceRegion":"ap-shanghai"}]' \
    --region <Region>
# expected: exit 0

# 解关联 TCR 侧 VPC
tccli vpc DetachCcnInstances \
    --CcnId <CcnId> \
    --Instances '[{"InstanceType":"VPC","InstanceId":"<VpcId>","InstanceRegion":"<Region>"}]' \
    --region <Region>
# expected: exit 0
```

验证已解关联：

```bash
tccli vpc DescribeCcnAttachedInstances \
    --CcnId <CcnId> \
    --region <Region>
# expected: 已解关联的 VPC 不再出现在 InstanceSet 中
```

### 4. 移除 VPC 内网访问

> **副作用警告：** 移除 VPC 内网访问将导致该 VPC 内所有容器客户端无法通过内网访问 TCR 实例。不影响已删除的自定义域名。

清理前状态检查：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: AccessVpcSet 中包含目标 VPC，确认 VpcId 正确
```

```bash
tccli tcr ManageInternalEndpoint \
    --RegistryId <RegistryId> \
    --Operation Delete \
    --VpcId <VpcId> \
    --SubnetId <SubnetId> \
    --region <Region>
# expected: exit 0
```

验证已移除：

```bash
tccli tcr DescribeInternalEndpoints \
    --RegistryId <RegistryId> \
    --region <Region>
# expected: AccessVpcSet 中不再包含目标 VPC，或 AccessVpcSet 为空
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ManageInternalEndpoint` 返回 `FailedOperation` | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>` 确认实例状态；`tccli vpc DescribeVpcs --VpcIds '["<VpcId>"]' --region <Region>` 确认 VPC 存在 | VPC 或子网不存在、不可用或与实例跨地域 | 确认 `VpcId` 和 `SubnetId` 正确，且子网位于 TCR 实例同地域 |
| `ManageInternalEndpoint` 返回 `InternalError.ErrorConflict` | `tccli tcr DescribeInternalEndpoints --RegistryId <RegistryId> --region <Region>` 检查已有接入 | VPC 已接入 TCR 实例（`Vpc already attach to registry`） | 先执行 `ManageInternalEndpoint --Operation Delete` 移除旧链路，再 `Create` 重建 |
| `CreateInstanceCustomizedDomain` 返回 `InvalidParameter` | `tccli ssl DescribeCertificates --CertId <CertId> --region <Region>` 确认证书 ID 及域名绑定关系 | 证书 ID 无效、证书未绑定该域名或证书状态非已签发 | 确认证书状态为已签发且域名匹配；购买证书格式 `cert-xxxxx`，上传证书为随机字符串。保留 `RequestId` 以便工单查询 |
| `UploadCertificate` 返回 `InvalidParameter` | 检查证书文件内容：`openssl x509 -in tcr-self-signed.crt -text -noout` 和 `openssl rsa -in tcr-self-signed.key -check` | PEM 格式错误或 `CertificateType` 不是 `SVR` | 确认公钥和私钥均为有效 PEM 格式，`CertificateType` 固定 `SVR` |
| `AttachCcnInstances` 返回 `ResourceNotFound` | `tccli vpc DescribeCcns --CcnIds '["<CcnId>"]' --region <Region>` 确认 CCN 存在 | 云联网实例不存在或 `CcnId` 错误 | 确认 `CcnId` 正确，实例状态为 `AVAILABLE` |
| `CreateCcn` 返回 `LimitExceeded` | `tccli vpc DescribeCcns --region <Region>` 查看 CCN 数量 | 当前账号 CCN 数量已达上限（环境限制，非命令错误） | 清理不再使用的 CCN 或使用已有 CCN 实例 |
| `Docker login` 返回 `401 Unauthorized` | `tccli tcr CreateInstanceToken --RegistryId <RegistryId> --TokenType temp --region <Region>` 重新创建临时凭证 | 访问凭证过期（临时凭证有效期 24 小时）或用户名/密码不匹配 | 确认 `--username` 为 `CreateInstanceToken` 返回的 `Username`，`--password` 为 `Token` |
| `Docker login` 返回 `x509: certificate signed by unknown authority` | `echo \| openssl s_client -connect <DomainName>:443 2>/dev/null \| openssl x509 -noout -issuer` 检查证书链 | 自签名证书不受 Docker 客户端信任 | 在 Docker 客户端添加 CA 证书：`mkdir -p /etc/docker/certs.d/<DomainName>` 并放入 ca.crt；或使用正式 CA 签发证书 |
| `CreateInternalEndpointDns` 返回 `InvalidParameter` | `tccli tcr DescribeInternalEndpoints --RegistryId <RegistryId> --region <Region>` 确认 `EniLbIp` 与返回值一致 | `EniLbIp` 或 `VpcId` 与内网端点不匹配 | 使用 `DescribeInternalEndpoints` 返回的 `EniLbIp` 值（不是 `AccessIp`），确认 `VpcId` 与创建内网端点时一致 |
| `DescribeInternalEndpointDnsStatus` 返回空 `VpcSet` | `tccli tcr DescribeInternalEndpoints --RegistryId <RegistryId> --region <Region>` 检查是否有已创建的内网端点 | 未创建内网端点或 `CreateInternalEndpointDns` 未执行 | 先完成 `ManageInternalEndpoint Create`（步骤 2），再执行 `CreateInternalEndpointDns`（步骤 3） |

### 创建成功但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 自定义域名 `Status` 长时间为 `CREATING` 或 `FAILED` | `tccli tcr DescribeInstanceCustomizedDomain --RegistryId <RegistryId> --region <Region>` 轮询状态 | 证书下发尚未完成或证书与域名不匹配 | 等待 1-2 分钟后重新查询；若持续非 `SUCCESS`，检查 SSL 证书是否已绑定该域名。保留 `RegistryId`、`DomainName`、`RequestId` 以备工单 |
| CCN 关联后上海 VPC 无法拉取镜像 | `tccli vpc DescribeCcnAttachedInstances --CcnId <CcnId> --region <Region>` 确认两地 VPC 均关联且状态 `AVAILABLE` | CCN 路由未正确传播，或 Private DNS 私有域未关联上海 VPC | 确认两地 VPC 均关联且状态正常；前往 Private DNS 控制台确认私有域已关联上海 VPC；在上海 CVM 上执行 `nslookup <DomainName>` 验证解析 |
| Private DNS 解析不生效（nslookup 返回公网 IP 或 NXDOMAIN） | 在 CVM 上执行 `nslookup <DomainName>` 验证解析结果 | DNS TTL 缓存未过期，或 A 记录 IP 有误，或私有域未关联当前 VPC | 检查 A 记录值是否为 `DescribeInternalEndpoints` 返回的 `AccessIp`；等待 TTL 过期或执行 `systemctl restart systemd-resolved`（Linux）刷新 DNS 缓存 |
| 内网端点 DNS `Status` 非 `ENABLED` | `tccli tcr DescribeInternalEndpointDnsStatus --VpcSet '[{"InstanceId":"<RegistryId>","VpcId":"<VpcId>","EniLbIp":"<EniLbIp>","UsePublicDomain":true}]' --region <Region>` 查看当前状态 | DNS 下发延迟或 `CreateInternalEndpointDns` 参数有误 | 等待 1-2 分钟后重新查询；若持续非 `ENABLED`，检查 `EniLbIp`（不是 `AccessIp`）和 `VpcId` 是否与 `DescribeInternalEndpoints` 返回一致 |

## 下一步

- [配置自定义域名](../../ops/access/domain/custom-domain) -- 自定义域名管理细节
- [配置内网访问控制](../../ops/access/network/private-access) -- VPC 内网链路管理
- [接口文档 - 内网访问](https://cloud.tencent.com/document/product/1141/41544) -- `ManageInternalEndpoint` 完整参数说明
- [接口文档 - 自定义域名](https://cloud.tencent.com/document/product/1141/41544) -- `CreateInstanceCustomizedDomain` 完整参数说明
- [全球多地域间同步镜像实现就近访问](../global-replication) -- 多实例同步 + 就近拉取

## 控制台替代

- [容器镜像服务控制台](https://console.cloud.tencent.com/tcr) -- 实例管理 -> 实例详情 -> 访问控制 / 域名管理
