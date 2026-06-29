---
title: "配置自定义域名（tccli）"
description: "· page_id `53879`"
---

> 对照官方：[配置自定义域名](https://cloud.tencent.com/document/product/1141/53879) · page_id `53879`

## 概述

通过 `tccli tcr CreateInstanceCustomizedDomain` 为 TCR 企业版实例配置自定义域名。自定义域名可实现：

- **品牌统一**：使用公司规划的域名（如 `registry.example.com`）访问容器镜像服务
- **零停机迁移**：从其他镜像仓库迁移至 TCR 时继续沿用原有域名，CI/CD 流水线和发布配置无需变更
- **多域名共存**：一个实例可配置多个自定义域名，且不影响实例默认域名（`<RegistryName>.tencentcloudcr.com`）

核心链路：**生成/获取 SSL 证书 --> 上传至腾讯云 SSL 证书服务 --> 绑定至 TCR 实例**。证书可通过以下方式获取：

| 方式 | 成本 | 适用场景 | 浏览器 | CLI（docker） |
|------|------|---------|:--:|:--:|
| `openssl` 自签名 | 零费用 | 开发/测试环境 | 警告 | 正常（需配置 CA 信任） |
| 购买商业 CA 证书 | 付费 | 生产环境 | 正常 | 正常 |
| `tccli ssl ApplyCertificate` | 付费 | 腾讯云一站式购买 | 正常 | 正常 |

> **跨产品依赖**：自定义域名强依赖腾讯云 SSL 证书服务（`tccli ssl`）。无论证书来源，均须先通过 `tccli ssl UploadCertificate` 将证书上传至 SSL 服务，再使用返回的 `CertificateId` 绑定域名。

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域（如 ap-guangzhou）

# 3. 检查 CAM 权限 — TCR 相关
#    需要以下 Action 名：
#      tcr:DescribeInstances, tcr:DescribeInstanceCustomizedDomain
#      tcr:CreateInstanceCustomizedDomain, tcr:DeleteInstanceCustomizedDomain
# 验证：执行 DescribeInstances 确认权限
tccli tcr DescribeInstances --region ap-guangzhou
# expected: exit 0，返回实例列表（可为空 TotalCount: 0）

# 4. 检查跨产品 CAM 权限 — SSL 证书服务
#    需要以下 Action 名：
#      ssl:UploadCertificate, ssl:DescribeCertificates
tccli ssl DescribeCertificates --region ap-guangzhou
# expected: exit 0，返回证书列表（可为空 TotalCount: 0）

# 5. 检查 openssl（仅自签名证书方案需要）
openssl version
# expected: exit 0，显示 OpenSSL 版本
```

### 资源检查

```bash
# 6. 确认 TCR 企业版实例存在且状态正常
tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region ap-guangzhou
# expected: exit 0, Status: "Running"

# 7. 确认目标域名已注册（境内实例需完成 ICP 备案；境外实例无需备案）
nslookup <DomainName>
# expected: 域名已注册并可解析（或后续将配置解析）

# 8. 确认有可用的 SSL 证书（或准备生成）
tccli ssl DescribeCertificates --region ap-guangzhou
# expected: exit 0，若有可用证书则记录 CertificateId
```

前置依赖：
- 已完成[创建企业版实例](../../../create)，实例 `Status` 为 `Running`
- 已拥有域名（可通过[域名注册服务](https://console.cloud.tencent.com/domain)注册）
- 境内实例使用的域名需完成 ICP 备案
- 已安装 `openssl`（自签名证书方案），或已持有 PEM 格式证书文件（上传方案）

## 控制台与 CLI 参数映射

| 控制台操作 | CLI | 幂等 |
|-----------|-----|:--:|
| 查看自定义域名列表 | `tccli tcr DescribeInstanceCustomizedDomain --RegistryId <RegistryId>` | 是 |
| 添加自定义域名 | `tccli tcr CreateInstanceCustomizedDomain` | 否（重名报错） |
| 更新域名证书 | 先 `DeleteInstanceCustomizedDomain`，再 `CreateInstanceCustomizedDomain`（无直接修改 API） | — |
| 删除自定义域名 | `tccli tcr DeleteInstanceCustomizedDomain` | 否（删除不存在的域名返回错误） |
| 上传 SSL 证书 | `tccli ssl UploadCertificate` | 否 |
| 查看 SSL 证书列表 | `tccli ssl DescribeCertificates` | 是 |

## 关键字段说明

以下说明 `CreateInstanceCustomizedDomain` 和 `UploadCertificate` 的主要参数。

### TCR 侧（tccli tcr）

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `RegistryId` | String | 是 | TCR 实例 ID，由 `DescribeInstances` 返回 | `ResourceNotFound` — 实例不存在或地域错误 |
| `DomainName` | String | 是 | 已完成 ICP 备案的自定义域名（境内实例），须与 SSL 证书绑定的域名一致 | `FailedOperation.DependenceError` — 证书与域名不匹配或域名未备案 |
| `CertificateId` | String | 是 | SSL 证书 ID，仅支持已在腾讯云 SSL 证书服务内托管的证书。购买证书 ID 格式 `cert-xxxxx`，上传证书 ID 为随机字符串 | `FailedOperation.CertificateNotFound` — 证书不存在或未托管至腾讯云 |

### SSL 证书服务侧（tccli ssl）

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `CertificatePublicKey` | String | 是 | PEM 格式证书公钥。**注意参数名为 `PublicKey` 而非 `Cert`** | `InvalidParameter` — 格式不合法 |
| `CertificatePrivateKey` | String | 是 | PEM 格式证书私钥 | `InvalidParameter` — 格式不合法或与公钥不匹配 |
| `CertificateType` | String | 是 | 固定 `SVR`（服务器证书），TCR 仅接受服务器证书类型 | `InvalidParameter` — 填写其他类型（如 `CA`）则拒绝 |
| `Alias` | String | 否 | 证书别名，便于在证书列表中识别，建议填写有业务含义的名称 | 无严重后果，仅影响证书可识别性 |
| `Repeatable` | Boolean | 否 | 是否允许重复上传相同证书，默认 `false` | `true` 时可重复上传（不推荐） |

## 操作步骤

### 步骤1：生成或准备 SSL 证书

若已有 CA 签发的正式证书（PEM 格式），跳过此步。若为开发/测试环境或无已有证书，使用 `openssl` 生成自签名证书。

#### 选择依据

- **自签名 vs 正式证书**：开发/测试环境使用 `openssl` 生成自签名证书，零费用、即时可用；生产环境必须使用 CA 签发的正式证书。
- **有效期**：自签名证书建议 `-days 365`（1 年）。测试环境可使用更短有效期（如 `-days 1`）。
- **CN 字段**：`/CN=<DomainName>` 必须与后续绑定的自定义域名完全一致，否则客户端验证失败。
- **加密强度**：建议 RSA 2048 位（`rsa:2048`），性能与安全性均衡。

#### 执行生成

```bash
openssl req -x509 -newkey rsa:2048 \
    -keyout <key.pem> \
    -out <cert.pem> \
    -days 1 \
    -subj '/CN=<DomainName>' \
    -nodes
# expected: exit 0，生成 cert.pem 和 key.pem
```

| 参数 | 说明 |
|------|------|
| `-x509` | 输出自签名 X.509 证书（非证书请求 CSR） |
| `-newkey rsa:2048` | 同时生成 2048 位 RSA 私钥 |
| `-keyout <key.pem>` | 私钥输出路径 |
| `-out <cert.pem>` | 证书输出路径 |
| `-days 1` | 证书有效期天数（测试用 1 天，生产建议 365 天） |
| `-subj '/CN=<DomainName>'` | 证书主题，CN 必须与后续绑定的域名一致 |
| `-nodes` | 私钥不加密码保护（No DES），便于自动化脚本读取 |

> **真机实测**：`openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 1 -subj '/CN=test-kerwinwjyan-rewrite.example.com' -nodes` 执行成功，生成证书和私钥。

### 步骤2：上传 SSL 证书至腾讯云

通过 `tccli ssl UploadCertificate` 将证书托管至腾讯云 SSL 证书服务。已购买腾讯云 SSL 证书（`cert-xxxxx` 格式）且已签发的，跳过此步。

#### 选择依据

- **CertificateType**：固定选 `SVR`（服务器证书），TCR 自定义域名只接受服务器证书类型。
- **Alias**：推荐填写有业务含义的别名，如 `"tcr-custom-domain-test"`，便于在证书列表（`DescribeCertificates`）中快速识别。
- **参数名注意**：`--CertificatePublicKey` 参数名中为 `PublicKey`，非 `Cert`。拼写错误将导致 `Unknown parameter`。

#### 最小配置（仅必填字段）

```bash
tccli ssl UploadCertificate \
    --CertificatePublicKey "$(cat <cert.pem>)" \
    --CertificatePrivateKey "$(cat <key.pem>)" \
    --CertificateType SVR \
    --region ap-guangzhou
# expected: exit 0，返回 CertificateId
```

#### 增强配置（含别名）

```bash
tccli ssl UploadCertificate \
    --CertificatePublicKey "$(cat <cert.pem>)" \
    --CertificatePrivateKey "$(cat <key.pem>)" \
    --CertificateType SVR \
    --Alias '<证书别名>' \
    --region ap-guangzhou
# expected: exit 0，返回 CertificateId
```

**输出**：

```json
{
    "CertificateId": "YWwE5I4b",
    "RequestId": "..."
}
```

> **真机实测**：`tccli ssl UploadCertificate --CertificatePublicKey "$(cat cert.pem)" --CertificatePrivateKey "$(cat key.pem)" --CertificateType SVR --Alias 'tcr-test-cert' --region ap-guangzhou` 返回 `CertificateId: "YWwE5I4b"`。

记录返回的 `CertificateId`，后续步骤使用。

### 步骤3：查看当前自定义域名列表

绑定前确认当前未配置目标域名，避免重复创建导致报错：

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region ap-guangzhou \
    --output json
# expected: exit 0，返回当前域名列表
```

**输出（无自定义域名时）**：

```json
{
    "DomainInfoList": [],
    "TotalCount": 0,
    "RequestId": "..."
}
```

### 步骤4：绑定自定义域名至 TCR 实例

#### 选择依据

- **DomainName**：使用已完成 ICP 备案的域名（境内实例），须与 SSL 证书中 CN 字段（或 SAN 字段）一致。
- **CertificateId**：使用步骤 2 上传返回的 `CertificateId`（如 `YWwE5I4b`），或已购买证书的 ID（`cert-xxxxx` 格式）。
- **无额外可选参数**：此操作仅 3 个必填参数（`RegistryId`、`DomainName`、`CertificateId`），含义显然，单层命令即可。

```bash
tccli tcr CreateInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --DomainName <DomainName> \
    --CertificateId <CertificateId> \
    --region ap-guangzhou
# expected: exit 0，返回 RequestId
```

**输出**：

```json
{
    "RequestId": "0ecf086e-..."
}
```

> **真机实测**：`tccli tcr CreateInstanceCustomizedDomain --RegistryId tcr-nn8smeyj --DomainName test-kerwinwjyan-rewrite.example.com --CertificateId YWwE5I4b --region ap-guangzhou` 返回 `RequestId: "0ecf086e-..."`。

### 步骤5：验证域名绑定状态

轮询确认自定义域名已生效：

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region ap-guangzhou \
    --output json
# expected: exit 0, DomainInfoList 含目标域名，Status: "SUCCESS"
```

**输出（绑定成功后）**：

```json
{
    "DomainInfoList": [
        {
            "DomainName": "test-kerwinwjyan-rewrite.example.com",
            "CertId": "YWwE5I4b",
            "Status": "SUCCESS"
        }
    ],
    "TotalCount": 1,
    "RequestId": "..."
}
```

> **真机实测**：查询返回 `DomainInfoList: [{DomainName: "test-kerwinwjyan-rewrite.example.com", CertId: "YWwE5I4b", Status: "SUCCESS"}]`，确认绑定成功。

| 维度 | 检查内容 | 预期 |
|------|---------|------|
| 状态 | `DomainInfoList[*].Status` | `SUCCESS` |
| 域名匹配 | `DomainInfoList[*].DomainName` | 与 `--DomainName` 完全一致 |
| 证书绑定 | `DomainInfoList[*].CertId` | 与 `--CertificateId` 完全一致 |

`Status: "SUCCESS"` 表示自定义域名已生效，证书已正确下发。

### 步骤6：更新域名证书（可选）

TCR 无直接修改自定义域名证书的 API。如需更新证书（证书过期或需升级），采用「先删后建」模式：

```bash
# 删除旧域名绑定
tccli tcr DeleteInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --DomainName <DomainName> \
    --region ap-guangzhou

# 使用新证书重新创建
tccli tcr CreateInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --DomainName <DomainName> \
    --CertificateId <NewCertificateId> \
    --region ap-guangzhou
```

> **注意**：删除再创建的过程中，自定义域名短暂不可用（通常 1-2 分钟）。更新证书后无需重新配置 DNS 解析记录。

### 步骤7：删除自定义域名

```bash
tccli tcr DeleteInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --DomainName <DomainName> \
    --region ap-guangzhou
# expected: exit 0，返回 RequestId
```

> **真机实测**：`tccli tcr DeleteInstanceCustomizedDomain --RegistryId tcr-nn8smeyj --DomainName test-kerwinwjyan-rewrite.example.com --region ap-guangzhou` 成功删除。

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 证书已上传 | `tccli ssl DescribeCertificates --region ap-guangzhou --output json \| jq '.Certificates[] \| select(.CertificateId=="<CertificateId>")'` | 返回证书详情 |
| TLD 域名已绑定 | `tccli tcr DescribeInstanceCustomizedDomain --RegistryId <RegistryId> --region ap-guangzhou` | `DomainInfoList` 含目标域名，`Status: "SUCCESS"` |
| 域名绑定状态 | `tccli tcr DescribeInstanceCustomizedDomain --RegistryId <RegistryId> --region ap-guangzhou --output json \| jq '.DomainInfoList[0].Status'` | `"SUCCESS"` |
| 证书 ID 匹配 | `tccli tcr DescribeInstanceCustomizedDomain --RegistryId <RegistryId> --region ap-guangzhou --output json \| jq '.DomainInfoList[0].CertId'` | 与上传返回的 `CertificateId` 一致 |
| 域名已删除 | `tccli tcr DescribeInstanceCustomizedDomain --RegistryId <RegistryId> --region ap-guangzhou` | `DomainInfoList` 不含目标域名，或 `TotalCount: 0` |

### 数据面

自定义域名绑定后，需配合 DNS 解析和网络配置才能实际访问：

```bash
# 验证 DNS 解析生效
nslookup <DomainName>
# expected: 返回解析结果指向 TCR 内网 IP 或实例默认域名

# 验证 HTTPS 可达性
curl -I https://<DomainName>/v2/
# expected: HTTP/1.1 401 Unauthorized（401 表示可达但未认证，为正常响应）
```

> DNS 解析配置（DNSPod/Private DNS）和网络配置（公网入口/内网 VPC 接入）非本页面范围，详见[下一步](#下一步)。

## 清理

> **副作用警告**：删除自定义域名后，使用该域名的 Docker 客户端将无法通过自定义域名登录和拉取镜像，需切换至 TCR 默认公网域名（`<RegistryName>.tencentcloudcr.com`）。

### 1. 删除自定义域名

清理前状态检查：

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region ap-guangzhou
# expected: 确认待删除的目标域名
```

```bash
tccli tcr DeleteInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --DomainName <DomainName> \
    --region ap-guangzhou
# expected: exit 0，返回 RequestId
```

验证已删除：

```bash
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId <RegistryId> \
    --region ap-guangzhou
# expected: DomainInfoList 中不再包含目标域名，或 TotalCount 为 0
```

### 2. 清理 DNS 解析记录

同时清理在 DNSPod / Private DNS 中为该域名配置的解析记录，避免 DNS 污染。

### 3. 清理 SSL 证书（可选）

> 删除自定义域名不会自动删除关联的 SSL 证书。如证书不再需要，前往 [SSL 证书控制台](https://console.cloud.tencent.com/ssl) 手动删除。注意：**已过期或已吊销的证书不支持删除**。

## 排障

### 跨产品依赖链

自定义域名功能存在以下跨产品依赖，排障时需逐层检查：

```
自定义域名 (CreateInstanceCustomizedDomain)
  └─ 前提：CertificateId（已在腾讯云 SSL 证书服务中托管）
       └─ 前提：ssl UploadCertificate（上传证书至腾讯云 SSL）
            ├─ 前提：证书文件（PEM 格式公钥 + 私钥）
            └─ 前提：CertificateType: SVR（服务器证书类型）
```

> **排障入口**：若 `CreateInstanceCustomizedDomain` 返回证书相关错误，首先执行 `tccli ssl DescribeCertificates --region <Region>` 确认证书在 SSL 服务中的状态，而非在 TCR 侧排查。证书问题（过期、不匹配、类型错误）必须在 SSL 服务侧解决。

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ssl UploadCertificate` 返回 Unknown parameter: `CertificateCert` | 检查参数名拼写 | 错误使用了 `--CertificateCert`，正确参数名为 `--CertificatePublicKey` | 改用 `--CertificatePublicKey "$(cat <cert.pem>)"` |
| `ssl UploadCertificate` 返回 `InvalidParameter` | 检查 PEM 格式：`openssl x509 -in <cert.pem> -text -noout` 验证证书；`openssl rsa -in <key.pem> -check -noout` 验证私钥 | 证书公钥/私钥格式不合法或内容不匹配 | 确保证书和私钥均为 PEM 格式（以 `-----BEGIN` 开头），且属于同一证书对 |
| `CreateInstanceCustomizedDomain` 返回 `FailedOperation.DependenceError` | `tccli ssl DescribeCertificates --region ap-guangzhou` 确认证书存在且状态正常 | `CertificateId` 无效或证书未托管至腾讯云 | 确认证书 ID 正确，证书已在 SSL 证书服务中托管且已绑定该域名 |
| `CreateInstanceCustomizedDomain` 返回 `FailedOperation.CertificateNotFound` | `tccli ssl DescribeCertificates --region ap-guangzhou --output json \| jq '.Certificates[] \| .CertificateId'` 搜索目标证书 | 证书 ID 不存在或属于其他账号 | 确认 `CertificateId` 来自 `ssl UploadCertificate` 返回值或 SSL 控制台 |
| `CreateInstanceCustomizedDomain` 返回 `FailedOperation` | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region ap-guangzhou` 确认实例 Status | 实例非 `Running` 状态，或域名已被占用 | 确认实例状态正常；检查域名是否已绑定至当前实例或其它实例 |
| `DeleteInstanceCustomizedDomain` 返回错误 | `tccli tcr DescribeInstanceCustomizedDomain --RegistryId <RegistryId> --region ap-guangzhou` 确认域名绑定状态 | 域名未绑定至当前实例 | 确认 `DomainName` 拼写正确，且该域名确实已绑定 |
| `CreateInstanceCustomizedDomain` 返回 `InvalidParameter` | 检查域名格式及备案状态 | 域名格式非法或境内实例域名未备案 | 确认域名格式正确（如 `registry.example.com`），境内实例确保已完成 ICP 备案 |

### 创建成功但状态异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 自定义域名 `Status` 长时间为 `CREATING`（超过 2 分钟） | `tccli tcr DescribeInstanceCustomizedDomain --RegistryId <RegistryId> --region ap-guangzhou` 持续轮询 | SSL 证书下发延迟 | 等待 1-2 分钟后重新查询；若持续非 `SUCCESS`，检查 SSL 证书状态是否正常 |
| 自定义域名 `Status` 为 `FAILED` | `tccli ssl DescribeCertificates --region ap-guangzhou` 确认证书详情 | 证书与域名不匹配或证书状态异常 | 确认证书 CN/SAN 包含目标域名且状态为「已签发」；重新上传或购买正确证书 |
| 自定义域名绑定成功但 HTTPS 访问返回 `certificate signed by unknown authority` | `echo \| openssl s_client -connect <DomainName>:443 -servername <DomainName> 2>/dev/null \| openssl x509 -noout -issuer` 检查证书链 | 使用了自签名证书，客户端不信任该 CA | **CLI 使用不受影响**。若需消除警告，在各客户端添加 CA 证书：`mkdir -p /etc/docker/certs.d/<DomainName>/ && cp <cert.pem> /etc/docker/certs.d/<DomainName>/ca.crt`；浏览器访问需手动信任该证书 |
| 自定义域名绑定成功但无法访问（502/503） | `curl -I https://<DomainName>/v2/` 测试连通性 | DNS 解析未配置、网络链路不通、或公网入口未开启 | 检查 DNS 解析记录；公网场景确认公网入口已开启且白名单已配置；内网场景确认 VPC 已接入 |
| DNS 解析记录配置后长时间不生效 | `nslookup <DomainName>` 检查解析结果 | DNS TTL 缓存未过期 | 等待 TTL 过期（通常数分钟），或刷新本地 DNS 缓存 |

### 真机验证全链路记录

以下为本次 rewrite 真实环境执行的完整链路（已验证通过，实例 `tcr-nn8smeyj`，证书 `YWwE5I4b`）：

```bash
# 1. 生成自签名证书（有效期 1 天）
openssl req -x509 -newkey rsa:2048 \
    -keyout key.pem -out cert.pem \
    -days 1 -nodes \
    -subj '/CN=test-kerwinwjyan-rewrite.example.com'
# 成功：生成 key.pem 和 cert.pem

# 2. 上传证书至腾讯云 SSL 证书服务
tccli ssl UploadCertificate \
    --CertificatePublicKey "$(cat cert.pem)" \
    --CertificatePrivateKey "$(cat key.pem)" \
    --CertificateType SVR \
    --Alias 'tcr-test-cert' \
    --region ap-guangzhou
# → CertificateId: "YWwE5I4b"

# 3. 绑定自定义域名至 TCR 实例
tccli tcr CreateInstanceCustomizedDomain \
    --RegistryId tcr-nn8smeyj \
    --DomainName test-kerwinwjyan-rewrite.example.com \
    --CertificateId YWwE5I4b \
    --region ap-guangzhou
# → RequestId: "0ecf086e-..."

# 4. 验证绑定状态
tccli tcr DescribeInstanceCustomizedDomain \
    --RegistryId tcr-nn8smeyj \
    --region ap-guangzhou
# → DomainInfoList: [{DomainName: "test-kerwinwjyan-rewrite.example.com", CertId: "YWwE5I4b", Status: "SUCCESS"}]

# 5. 删除自定义域名
tccli tcr DeleteInstanceCustomizedDomain \
    --RegistryId tcr-nn8smeyj \
    --DomainName test-kerwinwjyan-rewrite.example.com \
    --region ap-guangzhou
# 成功删除
```

> 自签名证书仅适用于开发/测试环境。生产环境请使用 CA 签发的正式证书。`ssl UploadCertificate` 支持的 PEM 格式包括 RSA 2048、ECC 等多种密钥类型。证书上传后可跨 TCR 实例复用（同一证书 ID 可用于多个实例）。

## 下一步

- [配置内网访问控制](../../network/private-access) — VPC 内网链路管理（`ManageInternalEndpoint`），使 VPC 内容器客户端可通过内网访问 TCR 实例
- [配置公网访问控制](../../network/public-access) — 公网白名单管理（`CreateSecurityPolicy` / `DeleteSecurityPolicy`），使公网客户端可访问 TCR 实例
- [配置自定义域名及云联网实现跨地域内网访问](../../../../practices/custom-domain-ccn) — 跨地域统一域名方案（CCN + Private DNS + 自定义域名）
- [管理命名空间](../../../image-creation/namespace) — 创建命名空间与镜像仓库，配合自定义域名推送/拉取镜像
- [环境准备](../../../../../index.md) — 返回 TCR 工具链入口

## 控制台替代

[容器镜像服务控制台](https://console.cloud.tencent.com/tcr) -> 左侧导航栏**域名管理** -> 选择实例地域和实例 ID -> 单击**添加自定义域名**，在弹窗中配置域名及证书信息后确定。控制台支持**更新证书**及**删除**操作。控制台上传证书需先在 [SSL 证书控制台](https://console.cloud.tencent.com/ssl) 完成证书托管。
