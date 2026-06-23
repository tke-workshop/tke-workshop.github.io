---
title: "销毁退还实例（tccli）"
description: "· page_id `51111`"
---

> 对照官方：[销毁退还实例](https://cloud.tencent.com/document/product/1141/51111) · page_id `51111`

## 概述

通过 `tccli tcr DeleteInstance` 销毁退还 TCR **企业版**实例。

> **危险操作：实例删除将永久清除其下的所有命名空间、镜像仓库、Helm Chart、安全策略、访问令牌、触发器、复制规则、内部访问端点、自定义域名配置及关联的 COS 存储数据。数据不可恢复！执行前务必完成全部前置检查。**

按量计费实例销毁后不再产生费用；包年包月实例按使用时长比例退还至腾讯云账户（含现金和赠送金部分）。详见[退费说明](https://cloud.tencent.com/document/product/1141/53319)。

## 前置条件

- 完成 [环境准备](../index.md)（`tccli` 已安装并配置凭证）。
- 待销毁实例存在且当前操作账号具有 `tcr:DeleteInstance` 权限。
- **实例下的所有命名空间和仓库已清空**，否则 `DeleteInstance` 将返回错误。
- **实例的跨地域同步复制规则已全部删除**，否则 `DeleteInstance` 将返回 `please delete the replication rule first` 错误。
- **若当前实例是从（被复制）实例或有从实例，需先删除所有从实例**，否则删除将被阻止。
- 若实例开启了**删除保护**（`DeletionProtection`），需先关闭（见步骤2）。

### 销毁前检查清单

| 检查项 | 命令 | 通过标准 |
|--------|------|---------|
| 实例是否开启删除保护 | `DescribeInstances` 查看 `DeletionProtection` | 必须为 `false`（若为 `true` 先执行 `ModifyInstance` 关闭） |
| 命名空间是否已清空 | `DescribeNamespaces` | `NamespaceList` 为空或 `TotalCount` 为 `0` |
| 仓库是否已清空 | `DescribeRepositories` | `TotalCount` 为 `0` |
| 镜像是否已清空 | `DescribeImages` | `ImageInfoList` 为空，`TotalCount` 为 `0` |
| Helm Chart 是否已清理 | 删除所有仓库后自动清空 | 仓库清空后 Chart 数据一同删除 |
| 访问令牌是否已清理 | `DescribeInstanceToken` | `TotalCount` 为 `0` |
| 安全策略是否已清理 | `DescribeSecurityPolicies` | 白名单为空 |
| 跨地域同步复制是否已停止 | `DescribeReplicationInstances` | `TotalCount` 为 `0`，`ReplicationRegistries` 为 `null` |
| 触发器是否已删除 | `DescribeWebhookTrigger` | `TotalCount` 为 `0` |
| 外部/内部访问端点是否已关闭 | `ManageExternalEndpoint` / `ManageInternalEndpoint` | 所有端点已关闭 |
| 自定义域名是否已解绑 | `DescribeInstanceCustomizedDomain` | `TotalCount` 为 `0` |

## 控制台与 CLI 参数映射

| 控制台操作 | CLI | 幂等 |
|-----------|-----|------|
| 实例列表 → 选择实例 | `DescribeInstances` 定位 `RegistryId` | 是 |
| 更多 → 销毁/退还 | `DeleteInstance` | 是（重复删除不存在的实例返回 `ResourceNotFound`） |
| 勾选「随实例删除 COS 存储桶」 | `--DeleteBucket true` | — |
| 检查实例状态 | `DescribeInstanceStatus` | 是 |
| 退还款项（控制台自动处理） | API 无退款参数 | — |

## 操作步骤

### 步骤1：确认待销毁实例的 RegistryId

列出当前地域所有企业版实例：

```bash
tccli tcr DescribeInstances --region ap-guangzhou --output json
```

**Output:**

```json
{
    "TotalCount": 1,
    "Registries": [
        {
            "RegistryId": "tcr-0e2hz15l",
            "RegistryName": "kerwinwjyan-rewrite-001",
            "RegistryType": "basic",
            "Status": "Running",
            "PublicDomain": "kerwinwjyan-rewrite-001.tencentcloudcr.com",
            "InternalEndpoint": "10.1.67.13",
            "EnableAnonymous": true,
            "TokenValidTime": 87600,
            "PayMod": 0,
            "DeletionProtection": false,
            "EnableCosMAZ": false,
            "EnableCosVersioning": false
        }
    ],
    "RequestId": "5dcfc309-f2f9-4038-b831-f75acd4fa794"
}
```

按名称精确筛选：

```bash
tccli tcr DescribeInstances --region ap-guangzhou --output json \
  --filter "Registries[?RegistryName=='<RegistryName>']"
```

记录待销毁实例的 `RegistryId`。

### 步骤2：检查并关闭删除保护

查看实例是否开启删除保护：

```bash
tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region ap-guangzhou --output json \
  --filter "Registries[?RegistryId=='<RegistryId>'] | [0].DeletionProtection"
```

若返回 `true`，需先关闭：

```bash
tccli tcr ModifyInstance \
  --RegistryId '<RegistryId>' \
  --DeletionProtection false \
  --region ap-guangzhou \
  --output json
```

> 关闭删除保护后，建议再次执行查询确认 `DeletionProtection` 已变为 `false`。

### 步骤3：检查跨地域同步复制

确认实例无复制规则和从实例。若有，需先全部删除，否则 `DeleteInstance` 将被阻止：

```bash
tccli tcr DescribeReplicationInstances --RegistryId '<RegistryId>' --region ap-guangzhou --output json
```

**Output（无复制关系）：**

```json
{
    "TotalCount": 0,
    "ReplicationRegistries": null,
    "RequestId": "d94482cb-5f85-43f3-80a5-f0263faff798"
}
```

> 若 `TotalCount > 0`，需逐条删除复制规则，直至本命令返回 `TotalCount: 0`。详见[排障](#排障)。

### 步骤4：检查实例状态

确认实例当前状态正常：

```bash
tccli tcr DescribeInstanceStatus --RegistryIds '["<RegistryId>"]' --region ap-guangzhou --output json
```

**Output:**

```json
{
    "RegistryStatusSet": [
        {
            "RegistryId": "tcr-xxxxxxxx",
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
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

> **注意：** 销毁退还实例是高危操作。请确保已删除实例下的所有命名空间、仓库、镜像和 Helm Chart。删除命名空间与仓库参见[管理命名空间](https://cloud.tencent.com/document/product/1141/41803)与[管理镜像仓库](https://cloud.tencent.com/document/product/1141/41811)。

### 步骤5：执行销毁退还实例

> **以下命令仅作文档示例，未在验证实例上实际执行。实例保留用于后续文档验证。**

#### 仅删除实例（保留 COS 存储桶）

```bash
tccli tcr DeleteInstance --RegistryId '<RegistryId>' --region ap-guangzhou --output json
```

**Output:**

```json
{
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `RegistryId` | String | **是** | 待销毁的实例 ID |
| `DeleteBucket` | Boolean | 否 | 是否同时删除关联 COS 存储桶，默认 `false` |

#### 同时删除后端 COS 存储桶

如确认不再需要实例中的镜像、Chart 等底层数据，可一并删除 COS 桶避免产生后续费用：

```bash
tccli tcr DeleteInstance --RegistryId '<RegistryId>' --DeleteBucket true --region ap-guangzhou --output json
```

> **严重警告（请逐条确认后再执行）：**
> 
> - **带 `--DeleteBucket true` 的删除不可逆！** COS 桶中所有镜像层（layer blob）、Helm Chart 包、安全扫描结果、GC 历史记录将被永久清除，无法通过任何方式恢复。
> - **级联删除范围：** `DeleteInstance` 将一并清除以下全部资源（单次 API 调用即可生效，无二次确认机会）：
>   - 所有命名空间（含自动创建和手动创建的）
>   - 所有镜像仓库及其中全部 tag
>   - 所有 Helm Chart（OCI 制品）
>   - 所有安全策略（白名单、黑名单）
>   - 所有访问令牌（长期/临时 token）
>   - 所有触发器（webhook trigger）
>   - 所有 tag 保留规则与不可变规则
>   - 所有自定义域名绑定
>   - 内部/外部访问端点配置
>   - 服务账号及其权限
>   - 跨地域同步复制配置
>   - 若指定 `--DeleteBucket true`，COS 桶及其所有对象一并删除
> - 若账户已欠费，COS 不允许直接删除关联 Bucket，此时不要使用 `--DeleteBucket true`。正常删除实例后，前往 [COS 控制台](https://console.cloud.tencent.com/cos) 手动管理该 Bucket。
> - 包年包月实例销毁后，按购买时支付的现金及赠送金按使用时长比例退还，详见[退费说明](https://cloud.tencent.com/document/product/1141/53319)。
> - **建议在执行删除前，先用 `DescribeInstances` + `DescribeRepositories` + `DescribeImages` + `DescribeNamespaces` 完整审计实例下的资源清单，确保无遗漏。**

## 验证

### Control plane (tccli)

确认实例已从列表中消失：

```bash
tccli tcr DescribeInstances --Registryids '["<RegistryId>"]' --region ap-guangzhou --output json
```

预期 `TotalCount: 0`，`Registries` 为空数组：

```json
{
    "TotalCount": 0,
    "Registries": [],
    "RequestId": "00000000-0000-0000-0000-000000000000"
}
```

| 验证项 | 命令 | 期望结果 |
|--------|------|---------|
| 实例已删除 | `DescribeInstances --Registryids '["<RegistryId>"]'` | `TotalCount: 0`，`Registries: []` |
| COS 桶已删除（若指定） | COS 控制台确认 | 关联 COS 桶不再出现在实例关联的存储桶列表中 |
| 不再产生费用 | 费用中心 → 账单详情 | 按量计费实例删除后该 `RegistryId` 不再有扣费记录 |

### Data plane

实例删除后，其域名将立即失效：

```bash
docker login <RegistryName>.tencentcloudcr.com
# 预期：Login failed — 域名解析或服务不可用
```

## 清理

`DeleteInstance` 本身即为清理操作。以下为删除后仍需关注的事项：

### 若保留了 COS Bucket（未携带 `--DeleteBucket`）

前往 [COS 控制台](https://console.cloud.tencent.com/cos) 手动评估和清理。COS 桶保留期间仍会产生存储费用。查找方法：

1. 桶命名规则：`tcr-<RegistryId>-<AppId>`
2. 确认桶内无其他实例共享数据后，可在 COS 控制台直接删除

### 若指定了 `--DeleteBucket true`

无需额外操作，COS 桶已随实例一并删除。但仍建议登录 COS 控制台确认桶列表中无残留。

### 清理验证清单

| 验证项 | 方法 | 说明 |
|--------|------|------|
| 实例记录已消失 | `DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>` | 返回 `TotalCount: 0` |
| COS 桶已清理（若指定） | [COS 控制台](https://console.cloud.tencent.com/cos) 桶列表 | 无 `tcr-<RegistryId>-*` 前缀的桶 |
| 自定义域名已释放 | DNS 管理控制台 | CNAME 记录指向的 TCR 域名已失效，可删除该 DNS 记录 |
| VPC 内网解析已清除 | PrivateDNS 控制台 | 实例关联的私有域自动释放 |

## 排障

### 删除前检查失败

| 现象 | 诊断命令 | 根因 | 修复 |
|------|---------|------|------|
| 实例不在列表中 | `DescribeInstances --Registryids '["<RegistryId>"]' --region <Region>` | 实例已被他人删除或 RegistryId 错误 | 确认 RegistryId 是否正确；若已删除无需再操作 |
| `DeletionProtection` 为 `true` | `DescribeInstances` 查看 `DeletionProtection` 字段 | 实例开启了删除保护 | `ModifyInstance --DeletionProtection false` 关闭保护后重试 |
| `DescribeNamespaces` 返回 `TotalCount > 0` | `DescribeNamespaces --RegistryId <RegistryId> --region <Region>` | 实例下仍有命名空间（含自动创建的） | 逐一 `DeleteNamespace` 清空所有命名空间 |
| `DescribeRepositories` 返回 `TotalCount > 0` | `DescribeRepositories --RegistryId <RegistryId> --region <Region>` | 命名空间下仍有仓库 | 逐一 `DeleteRepository` 清空所有仓库 |
| `DescribeReplicationInstances` 返回 `TotalCount > 0` | `DescribeReplicationInstances --RegistryId <RegistryId> --region <Region>` | 存在跨地域同步从实例或复制规则 | 先删除所有从实例和复制规则 |

### 删除命令返回错误

| 现象 | 诊断 | 根因 | 修复 |
|------|------|------|------|
| `DeleteInstance` 返回 `ResourceNotFound` | — | 实例已不存在或被他人删除 | 无需再次操作；确认是否误填了 RegistryId |
| 删除报错「please delete the replication rule first」 | `tccli tcr DescribeReplicationInstances --RegistryId <RegistryId> --region <Region>` 查看从实例列表 | 实例存在跨地域同步复制规则 | 先逐一删除所有复制规则和从实例，直至 `DescribeReplicationInstances` 返回 `TotalCount: 0` |
| 删除报错「has N replication registry」 | 同上 | 当前实例为主实例，仍有 N 个从实例未删除 | 在控制台或通过 API 逐一 `DeleteReplicationInstance` 删除所有从实例，确认 `DescribeReplicationInstances` 返回空后再删主实例 |
| 删除报错「please delete namespace or repository first」 | `tccli tcr DescribeNamespaces --RegistryId <RegistryId> --region <Region>` 检查残留 | 实例下仍有命名空间或仓库（含自动创建的） | 先 `DeleteNamespace` / `DeleteRepository` 清空所有资源 |
| 欠费状态下 `--DeleteBucket true` 失败 | — | COS 拒绝删除欠费账户的 Bucket | 不携带 `--DeleteBucket`，正常删除实例后前往 [COS 控制台](https://console.cloud.tencent.com/cos) 手动清理 Bucket |
| `DeleteInstance` 被拒绝，无明确错误信息 | `DescribeInstances` 检查 `DeletionProtection` | 实例开启了 `DeletionProtection` | 执行 `ModifyInstance --DeletionProtection false` 关闭保护后重试 |
| 实例删除耗时过长 | `DescribeInstances` 轮询确认状态 | 后端清理异步进行，涉及 COS 桶、PrivateDNS、VPC 端点等多资源回收 | 等待数分钟后通过 `DescribeInstances` 确认；若超过 10 分钟仍未消失，[在线咨询](https://cloud.tencent.com/online-service?from=doc_1141) |
| `UnauthorizedOperation` | — | 子账号缺少 `tcr:DeleteInstance` 权限 | 联系主账号授予 `QcloudTCRFullAccess` 或包含 `tcr:DeleteInstance` 的最小权限策略 |
| 状态异常无法删除 | `DescribeInstanceStatus` 检查当前状态 | 实例处于 `Deploying`、`Unhealthy` 等非 `Running` 状态 | 等待状态恢复为 `Running`；若长时间处于异常状态，[在线咨询](https://cloud.tencent.com/online-service?from=doc_1141) |
| `FailedOperation.EmptyCoreBody` | — | 后端服务内部异常 | 稍后重试；若持续失败，联系技术支持 |

### 常见误操作预防

| 场景 | 预防措施 |
|------|---------|
| 误删生产实例 | 生产实例开启 `DeletionProtection: true`（`ModifyInstance`），需双重确认才能删除 |
| 误删 COS 桶导致镜像数据丢失 | 不携带 `--DeleteBucket`，保留 COS 桶作为最后的数据备份 |
| 误删有从实例的主实例 | 删除主实例前，`DescribeReplicationInstances` 确认无复制关系 |
| 包年包月实例误删产生退费损失 | 确认退费金额（参考[退费说明](https://cloud.tencent.com/document/product/1141/53319)）后再操作 |

## 下一步

- [创建企业版实例](../create)（page_id `51110`） — 重新购买实例
- [企业版快速入门](../../quickstart/enterprise)（page_id `39287`） — 完整端到端流程
- [退费说明](https://cloud.tencent.com/document/product/1141/53319) — 包年包月退费计算规则
- [ModifyInstance](https://cloud.tencent.com/document/api/1141/57155) — 实例属性修改 API 参考
- [环境准备](../index.md) — 返回 TCR 工具链入口

## 控制台替代

[容器镜像服务控制台 → 实例管理](https://console.cloud.tencent.com/tcr/instance)：选择目标实例右侧 **更多** > **销毁/退还** → 系统将自动检查实例下是否存在命名空间/仓库/复制实例等残留资源 → 按需勾选「随实例删除关联的 COS 存储桶」→ 确认操作。
