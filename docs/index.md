---
title: 首页
hide:
  - navigation
  - toc
---

<style>
/* ===== 首页专用样式（内联确保生效） ===== */

/* 重置 MkDocs 默认容器边距 */
.md-main__inner { padding-top: 0 !important; }
.md-content__inner { margin: 0 !important; padding: 0 !important; max-width: none !important; }

/* 隐藏首页默认的白色内容区域背景 */
.md-content { background: transparent !important; }
.md-main { background: transparent !important; }
.md-container { background: #f8fafc !important; }
article.md-content__inner::before { display: none !important; }

/* 暗色模式整体背景 */
[data-md-color-scheme="slate"] .md-container { background: #1e293b !important; }

/* 隐藏首页的标题和编辑按钮 */
.md-content__inner > h1:first-child { display: none !important; }
.md-content__button { display: none !important; }
.md-source-file { display: none !important; }

/* Hero 全屏区块 */
.tx-hero {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  background: linear-gradient(135deg, #1a1f36 0%, #0f172a 50%, #1e293b 100%);
  color: #fff;
  padding: 5rem 2rem 4rem;
  position: relative;
  overflow: hidden;
}

.tx-hero::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(ellipse 80% 50% at 20% 40%, rgba(56, 189, 248, 0.15), transparent),
              radial-gradient(ellipse 60% 50% at 80% 60%, rgba(99, 102, 241, 0.1), transparent);
  pointer-events: none;
}

.tx-hero__inner {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
  position: relative;
  z-index: 1;
}

@media (max-width: 900px) {
  .tx-hero__inner { grid-template-columns: 1fr; text-align: center; }
  .tx-hero__art { display: none; }
}

.tx-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.7);
  margin-bottom: 0.75rem;
}

.tx-hero__eyebrow span:first-child {
  width: 8px; height: 8px;
  background: #22d3ee;
  border-radius: 50%;
}

.tx-hero h1 {
  font-size: clamp(2.5rem, 5vw, 3.5rem) !important;
  font-weight: 700 !important;
  line-height: 1.1 !important;
  margin: 0 0 1rem 0 !important;
  color: #fff !important;
}

.tx-hero__subtitle {
  font-size: 1.15rem;
  line-height: 1.7;
  color: rgba(255,255,255,0.85);
  margin-bottom: 2rem;
}

.tx-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 900px) {
  .tx-hero__actions { justify-content: center; }
}

.tx-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.9rem 1.5rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none !important;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tx-btn--primary {
  background: #fff;
  color: #0f172a !important;
  box-shadow: 0 4px 14px rgba(0,0,0,0.25);
}

.tx-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.3);
}

.tx-btn--ghost {
  background: rgba(255,255,255,0.1);
  color: #fff !important;
  border: 1px solid rgba(255,255,255,0.2);
}

.tx-btn--ghost:hover {
  background: rgba(255,255,255,0.15);
  transform: translateY(-2px);
}

.tx-hero__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

@media (max-width: 900px) {
  .tx-hero__badges { justify-content: center; }
}

.tx-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 9999px;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.8);
}

.tx-hero__art svg {
  width: 100%;
  max-width: 420px;
  height: auto;
}

/* 价值主张区块 - 白色卡片区 */
.tx-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 5rem 2rem;
  position: relative;
  background: transparent;
}

/* 移除分界线，用背景色区分 */

.tx-section__title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  color: var(--md-default-fg-color);
}

.tx-section__desc {
  color: var(--md-default-fg-color--light);
  margin: 0 0 2.5rem 0;
  line-height: 1.7;
  font-size: 1.1rem;
}

.tx-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

@media (max-width: 900px) {
  .tx-grid { grid-template-columns: 1fr; }
}

.tx-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 2rem;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.tx-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  border-color: #22d3ee;
}

[data-md-color-scheme="slate"] .tx-card {
  background: #334155;
  border-color: #475569;
}

.tx-card__icon {
  width: 40px;
  height: 40px;
  margin-bottom: 1rem;
  color: #22d3ee;
}

.tx-card__icon svg {
  width: 100%;
  height: 100%;
}

.tx-card__title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.tx-card__desc {
  margin: 0;
  color: var(--md-default-fg-color--light);
  line-height: 1.6;
  font-size: 0.95rem;
}

