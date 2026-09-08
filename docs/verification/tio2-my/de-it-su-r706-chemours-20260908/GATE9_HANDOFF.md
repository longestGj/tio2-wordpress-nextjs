# 五页 Gate 8 技术交接 → D23 00-Gate9

日期：2026-09-08（Asia/Shanghai / Asia/Kuala_Lumpur）。任务：`G8-DE-IT-SU-R706-CHEMOURS-20260908-01`。网站：`tio2-my`，EN，仅本地开发环境。

**结论：五页已实现，本轮技术自检完成，可提交独立审查。不是 Gate 9 通过或发布许可。** 已知依赖、候选映射及未覆盖验收仍保留。此次五页是新任务，不是上一批 Trade 4 + Application 5 的重复交付。

## 1. 唯一交付身份

- 工作区：`D:/16Wordpress_nextjs/.worktrees/de-it-su-r706-chemours-gate8`
- 分支：`codex/de-it-su-r706-chemours-gate8`
- 基线：`84db14ee35fe118415bff8327f202ee712e7599c`
- 实现 commit：**`3cb56f4ed3afe0e938aed4f2fe311a35c4c63f28`**
- 当前 Build ID：**`D5YP7Z4w9KYNlOMkUVr63`**；目录 `.next-five-fixed`；Next.js 16.3.2 webpack。
- 本地 Next：`http://127.0.0.1:3236`，交接进程 PID `49532`（2026-09-08 11:17 +08:00 核验；后续重新启动以新的运行身份为准）。
- 本地 CMS：`http://127.0.0.1:8187/graphql`，Docker project `tio2my5`，独立数据库/文件卷，插件只读挂载本工作区。
- CMS task guard：`G8-DE-IT-SU-R706-CHEMOURS-20260908-01`；五条新记录 ID：18554、18556、18558、18560、18562。详见 [CMS 导入回读](cms-seed.json) 与 [当前交付绑定](delivery-identity.json)。
- 证据 commit：在本文件所属的后续 evidence commit 中固定；该 commit 不改变以上实现代码或运行构建。

