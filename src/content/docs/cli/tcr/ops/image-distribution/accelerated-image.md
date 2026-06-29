---
title: "按需加载容器镜像（tccli）"
description: "· page_id `53928`"
---

> 对照官方：[按需加载容器镜像](https://cloud.tencent.com/document/product/1141/53928) · page_id `53928`

## 概述

通过 `tccli tcr CreateImageAccelerationService` 为 TCR 企业版实例开启镜像按需加载（镜像加速）功能。开启后，普通容器镜像在推送时自动转换为 OCI 兼容的加速格式（制品类型 `OCI-Image-v1`，镜像 Tag 附加 `-apparate` 后缀），部署时绕过全量下载与在线解压，实现容器极速启动（尤其对 >1 GB 大镜像效果显著）。

**控制面（tccli）**：管理实例的镜像加速服务生命周期——创建、查询、删除。

**数据面（kubectl/Helm/docker）**：节点打标签、安装加速套件 DaemonSet、推送镜像触发自动转换、部署加速镜像。

> **规格要求**：按需加载功能需**标准版（standard）或高级版（premium）**实例，并需提供 VPC + Subnet 参数。**基础版不支持**——`DescribeImageAccelerateService` 返回 `{ "Status": "", "IsEnable": false }`，此为正常预期。

## 前置条件

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据
tccli configure list
# expected: secretId、secretKey、region 均已配置

# 3. 确认实例规格为 standard 或以上
tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --output json \
  --filter "Registries[0].{RegistryId:RegistryId,RegistryType:RegistryType,Status:Status}"
# expected: RegistryType: "standard" 或 "premium", Status: "Running"

# 4. 确认 CAM 权限 — 需要 tcr:CreateImageAccelerationService,
#    tcr:DescribeImageAccelerateService, tcr:DeleteImageAccelerateService,
#    vpc:DescribeVpcs, vpc:DescribeSubnets
tccli tcr DescribeImageAccelerateService --RegistryId '<RegistryId>' --region <Region>
# expected: exit 0
```

### 资源检查

```bash
# 5. 确认集群所在 VPC 已接入至企业版实例
tccli tcr DescribeInternalEndpoints --RegistryId '<RegistryId>' --region <Region> --output json
# expected: AccessVpcSet 非空，至少包含集群所在 VPC

# 6. 查询目标 VPC 下可用子网
tccli vpc DescribeSubnets --region <Region> --output json \
  --filter "SubnetSet[?VpcId=='<VpcId>']"
# 记录目标 SubnetId 及其 Zone（如 ap-guangzhou-3）

# 7. 确认集群节点 containerd >= 1.4.3（否则安装加速套件可能致节点 NotReady）
kubectl get nodes -o wide
# expected: Kubernetes >= 1.16，节点 STATUS = Ready
```

### 数据面前置

- 集群操作系统：Ubuntu、TencentOS 或 CentOS（CentOS 需 `yum install -y fuse`）
- 已安装 `kubectl`、`Helm v3`
- 集群节点 containerd >= 1.4.3

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 / 参数 | 幂等 |
|-----------|------------------|:--:|
| 选择实例 | `DescribeInstances`（获取 `RegistryId`） | 是 |
| 查看镜像加速状态 | `DescribeImageAccelerateService --RegistryId <RegistryId>` | 是 |
| 开启镜像加速 | `CreateImageAccelerationService`（需 VpcId + SubnetId 等 6 个必填参数） | 否（重复创建报错） |
| 添加镜像加速规则 | **控制台操作**（无对应 tccli 写 API） | — |
| 推送镜像触发自动转换 | `docker tag` + `docker push`（自动生成 `-apparate` 加速镜像） | — |
| 节点添加加速标签 | `kubectl label node <node> cloud.tencent.com/apparate=true` | 是 |
| 安装 TCR 加速套件 | `helm repo add` + `helm install apparate` | 否 |
| 部署加速镜像 | YAML 指定加速镜像 + `nodeSelector: cloud.tencent.com/apparate=true` | — |

## 关键字段说明

`CreateImageAccelerationService` 共 **6 个必填参数**（均无默认值）。

| 字段名 | 类型 | 必填 | 取值与约束 | 错误后果 |
|--------|------|:--:|------|------|
| `RegistryId` | String | 是 | 实例 ID，如 `tcr-nn8smeyj` | 传入不存在的实例 → `ResourceNotFound` |
| `VpcId` | String | 是 | VPC ID，如 `vpc-xxxxxxxx`，需与集群所在 VPC 一致 | VPC 不存在或不可达 → `InvalidParameter.VpcId` |
| `SubnetId` | String | 是 | VPC 下子网 ID，需与 `Zone` 匹配且有可用 IP | 子网不存在或 Zone 不匹配 → `InvalidParameter.SubnetId` |
| `StorageType` | String | 是 | 当前仅支持 `cfs` | 传入其他值 → `InvalidParameter`（提示 "invalid backend type"） |
| `PGroupId` | String | 是 | CFS 权限组 ID，如 `pgroupbasic`（默认权限组） | 权限组不存在 → `InvalidParameter.PGroupId` |
| `Zone` | String | 是 | 可用区，如 `ap-guangzhou-3`，需与 Subnet 一致 | Zone 不可用或与 Subnet 不匹配 → `InvalidParameter.Zone` |

> 镜像加速基于 CFS 共享存储实现 lazy loading，故 VpcId/SubnetId/PGroupId/Zone 均为 CFS 资源定位所需。CFS 为可用区级资源，Zone 必须与 Subnet 所在 Zone 一致。

## 操作步骤

### 步骤1：查询镜像加速服务状态

```bash
tccli tcr DescribeImageAccelerateService --RegistryId 'tcr-nn8smeyj' --region ap-guangzhou --output json
```

**输出（未开启 — 基础版或无加速的正常状态）**：

```json
{
    "Status": "",
    "IsEnable": false,
    "RequestId": "669ad80b-8317-40db-94a6-8cc5eac46cef"
}
```

> 上为真机实跑输出。`Status` 为空字符串，`IsEnable` 为 `false`，这是加速服务未开启的正常状态。如果实例是基础版，这同样是预期结果（基础版不支持加速）。

### 步骤2：获取必填参数

```bash
# 2a. 查询实例已接入的 VPC 信息
tccli tcr DescribeInternalEndpoints --RegistryId '<RegistryId>' --region <Region> --output json
# 从返回的 AccessVpcSet 中获取 VpcId 和 SubnetId

# 2b. 查询子网详情（确认 Zone）
tccli vpc DescribeSubnets --region <Region> --output json \
  --filter "SubnetSet[?SubnetId=='<SubnetId>']"
# 记录 Zone 值（如 ap-guangzhou-3），后续 CreateImageAccelerationService 需一致
```

### 步骤3：开启镜像加速服务

> **执行状态**：当前步骤命令参数已推导完整，但本 session 未在真机完成 `CreateImageAccelerationService` 执行（需 VPC + Subnet + PGroupId + Zone 参数）。以下命令为推导结果，标记为 `execution-pending`。

**选择依据**：

| 决策项 | 选择 | 为什么 |
|--------|------|--------|
| StorageType | `cfs` | TCR 镜像加速基于 CFS 共享存储实现 lazy loading；当前仅支持 `cfs` |
| VpcId | 集群所在 VPC | CFS 需部署在与集群相同的 VPC 内 |
| SubnetId | VPC 内可用子网 | 子网需有足够可用 IP |
| Zone | 与 Subnet 匹配的可用区 | CFS 为可用区级资源，必须一致 |
| PGroupId | `pgroupbasic` 或自定义 | 首次使用可用默认权限组 |

```bash
# 使用 --cli-input-json 桥接模式（6 个必填参数）
cat > create-accel-service.json <<'EOF'
{
    "RegistryId": "<RegistryId>",
    "VpcId": "<VpcId>",
    "SubnetId": "<SubnetId>",
    "StorageType": "cfs",
    "PGroupId": "pgroupbasic",
    "Zone": "<Zone>"
}
EOF

tccli tcr CreateImageAccelerationService \
  --cli-input-json file://create-accel-service.json \
  --region <Region> --output json
```

> 若使用自定义 CFS 权限组（非默认 `pgroupbasic`），可通过 `tccli cfs DescribeCfsPGroups --region <Region>` 查询已有权限组后替换 `PGroupId`。

### 步骤4：确认加速服务已开启

```bash
tccli tcr DescribeImageAccelerateService --RegistryId '<RegistryId>' --region <Region> --output json
# expected: IsEnable: true, Status: "Running", CFSVIP 非空
```

**输出（已开启的预期）**：

```json
{
    "Status": "Running",
    "CFSVIP": "10.0.x.x",
    "IsEnable": true,
    "RequestId": "eac6b301-a322-493a-8e36-83b295459397"
}
```

### 步骤5：推送镜像并自动转换为加速格式

> 加速规则需在控制台添加（无对应 tccli 写 API）。确认规则状态为开启中后执行。

```bash
docker tag nginx:latest <RegistryDomain>/<Namespace>/nginx:latest
docker push <RegistryDomain>/<Namespace>/nginx:latest
# expected: 推送成功后自动生成 nginx:latest-apparate 加速镜像
```

### 步骤6：集群侧配置加速环境（数据面）

为节点添加加速标签：

```bash
kubectl label node <node-name> cloud.tencent.com/apparate=true
kubectl get nodes -l cloud.tencent.com/apparate=true
```

安装 TCR 加速套件（Helm v3）：

```bash
helm repo add tcr-helm-public https://helmhub.tencentcloudcr.com/chartrepo/public
helm pull tcr-helm-public/apparate --version 1.0.0
tar -xzvf apparate-1.0.0.tgz
# 编辑 apparate/values.yaml 配置实例凭证后安装
helm install apparate ./apparate
```

验证 DaemonSet：

```bash
kubectl get daemonset -A | grep apparate
# expected: DESIRED = READY, 所有有加速标签的节点均已运行
```

### 步骤7：部署加速镜像

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-accelerated
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-accelerated
  template:
    metadata:
      labels:
        app: nginx-accelerated
    spec:
      nodeSelector:
        cloud.tencent.com/apparate: "true"
      containers:
        - name: nginx
          image: <RegistryDomain>/<Namespace>/nginx:latest-apparate
          ports:
            - containerPort: 80
```

```bash
kubectl apply -f nginx-accelerated.yaml
# 验证 Pod 状态
kubectl get pods -l app=nginx-accelerated
# expected: STATUS: Running
```

## 验证

### 控制面（tccli）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 加速服务已开启 | `DescribeImageAccelerateService --RegistryId '<RegistryId>' --region <Region>` | `IsEnable: true`，`Status: "Running"`，`CFSVIP` 非空 |
| 加速服务未开启（正常） | 同上 | `IsEnable: false`，`Status: ""`（基础版或未开启时的预期行为） |
| 实例规格满足要求 | `DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --filter "Registries[0].RegistryType"` | `"standard"` 或 `"premium"` |
| VPC 接入状态正常 | `DescribeInternalEndpoints --RegistryId '<RegistryId>' --region <Region>` | `AccessVpcSet` 含目标 VPC，`Status: "Running"` |

### 数据面（kubectl/docker）

| 验证项 | 命令 | 预期 |
|--------|------|------|
| 节点标签已生效 | `kubectl get nodes -l cloud.tencent.com/apparate=true` | 至少一个节点 |
| 加速 DaemonSet 运行 | `kubectl get ds -A \| grep apparate` | DESIRED = READY |
| 加速镜像 Pod Running | `kubectl get pods -l app=nginx-accelerated` | STATUS: Running |
| 镜像自动转换 | `docker pull <RegistryDomain>/<Namespace>/nginx:latest-apparate` | 拉取成功，`-apparate` 后缀镜像存在 |

## 清理

> **副作用警告**：删除镜像加速服务后，CFS 存储挂载点将被释放，已转换的 `-apparate` 加速镜像恢复为普通拉取模式（全量下载+解压），不再享受 lazy loading。已部署的加速 Pod 不受影响，但新 Pod 启动速度退回普通模式。

### 控制面（tccli）

```bash
# 确认当前加速服务状态
tccli tcr DescribeImageAccelerateService --RegistryId '<RegistryId>' --region <Region> --output json

# 删除加速服务
tccli tcr DeleteImageAccelerateService --RegistryId '<RegistryId>' --region <Region> --output json
# expected: exit 0，返回 RequestId

# 确认已关闭
tccli tcr DescribeImageAccelerateService --RegistryId '<RegistryId>' --region <Region> --output json
# expected: IsEnable: false
```

### 数据面（kubectl/Helm）

```bash
helm uninstall apparate
kubectl delete deployment nginx-accelerated
kubectl label node <node-name> cloud.tencent.com/apparate-
# 确认 DaemonSet 已移除
kubectl get ds -A | grep apparate
# expected: 无输出
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `CreateImageAccelerationService` 返回 `FailedOperation` | `tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --filter "Registries[0].RegistryType"` | 实例 tier 不支持（basic）或依赖资源未就绪 | basic → standard 升级：`tccli tcr ModifyInstance --RegistryId <RegistryId> --RegistryType standard --region <Region>`。确认 Status=Running 后重试 |
| `CreateImageAccelerationService` 返回 `InvalidParameter` 提示 "invalid backend type" | 检查 JSON 中 `StorageType` 字段值 | `StorageType` 不为 `cfs` | 将 `StorageType` 改为 `"cfs"`（当前仅支持此值） |
| `CreateImageAccelerationService` 返回 `InvalidParameter.VpcId` | `tccli vpc DescribeVpcs --vpc-ids '["<VpcId>"]' --region <Region>` | VpcId 不存在或不可达 | 确认 VPC ID 正确且 VPC 状态为可用 |
| `CreateImageAccelerationService` 返回 `InvalidParameter.SubnetId` | `tccli vpc DescribeSubnets --subnet-ids '["<SubnetId>"]' --region <Region>` | SubnetId 不存在或与 Zone 不匹配 | 确认 SubnetId 与 Zone 一致，子网状态正常 |
| `CreateImageAccelerationService` 返回 `InvalidParameter.Zone` | 检查 Zone 是否与 Subnet 所在 Zone 一致 | Zone 不可用或与 Subnet 不匹配 | 通过 `vpc DescribeSubnets` 获取子网所在的 Zone，确保 `CreateImageAccelerationService` 中 Zone 与之匹配 |
| `DescribeImageAccelerateService` 返回 `IsEnable: false`, `Status: ""` | `DescribeInstances --Registryids '["<RegistryId>"]' --region <Region> --filter "Registries[0].RegistryType"` | 实例为 basic（不支持加速）或加速服务尚未开启 | basic → standard 升级；standard+/premium → 执行 `CreateImageAccelerationService` |

### 创建成功但功能异常

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 推送镜像后未自动生成 `-apparate` 后缀镜像 | `docker manifest inspect <RegistryDomain>/<Namespace>/<image>:latest-apparate` | 镜像不匹配已有加速规则 | 通过控制台调整加速规则，覆盖目标命名空间/仓库/Tag |
| 加速 DaemonSet 未调度 | `kubectl describe node <node-name>` 查看 Labels | 节点未添加加速标签 | `kubectl label node <node-name> cloud.tencent.com/apparate=true` |
| Pod 无法拉取 `-apparate` 镜像 | `kubectl describe pod <pod-name>` 查看 Events | 缺少 imagePullSecrets 或节点无加速标签 | 确认 Helm values.yaml 中已配置 TCR 访问凭证，确认节点加速标签已添加 |
| 安装加速套件后节点 NotReady | `kubectl get nodes`；`kubectl describe node <node-name>` | containerd < 1.4.3 不兼容加速套件 | 升级节点 containerd 至 >= 1.4.3，或卸载加速套件 `helm uninstall apparate` |

## 下一步

- [跨实例（账号）同步镜像](../cross-instance-sync)（page_id `41945`）——跨账号分发加速镜像
- [容器镜像安全扫描](../../image-security/vulnerability-scan)（page_id `48185`）——对加速镜像执行安全扫描
- [内网访问控制](../../access/network/private-access)——确保集群 VPC 已接入实例

## 控制台替代

[容器镜像服务控制台 → 镜像加速](https://console.cloud.tencent.com/tcr/accelerate)：选择实例 → 开启镜像加速 → 添加规则 → 推送镜像 → TKE 集群侧配置标签并安装加速套件 → 部署加速镜像。
