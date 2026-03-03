# ChatQnA 部署指南

本文档提供在 TKE 上部署 OPEA ChatQnA 的完整指南，包括手动部署和自动化部署两种方式。

## 📋 Document Metadata

- **API Version**: 2024-03-03
- **Agent Friendliness**: ⭐⭐⭐⭐⭐
- **Applicable Clusters**: 标准 TKE / TKE+GPU / TKE 超级节点
- **Estimated Time**: 30-45 分钟

## 🎯 功能概述

ChatQnA 是基于 OPEA 的检索增强生成（RAG）问答系统，特点：

- ✅ 基于私有知识库的智能问答
- ✅ 支持文档上传和向量化
- ✅ 高精度语义检索
- ✅ 大语言模型生成回答
- ✅ 可扩展的微服务架构

## 前置条件

### 集群要求

- [x] TKE 集群 Kubernetes 1.24+
- [x] 至少 3 个工作节点
- [x] 每节点至少 4 核 8GB 内存
- [x] 集群总资源：20+ 核，40+ GB 内存
- [x] LoadBalancer 服务支持（TKE 默认支持）

### 工具要求

- [x] kubectl 已安装并配置
- [x] （可选）Python 3.8+ 用于自动化脚本
- [x] （可选）腾讯云 API 凭证用于创建集群

### 权限要求

- [x] 集群管理员权限（创建 Namespace、Deployment、Service）
- [x] （如使用自动化）腾讯云 TKE API 权限

## 部署方式

### 方式 1: 自动化部署（推荐）

使用 Python Cookbook 脚本一键部署。

#### 1.1 安装依赖

```bash
# 克隆项目
git clone https://github.com/your-org/ai-on-tke.git
cd ai-on-tke

# 安装依赖
pip install -r requirements.txt
```

#### 1.2 配置凭证

```bash
# 复制配置模板
cp config/config.example.yaml config/config.yaml

# 编辑配置文件
vim config/config.yaml
```

配置示例：

```yaml
tencent_cloud:
  secret_id: "YOUR_SECRET_ID"
  secret_key: "YOUR_SECRET_KEY"
  region: "ap-guangzhou"

tke:
  cluster_version: "1.28.3"
  vpc_cidr: "10.0.0.0/16"
  instance_type: "S5.LARGE8"  # 4核8GB
```

#### 1.3 端到端部署

```bash
# 部署（包含创建集群）
python cookbook/scenarios/chatqna_e2e.py \
  --cluster-name opea-demo \
  --region ap-guangzhou \
  --node-count 3 \
  --wait

# 输出示例:
# ✅ 创建 VPC: vpc-xxx
# ✅ 创建子网: subnet-xxx  
# ✅ 创建集群: cls-xxx
# ✅ 创建节点池（3 节点）
# ✅ 等待集群就绪...
# ✅ 部署 ChatQnA 组件
# ✅ 验证部署成功
# 
# Gateway 访问地址: http://123.45.67.89:8888
```

#### 1.4 部署到现有集群

如果已有 TKE 集群：

```bash
python cookbook/opea/deploy_chatqna.py \
  --cluster-id cls-xxx \
  --namespace opea-system \
  --wait
```

### 方式 2: 手动 kubectl 部署

使用 Kubernetes YAML 文件手动部署。

#### 2.1 创建命名空间

```bash
kubectl apply -f- <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: opea-system
  labels:
    name: opea-system
spec:
  resourceQuota:
    hard:
      requests.cpu: "50"
      requests.memory: "100Gi"
EOF
```

#### 2.2 创建 ConfigMap

```bash
kubectl apply -f manifests/chatqna/configmap.yaml
```

#### 2.3 部署组件（按顺序）

```bash
# 1. Redis 向量数据库
kubectl apply -f manifests/chatqna/redis.yaml

# 2. Embedding 服务
kubectl apply -f manifests/chatqna/embedding.yaml

# 3. Retrieval 服务
kubectl apply -f manifests/chatqna/retrieval.yaml

# 4. Reranking 服务
kubectl apply -f manifests/chatqna/rerank.yaml

# 5. LLM 服务（需要较长时间）
kubectl apply -f manifests/chatqna/llm.yaml

# 6. DataPrep 服务
kubectl apply -f manifests/chatqna/dataprep.yaml

# 7. Gateway 服务
kubectl apply -f manifests/chatqna/gateway.yaml
```

#### 2.4 等待部署完成

```bash
# 查看 Pod 状态
kubectl get pods -n opea-system -w

# 等待所有 Pod 就绪
kubectl wait --for=condition=ready pod \
  -l app=chatqna \
  -n opea-system \
  --timeout=900s
```

## 验证部署

### 检查服务状态

```bash
# 检查所有 Pod
kubectl get pods -n opea-system

# 期望输出（所有 Pod Running）:
# NAME                                READY   STATUS    AGE
# chatqna-redis-xxx                   1/1     Running   5m
# chatqna-embedding-xxx               2/2     Running   5m
# chatqna-retrieval-xxx               1/1     Running   5m
# chatqna-rerank-xxx                  2/2     Running   5m
# chatqna-llm-xxx                     2/2     Running   8m
# chatqna-dataprep-xxx                1/1     Running   5m
# chatqna-gateway-xxx                 1/1     Running   5m
```

### 检查服务端点

```bash
# 获取 Gateway 服务
kubectl get svc chatqna-gateway -n opea-system

# 输出:
# NAME               TYPE           EXTERNAL-IP     PORT(S)
# chatqna-gateway    LoadBalancer   123.45.67.89    8888:30123/TCP
```

