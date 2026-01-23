---
title: 策略管理
description: 本文介绍如何通过控制台、tccli、Python SDK、Go SDK 或 cURL 管理 TKE 集群的 OPA 策略
agent_ready: true
agent_rating: 5
api_reference: DescribeOpenPolicyList, ModifyOpenPolicyList
---

## 文档元信息

- **功能名称**: TKE 策略管理
- **API 版本**: 2018-05-25
- **适用集群版本**: Kubernetes 1.16+
- **文档更新时间**: 2026-01-08
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

TKE 策略管理基于 OPA Gatekeeper 实现，通过系统预置或用户自定义策略，对集群资源进行安全加固和配置管控，防止误操作和配置风险。

**任务目标**：查询和管理 TKE 集群的安全策略，包括删除防护、策略管控和安全加固。

**适用场景**：

- 防止误删除关键资源（如 Namespace、CoreDNS）
- 限制容器镜像来源，确保镜像可信
- 禁止创建特权容器，增强安全性
- 强制 Pod 配置健康检查

**Agent 友好度**：⭐⭐⭐⭐⭐

---

## 核心概念

### 策略分类

| 分类 | 说明 | 示例 |
|------|------|------|
| **基线策略** | TKE 内置，保护基础设施资源 | 存在节点的集群不允许删除 |
| **优选策略** | TKE 最佳实践，可按需开启 | 镜像来源限制、Namespace 删除保护 |
| **可选策略** | OPA Gatekeeper 策略库 | 禁止特权容器、强制健康检查 |

### 运行模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `dryrun` | 试运行，仅记录不拦截 | 策略测试阶段 |
| `deny` | 拦截违规请求 | 生产环境强制执行 |

### 预置策略列表

| 策略名称 | 分类 | 默认模式 | 说明 |
|----------|------|----------|------|
| 存在节点的集群不允许删除 | 基线 | deny | 集群有节点时需先下线才能删除 |
| 存在 Pod 的 Namespace 不允许删除 | 优选 | dryrun | Namespace 下有 Pod 时禁止删除 |
| CoreDNS 组件删除保护 | 优选 | 默认不创建 | 禁止删除 CoreDNS 相关资源 |
| 容器镜像来源限制 | 优选 | 默认不创建 | 只允许从指定仓库拉取镜像 |
| 禁止创建特权容器 | 可选 | - | 禁止 Pod 使用 privileged: true |
| 强制配置健康检查 | 可选 | - | 要求 Pod 必须配置 Probe |

---

## 前置条件

在执行操作前，必须满足以下条件：

- [ ] 已开通腾讯云账号并完成实名认证
- [ ] 已创建腾讯云 API 密钥 (SecretId 和 SecretKey)
- [ ] 账号具有 TKE 服务的管理权限 (QcloudTKEFullAccess 或 AdministratorAccess)
- [ ] 目标集群版本为 Kubernetes 1.16 及以上
- [ ] 目标集群类型为 TKE 标准集群或 TKE Serverless 集群
- [ ] 已安装并配置 tccli 工具（腾讯云 CLI）

### 检查清单

#### 1. 集群版本检查

```bash
tccli tke DescribeClusters \
  --Region ap-guangzhou \
  --ClusterIds '["cls-xxxxxxxx"]'

# 确认 ClusterVersion >= 1.16
```

#### 2. Gatekeeper 状态检查

```bash
kubectl get pods -n gatekeeper-system

# 确认 gatekeeper-controller-manager 和 gatekeeper-audit 运行正常
```

---

## 操作步骤

### 一、查询策略列表

=== "tccli"

    ```bash title="查询基线策略"
    tccli tke DescribeOpenPolicyList \
      --Region ap-guangzhou \
      --ClusterId cls-xxxxxxxx \
      --Category baseline
    ```

    ```bash title="查询优选策略"
    tccli tke DescribeOpenPolicyList \
      --Region ap-guangzhou \
      --ClusterId cls-xxxxxxxx \
      --Category priority
    ```

    ```bash title="查询可选策略"
    tccli tke DescribeOpenPolicyList \
      --Region ap-guangzhou \
      --ClusterId cls-xxxxxxxx \
      --Category optional
    ```

