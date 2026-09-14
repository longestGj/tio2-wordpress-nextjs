# W0 — MY 页面覆盖与职责清单

日期：2026-09-13。状态：W0 静态基线梳理完成；页面、字段组职责、事件映射与兼容边界已登记。技术 schema 的逐叶校验实现和真实 CMS 验收属于 W1–W6，不在本轮宣称完成。

## 基线与所有权

- 隔离工作区：D:/16Wordpress_nextjs/.worktrees/cms-responsibility-audit；分支 codex/cms-responsibility-audit；基线 develop 7c849af234602cf299cb75e772a0104f77b849cd。
- 根工作区 main e2883161 的未提交职责文档与审计保持原状；本分支用 apply_patch 保存四份计划/设计/审计输入副本，未复制其他任务代码。
- 法律页独立分支此前读取为 6164e048，存在未提交文档；未改动该工作区，未确认最终复审/合并。其历史进度中相互矛盾的运行记录不作为本任务完成证据。
- 本轮只读源码和记录，无 CMS 数据库访问、安装、构建或生产操作。文档任务不安装依赖、不跑与文档无关的测试。

## 页面入口清单

来源为当前基线 lib/seo/tio2-my-publication-inventory.data.json 的 59 项。58 项具有登记路径，SYS-404 为特殊项；这些数字不是线上验收统计。

族前缀对应 lib/wordpress/<前缀>-queries.ts、<前缀>-dto.ts，以及 wordpress/plugins/tio2-site-model/includes/<前缀>.php。所有列出的 route、query 和 DTO 路径已经存在性检查；PHP 自定义 GraphQL 字段已对应，首页使用 tio2Homepage 内的 homepage-v04 字段。系统两项不经过该 CMS 页面查询链。

