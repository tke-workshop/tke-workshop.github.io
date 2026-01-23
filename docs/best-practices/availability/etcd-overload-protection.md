# TKE 集群 etcd 过载保护最佳实践

## 背景

虽然 Kubernetes 通过 API Server 和 client 一系列缓存等机制极大降低了控制面 etcd 压力，但是在 TKE 超大规模集群线上运营过程中，我们经常会收到客户因异常 list pod 等资源导致的控制面 etcd 和 API Server 高负载。

如下图 etcd 流量图所示，业务因对 K8s 原理了解不够，瞬间发起大量请求，查询大集群内指定标签的 pod，导致 etcd 过载。

当集群规模较大资源较多时，基于标签 list 资源、list 某 namespace 或者全量资源的请求，这类请求一旦穿透到 etcd，很容易打崩 etcd 和 API Server。而 etcd 扩容一般需要 10 分钟以上，即便扩容到最高配，超大流量场景，etcd 能承受高并发也是个位数。

为了解决以上挑战，我们亟需方案能够让这些 list 请求走到 API Server cache，避免流量层层穿透，降低 etcd 和 API Server 的负载，故障发生的时候能快速恢复。针对此类问题常规解决方案是业务使用 informer 或者请求参数里面设置下 ResourceVersion 为 0，如下所示，但是此解决方案依赖客户发版本，涉及到存量 Pod 不能重启的业务，业务无法快速解决，故障恢复慢。

```go
k8sClient.CoreV1().Pods("").List(metav1.ListOptions{ResourceVersion: "0"})
```

因此我们研发了 etcd 过载保护相关特性（ReadCache 和 SkipLimit），覆盖客户使用的主流 TKE 版本，可以从 API Server 侧一键下发策略，极大降低客户工作负担，从 API Server 维度实现 TKE 集群的 etcd 过载保护能力。

## 前提条件

### 版本要求

这些版本及以上小版本支持 configmap 方式下发 readcache/skiplimit：

- v1.30.0-tke.9
- v1.28.3-tke.14
- v1.26.1-tke.17
- v1.24.4-tke.26
- v1.22.5-tke.35
- v1.20.6-tke.54

1.20 及以下低版本目前暂时只通过环境变量的方式支持。

### 开关控制

- readcache 有 FG 开关控制 `TKEResetListRVZero=true` 默认启用。
- skiplimit 有 FG 开关控制 `TKEListSkipLimit=false` 默认关闭。

## readcache

### 场景

当集群资源较多时，有大量 list 全量 resource 请求访问引起 API Server、etcd 高负载。

**查询全量 Pod**：

```go
pods, err := clientset.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{})
```

**按标签查询 Pod**：

```go
pods, err := clientset.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{
    LabelSelector: labelSelector,
})
```

**基于节点查询 Pod**：

```go
pods, err := clientset.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{
    LabelSelector: labelSelector,
    FieldSelector: "spec.nodeName=" + nodeName,
})
```

### 功能

根据 list 请求的 userAgent 匹配，把请求中的 resourceVersion 设置为 0，让其走读缓存。

默认启用 FG `TKEResetListRVZero=true`

## skiplimit

### 场景

当集群资源较多时，有大量分页 list 请求访问引起 API Server、etcd 高负载。

**使用 kubectl 按标签查询 Pod**：

```bash
kubectl get pod -l app=nginx
```

```go
pods, err := clientset.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{
    Limit:    pageSize,
    Continue: continueToken,
})
```

### 功能

根据 list 请求的 userAgent 匹配，忽略请求中的 limit，让分页请求走读缓存。skiplimit 功能会自动启用 readcache 特性。

默认关闭 FG `TKEListSkipLimit=false`

!!! warning "注意"
    该操作将请求中的 limit 参数去掉后，如果实际上有 1000 个对象，请求设置了 limit=500，也会返回所有 1000 个对象，适合返回对象数量不会超过 limit 场景，比如根据节点查其 Pod。该特性会违背 K8s API 语义，请谨慎评估开启，仅在紧急故障场景下使用，需要通过工单由 TKE 团队协助开启此特性，客户暂时无法直接操作。

## readcache/skiplimit 实施

### 说明