### API 健康检查

```bash
export GATEWAY_IP=<EXTERNAL-IP>

# 健康检查
curl http://${GATEWAY_IP}:8888/v1/health

# 期望返回:
# {"status": "healthy"}
```

### 功能测试

```bash
# 测试问答
curl -X POST http://${GATEWAY_IP}:8888/v1/chatqna \
  -H "Content-Type: application/json" \
  -d '{
    "messages": "What is TKE?",
    "max_tokens": 100
  }'

# 期望返回 JSON 格式的答案
```

## 数据导入

### 上传文本文件

```bash
# 准备测试文档
echo "TKE is Tencent Kubernetes Engine..." > test-doc.txt

# 上传文档
curl -X POST http://${GATEWAY_IP}:6007/v1/dataprep \
  -F "files=@test-doc.txt"

# 返回:
# {"status": "success", "file_id": "xxx"}
```

### 批量导入 URL

```bash
curl -X POST http://${GATEWAY_IP}:6007/v1/dataprep \
  -H "Content-Type: application/json" \
  -d '{
    "link_list": [
      "https://cloud.tencent.com/document/product/457",
      "https://kubernetes.io/docs/"
    ]
  }'
```

### 验证数据导入

```bash
# 查询导入的文档
curl http://${GATEWAY_IP}:6007/v1/dataprep/list

# 使用导入的数据测试
curl -X POST http://${GATEWAY_IP}:8888/v1/chatqna \
  -H "Content-Type: application/json" \
  -d '{
    "messages": "Tell me about TKE features",
    "max_tokens": 200
  }'
```

## 故障排查

### Pod 启动失败

```bash
# 查看 Pod 详情
kubectl describe pod <pod-name> -n opea-system

# 常见问题：
# 1. ImagePullBackOff - 镜像拉取失败
#    解决：检查网络，使用镜像加速
# 2. Insufficient resources - 资源不足
#    解决：添加节点或减少资源请求
# 3. CrashLoopBackOff - 容器崩溃
#    解决：查看日志排查问题
```

### 服务无法访问

```bash
# 检查服务端点
kubectl get endpoints -n opea-system

# 检查网络策略
kubectl get networkpolicies -n opea-system

# 测试 Pod 间连接
kubectl exec -it chatqna-gateway-xxx -n opea-system -- \
  curl http://chatqna-embedding:6000/v1/health
```

### LLM 响应慢

**原因**: CPU 推理性能有限

**优化方案**:

1. **使用 GPU 节点**（推荐）

```yaml
# 修改 llm.yaml
spec:
  template:
    spec:
      nodeSelector:
        accelerator: nvidia-tesla-t4
      containers:
      - name: vllm-service
        resources:
          limits:
            nvidia.com/gpu: 1
```

2. **增加副本数**

```bash
kubectl scale deployment chatqna-llm -n opea-system --replicas=2
```

3. **使用更小的模型**

修改 ConfigMap 中的 `LLM_MODEL_ID`。

## 监控和日志

### 查看日志

```bash
# Gateway 日志
kubectl logs -f deployment/chatqna-gateway -n opea-system

# LLM 服务日志（双容器）
kubectl logs -f deployment/chatqna-llm -n opea-system -c llm
kubectl logs -f deployment/chatqna-llm -n opea-system -c vllm-service

# 所有组件日志
kubectl logs -l app=chatqna -n opea-system --tail=100
```

### 资源监控

```bash
# Pod 资源使用
kubectl top pods -n opea-system

# 节点资源使用
kubectl top nodes
```

### 部署 Prometheus 监控（可选）

参考 TKE 监控最佳实践配置 Prometheus 和 Grafana。

## 清理资源

### 删除 ChatQnA 部署

```bash
# 删除所有组件
kubectl delete namespace opea-system

# 或使用脚本
python cookbook/opea/cleanup.py --cluster-id cls-xxx
```

### 删除 TKE 集群

```bash
# 使用脚本删除
python cookbook/cluster/delete_cluster.py \
  --cluster-id cls-xxx \
  --region ap-guangzhou

# 或通过 TKE 控制台删除
```

## Agent Prompt 模板

以下是供 AI Agent 使用的提示词模板：

```
请在 TKE 上部署 OPEA ChatQnA 应用。

要求:
1. 使用自动化脚本部署
2. 集群名称: opea-demo
3. 区域: ap-guangzhou  
4. 节点数: 3
5. 等待部署完成并验证

执行命令:
python cookbook/scenarios/chatqna_e2e.py \
  --cluster-name opea-demo \
  --region ap-guangzhou \
  --node-count 3 \
  --wait

验证步骤:
1. 检查所有 Pod 状态
2. 测试 API 健康检查
3. 上传测试文档
4. 测试问答功能

预期结果:
所有组件正常运行，API 返回正确答案。
```

## 相关资源

- [快速开始](quickstart.md) - 5 分钟快速部署
- [架构详解](architecture.md) - OPEA 架构说明
- [自动化部署](automation.md) - Cookbook 脚本详解
- [生产实践](production.md) - 生产环境优化
- [OPEA 官方文档](https://opea-project.github.io/)

---

**部署时间估算**: 手动部署 ~30 分钟，自动化部署 ~20 分钟（不含集群创建）

[:octicons-arrow-right-24: 下一步：架构详解](architecture.md)
