# TiO₂ Malaysia：Trade 4 + Application 5 Gate 8 开发回执

交付日期：2026-09-08（Asia/Shanghai / Asia/Kuala_Lumpur）。状态：**九页技术实现与本地自检完成，供独立 Gate 9 接收；不是 Gate 9 通过或发布回执。**

## 交付身份

- 授权：`G8-TRADE4-APP5-20260908-01`，D23 `docs/architecture/GATE8_TRADE4_APPLICATION5_AUTHORIZATION_AND_DISPATCH_V1.0.md`。Brazil Trade 按 Controller 明确更正采用 V0.2 / `RES-TRADE-BR-G6-HANDOFF-02`，未使用 V0.1。
- 网站与环境：`site_scope=tio2-my`；独立本地生产模式 Next `http://127.0.0.1:3216`，独立 Docker 项目 `tio2my9` / WordPress `http://127.0.0.1:8186`。
- 代码提交：`b325aec6b5121f2ded604bcf3afad7886515990f`；分支 `codex/trade4-app5-gate8`；基线 `2c97fe19b56f14e12c6e27daa7fd3c9a49207570`。
- 工作树：`D:/16Wordpress_nextjs/.worktrees/trade4-app5-gate8`。选择已提交的 country-four 基线，以继承共用 Chrome/Consent 修复；没有吸收原工作区并行 Poland/Brazil 的未提交代码。
- Next 16.3.2 / PHP 8.3；最终 BUILD_ID `UV4ipmsCJ7cj7M2EHPfID`，构建目录 `.next-trade4-app5-verified`。最终端口、进程与代码绑定见 [runtime-identity.json](runtime-identity.json)。后续证据与截图测试辅助代码提交不改变运行代码。

## 九页范围

