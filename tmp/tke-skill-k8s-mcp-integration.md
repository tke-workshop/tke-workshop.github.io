# TKE Skill + kubernetes-mcp-server 技术集成方案

> 文档版本: v1.0  
> 创建日期: 2026-03-12  
> 状态: 技术方案（内部文档）

---

## 📋 概述

本文档详细描述 **TKE Skill** 与 **kubernetes-mcp-server** 的技术集成方案，实现"AI + K8s 运维"的完整闭环能力。

### 目标

- 将 TKE Skill（云平台层能力）与 kubernetes-mcp-server（集群内操作层能力）无缝集成
- 让 AI Agent 能够完成从"集群管理"到"应用部署运维"的全链路任务
- 提供即插即用的 MCP 配置方案和 POC 示例

---

## 🏗️ 架构设计

### 整体架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           AI Agent (CodeBuddy / Claude)                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                         Tool/Skill Dispatcher                       │  │
│  │                   (根据用户意图自动选择工具)                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                      │                              │                     │
│         ┌────────────▼────────────┐    ┌───────────▼───────────────┐    │
│         │       TKE Skill         │    │  kubernetes-mcp-server    │    │
│         │      (云平台层)          │    │     (集群内操作层)         │    │
│         ├─────────────────────────┤    ├───────────────────────────┤    │
│         │ • list_clusters         │    │ • pods_list/get/delete    │    │
│         │ • get_cluster_status    │    │ • pods_log                │    │
│         │ • get_kubeconfig    ────┼────▶ • pods_exec               │    │
│         │ • list_node_pools       │    │ • resources_create/update │    │
│         │ • scale_cluster         │    │ • resources_list/get      │    │
│         │ • create_cluster        │    │ • helm_install/uninstall  │    │
│         └────────────┬────────────┘    │ • events_list             │    │
│                      │                 │ • nodes_list/top          │    │
│                      │                 │ • configuration_list      │    │
│                      ▼                 └───────────┬───────────────┘    │
│              ┌───────────────┐                     │                     │
│              │  腾讯云 TKE API │                     │                     │
│              └───────────────┘                     │                     │
│                                                    ▼                     │
│                                         ┌─────────────────────┐          │
│                                         │   K8s API Server    │          │
│                                         │  (via kubeconfig)   │          │
│                                         └─────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 核心组件职责

| 组件 | 职责 | 协议 | 输入/输出 |
|------|------|------|----------|
| **TKE Skill** | 腾讯云 TKE 平台层操作 | Skill/Tool API | SecretId/SecretKey → 集群信息/kubeconfig |
| **kubernetes-mcp-server** | 通用 K8s 集群内操作 | MCP Protocol | kubeconfig → K8s 资源 CRUD |
| **Tool Dispatcher** | 意图识别与工具路由 | Agent 内部 | 用户请求 → 工具选择 |

### 数据流

```
用户请求: "把当前项目部署到广州的 TKE 集群"
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│  Step 1: 意图分析                                                  │
│  - 识别目标: 部署应用到 TKE                                         │
│  - 需要: 集群信息 + 部署能力                                        │
│  - 工具选择: TKE Skill (获取集群) + k8s-mcp (部署)                   │
└───────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│  Step 2: TKE Skill - 获取集群信息                                  │
│  call: list_clusters(region="ap-guangzhou")                       │
│  return: [{cluster_id: "cls-abc123", cluster_name: "prod-gw"}]    │
└───────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│  Step 3: TKE Skill - 获取 kubeconfig                              │
│  call: get_kubeconfig(cluster_id="cls-abc123")                    │
│  return: kubeconfig YAML content                                  │
└───────────────────────────────────────────────────────────────────┘
                │
                ▼ (kubeconfig 传递给 k8s-mcp)
┌───────────────────────────────────────────────────────────────────┐
│  Step 4: kubernetes-mcp - 部署应用                                 │
│  call: resources_create_or_update(yaml="Deployment...")           │
│  call: resources_create_or_update(yaml="Service...")              │
│  return: 资源创建成功                                              │
└───────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│  Step 5: kubernetes-mcp - 验证部署                                 │
│  call: pods_list(namespace="default", label_selector="app=xxx")   │
│  return: Pod 运行状态                                              │
└───────────────────────────────────────────────────────────────────┘
```

