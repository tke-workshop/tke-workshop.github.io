---
title: "网络配置"
---

# 网络配置

本文介绍如何配置 TKE Cube Agent Sandbox 的访问入口、控制面与数据面流量分离、出网策略和公网访问。

## 网络模型

TKE Cube Agent Sandbox 将流量分为两类：

| 流量 | 说明 |
| --- | --- |
| 控制面流量 | 创建沙箱、查询状态、执行代码、管理文件等 API 请求 |
| 数据面流量 | 访问沙箱内服务、调试端口、运行时端口和用户应用端口 |

生产环境建议使用 SandboxGateway 分离控制面和数据面流量，避免控制面组件异常影响沙箱业务通信。

## 创建内网 SandboxGateway

默认建议使用内网入口：

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxGateway
metadata:
  name: default
  namespace: agent-demo
spec:
  access:
    internal: true
    public: false
  domains:
    api: api.sandbox.example.internal
    wildcard: "*.sandbox.example.internal"
  routing:
    splitControlAndDataPlane: true
```

执行：

```bash
kubectl apply -f sandbox-gateway.yaml
kubectl get sandboxgateway -n agent-demo
```

## 开启公网访问

公网入口默认关闭。仅当外部用户或跨网络应用需要访问沙箱时开启。

```yaml
spec:
  access:
    internal: true
    public: true
  domains:
    api: api.sandbox.example.com
    wildcard: "*.sandbox.example.com"
  tls:
    secretName: sandbox-gateway-tls
  security:
    sourceCIDRs:
      - 203.0.113.0/24
```

开启公网访问时，请同时配置：

- TLS 证书。
- 来源 IP 白名单。
- 安全组。
- API Key。
- 访问审计。

## 配置出网策略

使用 `SandboxNetworkPolicy` 限制沙箱出网范围：

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxNetworkPolicy
metadata:
  name: code-interpreter-default
  namespace: agent-demo
spec:
  egress:
    defaultAction: deny
    allow:
      - type: cidr
        value: 10.0.0.0/8
      - type: service
        value: kube-system/kube-dns
  ingress:
    defaultAction: deny
    allow:
      - type: gateway
        value: default
```

在模板中引用：

```yaml
spec:
  network:
    policyRef: code-interpreter-default
```

## 常用策略

### 禁止访问公网

```yaml
egress:
  defaultAction: deny
  allow:
    - type: cidr
      value: 10.0.0.0/8
```

### 仅允许访问指定服务

```yaml
egress:
  defaultAction: deny
  allow:
    - type: service
      value: default/model-service
    - type: service
      value: kube-system/kube-dns
```

### 允许访问公网但限制入口

```yaml
egress:
  defaultAction: allow
ingress:
  defaultAction: deny
  allow:
    - type: gateway
      value: default
```

## 端口暴露

在 `SandboxTemplate` 中声明沙箱端口：

```yaml
ports:
  - name: runtime
    containerPort: 49999
  - name: web
    containerPort: 8080
```

声明后，数据面网关可以按实例 ID 和端口转发访问请求。

## 安全建议

- 默认使用内网入口。
- 公网入口必须配置 TLS、白名单和 API Key。
- 任务型沙箱默认禁止入方向访问。
- 出网策略遵循最小权限原则。
- 不要允许沙箱访问云元数据服务，除非业务明确需要并已完成安全评审。
- 对公网入口、API 调用和策略变更开启审计。

## 排障

| 问题 | 可能原因 | 处理建议 |
| --- | --- | --- |
| SDK 无法连接 API | Gateway 未就绪、域名解析失败或 API Key 错误 | 检查 SandboxGateway、DNS 和凭证 |
| 沙箱内服务无法访问 | 端口未声明或数据面入口未开启 | 检查模板 `ports` 和 Gateway 路由 |
| 沙箱无法访问外部服务 | 出网策略拒绝或安全组限制 | 检查 SandboxNetworkPolicy 和安全组 |
| 公网访问不通 | 未开启公网、证书错误或白名单不匹配 | 检查 `public`、TLS Secret 和来源 CIDR |
