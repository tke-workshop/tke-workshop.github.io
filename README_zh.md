# TKE Workshop

[![Deploy](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml)

腾讯云容器服务 TKE 动手实践与可执行 Cookbook。

在线站点：[https://tke-workshop.github.io](https://tke-workshop.github.io)

[English](README.md)

## 项目概览

TKE Workshop 当前是 Astro + Starlight 文档站点，围绕 Agent-First 体验组织内容：

- TKE 基础操作、生产实践、AI/ML、Data 等学习路径
- `src/content/docs` 中的结构化操作文档
- `cookbook/` 中的可执行 Python 脚本
- `/cookbooks/` 中统一的 Cookbook 详情页体验

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `http://127.0.0.1:4321`。

构建静态站点：

```bash
npm run build
```

## Cookbook 脚本

```bash
cd cookbook
pip install -r requirements.txt
cp config.example.yaml config.yaml
python3 cluster/create_cluster.py --cluster-name my-cluster --region ap-guangzhou --wait
```

## 项目结构

```text
tke-workshop.github.io/
├── astro.config.mjs          # Astro + Starlight 站点配置
├── src/
│   ├── content/docs/         # 文档内容
│   ├── data/cookbooks.js     # Cookbook 集合数据
│   ├── pages/                # 自定义页面，包括 /cookbooks/
│   ├── components/           # Workshop 共享 UI
│   └── styles/               # Workshop 样式
├── cookbook/                 # 可执行 Python Cookbook 脚本
├── public/                   # Astro 静态资源
├── test/                     # Node 校验测试
└── .github/workflows/        # GitHub Pages 发布流程
```

## 开发校验

```bash
node --test test/navigation.test.mjs test/cookbooks.test.mjs
npm run build
git diff --check
```

## 发布

推送到 `main` 后，`.github/workflows/deploy.yml` 会执行 `npm run build`，并将 `dist/` 发布到 GitHub Pages。

## License

Copyright © 2024-2026 Tencent Cloud TKE Team.
