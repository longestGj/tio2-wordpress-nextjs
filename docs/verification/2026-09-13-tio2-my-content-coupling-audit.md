# TiO₂ Malaysia 内容与批准稿耦合检查

日期：2026-09-13。任务：用户要求检查类似“文案与代码批准稿绑定过紧”的问题。

## 范围与证据边界

- 检查基线：D16 根目录干净 `main@e288316139b1de89389dcd3bbf3c02ff63b33f7b`。develop 当时为 `7c849af234602cf299cb75e772a0104f77b849cd`。
- 范围：tio2-my 的 PHP 查询、TypeScript DTO、内容投影、渲染、SEO，以及与读取相连的批准控制。
- 方法：静态调用链追溯和本地合成输入探针。探针用已安装 TypeScript 在内存转译实际源码，调用真实比较器、Contact DTO 和产品中心 metadata 函数；没有复制算法模拟结果。
- 未访问生产、未改业务代码、未运行全站构建、未新增真实表单。结论证明代码路径及合成输入行为，不证明全部生产记录当前有故障。
- 另一个任务正在 `codex/cms-read-approval-decoupling` 开发法律页。其工作树只读参照，不修改或混入此基线。法律页修复中的项目不作为新发现重复返修。

## 检查结论

### C01 — 读取继续依赖完整批准基线（已确认，高优先级）

`lib/wordpress/content-release-validation.ts:19` 的 `matchesInstalledContent` 对未列入文本白名单的字段、对象键集合、数组数量及顺序继续精确比较。22 个 DTO 文件直接使用它或 `installedContentWithDeliveredText`；这是文件数，不是页面数。调用覆盖首页、About、应用中心、产品中心/详情、市场、文档、资源/编辑页、联系、三张请求表单及法律页。

PHP 对应 `content-release-validation.php` 的比较器同样被各页面 validator 调用。例如 `homepage-v04.php:46` 比较完整内容，随后还固定 `HOME-001-G7-HANDOFF-01`；公开 resolver 经 homepage validator 读取。`market-country-v01.php` 的查询和写入也复用合同 validator。只改 DTO 或只改 PHP 都不能完成迁移；全局放松共享比较器则可能影响写入。

本地实测：HOME 原合同 true；只修改 packageId 后 false。交付批次元数据因此成为读取条件。

建议：逐页面族建立独立读取合同，保留身份/安全约束，单独迁移审批证据。不要删除写入原校验。

### C02 — 内容结构被固定稿约束（已确认，需按模板评估）

- 比较器 `sameHtmlStructure` 要求 HTML 标签片段和属性与原稿完全一致。新增安全段落也会失败。
- 法律 Markdown 比较完整标题、更新时间行、Actions 行和链接目标；法律 DTO 另外固定 7/10 节。这项已在另一个任务修复。
- 即使没有批准稿比较，也可能绑定固定篇幅：`market-page-poland-v01-dto.ts:28` 使用 tuple 固定模块内段落数量，而 `malaysia-poland-market-page.tsx:35` 实际以 map 渲染段落。结构合同是否必须固定数量仍需逐模块验证，不能把全部 tuple 视为错误。

本地实测：Trade EU 原合同 true；增加 `<p>Additional published explanation.</p>` 后 false。法律页只修改 H1 文本后 false。

建议：区分真正固定的模板模块/行为与可变的段落、列表及小节，使用受支持结构和容量限制替代与旧稿数量一致。

### C03 — CMS SEO 被代码清单覆盖（已确认，高优先级）

`lib/seo/tio2-my-publication-metadata.ts:24` 仅按 pageId 从静态 publication inventory 获取 title、description、OpenGraph/Twitter 文本。26 个 metadata 消费文件引用该函数（连同定义文件共 27 个）；调用数量不等于缺陷或页面数量。

已核对首页、产品中心、DOC-COO、国家市场、editorial、法律页：页面 DTO 主要用于身份检查，文字仍取静态清单。国家市场 JSON-LD 使用 CMS description，而普通 metadata 使用清单，存在同页输出来源分裂；editorial JSON-LD 也优先取清单 description。

本地实测：产品中心 metadata 收到合成的新 CMS SEO title，输出没有使用该 title。

