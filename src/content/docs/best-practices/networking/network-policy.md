---
title: "网络策略"
---

# 网络策略

NetworkPolicy 的目标是把集群内东西向流量从“默认互通”收敛到“最小放通”。它应作为应用安全设计的一部分，而不是上线后的补丁。

---

## 推荐落地顺序

1. 盘点命名空间和调用关系。
2. 为 Pod、Namespace 建立稳定 label。
3. 在测试环境启用默认拒绝策略。
4. 按服务依赖逐条放通。
5. 发布到生产前验证 DNS、监控、日志、镜像拉取和健康检查链路。

---

## 默认拒绝基线

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

启用出站默认拒绝后，需要显式放通 DNS、依赖服务、外部 API、日志和监控出口。

---

## Label 规范

| Label | 示例 | 用途 |
|-------|------|------|
| `app` | `payment-api` | 服务身份 |
| `tier` | `frontend` / `backend` | 分层隔离 |
| `env` | `prod` / `staging` | 环境隔离 |
| `access-zone` | `trusted` / `untrusted` | 网络域 |

不要把临时发布版本号作为 NetworkPolicy 的核心 selector，否则滚动发布时容易误断流量。

---

## 验证方式

```bash
kubectl get networkpolicy -A
kubectl describe networkpolicy -n <namespace>
kubectl run net-test --rm -it --image=curlimages/curl:8.8.0 --restart=Never -- sh
```

验证时同时覆盖允许和拒绝两类结果。只验证“能访问”不够，还要验证“不该访问的确实访问不了”。

---

## 常见风险

| 风险 | 说明 |
|------|------|
| CNI 不支持 | NetworkPolicy 对象存在但不生效 |
| DNS 被阻断 | 应用报域名解析失败 |
| label 漂移 | 新 Pod 未匹配允许策略 |
| 出站过度放通 | `0.0.0.0/0` 让策略失去约束 |
| 缺少审计 | 无法解释谁放通了哪条链路 |
