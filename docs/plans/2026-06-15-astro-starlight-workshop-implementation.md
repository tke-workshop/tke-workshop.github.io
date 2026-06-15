# Astro Starlight Workshop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current MkDocs-led main experience with an Astro + Starlight static workshop site and a unified cookbook experience.

**Architecture:** Astro owns the site build, custom Astro pages provide the product-like homepage and cookbook routes, and Starlight provides documentation section pages. Existing Markdown and Python cookbook assets remain in the repository while curated first-wave pages are introduced under `src/content/docs`.

**Tech Stack:** Astro, Starlight, TypeScript, Markdown/MDX, GitHub Pages static deployment.

---

### Task 1: Add Astro/Starlight Project Skeleton

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/content/config.ts`
- Create: `src/styles/workshop.css`

**Steps:**
1. Add npm scripts for `dev`, `build`, and `preview`.
2. Configure Starlight with site metadata, social links, custom CSS, and sidebar groups.
3. Add a content collection config compatible with Starlight.
4. Run `npm install` and then `npm run build`.

### Task 2: Build the New Homepage

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/layouts/MarketingLayout.astro`

**Steps:**
1. Create a custom layout with a persistent top nav and restrained product styling.
2. Build a first-viewport workshop dashboard with four learning paths.
3. Add section bands for Operate, Practice, AI on TKE, and Cookbooks.
4. Verify text fits on desktop and mobile widths.

### Task 3: Add Curated Starlight Section Pages

**Files:**
- Create: `src/content/docs/start/index.md`
- Create: `src/content/docs/start/environment.md`
- Create: `src/content/docs/operate/index.md`
- Create: `src/content/docs/practice/index.md`
- Create: `src/content/docs/ai-on-tke/index.md`
- Create: `src/content/docs/contribute/index.md`

**Steps:**
1. Write concise section pages that route users into existing workshop assets.
2. Use Starlight-compatible Markdown only.
3. Keep the tone Chinese-first with English technical terms.
4. Run `npm run build`.

### Task 4: Rebuild Cookbook as Native Astro Routes

**Files:**
- Create: `src/data/cookbooks.ts`
- Create: `src/pages/cookbooks/index.astro`
- Create: `src/pages/cookbooks/[id].astro`

**Steps:**
1. Move official cookbook metadata into typed data.
2. Render recipe cards with category, language, tags, verified status, and estimated time.
3. Render detail pages with prerequisites, commands, verification, source files, and Agent prompt.
4. Run `npm run build`.

### Task 5: Switch CI/CD to Astro

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Steps:**
1. Replace Python/MkDocs setup with Node setup.
2. Run `npm ci`.
3. Run `npm run build`.
4. Upload `dist` as the Pages artifact.

### Task 6: Final Verification

**Commands:**
- `npm run build`
- `git diff --check`

**Expected:**
- Astro build exits with code 0.
- No whitespace errors.