=== "Python SDK"

    ```python title="describe_policy_list.py" linenums="1"
    import json
    from tencentcloud.common import credential
    from tencentcloud.common.profile.client_profile import ClientProfile
    from tencentcloud.common.profile.http_profile import HttpProfile
    from tencentcloud.tke.v20180525 import tke_client, models

    # 配置认证信息
    cred = credential.Credential("your-secret-id", "your-secret-key")

    # 配置 HTTP 选项
    httpProfile = HttpProfile()
    httpProfile.endpoint = "tke.tencentcloudapi.com"

    # 配置客户端
    clientProfile = ClientProfile()
    clientProfile.httpProfile = httpProfile
    client = tke_client.TkeClient(cred, "ap-guangzhou", clientProfile)

    # 构造请求
    req = models.DescribeOpenPolicyListRequest()
    params = {
        "ClusterId": "cls-xxxxxxxx",
        "Category": "baseline"  # baseline, priority, optional
    }
    req.from_json_string(json.dumps(params))

    # 发送请求
    resp = client.DescribeOpenPolicyList(req)
    print(json.dumps(json.loads(resp.to_json_string()), indent=2, ensure_ascii=False))
    ```

=== "Go SDK"

    ```go title="describe_policy_list.go" linenums="1"
    package main

    import (
        "encoding/json"
        "fmt"
        "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
        "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
        tke "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/tke/v20180525"
    )

    func main() {
        // 配置认证信息
        credential := common.NewCredential("your-secret-id", "your-secret-key")

        // 配置客户端
        cpf := profile.NewClientProfile()
        cpf.HttpProfile.Endpoint = "tke.tencentcloudapi.com"
        client, _ := tke.NewClient(credential, "ap-guangzhou", cpf)

        // 构造请求
        request := tke.NewDescribeOpenPolicyListRequest()
        request.ClusterId = common.StringPtr("cls-xxxxxxxx")
        request.Category = common.StringPtr("baseline")

        // 发送请求
        response, err := client.DescribeOpenPolicyList(request)
        if err != nil {
            panic(err)
        }
        
        result, _ := json.MarshalIndent(response.Response, "", "  ")
        fmt.Println(string(result))
    }
    ```

=== "cURL"

    ```bash title="API 调用"
    curl -X POST "https://tke.tencentcloudapi.com" \
      -H "Content-Type: application/json" \
      -H "Authorization: TC3-HMAC-SHA256 ..." \
      -d '{
        "Action": "DescribeOpenPolicyList",
        "Version": "2018-05-25",
        "Region": "ap-guangzhou",
        "ClusterId": "cls-xxxxxxxx",
        "Category": "baseline"
      }'
    ```

    !!! warning "签名说明"
        cURL 调用需要计算 TC3-HMAC-SHA256 签名，建议使用 SDK 或 tccli。

**DescribeOpenPolicyList 请求参数**：

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|:----:|------|------|--------|
| ClusterId | 是 | String | 集群 ID | cls-xxxxxxxx |
| Category | 否 | String | 策略分类: baseline/priority/optional | baseline |

**响应参数说明**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| OpenPolicyInfoList | Array | 策略信息列表 |
| GatekeeperStatus | Integer | Gatekeeper 安装状态 (1=已安装) |
| RequestId | String | 请求唯一标识 |

**OpenPolicyInfo 结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| Name | String | 策略规则名称 |
| Kind | String | 策略类型 |
| PolicyName | String | 策略显示名称 |
| PolicyDesc | String | 策略描述 |
| EnabledStatus | String | 启用状态 (open/close) |
| EnforcementAction | String | 执行动作 (deny/dryrun) |
| EventNums | Integer | 命中事件数量 |

