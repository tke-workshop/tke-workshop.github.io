---
title: "存储配置"
---

# 存储配置

本文介绍如何为 TKE Cube Agent Sandbox 配置临时存储和共享存储。

## 存储类型

| 类型 | 适用场景 | 生命周期 |
| --- | --- | --- |
| 临时存储 | 任务运行时缓存、临时文件、构建中间产物 | 随沙箱销毁 |
| PVC / CFS 共享存储 | 工作空间、输入数据集、输出结果、团队共享文件 | 独立于沙箱生命周期 |
| 只读数据卷 | 依赖包、基线数据、测试集、工具文件 | 独立于沙箱生命周期 |

## 配置临时存储

临时存储适合短任务和无状态执行。您可以在模板中声明临时目录：

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxTemplate
metadata:
  name: code-interpreter-python
  namespace: agent-demo
spec:
  image: ccr.ccs.tencentyun.com/demo/code-interpreter:py311
  storage:
    temp:
      size: 20Gi
      mountPath: /tmp/sandbox
```

临时存储会在实例释放后删除，请勿保存需要长期保留的数据。

## 挂载 PVC 共享存储

创建 PVC：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: agent-workspace
  namespace: agent-demo
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: cfs
```

在 SandboxTemplate 中挂载：

```yaml
apiVersion: sandbox.tke.cloud.tencent.com/v1alpha1
kind: SandboxTemplate
metadata:
  name: code-interpreter-python
  namespace: agent-demo
spec:
  image: ccr.ccs.tencentyun.com/demo/code-interpreter:py311
  storage:
    volumes:
      - name: workspace
        type: pvc
        claimName: agent-workspace
        mountPath: /workspace
        readOnly: false
```

创建后，沙箱内可通过 `/workspace` 访问共享存储。

## 挂载只读数据卷

只读挂载适合共享依赖、测试集和工具目录：

```yaml
storage:
  volumes:
    - name: dataset
      type: pvc
      claimName: benchmark-dataset
      mountPath: /data
      readOnly: true
```

建议将不可变数据配置为只读，降低误删和篡改风险。

## 多卷挂载

同一个模板可挂载多个数据卷：

```yaml
storage:
  volumes:
    - name: workspace
      type: pvc
      claimName: agent-workspace
      mountPath: /workspace
      readOnly: false
    - name: dataset
      type: pvc
      claimName: benchmark-dataset
      mountPath: /data
      readOnly: true
```

## 最佳实践

- 任务型沙箱优先使用临时存储，减少共享存储依赖。
- 工作空间类场景使用共享存储，并配置配额和访问权限。
- 数据集、依赖包和基线文件使用只读挂载。
- 不要在镜像中固化频繁变化的大文件，优先通过共享存储挂载。
- 对共享存储开启备份策略，避免用户代码误删除关键数据。
- 为不同 Team 使用独立 PVC 或目录，避免租户间数据混用。

## 排障

| 问题 | 可能原因 | 处理建议 |
| --- | --- | --- |
| 沙箱创建卡在 Preparing | PVC 未绑定或存储组件异常 | 检查 PVC、StorageClass 和 CSI 组件 |
| 沙箱内看不到挂载目录 | 模板挂载路径配置错误 | 检查 `mountPath` 和模板状态 |
| 写入失败 | 数据卷为只读或权限不足 | 检查 `readOnly` 和文件权限 |
| 多个实例写入冲突 | 应用未处理并发写入 | 拆分目录或引入文件锁 |
