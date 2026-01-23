# TKEStack Playbook 集成说明

## 📋 概述

已成功将 `tkestack/tke-playbook` 仓库中所有 `tke-xxxx` 命名的目录集成到 Cookbook Collection 页面。

## 🎯 集成的 Cookbooks

### 从 tkestack/tke-playbook 新增 (8 个)

| ID | 标题 | 分类 | 语言 | 描述 |
|---|---|---|---|---|
| `tke-ai-playbook` | TKE AI Playbook | GPU/AI | YAML | AI/ML 工作负载管理和最佳实践 |
| `tke-chaos-playbook` | TKE Chaos Playbook | Testing | YAML | Kubernetes 混沌工程和故障注入 |
| `tke-direct-upgrade` | TKE Direct Upgrade | Cluster | Bash | TKE 集群直接升级指南 |
| `tke-get-client-ip` | TKE Get Client IP | Networking | YAML | 在 TKE 中保留客户端 IP |
| `tke-hybrid-node-architecture` | TKE Hybrid Node Architecture | Cluster | YAML | 混合节点架构设计 |
| `tke-karpenter` | TKE Karpenter | Cluster | YAML | Karpenter 自动扩缩容集成 |
| `tke-terraform-examples` | TKE Terraform Examples | Cluster | Terraform | Terraform IaC 示例 |
| `tke-to-community-ingress` | TKE to Community Ingress | Networking | YAML | Ingress 迁移指南 |

### 原有 Workshop Cookbooks (3 个)

| ID | 标题 | 分类 | 语言 |
|---|---|---|---|
| `create-cluster` | 创建 TKE 托管集群 | Cluster | Python |
| `deploy-nginx` | 部署 Nginx 应用 | Workload | Python |
| `deploy-gpu-pod` | 部署 GPU 工作负载 | GPU/AI | Python |

---

## 📊 统计信息

- **总计 Cookbook 数量**: 11 个
- **来源**: 
  - `tke-workshop/tke-workshop.github.io`: 3 个
  - `tkestack/tke-playbook`: 8 个
- **支持的分类**: 6 个 (Cluster, Workload, GPU/AI, Networking, Storage, Testing)
- **支持的语言**: 5 个 (Python, Go, Bash, YAML, Terraform)

---

## 🔧 技术实现

### 1. GitHub 仓库配置

每个 tkestack cookbook 配置示例:

```javascript
{
    id: 'tke-ai-playbook',
    title: 'TKE AI Playbook',
    description: '加载中...', // 自动从 GitHub README 加载
    category: 'gpu',
    language: 'YAML',
    resources: ['AI', 'ML'],
    tags: ['AI/ML', 'GPU', 'Training'],
    
    // GitHub 配置
    github: {
        repo: 'tkestack/tke-playbook',     // 仓库路径
        path: 'tke-ai-playbook',           // 目录名
        branch: 'main'                     // 分支
    },
    
    url: 'https://github.com/tkestack/tke-playbook/tree/main/tke-ai-playbook',
    services: ['AI', 'TKE']
}
```

### 2. 自动 README 抓取

所有 cookbook 的描述信息会自动从对应 GitHub 目录的 `README.md` 中提取:

```
https://raw.githubusercontent.com/tkestack/tke-playbook/main/tke-ai-playbook/README.md
                                    ↓
                            自动解析 Markdown
                                    ↓
                         提取前 200 字符作为描述
```

### 3. 目录结构保持

保持 `tkestack/tke-playbook` 原有的目录结构:

```
tkestack/tke-playbook/
├── tke-ai-playbook/
│   ├── README.md              ← 自动提取描述
│   ├── deployment.yaml
│   └── ...
├── tke-chaos-playbook/
│   ├── README.md
│   └── ...
└── tke-terraform-examples/
    ├── README.md
    └── ...
```

---

## 🎨 新增的过滤器

### Category (分类)

新增了 **Testing** 分类:

- ✅ 集群管理 Cluster
- ✅ 工作负载 Workload
- ✅ GPU / AI
- ✅ 网络 Network
- ✅ 存储 Storage
- ✅ **测试 Testing** (新增)

### Language (语言)

新增了 **YAML** 和 **Terraform**:

- ✅ Python
- ✅ Go
- ✅ Bash
- ✅ **YAML** (新增)
- ✅ **Terraform** (新增)

---

## 🔗 访问方式

### 1. Cookbook 集合页

访问: https://tke-workshop.github.io/cookbook-patterns.html

### 2. 单个 Cookbook

每个 cookbook 点击 "View Pattern →" 跳转到对应的 GitHub 目录:

**示例**:
```
https://github.com/tkestack/tke-playbook/tree/main/tke-ai-playbook
```

### 3. 原始仓库

浏览所有 tkestack playbooks:
```
https://github.com/tkestack/tke-playbook
```

---

## 📝 Cookbook 详细信息

### 1. TKE AI Playbook
- **路径**: `tkestack/tke-playbook/tke-ai-playbook`
- **用途**: AI/ML 工作负载管理
- **资源**: AI 训练任务、GPU 调度
- **标签**: AI/ML, GPU, Training

