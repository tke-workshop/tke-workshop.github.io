---
title: "构建 AI Coding 执行环境"
---

# 构建 AI Coding 执行环境

AI Coding Agent 不只是生成代码文本。它通常需要进入一个真实的代码环境，完成拉取仓库、理解工程、修改文件、安装依赖、运行测试、启动预览服务、生成 diff 和提交变更等操作。

TKE Cube Agent Sandbox 可以作为 AI Coding Agent 的隔离执行环境，帮助您在 TKE 集群中构建可执行、可持久、可联网、可审计的云端开发沙箱。

## 场景挑战

传统 Pod、CI Runner 或云开发机用于 AI Coding 场景时，常见问题包括：

- 冷启动和依赖安装耗时影响交互体验。
- 不同用户或任务之间需要隔离源码、凭证和临时文件。
- Agent 需要访问 Git、包管理源、内部构建系统和预览端口。
- 代码仓库、依赖缓存和编译产物需要在会话之间保留。
- Agent 执行的 shell 命令、文件变更和网络访问需要审计。
- 普通容器难以同时满足快速创建、强隔离和工作区持久化。

## 参考架构

```text
AI Coding 产品 / Agent 控制面
        |
        | E2B 兼容 SDK / SandboxClaim
        v
SandboxGateway
        |
        v
SandboxTemplate: coding-agent
        |
        +-- Git 凭证 / API Key
        +-- CFS / PVC 工作区
        +-- 包管理源和出网策略
        +-- 预览端口
        v
TKE 原生节点池 + Cube Micro-VM Runtime
```

## 典型流程

1. 用户在 AI Coding 产品中提交需求。
2. Agent 控制面创建或复用一个沙箱工作区。
3. 沙箱拉取代码仓库或挂载已有工作区。
4. Agent 在沙箱中读取代码、修改文件并运行测试。
5. 如需预览 Web 应用，沙箱通过 SandboxGateway 暴露预览端口。
6. Agent 生成 diff、测试结果和变更说明。
7. 用户确认后，Agent 提交 Pull Request 或推送分支。
8. 任务结束后，沙箱可销毁、暂停或保留工作区。

## SandboxTemplate 示例

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxTemplate
metadata:
  name: ai-coding-agent
  namespace: coding
spec:
  image: ccr.ccs.tencentyun.com/demo/ai-coding-agent:latest
  resources:
    cpu: "4"
    memory: 8Gi
  command:
    - /usr/local/bin/start-coding-runtime
  ports:
    - name: runtime
      containerPort: 49999
    - name: preview
      containerPort: 3000
  env:
    - name: WORKSPACE_DIR
      value: /workspace
  storage:
    volumes:
      - name: workspace
        type: pvc
        claimName: coding-workspace
        mountPath: /workspace
        readOnly: false
      - name: dependency-cache
        type: pvc
        claimName: coding-cache
        mountPath: /cache
        readOnly: false
  network:
    policyRef: ai-coding-network
  runtime:
    type: cube-pvm
    warmPool:
      replicas: 3
      maxReplicas: 50
      ttlSeconds: 3600
```

## 工作区设计

AI Coding 场景建议拆分三类目录：

| 目录 | 用途 | 建议 |
| --- | --- | --- |
| `/workspace` | 代码仓库、用户文件、Agent 生成文件 | 使用持久化 PVC / CFS |
| `/cache` | npm、pip、Maven、Go build cache 等依赖缓存 | 可跨任务复用，按团队隔离 |
| `/tmp` | 临时文件、测试输出和中间产物 | 使用临时存储，任务结束后清理 |

如果业务需要为每个用户保留独立开发环境，建议为每个用户或项目创建独立 PVC。若只需要短任务执行，可以在任务结束后导出 diff，再销毁沙箱。

## Git 凭证和代码访问

不要将长期 Git 凭证写入镜像或工作区。推荐方式：

- 使用平台侧凭证服务托管 Git Token。
- 沙箱内只持有短期凭证或占位符凭证。
- 通过网关、SDK 或凭证代理在请求时注入真实凭证。
- 对 Git clone、push、PR 创建等操作记录审计日志。

## 网络策略

AI Coding 沙箱通常需要访问：

- Git 服务。
- 包管理源，例如 npm、PyPI、Maven、Go Proxy。
- 内部构建、测试或制品服务。
- 预览端口的数据面入口。

示例策略：

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxNetworkPolicy
metadata:
  name: ai-coding-network
  namespace: coding
spec:
  egress:
    defaultAction: deny
    allow:
      - type: service
        value: kube-system/kube-dns
      - type: cidr
        value: 10.0.0.0/8
      - type: fqdn
        value: git.example.com
      - type: fqdn
        value: registry.npmjs.org
      - type: fqdn
        value: pypi.org
  ingress:
    defaultAction: deny
    allow:
      - type: gateway
        value: coding-gateway
```

## 预览服务

当前端或 Web 服务需要预览时，在模板中声明预览端口，并通过 SandboxGateway 暴露：

```yaml
ports:
  - name: preview
    containerPort: 3000
```

建议为预览访问配置：

- 短期有效链接。
- 用户身份校验。
- 来源白名单。
- 访问日志。
- 自动关闭空闲预览服务。

## 可观测与审计

建议记录：

- 沙箱创建、释放、暂停、恢复事件。
- Git clone、checkout、commit、push 操作。
- shell 命令和退出码。
- 文件新增、修改、删除摘要。
- 测试命令、测试结果和覆盖率。
- 出网域名、请求量和拦截记录。
- 预览端口访问日志。

这些数据可用于生成 Agent 执行轨迹，也可用于安全审计和问题复盘。

## 容量建议

| 任务类型 | 建议资源 | 生命周期 |
| --- | --- | --- |
| 小型代码修复 | 2C4G | 任务结束后销毁或暂停 |
| 前端预览 / 构建 | 4C8G | 保留工作区，空闲后暂停 |
| 大型仓库分析 | 8C16G 或更高 | 按项目保留工作区 |
| CI 辅助任务 | 按测试负载配置 | 即用即销 |

## 最佳实践

- 为高频语言和框架制作专用镜像，减少任务中安装依赖的时间。
- 将依赖缓存从镜像中拆出，使用共享缓存卷。
- 为不同团队使用独立 Namespace、Team 和工作区。
- 默认禁止访问公网，只放行 Git、包管理源和必要内部服务。
- Git 凭证使用短期凭证或代理注入，避免落盘。
- 对 Agent 修改的文件生成 diff，并在用户确认后再提交。
- 对长时间空闲工作区执行暂停或回收策略。

## 相关文档

- [快速开始](../02-quick-start.md)
- [存储配置](../04-storage.md)
- [网络配置](../05-network.md)
- [可观测性](../06-observability.md)
