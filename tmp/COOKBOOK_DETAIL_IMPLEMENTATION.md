# Cookbook 详情页实现文档

## 📋 功能概述

基于提供的参考图片，实现了一个完整的 Cookbook 详情页，包含左侧内容展示区和右侧操作面板。

---

## 🎨 页面布局设计

### 整体结构

```
┌─────────────────────────────────────────────────────────────┐
│ ← 返回按钮 (固定在左上角)                                       │
├─────────────────────────┬───────────────────────────────────┤
│                         │                                   │
│  左侧主内容区              │  右侧操作面板 (Sticky)               │
│  (70%)                   │  (30%)                            │
│                         │                                   │
│  ┌──────────────────┐   │  ┌────────────────────────┐      │
│  │ 标题 + Meta 标签   │   │  │ 🔗 GitHub 链接          │      │
│  └──────────────────┘   │  └────────────────────────┘      │
│                         │                                   │
│  ┌──────────────────┐   │  ┌────────────────────────┐      │
│  │ 架构流程图         │   │  │ ⬇️ Download              │      │
│  │ [Icon] → [Icon]   │   │  │  git clone ...          │      │
│  └──────────────────┘   │  └────────────────────────┘      │
│                         │                                   │
│  ┌──────────────────┐   │  ┌────────────────────────┐      │
│  │ README 完整内容    │   │  │ 🚀 Deploy               │      │
│  │ (Markdown 渲染)   │   │  │  kubectl apply ...      │      │
│  │                  │   │  └────────────────────────┘      │
│  │  - 章节 1        │   │                                   │
│  │  - 章节 2        │   │  ┌────────────────────────┐      │
│  │  - 代码块        │   │  │ 🧪 Testing              │      │
│  │  - 图片          │   │  └────────────────────────┘      │
│  │  - 表格          │   │                                   │
│  │                  │   │  ┌────────────────────────┐      │
│  └──────────────────┘   │  │ 🧹 Cleanup              │      │
│                         │  └────────────────────────┘      │
│                         │                                   │
│                         │  ┌────────────────────────┐      │
│                         │  │ 📎 Additional Resources │      │
│                         │  │  - TKE 文档              │      │
│                         │  │  - K8s 文档             │      │
│                         │  └────────────────────────┘      │
└─────────────────────────┴───────────────────────────────────┘
```

---

## 🔧 核心功能实现

### 1. 页面初始化

#### URL 参数解析
```javascript
// 从 URL 获取 cookbook ID
const urlParams = new URLSearchParams(window.location.search);
const cookbookId = urlParams.get('id');

// 示例 URL:
// cookbook-detail.html?id=create-cluster
// cookbook-detail.html?id=tke-ai-playbook
```

#### Cookbook 数据查找
```javascript
const currentCookbook = cookbooks.find(c => c.id === cookbookId);

if (!currentCookbook) {
    // 显示 404 错误页面
    document.body.innerHTML = `...`;
}
```

---

### 2. 左侧主内容区

#### (1) 标题和 Meta 信息

**元素构成**:
- **标题**: 渐变色大标题
- **Meta 标签**: 分类、语言、技术标签
- **摘要**: 从 README 提取的前 300 字符

**实现**:
```javascript
// 设置标题
document.getElementById('cookbookTitle').textContent = cookbook.title;

// 设置 Meta 标签
const metaHtml = `
    <span class="meta-badge">📦 ${getCategoryName(cookbook.category)}</span>
    <span class="meta-badge">💻 ${cookbook.language}</span>
    ${cookbook.tags.map(tag => `<span class="meta-badge">🏷️ ${tag}</span>`).join('')}
`;
```

#### (2) 架构流程图

**设计**:
- 两个大图标 (100x100px)
- 中间箭头连接
- 图标下方显示服务名称

**实现**:
```javascript
const diagramHtml = `
    <div class="arch-component">
        <div class="arch-icon">${cookbook.services[0]}</div>
        <div class="arch-label">${cookbook.services[0]}</div>
    </div>
    <div class="arch-arrow">→</div>
    <div class="arch-component">
        <div class="arch-icon">${cookbook.services[1]}</div>
        <div class="arch-label">${cookbook.services[1]}</div>
    </div>
`;
```

**样式特点**:
- 渐变背景 (`var(--gradient-1)`)
- 发光效果 (`box-shadow`)
- 边框发光动画 (`::after` 伪元素)

#### (3) README 完整内容渲染

**Markdown 渲染**:
- 使用 **Marked.js** 将 Markdown 转为 HTML
- 使用 **Highlight.js** 进行代码高亮