建议：路由、canonical、hreflang、robots 继续由明确技术/发布策略控制；标题、描述及分享文本消费校验后的 CMS 值，并验证 JSON-LD 一致性。法律页此项正在另一任务修复，其余消费者仍需迁移。

### C04 — 内容差异导致信息静默消失（已确认，高优先级）

`lib/wordpress/contact-page-v01-dto.ts:29` 的 `exactFact` 要求 label 和 value 都等于代码批准值，不等时返回 null。DTO 在完整比较前用旧 contactDetails 替换这些字段，因此随后可能成功返回一个缺失联系事实的页面，而非明确报错。

本地实测：原 operatingCompany 非空；只给其 label 加 ` (updated)`，DTO 仍返回，但 operatingCompany 变为 null。

About 也存在类似关联：`about-page-v01-dto.ts:132` 固定 evidence contentVersion，141 行比较事实值；213–224 行按显示 label 查事实依赖或决定显示，部分列表按数组位置绑定事实。

建议：用稳定事实 ID 关联内容与披露权限；区分“明确不公开”与“与旧值不同”。隐私/披露控制必须保留，不能将所有 facts 无条件显示。

### C05 — 显示文案承载交互身份（静态确认，行为变更需补测）

`components/sites/tio2-my/legal/malaysia-legal-page.tsx:59` 的 LegalActions 通过匹配 `COOKIE SETTINGS`、`CONTACT US`、`PRIVACY POLICY` 等显示文字决定按钮类型和目标。活动开发分支中仍能观察到相同映射。

这些 labels 目前包含技术语义，不能作为普通字符串任意放宽；若要支持改名/翻译，应拆为稳定 action ID 与 label。当前合法输入仍可能受读取合同约束，未声称任意改名已经能通过新 validator。

### C06 — 复审/时效控制与历史快照绑定（静态确认，需业务政策区分）

`editorial-v01-queries.ts:21` 在查询中调用 freshness 校验；`lib/editorial/editorial-review.ts:137–139` 将当前复审控制字段、内容包 hash、复审日期与代码 evidence manifest 精确比较。

这意味着新的有效复审记录也可能需要同步代码清单。贸易/替代品资料的时效与撤回控制本身有业务目的，不能据本审计取消。应区分“必须有有效复审”与“必须恰好等于某次打包的复审记录”。

### C07 — 法律批准文件参与统计功能开关（静态确认，需明确独立配置）

`components/sites/tio2-my/analytics/malaysia-google-analytics.tsx:14` 默认从法律内容 JSON 的 `releaseControls.optionalAnalyticsAuthorized` 决定是否加载 GTM，即使环境 ID 合法，也可能被该布尔值关闭。

这不是正文字符串相等问题，而是内容合同同时承担功能配置职责。改造时应单列技术启用/授权配置；不能删除用户同意或凭环境 ID 自动授权分析。

## 本轮探针输出

```text
HOME baseline accepted=true; packageId-only change accepted=false
LEGAL heading-only change accepted=false
EDITORIAL baseline accepted=true; safe paragraph addition accepted=false
CONTACT original company visible=true; label-only change company visible=false
PRODUCT SEO uses supplied title=false
```

以上均为合成输入，不是新的批准内容。没有对所有 PHP resolver 运行完整 WordPress 集成。

## 建议后续顺序

1. 让当前法律页任务完成整链验收与最终复审，并核对 C05 的动作语义；不重复其已完成工作。
2. 各页面族成套处理 PHP + DTO + 渲染/SEO，优先覆盖 C01/C03/C04；不要只对搜索命中的函数逐一删除检查。
3. 对 C02/C06/C07 建立“文案字段、结构身份、行为配置、披露/时效政策、历史审批证据”的字段分类，再决定迁移。
4. 每组使用安全内容变化、技术身份/危险输入拒绝、写入原约束保留、实际 CMS 到页面输出四类证据。当前审计不构成全站解耦完成或发布授权。

## 保留边界

准确 site_scope、发布状态、记录唯一性、稳定路由/页面身份、协议和渲染安全、收件/表单行为、披露控制、有效复审及生产包/配置/CMS身份校验不属于可直接删除的文案耦合。

未全面审计 A/B 站、外部服务、生产数据及所有模板表现；本报告是 MY 代码层横向检查与代表性复现结果。

