# Kitfile 编写指南

## 📚 概述

Kitfile 是 ModelKit 的核心配置文件，使用 YAML 格式定义 AI/ML 项目的所有组件。本文档详细介绍 Kitfile 的各个字段和最佳实践。

## 🎯 文档元信息

- **适用版本**: KitOps v1.11.0+
- **Kitfile 版本**: manifestVersion v1.0.0
- **Agent 友好度**: ⭐⭐⭐⭐⭐

## 📋 基本结构

每个 Kitfile 必须包含 `manifestVersion` 和至少一个内容部分（model、datasets、code、docs 或 prompts）：

```yaml
# Kitfile 基本结构
manifestVersion: v1.0.0

package:
  name: <项目名称>
  version: <版本号>
  description: <项目描述>
  authors:
    - <作者>

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

### manifestVersion（必填）

指定 Kitfile 的版本号，确保兼容性。

| 属性 | 说明 |
|------|------|
| **类型** | String |
| **必填** | ✅ 是 |
| **示例** | `v1.0.0` 或 `1.0.0` |

```yaml
manifestVersion: v1.0.0
```

### package（推荐）

项目的元数据信息，用于描述 ModelKit 的基本属性。

| 子字段 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `name` | String | 否 | 项目名称 |
| `version` | String | 否 | 版本号（语义化版本） |
| `description` | String | 否 | 项目描述 |
| `authors` | String[] | 否 | 作者列表 |
| `license` | String | 否 | SPDX 许可证标识符 |

```yaml
package:
  name: sentiment-analysis-model
  version: 2.1.0
  description: 基于 BERT 的中文情感分析模型
  authors:
    - AI Team
    - ML Platform
  license: Apache-2.0
```

### model（核心）

定义训练好的模型文件及其元数据。**每个 ModelKit 只能包含一个模型**。

| 子字段 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `name` | String | 否 | 模型名称 |
| `path` | String | ✅ 是 | 模型文件的相对路径 |
| `framework` | String | 否 | AI/ML 框架 |
| `version` | String | 否 | 模型版本 |
| `description` | String | 否 | 模型描述 |
| `license` | String | 否 | SPDX 许可证标识符 |
| `parts` | Array | 否 | 模型组件列表（如 LoRA 权重） |
| `parameters` | Object | 否 | 额外参数（YAML/JSON Map） |

#### 支持的 Framework 值

常见的框架标识符包括：

- `PyTorch`
- `TensorFlow`
- `Scikit-learn`
- `ONNX`
- `Hugging Face`
- `JAX`
- `XGBoost`
- `LightGBM`

```yaml
model:
  name: bert-chinese-sentiment
  path: ./models/bert_sentiment.pt
  framework: PyTorch
  version: 2.1.0
  description: 基于 BERT-base-chinese 微调的情感分析模型
  license: Apache-2.0
```

#### 使用 parts 字段（LoRA 等增量权重）

```yaml
model:
  name: llama2-7b-chat-lora
  path: ./models/llama2-7b-base
  framework: Hugging Face
  parts:
    - name: lora-adapter
      path: ./models/lora_weights
      type: LoRA
    - name: tokenizer
      path: ./models/tokenizer
      type: tokenizer
```

#### 使用 parameters 字段

```yaml
model:
  name: resnet50-classifier
  path: ./models/resnet50.onnx
  framework: ONNX
  parameters:
    input_shape: [1, 3, 224, 224]
    num_classes: 1000
    preprocessing:
      mean: [0.485, 0.456, 0.406]
      std: [0.229, 0.224, 0.225]
```

### datasets（可选）

定义训练、验证或其他数据集。**支持包含多个数据集**。

| 子字段 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `name` | String | 否 | 数据集名称 |
| `path` | String | ✅ 是 | 数据文件的相对路径 |
| `description` | String | 否 | 数据集描述 |
| `license` | String | 否 | SPDX 许可证标识符 |

```yaml
datasets:
  - name: training-data
    path: ./data/train.csv
    description: 中文情感分析训练数据（10万条）
    license: CC-BY-4.0
  
  - name: validation-data
    path: ./data/validation.csv
    description: 验证数据集（1万条）
  
  - name: test-data
    path: ./data/test.csv
    description: 测试数据集（5千条）
```

### code（可选）

指定代码路径，如 Jupyter Notebook、Python 脚本或代码目录。**支持包含多个代码部分**。

| 子字段 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `path` | String | ✅ 是 | 代码文件或目录的相对路径 |
| `description` | String | 否 | 代码功能描述 |
| `license` | String | 否 | SPDX 许可证标识符 |

```yaml
code:
  - path: ./notebooks/training.ipynb
    description: 模型训练 Jupyter Notebook
    license: Apache-2.0
  
  - path: ./src/inference.py
    description: 推理服务代码
  
  - path: ./scripts/
    description: 数据预处理和评估脚本
```

### docs（可选）

包含项目文档、README、模型卡片等。

| 子字段 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `path` | String | ✅ 是 | 文档文件的相对路径 |
| `description` | String | 否 | 文档内容描述 |

```yaml
docs:
  - path: ./README.md
    description: 项目说明文档
  
  - path: ./docs/model_card.md
    description: 模型卡片（性能指标、限制等）
  
  - path: ./docs/api_reference.md
    description: API 参考文档
```

### prompts（可选，用于 LLM）

用于 LLM 的系统提示词、用户提示模板等。

| 子字段 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `path` | String | ✅ 是 | 提示词文件的相对路径 |
| `description` | String | 否 | 提示词描述 |

```yaml
prompts:
  - path: ./prompts/system.md
    description: 系统提示词，定义 AI 助手角色和行为
  
  - path: ./prompts/few_shot_examples.md
    description: Few-shot 学习示例
  
  - path: ./prompts/output_format.md
    description: 输出格式约束
