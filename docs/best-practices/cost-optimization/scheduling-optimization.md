# 智能调度——应用扩缩容调度的最佳范式

作为一名深耕 Kubernetes 领域多年的业务开发人员或集群管理员，我时常对集群的调度功能感到无奈，这里和您分享一下我的真实感受。

首先，谁能在一开始部署应用时，就未卜先知地配置出最合适的调度规则呢？调度规则本身就像集群中不断变化的 Pod 和节点一样，需要根据实际情况动态调整。Kubernetes 的调度规则修改机制却显得不够灵活——我们无法仅针对新增或个别重建的 Pod 调整调度规则，而必须对整个应用进行重建，这无疑会影响到存量业务的稳定性，增加了运维的复杂性和风险。

其次，集群中不同节点的成本差异是客观存在的，但 Kubernetes 的调度算法却缺乏对节点成本的考量。为了实现降本目标，我们只能通过手动设置节点亲和性，优先将业务调度到低成本节点上。然而，这种操作往往需要缓慢等待高成本节点上的业务重建后，才能手动下线高价节点，过程繁琐且效率低下。

更令人头疼的是，降本与高可用之间往往难以兼顾。如果一味追求优先装满低成本节点，可能会导致业务分布不均衡，增加单点故障的风险，影响业务的稳定性。这种两难的局面，常常让我们在资源优化和业务保障之间陷入纠结。