---

## 📦 kubernetes-mcp-server 介绍

### 项目信息

- **仓库**: https://github.com/containers/kubernetes-mcp-server
- **协议**: MCP (Model Context Protocol)
- **语言**: Go
- **许可**: Apache 2.0

### 支持的工具列表

#### Pod 操作

| 工具 | 描述 |
|------|------|
| `pods_list` | 列出 Pod（支持 namespace、label_selector） |
| `pods_get` | 获取 Pod 详情 |
| `pods_delete` | 删除 Pod |
| `pods_log` | 查看 Pod 日志（支持 container、tail、follow） |
| `pods_exec` | 在 Pod 中执行命令 |
| `pods_run` | 运行临时 Pod |

#### 资源操作

| 工具 | 描述 |
|------|------|
| `resources_list` | 列出任意 K8s 资源 |
| `resources_get` | 获取资源详情 |
| `resources_create_or_update` | 创建或更新资源（核心部署能力） |
| `resources_delete` | 删除资源 |

#### Helm 操作

| 工具 | 描述 |
|------|------|
| `helm_list` | 列出 Helm Release |
| `helm_install` | 安装 Helm Chart |
| `helm_upgrade` | 升级 Helm Release |
| `helm_uninstall` | 卸载 Helm Release |
| `helm_status` | 查看 Release 状态 |
| `helm_show_*` | 查看 Chart 信息（values/readme/chart） |

#### 事件与配置

| 工具 | 描述 |
|------|------|
| `events_list` | 查看 K8s Events |
| `nodes_list` | 列出节点 |
| `nodes_top` | 节点资源使用情况 |
| `configuration_list` | 列出 kubeconfig 中的上下文 |
| `configuration_view` | 查看 kubeconfig 配置 |

#### KubeVirt 支持

| 工具 | 描述 |
|------|------|
| `kubevirt_vms_list` | 列出虚拟机 |
| `kubevirt_vms_get` | 获取 VM 详情 |
| `kubevirt_vms_create` | 创建 VM |
| `kubevirt_vms_delete` | 删除 VM |
| `kubevirt_vms_start/stop/restart` | VM 电源控制 |

---

## 🔧 集成方案

### 方案一：并行集成（推荐）

两个工具同时配置给 AI Agent，由 Agent 根据任务自动选择。

#### 优点

- 职责清晰，各司其职
- 无需修改现有工具代码
- 配置灵活，可独立升级

#### 配置示例

**CodeBuddy MCP 配置** (`~/.codebuddy/mcp.json`):

```json
{
  "mcpServers": {
    "kubernetes": {
      "command": "kubernetes-mcp-server",
      "args": [],
      "env": {
        "KUBECONFIG": "${HOME}/.kube/config"
      }
    }
  }
}
```

**TKE Skill 配置** (CodeBuddy Skill 目录):

```yaml
# ~/.codebuddy/skills/tke/manifest.yaml
name: tke
description: 腾讯云 TKE 容器服务运维能力
version: 1.0.0

tools:
  - name: list_clusters
    description: 列出 TKE 集群
  - name: get_cluster_status
    description: 获取集群状态
  - name: get_kubeconfig
    description: 获取集群 kubeconfig
  - name: list_node_pools
    description: 列出节点池
```

#### 工作流示例

