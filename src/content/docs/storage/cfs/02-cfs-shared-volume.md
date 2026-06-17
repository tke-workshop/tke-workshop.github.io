---
title: "CFS 共享卷"
---

# CFS 共享卷

CFS 支持 `ReadWriteMany`，可以被多个 Pod 同时挂载。本文给出一个多副本共享目录的验证方式。

---

## 场景

适合：

- 多个 Web Pod 共享静态文件。
- 多个任务读写同一批处理目录。
- AI 推理 Pod 共享模型文件目录。

不适合：

- 高频小文件元数据风暴。
- 要求严格事务语义的数据库主数据目录。
- 未设计锁机制的多写入者场景。

---

## 部署测试工作负载

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shared-writer
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shared-writer
  template:
    metadata:
      labels:
        app: shared-writer
    spec:
      containers:
        - name: busybox
          image: busybox:1.36
          command: ["sh", "-c", "while true; do hostname >> /data/hosts.log; sleep 10; done"]
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: shared-data
```

```bash
kubectl apply -f shared-writer.yaml
kubectl get pods -l app=shared-writer -o wide
```

---

## 验证多 Pod 共享

```bash
POD=$(kubectl get pod -l app=shared-writer -o jsonpath='{.items[0].metadata.name}')
kubectl exec "${POD}" -- tail -n 20 /data/hosts.log
```

如果日志中出现多个 Pod hostname，说明多个副本正在写入同一共享目录。

---

## 发布建议

- 共享目录分业务、环境、应用拆分，避免所有服务写同一个根目录。
- 对写入频繁的文件设计锁或分片路径。
- 对关键数据开启快照或外部备份。
- 对小文件数量、目录层级和吞吐设置监控。

---

## 清理

```bash
kubectl delete deployment shared-writer
```
