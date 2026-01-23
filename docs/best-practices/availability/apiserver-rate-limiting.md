# TKE 集群 APF Expensive List 限速和熔断最佳实践

## 背景

OpenAI 等超大规模集群，因变更 DaemonSet 触发业务异常 list 请求打崩控制面，控制面雪崩后，CoreDNS 也被重试请求打崩，扩容又依赖控制面，无法快速恢复，造成集群业务数据面大范围故障。还有部分业务在 K8s 集群中部署了 Flink 等大数据业务，控制面故障，可能会导致存量 Pod 异常退出等。

社区 APF（API Priority and Fairness）主要是从优先级和公平性方面综合考量，1.20 等业务大量使用的版本针对单个 list 请求占用 seat 数量上限设置为 10，虽然满足了大部分限速的需求，但是针对集群内有海量资源下 list 全量资源的极端情况，无法做到有效的限速，很容易打崩控制面进而造成控制面组件雪崩。所以针对超大规模集群，在极端情况下需要有效的限速和熔断方案，需要精确限速到控制面承受范围的 list 并发数和熔断部分服务的 list 请求，确保控制面不会被打崩。熔断的核心目标是通过主动切断异常服务对控制面的请求，防止故障扩散到整个集群数据面。

## 前提条件

### 版本要求

这些版本及以上小版本支持 expensive list 限速：

- v1.30.0-tke.9
- v1.28.3-tke.14
- v1.26.1-tke.17
- v1.24.4-tke.26
- v1.22.5-tke.35
- v1.20.6-tke.54

## APF 术语解释

1. **FlowSchema**：对请求进行分类，每个请求会根据匹配规则被分配到一个 FlowSchema，每个 FlowSchema 会关联到特定的优先级。从而进入对应的优先级队列。**PriorityLevelConfiguration**：定义优先级的具体配置，包括并发限制、排队行为等。

2. **max-requests-inflight 和 max-mutating-requests-inflight**：kube-apiserver 中的读写并发参数，两者之和为总的并发数。

3. **objects**：表示资源 resource 数量，比如 pods、configmaps 等。

4. **并发权重和份额**：APF 的 PriorityLevelConfiguration 资源中 `spec.limited.assuredConcurrencyShares` 字段表示该组 APF 规则的并发权重和份额，所有 APF 的 PriorityLevelConfiguration 中 assuredConcurrencyShares 之和为总的权重和并发份额。K8s 集群已有的默认 APF 规则总权重和份额是 245（即所有 APF 规则的 assuredConcurrencyShares 之和，1.20 大版本总权重 205，1.22~1.30 大版本总权重 245）。v1beta3 开始 assuredConcurrencyShares 字段改名为 nominalConcurrencyShares。

5. **seats**：座位数，即 K8s 中作为请求负载量化的单位，APF 原生逻辑中处理每个 list 请求时，每 100 个 object 资源就分配一个 seat，并且设了上限 10 个 seat。例如集群有 1000 个 pod，list 全量 pod 时候需要分配 10 个 seat，如果集群有 100000 个 pod，list 全量 pod 时候需要分配 1000 个 seat，上限是 10，所以原生 APF 最终分配 10 个 seat。也就是 list 1000 和 100000 都是按照同等消耗来计算的。

6. **计算 APF 规则的 seats 数**：例如这组 APF 规则的并发权重和份额是 10，即 `spec.limited.assuredConcurrencyShares` 中配置了 10，那这组 APF 规则获得总 seats 数：

   ```
   seats = (max-requests-inflight + max-mutating-requests-inflight) * 10 / (10 + 245)
   ```

   那么命中这组 APF 规则的所有请求都从这个 seats 中分配。

### 计算公式

```
NominalCL(i) = ceil(ServerCL * NCS(i) / SUM_NCS)
```

- **ServerCL**：总的并发数
- **NCS**：该 APF 规则的并发权重和份额
- **SUM_NCS**：所有 APF 规则并发份额总和

## 功能说明

TKE 集群基于 APF 增强的功能：