1. 通过 resource 和 userAgent 匹配进行 readcache/skiplimit 的 list 请求的处理。
2. 支持 env 和 configmap 设置，当两者同时配置时候会进行合并，取并集。（每次 API Server 启动时候或者 ConfigMap 更新时，都会合并一次 env 和 configmap 取并集）
3. resource 需要使用复数小写，比如 pods、configmaps 等。

### 通过环境变量来设置

```yaml
# ReadCache 特性
name: TKE_READ_CACHE_RULE
value: '{"rules":[{"resource":"configmaps","userAgents":["okhttp/3.14.9","kubectl"]}]}'

# SkipLimit 特性
name: TKE_SKIP_LIMIT_RULE
value: '{"rules":[{"resource":"configmaps","userAgents":["kubectl"]}]}'
```

### 通过 configmap 来设置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tke-request-match-config
  namespace: kube-system
data:
  readcache: '{"rules":[{"resource":"configmaps","userAgents":["kubectl"]}]}'
  skiplimit: '{"rules":[{"resource":"configmaps","userAgents":["kubectl"]}]}'
```

### 完整的配置定义

1. 资源匹配时，会优先匹配 `*` 资源，即任意资源，如果命中 `*` 资源和对应的 userAgent 后，会忽略其他资源。
2. userAgent 相关匹配时，如果同时配置了 userAgent 和 excludeUserAgent，会优先匹配 userAgent，没有命中情况下才会匹配 excludeUserAgent。不建议同时配置 userAgent 和 excludeUserAgent。

```json
{
  "rules": [
    {
      "resource": "*",
      "excludeUserAgents": [
        "kube-apiserver",
        "kube-scheduler",
        "kube-controller-manager"
      ]
    },
    {
      "resource": "pods",
      "userAgents": [
        "okhttp"
      ],
      "excludeUserAgents": [
        "kube-apiserver",
        "kube-scheduler",
        "kube-controller-manager"
      ]
    },
    {
      "resource": "configmaps",
      "excludeUserAgents": [
        "kube-apiserver",
        "kube-scheduler",
        "kube-controller-manager"
      ]
    }
  ]
}
```

### 示例

```json
# 比如 readcache 配置了以下规则

# 正向匹配，表示针对 kubectl 和 okhttp 这两个 userAgent 的 list pod 走 readcache
{"rules":[{"resource":"pods","userAgents":["kubectl", "okhttp"]}]}

# 反向匹配，比如只有三大件不走缓存，其他都走缓存
{"rules":[{"resource":"pods","excludeUserAgents":["kube-apiserver", "kube-scheduler", "kube-controller-manager"]}]}