```python
# 用户: "把项目部署到广州 TKE 集群"

# Step 1: TKE Skill 获取集群
clusters = tke_skill.list_clusters(region="ap-guangzhou")
# → [{"cluster_id": "cls-abc123", "cluster_name": "prod-gw"}]

# Step 2: TKE Skill 获取 kubeconfig
kubeconfig = tke_skill.get_kubeconfig(cluster_id="cls-abc123")
# → "apiVersion: v1\nkind: Config\n..."

# Step 3: 写入 kubeconfig（或设置环境变量）
with open("/tmp/kubeconfig-cls-abc123.yaml", "w") as f:
    f.write(kubeconfig)
os.environ["KUBECONFIG"] = "/tmp/kubeconfig-cls-abc123.yaml"

# Step 4: k8s-mcp 部署应用
k8s_mcp.resources_create_or_update(yaml="""
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: my-app:v1.0
        ports:
        - containerPort: 8080
""")

# Step 5: k8s-mcp 验证部署
pods = k8s_mcp.pods_list(
    namespace="default",
    label_selector="app=my-app"
)
# 验证 Pod 状态
```

### 方案二：TKE Skill 封装 k8s-mcp

在 TKE Skill 内部调用 kubernetes-mcp-server，提供更高层次的抽象。

#### 优点

- 用户只需配置一个工具
- 更好的上下文传递（自动处理 kubeconfig）
- 可提供 TKE 特化的高级能力

#### 架构

```
┌───────────────────────────────────────────────────────────────┐
│                   TKE Skill (Enhanced)                        │
├───────────────────────────────────────────────────────────────┤
│  高级 API (对外暴露):                                          │
│    - deploy_app(cluster_id, manifest)                         │
│    - diagnose_pod(cluster_id, pod_name)                       │
│    - scale_deployment(cluster_id, deployment, replicas)       │
│    - configure_hpa(cluster_id, deployment, config)            │
├───────────────────────────────────────────────────────────────┤
│  内部实现:                                                     │
│    ┌──────────────────┐     ┌──────────────────────────────┐ │
│    │   TKE API Client │     │ kubernetes-mcp-server (嵌入) │ │
│    │   (云平台操作)    │     │ (集群内操作)                  │ │
│    └──────────────────┘     └──────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

#### 代码示例

```go
// TKE Skill 封装的高级 API
func (s *TKESkill) DeployApp(ctx context.Context, req DeployRequest) (*DeployResponse, error) {
    // 1. 获取 kubeconfig
    kubeconfig, err := s.tkeClient.DescribeClusterKubeconfig(req.ClusterID)
    if err != nil {
        return nil, fmt.Errorf("获取 kubeconfig 失败: %w", err)
    }
    
    // 2. 配置 k8s-mcp 客户端
    k8sClient, err := s.createK8sClient(kubeconfig)
    if err != nil {
        return nil, fmt.Errorf("创建 K8s 客户端失败: %w", err)
    }
    
    // 3. 部署资源
    result, err := k8sClient.ResourcesCreateOrUpdate(ctx, req.Manifest)
    if err != nil {
        return nil, fmt.Errorf("部署失败: %w", err)
    }
    
    // 4. 等待 Pod 就绪
    if req.Wait {
        if err := s.waitForPodsReady(ctx, k8sClient, req.Labels); err != nil {
            return nil, fmt.Errorf("等待 Pod 就绪超时: %w", err)
        }
    }
    
    return &DeployResponse{
        Status: "success",
        Resources: result.CreatedResources,
    }, nil
}
```

---

## 🔀 意图路由设计

### 路由规则

```yaml
# 路由配置
routing_rules:
  # 云平台层操作 → TKE Skill
  - patterns:
      - "集群列表"
      - "创建集群"
      - "删除集群"
      - "kubeconfig"
      - "节点池"
      - "扩缩容集群"
      - "TKE 集群"
    tool: tke_skill
    
  # 集群内操作 → kubernetes-mcp
  - patterns:
      - "部署"
      - "Pod"
      - "Deployment"
      - "Service"
      - "日志"
      - "Helm"
      - "进入容器"
      - "执行命令"
      - "Events"
    tool: kubernetes_mcp
    
  # 混合操作 → 按序调用
  - patterns:
      - "部署到.*集群"
      - "在.*集群上.*"
    workflow:
      - tool: tke_skill
        action: get_kubeconfig
      - tool: kubernetes_mcp
        action: resources_create_or_update
