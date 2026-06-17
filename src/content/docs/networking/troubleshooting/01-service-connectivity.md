---
title: "Service 连通性排障"
---

# Service 连通性排障

本文提供一套从 Pod 到 CLB 的排障路径，适用于 ClusterIP、NodePort、LoadBalancer Service 无法访问的情况。

---

## 快速判断

```bash
NAMESPACE=default
SERVICE=nginx

kubectl get svc "${SERVICE}" -n "${NAMESPACE}" -o wide
kubectl get endpoints "${SERVICE}" -n "${NAMESPACE}" -o wide
kubectl get endpointslice -n "${NAMESPACE}" -l kubernetes.io/service-name="${SERVICE}"
kubectl describe svc "${SERVICE}" -n "${NAMESPACE}"
```

判断重点：

- Service 是否存在，type 是否符合预期。
- selector 是否能匹配 Pod。
- Endpoint/EndpointSlice 是否为空。
- Service events 是否有 CLB、权限、配额、子网错误。

---

## Step 1: 检查后端 Pod

```bash
kubectl get pods -n "${NAMESPACE}" --show-labels -o wide
kubectl describe pod <pod-name> -n "${NAMESPACE}"
kubectl logs <pod-name> -n "${NAMESPACE}"
```

常见问题：

| 现象 | 处理 |
|------|------|
| Pod 不 Ready | 检查 readinessProbe、镜像、启动日志 |
| Pod label 不匹配 | 修正 Service selector 或 Pod label |
| Pod 端口不一致 | 确认 containerPort、Service targetPort |

---

## Step 2: 检查 Service 到 Pod

在集群内启动临时客户端：

```bash
kubectl run net-debug --rm -it \
  --image=curlimages/curl:8.8.0 \
  --restart=Never \
  -- sh
```

在容器内测试：

```bash
curl -v http://nginx.default.svc.cluster.local
curl -v http://<cluster-ip>:80
```

如果 DNS 失败但 ClusterIP 可访问，重点检查 CoreDNS；如果 ClusterIP 也失败，重点检查 Endpoint、NetworkPolicy、kube-proxy 或 CNI。

---

## Step 3: 检查 LoadBalancer

```bash
kubectl get svc "${SERVICE}" -n "${NAMESPACE}" -w
kubectl describe svc "${SERVICE}" -n "${NAMESPACE}"
```

`EXTERNAL-IP` 长时间 `<pending>` 时，检查：

| 检查项 | 说明 |
|--------|------|
| CLB 配额 | 默认配额不足会导致创建失败 |
| CAM 权限 | 集群相关角色需要创建/绑定 CLB 权限 |
| 子网参数 | 内网 CLB 必须指定正确子网 |
| Service 注解 | 复制 YAML 时删除旧的 `service.cloud.tencent.com/client-token` |
| 访问方式切换 | 避免直接在公网、内网、已有 CLB 之间切换 |

---

## Step 4: 检查安全组和路由

```bash
kubectl get nodes -o wide
kubectl get svc "${SERVICE}" -n "${NAMESPACE}" -o jsonpath='{.spec.ports[*].nodePort}'
```

NodePort 或 CLB 后端访问依赖节点端口时，安全组需要放通对应 NodePort 端口段。VPC-CNI 场景还要关注 Pod IP 所在子网、路由表、ACL 和目标资源安全组。

---

## Step 5: 检查网络策略

```bash
kubectl get networkpolicy -A
kubectl describe networkpolicy -n "${NAMESPACE}"
```

如果命名空间启用了默认拒绝策略，需要显式放通来源命名空间、Pod selector 和端口。不要忘记 DNS 出站流量，常见端口为 UDP/TCP 53。

---

## 常用一次性诊断命令

```bash
kubectl get svc,endpoints,endpointslice,pods -n "${NAMESPACE}" -o wide
kubectl describe svc "${SERVICE}" -n "${NAMESPACE}"
kubectl get events -n "${NAMESPACE}" --sort-by=.lastTimestamp
```

把现象记录成“从哪里访问、访问哪个地址、期望协议端口、实际报错”，再按链路逐层排查。