# 多个引起导致高负载的资源走 readcache
{"rules":[{"resource":"pods","userAgents":["kubelet","tke-state-metrics"]},{"resource":"configmaps","userAgents":["kubectl"]}]}
```

## 监控指标

例如创建一个 readcache 和 skiplimit 规则，启动 benchmark 工具在不断 list pod

### 命中缓存的监控指标

**list_reset_resource_version_zero_events_total**

list pod 走 readcache 的监控指标如下：

```bash
kubectl get --raw /metrics | grep list_reset_resource_version_zero_events_total
```

### 命中 skiplimit 监控指标

**list_reset_list_limit_zero_events_total**

skip limit pod 走 readcache 的监控指标如下：

```bash
kubectl get --raw /metrics | grep list_reset_list_limit_zero_events_total
```

### 配置的规则解析是否成功监控指标

**request_match_config_sync_counter**

ConfigMap 中的规则解析成功，指标如下，如果解析失败其中 label `result=failure`

```bash
kubectl get --raw /metrics | grep request_match_config_sync_counter
```

## 实战案例及效果

### 异常识别

业务集群因异常 list pod 出现 API Server CPU 高负载和 etcd 流量告警：

```
[ETCD告警][2025-04-01 06:06:39][ETCD出流量超过阀值，集群名:cls-xxxxxxxx, 当前流量大小:240.051MB
```

### 异常来源定位

查看 API Server 慢查询日志，确定 userAgent：

```
I0401 06:47:07.032841       1 trace.go:219] Trace[1893148101]: "List" accept:application/json, */*,audit-id:223398123-0b6c-4743-9c62-124,client:172.10.24.12,protocol:HTTP/2.0,resource:pods,scope:namespace,url:/api/v1/namespaces/infer/pods,user-agent: okhttp/v3.12 (linux/amd64) kubernetes/$Format/admin,verb:LIST (01-Apr-2025 06:47:06.490) (total time: 1542ms):
```

### 通过审计确认是否此 userAgent list pod 未带 resourceVersion（可选操作）

```sql
verb: list AND objectRef.resource: pods AND userAgent: okhttp
```

### 解决方案

锁定目标 userAgent，下发 ReadCache 策略。如下发失败，可能是高负载导致集群彻底雪崩，在一边尝试多次的情况下，一边请第一时间联系 TKE 团队通过环境变量从后台的方式下发。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tke-request-match-config
  namespace: kube-system
data:
  readcache: '{"rules":[{"resource":"pods","userAgents":["okhttp"]}]}'
```

### 观察效果

图一是下发 ReadCache 策略前后，API Server 前后 CPU 变化，6 点 50 后出现大幅下降。

图二是下发 ReadCache 策略前后，etcd 前后出流量变化，从 300MB 接近零。

## Q&A

### 1. 哪些场景不能下发？

业务对数据强一致性诉求，可能涉及服务发现等关键场景，建议先通过限速流控，降低 QPS。

### 2. cache 是否有延时？

API Server cache 通过 watch etcd 更新数据，一般情况下延时在毫秒左右，除非 etcd 和 API Server 高负载场景，或者大量写入场景导致事件推送堆积等。

### 3. skiplimit 场景什么时候能用？

高频分页查询、etcd 容量无法继续扩容、查询的资源数量返回实际一定少于 limit 场景。比如超大集群 kubelet 基于节点 IP 查询上面的 Pod，超大集群雪崩后，可能瞬间会对 etcd 造成巨大压力，适合临时下发此策略。

### 4. list 资源走 cache 方式有哪些，各有什么优缺点？

| 方案 | 措施 | 优点 | 缺点 |
| --- | --- | --- | --- |
| 业务侧 informer 方案 | 业务侧代码由 list 裸调方式改造成 informer 方式<br><br>参考 example：<br>[https://blog.csdn.net/russle/article/details/123038026](https://blog.csdn.net/russle/article/details/123038026)<br>[https://isekiro.com/client-go进阶教程一-informer/](https://isekiro.com/client-go进阶教程一-informer/)<br>[https://blog.haohtml.com/archives/32179/](https://blog.haohtml.com/archives/32179/) | 通过 ListWatch 机制获得资源，并在本地缓存，所有的读走本地缓存，本地读性能高，同时降低了 API Server/etcd 压力。 | 当 API Server/etcd 高负载时候，资源变化后推送到 client 端会有延迟，延迟情况跟 API Server/etcd 的负载情况以及要推送的 client 数量等强相关。<br><br>正常情况下延迟可以忽略不计。 |
| 业务侧 list 请求带 resourceVersion=0 | 业务侧在调用 list 请求时候带上 resourceVersion=0<br><br>示例代码：<br>`k8sClient.CoreV1().Pods("").List(metav1.ListOptions{ResourceVersion: "0"})` | 让 list 请求走 API Server 的 cache，请求不会穿透到 etcd，降低了 etcd 和 API Server 压力，同时也提高了 list 请求处理性能。 | 当 etcd 高负载时候，资源变化推送到 API Server 端会有延迟，延迟情况跟 etcd 负载情况相关。<br><br>正常情况下延迟可以忽略不计。 |
| API Server 下发 readcache 策略 | 从 API Server 下发 readcache 策略，让 list 请求走 API Server cache。<br><br>参考文档：<br>[https://doc.weixin.qq.com/doc/w3_ACYAlwbdAFwFuPA3vx1TFyen963Cr?scode=AJEAIQdfAAoQIzvBiLACYAlwbdAFw](https://doc.weixin.qq.com/doc/w3_ACYAlwbdAFwFuPA3vx1TFyen963Cr?scode=AJEAIQdfAAoQIzvBiLACYAlwbdAFw) | 只要 list 请求命中下发的规则，请求走 API Server 的 cache，无需业务改造，相当于是替 client 端 list 请求加上 resourceVersion=0。 | 同上 |