```

### 实现示例 (TypeScript)

```typescript
// 意图识别与路由
function routeRequest(userRequest: string): ToolChain {
  const request = userRequest.toLowerCase();
  
  // 云平台层关键词
  const tkePlatformKeywords = [
    '集群列表', '创建集群', '删除集群', 'kubeconfig',
    '节点池', '扩缩容', 'tke集群', '腾讯云'
  ];
  
  // 集群内操作关键词
  const k8sOperationKeywords = [
    '部署', 'pod', 'deployment', 'service', 'ingress',
    '日志', 'helm', '进入容器', 'exec', 'events', '扩缩容pod'
  ];
  
  // 混合操作模式
  const hybridPatterns = [
    /部署.*到.*集群/,
    /在.*集群.*部署/,
    /把.*部署到/
  ];
  
  // 检查混合操作
  if (hybridPatterns.some(p => p.test(request))) {
    return {
      type: 'hybrid',
      steps: [
        { tool: 'tke_skill', action: 'get_kubeconfig' },
        { tool: 'kubernetes_mcp', action: 'resources_create_or_update' }
      ]
    };
  }
  
  // 检查单一工具
  if (tkePlatformKeywords.some(k => request.includes(k))) {
    return { type: 'single', tool: 'tke_skill' };
  }
  
  if (k8sOperationKeywords.some(k => request.includes(k))) {
    return { type: 'single', tool: 'kubernetes_mcp' };
  }
  
  // 默认使用 kubernetes-mcp (更通用)
  return { type: 'single', tool: 'kubernetes_mcp' };
}
```

---

## 🔐 认证与安全

### 认证方式对比

| 工具 | 认证方式 | 凭证 | 作用域 |
|------|---------|------|--------|
| TKE Skill | 腾讯云 API 签名 | SecretId/SecretKey | 腾讯云账号级 |
| kubernetes-mcp | Kubernetes RBAC | kubeconfig (Token/证书) | 单集群级 |

### kubeconfig 传递流程

```
┌─────────────────────────────────────────────────────────────────┐
│  TKE Skill                                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 1. 调用 DescribeClusterKubeconfig API                        │ │
│  │    - 使用腾讯云 SecretId/SecretKey 认证                       │ │
│  │    - 返回包含 Token 的 kubeconfig                             │ │
│  │    - Token 有效期: 通常 24 小时                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 2. kubeconfig 处理                                           │ │
│  │    选项 A: 写入临时文件 (/tmp/kubeconfig-xxx.yaml)           │ │
│  │    选项 B: 设置环境变量 KUBECONFIG                            │ │
│  │    选项 C: 通过 MCP 参数传递                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 3. kubernetes-mcp-server 使用 kubeconfig                     │ │
│  │    - 读取 kubeconfig                                          │ │
│  │    - 建立与 K8s API Server 的连接                             │ │
│  │    - 执行集群内操作                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 安全建议

1. **kubeconfig 管理**
   - 不要将 kubeconfig 持久化到公共位置
   - 使用临时文件，操作完成后清理
   - 设置合适的文件权限 (600)

2. **权限最小化**
   - TKE API 凭证应限制必要的 Action
   - kubeconfig 对应的 ServiceAccount 应遵循最小权限原则
   - 考虑使用 namespace 隔离

3. **Token 刷新**
   - TKE kubeconfig 中的 Token 有有效期
   - 长时间运行的任务需要考虑 Token 刷新

---

## 📊 能力对照表

### 场景与工具映射