| pageId | 公共路径 | 页面入口 | 读取实现族 | 责任包 |
|---|---|---|---|---|
| HOME-001 | / | [route](<../../app/(en)/page.tsx>) | `homepage-v04` | W3-A |
| ABOUT-001 | /about/ | [route](<../../app/(en)/about/page.tsx>) | `about-page-v01` | W3-B |
| MARKET-000 | /markets/ | [route](<../../app/(en)/markets/page.tsx>) | `market-hub-v01` | W3-D |
| MARKET-EU-001 | /markets/european-union/ | [route](<../../app/(en)/markets/european-union/page.tsx>) | `market-page-v01` | W3-D |
| MARKET-EU-DE | /markets/germany/ | [route](<../../app/(en)/markets/germany/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| MARKET-EU-IT | /markets/italy/ | [route](<../../app/(en)/markets/italy/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| MARKET-EU-ES | /markets/spain/ | [route](<../../app/(en)/markets/spain/page.tsx>) | `market-country-v01` | W3-D |
| MARKET-EU-PL | /markets/poland/ | [route](<../../app/(en)/markets/poland/page.tsx>) | `market-page-poland-v01` | W3-D |
| MARKET-EU-NL | /markets/netherlands/ | [route](<../../app/(en)/markets/netherlands/page.tsx>) | `market-country-v01` | W3-D |
| MARKET-EU-BE | /markets/belgium/ | [route](<../../app/(en)/markets/belgium/page.tsx>) | `market-country-v01` | W3-D |
| MARKET-UK-001 | /markets/united-kingdom/ | [route](<../../app/(en)/markets/united-kingdom/page.tsx>) | `market-page-uk-v01` | W3-D |
| MARKET-IN-001 | /markets/india/ | [route](<../../app/(en)/markets/india/page.tsx>) | `market-country-v01` | W3-D |
| MARKET-BR-EN | /markets/brazil/ | [route](<../../app/(en)/markets/brazil/page.tsx>) | `market-page-brazil-en-v01` | W3-D |
| MARKET-BR-PT | /pt-br/markets/brazil/ | [route](<../../app/(pt-br)/pt-br/markets/brazil/page.tsx>) | `market-page-brazil-pt-v02` | W3-D |
| PRODUCT-000 | /products/ | [route](<../../app/(en)/products/page.tsx>) | `product-hub-v01` | W3-C |
| PRODUCT-PROC-CL | /products/chloride-process-titanium-dioxide/ | [route](<../../app/(en)/products/chloride-process-titanium-dioxide/page.tsx>) | `product-process-chloride-v01` | W3-C |
| PRODUCT-PROC-SU | /products/sulfate-process-titanium-dioxide/ | [route](<../../app/(en)/products/sulfate-process-titanium-dioxide/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| GRADE-M350 | /products/m-350/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M510 | /products/m-510/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M896 | /products/m-896/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M996 | /products/m-996/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M2196 | /products/m-2196/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M895 | /products/m-895/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M200 | /products/m-200/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M108 | /products/m-108/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M210 | /products/m-210/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M340 | /products/m-340/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M886 | /products/m-886/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M52 | /products/m-52/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-M2377 | /products/m-2377/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| GRADE-CR901 | /products/cr-901/ | [route](<../../app/(en)/products/[familySlug]/page.tsx>) | `product-detail-v01` | W3-C |
| APP-000 | /applications/ | [route](<../../app/(en)/applications/page.tsx>) | `application-hub-v01` | W3-A |
| APP-COAT | /applications/titanium-dioxide-for-coatings/ | [route](<../../app/(en)/applications/titanium-dioxide-for-coatings/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| APP-PLAS | /applications/titanium-dioxide-for-plastics/ | [route](<../../app/(en)/applications/titanium-dioxide-for-plastics/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| APP-MB | /applications/titanium-dioxide-for-masterbatch/ | [route](<../../app/(en)/applications/titanium-dioxide-for-masterbatch/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| APP-INK | /applications/titanium-dioxide-for-printing-inks/ | [route](<../../app/(en)/applications/titanium-dioxide-for-printing-inks/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| APP-PAPER | /applications/titanium-dioxide-for-paper/ | [route](<../../app/(en)/applications/titanium-dioxide-for-paper/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| DOC-000 | /documents/ | [route](<../../app/(en)/documents/page.tsx>) | `documents-hub-v01` | W3-F |
| DOC-REACH | /documents/reach/ | [route](<../../app/(en)/documents/reach/page.tsx>) | `document-reach-v01` | W3-F |
| DOC-TDS | /documents/tds-sds-coa/ | [route](<../../app/(en)/documents/tds-sds-coa/page.tsx>) | `document-tds-v01` | W3-F |
| DOC-COO | /documents/certificate-of-origin/ | [route](<../../app/(en)/documents/certificate-of-origin/page.tsx>) | `document-coo-v04` | W3-F |
| CONV-DOC | /request-documents/ | [route](<../../app/(en)/request-documents/page.tsx>) | `request-documents-v01` | W3-G |
| RES-000 | /resources/ | [route](<../../app/(en)/resources/page.tsx>) | `resource-hub-v01` | W3-E |
| RES-ORIGIN | /resources/non-china-titanium-dioxide/ | [route](<../../app/(en)/resources/non-china-titanium-dioxide/page.tsx>) | `resource-origin-v01` | W3-E |
| RES-PROC | /resources/chloride-vs-sulfate-titanium-dioxide/ | [route](<../../app/(en)/resources/chloride-vs-sulfate-titanium-dioxide/page.tsx>) | `resource-proc-v01` | W3-E |
| RES-CHEMOURS | /resources/chemours-titanium-dioxide-alternatives/ | [route](<../../app/(en)/resources/chemours-titanium-dioxide-alternatives/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| RES-R706 | /resources/ti-pure-r-706-alternative/ | [route](<../../app/(en)/resources/ti-pure-r-706-alternative/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| RES-TRADE-EU | /resources/eu-titanium-dioxide-anti-dumping-duty/ | [route](<../../app/(en)/resources/eu-titanium-dioxide-anti-dumping-duty/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| RES-TRADE-UK | /resources/uk-titanium-dioxide-anti-dumping-investigation/ | [route](<../../app/(en)/resources/uk-titanium-dioxide-anti-dumping-investigation/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| RES-TRADE-IN | /resources/india-titanium-dioxide-anti-dumping-duty/ | [route](<../../app/(en)/resources/india-titanium-dioxide-anti-dumping-duty/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| RES-TRADE-BR | /resources/brazil-titanium-dioxide-anti-dumping-duty/ | [route](<../../app/(en)/resources/brazil-titanium-dioxide-anti-dumping-duty/page.tsx>) | `editorial-v01` | W3 共享 editorial |
| CONV-RFQ | /request-a-quote/ | [route](<../../app/(en)/request-a-quote/page.tsx>) | `rfq-page-v01` | W3-G |
| CONV-SAMPLE | /request-sample/ | [route](<../../app/(en)/request-sample/page.tsx>) | `request-sample-v01` | W3-G |
| CONTACT-001 | /contact/ | [route](<../../app/(en)/contact/page.tsx>) | `contact-page-v01` | W3-B |
| LEGAL-PRIV-EN | /privacy-policy/ | [route](<../../app/(en)/privacy-policy/page.tsx>) | `legal-pages-v01` | W1 |
| LEGAL-PRIV-MS | /ms/privacy-policy/ | [route](<../../app/(ms)/ms/privacy-policy/page.tsx>) | `legal-pages-v01` | W1 |
| LEGAL-COOKIE-EN | /cookie-policy/ | [route](<../../app/(en)/cookie-policy/page.tsx>) | `legal-pages-v01` | W1 |
| SYS-404 | 未匹配路径的 404 | [route](<../../app/(en)/[...path]/not-found.tsx>) | 代码系统内容 | W6 |
| CONV-THANK | /thank-you/ | [route](<../../app/(en)/thank-you/page.tsx>) | 代码系统内容 | W3-G/W6 |

## 共享实现与拆批约束

1. 14 个 MY 牌号共用 app/(en)/products/[familySlug]/page.tsx；该路由同时服务 Site A 家族页。不得把参数名误当作 MY 家族模型，也不得修改 Site A 分支行为。
2. editorial 统一承接德国、意大利、硫酸法、五个应用详情和六个资源详情，共 14 项。lib/editorial/malaysia-editorial-route.tsx 统一读取、SEO 和异常处理。按页面业务分组不代表可各自修改同一个共享 DTO；技术读契约只设一个实施所有者，各组追加向量与验收。
3. 四个 country 市场页共用 lib/markets/malaysia-country-market-route.tsx。首页经 homepage-queries.ts 的 site/template 分派进入 homepage-v04，旧 A/B 读取必须保留。
4. SYS-404 和 CONV-THANK 目前是代码系统内容：本次保留其来源，不为满足 CMS 唯一来源而新建内容模型；W6 核对状态与 SEO，Thank You 保留会话/表单语义。
5. 当前 editorial 将 freshness/contract/upstream 异常记录原因后转为 notFound。后续故障验收必须按这条现状判断，不笼统预设全站都抛出 500 或阻断预渲染。
6. editorial-v01-queries.ts 使用 React cache 包装和 fetch `no-store`，同时携带 tags；有标签不代表请求采用持久 Data Cache。产品详情等查询则使用客户端默认缓存。更新验收须按真实策略分组，不把所有页面当成同一 ISR 链路。

## 字段责任裁定表

逐文件 646 个顶层字段/子树的职责与基线哈希见[字段结构清单](2026-09-13-cms-decoupling-w0-fields.json)；复合子树的嵌套分类、26 个读取族的记录/事件/缓存对应、兼容与未修复项见[边界说明](2026-09-13-cms-decoupling-w0-boundaries.md)。这是一份职责规划，不是 9056 个叶值全部获准编辑的声明。实际组件与 SEO import 见[消费者清单](2026-09-13-cms-decoupling-w0-consumers.json)。

| 字段/含义 | 运行职责 | 后续迁移与保留边界 |
|---|---|---|
| hero/body/heading/title/description 等展示文本 | CMS 内容 | 技术结构与安全校验，禁止旧稿相等门槛；字段是否存在以本族模型为准 |
| SEO title/metaDescription/OG/Twitter 文案 | CMS 内容 → SEO 转换 | 不再由 publication inventory 静态文案覆盖；canonical/robots 不跟随自由文本 |
| siteScope/pageId/locale/path/gradeCode | 稳定身份 | 前后端一致核验，禁止跨站与未知路由 |
| schemaVersion/contractVersion | 技术兼容 | 明确支持版本，不当作内容批准版本；不能统一删除 |
| packageId/packageSha256/历史批准快照 | 审批追踪 | 写入/发布与证据侧保留；不让旧正文哈希决定正常读是否有效 |
| currentReview/nextReviewDue/status/eventStatus | 时效政策及当前复审状态 | 保留到期、未核实和撤回拒绝；与历史证据逐字段相等分离，尚需 W3-E 逐字段契约 |
| contactDetails 的 label/value | 内容与受控事实 | 文案标签不决定事实存在；披露权限另行校验，不自动放开事实变化 |
| action label / action ID | 内容 / 前端动作白名单 | 新 ID 与旧记录兼容转换需逐项列清；不得生产静默猜测 |
| optionalAnalyticsAuthorized | 网站/环境授权政策 | 从法律内容中拆出但不能扩大授权；ID 和同意另作条件 |
| 媒体/下载 URL | 内容引用与安全/归属 | 保留允许目标及媒体发布边界，本轮不迁移文件 |
| 缓存内容版本字符串 | 缓存追踪 | 使用稳定身份负责跨修订失效，技术版本与内容修订分开 |

## W0 验收与后续边界

- 页面清单已定位 59/59 入口；55 份合同覆盖 57 项 CMS 页面，系统 404/Thank You 单列。
- 实际记录类型、metadata 权威入口、组件/SEO imports、缓存标签、CMS 事件生产者和旧数据兼容已登记；具体 schema、转换代码、红绿测试和真实运行仍需各实施包完成。
- 各组应用合法内容变化、非法技术输入拒绝、写入约束保留、真实 CMS 到页面结果四类证据；W2 API mock 只证明失效调用。
- 重点防止遗漏：共享外壳、列表/导航/sitemap 依赖、动态 editorial、表单状态页及 A/B 消费者。
- W0 完成只代表静态承接基线齐备，不关闭 C01–C09 或新发现 W0-E1–E5，不证明法律分支已接收或生产状态。
