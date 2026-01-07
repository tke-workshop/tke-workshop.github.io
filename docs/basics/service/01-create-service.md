# 如何创建 Kubernetes Service

## 文档元信息

- **功能名称**: 创建 Service
- **Kubernetes 版本**: v1.20+
- **适用集群版本**: 所有 TKE 集群
- **文档更新时间**: 2026-01-07
- **Agent 友好度**: ⭐⭐⭐⭐⭐

---

## 功能概述

在 TKE 集群中创建 Kubernetes Service,为 Pod 提供稳定的网络访问入口。支持四种访问方式:
1. **ClusterIP**: 集群内访问
2. **NodePort**: 通过节点端口访问
3. **LoadBalancer**: 通过腾讯云负载均衡器访问(公网/内网)
4. **ExternalName**: DNS 别名映射

**任务目标**: 为应用创建 Service,实现服务发现和负载均衡

---

## 前置条件

- [ ] 集群状态为 `Running`
- [ ] 已配置 kubectl 访问凭证
- [ ] 目标 Pod/Deployment 已创建
- [ ] 了解应用的端口和协议

---

## Service 类型对比

| 类型 | 访问范围 | 使用场景 | TKE 增强 |
|------|---------|---------|---------|
| ClusterIP | 集群内 | 数据库、缓存等内部服务 | - |
| NodePort | 集群内+节点IP | 开发测试、临时访问 | - |
| LoadBalancer | 公网/VPC内网 | 生产环境 Web 服务 | 自动创建 CLB |
| ExternalName | 集群内 | 访问集群外服务 | - |

---

## 方式一: 创建 ClusterIP Service

### Step 1: 准备 YAML 配置

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
  namespace: default
  labels:
    app: my-app
spec:
  type: ClusterIP
  selector:
    app: my-app              # 选择带此标签的 Pod
  ports:
  - name: http
    protocol: TCP
    port: 80                 # Service 端口
    targetPort: 8080         # Pod 端口
  sessionAffinity: None      # 会话亲和性: None / ClientIP
```

### Step 2: 创建 Service

```bash
kubectl apply -f service-clusterip.yaml
```

### Step 3: 验证 Service

```bash
# 查看 Service
kubectl get svc my-app-svc

# 查看详情
kubectl describe svc my-app-svc

# 测试访问
kubectl run test-pod --image=busybox:1.28 --rm -it --restart=Never -- \
  wget -O- http://my-app-svc.default.svc.cluster.local
```

**期望输出**:

```
NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
my-app-svc   ClusterIP   10.96.123.45    <none>        80/TCP    1m
```

---

## 方式二: 创建 NodePort Service

### Step 1: 准备 YAML 配置

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-nodeport
  namespace: default
spec:
  type: NodePort
  selector:
    app: my-app
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 8080
    nodePort: 30080          # 节点端口 (30000-32767)
```

### Step 2: 创建并验证

```bash
kubectl apply -f service-nodeport.yaml

# 获取节点 IP
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')

# 测试访问
curl http://$NODE_IP:30080
```

---

## 方式三: 创建 LoadBalancer Service (公网)

### Step 1: 准备 YAML 配置

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-lb-public
  namespace: default
  annotations:
    # TKE 自动创建 CLB
    service.kubernetes.io/qcloud-loadbalancer-internet-charge-type: "TRAFFIC_POSTPAID_BY_HOUR"
    service.kubernetes.io/qcloud-loadbalancer-internet-max-bandwidth-out: "10"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 8080
  externalTrafficPolicy: Cluster    # Cluster / Local
```

**关键 Annotations 说明**:

| Annotation | 说明 | 示例值 |
|-----------|------|--------|
| `service.kubernetes.io/qcloud-loadbalancer-internet-charge-type` | 公网计费模式 | TRAFFIC_POSTPAID_BY_HOUR(按流量) |
| `service.kubernetes.io/qcloud-loadbalancer-internet-max-bandwidth-out` | 公网带宽上限(Mbps) | "10" |
| `service.kubernetes.io/tke-existed-lbid` | 使用已有 CLB | lb-xxxxxxxx |

### Step 2: 创建并获取公网 IP

```bash
kubectl apply -f service-lb-public.yaml

