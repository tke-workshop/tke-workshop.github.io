# CODEBUDDY.md This file provides guidance to CodeBuddy Code when working with code in this repository.

## Project Overview

This is a **MkDocs Material documentation site** for TKE (Tencent Kubernetes Engine) Workshop - a hands-on learning platform for cloud-native skills covering Kubernetes basics, networking, security, AI/ML, data workloads, and control plane management.

**Live Site**: https://tke-workshop.github.io  
**Tech Stack**: MkDocs + Material theme + Python 3.11+

---

## Common Development Commands

### Environment Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
# venv\Scripts\activate   # On Windows

# Install dependencies
pip install -r requirements.txt
```

### Local Development

```bash
# Start development server (with hot reload)
mkdocs serve
# Site available at http://127.0.0.1:8000

# Start on different port
mkdocs serve -a localhost:8080
```

### Building & Deployment

```bash
# Build static site (output to ./site directory)
mkdocs build

# Build with strict mode (fail on warnings)
mkdocs build --strict

# Deploy to GitHub Pages (manual, if needed)
mkdocs gh-deploy
```

**Note**: Automatic deployment via GitHub Actions is configured - push to `main` branch triggers build and deployment.

---

## Project Architecture

### Directory Structure

```
tke-workshop.github.io/
├── docs/                    # All documentation content (Markdown)
│   ├── index.md            # Custom homepage with inline CSS/HTML
│   ├── basics/             # Module: Getting started
│   ├── ai-ml/              # Module: AI/ML workloads
│   ├── data/               # Module: Data & storage
│   ├── control-plane/      # Module: Cluster management
│   ├── security/           # Module: Security practices
│   ├── observability/      # Module: Monitoring/logging/tracing
│   ├── stylesheets/        # Custom CSS
│   └── javascripts/        # Custom JS
├── overrides/              # Theme customization directory
├── mkdocs.yml              # MkDocs configuration (navigation, theme, plugins)
├── requirements.txt        # Python dependencies
└── .github/workflows/      # CI/CD automation
```

### Key Configuration Files

#### `mkdocs.yml`
- **Navigation structure** (`nav`): Defines sidebar menu hierarchy
- **Theme settings**: Material theme with indigo primary color, dark/light mode toggle
- **Plugins**: 
  - `search`: Chinese language search
  - `git-revision-date-localized`: Shows last updated dates
  - `git-committers`: Contributors plugin (CI-only)
  - `minify`: Minifies HTML output
- **Markdown extensions**: Admonitions, code highlighting, Mermaid diagrams, tabs, task lists

#### `docs/index.md`
- Custom homepage with **inline styles** (not in separate CSS)
- Full-width hero section with gradients
- Module grid with hover effects
- Uses HTML + CSS within Markdown

### Module Structure Pattern

Each module follows this structure:
```
module-name/
├── index.md          # Module landing page
├── topic1.md         # Individual lab/guide
├── topic2.md
└── topic3.md
```

Navigation is manually defined in `mkdocs.yml` under the `nav` section.

---

## Content Guidelines

### Editing Content

1. **Most changes**: Edit Markdown files in `docs/` directory
2. **Navigation changes**: Update `nav` section in `mkdocs.yml`
3. **Theme customization**: Modify `overrides/` or inline styles in `docs/index.md`

### Adding New Module

1. Create directory in `docs/` (e.g., `docs/new-module/`)
2. Add `index.md` and content files
3. Update `nav` section in `mkdocs.yml`:
   ```yaml
   nav:
     - New Module:
       - new-module/index.md
       - Topic 1: new-module/topic1.md
   ```

### Markdown Features Available

```markdown
# Admonitions (callout boxes)
!!! note "注意"
    This is a note

!!! tip "提示"
    This is a tip

!!! warning "警告"
    This is a warning

# Code blocks with syntax highlighting
```bash
mkdocs serve
```

# Tabbed content
=== "Tab 1"
    Content for tab 1

=== "Tab 2"
    Content for tab 2

# Task lists
- [x] Completed task
- [ ] Pending task
```

---

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

**Triggers**:
- Push to `main` → Build + Deploy to GitHub Pages
- Pull Request → Build only (with PR comment confirmation)

**Build Steps**:
1. Checkout with full history (`fetch-depth: 0` for git plugins)
2. Setup Python 3.11 with pip cache
3. Install dependencies from `requirements.txt`
4. Run `mkdocs build` with `CI=true` environment variable
5. Upload artifact for deployment

**Deployment**:
- Only runs on `main` branch pushes
- Uses `actions/deploy-pages@v4`
- Deployed to GitHub Pages environment

---

## Development Workflow

### Standard Workflow (from CONTRIBUTING.md)

```bash
# 1. Create feature branch
git checkout -b docs/module-name-feature

# 2. Make changes and preview locally
mkdocs serve

# 3. Commit with conventional commit format
git commit -m "docs(module): description"
# Types: docs, fix, feat, style, chore

# 4. Push and create PR
git push origin docs/module-name-feature
```

### PR Checklist
- [ ] Local preview works (`mkdocs serve`)
- [ ] No spelling errors
- [ ] Links are valid
- [ ] Images compressed (< 200KB recommended)
- [ ] Follows existing style

---

## Key Dependencies

From `requirements.txt`:
- **mkdocs**: 1.6.1 - Static site generator
- **mkdocs-material**: 9.7.1 - Material theme
- **pymdown-extensions**: 10.20 - Extended Markdown features
- **mkdocs-git-revision-date-localized-plugin**: Shows last modified dates
- **mkdocs-git-committers-plugin-2**: Shows contributors
- **mkdocs-minify-plugin**: Minifies HTML/CSS/JS

---

## Special Notes

### Chinese Content Support
- Site language set to `zh` in theme config
- Search plugin configured for Chinese (`lang: zh`)
- Content is primarily in Chinese

### Custom Styling
- Homepage uses **inline CSS** in `docs/index.md` (lines 8-354)
- Additional styles: `docs/stylesheets/extra.css`
- Custom JS: `docs/javascripts/extra.js`

### Git Plugins
- Git-based plugins (`git-revision-date`, `git-committers`) require full git history
- `git-committers` only enabled in CI (`enabled: !ENV [CI, false]`)
- Requires `GITHUB_TOKEN` in CI for API access

### Image Assets
- Store in appropriate module directory or shared `docs/assets/` (if created)
- Optimize images before committing (< 200KB recommended)

---

## Troubleshooting

### Build Fails
```bash
# Check for Markdown syntax errors
mkdocs build --strict

# Verify dependencies
pip list | grep mkdocs

# Clear cache and rebuild
rm -rf site/
mkdocs build
```

### Preview Not Updating
- MkDocs has hot reload - check terminal for errors
- Try restarting: `Ctrl+C`, then `mkdocs serve` again
- Clear browser cache

### Navigation Not Showing
- Verify file paths in `mkdocs.yml` `nav` section match actual file locations
- Paths are relative to `docs/` directory

---

## Reference Links

- **MkDocs Documentation**: https://www.mkdocs.org
- **Material for MkDocs**: https://squidfunk.github.io/mkdocs-material
- **PyMdown Extensions**: https://facelessuser.github.io/pymdown-extensions
- **Project Repository**: https://github.com/tke-workshop/tke-workshop.github.io
