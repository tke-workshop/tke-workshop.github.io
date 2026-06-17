---
title: "Ingress 实践"
---

# Ingress 实践

Ingress 适合作为 HTTP/HTTPS 的统一入口。生产环境应重点关注控制器选型、证书、后端健康、路由变更和观测能力。

---

## 入口设计

| 模式 | 适用场景 |
|------|----------|
| 单业务单入口 | 独立 SLA、独立证书、独立流量治理 |
| 多业务共享入口 | 统一域名、统一证书、统一 WAF 或网关策略 |
| 内外网分离入口 | 管理后台、内部 API、公开服务隔离 |

避免把所有业务无差别挂到同一个 Ingress。入口共享越多，变更影响范围越大。

---

## 证书和域名

- 证书 Secret 名称和 Ingress `tls.secretName` 保持一致。
- 证书域名覆盖 Ingress `rules.host`。
- 证书更新要有提前量，配置到期告警。
- 多域名共享入口时，记录域名、证书、业务负责人和回滚方式。

---

## 后端健康

Ingress 的 502/503 大多来自后端 Service 或 Pod 状态异常。发布前检查：

```bash
kubectl get ingress,svc,endpoints,pods -A -o wide
kubectl describe ingress <name> -n <namespace>
```

后端应用应配置 readinessProbe，避免未就绪 Pod 被加入 Service Endpoint。

---

## 路由变更

- 路由规则使用 Git 管理，避免控制台手工漂移。
- 高风险变更先新增 host/path 验证，再切正式域名。
- 路径匹配优先级和 `pathType` 必须明确。
- 灰度发布时记录回滚命令和旧后端 Service。

---

## 观测指标

建议至少覆盖：

- 入口 4xx/5xx
- 后端健康实例数
- P95/P99 延迟
- TLS 握手失败
- CLB 带宽、连接数、丢包和限速

入口是业务第一故障边界，告警接收人应与业务负责人绑定。