/* 模块入口全宽区块 - 与整体背景一致 */
.tx-modules-band {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  background: transparent;
  padding: 0 2rem 5rem;
  position: relative;
}

/* 暗色模式 */
[data-md-color-scheme="slate"] .tx-modules-band {
  background: transparent;
}

.tx-modules-band__inner {
  max-width: 1100px;
  margin: 0 auto;
}

.tx-modules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

@media (max-width: 1000px) {
  .tx-modules-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .tx-modules-grid { grid-template-columns: 1fr; }
}

.tx-module {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.75rem;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.tx-module:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.12);
  border-color: #22d3ee;
}

[data-md-color-scheme="slate"] .tx-module {
  background: #334155;
  border-color: #475569;
}

.tx-module__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.tx-module__title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.tx-module__icon {
  width: 36px;
  height: 36px;
  color: var(--md-default-fg-color--light);
}

.tx-module__icon svg {
  width: 100%;
  height: 100%;
  stroke: currentColor;
  stroke-width: 1.5;
  fill: none;
}

.tx-module__desc {
  margin: 0 0 1rem 0;
  color: var(--md-default-fg-color--light);
  font-size: 0.9rem;
  line-height: 1.5;
}

.tx-module__link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: rgba(56, 189, 248, 0.1);
  color: #0891b2 !important;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none !important;
  transition: background 0.2s;
}

[data-md-color-scheme="slate"] .tx-module__link {
  color: #22d3ee !important;
}

.tx-module__link:hover {
  background: rgba(56, 189, 248, 0.18);
}
</style>

<!-- ===== Hero 区块 ===== -->
<div class="tx-hero">
  <div class="tx-hero__inner">
    <div class="tx-hero__content">
      <p class="tx-hero__eyebrow">
        <span></span>
        Tencent Cloud · Agent-Ready Infrastructure
      </p>
      <h1>TKE Workshop</h1>
      <p class="tx-hero__subtitle">
        面向 AI 时代的云原生基础设施实践平台<br>
        <strong>Agent-First</strong> 设计：标准化文档 · 声明式 API · Few-shot Cookbook · 可复现演习场景
      </p>
      <div class="tx-hero__actions">
        <a class="tx-btn tx-btn--primary" href="basics/">开始实践 →</a>
        <a class="tx-btn tx-btn--ghost" href="https://github.com/tke-workshop/tke-workshop.github.io" target="_blank">查看 GitHub ↗</a>
      </div>
      <div class="tx-hero__badges">
        <span class="tx-badge">🤖 Agent 可读</span>
        <span class="tx-badge">📋 IaC 驱动</span>
        <span class="tx-badge">🔄 可复现场景</span>
        <span class="tx-badge">📚 Cookbook 库</span>
      </div>
    </div>
    <div class="tx-hero__art">
      <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="line-grad" x1="0" y1="0" x2="400" y2="300">
            <stop offset="0%" stop-color="#22d3ee"/>
            <stop offset="100%" stop-color="#818cf8"/>
          </linearGradient>
        </defs>
        <!-- Agent 节点 -->
        <g stroke="url(#line-grad)" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.9">
          <circle cx="200" cy="50" r="25" stroke="#22d3ee" stroke-width="3"/>
          <text x="200" y="57" text-anchor="middle" fill="#22d3ee" font-size="18" font-weight="bold">AI</text>
          <!-- 连接线到各个模块 -->
          <path d="M200 75 L100 130" stroke="#22d3ee" stroke-width="2"/>
          <path d="M200 75 L200 130" stroke="#22d3ee" stroke-width="2"/>
          <path d="M200 75 L300 130" stroke="#22d3ee" stroke-width="2"/>
        </g>
        <!-- 模块节点 -->
        <g fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="2">
          <rect x="50" y="140" rx="8" width="100" height="60"/>
          <rect x="170" y="140" rx="8" width="60" height="60"/>
          <rect x="250" y="140" rx="8" width="100" height="60"/>
          <rect x="110" y="220" rx="8" width="180" height="60"/>
        </g>
        <!-- 标签文字 -->
        <g fill="rgba(255,255,255,0.7)" font-size="12" text-anchor="middle">
          <text x="100" y="165">API/CLI</text>
          <text x="100" y="182">Calls</text>
          <text x="200" y="165">IaC</text>
          <text x="200" y="182">Config</text>
          <text x="300" y="165">Cookbook</text>
          <text x="300" y="182">Examples</text>
          <text x="200" y="245">Reproducible</text>
          <text x="200" y="262">Scenarios</text>
        </g>
      </svg>
    </div>
  </div>
