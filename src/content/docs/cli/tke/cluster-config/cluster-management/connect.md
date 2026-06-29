---
title: "连接集群"
description: "· page_id `32191`"
---

> 对照官方：[连接集群](https://cloud.tencent.com/document/product/457/32191) · page_id `32191`

## 概述

通过 tccli 获取 TKE 集群的 kubeconfig 并连接集群。提供两条路径：**直接获取 kubeconfig** 或**创建集群端点**（内网/公网）。

| 方案 | 适用场景 | 前提条件 |
|------|---------|---------|
| 直接获取 kubeconfig | 已有内网/VPN 可达，快速获取凭证 | 无额外权限要求 |
| 创建内网端点 | 需要 VPC 内 LB 固定入口 | 集群需有运行中的 service-controller |
| 创建公网端点 | 需要从公网访问 API server | CAM 策略可能硬拒绝（见排障） |

> **建议**：若仅需获取 kubeconfig，直接使用 `DescribeClusterKubeconfig`。若需持久化入口地址，再创建内网端点。

## 前置条件

- [环境准备](../../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置

# 3. 检查 kubectl 已安装
kubectl version --client --output yaml
# expected: clientVersion 存在，建议 >= 1.28.0

# 4. 检查 CAM 权限
#    需要: tke:DescribeClusterEndpoints, tke:DescribeClusterKubeconfig,
#          tke:DescribeClusterEndpointStatus, tke:DescribeClusterStatus,
#          tke:CreateClusterEndpoint, tke:DeleteClusterEndpoint
tccli tke DescribeClusters --region <Region>
# expected: exit 0
```

```json
{
  "TotalCount": "<TotalCount>",
  "Clusters": "<Clusters>",
  "ClusterId": "<ClusterId>",
  "ClusterName": "<ClusterName>",
  "ClusterDescription": "<ClusterDescription>",
  "ClusterVersion": "<ClusterVersion>"
}
```

### 资源检查

```bash
# 5. 确认目标集群存在且状态正常
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: TotalCount >= 1，ClusterStatus: "Running"
```

```json
{
  "TotalCount": "<TotalCount>",
  "Clusters": "<Clusters>",
  "ClusterId": "<ClusterId>",
  "ClusterName": "<ClusterName>",
  "ClusterDescription": "<ClusterDescription>",
  "ClusterVersion": "<ClusterVersion>"
}
```

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看集群访问入口 | `DescribeClusterEndpoints` | 是 |
| 获取 kubeconfig | `DescribeClusterKubeconfig` | 是 |
| 查看端点开通状态 | `DescribeClusterEndpointStatus` | 是 |
| 查看认证配置 | `DescribeClusterAuthenticationOptions` | 是 |
| 创建内网访问入口 | `CreateClusterEndpoint --IsExtranet false` | 否 |
| 创建公网访问入口 | `CreateClusterEndpoint --IsExtranet true` | 否 |
| 删除访问入口 | `DeleteClusterEndpoint` | 是 |

## 关键字段说明

| 字段 | 类型 | 说明 | 错误后果 |
|------|------|------|------|
| `ClusterId` | String | 格式 `cls-xxxxxxxx` | 不存在 → `InvalidParameter.ClusterId` |
| `IsExtranet` | Boolean | `true`（公网）/ `false`（内网） | 公网可能被 CAM 策略拒绝 → `InvalidParameter.Param`（strategyId:240463971, condition: tke:clusterExtranetEndpoint=true） |
| `SubnetId` | String | 内网端点必填，须与集群同 VPC | 子网不存在 → 创建失败 |
| `ClusterDomain` | String | 集群访问域名，仅在腾讯云内网可解析 | 本地 PC 无法 DNS 解析（预期） |
| `Kubeconfig` | String | 完整 kubeconfig 内容（YAML 格式） | 需通过 `jq -r` 提取并写入文件 |

## 操作步骤

### 步骤 1：查询集群访问入口信息

```bash
tccli tke DescribeClusterEndpoints --region <Region> --ClusterId <ClusterId>
# expected: exit 0，返回集群域名和 CA 证书
```

**预期输出**：

```json
{
    "ClusterExternalEndpoint": "",
    "ClusterIntranetEndpoint": "",
    "ClusterDomain": "cls-example.ccs.tencent-cloud.com",
    "ClusterExternalDomain": "cls-example.ccs.tencent-cloud.com",
    "ClusterIntranetDomain": "cls-example.ccs.tencent-cloud.com",
    "SecurityGroup": "",
    "CertificationAuthority": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
    "RequestId": "..."
}
```

### 步骤 2：检查端点状态

```bash
# 内网端点
tccli tke DescribeClusterEndpointStatus --region <Region> \
    --ClusterId <ClusterId> \
    --IsExtranet false
# expected: exit 0，Status 可能为 Created / Creating / CreateFailed / NotFound

# 公网端点
tccli tke DescribeClusterEndpointStatus --region <Region> \
    --ClusterId <ClusterId> \
    --IsExtranet true
# expected: exit 0，Status 可能为 NotFound（未创建或被 CAM 拒绝）
```

**预期输出**（内网端点创建失败）：

```json
{
    "Status": "CreateFailed",
    "ErrorMsg": "ensure extranet service: endpoints default/kubernetes-intranet-loadbalancer address sync timed out, check if service-controller is running",
    "RequestId": "..."
}
```

| `Status` | 含义 | 处理 |
|---------|------|------|
| `Created` | 端点已就绪 | 直接获取 kubeconfig |
| `Creating` | 创建中 | 等待 1-3 分钟再查 |
| `CreateFailed` | 创建失败 | 查看 `ErrorMsg`。内网端点失败通常因 service-controller 未运行 |
| `NotFound` | 端点不存在（未创建或被 CAM 拒绝） | 公网被 CAM 拒绝时无日志 |

### 步骤 3：获取 kubeconfig

无论端点是否创建成功，都可通过 `DescribeClusterKubeconfig` 直接获取完整 kubeconfig（含客户端证书和私钥）。

```bash
tccli tke DescribeClusterKubeconfig --region <Region> --ClusterId <ClusterId>
# expected: exit 0，Kubeconfig 字段非空（约 5.7KB）
```

**预期输出**：

```json
{
    "Kubeconfig": "apiVersion: v1\nclusters:\n- cluster:\n    certificate-authority-data: ...\n    server: https://cls-example.ccs.tencent-cloud.com\n  name: cls-example\ncontexts:\n- context:\n    cluster: cls-example\n    user: admin\n  name: cls-example\ncurrent-context: cls-example\nkind: Config\npreferences: {}\nusers:\n- name: admin\n  user:\n    client-certificate-data: ...\n    client-key-data: ...",
    "RequestId": "..."
}
```

**保存 kubeconfig**：

```bash
tccli tke DescribeClusterKubeconfig --region <Region> --ClusterId <ClusterId> \
    | jq -r '.Kubeconfig' > ~/.kube/config-tke-<ClusterId>
# expected: 文件已创建
```

```json
{
  "Kubeconfig": "<Kubeconfig>",
  "RequestId": "<RequestId>"
}
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `<ClusterId>` | 目标集群 ID | `tccli tke DescribeClusters --region <Region>` |
| `<Region>` | 地域 | `tccli configure list` |

### 步骤 4：查询集群认证选项和状态

```bash
# 认证配置
tccli tke DescribeClusterAuthenticationOptions --region <Region> --ClusterId <ClusterId>
# expected: exit 0

# 集群状态确认
tccli tke DescribeClusterStatus --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: ClusterState: "Running"
```

```json
{
  "ServiceAccounts": "<ServiceAccounts>",
  "UseTKEDefault": "<UseTKEDefault>",
  "Issuer": "<Issuer>",
  "JWKSURI": "<JWKSURI>",
  "AutoCreateDiscoveryAnonymousAuth": "<AutoCreateDiscoveryAnonymousAuth>",
  "LatestOperationState": "<LatestOperationState>"
}
```

## 验证

### 控制面（tccli）

```bash
# 确认集群状态
tccli tke DescribeClusterStatus --region <Region> --ClusterIds '["<ClusterId>"]' \
    | jq '.ClusterStatusSet[0].ClusterState'
# expected: "Running"

# 检查 kubeconfig 完整性
wc -c < ~/.kube/config-tke-<ClusterId>
# expected: > 1000
grep "server:" ~/.kube/config-tke-<ClusterId>
# expected: server: https://cls-example.ccs.tencent-cloud.com
```

```json
{
  "ClusterStatusSet": "<ClusterStatusSet>",
  "ClusterId": "<ClusterId>",
  "ClusterState": "<ClusterState>",
  "ClusterInstanceState": "<ClusterInstanceState>",
  "ClusterBMonitor": "<ClusterBMonitor>",
  "ClusterInitNodeNum": "<ClusterInitNodeNum>"
}
```

### 数据面（需内网/VPN 可达环境）

```bash
kubectl --kubeconfig ~/.kube/config-tke-<ClusterId> cluster-info
# expected: Kubernetes control plane is running at...

kubectl --kubeconfig ~/.kube/config-tke-<ClusterId> get ns
# expected: 返回 default、kube-system 等命名空间
```

| 验证维度 | 预期 |
|---------|------|
| 控制面状态 | `ClusterState: "Running"` |
| kubeconfig 完整性 | server 地址为 `https://cls-example.ccs.tencent-cloud.com` |
| kubectl 连通性 | 返回 Kubernetes control plane 地址（仅内网环境） |

## 清理

> **警告**：`DeleteClusterEndpoint` 删除端点后将导致所有 kubectl 连接中断。kubeconfig 文件删除后不可恢复——客户端证书随文件删除而丢失，需重新获取。

```bash
# 清理前检查
tccli tke DescribeClusterEndpoints --region <Region> --ClusterId <ClusterId>

# 删除内网端点
tccli tke DeleteClusterEndpoint --region <Region> \
    --ClusterId <ClusterId> --IsExtranet false

# 删除公网端点
tccli tke DeleteClusterEndpoint --region <Region> \
    --ClusterId <ClusterId> --IsExtranet true

# 验证已删除
tccli tke DescribeClusterEndpointStatus --region <Region> \
    --ClusterId <ClusterId> --IsExtranet false
# expected: Status: "NotFound"

# 清理本地 kubeconfig
rm ~/.kube/config-tke-<ClusterId>
```

```json
{
  "CertificationAuthority": "<CertificationAuthority>",
  "ClusterExternalEndpoint": "<ClusterExternalEndpoint>",
  "ClusterIntranetEndpoint": "<ClusterIntranetEndpoint>",
  "ClusterDomain": "<ClusterDomain>",
  "ClusterExternalACL": "<ClusterExternalACL>",
  "ClusterExternalDomain": "<ClusterExternalDomain>"
}
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateClusterEndpoint --IsExtranet true` 返回 `InvalidParameter.Param`：`ACTION_NO_AUTH: you are not authorized to perform operation (tke:CreateClusterEndpoint). condition: [{"key":"tke:clusterExtranetEndpoint","value":"true","ope":"string_equal"}], effect: deny, strategyId:240463971` | 登录 [CAM 控制台](https://console.cloud.tencent.com/cam/policy) 查看策略 240463971 | 组织级 CAM 策略以 `tke:clusterExtranetEndpoint=true` 条件硬拒绝公网端点创建（环境限制）。即使自建安全组也无法绕过 | 回退到内网端点：`--IsExtranet false`。通过 IOA/VPN/专线或同 VPC CVM 访问。如需公网访问，联系管理员修改 CAM 策略 |
| `CreateClusterEndpoint --IsExtranet false` 返回 `OperationDenied` | 等待 30 秒后重试 | 同一类型端点已有创建任务执行中 | 等待当前任务完成 |
| `DescribeClusterEndpointStatus --IsExtranet false` 返回 `CreateFailed`：`address sync timed out, check if service-controller is running` | 空集群（0 工作节点）时 service-controller 无法调度 | service-controller 未运行 | 先创建工作节点使 service-controller 运行，或直接 `DescribeClusterKubeconfig` 获取凭证绕过端点 |
| `DescribeClusterKubeconfig` 返回空或无效 | 检查 `Kubeconfig` 字段长度 | API server 可能在重启 | 等待数分钟重试，确认集群状态为 `Running` |
| `DescribeClusters` 返回 `InvalidParameter.ClusterId` | 检查 ID 格式和 region | ID 格式错误或不属于当前账号/地域 | `DescribeClusters --region <Region>` 列出全部集群 |

### kubectl 不通

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `Unable to connect to the server: dial tcp: lookup cls-example.ccs.tencent-cloud.com: no such host` | `nslookup cls-example.ccs.tencent-cloud.com` | 本地 PC 不在腾讯云内网，无法 DNS 解析集群域名（预期行为，非配置错误） | 切换到同 VPC CVM 或通过 IOA/VPN/专线接入后重试 |
| `x509: certificate signed by unknown authority` | 检查 kubeconfig 的 `certificate-authority-data` | CA 证书缺失或不完整 | 重新获取 kubeconfig |
| `dial tcp ...: i/o timeout` | 检查端口连通性 | 安全组或防火墙拦截，或端点未创建/已删除 | 检查安全组入站规则放行 TCP 443 |

## 下一步

- [创建集群](../create) — 新建托管集群
- [升级集群](../upgrade) — 升级 K8s 版本
- [集群生命周期](../lifecycle) — 状态流转管理

## 控制台替代

[TKE 控制台 → 集群 → 基本信息](https://console.cloud.tencent.com/tke2/cluster)：查看访问入口、获取 kubeconfig、开启/关闭内网和公网访问。
