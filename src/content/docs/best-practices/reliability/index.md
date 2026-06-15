---
title: "可靠性最佳实践"
---

# 可靠性最佳实践

## 🛡️ 概述

本节提供 TKE 系统可靠性保障的最佳实践，包括监控告警、日志采集、链路追踪、备份恢复和混沌工程等关键领域。

---

## 📚 内容导航

### 🏥 健康检查

- **Liveness Probe** - 存活探针
  - HTTP/TCP/Exec 探测方式
  - 超时和重试配置
  - 避免误杀策略

- **Readiness Probe** - 就绪探针
  - 流量接入控制
  - 启动时间配置
  - 滚动更新保护

- **Startup Probe** - 启动探针
  - 慢启动应用保护
  - 避免 Liveness 误杀

### 📊 资源管理

- **Resource Requests/Limits** - 资源配额
  - CPU/内存配置建议
  - QoS 等级（Guaranteed/Burstable/BestEffort）
  - 避免 OOMKilled
  - 资源超售控制

- **ResourceQuota** - 命名空间配额
  - CPU/内存总量限制
  - Pod 数量限制
  - PVC 存储限制

- **LimitRange** - 资源范围限制
  - 默认 Requests/Limits
  - 最小/最大资源限制

### 📈 监控告警

- **[Prometheus 监控](../observability/monitoring.md)** - 指标采集
  - Metrics Server
  - Prometheus Operator
  - 自定义指标
  - Grafana 可视化

- **告警规则** - 智能告警
  - CPU/内存告警
  - Pod 重启告警
  - 磁盘空间告警
  - 告警分级和通知

### 📝 日志采集

- **[日志方案](../observability/logging.md)** - 日志收集
  - ELK Stack（Elasticsearch + Logstash + Kibana）
  - Loki + Promtail
  - 腾讯云 CLS
  - 日志持久化策略

### 🔍 链路追踪

- **[分布式追踪](../observability/tracing.md)** - 链路分析
  - Jaeger
  - SkyWalking
  - OpenTelemetry
  - 性能瓶颈分析

### 💾 备份恢复

- **ETCD 备份** - 集群数据备份
  - 定期备份策略
  - 快照管理
  - 备份验证

- **应用数据备份** - 持久化数据保护
  - PVC 快照
  - Velero 备份工具
  - 跨集群恢复

### 🌪️ 混沌工程

- **Chaos Mesh** - 故障注入
  - Pod 故障注入
  - 网络故障模拟
  - IO 故障模拟
  - 压力测试

---

## 🎯 核心原则

### 1. 可观测性（Observability）

- **监控** - 实时了解系统状态
- **日志** - 问题排查和审计
- **追踪** - 性能瓶颈定位

### 2. 故障预防（Prevention）

- **健康检查** - 及时发现异常
- **资源限制** - 避免资源耗尽
- **告警通知** - 快速响应

### 3. 快速恢复（Recovery）

- **自动重启** - 自愈能力
- **备份恢复** - 数据保护
- **回滚机制** - 快速回退

---

## 🔍 可靠性检查清单

### 监控层面

- [ ] 部署 Prometheus + Grafana
- [ ] 配置核心指标告警
- [ ] 配置日志采集系统
- [ ] 启用 APM 追踪（可选）
- [ ] 配置告警通知渠道

### 应用层面

- [ ] 配置 Liveness Probe
- [ ] 配置 Readiness Probe
- [ ] 设置 Resource Requests
- [ ] 设置 Resource Limits
- [ ] 配置日志输出
- [ ] 集成链路追踪（可选）

### 基础设施层面

- [ ] 启用 ETCD 定期备份
- [ ] 配置 PVC 快照策略
- [ ] 部署 Velero（可选）
- [ ] 配置节点监控
- [ ] 启用审计日志

---

## 📖 快速开始