幸运的是，TKE 提供了一种智能调度范式（[产品文档链接](https://cloud.tencent.com/document/product/457)），能够有效解决上述痛点：

- **灵活调整调度规则**：支持在保证存量业务无损的前提下，仅针对新增或重建的 Pod 动态调整调度规则，避免对整个应用进行重建，从而降低运维复杂性和风险
- **智能成本优化**：在业务扩容或重建时，优先使用低成本资源。在业务缩容时，优先释放高成本资源上的业务，进一步降低运营成本，提升资源利用效率
- **高可用性保障**：针对高可用性要求严格的业务（如核心交易系统、关键基础设施等），调度范式能够在确保业务多可用区平均分布的同时，兼顾成本最优

通过 TKE 的智能调度范式，我们能够更高效地管理调度行为，在降本增效与业务稳定性之间找到最佳平衡点。以下列举了一些典型使用场景下，使用智能调度范式的最佳实践。

## 全局降本模型

调度优先级策略可根据集群中计算资源的成本进行制订，成本越低的节点，调度优先级越高。成本越高的节点，调度优先级越低。在业务扩容时，优先扩容到低成本节点上，在业务缩容时，高成本节点上的业务会被优先缩容。

以下是一个典型的降本调度范式示例：

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: economy
spec:
  targets:
    namespaces:
      include: []
  nodeGroups:
    - name: prepaidNative
      nodeType: native
      nodeSelectorTerms:
      - matchExpressions:
        - key: node.tke.cloud.tencent.com/instance-charge-type
          operator: In
          values:
          - PrepaidCharge
      whenUnsatisfiable: ScheduleAnyway
      priority: 100
    - name: prepaidSuper
      nodeType: super
      nodeSelectorTerms:
      - matchExpressions:
        - key: eks.tke.cloud.tencent.com/pre-paid
          operator: In
          values:
          - 'true'
      whenUnsatisfiable: ScheduleAnyway
      priority: 75
    - name: postpaidNative
      nodeType: native
      nodeSelectorTerms:
      - matchExpressions:
        - key: node.tke.cloud.tencent.com/instance-charge-type
          operator: In
          values:
          - PostpaidByHour
      whenUnsatisfiable: ScheduleAnyway
      priority: 50
    - name: postpaidSuper
      nodeType: super
      nodeSelectorTerms:
      - matchExpressions:
        - key: eks.tke.cloud.tencent.com/pre-paid
          operator: NotIn
          values:
          - 'true'
      whenUnsatisfiable: ScheduleAnyway
      priority: 25
```

按照如上范式，针对集群中所有新建（重建）Pod 生效，集群中资源的调度优先级：预付费原生节点 > 预付费超级节点 > 按量付费原生节点 > 按量付费超级节点。

如果您已确定要实现降本目标，建议先为集群下发全局的默认降本模型，再针对特殊业务指定其他规则。

您也可以根据您集群中的实际资源成本，调整上述 `priority`，自定义集群中各资源的优先级。

## 潮汐场景

针对负载波动大，存在明显峰值和低谷的业务（例如教育类应用在节假日期间课程密集、地图应用在上下班时段流量激增、会议应用在工作时间使用频繁），可以使用调度范式充分利用预付费节点的成本优势和按量计费节点的灵活性，避免资源浪费，实现成本与性能的最佳平衡。具体做法是，使用潮汐业务调度范式，将稳定、常驻的 Pod 调度到预付费节点，将突发流量 Pod 调度到按量计费节点。在突发流量减少时，按量付费节点上的 Pod 会优先缩容。您无需为突发流量预备冗余资源，也无需担心流量低谷时造成节点浪费。

### 原生节点模式

[原生节点](https://cloud.tencent.com/document/product/457/78197) 是一种支持虚拟放大可调度资源的节点，可以将节点装箱率提升到 100% 以上。以下是一个在原生节点上实现潮汐业务调度范式示例：

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: native-tidal
spec:
  targets:
    workloadRefs:
    - kind: Deployment
      matchExpressions:
      - key: nativeTidal
        operator: In
        values:
        - 'true'
  nodeGroups:
    - name: prepaidNative
      nodeType: native
      nodeSelectorTerms:
      - matchExpressions:
        - key: node.tke.cloud.tencent.com/instance-charge-type
          operator: In
          values:
          - PrepaidCharge
      whenUnsatisfiable: ScheduleAnyway
      priority: 100
      max: 2
    - name: postpaidNative
      nodeType: native
      nodeSelectorTerms:
      - matchExpressions:
        - key: node.tke.cloud.tencent.com/instance-charge-type
          operator: In
          values:
          - PostpaidByHour
      whenUnsatisfiable: ScheduleAnyway
      priority: 50
```

按照如上范式，对集群中含有 `nativeTidal=true` 标签的 Deployment 的 pod 应用这个调度规则。先调度 2 个副本到预付费原生节点上，其他多余的副本都调度到按量付费原生节点上。当这个 Deployment 缩容时，按量原生节点上的 pod 会被优先缩容。如果集群中开启了 CA 自动缩容和碎片规整，在按量原生节点装箱率低于设定值时，该节点会被自动下线，节省计算成本。

您可以根据您业务中实际的常驻副本数量，调整 NodeGroup 中 `max` 的值。

### 超级节点模式

[超级节点](https://cloud.tencent.com/document/product/457/74014) 依据 Pod 运行时长，按照秒级按量收费（详细可参考 [容器服务计费模式说明](https://cloud.tencent.com/document/product/457/68804)），能以极低成本、极快速度应对突发的业务流量。以下是一个在超级节点上实现潮汐业务调度范式示例：

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: super-tidal
spec:
  targets:
    workloadRefs:
    - kind: Deployment
      matchExpressions:
      - key: superTidal
        operator: In
        values:
        - 'true'
  nodeGroups:
    - name: prepaidSuper
      nodeType: super
      nodeSelectorTerms:
      - matchExpressions:
        - key: eks.tke.cloud.tencent.com/pre-paid
          operator: In
          values:
          - 'true'
      whenUnsatisfiable: ScheduleAnyway
      priority: 75
      max: 2
    - name: requiredSuper
      nodeType: super
      whenUnsatisfiable: DoNotSchedule
```

按照如上范式，对集群中含有 `superTidal=true` 标签的 Deployment 的 pod，优先调度 2 个副本到预付费超级节点上，其他的副本都调度到按量付费超级节点上。当这个 Deployment 缩容时，按量超级节点上的 pod 会被优先缩容。由于按量超级节点上的 Pod 是按照 Pod 生命周期付费的，您无需再操作节点下线相关的操作，就能实现计算成本的进一步优化。

同样地，您可以根据您业务中实际的常驻副本数量，调整 NodeGroup 中 `max` 的值。

## 其他场景

### 灵活装箱策略（预计 5 月发布）

针对集群中不同的业务，或者针对集群中不同的节点，可定义不同的装箱策略。

以下调度范式，让 test 和 binpack 命名空间下的业务在原生节点上，使用紧凑优先的装箱策略进行调度：

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: most-allocate
spec:
  targets:
    namespaces:
      include:
      - test
      - binpack
  nodeGroups:
    - name: most-allocate
      nodeType: native
      whenUnsatisfiable: ScheduleAnyway
      nodeResourceFitStrategy: most
```

以下调度范式，让 core 和 balance 命名空间下的业务在原生节点上，使用均衡优先的装箱策略进行调度：

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: least-allocate
spec:
  targets:
    namespaces:
      include:
      - core
      - balance
  nodeGroups:
    - name: least-allocate
      nodeType: native
      whenUnsatisfiable: ScheduleAnyway
      nodeResourceFitStrategy: least
```

### 资源独占场景

针对资源敏感型业务（如高并发、低延迟的在线服务）、安全敏感型业务（如金融、医疗等），超级节点凭借其资源独占性和安全隔离性能力，能够完美满足这些业务的需求。您无需为资源竞争导致的性能下降担忧，也无需为业务隔离性额外配置资源，轻松实现高效与经济的双赢。

通过以下调度范式，可以将这些业务强制调度到超级节点，避免多 Pod 共享子机资源导致的性能波动，确保业务稳定运行。

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: isolate
spec:
  targets:
    namespaces:
      include:
      - cpu-sensitive
      - mem-sensitive
      - security
  nodeGroups:
    - name: requiredSuper
      nodeType: super
      whenUnsatisfiable: DoNotSchedule
```

通常地，不同业务在不同的命名空间下部署，以上调度范式定义了 `cpu-sensitive`、`mem-sensitive` 命名空间中 Pod 的调度规则，强制将新建/重建 pod 调度到超级节点上。

您可以根据您集群中实际的业务分布，调整 `targets` 中 `namespaces` 的值。

### 临时任务场景

针对临时性业务（如测试、压测等），可以定义如下范式，利用按量超级节点的按 pod 运行时长计费的特性，降低使用成本。

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: temp
spec:
  targets:
    namespaces:
      include:
      - temp
  nodeGroups:
    - name: postpaidSuper
      nodeType: super
      nodeSelectorTerms:
      - matchExpressions:
        - key: eks.tke.cloud.tencent.com/pre-paid
          operator: NotIn
          values:
          - 'true'
      whenUnsatisfiable: DoNotSchedule
```

针对 Job 类型的工作负载（如数据处理、批量计算、定时任务等），任务完成后，资源应尽快释放。使用如下范式，可以强制 Pod 调度到按量超级节点，显著缩短 pod 的计费周期，使计费时间更接近 Pod 的生命周期。

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: job
spec:
  targets:
    workloadRefs:
    - kind: Job
  nodeGroups:
    - name: postpaidSuper
      nodeType: super
      nodeSelectorTerms:
      - matchExpressions:
        - key: eks.tke.cloud.tencent.com/pre-paid
          operator: NotIn
          values:
          - 'true'
      whenUnsatisfiable: DoNotSchedule
```

### 极致性能场景

部分应用对硬件性能有特殊需求，不同资源机型提供了差异化的计算、内存和存储能力。您可以根据应用特性，将其调度到合适的机型上，从而避免因机型差异导致的副本间性能不一致。

云厂商可支持的机型实时在变化，我们建议在相同需求的应用中，通过配置相同的标签，标识其资源的类别，再通过调度优先级为这类业务选择具体适宜的机型。

比如视频弹幕、直播、游戏这类业务，需要优先调度到网络性能更佳的节点，满足高网络包收发场景需求：

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: netboost
spec:
  targets:
    podSelectors: # 通过 pod Label 选择 pod
    - matchExpressions:
      - key: netboost
        operator: In
        values:
        - 'true'
  nodeGroups:
    - name: netfamily
      nodeType: native
      nodeSelectorTerms:
      - matchExpressions:
        - key: node.kubernetes.io/instance-type
          operator: Exists
          values:
          - 'S6'
          - 'S8'
      whenUnsatisfiable: ScheduleAnyway
```

比如机器学习、高性能数据库业务需要优先调度到大内存节点，满足大量的内存操作、查找和计算的需求。

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: memboost
spec:
  targets:
    podSelectors: # 通过 pod Label 选择 pod
    - matchExpressions:
      - key: memboost
        operator: In
        values:
        - 'true'
  nodeGroups:
    - name: memfamily
      nodeType: native
      nodeSelectorTerms:
      - matchExpressions:
        - key: node.kubernetes.io/instance-type
          operator: Exists
          values:
          - 'M3'
          - 'MA3'
          - 'M5'
          - 'M6'
      whenUnsatisfiable: ScheduleAnyway
```

更多机型可参考 [容器服务原生节点产品定价](https://cloud.tencent.com/document/product/457/78197)。

使用上述 `podSelectors` 的方式选择生效业务，需要在新建应用时就指定相关的标签，如果存量应用没有相关标签，也可以用 `namespaces`，`workloadRefs` 等方式灵活选择生效业务。

### 灰度验证场景

已知 TKE 提供的原生节点能够解决生产环境中的问题或降低成本，但由于集群中的存量业务已部署在普通节点上，直接引入新节点可能会导致核心业务被调度到这些未经验证的节点上，从而引发稳定性风险。为了避免这种情况，可以通过调度策略限定仅非核心业务调度到新加入的节点上，进行灰度验证，同时确保核心业务不会受到影响。

以下是一个原生节点灰度验证调度范式，只有带有 `canary-native=true` 标签的 Deployment 下的 pod，才会被调度到原生节点上。

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: canary-native
spec:
  targets:
    workloadRefs:
    - kind: Deployment
      matchExpressions:
      - key: canary-native
        operator: NotIn
        values:
        - 'true'
  nodeGroups:
    - name: native
      nodeType: native
      max: 0
      whenUnsatisfiable: ScheduleAnyway
```

您可以为部分 Deployment 添加 `canary-native=true` 标签，使其新建 pod 调度到原生节点。在非核心业务稳定运行一段时间后，可以删除该范式，逐步将核心业务迁移到新节点上。

### 定向调度场景

在某些场景中，我们经常需要将 Pod 定向调度到特定的节点或节点池中。

例如，当节点池 A 由于硬件性能不足、资源利用率过高或成本较高等原因，无法满足业务需求时，为了优化资源使用并提升业务性能，我们需要将节点池 A 中的业务 Pod 定向迁移到节点池 B 中。节点池 B 通常具备更高的硬件性能、更低的成本或更适合业务需求的资源配置。

以下是实现这一目标的关键步骤：

#### 节点池标记

找到节点池 B 的特殊标签（如 `node.tke.cloud.tencent.com/machineset`）

#### 定义调度范式

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: direct
spec:
  targets:[]
  nodeGroups:
    - name: native
      nodeType: native
      nodeSelectorTerms:
      - matchExpressions:
        - key: node.tke.cloud.tencent.com/machineset
          operator: NotIn
          values:
          - 'np-b'
      whenUnsatisfiable: DoNotSchedule
```

#### 存量 Pod 迁移

逐步重建节点池 A 中的存量 Pod

#### 清理

若没有后续需求，删除以上调度范式：

```bash
kubectl delete pp direct
```

### 高可用场景（预计 10 月发布）

针对高可用性要求严格的业务（如核心交易系统、关键基础设施等），需要分区部署，确保业务在故障场景下快速恢复，避免因单点故障导致可用性下降。但由于调度器中的调度策略众多，各策略之间互相影响，很难保证拓扑分布策略优先，让高可用性部署成为一个难题。

通过以下调度范式，可以极大忽略其他调度策略的影响，将这些业务平均分布到集群中的多可用区内。

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: ha
spec:
  targets:
    podSelectors:
    - matchExpressions:
      - key: ha
        operator: In
        values:
        - 'true'
  nodeGroups:
    topologyConstraints:
    - topologyKey: topology.kubernetes.io/zone
      maxSkew: 1
      whenUnsatisfiable: ScheduleAnyway
      matchLabelKeys：
      - k8s-app
```

通过以下调度范式，可以规定同一个用户 id 的不同的工作负载在部署时，在节点上最多部署 2 个副本，且平均分布在多可用区内。当不满足该约束时，Pod 会处于 Pending 状态，等待资源就位后，才开始调度。

```yaml
apiVersion: scheduling.crane.io/v1alpha1
kind: PlacementPolicy
metadata:
  name: extreme-ha
spec:
  targets:
    podSelectors:
    - matchExpressions:
      - key: extreme-ha
        operator: In
        values:
        - 'true'
  nodeGroups:
    topologyConstraints:
    - topologyKey: kubernetes.io/hostname
      maxReplicas: 2
      whenUnsatisfiable: DoNotSchedule
      matchLabelKeys：
      - user-id
    - topologyKey: topology.kubernetes.io/zone
      maxSkew: 1
      whenUnsatisfiable: DoNotSchedule
      matchLabelKeys：
      - user-id
```
