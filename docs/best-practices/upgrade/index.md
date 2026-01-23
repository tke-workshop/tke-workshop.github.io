# TKE 集群控制面升级最佳实践

Kubernetes 活跃的社区和广大的用户群，使 Kubernetes 社区迭代速度快，每季度发布新版本，高频的版本发布带来了更多的新功能落地和性能优化，也包含 CVE 漏洞补丁和安全加固。TKE 包括业界云厂商仅维护支持最近 3-4 个次要版本，超期版本无法获得安全补丁和技术支持。集群升级是获取新功能与性能优化，抵御攻击、满足合规要求，避免版本碎片化风险，保证生态兼容性，避免技术债务累积的核心手段，也是 Kubernetes 持续运营（Continuous Operations）中版本管理的重要组成部分。忽视 Kubernetes 版本管理，会导致版本滞后，安全漏洞未修复、API 不兼容，无法使用新功能等问题，最终威胁业务连续性。

## 1. TKE 集群升级总览

集群由控制面和节点组成，集群升级分为 `控制面升级` 和 `节点升级`，为了确保集群平稳运行，控制面和节点都应运行相同的 Kubernetes 次要版本。控制面的版本由 Kubernetes API 服务器决定，节点版本由节点 kubelet 和容器运行时决定。

TKE 集群升级流程包括升级前准备、控制面升级、节点升级和升级后验证几个步骤，本文将着重介绍集群大版本所需工作，包含集群升级的风险、升级前准备和控制面升级中的相关流程。节点升级和升级后验证，会放到下一篇幅中。TKE 集群大版本升级仅支持双数版本升级（例如从 1.24 升级到 1.26），不支持跨多版本升级。

## 2. 集群控制面升级的风险

Kubernetes 的分层架构设计和组件化特性是其灵活性和扩展性的基础，但也正是这些设计特点为集群升级带来了特定的系统性风险。Kubernetes 是分层的，有控制平面、工作节点、API 层、网络存储层等，每个层都有不同的组件，比如 API Server、etcd、kubelet、CNI 插件等。组件化设计意味着各个组件可以独立升级，但也带来了兼容性问题。集群控制面升级的风险分为以下三个方面：

### API 层版本迭代

Kubernetes 通过 API 抽象资源管理，API 版本采用 GA/Beta/Alpha 分级制度，且每个大版本会清理已弃用超过 9 个月的 API（KEP-24 策略）。版本化 Schema 的强制校验会带来资源定义断裂的风险：

- API 版本废弃（如 PodSecurityPolicy 在 1.25 被移除）
- 资源定义规范变更（如 Ingress API 从 `extensions/v1beta1` 到 `networking.k8s.io/v1`）
- 字段验证规则调整（如新增 required 字段）
- 默认特性开关（Feature Gates）变更，也会影响已有功能

### 控制平面与数据平面依赖

Master 组件的协同工作与版本约束，包含：

- kube-apiserver 升级后与其他组件版本不匹配
- etcd 存储格式变更导致数据兼容性问题（etcd 使用 Protobuf 序列化存储资源对象，不同 Kubernetes 版本可能修改 Protobuf 定义如字段重命名，导致出现数据反序列化失败）
- 调度器/控制器行为变化（如默认调度策略调整）

### 组件化的版本依赖风险

Kubernetes 的版本兼容策略允许有限偏差（N±2），但第三方组件的兼容性矩阵往往更严格，组件兼容性需要人工维护矩阵，比如：

- Helm Charts 未适配新版本 API（如旧版 Prometheus Operator）
- 自研 Operator 未兼容新版 K8s 客户端库（client-go）

根据责任划分，TKE 需要解决的风险包括：保证 coredns、cbs 等系统组件适配新版本、提供废弃 API 的检查能力、保证控制面组件参数符合预期等。一些风险需要客户来解决，比如：游离 pod 的检查、客户自身组件的兼容性、使用第三方组件兼容性、业务适配默认行为变化和版本差异（比如 psp 等）等。

## 3. 升级前准备

