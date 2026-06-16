# TKE Workshop

[![Deploy](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/tke-workshop/tke-workshop.github.io/actions/workflows/deploy.yml)

Hands-on labs and executable practices for Tencent Kubernetes Engine (TKE).

Website: [https://tke-workshop.github.io](https://tke-workshop.github.io)

[中文文档](README_zh.md)

## Overview

TKE Workshop is an Astro + Starlight documentation site with an Agent-First structure:

- learning paths for TKE basics, production practices, AI/ML, and data workloads
- structured operation docs in `src/content/docs`
- executable Python scripts in `cookbook/`
- a unified Cookbook experience in `/cookbooks/`

## Quick Start

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4321`.

Build the static site:

```bash
npm run build
```

## Cookbook Scripts

```bash
cd cookbook
pip install -r requirements.txt
cp config.example.yaml config.yaml
python3 cluster/create_cluster.py --cluster-name my-cluster --region ap-guangzhou --wait
```

## Project Structure

```text
tke-workshop.github.io/
├── astro.config.mjs          # Astro + Starlight site configuration
├── src/
│   ├── content/docs/         # Documentation content
│   ├── data/cookbooks.js     # Cookbook collection data
│   ├── pages/                # Custom pages, including /cookbooks/
│   ├── components/           # Shared workshop UI
│   └── styles/               # Workshop CSS
├── cookbook/                 # Executable Python cookbook scripts
├── public/                   # Static assets copied by Astro
├── test/                     # Node-based validation tests
└── .github/workflows/        # GitHub Pages deployment
```

## Development Checks

```bash
node --test test/navigation.test.mjs test/cookbooks.test.mjs
npm run build
git diff --check
```

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`, build with `npm run build`, and deploy `dist/` to GitHub Pages.

## License

Copyright © 2024-2026 Tencent Cloud TKE Team.
