---
title: 首页
hide:
  - navigation
  - toc
---

<div class="tx-home">

<section class="tx-fullbleed tx-hero">
  <div class="tx-container">
    <div class="tx-hero__inner">
      <div class="tx-hero__copy">
        <p class="tx-hero__eyebrow">
          <span style="width:10px;height:10px;border-radius:999px;background:rgba(34,211,238,.9);display:inline-block"></span>
          Tencent Cloud · TKE
        </p>
        <h1 class="tx-hero__title">TKE Workshop</h1>
        <p class="tx-hero__subtitle">
          以最短路径掌握云原生核心技能：从集群到网络与安全，再到 AI/ML 与数据工作负载。<br>
          更少概念堆叠，更清晰的实验步骤。
        </p>
        <div class="tx-hero__actions">
          <a class="tx-btn tx-btn--primary" href="basics/">
            <span>开始学习</span>
            <span aria-hidden="true">→</span>
          </a>
          <a class="tx-btn tx-btn--ghost" href="https://github.com/tke-workshop/tke-workshop.github.io">
            <span>查看 GitHub</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div class="tx-hero__meta" aria-label="Highlights">
          <span class="tx-badge">7 个模块</span>
          <span class="tx-badge">动手实验导向</span>
          <span class="tx-badge">持续更新</span>
        </div>
      </div>

      <div class="tx-hero__art" aria-hidden="true">
        <!-- 极简线条插画：参考 EKS 的线性风格，避免“花哨” -->
        <svg viewBox="0 0 720 520" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g" x1="92" y1="72" x2="648" y2="456" gradientUnits="userSpaceOnUse">
              <stop stop-color="#22D3EE" stop-opacity="0.95"/>
              <stop offset="1" stop-color="#60A5FA" stop-opacity="0.85"/>
            </linearGradient>
          </defs>
          <g opacity="0.92" stroke="url(#g)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M110 330C160 250 270 220 350 250C420 275 500 260 560 220"/>
            <path d="M140 380C210 290 320 275 385 310C470 355 560 330 610 290"/>
            <path d="M160 175C230 140 320 150 380 195C450 248 540 252 610 210"/>
            <circle cx="140" cy="380" r="8"/>
            <circle cx="110" cy="330" r="8"/>
            <circle cx="160" cy="175" r="8"/>
            <circle cx="610" cy="210" r="8"/>
            <circle cx="610" cy="290" r="8"/>
            <circle cx="560" cy="220" r="8"/>
            <circle cx="560" cy="330" r="8"/>
          </g>
          <g opacity="0.55" stroke="rgba(255,255,255,0.55)" stroke-width="1.4" stroke-linecap="round">
            <path d="M200 120h320"/>
            <path d="M240 90h240"/>
            <path d="M240 420h240"/>
          </g>
          <g opacity="0.9" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.14)">
            <rect x="150" y="210" width="150" height="110" rx="18"/>
            <rect x="330" y="165" width="240" height="155" rx="18"/>
            <rect x="210" y="340" width="320" height="95" rx="18"/>
          </g>
          <g opacity="0.92" stroke="rgba(255,255,255,0.55)" stroke-width="1.6" stroke-linecap="round">
            <path d="M182 245h86"/>
            <path d="M182 270h62"/>
            <path d="M362 200h176"/>
            <path d="M362 225h132"/>
            <path d="M246 376h250"/>
            <path d="M246 401h190"/>
          </g>
        </svg>
      </div>
    </div>
  </div>
</section>

<section class="tx-section">
  <div class="tx-container">
    <h2 class="tx-section__title">为什么是这个 Workshop</h2>
    <p class="tx-section__desc">像苹果的产品页一样，我们把复杂度藏起来：你只需要跟着做，就能把关键能力跑通。</p>

    <div class="tx-grid-3">
      <div class="tx-vcard">
        <div class="tx-vcard__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" stroke="#22D3EE" stroke-width="2" stroke-linejoin="round"/>
          </svg>
        </div>
        <p class="tx-vcard__title">更短路径</p>
        <p class="tx-vcard__desc">从“能跑起来”开始，逐步进入网络、安全、可观测性与 AI/ML 工作负载。</p>
      </div>

      <div class="tx-vcard">
        <div class="tx-vcard__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6h16M4 12h10M4 18h14" stroke="#22D3EE" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="tx-vcard__title">更少噪音</p>
        <p class="tx-vcard__desc">每个实验都有明确目标、步骤与验证点，避免概念堆叠与“看完就忘”。</p>
      </div>

      <div class="tx-vcard">
        <div class="tx-vcard__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3v18M3 12h18" stroke="#22D3EE" stroke-width="2" stroke-linecap="round"/>
            <path d="M7 7l10 10M17 7L7 17" stroke="#22D3EE" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
          </svg>
        </div>
        <p class="tx-vcard__title">更易扩展</p>
        <p class="tx-vcard__desc">模块化结构，方便你把内容继续扩展成团队的标准作业流程（SOP）。</p>
      </div>
    </div>
  </div>