升级前准备包括仔细阅读 [TKE Kubernetes 版本说明](https://cloud.tencent.com/document/product/457/47791)，了解 [升级须知](https://cloud.tencent.com/document/product/457/32192#upgradenotice)，确定集群升级时间，对集群进行升级前检查和备份。因为集群升级的风险性，这里着重介绍需要关注的升级前检查，通过升级前检查和对应处置手段，降低升级风险。

### 3.1 ownerReference 引用检查

#### 3.1.1 检查的意义

在 Kubernetes 中，ownerReferences 用于定义资源之间的依赖关系（如 Deployment 管理 ReplicaSet，ReplicaSet 管理 Pod），其核心作用包括：

- **垃圾回收**：自动清理无用的子资源（如删除 Deployment 时自动删除关联的 ReplicaSet 和 Pod）
- **级联操作**：通过父对象触发子资源的创建、更新或删除
- **状态同步**：确保子资源的状态与父对象声明的一致性

错误的 ownerReferences 引用表现为：

- 引用不存在的父资源（如错误的 UID 或名称）
- 跨命名空间引用（例如父对象在 Namespace A，子对象在 Namespace B）
- 引用错误的资源类型（如 Pod 直接引用 Deployment 而不是 ReplicaSet）
- 使用已弃用的 API 版本（如 `apps/v1beta1` 升级到 `apps/v1` 后未更新）

如果存在错误的 ownerReferences 引用，升级后可能会导致以下问题：

- **资源泄露**：ownerReferences 中的父资源 UID 或类型错误，垃圾回收器无法识别关联关系。升级后 API 版本变更（如 `extensions/v1beta1` 弃用），旧版 ownerReferences 失效
- **意外删除**：删除父对象时，错误的 ownerReferences 导致级联删除到无关资源。删除操作卡死，升级后垃圾回收器逻辑变更，对无效引用更敏感（如严格校验 API 版本）
- **控制器失效**：父控制器（如 Deployment Controller）因 OwnerReferences 错误，无法关联到子资源（如 ReplicaSet）。升级后控制器逻辑变更，拒绝处理非预期的 OwnerReferences
- **状态不一致**：实际运行的资源与父对象声明不一致，错误的 OwnerReferences 导致控制器无法跟踪子资源，无法修复偏差

建议在集群升级前，使用 kubectl-check-ownerreferences 扫描集群中是否存在错误的 ownerreferences 引用。

#### 3.1.2 通过插件检查

##### 3.1.2.1 安装 kubectl-check-ownerreferences

从 [官方页面](https://github.com/kubernetes-sigs/kubectl-check-ownerreferences/releases/tag/v0.4.0) 选择合适的版本下载（目前最新版本为 v0.4.0）：

```bash
git clone https://github.com/kubernetes-sigs/kubectl-check-ownerreferences.git
cd kubectl-check-ownerreferences 
make install
```

##### 3.1.2.2 执行检查

```bash
kubectl-check-ownerreferences
```

##### 3.1.2.3 预期结果

如果检查结果如下，则表明集群内没有异常 ownerReference 引用：

```
No invalid ownerReferences found
```

如果检查结果为其他，则表明对应的 ownerReference 引用异常，需要处理。

### 3.2 组件依赖检查

#### 3.2.1 组件检查意义

不同组件版本适配不同版本集群，集群升级对组件版本有要求。如果组件版本跟集群版本不适配，可能会导致组件功能受损或不可用。

TKE 目前在集群升级时，组件版本要求如下：

**1.20 升级到 1.22**:

| 组件 | 最低版本 |
| --- | --- |
| service-controller | >= 1.8.0 |
| l7-lb-controller | >= 1.8.0 |
| coredns | >= 1.8.4 |
| tke-eni-ipamd | >= 3.4.2 |
| tke-eni-agent | >= 3.4.2 |
| tke-eni-ip-scheduler | >= 3.4.2 |
| add-pod-eni-ip-limit-webhook | >= 0.0.7 |
| ingress-nginx 组件版本 | >= 1.0.0 |
| ingress-nginx 实例版本 | >= 1.1.3 |

**1.22 升级到 1.24**:

| 组件 | 最低版本 |
| --- | --- |
| cbs | >= 1.1.1 |

**1.24 升级到 1.26**:

| 组件 | 最低版本 |
| --- | --- |
| service-controller | >= 1.8.0 |
| l7-lb-controller | >= 1.8.0 |
| tke_log_agent | >= 1.1.13 |
| tke_event_collector | >= 0.0.4 |
| ingress-nginx 组件版本 | >= 1.3.0 |

#### 3.2.2 获取需要升级的组件列表

在升级集群之前，要保证组件满足集群新版本要求，TKE 会对组件版本进行检查，若检查不通过则无法升级，您可按照要求升级组件版本。

#### 3.2.3 升级组件

组件版本中，coredns、service-controller、l7-lb-controller、nginx-ingress 组件、nginx-ingress 实例需要联系 TKE 进行后台升级，其他组件您可在组件管理下自助进行升级，升级前需要请参考 [组件变更版本记录](https://cloud.tencent.com/document/product/457/71800)。

!!! warning "注意"
    - TKE 组件自定义配置和参数，只能通过控制台修改，非控制台修改/设置的参数，升级将会覆盖
    - TKE 组件升级无法回滚，如果升级出现问题，需第一时间联系 TKE 协助处理

### 3.3 废弃 API 检查

#### 3.3.1 废弃 API 的风险

随着 Kubernetes API 的演化，API 会周期性地被重组或升级，部分 API 会被弃用并被最终删除。以下为各 Kubernetes 社区版本中被废弃的 API，更多已废弃的 API 说明请参考：[Kubernetes 弃用指南](https://kubernetes.io/zh-cn/docs/reference/using-api/deprecation-guide/)

废弃 API 不影响集群控制面升级的成功与否，但会影响集群升级后对应资源的操作。在集群升级后，当某 API 被废弃时，已经创建的资源对象不受影响，但新建或编辑该资源时将出现 API 版本被拦截的情况。

#### 3.3.2 规避风险

在升级前，可以通过 TKE 提供的升级前置检查能力，TKE 集群列表 -> 集群升级 -> 前置检查，检查即将被废弃的 API 是否仍在被使用（数据来源于自 Kubernetes v1.19 以来的指标：`apiserver_requested_deprecated_apis`），获取仍在被请求且即将废弃的 API 的列表。检查状态均为提示，TKE 已保证自身提供的服务均满足新版本集群 API 的要求，您需要对自身服务请求 API 使用的版本是否正确负责。

在获取到废弃 API 列表后，通过容器服务 -> 运维中心 -> 运维功能管理，找到请求对应集群，右侧操作下更多，点击集群审计检索，通过审计日志里的 `useragent` 和 `user.username`，找到请求废弃 GRV 的组件。

例如：搜索 1.25 要被废弃的 v1beta1 的 poddisruptionbudgets 示例：

```
requestURI:policy/v1beta1/poddisruptionbudgets
```

找到对应组件后，可参考社区或服务提供商要求更新，以满足新集群版本要求。TKE 提供的组件，均已通过测试和验证，当您满足 3.2 组件依赖检查时，可忽略废弃 API 检查中针对 TKE 组件的提示。

### 3.4 Helm 检查

#### 3.4.1 检查的意义

检查当前 HelmRelease 记录中是否含有目标集群版本不支持的废弃 API，如果存在，升级后 helm 模板会不可用，HelmRelease 资源无法被创建、更新或删除。

#### 3.4.2 通过插件检查

Kubent 全称 Kube No Trouble 是一个简单的工具，主要用于检查 k8s 集群中是否使用废弃的 API 版本，支持使用 Helm 清单，直接在各个命名空间中存储为 Secret 或 ConfigMap 的检查。

##### 3.4.2.1 安装 kubent 插件

```bash
sh -c "$(curl -sSL 'https://git.io/install-kubent')"
```

##### 3.4.2.2 执行检查

```bash
kubent -k /root/.kube/config
```

##### 3.4.2.3 预期结果

```
_____________________________________________________________________________
>>> Deprecated APIs removed in 1.25 <<<
------------------------------------------------------------------------------------------
```

#### 3.4.3 转换处理

将 HelmRelease 记录中 K8s 废弃 API 转换为源版本和目标版本均兼容的 API，可以通过 [helm 社区工具转换](https://github.com/helm/helm-mapkubeapis)。

### 3.5 其他特性适配

除以上所有集群版本通用检查外，还有一些特定版本的检查。

#### 3.5.1 intree csi 检查

历史原因，1.18 版本以前，TKE 提供 intree csi 的能力，在 api 中声明了 csi 的字段，字段在 1.20 版本中，该字段与社区 pb 号冲突，因此在 1.18 升级到 1.20 时，需要检查集群内是否有使用 intree csi 和 inline csi，如果有使用，需要转换为 outree 的 pv 和 pvc 才能升级，否则升级会阻塞。

#### 3.5.2 自动注入 serviceaccount 检查

社区在 1.23 版本，不再默认注入 serviceaccount，在 1.22 升级到 1.24 时，当您需要使用 serviceaccount 时，需要显式声明，否则在服务滚动更新后，会因为没有 serviceaccount 导致服务异常。

#### 3.5.3 PSP 检查

PodSecurityPolicy 在 1.21 版本被弃用，在 1.25 版本中被彻底移除。提高其可用性所需要的更新会带来破坏性的变化，因此有必要删除它，用更友好的 Pod Security Admission 来替代，如果当前已经使用了 PodSecurityPolicy，请参见 [从 PSP 迁移](https://kubernetes.io/zh-cn/docs/tasks/configure-pod-container/migrate-from-psp/)。

### 3.6 备份集群

升级集群后，您无法对其进行降级。您可通过 TKE 提供的 [备份中心](https://cloud.tencent.com/document/product/457/90490) 能力，对集群进行备份，可用于备份现有集群并将备份应用到新集群。如果升级失败，您可使用原始版本创建新集群并恢复数据平面。请注意，备份中不包含云上的资源，这些资源需要重新创建。

## 4. 升级控制面

按照 [TKE 集群升级文档](https://cloud.tencent.com/document/product/457/32192#master) 中的 `升级 Master Kubernetes 版本` 部分进行 master 升级。升级应选择业务低峰期，升级期间应该暂停操作集群和发布。

!!! warning "注意"
    1. 控制面升级无法回滚，如果是大规模生产集群，可以提前联系 TKE 进行升级护航
    2. 若已设置的 master 自定义参数，原参数不保留，需要重新设置新版本的自定义参数
    3. 控制面升级后，需要预留足够的观察时间（15~20 分钟），有些行为变更是与新版的 Kubernetes 相关的，在升级到新版本后，才会通过 Kubernetes 的 reconcile 机制生效

## 5. 集群控制面升级 FAQ

**Q：master 集群在控制台发起升级后，有没有办法回滚？**

A：升级属于不可逆操作，不支持升级回滚，k8s 官方也不支持升级回滚，升级后如果回滚，会有大量的不可预知的兼容性风险。

- **数据丢失**：在升级过程中，旧版本的 Kubernetes 组件可能会被新版本覆盖或删除。这可能导致旧版本的数据丢失，包括配置、日志、存储卷等。如果升级后出现问题，回滚到旧版本可能会导致数据不一致或丢失
- **状态不一致**：Kubernetes 集群中的各种组件（如 Pod、Replicaset、Service 等）可能会在升级过程中处于不一致的状态。这可能导致回滚后集群出现错误，甚至无法正常工作
- **版本兼容性问题**：在升级过程中，新版本的 Kubernetes 组件可能与旧版本的 API Server 或其他组件不兼容。这可能导致回滚后集群出现错误，甚至无法正常工作
- **升级策略问题**：在升级过程中，如果没有正确配置升级策略（如滚动升级、蓝绿部署等），可能会导致集群中的部分节点升级成功，而其他节点仍然运行旧版本。这可能导致回滚后集群出现错误，甚至无法正常工作
- **手动干预**：在升级过程中，如果手动干预了集群的配置或状态，可能会导致回滚后集群出现错误，甚至无法正常工作

因此，在进行 Kubernetes 集群版本升级时，务必确保已经充分测试了新版本，并正确配置了升级策略。如果升级后出现问题，可以考虑使用备份和恢复工具来恢复数据，而不是直接回滚到旧版本。

**Q：之前设置的自定义参数升级时是否会保留？**

A：独立集群自定义参数场景下，master 升级会还原成默认的，对客户影响比较大（需要在升级之前对比一下参数，后端已有接口：`DescribeClusterMasterDiff`）

托管集群自定义参数场景下，master 升级后自定义参数会保留，但如果自定义参数在新版本被废弃了，升级会阻塞。

**Q：如何保证集群升级的成功率？**

A：TKE 的集群升级都经过严格测试，大量验证后开放给客户，升级流程中，TKE 后台会监控集群整体的运行状态，当集群出现异常时会及时暂停升级，减少风险。