1. 放开了 APF 中最大分配 10 个 seat 的上限，可以在 APF 规则 annotation 中为命中规则的每个 list 请求自定义 objects 和 seats 的数量映射关系来合理分配 seats 数量。
2. 在 FlowSchema 的 subjects 增加 userAgent 的支持，`subjects.userAgent.nameRegexp` 可以配置正则表达式对每个 request 请求的 userAgent 匹配。
3. 允许 FlowSchema 中 `spec.matchingPrecedence` 优先级为 1 的规则创建。
4. 只有配置了自定义规则后才会走增强的逻辑。

### APF 规则 annotation 自定义 objects 和 seats 数量映射关系

在 PriorityLevelConfiguration 的 annotations 中配置名为：

```yaml
tke.cloud.tencent.com/objects-seats-rule: '{"objectsToSeats":[{"objects":1000,"seats":10},{"objects":10000,"seats":30},{"objects":20000,"seats":40},{"objects":50000,"seats":100}]}'
```

格式化展开如下：

```json
{
  "objectsToSeats": [
    {
      "objects": 1000,
      "seats": 10
    },
    {
      "objects": 10000,
      "seats": 20
    },
    {
      "objects": 20000,
      "seats": 30
    },
    {
      "objects": 50000,
      "seats": 100
    }
  ]
}
```

!!! note "备注"
    objects 表示资源数量，seats 表示分配的座位数量，比如配置中 object:10000 和 seats:20 这一组表示当集群 pod 数达到 10000 时进行 list 全量 pod，APF 中会每个 list pod 请求分配 20 个 seat，如果资源数达到 15000 时候，会按照资源比例计算对应的 seat 数量，object 为 15000 对应分配的 seats 为 25。

### 具体 objects 和 seats 数量映射关系如何配置比较合理