### 场景 1: 完整健康检查配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reliable-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: reliable-app
  template:
    metadata:
      labels:
        app: reliable-app
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        ports:
        - containerPort: 8080
        
        # 存活探针 - 检测进程是否存活
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30    # 启动后 30 秒开始检测
          periodSeconds: 10           # 每 10 秒检测一次
          timeoutSeconds: 5           # 超时 5 秒
          failureThreshold: 3         # 连续失败 3 次重启
          successThreshold: 1         # 成功 1 次即恢复
        
        # 就绪探针 - 检测是否准备接收流量
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5      # 启动后 5 秒开始检测
          periodSeconds: 5            # 每 5 秒检测一次
          timeoutSeconds: 3
          failureThreshold: 3
          successThreshold: 1
        
        # 启动探针 - 保护慢启动应用
        startupProbe:
          httpGet:
            path: /startup
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 30        # 最多等待 300 秒启动
          successThreshold: 1
        
        # 资源配置
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

### 场景 2: 监控告警配置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
data:
  alerts.yaml: |
    groups:
    - name: pod-alerts
      interval: 30s
      rules:
      # Pod CPU 使用率告警
      - alert: PodHighCPU
        expr: |
          sum(rate(container_cpu_usage_seconds_total[5m])) by (pod, namespace) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod CPU 使用率过高"
          description: "{{ $labels.namespace }}/{{ $labels.pod }} CPU 使用率超过 80%"
      
      # Pod 内存使用率告警
      - alert: PodHighMemory
        expr: |
          sum(container_memory_working_set_bytes) by (pod, namespace) / 
          sum(container_spec_memory_limit_bytes) by (pod, namespace) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod 内存使用率过高"
          description: "{{ $labels.namespace }}/{{ $labels.pod }} 内存使用率超过 90%"
      
      # Pod 重启告警
      - alert: PodRestarting
        expr: |
          rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod 频繁重启"
          description: "{{ $labels.namespace }}/{{ $labels.pod }} 在过去 15 分钟内重启"
      
      # Pod 状态异常
      - alert: PodNotReady
        expr: |
          kube_pod_status_phase{phase!="Running"} == 1
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Pod 状态异常"
          description: "{{ $labels.namespace }}/{{ $labels.pod }} 状态为 {{ $labels.phase }}"
```

### 场景 3: ETCD 备份脚本

```bash
#!/bin/bash
# ETCD 备份脚本

ETCD_ENDPOINTS="https://127.0.0.1:2379"
ETCD_CERT="/etc/kubernetes/pki/etcd/server.crt"
ETCD_KEY="/etc/kubernetes/pki/etcd/server.key"
ETCD_CA="/etc/kubernetes/pki/etcd/ca.crt"
BACKUP_DIR="/data/etcd-backup"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/etcd-snapshot-$TIMESTAMP.db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行快照
etcdctl snapshot save $BACKUP_FILE \
  --endpoints=$ETCD_ENDPOINTS \
  --cacert=$ETCD_CA \
  --cert=$ETCD_CERT \
  --key=$ETCD_KEY

# 验证快照
etcdctl snapshot status $BACKUP_FILE \
  --write-out=table

# 清理 7 天前的备份
find $BACKUP_DIR -name "etcd-snapshot-*.db" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

---

## 🚨 常见可靠性风险

### 高风险

- ⚠️ **无健康检查** - 无法及时发现故障
- ⚠️ **无监控告警** - 问题发现延迟
- ⚠️ **无备份策略** - 数据丢失风险
- ⚠️ **无资源限制** - 资源耗尽导致雪崩

### 中风险

- ⚠️ **健康检查配置不当** - 误杀健康 Pod
- ⚠️ **日志未持久化** - 问题排查困难
- ⚠️ **告警规则缺失** - 关键问题未覆盖

### 低风险

- ⚠️ **日志级别过高** - 磁盘空间浪费
- ⚠️ **告警阈值不合理** - 告警疲劳

---

## 🔗 相关资源

- [监控告警配置](../observability/monitoring.md)
- [日志采集方案](../observability/logging.md)
- [链路追踪实践](../observability/tracing.md)
- [Kubernetes 监控官方文档](https://kubernetes.io/docs/tasks/debug/)