</div>

<!-- ===== 价值主张 ===== -->
<div class="tx-section">
  <h2 class="tx-section__title">Agent-First 转型：从"面向人"到"面向 Agent"</h2>
  <p class="tx-section__desc">在 AI 时代，云原生基础设施必须让 AI Agent 能够理解、调用和自主执行。TKE Workshop 是腾讯云容器服务向 Agent-Ready 转型的实践载体。</p>
  <div class="tx-grid">
    <div class="tx-card">
      <div class="tx-card__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <p class="tx-card__title">文档可读性改造</p>
      <p class="tx-card__desc">
        <strong>去截图依赖</strong>：纯文本 + 代码块 + 结构化数据<br>
        <strong>格式标准化</strong>：统一的 Markdown 结构、API 参数表、返回值说明<br>
        <strong>多维调用范例</strong>：API/CLI/IaC 三位一体的调用示例
      </p>
    </div>
    <div class="tx-card">
      <div class="tx-card__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          <path d="M9 14l2 2 4-4"/>
        </svg>
      </div>
      <p class="tx-card__title">Cookbook 库建设</p>
      <p class="tx-card__desc">
        <strong>典型场景覆盖</strong>：集群升级、节点扩缩容、应用部署、故障恢复<br>
        <strong>Few-shot 示例</strong>：完整的输入-执行-输出链路<br>
        <strong>IaC 驱动</strong>：Terraform/Pulumi 声明式配置，可直接复现
      </p>
    </div>
    <div class="tx-card">
      <div class="tx-card__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      </div>
      <p class="tx-card__title">API/CLI 可靠执行</p>
      <p class="tx-card__desc">
        <strong>报错信息增强</strong>：结构化错误码 + 明确的修复建议<br>
        <strong>幂等性保证</strong>：重试安全、状态可查<br>
        <strong>验证流程</strong>：每个操作都有明确的成功/失败判断标准
      </p>
    </div>
  </div>
</div>

<!-- ===== Agent Ready 特性 ===== -->
<div class="tx-section" style="background: rgba(56, 189, 248, 0.03); border-radius: 16px; padding: 3rem 2rem;">
  <h2 class="tx-section__title">🤖 Agent-Ready 核心特性</h2>
  <div style="max-width: 900px; margin: 0 auto;">
    
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; margin-bottom: 2rem; align-items: start;">
      <div style="background: rgba(34, 211, 238, 0.1); padding: 0.75rem; border-radius: 8px; font-weight: 700; color: #0891b2;">01</div>
      <div>
        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.15rem; font-weight: 600;">零截图文档</h3>
        <p style="margin: 0; color: var(--md-default-fg-color--light); line-height: 1.7;">
          所有操作步骤均使用纯文本、代码块和 YAML/JSON 配置描述，AI Agent 可直接解析和执行，无需 OCR 或图像识别。
        </p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; margin-bottom: 2rem; align-items: start;">
      <div style="background: rgba(34, 211, 238, 0.1); padding: 0.75rem; border-radius: 8px; font-weight: 700; color: #0891b2;">02</div>
      <div>
        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.15rem; font-weight: 600;">结构化 API 文档</h3>
        <p style="margin: 0; color: var(--md-default-fg-color--light); line-height: 1.7;">
          每个 API 调用都包含：请求参数表 + 完整 cURL 示例 + 响应结构 + 错误码说明，Agent 可直接生成调用代码。
        </p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; margin-bottom: 2rem; align-items: start;">
      <div style="background: rgba(34, 211, 238, 0.1); padding: 0.75rem; border-radius: 8px; font-weight: 700; color: #0891b2;">03</div>
      <div>
        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.15rem; font-weight: 600;">声明式优先</h3>
        <p style="margin: 0; color: var(--md-default-fg-color--light); line-height: 1.7;">
          提供 Kubernetes YAML、Terraform HCL、Pulumi 代码等声明式配置，Agent 可理解意图并生成可复现的基础设施代码。
        </p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; margin-bottom: 0;">
      <div style="background: rgba(34, 211, 238, 0.1); padding: 0.75rem; border-radius: 8px; font-weight: 700; color: #0891b2;">04</div>
      <div>
        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.15rem; font-weight: 600;">可复现演习场景</h3>
        <p style="margin: 0; color: var(--md-default-fg-color--light); line-height: 1.7;">
          每个场景都有明确的<strong>前置条件 → 执行步骤 → 验证标准 → 清理流程</strong>，Agent 可端到端自动执行。
        </p>
      </div>
    </div>

  </div>