**响应示例**：

```json
{
  "Response": {
    "GatekeeperStatus": 1,
    "OpenPolicyInfoList": [
      {
        "Name": "block-cluster-deletion-rule",
        "Kind": "blockclusterdeletion",
        "PolicyName": "存在节点的集群不允许删除",
        "PolicyDesc": "集群中存在任意节点，需先下线节点后方可删除",
        "PolicyCategory": "cluster",
        "EnabledStatus": "open",
        "EnforcementAction": "deny",
        "EventNums": 0
      }
    ],
    "RequestId": "224782f1-c990-4383-8f21-bb369c9ca396"
  }
}
```

---

### 二、修改策略开关

=== "tccli"

    ```bash title="开启策略（deny 模式）"
    tccli tke ModifyOpenPolicyList \
      --Region ap-guangzhou \
      --ClusterId cls-xxxxxxxx \
      --Category optional \
      --OpenPolicyInfoList '[{
        "Name": "block-namespace-deletion-rule",
        "Kind": "blocknamespacedeletion",
        "EnforcementAction": "deny"
      }]'
    ```

    ```bash title="切换为试运行模式"
    tccli tke ModifyOpenPolicyList \
      --Region ap-guangzhou \
      --ClusterId cls-xxxxxxxx \
      --Category optional \
      --OpenPolicyInfoList '[{
        "Name": "block-namespace-deletion-rule",
        "Kind": "blocknamespacedeletion",
        "EnforcementAction": "dryrun"
      }]'
    ```

=== "Python SDK"

    ```python title="modify_policy.py" linenums="1"
    import json
    from tencentcloud.common import credential
    from tencentcloud.common.profile.client_profile import ClientProfile
    from tencentcloud.common.profile.http_profile import HttpProfile
    from tencentcloud.tke.v20180525 import tke_client, models

    # 配置认证信息
    cred = credential.Credential("your-secret-id", "your-secret-key")

    # 配置客户端
    httpProfile = HttpProfile()
    httpProfile.endpoint = "tke.tencentcloudapi.com"
    clientProfile = ClientProfile()
    clientProfile.httpProfile = httpProfile
    client = tke_client.TkeClient(cred, "ap-guangzhou", clientProfile)

    # 构造请求
    req = models.ModifyOpenPolicyListRequest()
    params = {
        "ClusterId": "cls-xxxxxxxx",
        "Category": "optional",
        "OpenPolicyInfoList": [
            {
                "Name": "block-namespace-deletion-rule",
                "Kind": "blocknamespacedeletion",
                "EnforcementAction": "deny"
            }
        ]
    }
    req.from_json_string(json.dumps(params))

    # 发送请求
    resp = client.ModifyOpenPolicyList(req)
    print(f"RequestId: {resp.RequestId}")
    ```

=== "Go SDK"

    ```go title="modify_policy.go" linenums="1"
    package main

    import (
        "fmt"
        "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
        "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
        tke "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/tke/v20180525"
    )

    func main() {
        // 配置认证信息
        credential := common.NewCredential("your-secret-id", "your-secret-key")

        // 配置客户端
        cpf := profile.NewClientProfile()
        cpf.HttpProfile.Endpoint = "tke.tencentcloudapi.com"
        client, _ := tke.NewClient(credential, "ap-guangzhou", cpf)

        // 构造请求
        request := tke.NewModifyOpenPolicyListRequest()
        request.ClusterId = common.StringPtr("cls-xxxxxxxx")
        request.Category = common.StringPtr("optional")
        request.OpenPolicyInfoList = []*tke.OpenPolicySwitch{
            {
                Name:              common.StringPtr("block-namespace-deletion-rule"),
                Kind:              common.StringPtr("blocknamespacedeletion"),
                EnforcementAction: common.StringPtr("deny"),
            },
        }

        // 发送请求
        response, err := client.ModifyOpenPolicyList(request)
        if err != nil {
            panic(err)
        }
        fmt.Printf("RequestId: %s\n", *response.Response.RequestId)
    }
    ```

