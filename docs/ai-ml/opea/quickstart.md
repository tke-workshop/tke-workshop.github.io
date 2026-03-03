# 快速开始：5 分钟部署 ChatQnA

!!! success "目标"
    在 5 分钟内在现有 TKE 集群上部署一个完整的 ChatQnA 应用

## 前置条件

- ✅ 已有 TKE 集群（Kubernetes 1.24+）
- ✅ 集群至少 3 个节点，每节点 4 核 8GB+
- ✅ kubectl 已配置并可访问集群
- ✅ 集群有足够资源（~20 核 40GB）

## 部署步骤

### 步骤 1: 克隆项目（30 秒）

```bash
git clone https://github.com/your-org/ai-on-tke.git
cd ai-on-tke
```

### 步骤 2: 部署到 TKE（3 分钟）

```bash
# 创建命名空间和配置
kubectl apply -f manifests/chatqna/namespace.yaml
kubectl apply -f manifests/chatqna/configmap.yaml

# 部署所有组件
kubectl apply -f manifests/chatqna/redis.yaml
kubectl apply -f manifests/chatqna/embedding.yaml
kubectl apply -f manifests/chatqna/retrieval.yaml
kubectl apply -f manifests/chatqna/rerank.yaml
kubectl apply -f manifests/chatqna/llm.yaml
kubectl apply -f manifests/chatqna/dataprep.yaml
kubectl apply -f manifests/chatqna/gateway.yaml
```

### 步骤 3: 等待 Pod 就绪（2-10 分钟）

```bash
# 查看 Pod 状态
kubectl get pods -n opea-system -w

# 等待所有 Pod 就绪
kubectl wait --for=condition=ready pod \
  -l app=chatqna \
  -n opea-system \
  --timeout=600s
```

预期输出：

```
NAME                                READY   STATUS    RESTARTS   AGE
chatqna-redis-xxx                   1/1     Running   0          2m
chatqna-embedding-xxx               2/2     Running   0          2m
chatqna-retrieval-xxx               1/1     Running   0          2m
chatqna-rerank-xxx                  2/2     Running   0          2m
chatqna-llm-xxx                     2/2     Running   0          5m
chatqna-dataprep-xxx                1/1     Running   0          2m
chatqna-gateway-xxx                 1/1     Running   0          2m
```

!!! note "LLM Pod 启动较慢"
    LLM 服务需要加载大模型（~7GB），首次启动可能需要 5-10 分钟。

### 步骤 4: 获取访问地址（10 秒）

```bash
# 获取 Gateway 服务信息
kubectl get svc chatqna-gateway -n opea-system

# 输出示例:
# NAME               TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)
# chatqna-gateway    LoadBalancer   172.16.10.100   123.45.67.89    8888:30123/TCP
```

Gateway 访问地址：`http://<EXTERNAL-IP>:8888`

### 步骤 5: 测试 API（30 秒）

```bash
# 设置 Gateway IP
export GATEWAY_IP=<EXTERNAL-IP>  # 替换为实际 IP

# 健康检查
curl http://${GATEWAY_IP}:8888/v1/health

# 测试问答（首次查询可能较慢）
curl -X POST http://${GATEWAY_IP}:8888/v1/chatqna \
  -H "Content-Type: application/json" \
  -d '{
    "messages": "What is Kubernetes?",
    "max_tokens": 100
  }'
```

预期返回：

```json
{
  "response": "Kubernetes is an open-source container orchestration platform...",
  "retrieval_context": [...],
  "metadata": {
    "model": "Intel/neural-chat-7b-v3-3",
    "tokens_used": 87
  }
}
```

## 🎉 完成！

恭喜！你已经成功在 TKE 上部署了 OPEA ChatQnA 应用。

---

## 下一步操作

### 1. 导入你的数据

使用 DataPrep 服务导入文档：

```bash
# 上传文本文件
curl -X POST http://${GATEWAY_IP}:6007/v1/dataprep \
  -F "files=@your-document.txt"

# 或上传 URL
curl -X POST http://${GATEWAY_IP}:6007/v1/dataprep \
  -H "Content-Type: application/json" \
  -d '{
    "link_list": ["https://example.com/doc.pdf"]
  }'
```

### 2. 使用 Web UI（可选）

部署 ChatQnA Web UI：

```bash
kubectl apply -f- <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chatqna-ui
  namespace: opea-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: chatqna-ui
  template:
    metadata:
      labels:
        app: chatqna-ui
    spec:
      containers:
      - name: ui
        image: opea/chatqna-ui:latest
        ports:
        - containerPort: 5173
        env:
        - name: CHAT_BASE_URL
          value: "http://chatqna-gateway:8888"
---
apiVersion: v1
kind: Service
metadata:
  name: chatqna-ui
  namespace: opea-system
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 5173
  selector:
    app: chatqna-ui
EOF
```

访问 UI：

```bash
kubectl get svc chatqna-ui -n opea-system
# 浏览器打开 http://<UI-EXTERNAL-IP>
```

### 3. 监控和日志

查看组件日志：

```bash
# Gateway 日志
kubectl logs -f deployment/chatqna-gateway -n opea-system

# LLM 服务日志
kubectl logs -f deployment/chatqna-llm -n opea-system -c llm

# 所有组件日志
kubectl logs -l app=chatqna -n opea-system --tail=50
```

查看资源使用：

```bash
# Pod 资源使用
kubectl top pods -n opea-system

# 节点资源使用
kubectl top nodes
```

---

## 常见问题

### Q1: Pod 一直处于 Pending 状态

**原因**: 资源不足

**解决方法**:

```bash
# 检查资源
kubectl describe pod <pod-name> -n opea-system

# 查看节点资源
kubectl top nodes

# 如果资源不足，添加节点或调整资源请求
```

### Q2: LLM Pod 启动超时（ImagePullBackOff）

**原因**: 镜像较大（~10GB），拉取慢

**解决方法**:

```bash
# 增加超时时间
kubectl wait --timeout=1200s ...

# 或预拉取镜像
kubectl apply -f tests/image-puller-daemonset.yaml
```

### Q3: API 返回 502/503 错误

**原因**: 服务尚未就绪

**解决方法**:

```bash
# 检查所有服务健康状态
kubectl get pods -n opea-system
kubectl logs -f deployment/chatqna-gateway -n opea-system

# 确保所有 Pod 都是 Running 且 READY
```

### Q4: 查询响应很慢（>10 秒）

**原因**: CPU 推理性能有限

**优化方法**:

1. 使用 GPU 节点（性能提升 10x+）
2. 减少 `max_tokens` 参数
3. 增加 LLM Pod 副本数（负载均衡）

```bash
# 扩展 LLM 副本
kubectl scale deployment chatqna-llm -n opea-system --replicas=2
```

---

## 清理资源

如果要删除部署：

```bash
# 删除所有 ChatQnA 资源
kubectl delete namespace opea-system

# 或逐个删除
kubectl delete -f manifests/chatqna/
```

---

## 进一步学习

- [ChatQnA 完整部署指南](chatqna-deployment.md) - 详细配置和自定义
- [架构详解](architecture.md) - 了解 OPEA 内部工作原理
- [自动化部署](automation.md) - 使用脚本批量部署
- [生产实践](production.md) - 生产环境优化建议

---

**预计时间**: 实际部署时间 5-15 分钟（取决于网络速度和集群资源）

[:octicons-arrow-right-24: 下一步：完整部署指南](chatqna-deployment.md)
