# Kitfile 编写指南

## 📚 概述

Kitfile 是 ModelKit 的核心配置文件，使用 YAML 格式定义 AI/ML 项目的所有组件。本文档详细介绍 Kitfile 的各个字段和最佳实践。

## 🎯 文档元信息

- **状态**: 🚧 待建设
- **计划内容**:
  - Kitfile 完整字段说明
  - 不同场景的 Kitfile 模板
  - 高级配置选项
  - 常见问题解答

## 📋 基本结构

```yaml
# Kitfile 基本结构
manifestVersion: v1.0.0

package:
  name: <项目名称>
  version: <版本号>
  description: <项目描述>
  authors:
    - <作者>
  license: <许可证>

model:
  name: <模型名称>
  path: <模型路径>
  framework: <框架>

datasets:
  - name: <数据集名称>
    path: <数据集路径>

code:
  - path: <代码路径>
    description: <代码描述>

docs:
  - path: <文档路径>

prompts:
  - path: <提示词路径>
```

## 📖 字段详解

!!! warning "待建设"
    本节内容正在建设中，敬请期待。

### manifestVersion（必填）

### package（推荐）

### model（核心）

### datasets（可选）

### code（可选）

### docs（可选）

### prompts（可选，用于 LLM）

## 📄 模板示例

!!! warning "待建设"
    本节内容正在建设中，敬请期待。

### PyTorch 模型

### TensorFlow 模型

### LLM 模型

### 多数据集项目

## 🔗 相关资源

- [KitOps Kitfile 官方文档](https://kitops.org/docs/kitfile/kf-overview/)
- [返回 KitOps on TKE](index.md)