**实现流程**:
```javascript
async function loadReadme(cookbook) {
    const { repo, path, branch } = cookbook.github;
    const readmeUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${path}/README.md`;
    
    // 1. 获取 README 内容
    const response = await fetch(readmeUrl);
    const markdownContent = await response.text();
    
    // 2. 提取摘要 (前 300 字符)
    const summary = extractSummary(markdownContent);
    
    // 3. 渲染完整 Markdown
    marked.setOptions({
        highlight: function(code, lang) {
            return hljs.highlight(code, { language: lang }).value;
        },
        breaks: true,
        gfm: true
    });
    
    const htmlContent = marked.parse(markdownContent);
    document.getElementById('readmeContent').innerHTML = `
        <div class="markdown-body">${htmlContent}</div>
    `;
    
    // 4. 提取部署和清理命令
    extractCommands(markdownContent);
}
```

**Markdown 样式**:
- 标题: 底部边框分隔
- 代码块: 深色背景 + 高亮
- 表格: 边框样式
- 引用: 左侧蓝色边框
- 图片: 圆角处理

---

### 3. 右侧操作面板

#### (1) GitHub 链接

**功能**: 跳转到 GitHub 仓库

**实现**:
```javascript
document.getElementById('githubLink').href = cookbook.url;
// 示例: https://github.com/tke-workshop/tke-workshop.github.io/tree/main/cookbook/cluster
```

#### (2) Download 命令

**功能**: 提供 `git clone` 命令，并支持一键复制

**实现**:
```javascript
const cloneUrl = `https://github.com/${cookbook.github.repo}.git`;
document.getElementById('downloadCommand').innerHTML = `
    <button class="copy-button" onclick="copyCode('downloadCommand')">Copy</button>
    <code>git clone ${cloneUrl}
cd ${cookbook.github.path}</code>
`;
```

**Copy 按钮交互**:
```javascript
function copyCode(blockId) {
    const code = document.getElementById(blockId).querySelector('code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = 'Copy';
            button.classList.remove('copied');
        }, 2000);
    });
}
```

#### (3) Deploy 命令

**功能**: 从 README 自动提取部署命令

**实现**:
```javascript
function extractCommands(markdown) {
    // 查找 "Deploy" 或 "部署" 相关的代码块
    const deployMatch = markdown.match(/##\s*(Deploy|部署|Usage|使用)[\s\S]*?```(?:bash|sh)?\n([\s\S]*?)```/i);
    
    if (deployMatch && deployMatch[2]) {
        const deployCmd = deployMatch[2].trim();
        document.getElementById('deployCommand').innerHTML = `
            <button class="copy-button" onclick="copyCode('deployCommand')">Copy</button>
            <code>${escapeHtml(deployCmd)}</code>
        `;
    }
}
```

#### (4) Testing 说明

**功能**: 提供测试文档链接

**实现**:
```html
<p>参考 GitHub 仓库中的详细测试说明。</p>
<a href="${cookbook.url}" target="_blank">查看测试文档</a>
```

#### (5) Cleanup 命令

**功能**: 从 README 自动提取清理命令

**实现**:
```javascript
// 查找 "Cleanup" 或 "清理" 相关的代码块
const cleanupMatch = markdown.match(/##\s*(Cleanup|清理|Delete|删除)[\s\S]*?```(?:bash|sh)?\n([\s\S]*?)```/i);
```

#### (6) Additional Resources

**功能**: 提供相关学习资源链接

**实现**:
```html
<ul class="resource-list">
    <li class="resource-item">
        <a href="https://cloud.tencent.com/document/product/457" target="_blank">
            TKE 官方文档
        </a>
    </li>
    <li class="resource-item">
        <a href="https://kubernetes.io/docs/" target="_blank">
            Kubernetes 文档
        </a>
    </li>
</ul>
```

---

## 🎯 技术特性

### 1. 响应式设计

#### 桌面端 (> 1200px)
```css
.detail-layout {
    display: grid;
    grid-template-columns: 1fr 380px; /* 左侧自适应，右侧固定 380px */
    gap: 2rem;
}

.action-panel {
    position: sticky;
    top: 2rem; /* 滚动时固定在顶部 */
}
```

#### 平板端 (< 1200px)
```css
@media (max-width: 1200px) {
    .detail-layout {
        grid-template-columns: 1fr; /* 单列布局 */
    }
    
    .action-panel {
        position: static; /* 取消 sticky */
    }
}
```

#### 移动端 (< 768px)
```css
@media (max-width: 768px) {
    .cookbook-title {
        font-size: 2rem; /* 缩小标题 */
    }
    
    .architecture-diagram {
        flex-direction: column; /* 架构图垂直排列 */
    }
    
    .arch-arrow {
        transform: rotate(90deg); /* 箭头旋转 */
    }
}
```

---

### 2. 加载状态管理

#### (1) 初始加载状态
```html
<div id="readmeContent" class="readme-loading">
    正在加载详细文档...
</div>
```

**CSS 动画**:
```css
.readme-loading::before {
    content: '⏳';
    animation: spin 2s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
```

#### (2) 加载成功
- 渲染完整 Markdown 内容
- 应用代码高亮
- 显示图片和表格

#### (3) 加载失败
```html
<div class="readme-error">
    ⚠️ 无法加载 README 文档。<br>
    错误: HTTP 404: Not Found<br>
    <a href="${cookbook.url}">直接访问 GitHub 查看</a>
</div>
```

---

### 3. Markdown 解析优化

#### 摘要提取算法
```javascript
function extractSummary(markdown) {
    // 1. 移除标题
    content = content.replace(/^#+\s+.*$/gm, '');
    
    // 2. 移除代码块
    content = content.replace(/```[\s\S]*?```/g, '');
    
    // 3. 移除链接 (保留文本)
    content = content.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    
    // 4. 移除图片
    content = content.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
    
    // 5. 移除 HTML 标签
    content = content.replace(/<[^>]+>/g, '');
    
    // 6. 提取前 300 字符
    const lines = content.split('\n').filter(line => line.trim().length > 20);
    let summary = lines.slice(0, 3).join(' ').substring(0, 300) + '...';
    
    return summary;
}
```

#### 命令提取正则表达式
```javascript
// Deploy 命令
/##\s*(Deploy|部署|Usage|使用)[\s\S]*?```(?:bash|sh)?\n([\s\S]*?)```/i

// Cleanup 命令
/##\s*(Cleanup|清理|Delete|删除)[\s\S]*?```(?:bash|sh)?\n([\s\S]*?)```/i
```

---

### 4. 交互优化

#### 复制功能
- **复制前**: 按钮显示 "Copy"
- **复制中**: 调用 `navigator.clipboard.writeText()`
- **复制成功**: 按钮显示 "Copied!" (绿色) 并保持 2 秒
- **复制失败**: 按钮显示 "Failed"

#### Hover 效果
- 卡片悬停: 向上平移 + 边框高亮
- 按钮悬停: 背景加深 + 平移动画
- 链接悬停: 颜色变化 + 下划线

---

## 📊 数据流程

```
URL (cookbook-detail.html?id=xxx)
  ↓
解析 cookbook ID
  ↓
查找 cookbooks 数组
  ↓
找到 currentCookbook
  ↓
初始化页面
  ├─ 设置标题和 Meta
  ├─ 渲染架构图
  ├─ 设置 GitHub 链接
  └─ 加载 README
      ↓
      获取 GitHub Raw Content
      ↓
      提取摘要 (300 字符)
      ↓
      渲染 Markdown (Marked.js)
      ↓
      代码高亮 (Highlight.js)
      ↓
      提取 Deploy/Cleanup 命令
      ↓
      更新操作面板
```

---

## 🔗 与列表页的集成

### cookbook-patterns.html 修改

**原代码**:
```html
<a href="${cookbook.url}" class="view-pattern" target="_blank">View Pattern</a>
```

**修改后**:
```html
<a href="cookbook-detail.html?id=${cookbook.id}" class="view-pattern">查看详情 View Details</a>
```

**效果**:
- 点击卡片 "View Details" 按钮
- 跳转到详情页，URL 带上 `?id=xxx` 参数
- 详情页自动加载对应的 Cookbook 信息

---

## 🎨 视觉设计

### 颜色主题

```css
--bg-primary: #0f1419;         /* 深色主背景 */
--bg-secondary: #161b22;       /* 卡片背景 */
--bg-tertiary: #1c2128;        /* 代码块背景 */
--accent-blue: #1e88e5;        /* 主题蓝色 */
--accent-purple: #9c27b0;      /* 紫色 */
--accent-cyan: #00bcd4;        /* 青色 */
--accent-green: #4caf50;       /* 绿色 (成功状态) */
--accent-orange: #ff9800;      /* 橙色 */
--text-primary: #e6edf3;       /* 主要文本 */
--text-secondary: #8b949e;     /* 次要文本 */
--border-color: #30363d;       /* 边框颜色 */
```

### 渐变效果

```css
--gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%);  /* 蓝紫渐变 */
--gradient-2: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);  /* 粉红渐变 */
--gradient-3: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);  /* 青色渐变 */
```

### 字体

- **标题**: `'Inter', sans-serif`
- **代码**: `'JetBrains Mono', monospace`

---

## 📦 依赖库

### CDN 引入

```html
<!-- Markdown 渲染 -->
<script src="https://cdn.jsdelivr.net/npm/marked@11.1.0/marked.min.js"></script>

<!-- 代码高亮 -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

<!-- 字体 -->
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 🧪 测试检查清单

- [ ] URL 参数正确解析 (`?id=xxx`)
- [ ] Cookbook 数据正确加载
- [ ] 标题和 Meta 标签显示正常
- [ ] 架构图渲染正确
- [ ] README 内容从 GitHub 加载成功
- [ ] Markdown 渲染正常 (标题、列表、代码块、表格、图片)
- [ ] 代码高亮生效
- [ ] 复制按钮功能正常
- [ ] Deploy/Cleanup 命令正确提取
- [ ] GitHub 链接可点击
- [ ] 响应式布局正常 (桌面/平板/移动)
- [ ] 加载状态显示正常
- [ ] 错误状态显示正常
- [ ] 返回按钮功能正常
- [ ] 滚动条样式正常
- [ ] Sticky 侧边栏功能正常

---

## 🚀 使用方法

### 1. 访问列表页

打开 `docs/cookbook-patterns.html`，浏览所有 Cookbook 卡片。

### 2. 点击 "查看详情"

点击任意卡片的 "查看详情 View Details" 按钮。

### 3. 查看详情页

- **左侧**: 阅读完整的 README 文档
- **右侧**: 复制下载、部署、清理命令

### 4. 返回列表

点击左上角 "← 返回所有 Patterns" 按钮。

---

## 📝 注意事项

### 1. GitHub API 限制

- **Raw Content API** 不需要认证
- **无速率限制** (相比 REST API 的 60 次/小时)
- **推荐使用** `https://raw.githubusercontent.com` 而非 `https://api.github.com`

### 2. README 文件名

自动尝试以下文件名:
- `README.md` (优先)
- `readme.md`
- `Readme.md`
- `README.MD`

### 3. 跨域问题

使用 GitHub Raw Content 不存在跨域问题，可直接通过 `fetch()` 获取。

### 4. 浏览器兼容性

- **Markdown 渲染**: Marked.js 支持所有现代浏览器
- **代码高亮**: Highlight.js 支持 IE11+
- **Clipboard API**: 需要 HTTPS 或 localhost (Chrome 63+, Firefox 53+, Safari 13.1+)

---

## 🔮 未来优化方向

1. **缓存机制**: 添加 localStorage 缓存 README 内容
2. **离线支持**: Service Worker 实现离线访问
3. **搜索功能**: 在详情页内搜索关键词
4. **目录导航**: 自动生成 README 目录 (TOC)
5. **相关推荐**: 根据分类推荐相似的 Cookbook
6. **评论系统**: 集成 GitHub Issues 作为评论
7. **多语言支持**: 检测 README 语言并自动切换
8. **PDF 导出**: 将详情页导出为 PDF
9. **打印优化**: 针对打印进行样式优化
10. **统计分析**: 记录访问量和热门 Cookbook

---

## 📄 文件清单

### 新增文件
- `docs/cookbook-detail.html` - Cookbook 详情页

### 修改文件
- `docs/cookbook-patterns.html` - 列表页 (修改 "View Pattern" 链接)

### 测试文件
- `tmp/test-detail.html` - 测试页面入口
- `tmp/COOKBOOK_DETAIL_IMPLEMENTATION.md` - 本文档

---

## ✅ 完成状态

- ✅ 左侧内容区实现
  - ✅ 标题和 Meta 标签
  - ✅ 架构流程图
  - ✅ README 完整内容 (Markdown 渲染)
- ✅ 右侧操作面板实现
  - ✅ GitHub 链接
  - ✅ Download 命令
  - ✅ Deploy 命令
  - ✅ Testing 说明
  - ✅ Cleanup 命令
  - ✅ Additional Resources
- ✅ 响应式设计 (桌面/平板/移动)
- ✅ 加载状态 (Loading/Success/Error)
- ✅ 交互功能 (复制代码、Hover 效果)
- ✅ 与列表页集成

---

## 🎉 总结

本实现完整参考了提供的 AWS Serverless Patterns 设计风格，包含:

1. **清晰的布局** - 左右分栏，职责明确
2. **完整的信息** - 从 README 获取所有内容
3. **美观的设计** - 深色主题，渐变效果，动画交互
4. **响应式适配** - 支持各种设备
5. **实用的功能** - 一键复制，快速部署

用户可以通过详情页快速了解 Cookbook 的架构、使用方法、部署步骤，并直接复制命令执行。
