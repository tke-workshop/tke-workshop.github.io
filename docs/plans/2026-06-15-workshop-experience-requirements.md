# TKE Workshop Experience Requirements

## Context

本记录基于 2026-06-15 对线上站点 `https://tke-workshop.github.io/` 的体验走查。重点覆盖首页、Cookbook 列表页、Cookbook 详情页、Start 文档页和 Practice 文档页。

当前 Astro + Starlight 迁移已经让站点从 MkDocs 主体验中解放出来，但仍处于第一版骨架状态。主要问题不是“能不能打开”，而是用户从学习、理解、执行到验证的路径还不够连续。

## Pages Reviewed

- `/`
- `/start/`
- `/practice/`
- `/cookbooks/`
- `/cookbooks/create-cluster/`

## Experience Findings

### 1. 首页有方向，但缺少明确的“下一步”

首页已经表达了“学习路径 + 可执行 Cookbook”的定位，但首屏右侧的 Workshop map 只是统计信息。用户看完后知道有 4 条路径、3 个 Recipe，却不知道自己应该按什么顺序完成一次 Workshop。

需求：

- 首页需要增加“推荐执行链路”，例如：环境准备 → 创建集群 → 部署 Nginx → 查看生产实践 → 清理资源。
- 首屏统计卡应从静态数字升级为可点击入口。
- “开始学习”和“打开 Cookbooks”之外，需要一个面向执行的主 CTA，例如“运行第一个 Recipe”。

验收标准：

- 新用户在首页 10 秒内能判断第一步应该做什么。
- 首页至少有一个入口直达可执行 Recipe。
- 首页的路径卡和 Cookbook 高亮卡都应可点击。

优先级：P0

### 2. 文档页和 Cookbook 页仍然像两个产品

文档页使用 Starlight 的侧边栏、目录、搜索和深浅色主题；Cookbook 页使用自定义 MarketingLayout。两者视觉语言接近，但导航行为不同：文档页有侧栏和搜索，Cookbook 页没有；Cookbook 页能返回列表，但不能快速跳到相关文档。

需求：

- Cookbook 页需要保留统一顶栏，同时增加与文档页一致的“上下文导航”：相关路径、相关文档、相关脚本。
- 文档页中需要出现 Cookbook callout，把“阅读主题”连接到“执行 Recipe”。
- Start / Operate / Practice / AI 页面需要有统一的路径概览块，避免纯 Markdown 列表。

验收标准：

- 从 `/practice/` 可以一跳进入相关 Cookbook 或待迁移任务。
- 从 Cookbook 详情页可以一跳回到对应学习路径。
- 用户不需要使用浏览器后退就能在文档和 Cookbook 间往返。

优先级：P0

### 3. Cookbook 列表缺少筛选和执行信息

`/cookbooks/` 展示了三张 Recipe 卡，但 Cluster / Workload / GPU 只是静态 pill，不可筛选。卡片信息也偏概要，没有显示危险级别、资源影响、是否需要真实云资源、是否会产生费用。

需求：

- 支持按 category、language、verified、resource impact 筛选。
- 每张 Recipe 卡显示执行风险：只读、创建资源、可能产生费用、需要 GPU。
- 增加“推荐先跑”的标记，降低用户选择成本。

验收标准：

- 用户可以只看 Cluster 或 GPU 相关 Recipe。
- 用户在进入详情页前就能知道该 Recipe 是否会创建云资源或产生费用。
- 列表页至少区分“入门推荐”和“高级场景”。

优先级：P1

### 4. Cookbook 详情页可执行感还不够强

详情页已经有前置条件、执行命令、验证步骤和 Agent Prompt，但命令只是静态代码块。用户需要自己判断每一步是否完成，也不能复制单个命令或看到输入参数含义。

需求：

- 执行命令拆成步骤，而不是一个长代码块。
- 每个命令块提供复制按钮。
- 增加参数表：参数名、是否必填、示例值、影响范围。
- 增加资源清理步骤，尤其是会创建集群、LoadBalancer 或 GPU Pod 的 Recipe。
- Agent Prompt 提供“复制 Prompt”按钮。

验收标准：

