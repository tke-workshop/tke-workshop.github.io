---
title: "自定义控制面组件参数"
description: "· page_id `47775` · tccli ≥3.1.107 · API 2018-05-25"
---

> 对照官方：[自定义控制面组件参数](https://cloud.tencent.com/document/product/457/47775) · page_id `47775` · tccli ≥3.1.107 · API 2018-05-25

## 概述

通过 `ModifyClusterExtraArgs` API 对 TKE 托管集群的控制面组件（kube-apiserver、kube-controller-manager、kube-scheduler）设置自定义启动参数。

**参数格式**：API 使用 `key=value` 格式（如 `goaway-chance=0.001`），区别于 kube-apiserver 的命令行格式 `--flag=value`。参数以字符串数组传入，通过 `--cli-input-json file://...` 指定嵌套 JSON 结构——不支持 `--KubeAPIServer` 等顶层参数。

**关键 API**：`DescribeClusterAvailableExtraArgs`（参数发现）返回指定集群版本和类型下所有可配置的参数完整目录（含名称、类型、用途、默认值、约束范围），是修改参数前的必读参考。

**异步与互斥**：`ModifyClusterExtraArgs` 返回 RequestId 后控制面组件需约 2 分钟滚动更新才能生效。期间同类修改任务互斥——不能并发提交第二个 `ModifyClusterExtraArgs` 请求。

| 组件 | API 字段 | 托管集群备注 |
|------|---------|------------|
| kube-apiserver | `KubeAPIServer` | 15 个可用参数（1.32.2 版本） |
| kube-controller-manager | `KubeControllerManager` | 36 个可用参数 |
| kube-scheduler | `KubeScheduler` | 5 个可用参数 |
| etcd | `Etcd` | 托管集群不暴露自定义参数，初始为 `null`，修改过其他组件后变为 `[]` |

## 前置条件

- [环境准备](../../../../index.md)

### 环境检查

```bash
# 1. 检查 tccli 版本
tccli --version
# expected: tccli version >= 1.0.0

# 2. 检查当前凭据和地域
tccli configure list
# expected: secretId, secretKey, region 均已配置，region 为目标地域

# 3. 检查 CAM 权限
#    需要: tke:DescribeClusterExtraArgs, tke:ModifyClusterExtraArgs,
#          tke:DescribeClusterAvailableExtraArgs, tke:DescribeClusters,
#          tke:DescribeMasterComponent, tke:DescribeClusterControllers
# 验证：执行 DescribeClusters 确认权限
tccli tke DescribeClusters --region <Region>
# expected: exit 0，返回集群列表（可为空）
```

### 资源检查

```bash
# 4. 确认目标集群存在且状态为 Running
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: ClusterStatus: "Running"

# 5. 查询当前参数快照（记录基线，用于回滚）
tccli tke DescribeClusterExtraArgs --region <Region> --ClusterId <ClusterId>
# expected: exit 0，各组件当前自定义参数
```

**预期输出**：

```json
{
    "ClusterExtraArgs": {
        "Etcd": null,
        "KubeAPIServer": [],
        "KubeControllerManager": [],
        "KubeScheduler": []
    },
    "RequestId": "..."
}
```

> `Etcd: null` 表示托管集群 etcd 不暴露自定义参数。其他三个组件为空数组表示未设置任何自定义参数。

```bash
# 6. 查询可用参数列表（修改前必做——确认参数名、类型、约束范围）
tccli tke DescribeClusterAvailableExtraArgs \
    --region <Region> \
    --ClusterVersion <ClusterVersion> \
    --ClusterType MANAGED_CLUSTER
# expected: 返回 KubeAPIServer、KubeControllerManager、KubeScheduler 各组件完整参数目录
```

## 控制台与 CLI 参数映射

| 控制台操作 | tccli 命令 | 幂等 |
|-----------|-----------|:--:|
| 查看可用参数列表 | `DescribeClusterAvailableExtraArgs` | 是 |
| 查看当前参数 | `DescribeClusterExtraArgs` | 是 |
| 设置自定义参数 | `ModifyClusterExtraArgs` | 是 |
| 查看控制面组件状态 | `DescribeMasterComponent` | 是 |
| 查看控制器状态 | `DescribeClusterControllers` | 是 |

### 关键字段说明

`ModifyClusterExtraArgs` 必须通过 `--cli-input-json file://...` 传入嵌套 JSON，不支持 `--KubeAPIServer` 等顶层参数。完整参数结构见下文 JSON 示例。

| 字段 | 类型 | 必填 | 取值与约束 | 错误后果 |
|------|------|:--:|------|------|
| `ClusterId` | String | 是 | 格式 `cls-xxxxxxxx`。`tccli tke DescribeClusters` 获取 | 集群不存在 → `InvalidParameter.ClusterId` |
| `ClusterExtraArgs.KubeAPIServer` | Array[String] | 否 | `["key=value", ...]`，格式 `key=value`（不带 `--` 前缀）。15 个可用参数，具体见 `DescribeClusterAvailableExtraArgs` | 使用 `--flag=value` 格式 → 参数不会被正确应用 |
| `ClusterExtraArgs.KubeControllerManager` | Array[String] | 否 | 同上，36 个可用参数 | 同上 |
| `ClusterExtraArgs.KubeScheduler` | Array[String] | 否 | 同上，5 个可用参数 | 同上 |
| `ClusterExtraArgs.Etcd` | Array[String] | 否 | 托管集群不暴露自定义参数，传 `[]` 或不传 | 传非空值 → 可能被忽略或报错 |

## 操作步骤

### 步骤 1：查询可用参数目录

修改前必须先了解哪些参数可用、类型是什么、约束范围是多少。`DescribeClusterAvailableExtraArgs` 是官方页面未列出但极其关键的 API。

```bash
tccli tke DescribeClusterAvailableExtraArgs \
    --region <Region> \
    --ClusterVersion <ClusterVersion> \
    --ClusterType MANAGED_CLUSTER
# expected: exit 0，返回三个组件的完整参数目录
```

**预期输出**（节选，完整列表含 KubeAPIServer 15 个、KubeControllerManager 36 个、KubeScheduler 5 个参数）：

```json
{
    "ClusterVersion": "1.32.2",
    "AvailableExtraArgs": {
        "KubeAPIServer": [
            {
                "Name": "goaway-chance",
                "Type": "float",
                "Usage": "To prevent HTTP/2 clients from getting stuck on a single apiserver...",
                "Default": "0",
                "Constraint": "[0,0.02]"
            },
            {
                "Name": "max-requests-inflight",
                "Type": "int",
                "Usage": "The maximum number of non-mutating requests in flight...",
                "Default": "400",
                "Constraint": "[1, 3000]"
            },
            {
                "Name": "max-mutating-requests-inflight",
                "Type": "int",
                "Usage": "The maximum number of mutating requests in flight at a given time...",
                "Default": "200",
                "Constraint": "[1, 2000]"
            },
            {
                "Name": "feature-gates",
                "Type": "mapStringBool",
                "Usage": "A set of key=value pairs that describe feature gates for alpha/experimental features",
                "Default": "",
                "Constraint": "('PodShareProcessNamespace=true', 'DynamicKubeletConfig=true', 'DebugContainers=true')"
            },
            {
                "Name": "request-timeout",
                "Type": "duration",
                "Usage": "An optional field indicating the duration a handler must keep a request open before timing it out...",
                "Default": "1m0s",
                "Constraint": "[10s, 5m]"
            },
            {
                "Name": "tls-min-version",
                "Type": "string",
                "Usage": "Minimum TLS version supported...",
                "Default": "",
                "Constraint": "('VersionTLS10','VersionTLS11','VersionTLS12','VersionTLS13')"
            }
        ],
        "KubeControllerManager": [
            {
                "Name": "kube-api-burst",
                "Type": "int32",
                "Default": "30",
                "Constraint": "[1, 2000]"
            },
            {
                "Name": "kube-api-qps",
                "Type": "float32",
                "Default": "20",
                "Constraint": "[1,2000]"
            },
            {
                "Name": "node-monitor-grace-period",
                "Type": "duration",
                "Default": "40s",
                "Constraint": "[1s, 24h]"
            }
        ],
        "KubeScheduler": [
            {
                "Name": "v",
                "Type": "int32",
                "Default": "3",
                "Constraint": "[0,10]"
            },
            {
                "Name": "kube-api-burst",
                "Type": "int32",
                "Default": "100",
                "Constraint": "[1, 2000]"
            },
            {
                "Name": "kube-api-qps",
                "Type": "float32",
                "Default": "50",
                "Constraint": "[1, 2000]"
            }
        ]
    },
    "RequestId": "..."
}
```

| 字段 | 含义 |
|------|------|
| `Name` | 参数名（即 API 中使用的 key，如 `goaway-chance`） |
| `Type` | 参数类型（`int`、`float`、`string`、`duration`、`mapStringBool` 等） |
| `Default` | 默认值（空字符串表示无预设默认值） |
| `Constraint` | 取值范围（区间 `[min,max]` 或枚举值列表） |
| `Usage` | 参数用途说明（仅部分参数有） |

### 步骤 2：查看当前参数快照

修改前务必查看当前配置，保存为回滚基线。

```bash
tccli tke DescribeClusterExtraArgs --region <Region> --ClusterId <ClusterId>
# expected: exit 0，记录修改前各组件参数值
```

**预期输出**（新集群基线）：

```json
{
    "ClusterExtraArgs": {
        "Etcd": null,
        "KubeAPIServer": [],
        "KubeControllerManager": [],
        "KubeScheduler": []
    },
    "RequestId": "..."
}
```

### 步骤 3：检查控制面组件运行状态

修改前确认组件健康，避免在异常状态下修改参数。

```bash
# 检查 kube-apiserver
tccli tke DescribeMasterComponent --region <Region> \
    --ClusterId <ClusterId> \
    --Component kube-apiserver
# expected: Status: "Running"

# 检查 kube-scheduler
tccli tke DescribeMasterComponent --region <Region> \
    --ClusterId <ClusterId> \
    --Component kube-scheduler
# expected: Status: "Running"

# 检查 kube-controller-manager
tccli tke DescribeMasterComponent --region <Region> \
    --ClusterId <ClusterId> \
    --Component kube-controller-manager
# expected: Status: "Running"
```

**预期输出**（kube-apiserver）：

```json
{
    "Component": "kube-apiserver",
    "Status": "Running",
    "RequestId": "..."
}
```

（kube-scheduler）：

```json
{
    "Component": "kube-scheduler",
    "Status": "Running",
    "RequestId": "..."
}
```

（kube-controller-manager）：

```json
{
    "Component": "kube-controller-manager",
    "Status": "Running",
    "RequestId": "..."
}
```

### 步骤 4：设置自定义参数

#### 选择依据

- **参数格式**：使用 `key=value`（不加 `--` 前缀）。这是 `ModifyClusterExtraArgs` API 的参数格式，区别于 kube-apiserver 的命令行格式 `--flag=value`。真机测试 `goaway-chance=0.001` 验证通过。
- **API 调用方式**：必须通过 `--cli-input-json file:///tmp/input.json` 传入嵌套 JSON。不支持 `--KubeAPIServer` 等顶层参数——这些参数在 API skeleton 中不存在。
- **异步操作**：`ModifyClusterExtraArgs` 返回 RequestId 后立即完成 API 调用，但控制面组件参数的实际生效需要约 2 分钟（控制面滚动更新）。期间 `DescribeClusterExtraArgs` 可能仍返回旧值。
- **任务互斥**：同类修改任务不能并发。在一次 `ModifyClusterExtraArgs` 任务执行期间提交第二次，会返回 `OperationDenied: same type task in execution`。
- **参数发现**：修改前必须通过 `DescribeClusterAvailableExtraArgs` 确认参数名称、类型和约束范围，避免使用不存在的参数名或超出约束范围的值。

#### 最小修改（单参数，kube-apiserver）

创建输入文件 `extra-args.json`：

```json
{
    "ClusterId": "<ClusterId>",
    "ClusterExtraArgs": {
        "KubeAPIServer": ["goaway-chance=0.001"]
    }
}
```

```bash
tccli tke ModifyClusterExtraArgs --region <Region> \
    --cli-input-json file://extra-args.json
# expected: exit 0，返回 RequestId。控制面滚动更新约 2 分钟。
```

**预期输出**：

```json
{
    "RequestId": "..."
}
```

#### 增强修改（多参数，多组件）

创建输入文件 `extra-args-enhanced.json`：

```json
{
    "ClusterId": "<ClusterId>",
    "ClusterExtraArgs": {
        "KubeAPIServer": [
            "goaway-chance=0.001",
            "max-requests-inflight=600",
            "max-mutating-requests-inflight=300",
            "request-timeout=2m0s"
        ],
        "KubeControllerManager": [
            "kube-api-burst=50",
            "kube-api-qps=30",
            "node-monitor-grace-period=60s"
        ],
        "KubeScheduler": [
            "kube-api-qps=100"
        ]
    }
}
```

```bash
tccli tke ModifyClusterExtraArgs --region <Region> \
    --cli-input-json file://extra-args-enhanced.json
# expected: exit 0，返回 RequestId
```

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `<ClusterId>` | 集群 ID，格式 `cls-xxxxxxxx` | `tccli tke DescribeClusters --region <Region>` |
| `<ClusterVersion>` | K8s 版本，如 `1.32.2` | `tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'` |
| `<Region>` | 地域，如 `ap-guangzhou` | `tccli configure list` |

### 步骤 5：验证参数已生效

修改是异步操作，控制面滚动更新约需 2 分钟。轮询验证直到所有目标组件参数与修改值一致。

```bash
# 轮询查询——等待约 2 分钟后执行
tccli tke DescribeClusterExtraArgs --region <Region> --ClusterId <ClusterId>
# expected: KubeAPIServer 包含 "goaway-chance=0.001"
```

**预期输出**（修改生效后）：

```json
{
    "ClusterExtraArgs": {
        "Etcd": [],
        "KubeAPIServer": ["goaway-chance=0.001"],
        "KubeControllerManager": [],
        "KubeScheduler": []
    },
    "RequestId": "..."
}
```

> 注意：修改过 KubeAPIServer 后，`Etcd` 从 `null` 变为 `[]`。这是 DescribeClusterExtraArgs 的正常行为——托管集群 etcd 不暴露自定义参数，但修改任一组件后查询结果中 Etcd 字段会从 null 变为空数组。

## 验证

### 控制面（tccli）

```bash
# 1. 确认所有组件参数与修改值一致
tccli tke DescribeClusterExtraArgs --region <Region> --ClusterId <ClusterId>
# expected: 目标组件参数列表与修改值完全一致

# 2. 确认集群状态为 Running
tccli tke DescribeClusters --region <Region> --ClusterIds '["<ClusterId>"]'
# expected: ClusterStatus: "Running"

# 3. 确认控制面组件运行状态
tccli tke DescribeMasterComponent --region <Region> \
    --ClusterId <ClusterId> \
    --Component kube-apiserver
# expected: Status: "Running"

# 4. 确认控制器状态
tccli tke DescribeClusterControllers --region <Region> --ClusterId <ClusterId>
# expected: route-controller 和 node-ipam-controller 均为 Enabled
```

**预期输出**（控制器状态）：

```json
{
    "ControllerStatusSet": [
        {"Name": "route-controller", "Enabled": true},
        {"Name": "node-ipam-controller", "Enabled": true}
    ],
    "RequestId": "..."
}
```

**预期输出**（参数一致性）：

```json
{
    "ClusterExtraArgs": {
        "Etcd": [],
        "KubeAPIServer": ["goaway-chance=0.001"],
        "KubeControllerManager": [],
        "KubeScheduler": []
    },
    "RequestId": "..."
}
```

| 验证维度 | 命令 | 预期 |
|---------|------|------|
| 参数一致性 | `DescribeClusterExtraArgs` | 目标组件参数与修改值完全一致 |
| 集群状态 | `DescribeClusters` | `ClusterStatus: "Running"` |
| 组件运行 | `DescribeMasterComponent`（三个组件各查一次） | 每个组件 `Status: "Running"` |
| 控制器状态 | `DescribeClusterControllers` | route-controller、node-ipam-controller 均为 Enabled |

## 清理

> **警告**：回退参数同样是异步操作，提交清空请求后需等待约 2 分钟控制面滚动更新完成。
> 错误参数可能导致控制面组件不可用。不要在 KubeAPIServer 中覆盖认证/授权相关参数。
> 修改后控制面滚动更新期间集群仍可对外服务，但 API Server 可能有短暂抖动。

### 1. 清理前状态检查

```bash
tccli tke DescribeClusterExtraArgs --region <Region> --ClusterId <ClusterId>
# 确认当前参数值，记录作为回滚目标基线
```

**预期输出**（修改后基线）：

```json
{
    "ClusterExtraArgs": {
        "Etcd": [],
        "KubeAPIServer": ["goaway-chance=0.001"],
        "KubeControllerManager": [],
        "KubeScheduler": []
    },
    "RequestId": "..."
}
```

### 2. 回退参数到默认

创建回退文件 `revert-args.json`：

```json
{
    "ClusterId": "<ClusterId>",
    "ClusterExtraArgs": {
        "KubeAPIServer": []
    }
}
```

```bash
tccli tke ModifyClusterExtraArgs --region <Region> \
    --cli-input-json file://revert-args.json
# expected: exit 0，返回 RequestId
```

> **注意**：`ModifyClusterExtraArgs` 是异步互斥操作。如果上一次修改任务还在执行中，提交回退请求会返回
> `OperationDenied: The operation you submit has a same type task in execution`。
> 解决方案：等待 `DescribeClusterExtraArgs` 确认上次修改已生效后，再提交回退请求。

### 3. 验证已清理

```bash
# 等待约 2 分钟后验证
tccli tke DescribeClusterExtraArgs --region <Region> --ClusterId <ClusterId>
# expected: KubeAPIServer、KubeControllerManager、KubeScheduler 均为 []，Etcd 为 null 或 []
```

**预期输出**（清理后基线）：

```json
{
    "ClusterExtraArgs": {
        "Etcd": null,
        "KubeAPIServer": [],
        "KubeControllerManager": [],
        "KubeScheduler": []
    },
    "RequestId": "..."
}
```

## 排障

### 命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `ModifyClusterExtraArgs` 返回 `Unknown options: --KubeAPIServer` | 检查命令是否使用了 `--KubeAPIServer` 等顶层参数 | 使用了不存在的顶层参数——API skeleton 中只有 `--cli-input-json` 和 `--ClusterId`（顶层），`KubeAPIServer` 等是 `ClusterExtraArgs` 的嵌套子字段 | 改用 `--cli-input-json file://input.json` 传入嵌套 JSON。示例见 [步骤 4](#步骤-4设置自定义参数) |
| `ModifyClusterExtraArgs` 返回参数未被应用（无显式错误但参数不生效） | 检查 `ClusterExtraArgs` 数组元素格式 | 使用了 `--goaway-chance=0.001` 格式（带 `--` 前缀）而非 API 要求的 `key=value` 格式 | 改为 `goaway-chance=0.001`（不带 `--` 前缀）。API 参数格式为 `key=value`，不是 kube-apiserver 的命令行格式 |
| `ModifyClusterExtraArgs` 返回 `OperationDenied: The operation you submit has a same type task in execution` | 检查是否有正在进行中的 `ModifyClusterExtraArgs` 任务 | 同类修改任务互斥——在上一次 `ModifyClusterExtraArgs` 任务完成之前提交了第二次请求 | 等待约 2 分钟，用 `DescribeClusterExtraArgs` 确认上次修改已生效后重试。`ModifyClusterExtraArgs` 是异步互斥操作，不能并发执行 |
| `ModifyClusterExtraArgs` 返回 `InvalidParameter` | 检查参数名是否在 `DescribeClusterAvailableExtraArgs` 返回的可用列表中 | 参数名不存在于当前版本的可用参数目录中 | 先执行 `DescribeClusterAvailableExtraArgs --ClusterVersion <Version> --ClusterType MANAGED_CLUSTER` 确认参数名和约束范围 |

### 修改已提交但参数未生效

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| 返回了 RequestId 但 2 分钟后 `DescribeClusterExtraArgs` 仍显示旧值 | 再次执行 `DescribeClusterExtraArgs`，对比参数列表 | 控制面滚动更新尚未完成（正常行为，可能超过 2 分钟） | 继续等待，每 30 秒轮询一次。保留 Region、ClusterId、RequestId。超过 5 分钟仍未生效 → 登录 [TKE 控制台](https://console.cloud.tencent.com/tke2/cluster) 查看控制面状态 |
| 回退操作被 `OperationDenied` 拒绝 | 检查是否有前一次修改任务正在执行 | 前一次 `ModifyClusterExtraArgs` 任务尚未完成，同类任务互斥 | `DescribeClusterExtraArgs` 确认前次修改已生效 → 重试回退。见上表同名错误修复方案 |
| 修改后控制面组件状态异常 | `DescribeMasterComponent --Component kube-apiserver` 检查组件状态 | 参数值超出约束范围或与其他参数冲突 | `DescribeClusterAvailableExtraArgs` 确认参数的 `Constraint` 字段 → 调整为合法值 → 重新 `ModifyClusterExtraArgs` |

### 格式要求

- 排障过程中请保留 Region、ClusterId、RequestId 和修改前后的参数值，以备工单查询
- `OperationDenied: same type task in execution` 是 API 设计保证——不是 bug，等待即可
- 参数不存在于 `DescribeClusterAvailableExtraArgs` 列表中 → 请勿尝试传入未列出的参数名

## 下一步

- [DescribeClusterAvailableExtraArgs API 文档](https://cloud.tencent.com/document/api/457/92791) — 查询可用参数完整目录
- [升级集群](../upgrade) — 版本升级前确认自定义参数兼容性
- [连接集群](../connect) — 修改参数后验证控制面可达
- [集群管理模式说明](../management-modes) — 了解托管集群与独立集群的 etcd 差异

## 控制台替代

[TKE 控制台 → 集群详情 → 控制面组件参数](https://console.cloud.tencent.com/tke2/cluster/sub/detail/config)