### 2. TKE Chaos Playbook
- **路径**: `tkestack/tke-playbook/tke-chaos-playbook`
- **用途**: Kubernetes 混沌工程
- **资源**: 故障注入、韧性测试
- **标签**: Chaos, Fault, Resilience

### 3. TKE Direct Upgrade
- **路径**: `tkestack/tke-playbook/tke-direct-upgrade`
- **用途**: 集群升级指南
- **资源**: 升级脚本、迁移工具
- **标签**: Upgrade, Migration, Version

### 4. TKE Get Client IP
- **路径**: `tkestack/tke-playbook/tke-get-client-ip`
- **用途**: 客户端 IP 保留
- **资源**: Service、Ingress 配置
- **标签**: Network, Client IP, LB

### 5. TKE Hybrid Node Architecture
- **路径**: `tkestack/tke-playbook/tke-hybrid-node-architecture`
- **用途**: 混合节点架构
- **资源**: 节点管理、多架构支持
- **标签**: Hybrid, Node, Multi-Arch

### 6. TKE Karpenter
- **路径**: `tkestack/tke-playbook/tke-karpenter`
- **用途**: Karpenter 集成
- **资源**: 自动扩缩容、节点管理
- **标签**: Karpenter, Autoscaling, Node

### 7. TKE Terraform Examples
- **路径**: `tkestack/tke-playbook/tke-terraform-examples`
- **用途**: Terraform IaC 示例
- **资源**: 基础设施即代码
- **标签**: Terraform, IaC, Automation

### 8. TKE to Community Ingress
- **路径**: `tkestack/tke-playbook/tke-to-community-ingress`
- **用途**: Ingress 迁移
- **资源**: Ingress 配置、迁移指南
- **标签**: Ingress, Migration, Community

---

## 🚀 使用流程

### 对于用户

1. **访问 Cookbook 集合页**
   - 打开: https://tke-workshop.github.io/cookbook-patterns.html

2. **浏览和筛选**
   - 使用左侧过滤器按分类、语言筛选
   - 搜索框搜索关键词

3. **查看详情**
   - 点击卡片的 "View Pattern →" 按钮
   - 跳转到 GitHub 查看完整文档和代码

4. **克隆和使用**
   ```bash
   # 克隆整个仓库
   git clone https://github.com/tkestack/tke-playbook
   
   # 使用特定 cookbook
   cd tke-playbook/tke-ai-playbook
   kubectl apply -f deployment.yaml
   ```

### 对于开发者

#### 添加新的 tkestack cookbook

1. 在 `tkestack/tke-playbook` 仓库创建新目录 `tke-new-feature/`
2. 添加 `README.md` 文件（描述会自动提取）
3. 在 `cookbook-patterns.html` 中添加配置:

```javascript
{
    id: 'tke-new-feature',
    title: 'TKE New Feature',
    description: '加载中...',
    category: 'cluster',  // 选择合适的分类
    language: 'YAML',     // 选择合适的语言
    resources: [],
    tags: [],
    github: {
        repo: 'tkestack/tke-playbook',
        path: 'tke-new-feature',
        branch: 'main'
    },
    url: 'https://github.com/tkestack/tke-playbook/tree/main/tke-new-feature',
    services: ['TKE', 'NEW']
}
```

---

## ⚠️ 注意事项

### 1. README 文件要求

每个 tkestack cookbook 目录必须包含 `README.md`:

```
tke-playbook/
└── tke-xxx/
    ├── README.md    ← 必须存在
    ├── *.yaml
    └── ...
```

### 2. 描述提取规则

- 自动移除 Markdown 标题、代码块、链接
- 提取前 200 个字符作为卡片描述
- 完整文档需点击 "View Pattern →" 查看

### 3. 缓存机制

- README 内容缓存 5 分钟
- 点击 "🔄 Refresh Descriptions" 可手动刷新

### 4. 仓库分支

- 默认使用 `main` 分支
- 可在 `github.branch` 配置中修改

---

## 📈 性能优化

### 并行加载

所有 cookbook 的 README 并行加载:

```javascript
const promises = cookbooks.map(cb => fetchGitHubReadme(cb.github));
await Promise.all(promises);
```

### 缓存策略

```javascript
const CACHE_DURATION = 5 * 60 * 1000; // 5 分钟
```

---

## 🎉 优势

✅ **统一入口**: 所有 TKE cookbook 集中管理  
✅ **实时同步**: 描述自动从 GitHub README 获取  
✅ **易于发现**: 分类、筛选、搜索功能  
✅ **保持更新**: 原始仓库更新后自动反映  
✅ **零维护**: 无需在多处维护文档  
✅ **用户友好**: 美观的卡片式布局 + 深色主题

---

## 📚 相关文档

- [Cookbook GitHub README 自动集成说明](./COOKBOOK_README_INTEGRATION.md)
- [TKEStack Playbook 仓库](https://github.com/tkestack/tke-playbook)
- [TKE Workshop](https://tke-workshop.github.io/)

---

**更新日期**: 2026-01-23  
**版本**: v1.0  
**Commit**: `1bed400`