- 用户可以逐步复制命令执行，不需要手动拆分代码块。
- 每个会创建资源的 Recipe 都有清理说明。
- Agent 使用者可以直接复制完整 Prompt。

优先级：P0

### 5. 文档内容目前像目录，不像 Workshop

`/practice/` 等页面现在主要是主题列表，例如安全、可用性、成本优化、升级。它适合作为路线草图，但还不能支持一次真实 Workshop。

需求：

- 每个路径页增加统一结构：目标、适用人群、预计时间、前置条件、推荐顺序、相关 Recipe、下一步。
- 每个主题增加“任务卡”，而不是只用 bullet list。
- 对尚未迁移的内容明确标记状态：Available、Planned、Legacy source。

验收标准：

- 用户进入任一路径页后可以看到完成该路径的顺序。
- 未完成内容不会伪装成可执行内容。
- 每个路径页至少有一个明确下一步 CTA。

优先级：P1

### 6. 编辑链接路径错误

Starlight 文档页的“编辑此页”链接生成了重复路径，例如：

`src/content/docs/src/content/docs/practice/index.md`

这会降低贡献体验，也会让用户误以为仓库结构混乱。

需求：

- 修正 `astro.config.mjs` 中的 `editLink.baseUrl`。
- 确保文档页编辑链接指向真实文件路径。

验收标准：

- `/start/` 的编辑链接指向 `src/content/docs/start/index.md`。
- `/practice/` 的编辑链接指向 `src/content/docs/practice/index.md`。

优先级：P0

### 7. 移动端导航需要更明确

自定义首页在移动端隐藏主导航，只保留品牌和 GitHub 按钮。文档页移动端使用 Starlight 菜单。这会导致移动端在首页和文档页之间的导航模型不一致。

需求：

- 自定义 MarketingLayout 移动端需要提供菜单入口。
- 移动端首屏 CTA 需要保持可见且不拥挤。
- Cookbook 详情页的相关文件侧栏在移动端需要移动到正文合适位置，并保留标题。

验收标准：

- 375px 宽度下，用户能从首页进入 Start、Practice、AI on TKE 和 Cookbooks。
- Cookbook 详情页移动端没有横向滚动。
- 命令块可横向滚动，但不会撑破页面。

优先级：P1

## Recommended Next Implementation Slice

建议下一步先做 P0：

1. 修复编辑链接。
2. 首页增加推荐执行链路，并让 Cookbook 高亮卡可点击。
3. Cookbook 详情页增加步骤化命令、复制按钮、参数表、清理步骤和文档回链。
4. 文档路径页增加 Cookbook callout，让文档和执行层互相导流。

这组改动可以最直接解决“文档和 Cookbook 体验割裂”的核心问题，同时不会陷入大规模内容迁移。

## 2026-06-16 Local Navigation Review

本轮基于本地预览 `http://127.0.0.1:4321/`，重点检查“一级导航上移到顶部、左侧目录只展示当前模块”后的体验。

检查路径：

- `/`
- `/basics/cluster/01-create-cluster/`
- `/practice/`
- `/cookbooks/`

### 已改善

- 文档页不再把所有一级目录堆在左侧。左侧目录现在只展示当前模块内容，长目录压力明显降低。
- 文档页顶部已经出现一级导航，可以在 Start、基础操作、最佳实践、AI、Data、Cookbooks、Contribute 之间横向切换。
- 旧文档路径仍能打开，例如 `/basics/cluster/01-create-cluster/`，历史内容没有丢失。
- 文档页的编辑链接已经指向真实源码路径，例如 `src/content/docs/basics/cluster/01-create-cluster.md`。

### 仍存在的体验问题

#### 1. 首页和 Cookbook 仍使用另一套导航

首页与 `/cookbooks/` 使用 `MarketingLayout`，导航项是 `Start / Operate / Practice / AI on TKE / Cookbooks`。文档页使用 `WorkshopHeader`，导航项是 `Start / 基础操作 / 最佳实践 / AI on TKE / Data on TKE / Cookbooks / Contribute`。

影响：

- 用户从文档页进入 Cookbooks 后，顶部导航突然少了 `Data on TKE` 和 `Contribute`。
- `基础操作` 与 `Operate`、`最佳实践` 与 `Practice` 混用，概念上像两个信息架构。
- MarketingLayout 没有当前页高亮，用户在首页和 Cookbook 页不知道自己位于哪个一级栏目。

