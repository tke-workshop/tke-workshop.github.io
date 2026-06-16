# 贡献指南

感谢您对 TKE Workshop 的关注！我们欢迎各种形式的贡献。

## 🚀 快速开始

### 方式一：在线编辑（推荐新手）

1. 点击文档页面右上角的 ✏️ 编辑按钮
2. 在 GitHub 网页上直接编辑
3. 提交 Pull Request

### 方式二：本地编辑

```bash
# 1. Fork 并克隆仓库
git clone git@github.com:YOUR_USERNAME/tke-workshop.git
cd tke-workshop

# 2. 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 本地预览
mkdocs serve
# 浏览器打开 http://127.0.0.1:8000

# 5. 创建分支并编辑
git checkout -b docs/your-feature

# 6. 提交并推送
git add .
git commit -m "docs(模块): 简要描述"
git push origin docs/your-feature

# 7. 在 GitHub 创建 Pull Request
```

## 📝 提交规范

### 分支命名

```text
docs/模块名-简要描述
fix/问题描述
feat/新功能描述
```

示例：
- `docs/networking-add-ingress-guide`
- `fix/typo-in-basics`
- `feat/add-search-highlight`

### Commit 信息格式

```text
<type>(<scope>): <description>
```

| type | 说明 |
|------|------|
| `docs` | 文档变更 |
| `fix` | 修复问题 |
| `feat` | 新功能 |
| `style` | 样式调整 |
| `chore` | 其他变更 |

示例：
- `docs(networking): 新增 Ingress 配置指南`
- `fix(basics): 修复 kubectl 安装命令`
- `style: 统一代码块格式`

## ✅ Pull Request 检查清单

提交 PR 前，请确认：

- [ ] 本地预览通过（`mkdocs serve`）
- [ ] 无拼写错误
- [ ] 链接有效
- [ ] 图片已压缩（建议 < 200KB）
- [ ] 遵循现有文档风格

## 📋 文档风格指南

### Markdown 规范

- 使用 ATX 风格标题（`#`）
- 代码块指定语言
- 使用相对路径引用内部链接

### 告警框使用

```markdown
!!! note "注意"
    这是一个注意事项。

!!! tip "提示"
    这是一个有用的提示。

!!! warning "警告"
    这是一个警告信息。

!!! danger "危险"
    这是一个危险操作提醒。
```

### 标签页使用

```markdown
=== "选项 A"

    选项 A 的内容

=== "选项 B"

    选项 B 的内容
```

## 🔍 审核流程

1. 提交 PR 后，CI 自动构建
2. 模块负责人审核内容
3. 管理员最终审批
4. 合并后自动部署

通常在 3 个工作日内完成审核。

## 💬 获取帮助

- 提交 [Issue](https://github.com/TencentCloud/tke-workshop/issues) 反馈问题
- 加入社区讨论

感谢您的贡献！🎉