=== "cURL"

    ```bash title="API 调用"
    curl -X POST "https://tke.tencentcloudapi.com" \
      -H "Content-Type: application/json" \
      -H "Authorization: TC3-HMAC-SHA256 ..." \
      -d '{
        "Action": "ModifyOpenPolicyList",
        "Version": "2018-05-25",
        "Region": "ap-guangzhou",
        "ClusterId": "cls-xxxxxxxx",
        "Category": "optional",
        "OpenPolicyInfoList": [
          {
            "Name": "block-namespace-deletion-rule",
            "Kind": "blocknamespacedeletion",
            "EnforcementAction": "deny"
          }
        ]
      }'
    ```

**ModifyOpenPolicyList 请求参数**：

| 参数名 | 必填 | 类型 | 说明 | 示例值 |
|--------|:----:|------|------|--------|
| ClusterId | 是 | String | 集群 ID | cls-xxxxxxxx |
| Category | 否 | String | 策略分类 | optional |
| OpenPolicyInfoList | 否 | Array | 策略修改列表 | 见下方 |

**OpenPolicySwitch 结构**：

| 字段 | 必填 | 类型 | 说明 |
|------|:----:|------|------|
| Name | 是 | String | 策略规则名称 |
| Kind | 是 | String | 策略类型 |
| EnforcementAction | 是 | String | 执行动作: deny/dryrun |

---

### 三、创建自定义策略实例

使用 kubectl 创建自定义策略实例（以禁止特权容器为例）：

=== "kubectl"

    ```yaml title="K8sPSPPrivilegedContainer.yaml" linenums="1"
    apiVersion: constraints.gatekeeper.sh/v1beta1
    kind: K8sPSPPrivilegedContainer
    metadata:
      name: psp-privileged-container
    spec:
      match:
        kinds:
          - apiGroups: [""]
            kinds: ["Pod"]
        namespaces: []                    # 空表示所有命名空间生效
        excludedNamespaces: ["kube-system"]  # 豁免的命名空间
      parameters:
        exemptInitContainers: true        # 是否允许 initContainer 使用特权
    ```

    ```bash title="应用策略"
    kubectl apply -f K8sPSPPrivilegedContainer.yaml
    ```

    ```bash title="验证策略"
    kubectl get K8sPSPPrivilegedContainer
    ```

**策略参数说明**：

| 参数 | 类型 | 说明 |
|------|------|------|
| namespaces | Array | 生效的命名空间（空表示全部生效） |
| excludedNamespaces | Array | 豁免的命名空间 |
| exemptInitContainers | Boolean | 是否允许 initContainer 使用特权 |

---

### 四、使用控制台

#### Step 1: 进入策略管理