需求：

- 抽出共享的一级导航数据，文档页和 MarketingLayout 共用同一份配置。
- 统一命名：建议顶部一级导航使用 `Start / 基础操作 / 最佳实践 / AI on TKE / Data on TKE / Cookbooks / Contribute`。
- MarketingLayout 增加当前页高亮。

优先级：P0

#### 2. Workshop Paths 作为一级组已经不再清晰

侧边栏配置里仍有 `Workshop Paths` 分组，包含 `/operate/`、`/practice/`、`/ai-on-tke/`。但顶部一级导航已经把这些路径映射到 `基础操作`、`最佳实践` 和 `AI on TKE`。

影响：

- 用户不会在顶部看到 `Workshop Paths`，但分页与侧栏配置里还保留这个抽象。
- `/practice/` 这类路径页同时像“路径页”又像“最佳实践入口”，信息架构含义不稳定。
- 后续新增路径页时，维护者容易不知道应该挂到 `Workshop Paths` 还是对应主题模块。

需求：

- 移除或弱化 `Workshop Paths` 一级组，把 `/operate/`、`/practice/`、`/ai-on-tke/` 定义为对应模块的 landing page。
- 或者明确 `Workshop Paths` 是首页中的路线集合，不进入文档主导航。

优先级：P1

#### 3. Cookbooks 缺少文档页同等的搜索和上下文

文档页有 Starlight 搜索、主题切换、右侧 TOC 和当前模块侧栏；Cookbooks 页是自定义卡片列表，没有站内搜索入口，也没有当前栏目上下文。

影响：

- 从文档页进入 `/cookbooks/` 后，用户失去搜索能力。
- Cookbook 详情页和文档页仍像两个产品，只是视觉颜色接近。
- 用户无法从 Recipe 快速回到对应文档模块，除非依靠正文链接或浏览器后退。

需求：

- Cookbooks 列表和详情页复用统一顶部导航，并保留搜索入口。
- Recipe 卡和详情页增加相关文档回链。
- Cookbook 详情页增加本页目录或步骤导航，至少覆盖前置条件、执行、验证、清理、Agent Prompt。

优先级：P0

#### 4. 移动端首页导航仍然不可用

MarketingLayout 在 `max-width: 920px` 下隐藏 `.workshop-nav__links`，只剩品牌和 GitHub 按钮。文档页移动端依赖 Starlight 菜单和顶部 tabs，两个区域的移动导航模型仍不一致。

影响：

- 手机端从首页无法直接进入 Start、Practice、AI 或 Cookbooks。
- 用户一旦从首页进入文档页，会看到完全不同的导航交互。

需求：

- MarketingLayout 增加移动菜单或复用文档页顶部 tabs 的移动表现。
- 移动端保留至少一个清晰的一级导航入口，不只保留 GitHub。

优先级：P0

#### 5. 顶部导航高度增加后需要视觉截图确认

文档页通过 `--sl-nav-height: 7rem` 给两行顶部导航腾空间。HTML 结构看起来正确，但仍需要真实浏览器截图确认：

- 1024px 宽度下，搜索框、主题按钮、语言按钮、一级 tabs 是否挤压。
- 375px 宽度下，tabs 横向滚动是否可发现，是否与 Starlight 菜单按钮重叠。
- 长中文标题页首屏是否被顶部导航占用过多高度。

优先级：P1

### 下一步建议

先做一刀小改：

1. 把一级导航配置抽成共享模块。
2. 让 `MarketingLayout` 和 `WorkshopHeader` 共用同一组导航项。
3. 给 MarketingLayout 增加当前项高亮和移动端菜单。
4. 移除 `Workshop Paths` 作为用户可见一级组的残留含义。

这一轮能直接解决“顶部一级导航已经有了，但首页 / Cookbook / 文档仍不一致”的核心问题。

## 2026-06-16 Live Browser Review

本轮使用真实浏览器打开线上站点 `https://tke-workshop.github.io/`，检查的是当前已部署版本，不包含本地未发布的顶部导航改动。

检查路径：