| 用户场景 | TKE Skill | kubernetes-mcp | 备注 |
|---------|-----------|----------------|------|
| 查看我的 TKE 集群 | ✅ `list_clusters` | - | 云平台层 |
| 获取 kubeconfig | ✅ `get_kubeconfig` | - | 云平台层 |
| 创建新集群 | ✅ `create_cluster` | - | 云平台层 |
| 扩缩容节点 | ✅ `scale_node_pool` | - | 云平台层 |
| 部署 Deployment | - | ✅ `resources_create_or_update` | 集群内 |
| 查看 Pod 日志 | - | ✅ `pods_log` | 集群内 |
| 进入 Pod 执行命令 | - | ✅ `pods_exec` | 集群内 |
| 安装 Helm Chart | - | ✅ `helm_install` | 集群内 |
| 查看 Events | - | ✅ `events_list` | 集群内 |
| 配置 HPA | - | ✅ `resources_create_or_update` | 集群内 |
| 部署到指定 TKE 集群 | ✅ + ✅ | 组合使用 | 混合 |
| 诊断 Pod Pending | ✅ + ✅ | 组合使用 | 混合 |

### 完整工作流场景

#### 场景 1: 一句话部署应用

```
用户: "把当前项目部署到广州 TKE 集群 cls-abc123"

执行流程:
1. [TKE Skill] get_kubeconfig(cluster_id="cls-abc123")
   → 获取 kubeconfig
   
2. [Agent] 分析项目，生成 Deployment YAML
   → 生成 my-app Deployment + Service YAML
   
3. [k8s-mcp] resources_create_or_update(yaml=Deployment)
   → 创建 Deployment
   
4. [k8s-mcp] resources_create_or_update(yaml=Service)
   → 创建 Service
   
5. [k8s-mcp] pods_list(label_selector="app=my-app")
   → 验证 Pod 状态

结果: ✅ 应用部署完成，3 个 Pod 运行中
```

#### 场景 2: Pod Pending 排障

```
用户: "集群 cls-abc123 有 Pod 一直 Pending，帮我看看"

执行流程:
1. [TKE Skill] get_kubeconfig(cluster_id="cls-abc123")
   → 获取 kubeconfig

2. [k8s-mcp] pods_list(field_selector="status.phase=Pending")
   → 找到 Pending Pod: my-app-xxx

3. [k8s-mcp] pods_get(name="my-app-xxx", namespace="default")
   → 获取 Pod 详情，查看 conditions

4. [k8s-mcp] events_list(resource_name="my-app-xxx")
   → 查看 Events: "0/3 nodes are available: 3 Insufficient memory"

5. [k8s-mcp] nodes_top()
   → 检查节点资源使用: 内存使用率 85%

6. [TKE Skill] list_node_pools(cluster_id="cls-abc123")
   → 获取节点池信息，判断是否可以扩容

结果:
📋 诊断结论: 集群内存资源不足
💡 建议: 
  1. 扩容节点池 np-xxx
  2. 或降低 Pod 内存请求
```

#### 场景 3: Helm 应用安装

```
用户: "在 cls-abc123 集群安装 nginx-ingress"

执行流程:
1. [TKE Skill] get_kubeconfig(cluster_id="cls-abc123")
   → 获取 kubeconfig

2. [k8s-mcp] helm_install(
     release_name="nginx-ingress",
     chart="ingress-nginx/ingress-nginx",
     namespace="ingress-nginx",
     values={"controller": {"replicaCount": 2}}
   )
   → 安装 Helm Chart

3. [k8s-mcp] helm_status(release_name="nginx-ingress")
   → 检查安装状态

4. [k8s-mcp] pods_list(namespace="ingress-nginx")
   → 验证 Pod 运行状态

结果: ✅ nginx-ingress 安装完成，2 个 controller Pod 运行中
```

---

## 🚀 部署与配置

### kubernetes-mcp-server 安装

#### 方式 1: Go install

```bash
go install github.com/containers/kubernetes-mcp-server/cmd/kubernetes-mcp-server@latest
```

#### 方式 2: 容器运行