| Page ID | 本地审查入口 | Package ID |
|---|---|---|
| MARKET-EU-DE | [Germany](http://127.0.0.1:3236/markets/germany/) | MARKET-EU-DE-G6-HANDOFF-02 |
| MARKET-EU-IT | [Italy](http://127.0.0.1:3236/markets/italy/) | MARKET-EU-IT-G6-HANDOFF-01 |
| PRODUCT-PROC-SU | [Sulfate](http://127.0.0.1:3236/products/sulfate-process-titanium-dioxide/) | PRODUCT-PROC-SU-G6-HANDOFF-01 |
| RES-R706 | [R706 候选页](http://127.0.0.1:3236/resources/ti-pure-r-706-alternative/) | RES-R706-G6-HANDOFF-02 |
| RES-CHEMOURS | [Chemours 候选页](http://127.0.0.1:3236/resources/chemours-titanium-dioxide-alternatives/) | RES-CHEMOURS-G6-HANDOFF-02 |

精确 D23 包路径、Package SHA-256、当前 Manifest 路径/哈希在 [初始接收记录](intake.json)。完整 B/C/视觉/依赖核对分别见 [DE/IT](de-it-intake.md)、[Sulfate](sulfate-intake.md)、[R706/Chemours](alternatives-intake.md)。D23 源文件未写入或更新。

## 2. 实现与边界

五页使用 exact-source 私有 CMS payload、严格 scope/身份/正文校验、独立路由和主内容 scoped CSS。正文来源与生成器 `--check` 可复验，运行不依赖 D23 本机路径。Inter 由共享 editorial owner 绑定批准的本地 variable 字体与 OFL。

- DE/IT 保留完整七模块正文。RFQ 正文入口仅带本页来源和对应目的国；Documents/Sample 按批准合同最小上下文，Italy Sample 强制仅来源。Documents 的入口来源与买家随后填写的字段独立保存。EU Trade 整句及获准 application CTA 仅在对应 scoped 依赖不合格时原子省略。
- Sulfate 保留五模块与 M-996 → M-2196 → M-108 → M-52 → M-2377 的中性顺序；不会因依赖不可用隐藏批准入口。输出 CollectionPage、BreadcrumbList、五项 ItemList，不输出 Product/Offer/FAQ 等。
- R706/Chemours 保留独立指南定位和中性 Products/Documents 路由，不生成 Grade 关系或竞争品牌预填。两页仍是候选映射：不输出未批准 canonical；R706 的 URL 绑定 WebPage/BreadcrumbList 因 D01 暂缓，Chemours 条件 TechArticle 同样未启用。保持 noindex,nofollow，五页均不入 sitemap。
- 两篇指南实际官方来源复核使用独立受信 manifest，TS/PHP 均校验包、证据、日期、事件状态和过期边界；公开 `Last reviewed: 6 September 2026` 未改写。见 [官方来源复核及访问限制](alternatives-freshness.md)。Sulfate FTC 的实际 HTTP/PDF 原文复核见 [来源说明](sulfate-source-review.md)。
- Shared Header/Footer/Cookie 仅对这五个消费者启用批准视觉；既有九页保留原行为。当前变体使用 84/64px Header、1100px 菜单断点、共享批准 Logo 和干净 RFQ。Cookie 使用原生模态隔离，标题可读、Inter/teal 控件和焦点恢复已经复测。
- 历史九页 seed 被固定为原九个 ID；本任务独立 five-only seed。RFQ 本地更新仅三项来源白名单，前后值和任务身份受限。未改原有运行环境或其他工作区。

## 3. 本轮实际验证

| 检查 | 当前证据与结果 |
|---|---|
| 包/正文/样式绑定 | 三个 builder `--check` 通过；DE/IT 全文、Sulfate 五 Grade、R706 48 段/Chemours 32 段来源校验；[绑定清单](alternatives-source-bindings.json) |
| 单元/集成与影响面 | 42 文件 430 通过、1 项 opt-in PHP 当时未启用；核心修复后另有 157 项定向通过；最终 Cookie/来源/回调定向 39/39，包含实际 PHP 信任校验。次数有重叠，不相加；见 [大组记录](tests-unit.txt)、[最终定向记录](tests-final-focused.txt) |
| 仓库全量 Vitest 现状 | 2026-09-08 11:14 +08:00 额外运行 `npm test`：281 文件通过、9 文件失败、20 文件跳过；2588 项通过、22 项失败、50 项跳过。20 个失败依赖本工作树未配置的 Site A 私有 `wordpress/.env`，另 2 个失败是 Node 原生测试文件被 Vitest 收集为空套件。它不是五页定向失败，也不宣称全仓测试通过；完整输出见 [全量测试记录](tests-repository-full.txt)。 |
| CMS 失败状态及恢复 | [87 项实际 PHP/WPGraphQL 检查](cms-five-states.json)：错误/缺失/混合 scope、draft、missing、duplicate、route/identity/body/canonical 篡改、适用 freshness 失败；五记录完整 post/meta/term 摘要恢复一致，无继承九页修改 |
| 构建/静态检查 | [最终 webpack 构建](build-final.txt)、TypeScript 和定向 ESLint 通过 |
| Chromium | [当前构建原始证据](evidence/five-browser/D5YP7Z4w9KYNlOMkUVr63-r1/)：6/6 E2E；1440×900、768×900、390×844 DPR1；57 张截图全部实际打开并核对 SHA，见 [视觉回读](evidence/five-browser/D5YP7Z4w9KYNlOMkUVr63-r1/visual-review.md) |
| Firefox 151.0 | [当前 Firefox 回读](evidence/firefox/D5YP7Z4w9KYNlOMkUVr63/firefox-results.json)：五页 × 1440/390，10/10；20 PNG，5 张代表图实际打开。含准确字体文件 SHA、84/64px、完整正文/Schema、菜单/Cookie/锚点，不声称全部 20 图逐张目视 |
| 代码审查 | [DE/IT payload 审查](five-payload-review.md)、[替代品 payload 审查](alternatives-payload-review.md)、[核心审查](five-core-review.md)、[最终独立代码审查](final-code-review.md)；已发现问题完成修复，无剩余可执行代码问题 |

当前 Chromium：无页面 JavaScript 错误、网络失败、实际对外提交或被拦截写请求；闭合/打开 Cookie 的 axe serious/critical 为零。截图实际确认 Cookie 标题可读、焦点可见、Logo 已加载。保留 CSS preload 警告，不将其隐去。独立验收仍须按原 AC，不以测试计数替代。

旧 Build `olH5kVkkyEhmfGAHQ_2SJ` 的 r1/r2 保留为问题反证，**不是本次通过证据**：曾有 Cookie 白底白字、Header +1px，以及字体别名/懒加载截图采集问题。当前入口只采用 `D5YP7Z4w9KYNlOMkUVr63`。

## 4. 必须继续保留的未决项

| 未决项 | 影响及责任 |
|---|---|
| Sulfate `/applications/` 实测 404 | `SU-DEP-01` / SU-G9-09 等仍未闭合，由 APP-000 owner 提供可用的同站批准实现。按包保留 Explore Applications 入口；不擅自新增 Hub、改链接或隐藏入口。其余本轮五页正文内链检查均返回 200，但 HTTP 200 不代表其独立验收或收件完成。 |
| R706/Chemours 候选路由映射 | D01 及关联 SEO/Schema AC 留给 Controller/route owner 决定；R706 AC10 没有因保守禁止输出而闭合，Chemours TechArticle 未授权。不得把本地可访问解释成公开映射批准。 |
| RFQ/Documents/Sample 真实收件 | 本地未配置 Web3Forms 接收 key；未实际提交。仅模拟提交语义、入口、校验和保留数据有技术证据。Provider/收件人/账户绑定、服务商接收及邮箱实际收到分别待 owner/授权环境验证。 |
| 设备/辅助技术 | Chromium/Firefox 视口测试已覆盖；原生浏览器 200% 缩放、真实移动设备/touch、读屏实际播报、forced-colors 等未覆盖，不能用 DPR1、DOM focus、axe 或 headless 视口替代。 |
| 来源与发布窗口 | 当前来源检查是有访问限制的技术复核。相关事件变化和发布前复核仍由来源/发布 owner 承接；未更改公开日期、事实或批准状态。 |
| 部署/发布 | 未 merge、push、Preview/Production 部署、DNS、索引操作、正式迁移或生产写入；没有 Gate 10/发布许可。 |

原 AC/依赖编号完整保留在三份 intake 中：DE 14、IT 12、SU 16、R706 14、Chemours 13 项 AC。本交接提供技术证据与未决责任，不填写 D23 Gate 9 PASS。

## 5. 送达与独立验收

目标：D23 **00-Gate9-01my开发**，thread `01a07e7e-24ef-7390-beab-f50fcbf169e0`。本地交接材料已准备，消息送达结果单独记录在 [交付状态](delivery-status.json)。在状态被写为 `SENT` 前不宣称已发出；无论送达状态如何，均不等同于对方接单或独立验收通过。

可直接转交：请审查任务 `G8-DE-IT-SU-R706-CHEMOURS-20260908-01` 的上述五页，锁定代码 `3cb56f4ed3afe0e938aed4f2fe311a35c4c63f28`、Build `D5YP7Z4w9KYNlOMkUVr63`、本地 3236/8187 组合。按原包 AC/依赖独立只读验收，保留本节未决项，反馈时标明具体 AC、页面、复现与当前版本。D16 承接原范围技术返修。