```

## 📄 完整模板示例

### PyTorch 图像分类模型

```yaml
manifestVersion: v1.0.0

package:
  name: image-classifier
  version: 1.0.0
  description: 基于 ResNet50 的图像分类模型
  authors:
    - AI Vision Team
  license: Apache-2.0

model:
  name: resnet50-imagenet
  path: ./models/resnet50_pretrained.pt
  framework: PyTorch
  version: 1.0.0
  description: 在 ImageNet 上预训练的 ResNet50 模型
  license: Apache-2.0
  parameters:
    input_size: 224
    num_classes: 1000

datasets:
  - name: validation-images
    path: ./data/val_images/
    description: ImageNet 验证集样本
  - name: class-labels
    path: ./data/imagenet_classes.json
    description: ImageNet 类别标签映射

code:
  - path: ./src/
    description: 推理代码和工具函数
    license: Apache-2.0

docs:
  - path: ./README.md
    description: 使用说明
```

### TensorFlow/Keras NLP 模型

```yaml
manifestVersion: v1.0.0

package:
  name: text-classifier-keras
  version: 2.0.0
  description: 基于 Keras 的文本分类模型
  authors:
    - NLP Team

model:
  name: lstm-text-classifier
  path: ./models/lstm_classifier.h5
  framework: TensorFlow
  version: 2.0.0
  description: 双向 LSTM 文本分类模型

datasets:
  - name: training-corpus
    path: ./data/train.json
    description: 训练语料（JSON 格式）
  - name: word-embeddings
    path: ./data/word2vec.bin
    description: 预训练词向量

code:
  - path: ./notebooks/train.ipynb
    description: 训练 Notebook
  - path: ./src/preprocess.py
    description: 文本预处理代码

docs:
  - path: ./docs/
```

### LLM 模型（含 LoRA 和 Prompts）

```yaml
manifestVersion: v1.0.0

package:
  name: customer-service-llm
  version: 1.2.0
  description: 客服场景微调的 LLM 模型
  authors:
    - LLM Team
  license: Apache-2.0

model:
  name: qwen-7b-customer-service
  path: ./models/qwen-7b-base
  framework: Hugging Face
  version: 1.2.0
  description: 基于 Qwen-7B 微调的客服对话模型
  parts:
    - name: lora-weights
      path: ./models/lora_adapter
      type: LoRA
    - name: tokenizer
      path: ./models/tokenizer

datasets:
  - name: dialogue-corpus
    path: ./data/customer_service_dialogues.jsonl
    description: 客服对话语料

code:
  - path: ./src/serve.py
    description: vLLM 推理服务代码

prompts:
  - path: ./prompts/system_prompt.md
    description: 客服助手系统提示词
  - path: ./prompts/few_shot.md
    description: Few-shot 示例对话

docs:
  - path: ./README.md
  - path: ./docs/evaluation_results.md
    description: 模型评估报告
```

### Scikit-learn 传统 ML 模型

```yaml
manifestVersion: v1.0.0

package:
  name: fraud-detection-model
  version: 3.1.0
  description: 信用卡欺诈检测模型
  authors:
    - Risk Analytics Team

model:
  name: xgboost-fraud-detector
  path: ./models/fraud_detector.joblib
  framework: Scikit-learn
  version: 3.1.0
  description: XGBoost 欺诈检测集成模型
  parameters:
    threshold: 0.85
    features: 30

datasets:
  - name: feature-schema
    path: ./data/feature_schema.yaml
    description: 特征定义和数据字典
  - name: sample-data
    path: ./data/sample_transactions.csv
    description: 样例交易数据

code:
  - path: ./scripts/predict.py
    description: 批量预测脚本
  - path: ./notebooks/analysis.ipynb
    description: 特征分析和模型解释

docs:
  - path: ./docs/model_documentation.md
    description: 模型文档（含特征重要性分析）
```

## ⚠️ 注意事项

### 路径规则

1. **只支持相对路径**：所有 `path` 字段必须使用相对于 Kitfile 所在目录的路径
2. **不支持绝对路径**：`/home/user/models/` 这样的路径会导致错误
3. **推荐以 `./` 开头**：虽然非必须，但建议使用 `./path` 格式提高可读性

```yaml
# ✅ 正确
model:
  path: ./models/model.pt

# ✅ 正确
model:
  path: models/model.pt

# ❌ 错误 - 绝对路径
model:
  path: /home/user/models/model.pt
```

### 数量限制

| 字段 | 限制 |
|------|------|
| `model` | **只能有 1 个** |
| `datasets` | 可以有多个 |
| `code` | 可以有多个 |
| `docs` | 可以有多个 |
| `prompts` | 可以有多个 |

### Parameters 字段限制

`model.parameters` 字段有以下限制：

- 仅支持 YAML 中兼容 JSON 的子集
- 字符串不带流参数序列化
- 数字转换为十进制（如 `0xFF` → `255`）
- Map 按键字母顺序排序

## 🔧 验证 Kitfile

使用 `kit info` 命令验证 Kitfile 是否正确：

```bash
# 查看本地 Kitfile 信息
kit info .

# 查看远程 ModelKit 信息
kit info registry.example.com/repo/model:v1.0.0
```

## 🔗 相关资源

- [KitOps Kitfile 官方文档](https://kitops.org/docs/kitfile/kf-overview/)
- [KitOps Kitfile 格式参考](https://kitops.org/docs/kitfile/format/)
- [返回 KitOps on TKE](index.md)
- [快速开始](quickstart.md)