## 补充：CMS / 前端 / 配置 / 构建职责审计

范围：2026-09-13，根工作区 main 的 e2883161；读取生产构建定义、部署执行代码、预发布 Compose、CMS webhook、前端刷新入口及安装版本 Next 文档。不改业务代码，不操作远程环境，不重跑全站构建；当前法律页开发分支的未合并修复不作为本基线已修复的证据。

### C08 — MY 产品路径被 Site A 刷新策略拦截（已复现，高优先级）

`app/(en)/api/revalidate/route.ts` 的 `productIdentityByPath` 只在 `tio2-a` 填充；随后对所有站的 `/products` 路径检查此表。MY 只例外放行两种工艺页，没有放行产品总览和产品详情。

`wordpress/plugins/tio2-site-model/includes/webhooks.php:445` 明确为 MY 产品总览生成 `/products` 事件。`lib/wordpress/product-hub-v01-queries.ts` 则将其读取缓存绑定到 MY 站点、路由和产品总览标签。这是生产者与消费者契约不一致，不是 CMS 内容不合法。

通过内存 TypeScript 加载实际 POST 处理函数、合成合法签名和当前事件时间，仅 mock Next 缓存副作用，得到：

```text
tio2-my /products => 400 Payload targets an unapproved Product path
tio2-my /products/cr-901 => 400 Payload targets an unapproved Product path
tio2-my /products/chloride-process-titanium-dioxide => 200
```

影响：包含这些产品路径的请求在失效操作前被整体拒绝，CMS 更新无法走这条即时刷新链生效；不等于永远无法通过定时更新或重新构建生效。产品详情输入使用现有 registry 路径，但本次未证明其所有 CMS 自动事件生产路径。应按站点复用稳定路由身份，保留跨站拒绝，补 MY 总览/详情及混合批次测试。

### C09 — 缓存身份包含固定内容批准版本（静态确认）

`lib/wordpress/cache-tags.ts` 的 `resourceOriginContentTag`、`resourceProcContentTag` 将内容/关系/元数据批准版本限定为固定字符串；`aboutPageVersionTag` 仅接受 `ABOUT-001-G7-PCR-02:FACTS-V0.1`。

缓存层因此也承载了历史内容版本限制。不能只修改 DTO 就认为解耦完成。应区分稳定页面身份、技术 schema 版本和内容修订号；如保留修订标签，还需稳定标签负责跨修订失效。此项不是新版本内容已在生产出错的实测结论。

### 构建链判断

- `ops/production/Dockerfile` 在 builder 中运行 `npm run build`，通过 BuildKit secret 提供 CMS 读取令牌，复制 `.next` 到 runtime；部署执行器检查 CMS 拓扑并传入构建地址。这种构建时读取 CMS 来预渲染的职责合理。
- 问题在于预渲染复用了 C01 的批准稿相等校验：例如法律页读取链经 PHP `tio2_my_legal_contract_mismatch` 拒绝内容，前端读取异常向上传播；构建会因此受到业务批准快照影响。根因在读取契约，不是 `next build` 不该调用 CMS，也不应靠吞错或旧内容 fallback 绕过。
- `NEXT_PUBLIC_*` 值在构建期固化，已核对安装版本 `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`。部署执行器确实把表单与统计 ID 传入构建参数；配置改变后需要重新构建，单改运行容器环境不足以更新浏览器代码。这是配置生命周期约束，不单独列为缺陷。
- 普通刷新使用 `revalidateTag(tag, 'max')`，内容发布批次使用 `{expire: 0}` 并清理 layout/sitemap。安装版本文档说明前者允许陈旧数据后台刷新，接口回执本身不能证明所有访问者已经看到新内容；发布批次已有后续验证职责，不能据此声称整个系统没有刷新机制。

### 综合判断与边界

优先处理：读取/SEO 的双重内容来源（C01/C03）和产品刷新拒绝（C08）；随后处理显示标签驱动行为、配置混入法律内容、版本混入缓存身份。保留网站身份、发布状态、安全检查、披露授权和部署制品校验。

本轮只证明这些具体问题和机制，不宣称配置全面正确、构建成功或线上问题已修复。未执行发布、CMS 写入、完整构建或生产验收。
