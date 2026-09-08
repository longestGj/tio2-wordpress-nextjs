# Country × Editorial 整合候选交回

日期：2026-09-08。授权：G8-TRADE4-APP5-20260908-01 §5，以及用户明确要求继续整合。**五条目标依赖已在同一生产模式候选完成实际点击与返回，可供 Gate 9 沿 ES-G9-F03 / IN-G9-F01 定向复验。** D16 不关闭 Finding，不把本回执作为整站或发布验收。

## 接收入口与版本

- 新候选：http://127.0.0.1:3226；Next production mode；BUILD_ID `1AwBNw0A1szLVVlTyLyQU`。
- 分支 `codex/country-editorial-integration`；运行代码 `4fa585b`；工作树 `D:/16Wordpress_nextjs/.worktrees/trade4-app5-gate8`。
- 隔离 WordPress `http://127.0.0.1:8186/graphql` / Docker `tio2my9`；单一 `site_scope=tio2-my`。启动 PID 21792，记录见 [runtime-identity.json](runtime-identity.json)。
- 原九页实现 `b325aec`、原交付 `6de21ad`、目标 owner 补验 `a5230cd` 保留；原 Country 3029 / PID 68904、原九页 3216 / PID 69604 继续运行，未替换其构建。
- **Gate 9 本轮应使用 3226，而非 3029。** 3029 的五条目标仍 404；该旧候选状态没有被改写。

## 整合内容

在已有隔离工作树切换新分支，依次 cherry-pick Country `d764c36`、`47307b8` 为 `c0f33af`、`c15de45`，无冲突。它们保留 Spain 排版与 hover 下划线、India 键盘焦点、Belgium 内联焦点及共享 Chrome/Consent 修订。Country 组件、样式、共享 Chrome/Consent 与 EN/MS 根布局已按 git diff 对照 `47307b8`，没有额外差异。

唯一新增生产适配是把九页使用的 Inter 字体变量绑定到 `MalaysiaEditorialPage` 自身 wrapper。这样既保留九页批准正文排版，也保留 Country 自己的局部 Inter 和共享 Chrome/Consent 的 Arial，不恢复已移除的全局字体注入。测试预期同步到当前共享菜单（Close 首项、末尾单一 RFQ）；证据输出目录参数化，旧记录不被新运行覆盖。

没有修改批准文案、链接、Page ID、源哈希、CMS/API/缓存规则或九页内容配置；没有隐藏入口、改到 Contact 或跨 scope fallback。本轮 CMS 仅查询，未重复状态撤回演练。

## 五条目标：同候选实际点击与返回

| Finding | Page ID / CMS ID | 3226 目标路径 | 实测路径 |
|---|---|---|---|
| ES-G9-F03 | APP-COAT / editorial-18537 | /applications/titanium-dioxide-for-coatings/ | Spain 原正文入口 → 目标 200 → 浏览器返回 Spain |
| ES-G9-F03 | APP-PLAS / editorial-18539 | /applications/titanium-dioxide-for-plastics/ | Spain 原正文入口 → 目标 200 → 浏览器返回 Spain |
| ES-G9-F03 | APP-MB / editorial-18541 | /applications/titanium-dioxide-for-masterbatch/ | Spain 原正文入口 → 目标 200 → 浏览器返回 Spain |
| ES-G9-F03 | RES-TRADE-EU / editorial-18529 | /resources/eu-titanium-dioxide-anti-dumping-duty/ | Spain 原正文入口 → 目标 200 → 浏览器返回 Spain；批准 EU Procurement 链接另到 /markets/european-union/，200 |
| IN-G9-F01 | RES-TRADE-IN / editorial-18533 | /resources/india-titanium-dioxide-anti-dumping-duty/ | India 原正文入口 → 目标 200 → 浏览器返回 India；批准 India Procurement 链接另回 /markets/india/，200 |

五页源和目标同一 origin 与 BUILD_ID；Page ID、CMS 单一 scope、publish 状态、完整批准 payload、SSR 正文、H1、canonical/noindex 均核对一致。Gate 6 包、intake 指定当前 Manifest 及绑定页面内源文件本轮重读 SHA 一致。逐条记录、URL、链接文字、源码哈希及复核字段见 [results.json](results.json)，命令及结果见 [recheck.mjs](recheck.mjs)、[五条检查日志](five-routes.log)。

