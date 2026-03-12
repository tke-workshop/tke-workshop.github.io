# kubernetes-mcp-server 集成指南

本文档介绍如何将 **TKE Skill** 与 **kubernetes-mcp-server** 组合使用，实现 AI + K8s 运维的完整闭环。

---

## 📋 概述

**TKE Skill** 擅长腾讯云 TKE 平台层操作（集群管理、kubeconfig 获取），而 **kubernetes-mcp-server** 擅长通用 K8s 集群内操作（部署、日志、Helm）。两者组合可以实现：

- 🚀 **一句话部署到 TKE**：获取集群 → 部署应用 → 验证状态
- 🔧 **智能排障**：查看 Events → 分析日志 → 定位问题
- 📦 **Helm 管理**：在 TKE 集群上安装、升级、卸载 Helm Chart
- ⚡ **资源运维**：查看资源使用、配置 HPA、滚动更新

```
┌───────────────────────────────────────────────────────────┐
│                     AI Agent                              │
├───────────────────────────────────────────────────────────┤
│                                                           │
│   ┌─────────────────┐       ┌────────────────────────┐   │
│   │   TKE Skill     │       │  kubernetes-mcp-server │   │
│   │   (云平台层)     │──────▶│     (集群内操作)        │   │
│   │                 │       │                        │   │
│   │ • 集群列表       │       │ • Pod CRUD/日志/Exec   │   │
│   │ • kubeconfig    │       │ • Deployment/Service   │   │
│   │ • 节点池管理     │       │ • Helm 管理            │   │
│   └─────────────────┘       │ • Events/资源监控      │   │
│          │                  └────────────────────────┘   │
│          ▼                               │                │
│    腾讯云 TKE API                  K8s API Server        │
└───────────────────────────────────────────────────────────┘
```

---

## 🛠️ kubernetes-mcp-server 介绍