1. 登录 [TKE 控制台](https://console.cloud.tencent.com/tke2)
2. 在左侧导航栏选择 **集群**
3. 点击目标集群名称进入集群详情
4. 在左侧菜单选择 **策略管理**

#### Step 2: 查看策略列表

1. 在策略管理页面，查看三类策略：
   - **基线策略**：系统内置，保护基础设施
   - **优选策略**：最佳实践，可按需开启
   - **可选策略**：OPA 策略库，自定义配置

#### Step 3: 开启/关闭策略

1. 找到目标策略
2. 点击 **开启** 或 **关闭** 按钮
3. 关闭策略需要二次确认

#### Step 4: 查看拦截记录

1. 点击策略关联事件的数字
2. 查看具体的拦截日志和详情

---

## 验证步骤

### Step 1: 验证策略生效

创建一个违规资源测试策略是否生效：

```yaml title="test-privileged-pod.yaml"
apiVersion: v1
kind: Pod
metadata:
  name: privileged-pod
  namespace: default
spec:
  containers:
  - name: privileged-container
    image: nginx
    securityContext:
      privileged: true
```

```bash
kubectl apply -f test-privileged-pod.yaml
```

**期望结果**（策略为 deny 模式时）：

```
Error from server (Forbidden): error when creating "test-privileged-pod.yaml": 
admission webhook "validation.gatekeeper.sh" denied the request: 
[psp-privileged-container] Privileged container is not allowed: privileged-container
```

### Step 2: 查询策略状态

```bash
tccli tke DescribeOpenPolicyList \
  --Region ap-guangzhou \
  --ClusterId cls-xxxxxxxx \
  --Category optional
```

**期望结果**：

```json
{
  "Response": {
    "OpenPolicyInfoList": [
      {
        "Name": "psp-privileged-container",
        "EnabledStatus": "open",
        "EnforcementAction": "deny",
        "EventNums": 1
      }
    ]
  }
}
```

### Step 3: 查看 Gatekeeper 状态

```bash
kubectl get pods -n gatekeeper-system
```

**期望结果**：

```
NAME                                            READY   STATUS    RESTARTS   AGE
gatekeeper-audit-xxxxxxxxxx-xxxxx               1/1     Running   0          1d
gatekeeper-controller-manager-xxxxxxxxxx-xxxxx  1/1     Running   0          1d
```

**状态说明**：

| 状态 | 说明 | 下一步操作 |
|------|------|----------|
| open + deny | 策略已启用，拦截违规请求 | 正常运行 |
| open + dryrun | 策略已启用，仅记录不拦截 | 观察命中情况后切换为 deny |
| close | 策略已关闭 | 根据需要开启 |

---

## 异常处理

### 常见错误码

| 错误码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|---------|
| FailedOperation.KubeClientCreate | 创建 kube client 失败 | 集群连接异常 | 检查集群状态和网络 |
| ResourceNotFound.LogCollectorClsLogTopicNotExists | CLS 日志主题不存在 | 日志配置异常 | 检查 CLS 配置 |
| InvalidParameter.ClusterNotFound | 集群不存在 | ClusterId 错误 | 检查集群 ID |
| UnauthorizedOperation | 未授权操作 | 权限不足 | 检查 CAM 策略权限 |

### 排查步骤

1. **检查 Gatekeeper 状态**：
   ```bash
   kubectl get pods -n gatekeeper-system
   kubectl logs -n gatekeeper-system -l control-plane=controller-manager
   ```

2. **查看约束状态**：
   ```bash
   kubectl get constraints
   kubectl describe <constraint-kind> <constraint-name>
   ```

3. **查看审计日志**：
   ```bash
   kubectl logs -n gatekeeper-system -l control-plane=audit-controller
   ```

4. **检查 Webhook 配置**：
   ```bash
   kubectl get validatingwebhookconfigurations gatekeeper-validating-webhook-configuration
   ```

---

## 高级配置

### 策略豁免配置

为特定命名空间或工作负载配置豁免：

```yaml title="豁免特定命名空间"
spec:
  match:
    excludedNamespaces:
      - kube-system
      - gatekeeper-system
      - monitoring
```

```yaml title="豁免特定标签的 Pod"
spec:
  match:
    labelSelector:
      matchExpressions:
        - key: "policy-exempt"
          operator: DoesNotExist
```

### 镜像来源白名单

限制只能从指定仓库拉取镜像：

```yaml title="镜像来源限制策略"
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: allowed-repos
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    repos:
      - "ccr.ccs.tencentyun.com/"
      - "mirrors.tencent.com/"
      - "docker.io/library/"
```

### 强制健康检查

要求所有 Pod 必须配置探针：

```yaml title="强制健康检查策略"
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredProbes
metadata:
  name: required-probes
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
  parameters:
    probes:
      - readinessProbe
      - livenessProbe
    probeTypes:
      - tcpSocket
      - httpGet
      - exec
```

---

## Agent Prompt 模板

### 查询策略 Prompt

```prompt
请帮我查询 TKE 集群的安全策略：
- 集群 ID: {{cluster_id}}
- 地域: {{region}}
- 策略分类: {{category}}

请列出所有策略的名称、状态和执行模式。
```

### 开启策略 Prompt

```prompt
请帮我开启 TKE 集群的安全策略：
- 集群 ID: {{cluster_id}}
- 地域: {{region}}
- 策略名称: {{policy_name}}
- 策略类型: {{policy_kind}}
- 执行模式: deny

开启后请验证策略状态。
```

### 批量配置 Prompt

```prompt
请帮我为 TKE 集群配置以下安全策略：
- 集群 ID: cls-xxxxxxxx
- 地域: ap-guangzhou

需要开启的策略：
1. 存在 Pod 的 Namespace 不允许删除 - deny 模式
2. 禁止创建特权容器 - deny 模式
3. 强制配置健康检查 - dryrun 模式（先观察）

请逐一配置并验证结果。
```

**参数说明**：

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `{{cluster_id}}` | 集群 ID | cls-xxxxxxxx |
| `{{region}}` | 地域 | ap-guangzhou |
| `{{category}}` | 策略分类 | baseline/priority/optional |
| `{{policy_name}}` | 策略规则名称 | block-namespace-deletion-rule |
| `{{policy_kind}}` | 策略类型 | blocknamespacedeletion |

---

## 最佳实践

### 1. 策略启用顺序

✅ **推荐做法**：
- 先使用 dryrun 模式观察影响
- 确认无误后再切换为 deny 模式
- 优先启用删除防护类策略

❌ **不推荐做法**：
- 直接在生产环境启用 deny 模式
- 未测试就批量开启策略
- 忽略策略命中记录

### 2. 命名空间豁免

✅ **推荐做法**：
- 豁免 kube-system 等系统命名空间
- 豁免 gatekeeper-system 避免死锁
- 为运维工具命名空间配置豁免

❌ **不推荐做法**：
- 不配置任何豁免导致系统组件受阻
- 豁免范围过大失去策略意义

### 3. 镜像来源管控

✅ **推荐做法**：
- 使用腾讯云容器镜像服务 (TCR)
- 配置镜像仓库白名单
- 定期审计镜像来源

❌ **不推荐做法**：
- 允许任意公网镜像
- 使用未经扫描的镜像
- 直接使用 latest 标签

---

## 相关命令速查

```bash
# 查询策略列表
tccli tke DescribeOpenPolicyList --ClusterId cls-xxx --Category baseline

# 修改策略状态
tccli tke ModifyOpenPolicyList --ClusterId cls-xxx --Category optional \
  --OpenPolicyInfoList '[{"Name":"xxx","Kind":"xxx","EnforcementAction":"deny"}]'

# 查看 Gatekeeper 状态
kubectl get pods -n gatekeeper-system

# 查看所有约束
kubectl get constraints

# 查看约束详情
kubectl describe <constraint-kind> <constraint-name>

# 查看审计日志
kubectl logs -n gatekeeper-system -l control-plane=audit-controller

# 测试策略效果
kubectl apply -f test-pod.yaml --dry-run=server
```

---

## 相关文档

- [Pod 安全](pod-security.md)
- [RBAC 配置](rbac.md)
- [镜像安全](image-security.md)

---

## API 文档链接

- **查询策略列表 API**: https://cloud.tencent.com/document/api/457/111011
- **修改策略 API**: https://cloud.tencent.com/document/api/457/111010
- **产品文档**: https://cloud.tencent.com/document/product/457/103179
- **API Explorer**: https://console.cloud.tencent.com/api/explorer?Product=tke&Version=2018-05-25&Action=DescribeOpenPolicyList

---

**文档版本**: v1.0  
**最后更新**: 2026-01-08  
**维护者**: TKE Documentation Team