</section>

<section class="tx-fullbleed tx-band">
  <div class="tx-container">
    <h2 class="tx-section__title">从这里开始</h2>
    <p class="tx-section__desc">按你关注的主题进入对应模块（推荐从“基础操作”开始）。</p>

    <div class="tx-modules">
      <div class="tx-mcard">
        <div class="tx-mcard__top">
          <div>
            <p class="tx-mcard__title">基础操作</p>
          </div>
          <div class="tx-mcard__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 7h16M6 12h12M8 17h8" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
        <p class="tx-mcard__desc">创建集群、kubectl、部署应用。把第一个工作负载跑起来。</p>
        <a class="tx-mcard__link" href="basics/">开始学习 <span aria-hidden="true">→</span></a>
      </div>

      <div class="tx-mcard">
        <div class="tx-mcard__top">
          <div>
            <p class="tx-mcard__title">AI/ML</p>
          </div>
          <div class="tx-mcard__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" stroke-width="2"/>
              <path d="M6 8h12v7a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8z" stroke-width="2"/>
              <path d="M9 12h.01M15 12h.01" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
        <p class="tx-mcard__desc">GPU 调度、推理与训练。把算力跑出“可复用”的范式。</p>
        <a class="tx-mcard__link" href="ai-ml/">立即体验 <span aria-hidden="true">→</span></a>
      </div>

      <div class="tx-mcard">
        <div class="tx-mcard__top">
          <div>
            <p class="tx-mcard__title">Data</p>
          </div>
          <div class="tx-mcard__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6c0 1.66 3.58 3 8 3s8-1.34 8-3-3.58-3-8-3-8 1.34-8 3z" stroke-width="2"/>
              <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" stroke-width="2"/>
              <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke-width="2"/>
            </svg>
          </div>
        </div>
        <p class="tx-mcard__desc">存储、数据处理与运行方式。让数据工作负载更可控。</p>
        <a class="tx-mcard__link" href="data/">深入了解 <span aria-hidden="true">→</span></a>
      </div>

      <div class="tx-mcard">
        <div class="tx-mcard__top">
          <div>
            <p class="tx-mcard__title">控制面</p>
          </div>
          <div class="tx-mcard__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v3" stroke-width="2" stroke-linecap="round"/>
              <path d="M12 18v3" stroke-width="2" stroke-linecap="round"/>
              <path d="M4.2 6.2l2.1 2.1" stroke-width="2" stroke-linecap="round"/>
              <path d="M17.7 15.7l2.1 2.1" stroke-width="2" stroke-linecap="round"/>
              <path d="M3 12h3" stroke-width="2" stroke-linecap="round"/>
              <path d="M18 12h3" stroke-width="2" stroke-linecap="round"/>
              <path d="M6.3 15.7l-2.1 2.1" stroke-width="2" stroke-linecap="round"/>
              <path d="M19.8 6.2l-2.1 2.1" stroke-width="2" stroke-linecap="round"/>
              <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke-width="2"/>
            </svg>
          </div>
        </div>
        <p class="tx-mcard__desc">升级、高可用与运维要点。把集群管理做到可持续。</p>
        <a class="tx-mcard__link" href="control-plane/">探索更多 <span aria-hidden="true">→</span></a>
      </div>

      <div class="tx-mcard">
        <div class="tx-mcard__top">
          <div>
            <p class="tx-mcard__title">网络</p>
          </div>
          <div class="tx-mcard__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 12a5 5 0 0 1 10 0" stroke-width="2" stroke-linecap="round"/>
              <path d="M5 12a7 7 0 0 1 14 0" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
              <path d="M9.5 12a2.5 2.5 0 0 1 5 0" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
              <path d="M12 12v6" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
        <p class="tx-mcard__desc">Service、Ingress、网络策略与 VPC-CNI 的关键实践。</p>
        <a class="tx-mcard__link" href="networking/">深入了解 <span aria-hidden="true">→</span></a>
      </div>

      <div class="tx-mcard">
        <div class="tx-mcard__top">
          <div>
            <p class="tx-mcard__title">安全</p>
          </div>
          <div class="tx-mcard__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4z" stroke-width="2"/>
              <path d="M9 12l2 2 4-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <p class="tx-mcard__desc">RBAC、Pod 安全与镜像安全。把“默认安全”建立起来。</p>
        <a class="tx-mcard__link" href="security/">查看详情 <span aria-hidden="true">→</span></a>
      </div>

      <div class="tx-mcard">
        <div class="tx-mcard__top">
          <div>
            <p class="tx-mcard__title">可观测性</p>
          </div>
          <div class="tx-mcard__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 14l3-3 3 3 4-6 6 8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M4 20h16" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
            </svg>
          </div>
        </div>
        <p class="tx-mcard__desc">监控、日志、链路追踪。让排障与容量评估“有据可依”。</p>
        <a class="tx-mcard__link" href="observability/">探索更多 <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </div>
</section>

</div>