[kubernetes-mcp-server](https://github.com/containers/kubernetes-mcp-server) 是一个基于 MCP (Model Context Protocol) 的 Kubernetes 操作服务器，让 AI Agent 可以直接操作 K8s 集群。

### 核心能力

=== "Pod 操作"

    | 工具 | 描述 | 示例场景 |
    |------|------|----------|
    | `pods_list` | 列出 Pod | 查看应用的所有 Pod |
    | `pods_get` | 获取 Pod 详情 | 查看 Pod 配置和状态 |
    | `pods_delete` | 删除 Pod | 重启问题 Pod |
    | `pods_log` | 查看日志 | 排查应用错误 |
    | `pods_exec` | 执行命令 | 进入容器调试 |

=== "资源管理"

    | 工具 | 描述 | 示例场景 |
    |------|------|----------|
    | `resources_create_or_update` | 创建/更新资源 | 部署 Deployment、Service |
    | `resources_list` | 列出资源 | 查看所有 Deployment |
    | `resources_get` | 获取资源详情 | 查看 Service 配置 |
    | `resources_delete` | 删除资源 | 清理测试资源 |

=== "Helm 管理"

    | 工具 | 描述 | 示例场景 |
    |------|------|----------|
    | `helm_install` | 安装 Chart | 安装 nginx-ingress |
    | `helm_upgrade` | 升级 Release | 更新应用配置 |
    | `helm_uninstall` | 卸载 Release | 清理应用 |
    | `helm_list` | 列出 Release | 查看已安装的应用 |
    | `helm_status` | 查看状态 | 检查安装是否成功 |

=== "集群监控"

    | 工具 | 描述 | 示例场景 |
    |------|------|----------|
    | `events_list` | 查看 Events | 排查 Pod 启动失败 |
    | `nodes_list` | 列出节点 | 查看集群节点 |
    | `nodes_top` | 资源使用 | 检查资源是否充足 |

---

## 🚀 快速开始

### Step 1: 安装 kubernetes-mcp-server

=== "Go Install (推荐)"

    ```bash
    go install github.com/containers/kubernetes-mcp-server/cmd/kubernetes-mcp-server@latest
    ```

=== "容器运行"

    ```bash
    docker run -it --rm \
      -v ~/.kube/config:/root/.kube/config:ro \
      ghcr.io/containers/kubernetes-mcp-server:latest
    ```

=== "源码编译"

    ```bash
    git clone https://github.com/containers/kubernetes-mcp-server.git
    cd kubernetes-mcp-server
    make build
    ./bin/kubernetes-mcp-server
    ```

### Step 2: 配置 CodeBuddy MCP

编辑 MCP 配置文件 `~/.codebuddy/mcp.json`:

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

### Step 3: 配置 TKE Skill

确保 TKE Skill 已配置腾讯云凭证：

```yaml
# ~/.codebuddy/skills/tke/config.yaml
tencent_cloud:
  secret_id: "YOUR_SECRET_ID"
  secret_key: "YOUR_SECRET_KEY"
  region: "ap-guangzhou"
```

### Step 4: 验证配置

在 CodeBuddy 中测试：

```
# 测试 TKE Skill
帮我查一下广州地域的 TKE 集群

# 测试 kubernetes-mcp
查看 default 命名空间的所有 Pod
```

---

## 📝 使用场景

### 场景 1: 一句话部署应用到 TKE

**用户输入**:
```
把当前项目部署到广州 TKE 集群 cls-abc123，3 副本高可用
```

**AI 执行流程**:

```
Step 1: [TKE Skill] 获取 kubeconfig
────────────────────────────────────
调用: get_kubeconfig(cluster_id="cls-abc123")
返回: kubeconfig YAML 内容
配置到本地 ~/.kube/config

Step 2: [Agent] 分析项目，生成 K8s 配置
────────────────────────────────────────
识别项目类型: Node.js 应用
生成配置:
  - Deployment (3 副本 + 反亲和性)
  - Service (ClusterIP)
  - Ingress (可选)

Step 3: [kubernetes-mcp] 部署资源
──────────────────────────────────
调用: resources_create_or_update(yaml=Deployment)
调用: resources_create_or_update(yaml=Service)
返回: 资源创建成功

Step 4: [kubernetes-mcp] 验证部署
──────────────────────────────────
调用: pods_list(label_selector="app=my-app")
返回: 3 个 Pod Running
```

**AI 输出**:

```
✅ 部署完成！

📦 已创建资源:
  - Deployment: my-app (3 副本)
  - Service: my-app (ClusterIP)

🔗 Pod 状态:
  - my-app-7d9f8b6c5d-abc12: Running
  - my-app-7d9f8b6c5d-def34: Running
  - my-app-7d9f8b6c5d-ghi56: Running

💡 访问方式:
  kubectl port-forward svc/my-app 8080:80
```

---

### 场景 2: Pod Pending 智能排障

**用户输入**:
```
集群 cls-abc123 有 Pod 一直 Pending，帮我排查一下
```

**AI 执行流程**:

```
Step 1: [TKE Skill] 获取 kubeconfig
Step 2: [kubernetes-mcp] 查找 Pending Pod
        调用: pods_list(field_selector="status.phase=Pending")
        返回: my-app-xxx Pending

Step 3: [kubernetes-mcp] 获取 Pod 详情
        调用: pods_get(name="my-app-xxx")
        返回: conditions 显示 Unschedulable

Step 4: [kubernetes-mcp] 查看 Events
        调用: events_list(resource_name="my-app-xxx")
        返回: "0/3 nodes are available: 3 Insufficient memory"

Step 5: [kubernetes-mcp] 检查节点资源
        调用: nodes_top()
        返回: 内存使用率 85%

Step 6: [TKE Skill] 获取节点池信息
        调用: list_node_pools(cluster_id="cls-abc123")
        返回: 节点池信息
```

**AI 输出**:

```
🔍 排障分析完成

📋 问题 Pod: my-app-7d9f8b6c5d-xxxxx
   状态: Pending (已持续 5 分钟)
   原因: 无法调度

❌ 错误信息:
   0/3 nodes are available: 3 Insufficient memory

📊 集群资源分析:
   节点数量: 3
   内存使用: 10.2Gi / 12Gi (85%)
   Pod 请求: 1Gi

💡 诊断结论: 集群内存资源不足

🔧 建议解决方案:
   1. [推荐] 扩容节点池 np-xxx，增加 1-2 个节点
   2. 降低 Pod 内存请求 (当前 1Gi → 建议 512Mi)
   3. 检查是否有可释放的低优先级 Pod

需要我帮你执行扩容吗？
```

---

### 场景 3: 在 TKE 上安装 Helm Chart

**用户输入**:
```
在 cls-abc123 集群安装 nginx-ingress，2 个副本
```

**AI 执行流程**:

```
Step 1: [TKE Skill] get_kubeconfig(cluster_id="cls-abc123")

Step 2: [kubernetes-mcp] helm_install(
          release_name="nginx-ingress",
          chart="ingress-nginx/ingress-nginx",
          namespace="ingress-nginx",
          create_namespace=true,
          values={"controller": {"replicaCount": 2}}
        )

Step 3: [kubernetes-mcp] helm_status(release_name="nginx-ingress")

Step 4: [kubernetes-mcp] pods_list(namespace="ingress-nginx")
```

**AI 输出**:

```
✅ nginx-ingress 安装完成

📦 Release 信息:
   名称: nginx-ingress
   命名空间: ingress-nginx
   Chart: ingress-nginx/ingress-nginx
   状态: deployed

🔗 Pod 状态:
   - ingress-nginx-controller-xxx: Running
   - ingress-nginx-controller-yyy: Running

💡 获取 Ingress IP:
   kubectl -n ingress-nginx get svc
```

---

### 场景 4: 查看应用日志

**用户输入**:
```
看一下 my-app 的日志，最近 100 行
```

**AI 执行流程**:

```
Step 1: [kubernetes-mcp] pods_list(label_selector="app=my-app")
        返回: my-app-xxx, my-app-yyy, my-app-zzz

Step 2: [kubernetes-mcp] pods_log(
          name="my-app-xxx",
          tail_lines=100
        )
```

**AI 输出**:

```
📋 my-app-xxx 日志 (最近 100 行):

2024-03-12T10:30:15Z INFO  Server started on port 8080
2024-03-12T10:30:16Z INFO  Connected to database
2024-03-12T10:31:00Z INFO  Request: GET /api/users
2024-03-12T10:31:01Z INFO  Response: 200 OK (120ms)
2024-03-12T10:32:00Z WARN  Slow query detected (>500ms)
...

💡 发现 1 个警告：存在慢查询，建议优化数据库查询
```

---

### 场景 5: 进入容器执行命令

**用户输入**:
```
进入 my-app 的容器，检查一下配置文件
```

**AI 执行流程**:

```
Step 1: [kubernetes-mcp] pods_list(label_selector="app=my-app")
        返回: my-app-xxx

Step 2: [kubernetes-mcp] pods_exec(
          name="my-app-xxx",
          command=["cat", "/app/config.yaml"]
        )
```

**AI 输出**:

```
📋 /app/config.yaml 内容:

server:
  port: 8080
  host: 0.0.0.0

database:
  host: mysql.default.svc
  port: 3306
  name: myapp

logging:
  level: info
  format: json

💡 配置看起来正常，数据库连接指向集群内的 mysql 服务
```

---

## 🔀 工具选择指南

AI Agent 会根据你的请求自动选择合适的工具：

| 你说... | AI 使用的工具 |
|---------|--------------|
| "查看我的 TKE 集群" | TKE Skill |
| "获取集群的 kubeconfig" | TKE Skill |
| "扩容节点池" | TKE Skill |
| "部署 Deployment" | kubernetes-mcp |
| "查看 Pod 日志" | kubernetes-mcp |
| "安装 Helm Chart" | kubernetes-mcp |
| "查看 Events" | kubernetes-mcp |
| "部署到 TKE 集群" | TKE Skill → kubernetes-mcp |
| "排查 Pod 问题" | TKE Skill + kubernetes-mcp |

---

## ⚠️ 注意事项

### kubeconfig 管理

!!! warning "Token 有效期"
    TKE kubeconfig 中的 Token 有有效期（通常 24 小时），长时间未操作需要重新获取。

```
# 重新获取 kubeconfig
获取集群 cls-xxx 的 kubeconfig
```

### 权限控制

!!! tip "最小权限原则"
    建议为 AI Agent 配置专用的 ServiceAccount，仅授予必要的权限。

```yaml
# 示例: 只读权限
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ai-agent-readonly
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets"]
  verbs: ["get", "list", "watch"]
```

### 敏感操作确认

!!! danger "危险操作"
    以下操作会要求确认：
    
    - 删除 Deployment / StatefulSet
    - 删除 PVC / PV
    - 执行 `kubectl delete namespace`
    - 集群级资源修改

---

## 🔗 相关链接

- [kubernetes-mcp-server GitHub](https://github.com/containers/kubernetes-mcp-server)
- [MCP Protocol 文档](https://modelcontextprotocol.io/)
- [TKE Skill 介绍](tke-skill.md)
- [TKE API 文档](https://cloud.tencent.com/document/api/457)

---

## 📊 能力对照表

| 能力 | TKE Skill | kubernetes-mcp | 组合使用 |
|------|-----------|----------------|----------|
| 查看集群列表 | ✅ | - | - |
| 获取 kubeconfig | ✅ | - | - |
| 创建/删除集群 | ✅ | - | - |
| 管理节点池 | ✅ | - | - |
| 部署应用 | - | ✅ | ✅ |
| 查看 Pod 日志 | - | ✅ | ✅ |
| 执行容器命令 | - | ✅ | ✅ |
| Helm 管理 | - | ✅ | ✅ |
| 查看 Events | - | ✅ | ✅ |
| 智能排障 | - | - | ✅ |
| 一句话部署 | - | - | ✅ |