EU / India 的 CMS 复核记录当前均为 verified / no_open_trigger，证据日期 2026-09-08、nextReviewDue 2026-10-07，绑定原证据 SHA `A40568E5A4A9EFE636D7DAB86E488A918B44A1D4DFE92AEAC4837A49A786329E`。官方复核仍引用同日 08:35 +08:00 的 [有界官方核查](../trade4-app5-20260908/trade-freshness.md)及 [时效控制报告](../trade4-app5-20260908/editorial-freshness-final-review.md)，没有冒称本轮又进行一次新的官方搜索。可见批准日期保持 7 September 2026；门户提取限制、触发复核与发布前复核要求仍有效。

## 验证结果

- **51 文件 / 479 项相关 Vitest 通过**：[tests.log](tests.log)。包括九页、Country、共享菜单、Consent、资源、路由范围及 revalidation。
- 目标 webpack build、TypeScript、变更 TS/TSX ESLint 通过：[build.log](build.log)、[typecheck.log](typecheck.log)、[eslint.log](eslint.log)。字体作用域测试先观察到正确失败，再实现通过。
- **47 个浏览器场景：46 通过、1 个本地配置失败**：[browser.log](browser.log)。通过范围包括九页正文/SEO/三断点/键盘/无障碍、九页真实 200% 缩放、四 Country 的批准内容和修订行为、共享法律页与 Consent。不能将此运行称为全部通过。
- 失败的 Country RFQ/Document 合并场景在首个 RFQ 字段检查处中止：本候选未配置 `NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY`，现有安全行为显示“form temporarily unavailable”。已保留 [错误记录](rfq-unconfigured-error.md)与 [截图](rfq-unconfigured.png)。没有用虚假服务商配置掩盖失败；本轮不证明 RFQ 可编辑、服务商接收或最终收件。
- 因上述合并场景提前中止，另行独立点击四个 Country 的 Documents 入口：准确来源/market 参数、8 个字段、国家字段保持空值、无 POST，见 [document-navigation.json](document-navigation.json)。没有真实提交。
- 独立代码与限定视觉复审见 [integration-review.md](integration-review.md)。程序检查不代替实际视觉复核或 D23 独立验收。

## 已实际查看的视觉证据

负责人逐张打开五张 `*-target-1440.png`，确认准确标题、正文开头、按钮与当前共享导航完整。另实际查看 `country/spain-1440-secondary-hover.png`（可见 underline）、`country/spain-390.png`、`country/india-keyboard-focus-01.png`（清晰焦点框）、`country/india-390.png`、`country/belgium-390-be04-inline-1-focus.png`（内联焦点）、`country/belgium-1440.png`、`country/netherlands-768.png`、`legal/consent-settings-390.png`、`legal/legal-priv-en-390.png`；检查范围为布局、共享 Chrome/Consent、明显裁切和适用焦点，没有宣称逐字人工校对长图。

复审者另实际查看九页全部 18 张原生缩放 Menu/Cookie 截图及代表正文，具体文件、观察和截图限制见独立复审报告。其余新截图供 Gate 9 接收，不把未人工查看的全部图片一概标成视觉验收通过。原九页完整批准正文及历史三断点/原生截图另在 [原始交付回执](../trade4-app5-20260908/DELIVERY_RECEIPT.md)中绑定。

## 剩余依赖、交回与回退

本轮五条目标不再受候选未整合所阻；正式 Finding 状态由 D23 在 **3226 / 4fa585b** 上沿原 ID 独立复验后决定。九页均保持 noindex/nofollow，不进入 sitemap，四个 provisional 路径仍未终定。

Application Hub、Brazil EN/PT 关联页、RFQ 配置/真实接收、其他浏览器/实体设备/辅助技术及发布前时效等原依赖未由本轮关闭。原 3029 的既有结论不自动传播到 3226；本回执提供相关修订复验，不重写 D23 Manifest 或 Gate 状态。

新候选仅为本地技术整合，未 merge 到 release/main、push、部署、生产写入、DNS、索引、真实表单/邮件或 Gate 9/10 关闭。回退只需经 PID/端口/命令核实后停止本任务 3226 进程，保留 3029 和 3216；不得停止或重写另一任务环境。源码原分支仍指向 a5230cd；当前工作树已切换到整合分支，旧 3216 仍运行原冻结构建。

交回文件就绪不等于接收方已经收到消息或接单；文件面板排队也不是独立验收证据。