# 等待 EXTERNAL-IP 分配
kubectl get svc my-app-lb-public -w

# 获取 CLB 域名
LB_DOMAIN=$(kubectl get svc my-app-lb-public -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# 测试访问
curl http://$LB_DOMAIN
```

**期望输出**:

```
NAME               TYPE           CLUSTER-IP     EXTERNAL-IP                        PORT(S)        AGE
my-app-lb-public   LoadBalancer   10.96.45.67    xxx.clb.myqcloud.com              80:31234/TCP   2m
```

---

## 方式四: 创建 LoadBalancer Service (内网)

### Step 1: 准备 YAML 配置

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-lb-internal
  namespace: default
  annotations:
    # 指定内网访问
    service.kubernetes.io/qcloud-loadbalancer-internal-subnetid: "subnet-xxxxxxxx"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 8080
```

**必需 Annotation**:

| Annotation | 必填 | 说明 |
|-----------|------|------|
| `service.kubernetes.io/qcloud-loadbalancer-internal-subnetid` | 是 | 内网 CLB 所在子网 ID |

### Step 2: 创建并验证

```bash
kubectl apply -f service-lb-internal.yaml

# 查看内网 IP
kubectl get svc my-app-lb-internal

# 从集群内部测试
kubectl run test --image=busybox:1.28 --rm -it --restart=Never -- \
  wget -O- http://<CLUSTER-IP>
```

---

## 高级配置

### 1. 会话保持 (Session Affinity)

```yaml
spec:
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800    # 会话超时时间(秒)
```

### 2. 使用已有 CLB

```yaml
metadata:
  annotations:
    service.kubernetes.io/tke-existed-lbid: "lb-xxxxxxxx"
    service.kubernetes.io/qcloud-share-existed-lb: "true"
```

### 3. 指定源 IP 保留

```yaml
spec:
  externalTrafficPolicy: Local    # 保留客户端源 IP
```

**注意**: `Local` 模式可能导致流量不均衡。

### 4. 多端口 Service

```yaml
spec:
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 8080
  - name: https
    protocol: TCP
    port: 443
    targetPort: 8443
```

### 5. 健康检查配置

```yaml
metadata:
  annotations:
    service.kubernetes.io/qcloud-loadbalancer-health-check-flag: "on"
    service.kubernetes.io/qcloud-loadbalancer-health-check-type: "TCP"
    service.kubernetes.io/qcloud-loadbalancer-health-check-interval-time: "5"
```

---

## 使用 kubectl 命令创建

### 快速创建 ClusterIP Service

```bash
kubectl expose deployment my-app \
  --name=my-app-svc \
  --port=80 \
  --target-port=8080 \
  --type=ClusterIP
```

### 快速创建 LoadBalancer Service

```bash
kubectl expose deployment my-app \
  --name=my-app-lb \
  --port=80 \
  --target-port=8080 \
  --type=LoadBalancer
```

---

## 验证步骤

### Step 1: 检查 Service 状态

```bash
# 查看所有 Service
kubectl get svc -A

# 查看特定 Service
kubectl get svc my-app-svc -o yaml

# 查看 Endpoints
kubectl get endpoints my-app-svc
```

### Step 2: 测试连通性

**ClusterIP 类型**:

```bash
kubectl run test --image=busybox:1.28 --rm -it --restart=Never -- \
  wget -qO- http://my-app-svc
```

**LoadBalancer 类型**:

```bash
# 获取外部 IP/域名
EXTERNAL_IP=$(kubectl get svc my-app-lb -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# 测试访问
curl http://$EXTERNAL_IP
```

### Step 3: 检查 CLB 配置 (LoadBalancer 类型)

```bash
# 查看 Service 关联的 CLB ID
kubectl get svc my-app-lb -o jsonpath='{.metadata.annotations.service\.kubernetes\.io/loadbalance-id}'

# 使用 CLI 查询 CLB 详情
tccli clb DescribeLoadBalancers \
  --LoadBalancerIds '["lb-xxxxxxxx"]'
```

---

## 异常处理

### 常见问题及解决方案

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| EXTERNAL-IP 一直是 Pending | CLB 创建失败 | 检查 Service 事件: `kubectl describe svc` |
| Endpoints 为空 | Selector 未匹配到 Pod | 检查 Pod 标签与 Service selector 是否一致 |
| CLB 创建失败 | 配额不足或参数错误 | 查看 Service 事件获取详细错误信息 |
| 无法访问 Service | 安全组或网络策略限制 | 检查安全组规则和 NetworkPolicy |
| 源 IP 丢失 | 使用了 Cluster 模式 | 修改为 `externalTrafficPolicy: Local` |

### 调试步骤

```bash
# 1. 查看 Service 事件
kubectl describe svc my-app-svc

# 2. 查看 Endpoints
kubectl get endpoints my-app-svc

# 3. 查看 Pod 标签
kubectl get pods --show-labels

# 4. 测试 Pod 直接访问
POD_IP=$(kubectl get pod <pod-name> -o jsonpath='{.status.podIP}')
kubectl run test --image=busybox:1.28 --rm -it --restart=Never -- \
  wget -qO- http://$POD_IP:8080

# 5. 查看 Service 控制器日志
kubectl logs -n kube-system -l component=service-controller
```

---

## Agent Prompt 模板

### 创建内部服务 Prompt

```prompt
请创建一个 ClusterIP Service:
- 服务名称: {{service_name}}
- 命名空间: {{namespace}}
- 选择器: app={{app_label}}
- Service 端口: {{service_port}}
- 容器端口: {{container_port}}
```

### 创建公网服务 Prompt

```prompt
请创建一个公网可访问的 LoadBalancer Service:
- 服务名称: my-web-app
- 选择器: app=nginx
- Service 端口: 80
- 容器端口: 80
- 公网带宽: 10 Mbps
- 计费方式: 按流量计费
```

### 使用已有 CLB Prompt

```prompt
请创建 Service 并使用已有 CLB:
- 服务名称: existing-lb-svc
- CLB ID: lb-abc12345
- Service 端口: 80
- 容器端口: 8080
- 选择器: app=my-app
```

---

## 最佳实践

1. **命名规范**: 使用 `{app}-{type}-{env}` 格式,如 `nginx-svc-prod`

2. **标签选择器**: 
   - 使用明确的标签,避免选择到不相关的 Pod
   - 建议使用多个标签组合: `app=nginx,version=v1`

3. **端口命名**: 为多端口 Service 的每个端口命名

4. **生产环境**:
   - 使用 LoadBalancer 而非 NodePort
   - 启用会话保持 (如有需要)
   - 配置健康检查

5. **成本优化**:
   - 多个 Service 可共享同一个 CLB (使用不同端口)
   - 测试环境使用 ClusterIP + Ingress

6. **安全性**:
   - 内网服务使用 ClusterIP
   - 公网服务配置安全组限制来源 IP

---

## 相关文档

- [删除 Service](./02-delete-service.md)
- [更新 Service](./03-update-service.md)
- [Service 负载均衡配置](./04-service-lb-config.md)
- [创建 Ingress](./05-create-ingress.md)

---

## 参考链接

- **Kubernetes Service 文档**: https://kubernetes.io/docs/concepts/services-networking/service/
- **TKE Service 文档**: https://cloud.tencent.com/document/product/457/45489
- **CLB Annotation 说明**: https://cloud.tencent.com/document/product/457/45490

---

## Cookbook 示例

完整可执行代码示例: [TKE Service 创建 Cookbook](../../cookbook/create-service-example.sh)

---

**文档版本**: v1.0  
**最后更新**: 2026-01-07  
**维护者**: TKE Documentation Team