```bash
docker run -it --rm \
  -v ~/.kube/config:/root/.kube/config:ro \
  ghcr.io/containers/kubernetes-mcp-server:latest
```

#### 方式 3: 源码编译

```bash
git clone https://github.com/containers/kubernetes-mcp-server.git
cd kubernetes-mcp-server
make build
./bin/kubernetes-mcp-server
```

### CodeBuddy 集成配置

**Step 1: 配置 MCP Server**

编辑 `~/.codebuddy/mcp.json`:

```json
{
  "mcpServers": {
    "kubernetes": {
      "command": "kubernetes-mcp-server",
      "args": [],
      "env": {
        "KUBECONFIG": "${HOME}/.kube/config"
      }
    }
  }
}
```

**Step 2: 安装 TKE Skill**

```bash
# 将 TKE Skill 复制到 CodeBuddy skills 目录
cp -r tke-skill ~/.codebuddy/skills/tke
```

**Step 3: 配置腾讯云凭证**

编辑 `~/.codebuddy/skills/tke/config.yaml`:

```yaml
tencent_cloud:
  secret_id: "YOUR_SECRET_ID"
  secret_key: "YOUR_SECRET_KEY"
  region: "ap-guangzhou"  # 默认地域
```

### 验证配置

```bash
# 验证 kubernetes-mcp-server
kubernetes-mcp-server --version

# 测试连接 (需要有 kubeconfig)
echo '{"method":"tools/list"}' | kubernetes-mcp-server

# 验证 TKE Skill (在 CodeBuddy 中)
# 输入: "帮我查一下广州地域的 TKE 集群"
```

---

## 🔍 故障排查

### 常见问题

#### 1. kubernetes-mcp-server 连接失败

**现象**: `unable to load kubeconfig`

**解决方案**:
```bash
# 检查 kubeconfig 路径
echo $KUBECONFIG
ls -la ~/.kube/config

# 检查 kubeconfig 有效性
kubectl cluster-info

# 如果使用 TKE，确保已通过 TKE Skill 获取 kubeconfig
```

#### 2. TKE API 认证失败

**现象**: `AuthFailure.SecretIdNotFound`

**解决方案**:
```bash
# 检查凭证配置
cat ~/.codebuddy/skills/tke/config.yaml

# 验证凭证有效性 (使用腾讯云 CLI)
tccli tke DescribeClusters --region ap-guangzhou
```

#### 3. kubeconfig Token 过期

**现象**: `Unauthorized`

**解决方案**:
```bash
# 重新获取 kubeconfig (通过 TKE Skill)
# 输入: "重新获取 cls-abc123 的 kubeconfig"

# 或手动刷新
tccli tke DescribeClusterKubeconfig --ClusterId cls-abc123
```

### 日志查看

```bash
# kubernetes-mcp-server 日志
kubernetes-mcp-server 2>&1 | tee /tmp/k8s-mcp.log

# TKE Skill 日志
tail -f ~/.codebuddy/logs/skills/tke.log
```

---

## 📈 后续规划

### Phase 1: 基础集成 (当前)

- [x] TKE Skill 集群查询能力
- [x] kubernetes-mcp-server 了解与测试
- [ ] 并行集成方案实施
- [ ] POC 验证

### Phase 2: 增强能力

- [ ] TKE Skill 部署能力（基于 k8s-mcp）
- [ ] 智能排障流程封装
- [ ] kubeconfig 自动管理

### Phase 3: 高级能力

- [ ] 灰度发布支持
- [ ] 资源优化建议
- [ ] 成本分析

---

## 🔗 参考资料

- [kubernetes-mcp-server GitHub](https://github.com/containers/kubernetes-mcp-server)
- [MCP Protocol 规范](https://modelcontextprotocol.io/)
- [TKE API 文档](https://cloud.tencent.com/document/api/457)
- [Kubernetes API 参考](https://kubernetes.io/docs/reference/kubernetes-api/)
