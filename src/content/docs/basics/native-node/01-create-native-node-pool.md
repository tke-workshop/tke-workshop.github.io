---
title: "创建原生节点池"
---

# 创建原生节点池

## 文档元信息

- **功能名称**: 创建原生节点池
- **主要对象**: `MachineSet`
- **API 方式**: Kubernetes API / TKE 控制台 / 云 API
- **文档更新时间**: 2026-06-17
- **Agent 友好度**: ⭐⭐⭐⭐

---

## 功能概述

原生节点池可以通过 Kubernetes 声明式资源 `MachineSet` 创建。`MachineSet` 描述节点池副本数、机型、子网、磁盘、登录密钥、标签、污点、生命周期脚本和运行时配置。

**任务目标**: 使用 YAML 创建一个原生节点池，并验证对应 `Machine` 和 Kubernetes Node 创建成功。

---

## 前置条件

- [ ] 集群支持原生节点能力
- [ ] 已配置 `kubectl` 访问集群
- [ ] 已准备子网、安全组、登录密钥和机型规格
- [ ] 子网 IP、CVM、CBS 配额充足
- [ ] 已确认业务是否需要污点隔离

---

## 创建 MachineSet

创建文件 `native-machineset.yaml`:

```yaml
apiVersion: node.tke.cloud.tencent.com/v1beta1
kind: MachineSet
metadata:
  name: native-backend-pool
spec:
  type: Native
  replicas: 3
  displayName: native-backend-pool
  subnetIDs:
    - subnet-xxxxxxxx
  instanceTypes:
    - S5.MEDIUM4
  scaling:
    minReplicas: 1
    maxReplicas: 10
    createPolicy: ZonePriority
  template:
    metadata:
      labels:
        node-type: native
        workload-type: backend
      annotations:
        node.tke.cloud.tencent.com/machine-cloud-tags: '[{"tagKey":"env","tagValue":"production"},{"tagKey":"cost-center","tagValue":"cc-1001"}]'
    spec:
      displayName: native-backend-worker
      providerSpec:
        type: Native
        value:
          instanceChargeType: PostpaidByHour
          securityGroupIDs:
            - sg-xxxxxxxx
          keyIDs:
            - skey-xxxxxxxx
          systemDisk:
            diskType: CloudPremium
            diskSize: 100
          dataDisks:
            - diskType: CloudPremium
              diskSize: 200
              fileSystem: ext4
              mountTarget: /var/lib/containerd
              deleteWithInstance: true
          lifecycle:
            preInit: echo "before node init"
            postInit: echo "after node init"
      runtimeRootDir: /var/lib/containerd
      taints:
        - key: dedicated
          value: backend
          effect: NoSchedule
```

应用配置：

```bash
kubectl apply -f native-machineset.yaml
```

---

## 验证步骤

### 查看 MachineSet

```bash
kubectl get machineset
kubectl describe machineset native-backend-pool
```

### 查看 Machine

```bash
kubectl get machine
kubectl describe machine <machine-name>
```

### 查看 Kubernetes Node

```bash
kubectl get nodes -l node-type=native -o wide
kubectl describe node <node-name>
```

---

## 常见问题

| 问题 | 可能原因 | 处理方式 |
|------|----------|----------|
| MachineSet 创建后无节点 | 子网、机型库存或配额不足 | 检查事件、子网 IP 和 CVM 库存 |
| 节点创建后 NotReady | 安全组、路由或初始化脚本异常 | 检查 kubelet 和节点初始化日志 |
| Pod 不调度到原生节点 | 污点未容忍或标签选择器不匹配 | 检查 tolerations 和 nodeSelector |
| 删除 Machine 后又被创建 | MachineSet 副本数未降低 | 先缩容 MachineSet 再删除 Machine |

---

## 相关文档

- [扩缩原生节点池](./02-scale-native-node-pool.md)
- [管理原生节点](./03-manage-native-node.md)
- [标准节点池管理](../node-pool/index.md)