</div>

<!-- ===== 模块入口 ===== -->
<div class="tx-modules-band">
  <div class="tx-modules-band__inner">
    <h2 class="tx-section__title">实践模块</h2>
    <p class="tx-section__desc">每个模块都包含完整的 API 文档、CLI 命令、声明式配置和验证脚本。</p>
    <div class="tx-modules-grid">
      
      <!-- 基础操作 -->
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">基础操作 Basics</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><path d="M4 6h16M6 12h12M8 18h8"/></svg></div>
        </div>
        <p class="tx-module__desc">集群 CRUD、节点管理、工作负载部署。完整的 API/CLI 调用链路。</p>
        <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--md-default-fg-color--light);">
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem;">✓ API 文档</span>
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem;">✓ tccli 示例</span>
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px;">✓ kubectl 配置</span>
        </div>
        <a class="tx-module__link" href="basics/">开始实践 →</a>
      </div>

      <!-- 网络 -->
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">网络 Networking</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M12 1v6m0 6v6M1 12h6m6 0h6"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></div>
        </div>
        <p class="tx-module__desc">Service、Ingress、Network Policy。声明式网络配置与故障排查。</p>
        <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--md-default-fg-color--light);">
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem;">✓ YAML 模板</span>
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px;">✓ 故障诊断</span>
        </div>
        <a class="tx-module__link" href="networking/">查看文档 →</a>
      </div>

      <!-- 可观测性 -->
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">可观测性 Observability</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/></svg></div>
        </div>
        <p class="tx-module__desc">Prometheus、Loki、Jaeger。结构化日志查询与 PromQL 示例。</p>
        <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--md-default-fg-color--light);">
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem;">✓ PromQL 查询</span>
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px;">✓ 告警规则</span>
        </div>
        <a class="tx-module__link" href="observability/">配置监控 →</a>
      </div>

      <!-- 安全 -->
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">安全 Security</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        </div>
        <p class="tx-module__desc">RBAC、Pod Security、镜像扫描。策略即代码的安全实践。</p>
        <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--md-default-fg-color--light);">
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem;">✓ Policy YAML</span>
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px;">✓ 合规检查</span>
        </div>
        <a class="tx-module__link" href="security/">加固集群 →</a>
      </div>

      <!-- AI/ML -->
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">AI/ML</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A1.5 1.5 0 0 0 6 14.5 1.5 1.5 0 0 0 7.5 16 1.5 1.5 0 0 0 9 14.5 1.5 1.5 0 0 0 7.5 13m9 0a1.5 1.5 0 0 0-1.5 1.5 1.5 1.5 0 0 0 1.5 1.5 1.5 1.5 0 0 0 1.5-1.5 1.5 1.5 0 0 0-1.5-1.5"/></svg></div>
        </div>
        <p class="tx-module__desc">GPU 调度、模型推理、分布式训练。AI 工作负载的声明式部署。</p>
        <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--md-default-fg-color--light);">
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem;">✓ GPU 配置</span>
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px;">✓ 推理服务</span>
        </div>
        <a class="tx-module__link" href="ai-ml/">部署 AI 负载 →</a>
      </div>

      <!-- Data -->
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">Data</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/><path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg></div>
        </div>
        <p class="tx-module__desc">持久化存储、StatefulSet、数据备份。有状态应用的编排模式。</p>
        <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--md-default-fg-color--light);">
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem;">✓ PV/PVC</span>
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px;">✓ 备份脚本</span>
        </div>
        <a class="tx-module__link" href="data/">管理数据 →</a>
      </div>

      <!-- 控制面 -->
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">控制面 Control Plane</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg></div>
        </div>
        <p class="tx-module__desc">集群升级、高可用架构。生产级集群的运维自动化。</p>
        <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--md-default-fg-color--light);">
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem;">✓ 升级流程</span>
          <span style="background: rgba(34, 211, 238, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px;">✓ 回滚方案</span>
        </div>
        <a class="tx-module__link" href="control-plane/">运维集群 →</a>
      </div>

      <!-- Cookbook 特殊卡片 -->
      <div class="tx-module" style="border: 2px solid #22d3ee; background: linear-gradient(135deg, rgba(34, 211, 238, 0.05), rgba(99, 102, 241, 0.05));">
        <div class="tx-module__header">
          <p class="tx-module__title">📚 Cookbook 库</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
        </div>
        <p class="tx-module__desc"><strong>Few-shot 场景库</strong>：集群升级、扩缩容、故障恢复等典型运维场景的端到端自动化脚本。</p>
        <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--md-default-fg-color--light);">
          <span style="background: rgba(34, 211, 238, 0.2); padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem;">🎯 可复现</span>
          <span style="background: rgba(34, 211, 238, 0.2); padding: 0.25rem 0.5rem; border-radius: 4px;">🔄 IaC 驱动</span>
        </div>
        <a class="tx-module__link" href="https://github.com/tke-workshop/cookbook" target="_blank" style="background: rgba(34, 211, 238, 0.15);">探索 Cookbook →</a>
      </div>

    </div>
  </div>
