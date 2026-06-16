# CODEBUDDY.md - Agent Development Guide

This repository is an Astro + Starlight documentation site for TKE Workshop, plus executable Python cookbook scripts.

## Project Overview

- **Site**: https://tke-workshop.github.io
- **Documentation framework**: Astro 6 + Starlight
- **Documentation source**: `src/content/docs`
- **Custom pages**: `src/pages`
- **Cookbook data**: `src/data/cookbooks.js`
- **Cookbook scripts**: `cookbook/`
- **Language**: Simplified Chinese docs with English technical terms

## Common Commands

```bash
npm install
npm run dev
npm run build
node --test test/navigation.test.mjs test/cookbooks.test.mjs
git diff --check
```

Local preview defaults to `http://127.0.0.1:4321`.

## Cookbook Scripts

```bash
cd cookbook
pip install -r requirements.txt
cp config.example.yaml config.yaml
python3 cluster/create_cluster.py --cluster-name my-cluster --region ap-guangzhou --wait
python3 workload/deploy_nginx.py --replicas 3 --expose --service-type LoadBalancer
```

Never commit `cookbook/config.yaml` or real cloud credentials.

## Content Guidelines

- Add or edit documentation under `src/content/docs`.
- Use frontmatter titles for Starlight pages.
- Keep Chinese headings and prose clear and task-oriented.
- Use executable code blocks with language specifiers.
- Prefer links to `/cookbooks/` and specific cookbook pages instead of legacy static pages.
- When adding a cookbook, update `src/data/cookbooks.js` and `test/cookbooks.test.mjs`.

## Project Structure

```text
tke-workshop.github.io/
├── astro.config.mjs
├── src/
│   ├── components/
│   ├── content/docs/
│   ├── data/cookbooks.js
│   ├── layouts/
│   ├── pages/
│   └── styles/
├── cookbook/
├── public/
├── test/
└── .github/workflows/deploy.yml
```

## CI/CD

`.github/workflows/deploy.yml` builds the site with Node 22 and `npm run build`, uploads `dist/`, and deploys to GitHub Pages on pushes to `main`.

## Review Checklist

- `node --test test/navigation.test.mjs test/cookbooks.test.mjs`
- `npm run build`
- `git diff --check`
- Check links for any legacy static Cookbook references.