可以参考 [压测报告](https://doc.weixin.qq.com/doc/w3_AUAA-wZIAKAdj2KvVR3R8ae2Gs1tz?scode=AJEAIQdfAAo0c1P0u5ACYAlwbdAFw)，调整 object 和 seats 数量映射关系，按照公式计算限制的并发数。

## 限速实施

针对不同大版本，创建对应的 APF 限速：

```bash
kubectl create -f apf-expensive-list-demo.yaml
```

### 1.20 集群

`apf-expensive-list-demo.yaml` 文件：

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta1
kind: PriorityLevelConfiguration
metadata:
  annotations:
    tke.cloud.tencent.com/objects-seats-rule: '{"objectsToSeats":[{"objects":1000,"seats":10},{"objects":10000,"seats":30},{"objects":20000,"seats":40},{"objects":50000,"seats":101}]}'
  name: plc-demo
spec:
  limited:
    assuredConcurrencyShares: 10
    limitResponse:
      queuing:
        handSize: 6
        queueLengthLimit: 50
        queues: 128
      type: Queue
  type: Limited
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta1
kind: FlowSchema
metadata:
  name: a-fs-demo
spec:
  distinguisherMethod:
    type: ByUser
  matchingPrecedence: 1
  priorityLevelConfiguration:
    name: plc-demo
  rules:
  - resourceRules:
    - apiGroups:
      - '*'
      clusterScope: true
      namespaces:
      - '*'
      resources:
      - 'pods'
      - 'configmaps'
      - 'secrets'
      verbs:
      - 'list'
    subjects:
    - userAgent:
        nameRegexp: "^(benchmark|kubectl).*"
      kind: UserAgent
```

### 1.22 集群

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta1
kind: PriorityLevelConfiguration
metadata:
  annotations:
    tke.cloud.tencent.com/objects-seats-rule: '{"objectsToSeats":[{"objects":1000,"seats":10},{"objects":10000,"seats":30},{"objects":20000,"seats":40},{"objects":50000,"seats":101}]}'
  name: plc-demo
spec:
  limited:
    assuredConcurrencyShares: 10
    limitResponse:
      queuing:
        handSize: 6
        queueLengthLimit: 50
        queues: 128
      type: Queue
  type: Limited
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta1
kind: FlowSchema
metadata:
  name: a-fs-demo
spec:
  distinguisherMethod:
    type: ByUser
  matchingPrecedence: 1
  priorityLevelConfiguration:
    name: plc-demo
  rules:
  - resourceRules:
    - apiGroups:
      - '*'
      clusterScope: true
      namespaces:
      - '*'
      resources:
      - 'pods'
      - 'configmaps'
      - 'secrets'
      verbs:
      - 'list'
    subjects:
    - userAgent:
        nameRegexp: "^(benchmark|kubectl).*"
      kind: UserAgent
```

### 1.24 集群

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta2
kind: PriorityLevelConfiguration
metadata:
  annotations:
    tke.cloud.tencent.com/objects-seats-rule: '{"objectsToSeats":[{"objects":1000,"seats":10},{"objects":10000,"seats":30},{"objects":20000,"seats":40},{"objects":50000,"seats":101}]}'
  name: plc-demo
spec:
  limited:
    limitResponse:
      queuing:
        handSize: 6
        queueLengthLimit: 50
        queues: 128
      type: Queue
    assuredConcurrencyShares: 10
  type: Limited
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta2
kind: FlowSchema
metadata:
  name: a-fs-demo
spec:
  distinguisherMethod:
    type: ByUser
  matchingPrecedence: 1
  priorityLevelConfiguration:
    name: plc-demo
  rules:
  - resourceRules:
    - apiGroups:
      - '*'
      clusterScope: true
      namespaces:
      - '*'
      resources:
      - 'pods'
      - 'configmaps'
      - 'secrets'
      verbs:
      - 'list'
    subjects:
    - userAgent:
        nameRegexp: "^(benchmark|kubectl).*"
      kind: UserAgent
```

### 1.26 集群

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  annotations:
    tke.cloud.tencent.com/objects-seats-rule: '{"objectsToSeats":[{"objects":1000,"seats":10},{"objects":10000,"seats":30},{"objects":20000,"seats":40},{"objects":50000,"seats":101}]}'
  name: plc-demo
spec:
  limited:
    limitResponse:
      queuing:
        handSize: 6
        queueLengthLimit: 50
        queues: 128
      type: Queue
    nominalConcurrencyShares: 10
    borrowingLimitPercent: 0
    lendablePercent: 0
  type: Limited
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: a-fs-demo
spec:
  distinguisherMethod:
    type: ByUser
  matchingPrecedence: 1
  priorityLevelConfiguration:
    name: plc-demo
  rules:
  - resourceRules:
    - apiGroups:
      - '*'
      clusterScope: true
      namespaces:
      - '*'
      resources:
      - 'pods'
      - 'configmaps'
      - 'secrets'
      verbs:
      - 'list'
    subjects:
    - userAgent:
        nameRegexp: "^(benchmark|kubectl).*"
      kind: UserAgent
```

### 1.28 集群

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  annotations:
    tke.cloud.tencent.com/objects-seats-rule: '{"objectsToSeats":[{"objects":1000,"seats":10},{"objects":10000,"seats":30},{"objects":20000,"seats":40},{"objects":50000,"seats":101}]}'
  name: plc-demo
spec:
  limited:
    limitResponse:
      queuing:
        handSize: 6
        queueLengthLimit: 50
        queues: 128
      type: Queue
    nominalConcurrencyShares: 10
    borrowingLimitPercent: 0
    lendablePercent: 0
  type: Limited
---
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: a-fs-demo
spec:
  distinguisherMethod:
    type: ByUser
  matchingPrecedence: 1
  priorityLevelConfiguration:
    name: plc-demo
  rules:
  - resourceRules:
    - apiGroups:
      - '*'
      clusterScope: true
      namespaces:
      - '*'
      resources:
      - 'pods'
      - 'configmaps'
      - 'secrets'
      verbs:
      - 'list'
    subjects:
    - userAgent:
        nameRegexp: "^(benchmark|kubectl).*"
      kind: UserAgent
```

### 1.30 集群

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1
kind: PriorityLevelConfiguration
metadata:
  annotations:
    tke.cloud.tencent.com/objects-seats-rule: '{"objectsToSeats":[{"objects":1000,"seats":10},{"objects":10000,"seats":30},{"objects":20000,"seats":40},{"objects":50000,"seats":101}]}'
  name: plc-demo
spec:
  limited:
    limitResponse:
      queuing:
        handSize: 6
        queueLengthLimit: 50
        queues: 128
      type: Queue
    nominalConcurrencyShares: 10
    borrowingLimitPercent: 0
    lendablePercent: 0
  type: Limited
---
apiVersion: flowcontrol.apiserver.k8s.io/v1
kind: FlowSchema
metadata:
  name: a-fs-demo
spec:
  distinguisherMethod:
    type: ByUser
  matchingPrecedence: 1
  priorityLevelConfiguration:
    name: plc-demo
  rules:
  - resourceRules:
    - apiGroups:
      - '*'
      clusterScope: true
      namespaces:
      - '*'
      resources:
      - 'pods'
      - 'configmaps'
      - 'secrets'
      verbs:
      - 'list'
    subjects:
    - userAgent:
        nameRegexp: "^(benchmark|kubectl).*"
      kind: UserAgent
```

## 特殊熔断场景

### 非系统组件访问 API Server list 全部限速

PriorityLevelConfiguration 中 `spec.limited.nominalConcurrencyShares` 最小并发份额可以设置为 1，同时 FlowSchema 中 `subjects.userAgent.nameRegexp` 中配置正则来拦截系统组件之外的 list 请求：

```
^(?!kube-scheduler|kube-apiserver|kubelet|kube-controller-manager|service-controller|tke-eni-ipamd|coredns|csi-provisioner|csi-attacher|csi-snapshotter|csi-resizer|tencent-cloud-controller-manager|gatekeeper|cluster-autoscaler|add-pod-eni-ip-limit-webhook|machine-apiserver|qcloud_ingress|kubectl).*
```

!!! warning "注意"
    kubernetes-proxy 组件还有系统 DaemonSet 组件，比如 kube-proxy 也可能会被限速，只有在极端无法恢复场景下，没有找到高负载来源的情况下才使用。

例如 1.30 可以这样配置：

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1
kind: PriorityLevelConfiguration
metadata:
  annotations:
    tke.cloud.tencent.com/objects-seats-rule: '{"objectsToSeats":[{"objects":1000,"seats":10},{"objects":10000,"seats":30},{"objects":20000,"seats":40},{"objects":50000,"seats":101}]}'
  name: plc-demo
spec:
  limited:
    limitResponse:
      queuing:
        handSize: 6
        queueLengthLimit: 50
        queues: 128
      type: Queue
    nominalConcurrencyShares: 1
    borrowingLimitPercent: 0
    lendablePercent: 0
  type: Limited
---
apiVersion: flowcontrol.apiserver.k8s.io/v1
kind: FlowSchema
metadata:
  name: a-fs-demo
spec:
  distinguisherMethod:
    type: ByUser
  matchingPrecedence: 1
  priorityLevelConfiguration:
    name: plc-demo
  rules:
  - resourceRules:
    - apiGroups:
      - '*'
      clusterScope: true
      namespaces:
      - '*'
      resources:
      - 'pods'
      - 'configmaps'
      - 'secrets'
      verbs:
      - 'list'
    subjects:
    - userAgent:
        nameRegexp: "^(?!kube-scheduler|kube-apiserver|kubelet|kube-controller-manager|service-controller|tke-eni-ipamd|coredns|csi-provisioner|csi-attacher|csi-snapshotter|csi-resizer).*"
      kind: UserAgent
```

### 业务和系统组件 list 全部限速

PriorityLevelConfiguration 中 `spec.limited.nominalConcurrencyShares` 最小并发份额可以设置为 1。同时 FlowSchema 中 `subjects.userAgent.nameRegexp` 中配置以下正则来拦截所有 list 请求：

```
^(?!kubectl).*
```

!!! danger "注意"
    所有组件的 list 请求全部被限速，影响巨大，谨慎使用。

例如 1.30 可以这样配置：

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1
kind: PriorityLevelConfiguration
metadata:
  annotations:
    tke.cloud.tencent.com/objects-seats-rule: '{"objectsToSeats":[{"objects":1000,"seats":10},{"objects":10000,"seats":30},{"objects":20000,"seats":40},{"objects":50000,"seats":101}]}'
  name: plc-demo
spec:
  limited:
    limitResponse:
      queuing:
        handSize: 6
        queueLengthLimit: 50
        queues: 128
      type: Queue
    nominalConcurrencyShares: 1
    borrowingLimitPercent: 0
    lendablePercent: 0
  type: Limited
---
apiVersion: flowcontrol.apiserver.k8s.io/v1
kind: FlowSchema
metadata:
  name: a-fs-demo
spec:
  distinguisherMethod:
    type: ByUser
  matchingPrecedence: 1
  priorityLevelConfiguration:
    name: plc-demo
  rules:
  - resourceRules:
    - apiGroups:
      - '*'
      clusterScope: true
      namespaces:
      - '*'
      resources:
      - 'pods'
      - 'configmaps'
      - 'secrets'
      verbs:
      - 'list'
    subjects:
    - userAgent:
        nameRegexp: ".*"
      kind: UserAgent
```

## 测试验证

### 对系统外组件进行限速测试情况

**测试条件**：
测试集群版本 1.28.3，预置 10000 pod 的情况下，创建 list 客户端，以 200 QPS，20 并发对集群内 pod 进行全量 list

#### APF 默认限速测试效果

压测工具会命中 APF 默认的 FlowSchema `service-accounts`，对应 PriorityLevelConfiguration `workload-low`

```
nominalConcurrencyShares: 100
```

`workload-low` 计算出可分配 seats 数为：

```
((200 + 400) / 245) * 100 = 245
```

单次 list 全量 pod 按照原生逻辑占据的 seats 数为 ≈ 10

因此 APF 限制的并发数为 `245 / 10 = 24`，并发 20 的情况下所有的请求都不会受到限速

根据 `kubectl get --raw /debug/api_priority_and_fairness/dump_priority_levels` 结果可以看到此时 `workload-low` 对应的 ExecutingRequests 数为 20

很快 kube-apiserver 开始出现反复 OOM 无法启动，节点负载被打满

#### APF 增强版限速测试效果

下发增强版限速后，list 请求命中 FlowSchema `a-fs-demo` 对应 PriorityLevelConfiguration `plc-demo`

```
nominalConcurrencyShares: 1
```

`plc-demo` 计算出可分配 seats 数为：

```
((200 + 400) / 246) * 1 = 3
```

单次 list 全量 pod 按照 annotation 配置的 10000 objects 取 30

因此 APF 限制的并发数为 `3 / 30 = 1`，单次只允许处理 1 个请求，剩余的请求会被直接拒绝

根据 `kubectl get --raw /debug/api_priority_and_fairness/dump_priority_levels` 结果可以看到此时 `plc-demo` 对应的 ExecutingRequests 数为 1

APF 相关监控统计请求数为 1，plc-demo 总的并发限制为 3

Master 节点负载稳定

### 对所有组件 list 限速测试情况

限速效果同上一个样例，但是此时包括系统组件的请求也会触发限速，因此会对集群内资源的变更有较大影响，仅适用于超极端情况下下发，恢复后需要删除该规则

例如：影响挂载了 ConfigMap 的 Pod 重建

## 监控

### 1. 可以通过监控指标 apiserver_request_total 查看是否有 HTTP code=429 请求

```bash
apiserver_request_total{code="429",component="apiserver",contentType="",dry_run="",group="",resource="pods",scope="cluster",subresource="",userAgent="",verb="LIST",version="v1"} 18
```

### 2. 可以通过审计日志查询

```sql
select responseStatus.code, objectRef.resource, * 
where responseStatus.code in (429) and verb = 'list'
```

### 3. 可以通过命令行方式查看 APF 规则当前状态

```bash
kubectl get --raw /debug/api_priority_and_fairness/dump_priority_levels
```

## 附件

### APF 默认规则

命令行查看所有 APF 规则当前状态列表：

```bash
kubectl get --raw /debug/api_priority_and_fairness/dump_priority_levels
```

## Q&A

**1. 这个新版本应该是按照 list 对象的数量计算的吧？**

是的，APF 原生逻辑也是按照 list 对象数量，不过有最大 10 个 seat 的上限，新版本支持自定义资源数量和 seat 的映射，一旦自定义后就不受 10 个 seat 的限制。