| Page ID | 本地预览路径 | WordPress ID | 路由状态 |
|---|---|---:|---|
| RES-TRADE-EU | [/resources/eu-titanium-dioxide-anti-dumping-duty/](http://127.0.0.1:3216/resources/eu-titanium-dioxide-anti-dumping-duty/) | 18529 | 批准候选路径 |
| RES-TRADE-UK | [/resources/uk-titanium-dioxide-anti-dumping-investigation/](http://127.0.0.1:3216/resources/uk-titanium-dioxide-anti-dumping-investigation/) | 18531 | 批准候选路径 |
| RES-TRADE-IN | [/resources/india-titanium-dioxide-anti-dumping-duty/](http://127.0.0.1:3216/resources/india-titanium-dioxide-anti-dumping-duty/) | 18533 | 批准候选路径 |
| RES-TRADE-BR | [/resources/brazil-titanium-dioxide-anti-dumping-duty/](http://127.0.0.1:3216/resources/brazil-titanium-dioxide-anti-dumping-duty/) | 18535 | V0.2 批准候选路径 |
| APP-COAT | [/applications/titanium-dioxide-for-coatings/](http://127.0.0.1:3216/applications/titanium-dioxide-for-coatings/) | 18537 | 非 provisional；仍无索引授权 |
| APP-PLAS | [/applications/titanium-dioxide-for-plastics/](http://127.0.0.1:3216/applications/titanium-dioxide-for-plastics/) | 18539 | provisional |
| APP-MB | [/applications/titanium-dioxide-for-masterbatch/](http://127.0.0.1:3216/applications/titanium-dioxide-for-masterbatch/) | 18541 | provisional |
| APP-INK | [/applications/titanium-dioxide-for-printing-inks/](http://127.0.0.1:3216/applications/titanium-dioxide-for-printing-inks/) | 18543 | provisional |
| APP-PAPER | [/applications/titanium-dioxide-for-paper/](http://127.0.0.1:3216/applications/titanium-dioxide-for-paper/) | 18545 | provisional |

九页均为 `noindex,nofollow`，不进入 sitemap；当前本地站 robots 为 `Disallow: /`。批准路径不等于索引、部署或正式发布授权。

## 实现与批准内容对应

每页 Gate 6、当前 Manifest、B 正文与冻结视觉的哈希见 [intake.json](intake.json)、[Trade 内容映射](trade-payloads.md)及 [Application 内容映射](application-payloads.md)。两个构建器在转换前校验源哈希；运行时不读取 D23。

链路为 `tio2_my_editorial` 的九条独立、精确归属记录 → 私有 WPGraphQL 字段 → DTO 再次校验范围、路径、批准版本和语义标签 → Next SSR、head 与 JSON-LD。配置文件只用于验证批准内容和导入，不是 CMS 故障时的静态替代。初始 HTML 正文与批准 main 全文在允许的入口投影后逐页匹配。最终九条记录均与批准配置逐字节一致，见 [CMS 最终读回](cms-final-readback.json)。

页面仅转换批准 `<main>`，不复制策划原型的 Header、Footer、Cookie、模拟脚本、内联样式或本地文件链接。实际共用 Malaysia Chrome、Logo、字体和 Consent；各页 CSS 绑定 Page ID。补齐了页面外边距、真实字体变量、章节跳转后的标题焦点，以及失效入口与 BreadcrumbList 同步。

所有 Grade 入口先通过实际同站 Product Detail 和父级可用性校验；不可用时仅移除批准允许的 CTA，保留中性型号/工艺文字。仅 APP-INK/PAPER 按各自 C §6 允许撤下非 Grade 失效链接并保留文字；其失效 breadcrumb 目标同时从机器关系移除。其他页面不会套用此规则。Trade Brazil 的 EN/PT 强制链接继续可见，目标未就绪作为依赖记录。APP-MB 使用允许的 WebPage + BreadcrumbList 基线，未启用可选 ItemList。

九页查询均 `no-store`，只在一次请求内去重；站点、路径和 Page ID 缓存标签隔离。Trade 时效失效同时约束正文/head/Schema及 Resources Hub 投影，相关 webhook 包括文章和 `/resources`。Hub 现有发布映射未被打开。

## 时效与本地数据操作

[9 月 8 日有界官方复核](trade-freshness.md)未找到实质变化，但部分官方门户无法完整提取。该结论不是法律判断，也不是对未访问材料的背书。页面可见批准日期仍为 9 月 7 日；内部复核单独绑定 Page ID、交付包与证据 SHA、时区、事件状态和下次复核上限。当前复核截至 2026-10-07；马来西亚时间 10 月 8 日起不再通过。发布前及事件触发时仍须复核。

独立本地数据库从原库只读导出复制；所有导入、状态演练和恢复只发生在 `tio2my9`。九页导入的 [Plan](cms-seed-plan.json) 与 [Apply](cms-seed-apply.json)分别记录。克隆库的 RFQ 预填白名单来自另一项并行任务，已仅在本任务克隆中对齐本分支已提交基线，保留 [前后哈希](cms-baseline-alignment.json)。没有改写原数据库或 D23 批准材料。

EU 的复核撤回→Plan→Apply→恢复实测保留了完全相同的正文，并写入审计历史。具体控制、日期边界和恢复证据见 [时效最终报告](editorial-freshness-final-review.md)。

## 验证结论与证据

| 检查 | 实际结果与证据 |
|---|---|
| 相关单元/集成及共用消费者回归 | **44 文件 / 426 项通过**；[日志](focused-tests.log)。覆盖 DTO、日期、路由范围、cache tag、Hub、Chrome、Consent、proxy、revalidation。 |
| 类型、lint、目标构建 | `npm run typecheck`、变更 TS/TSX/MJS ESLint、PHP 8.3 语法均通过；[类型日志](typecheck.log)、[构建日志](build.log)。本机 node_modules 为既有 junction，因此使用 `next build --webpack`。另修正了基线 catch-all page 中 Next 16 不允许的辅助函数 export；函数行为未变。 |
| 实际 CMS | 正确范围/批准内容通过；外站、缺少范围、未知 Page ID 和改写内容拒绝；[契约探针](cms-contract-probe.json)。17 项 PHP 时效边界与 TS 一致，[结果](freshness-php-parity.json)。 |
| 九页 SSR 与响应式 | 每页 200、同 BUILD_ID、批准正文匹配、准确 title/description/H1/canonical、noindex、限定 Schema；1440/768/390 无横向溢出；浏览器错误 0、Axe serious/critical 0。原始逐页 JSON/图片在 `runtime/`，[汇总](runtime-summary.json)。 |
| 真实交互 | 紧凑菜单只有活动导航可访问，Applications/Resources current 正确，实际 Tab/Shift+Tab/Escape 及焦点返回通过；全部正文 fragment 标题焦点、Cookie 开关/返回、reduced motion 通过。页面加载未产生跨主机请求或 POST。 |
| 200% 原生缩放 | 九页 Chromium `tabs.setZoom(2)`，外窗不变、CSS 宽度减半、DPR 加倍；同 BUILD_ID、无横向溢出，菜单/Cookie 可操作。最终采用 22 张直接分段截图，并预先解码 Logo；[日志](native-zoom-final.log)、`native-zoom/`。早期超长单张截图的 compositor 重复已淘汰，不作有效证据。 |
| CMS 状态与已访问响应 | APP-COAT 的 Draft/Foreign/Multi/MissingScope/Malformed/Duplicate、EU 的 Withdraw/Pending/Expired，均在同一已访问 URL 返回 404且正文/相关 head/Schema消失；恢复后 200。`isolation/` 保留读回和签名失效日志。 |
| 型号/父级实际撤回 | M-350 与 Product Hub 的 draft/foreign 状态，APP-INK/PAPER 同一已访问 URL 仍为 200，相关入口消失、中性型号保留；恢复后入口返回。`target-readiness/` 两份记录均验证最终恢复。 |
| 私有 API | 匿名请求无数据；认证后的 foreign/omitted scope 仍拒绝；[拒绝记录](isolation/public-api-rejection.json)。未把内部证据或令牌输出到 HTML。 |
| 独立代码复审 | [最终复审](independent-code-review.md)在所复查范围无未决 P1/P2；不代替独立业务/视觉 Gate 9。 |

浏览器 16 个场景最终均已有通过证据。[首次整合日志](browser-integration.log)记录 15 项通过和 1 项测试假设错误：GraphQL 拒绝时省略 `data`，并非输出 `data:null`。只修正“无数据”的断言并增加认证错站检查后，[相关复验](browser-recheck.log)通过；原生截图随后再以最终分段/Logo方案通过。未为凑出一次全绿而重复无变化的 CMS 演练。

视觉证据已实际查看：负责人复核全部 27 张响应式截图，见 [响应式复核](responsive-visual-review.md)；复审者查看全部 22 张原生缩放正文分段与最终 18 张菜单/末尾 RFQ 截图，见 [原生缩放复核](native-visual-review.md)。菜单截图使用 Chromium 软件合成、激活页面并等待绘制稳定后直接 CDP 捕获，九页均保持原生 200% 几何关系，末尾 RFQ 经键盘到达且完全可见。失败的早期截图已排除；未为此修改生产 DOM/CSS。该范围内无未决视觉问题，其他浏览器、实体设备和独立验收仍按下文保留。

曾有一次超出本任务必要范围的全库测试快照：2514 通过、48 跳过、12 失败。与本改动相关的 revalidation、Resources connection mock、菜单测试已修正并进入上述 426 项；其余 Site A、既有文档语言及模板断言/超时问题列于时效报告，未宣称全库通过。当前结果限于本次相关范围。

## 未决依赖与接收边界

1. `/applications/`、`/markets/brazil/`、`/pt-br/markets/brazil/` 在本基线返回 404；分别由 Application Hub/市场页负责人处理。已批准的共用导航和强制 Trade 链接继续保留。它们阻止对应路径或整站发布结论，不能以单页 200替代。
2. 四个 provisional Application 路径需架构/SEO负责人按批准流程终定；九页都没有 Gate 10、索引或部署授权。
3. Documents/Sample/RFQ 及全部可见 Grade 链接已检查本地目标状态；转换页返回 200只证明页面导航。真实表单、服务商接收、实际收件、超时恢复和接收方独立验收未在本任务执行。
4. 批准源链接/完整标题已核对；没有逐一浏览所有外部技术资源并完成独立语义验收。有界 Trade 复核保留访问限制；发布前复核由内容/来源负责人负责。
5. 本任务提供 Chromium 和程序化无障碍证据；其他浏览器、实体触屏设备、屏幕阅读器、完整无障碍认证及策划侧独立验收仍开放。
6. [逐条 AC/依赖对应表](acceptance-crosswalk.md)保留批准交付包的稳定 ID，区分已有技术证据和待验收部分。D16 自检不把这些条件整体标成 Gate 9 PASS。

接单依据为本次用户/Controller 授权；本回执绑定已完成的技术候选。文件面板打开或排队不证明外部消息送达；本回执没有独立接收人的接单/验收证据。未执行 merge、push、Preview/Production部署、DNS、生产写入、真实发信或 `verify:root-only`。

## 复验与回退

本地预览、Docker 项目和隔离工作树保留供接收。环境凭据仅在被忽略的本地文件中。Next 使用 `WORDPRESS_EDITORIAL_API_TOKEN`，WordPress 使用 `EDITORIAL_API_TOKEN`，值仅限本任务；禁止借用其他站密钥。签名 revalidation 的两端密钥同样仅配置于本地环境。

同一环境可按仓库中的四个 `editorial-*.spec.ts` 复验，设置 `NEXT_DIST_DIR=.next-trade4-app5-verified`；状态测试只允许本地 `tio2my9` 和指定任务标识，始终使用 snapshot/restore。导入脚本只接受本任务本地环境，Plan 先行、九条预检、create-only，不覆盖已有变更。复核更新使用单页 Plan/Apply 与审计回退，不重写正文。

如撤回此候选，保留回执后停用经进程和端口核实的本任务 3216 服务，并停用本任务 Docker 项目；不操作原工作区/原库或其他任务进程。代码可在后续授权的集成分支 revert `b325aec`；本分支未合并，无需回滚生产。独立库在交付前所有演练记录均已恢复。