</div>

<!-- ===== 与传统文档的对比 ===== -->
<div class="tx-section">
  <h2 class="tx-section__title">与传统产品文档的区别</h2>
  <div style="max-width: 900px; margin: 2rem auto; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
      <thead>
        <tr style="background: rgba(56, 189, 248, 0.1);">
          <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #e2e8f0;">维度</th>
          <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #e2e8f0;">传统文档（面向人）</th>
          <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #e2e8f0; color: #0891b2;">TKE Workshop（Agent-First）</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0; font-weight: 600;">文档形式</td>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">大量截图 + 控制台操作步骤</td>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0; color: #0891b2;"><strong>纯文本 + 代码块 + 结构化数据</strong></td>
        </tr>
        <tr>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0; font-weight: 600;">调用方式</td>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">主要是控制台点击流程</td>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0; color: #0891b2;"><strong>API + CLI + IaC 多维度示例</strong></td>
        </tr>
        <tr>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0; font-weight: 600;">可复现性</td>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">依赖手动操作，难以自动化</td>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0; color: #0891b2;"><strong>声明式配置，一键复现</strong></td>
        </tr>
        <tr>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0; font-weight: 600;">错误处理</td>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">简单的错误提示</td>
          <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0; color: #0891b2;"><strong>结构化错误码 + 修复建议 + 验证脚本</strong></td>
        </tr>
        <tr>
          <td style="padding: 1rem; font-weight: 600;">Agent 友好度</td>
          <td style="padding: 1rem;">❌ 需要 OCR/图像理解</td>
          <td style="padding: 1rem; color: #0891b2;"><strong>✅ 可直接解析和执行</strong></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ===== 行动号召 ===== -->
<div class="tx-section" style="text-align: center; padding: 4rem 2rem;">
  <h2 style="font-size: 2rem; margin-bottom: 1rem;">开始你的 Agent-First 实践</h2>
  <p style="font-size: 1.1rem; color: var(--md-default-fg-color--light); max-width: 700px; margin: 0 auto 2rem;">
    无论你是开发者、运维工程师，还是 AI Agent 构建者，都可以从这里开始探索云原生基础设施的自动化之路。
  </p>
  <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
    <a href="basics/" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: #0891b2; color: #fff !important; border-radius: 8px; font-weight: 600; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 14px rgba(8, 145, 178, 0.3);">
      开始实践 →
    </a>
    <a href="https://github.com/tke-workshop/tke-workshop.github.io" target="_blank" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; background: transparent; color: var(--md-default-fg-color) !important; border: 2px solid var(--md-default-fg-color--lighter); border-radius: 8px; font-weight: 600; text-decoration: none; transition: all 0.2s;">
      <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
      贡献代码
    </a>
  </div>
</div>
