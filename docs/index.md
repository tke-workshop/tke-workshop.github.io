---
title: TKE Workshop
hide:
  - navigation
  - toc
---

<style>
/* Hero Section */
.tx-hero {
  background: linear-gradient(135deg, #3949ab 0%, #1a237e 50%, #0d47a1 100%);
  padding: 4rem 2rem;
  margin: -1rem -1rem 2rem -1rem;
  color: white;
  text-align: center;
}

.tx-hero h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: white !important;
}

.tx-hero .tx-hero__subtitle {
  font-size: 1.4rem;
  opacity: 0.9;
  margin-bottom: 2rem;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.tx-hero__button {
  display: inline-block;
  padding: 1rem 2.5rem;
  background: white;
  color: #3949ab !important;
  font-weight: 600;
  font-size: 1.1rem;
  border-radius: 50px;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tx-hero__button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  color: #1a237e !important;
}

/* Feature Cards */
.tx-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin: 3rem 0;
}

.tx-feature-card {
  background: var(--md-default-bg-color);
  border: 1px solid var(--md-default-fg-color--lightest);
  border-radius: 12px;
  padding: 2rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tx-feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.tx-feature-card__icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #3949ab, #5c6bc0);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.2rem;
  font-size: 1.5rem;
}

.tx-feature-card__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--md-default-fg-color);
}

.tx-feature-card__desc {
  color: var(--md-default-fg-color--light);
  margin-bottom: 1.2rem;
  line-height: 1.6;
}

.tx-feature-card__link {
  display: inline-block;
  padding: 0.6rem 1.2rem;
  background: #3949ab;
  color: white !important;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s;
}

.tx-feature-card__link:hover {
  background: #1a237e;
}

/* Value Props */
.tx-values {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin: 3rem 0;
  text-align: center;
}

@media (max-width: 768px) {
  .tx-values {
    grid-template-columns: 1fr;
  }
}

.tx-value-item {
  padding: 1.5rem;
}

.tx-value-item__icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.tx-value-item__title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.tx-value-item__desc {
  color: var(--md-default-fg-color--light);
  font-size: 0.95rem;
}

/* Section Title */
.tx-section-title {
  text-align: center;
  margin: 3rem 0 2rem 0;
}

.tx-section-title h2 {
  font-size: 2rem;
  font-weight: 600;
}
</style>

<!-- Hero Section -->
<div class="tx-hero">
  <h1>TKE Workshop</h1>
  <p class="tx-hero__subtitle">
    腾讯云容器服务 TKE 官方最佳实践指南<br>
    通过动手实验，快速掌握云原生核心技能
  </p>
  <a href="basics/" class="tx-hero__button">开始学习</a>
</div>

<!-- Value Props -->
<div class="tx-values">
  <div class="tx-value-item">
    <div class="tx-value-item__icon">🚀</div>
    <div class="tx-value-item__title">快速上手</div>
    <div class="tx-value-item__desc">从零开始，2 小时掌握 TKE 核心操作</div>
  </div>
  <div class="tx-value-item">
    <div class="tx-value-item__icon">📚</div>
    <div class="tx-value-item__title">自主学习</div>
    <div class="tx-value-item__desc">按需选择模块，自定义学习路径</div>
  </div>
  <div class="tx-value-item">
    <div class="tx-value-item__icon">🔧</div>
    <div class="tx-value-item__title">实战导向</div>
    <div class="tx-value-item__desc">每个章节都有可运行的实践案例</div>
  </div>
</div>

<!-- Section: 探索模块 -->
<div class="tx-section-title">
  <h2>探索学习模块</h2>
</div>

<div class="tx-features">
  <div class="tx-feature-card">
    <div class="tx-feature-card__icon">⚡</div>
    <div class="tx-feature-card__title">基础操作</div>
    <div class="tx-feature-card__desc">
      集群创建、kubectl 基础、应用部署，快速入门容器化世界
    </div>
    <a href="basics/" class="tx-feature-card__link">开始学习</a>
  </div>

  <div class="tx-feature-card">
    <div class="tx-feature-card__icon">🤖</div>
    <div class="tx-feature-card__title">AI/ML</div>
    <div class="tx-feature-card__desc">
      GPU 调度、模型推理、分布式训练，释放 AI 算力潜能
    </div>
    <a href="ai-ml/" class="tx-feature-card__link">立即体验</a>
  </div>

  <div class="tx-feature-card">
    <div class="tx-feature-card__icon">💾</div>
    <div class="tx-feature-card__title">Data</div>
    <div class="tx-feature-card__desc">
      存储配置、数据处理，构建云原生数据平台
    </div>
    <a href="data/" class="tx-feature-card__link">深入了解</a>
  </div>

  <div class="tx-feature-card">
    <div class="tx-feature-card__icon">🎛️</div>
    <div class="tx-feature-card__title">控制面</div>
    <div class="tx-feature-card__desc">
      集群升级、高可用配置，保障业务稳定运行
    </div>
    <a href="control-plane/" class="tx-feature-card__link">探索更多</a>
  </div>

  <div class="tx-feature-card">
    <div class="tx-feature-card__icon">🌐</div>
    <div class="tx-feature-card__title">网络</div>
    <div class="tx-feature-card__desc">
      Service、Ingress、网络策略、VPC-CNI 最佳实践
    </div>
    <a href="networking/" class="tx-feature-card__link">深入了解</a>
  </div>

  <div class="tx-feature-card">
    <div class="tx-feature-card__icon">🔒</div>
    <div class="tx-feature-card__title">安全</div>
    <div class="tx-feature-card__desc">
      RBAC、Pod 安全策略、镜像安全扫描
    </div>
    <a href="security/" class="tx-feature-card__link">查看详情</a>
  </div>

  <div class="tx-feature-card">
    <div class="tx-feature-card__icon">📊</div>
    <div class="tx-feature-card__title">可观测性</div>
    <div class="tx-feature-card__desc">
      监控告警、日志采集、链路追踪一站式方案
    </div>
    <a href="observability/" class="tx-feature-card__link">探索更多</a>
  </div>
</div>
