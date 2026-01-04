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

/* 价值主张区块 */
.tx-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 4rem 2rem;
}

.tx-section__title {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.tx-section__desc {
  color: var(--md-default-fg-color--light);
  margin: 0 0 2rem 0;
  line-height: 1.6;
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
  background: var(--md-default-bg-color);
  border: 1px solid var(--md-default-fg-color--lightest);
  border-radius: 12px;
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tx-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.08);
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

/* 模块入口全宽区块 */
.tx-modules-band {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%);
  padding: 4rem 2rem;
}

[data-md-color-scheme="slate"] .tx-modules-band {
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, rgba(99, 102, 241, 0.06) 100%);
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
  background: var(--md-default-bg-color);
  border: 1px solid var(--md-default-fg-color--lightest);
  border-radius: 12px;
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tx-module:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.08);
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
        Tencent Cloud · TKE
      </p>
      <h1>TKE Workshop</h1>
      <p class="tx-hero__subtitle">
        以最短路径掌握云原生核心技能：从集群到网络与安全，再到 AI/ML 与数据工作负载。<br>
        更少概念堆叠，更清晰的实验步骤。
      </p>
      <div class="tx-hero__actions">
        <a class="tx-btn tx-btn--primary" href="basics/">开始学习 →</a>
        <a class="tx-btn tx-btn--ghost" href="https://github.com/tke-workshop/tke-workshop.github.io" target="_blank">查看 GitHub ↗</a>
      </div>
      <div class="tx-hero__badges">
        <span class="tx-badge">7 个模块</span>
        <span class="tx-badge">动手实验导向</span>
        <span class="tx-badge">持续更新</span>
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
        <g stroke="url(#line-grad)" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8">
          <path d="M40 200 Q120 120 200 150 T360 100"/>
          <path d="M40 240 Q140 180 220 200 T380 160"/>
          <path d="M60 100 Q140 60 200 90 T340 60"/>
          <circle cx="40" cy="200" r="6" fill="#22d3ee"/>
          <circle cx="40" cy="240" r="6" fill="#22d3ee"/>
          <circle cx="60" cy="100" r="6" fill="#22d3ee"/>
          <circle cx="360" cy="100" r="6" fill="#818cf8"/>
          <circle cx="380" cy="160" r="6" fill="#818cf8"/>
          <circle cx="340" cy="60" r="6" fill="#818cf8"/>
        </g>
        <g fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1">
          <rect x="100" y="110" rx="8" width="100" height="70"/>
          <rect x="220" y="80" rx="8" width="120" height="90"/>
          <rect x="140" y="190" rx="8" width="160" height="60"/>
        </g>
        <g stroke="rgba(255,255,255,0.4)" stroke-width="1.2" stroke-linecap="round">
          <path d="M115 135 h60"/>
          <path d="M115 150 h40"/>
          <path d="M235 110 h90"/>
          <path d="M235 130 h60"/>
          <path d="M155 215 h120"/>
          <path d="M155 232 h80"/>
        </g>
      </svg>
    </div>
  </div>
</div>

<!-- ===== 价值主张 ===== -->
<div class="tx-section">
  <h2 class="tx-section__title">为什么是这个 Workshop</h2>
  <p class="tx-section__desc">我们把复杂度藏起来：你只需要跟着做，就能把关键能力跑通。</p>
  <div class="tx-grid">
    <div class="tx-card">
      <div class="tx-card__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2L3 14h9l-1 8 11-12h-9l1-8z"/>
        </svg>
      </div>
      <p class="tx-card__title">更短路径</p>
      <p class="tx-card__desc">从"能跑起来"开始，逐步进入网络、安全、可观测性与 AI/ML。</p>
    </div>
    <div class="tx-card">
      <div class="tx-card__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M4 6h16M4 12h10M4 18h14"/>
        </svg>
      </div>
      <p class="tx-card__title">更少噪音</p>
      <p class="tx-card__desc">每个实验都有明确目标、步骤与验证点，避免"看完就忘"。</p>
    </div>
    <div class="tx-card">
      <div class="tx-card__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      </div>
      <p class="tx-card__title">更易扩展</p>
      <p class="tx-card__desc">模块化结构，方便扩展成团队的标准作业流程（SOP）。</p>
    </div>
  </div>
</div>

<!-- ===== 模块入口 ===== -->
<div class="tx-modules-band">
  <div class="tx-modules-band__inner">
    <h2 class="tx-section__title">从这里开始</h2>
    <p class="tx-section__desc">按你关注的主题进入对应模块（推荐从"基础操作"开始）。</p>
    <div class="tx-modules-grid">
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">基础操作</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><path d="M4 6h16M6 12h12M8 18h8"/></svg></div>
        </div>
        <p class="tx-module__desc">创建集群、kubectl、部署应用。把第一个工作负载跑起来。</p>
        <a class="tx-module__link" href="basics/">开始学习 →</a>
      </div>
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">AI/ML</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A1.5 1.5 0 0 0 6 14.5 1.5 1.5 0 0 0 7.5 16 1.5 1.5 0 0 0 9 14.5 1.5 1.5 0 0 0 7.5 13m9 0a1.5 1.5 0 0 0-1.5 1.5 1.5 1.5 0 0 0 1.5 1.5 1.5 1.5 0 0 0 1.5-1.5 1.5 1.5 0 0 0-1.5-1.5"/></svg></div>
        </div>
        <p class="tx-module__desc">GPU 调度、推理与训练。把算力跑出可复用的范式。</p>
        <a class="tx-module__link" href="ai-ml/">立即体验 →</a>
      </div>
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">Data</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/><path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg></div>
        </div>
        <p class="tx-module__desc">存储、数据处理与运行方式。让数据工作负载更可控。</p>
        <a class="tx-module__link" href="data/">深入了解 →</a>
      </div>
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">控制面</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg></div>
        </div>
        <p class="tx-module__desc">升级、高可用与运维要点。把集群管理做到可持续。</p>
        <a class="tx-module__link" href="control-plane/">探索更多 →</a>
      </div>
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">网络</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="none"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
        </div>
        <p class="tx-module__desc">Service、Ingress、网络策略与 VPC-CNI 实践。</p>
        <a class="tx-module__link" href="networking/">深入了解 →</a>
      </div>
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">安全</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        </div>
        <p class="tx-module__desc">RBAC、Pod 安全与镜像安全。建立"默认安全"。</p>
        <a class="tx-module__link" href="security/">查看详情 →</a>
      </div>
      <div class="tx-module">
        <div class="tx-module__header">
          <p class="tx-module__title">可观测性</p>
          <div class="tx-module__icon"><svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/></svg></div>
        </div>
        <p class="tx-module__desc">监控、日志、链路追踪。让排障与容量评估有据可依。</p>
        <a class="tx-module__link" href="observability/">探索更多 →</a>
      </div>
    </div>
  </div>
</div>