- `/`
- `/start/`
- `/cookbooks/`
- `/cookbooks/create-cluster/`
- 375px 移动端首页与文档菜单

### 线上当前状态

- 首页桌面端有 `Start / Operate / Practice / AI on TKE / Cookbooks / GitHub` 顶部导航。
- 文档页顶部没有一级导航，只有站点名、搜索、GitHub 和主题切换。
- 文档页左侧仍然显示完整全站目录，一级、二级、三级基本都展开。
- Cookbooks 使用自定义页面布局，和文档页不是同一套导航体验。
- 移动端首页隐藏所有导航链接，只保留品牌和 GitHub。
- 移动端文档页有菜单按钮，但打开后是完整全站长目录。

### 线上体验问题

#### 1. 首页导航与文档导航断裂

用户在首页看到的是 `Operate / Practice`，进入 `/start/` 后顶部看不到这些入口，只剩搜索和主题控制。一级导航从“可见导航”变成“左侧目录的一部分”。

影响：

- 用户进入文档后失去全局方向感。
- 从 `/start/` 切到 `Cookbooks` 或 `Data on TKE` 不直观。
- 首页建立的路径模型没有延续到文档页。

优先级：P0

#### 2. 文档左侧目录过长且信息噪音高

`/start/` 的左侧目录包含 Start、基础操作、最佳实践、AI on TKE、Data on TKE、Workshop Paths、Contribute 以及大量二三级条目。实际浏览时能看到 `node-pool` 和 `nodepool` 并存、Deployment 条目重复等问题。

影响：

- 用户想看 Start，却要同时承受全站内容树。
- 旧内容迁移痕迹暴露在导航里，显得站点还没有整理完成。
- 搜索和目录承担了过多导航职责。

优先级：P0

#### 3. 移动端首页没有主导航入口

375px 宽度下，首页顶部只显示品牌和 GitHub，`Start / Operate / Practice / AI on TKE / Cookbooks` 都被隐藏，且没有菜单按钮。

影响：

- 手机用户只能依赖首屏 CTA 或向下滚动找路径卡。
- 如果用户已经在页面中部或底部，无法快速切换到其他一级栏目。
- 首页与文档页移动端导航模型完全不同。

优先级：P0

#### 4. 移动端文档菜单像站点地图，不像导航

在 `/start/` 移动端打开菜单后，完整目录从 Start 一直展开到 AI、Data、Workshop Paths、Contribute，内容非常长。

影响：

- 菜单打开后用户需要大量滚动才能找到目标。
- 一级路径没有被突出，二三级内容抢占注意力。
- 对新用户来说，菜单不是“选择方向”，而是“阅读完整目录树”。

优先级：P0

#### 5. Cookbooks 仍然缺少执行型产品体验

`/cookbooks/` 的三张卡片可点击，详情页也有前置条件、执行命令、验证步骤、Agent Prompt 和相关文件。但页面没有复制按钮、没有参数表、没有风险/费用提示、没有清理步骤，也没有回到相关文档页的链接。

影响：

- 创建集群这类会产生真实云资源的 Recipe 没有足够强的风险提示。
- 用户需要自己拆命令、复制命令、判断清理方式。
- Cookbook 更像静态说明页，还不像可执行工作台。

优先级：P0

#### 6. Cookbook 与文档之间缺少双向回路

Recipe 详情页只有“返回 Cookbooks”和源码链接，没有“相关文档：如何创建 TKE 集群 / 基础操作 / 环境准备”。文档页中也没有明显 Cookbook callout。

影响：

- 用户从文档学完后不知道应该执行哪个 Recipe。
- 用户从 Recipe 执行前后也不容易回到解释型文档。
- “文档 + Cookbook” 的合并体验还没有形成闭环。

优先级：P0

### 建议下一步

线上优先改动顺序：

1. 发布顶部一级导航：让文档页也拥有全局一级导航。
2. 收敛文档左侧目录：只展示当前一级模块内的内容。
3. 统一首页、文档页、Cookbooks 的导航命名和当前项高亮。
4. 给移动端首页补菜单入口，移动端文档菜单只显示当前模块或先显示一级导航。
5. 强化 Cookbook 详情页：复制按钮、参数表、风险/费用提示、清理步骤、相关文档回链。
