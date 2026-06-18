---
title: "日志采集"
---

# 日志采集

日志采集用于把容器标准输出和业务文件日志统一送到日志平台，便于检索、告警和故障复盘。TKE 常见做法是接入腾讯云日志服务 CLS。

---

## 日志来源

| 来源 | 推荐方式 |
|------|----------|
| 容器 stdout/stderr | 应用直接输出到标准输出 |
| 文件日志 | sidecar 或日志采集规则读取路径 |
| 系统组件日志 | 采集 kube-system 命名空间组件日志 |
| 审计日志 | 接入审计或操作记录平台 |

应用优先输出结构化日志到 stdout/stderr，减少容器内文件路径和滚动策略带来的差异。

---

## 采集规划

- 按环境、集群、命名空间、应用拆分日志主题或索引。
- 统一字段：`cluster`、`namespace`、`pod`、`container`、`app`、`level`、`trace_id`。
- 对 `error`、`warn`、`request_id`、`trace_id` 建索引。
- 明确保留周期，避免所有日志长期保存。

---

## Kubernetes 侧检查

```bash
kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous
kubectl logs deployment/<deployment-name> -n <namespace> --tail=100
```

如果 Kubernetes 本地能看到日志，但日志平台没有，重点检查采集 Agent、采集规则、命名空间选择器和日志路径。

---

## 文件日志挂载示例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: nginx:1.25
          volumeMounts:
            - name: logs
              mountPath: /var/log/app
      volumes:
        - name: logs
          emptyDir: {}
```

文件日志路径需要与采集规则保持一致。若 Pod 重建后日志必须保留，请使用持久化卷或把日志实时采集到远端。

---

## 常见问题

| 现象 | 检查项 |
|------|--------|
| 日志缺失 | Pod 是否输出日志、采集规则是否匹配 |
| 字段解析失败 | 日志格式是否稳定、JSON 是否有效 |
| 查询慢 | 索引字段不足、时间范围过大 |
| 成本高 | 保留周期过长、debug 日志过多 |
