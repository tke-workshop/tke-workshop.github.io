# 🧬 TKE Workshop 自进化计划

> 本文档由 AI Agent 自动维护，记录 Workshop 的进化路线图和执行状态。
> 
> **上次更新**: 2026-04-02

---

## 📊 当前内容健康度

### 模块完成度扫描

| 模块 | 文件数 | 完成度 | 优先级 |
|------|--------|--------|--------|
| `basics/` | 19 | ✅ 约 80% | 中 - 补充工作负载/服务场景 |
| `best-practices/security/` | 9 | ✅ 约 70% | 中 |
| `best-practices/availability/` | 5 | ✅ 约 65% | 中 |
| `best-practices/scalability/` | 5 | ✅ 约 65% | 中 |
| `best-practices/upgrade/` | 5 | ✅ 约 60% | 中 |
| `best-practices/cost-optimization/` | 5 | ✅ 约 60% | 中 |
| `ai-ml/training/` | 7 | ✅ 约 75% | 高 - AI 方向核心 |
| `ai-ml/inference/` | 7 | ✅ 约 70% | 高 - AI 方向核心 |
| `ai-ml/ai-copilot/` | 5 | ✅ 约 60% | 高 - 差异化亮点 |
| `networking/` | 1 (index only) | ⚠️ 约 10% | 高 - 只有 index，无内容页 |
| `data/` | 2 | ⚠️ 约 5% | 高 - 待完善标记 |
| `best-practices/observability/` | 4 | ⚠️ 约 10% | 高 - 待完善标记 |
| `best-practices/networking/` | 5 | ⚠️ 约 15% | 高 |
| `best-practices/reliability/` | 未知 | ❓ | 高 |

### 核心问题清单

1. **`data/` 模块**：`storage.md` 和 `data-processing.md` 都是 "待完善" 占位符
2. **`networking/` 模块**：index 有结构但所有子页面不存在（404）
3. **`best-practices/observability/`**：monitoring、logging、tracing 都是占位符
4. **`ai-ml/ai-copilot/`**：缺少实战 demo、缺少与 MCP 集成的完整示例
5. **`networking/service/`**：子目录存在但内容未填充

---

## 🗺️ 进化路线图

### Phase 1：补全空白内容（当前 - 2026Q2）

**目标**：消灭所有 "待完善" 占位符

#### Week 1-2：数据与存储
- [ ] `data/storage.md` - PV/PVC/StorageClass 完整指南
- [ ] `data/data-processing.md` - Spark/Flink on TKE

#### Week 3-4：可观测性
- [ ] `best-practices/observability/monitoring.md` - TMP/Prometheus 完整配置
- [ ] `best-practices/observability/logging.md` - CLS 日志接入
- [ ] `best-practices/observability/tracing.md` - APM 链路追踪

#### Week 5-6：网络模块填充
- [ ] `networking/service/` - ClusterIP/NodePort/LoadBalancer 实战
- [ ] `networking/ingress/` - Nginx Ingress + TKE Ingress
- [ ] `networking/network-policy/` - 多租户网络隔离

### Phase 2：深化 AI Copilot 内容（2026Q2-Q3）

**目标**：让 AI Copilot 成为 Workshop 的差异化亮点

- [ ] `ai-ml/ai-copilot/poc-examples.md` - 真实 PoC 案例（5+ 场景）
- [ ] `ai-ml/ai-copilot/k8s-mcp-integration.md` - MCP 完整集成教程
- [ ] `ai-ml/ai-copilot/troubleshooting-demo.md` - 排障实战演示
- [ ] `ai-ml/ai-copilot/multi-cluster.md` - 多集群巡检场景

### Phase 3：前端体验升级（2026Q3）

**目标**：让访客在 30 秒内找到自己要的内容

- [ ] 首页重构：加入「我是谁」快速导航（开发者/运维/架构师）
- [ ] 添加交互式学习路径选择器
- [ ] 每篇文章底部加 "相关场景" 推荐
- [ ] 加入「一分钟上手」卡片式示例
- [ ] 集成简单的搜索反馈机制

### Phase 4：内容质量提升（持续）

- [ ] 所有文档加入 "最后验证版本" 字段
- [ ] Cookbook 脚本补充单元测试
- [ ] 添加视频/动图演示（复杂操作）
- [ ] 多语言支持（英文版）

---

## 🤖 Agent 自动化任务

### 已激活的 Agent 任务

| 任务名 | 触发频率 | 职责 |
|--------|---------|------|
| `content-gap-filler` | 每周一 09:00 | 扫描并补充空白内容页 |
| `link-checker` | 每天 08:00 | 检测死链和过期内容 |
| `content-reviewer` | 每周三 09:00 | 审查已有内容，标记过时内容 |

### Agent 执行日志

```text
[2026-04-03] content-gap-filler: 填充 data/storage.md（CBS/CFS StorageClass、PVC、StatefulSet、扩容、常见问题）
[2026-04-03] content-gap-filler: 填充 best-practices/observability/monitoring.md（TMP接入、PromQL、告警规则、Grafana大盘）
[2026-04-02] 进化计划文档初始化，3个自动化任务创建完成（content-gap-filler/link-checker/ai-copilot-enricher）
```

---

## 📈 进化指标

> Agent 每周更新以下指标

| 指标 | 基准值 (2026-04-02) | 目标值 (2026Q2) |
|------|---------------------|-----------------|
| 有效文档页数 | ~80 | 150+ |
| 空占位页数 | ~15 | 0 |
| 平均文档完成度 | ~45% | 85% |
| Cookbook 脚本数 | 5 | 20+ |
| AI Copilot 示例数 | 2 | 10+ |

---

## 🔧 如何参与进化

人类贡献者可以：
1. 在 `EVOLUTION_PLAN.md` 中修改优先级
2. 在文章开头加 `<!-- AGENT: 需要补充 xxx -->` 触发定向生成
3. 创建 Issue 标记 `agent-todo` 标签

AI Agent 自动：
1. 每周扫描空白页并填充内容
2. 每天检查链接有效性
3. 定期更新本文档的进度指标
