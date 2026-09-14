# W0 — 字段职责、兼容与更新链基线

基线：develop `7c849af234602cf299cb75e772a0104f77b849cd`。只读静态核对，未读取或变更实际 CMS 数据。本文件与[59 项入口清单](2026-09-13-cms-decoupling-w0-inventory.md)、[字段结构清单](2026-09-13-cms-decoupling-w0-fields.json)共同构成 W0 输出。

## 1. 字段覆盖方法与边界

字段结构清单逐文件记录 55 份页面合同，覆盖 57 项 CMS 页面；另外两项是代码系统内容。55 份包含法律集合文件，不能将文件数当作页面数。登记 646 个顶层字段/子树的主责与文件 SHA-256；它们包含 9056 个叶值出现位置，但本轮没有把这些叶值逐个批准为可编辑字段。

W0 固定的是职责和迁移边界，不生成新的技术校验白名单。嵌套复合字段按下面的规则拆解；每族执行 W3 时必须将其落实成精确 schema 和测试，不能凭 `content` 分类删除整个子树的结构/URL/权限限制。

| 清单 role | 主责与唯一来源 | 保留/拆分规则 |
|---|---|---|
| content | CMS 的受控业务内容 | 文本、事实、技术参数和显示顺序属于内容；内嵌稳定 ID、行为、URL 和披露状态按下表分开 |
| evidence | 策划/批准与发布证据 | 包编号、源文件、哈希和历史基线保留；读取不要求新内容等于旧快照。source 中被展示的来源名称/日期须投影为内容，不靠哈希替代真实性 |
| identity | 网站/页面/语言及共享组件身份 | 固定作用域与路由身份；identity 中的批准/内容修订号移交 evidence，不等同技术 schema |
| technical | 前端/CMS 接口与呈现技术约定 | schema、模板支持范围、CSS class、布局约束；不要通过固定旧段落个数实现结构安全 |
| policy | 发布、披露、证据与复审政策 | 保留业务状态、有效期限和准入；与历史文案相等分离。moduleStatus 不是可随文案修改的布尔开关 |
| action | 前端行为与受控关系 | 路由身份、目标 scope、接收字段、预填约定由技术合同管理；显示标签由 CMS 提供 |
| consent | 网站启用政策及访问者偏好 | 法律解释文案与运行开关分离；保持既有 Consent Mode 行为，见第 6 节 |
| seo | CMS 文案 + 前端输出/发布策略 | title/description/h1/图像替代文字与事实取 CMS；canonical、语言映射、robots、schema 类型归技术/授权 |
| media | CMS/静态资产引用 | alt 等描述归内容；src、尺寸和资源归属按允许范围校验；不执行文件迁移 |
| sources | 来源内容 + 证据有效性 | 显示来源和日期取对应已核验内容；可用性/复审和批准记录独立，不硬编码当前文案 |
| form | 前端输入/接收协议 + CMS 显示文案 | 标签、提示、错误消息可作为内容；name/control/required/枚举值/接收约束不能随文案漂移 |
| collection | 法律集合容器 | pages 各记录按 pageId 拆分；record 身份、文案、SEO、状态分别归属，集合外 consent/overlay 不能丢失 |

### 嵌套字段的强制优先规则

| 字段形态/上下文 | 明确归属与验证 |
|---|---|
| `siteScope/site_scope`、`pageId/page_id`、`targetPageId`、`sourcePageId`、`gradeId/gradeCode`、`slug`、`locale`、`routeKey`、`relationKey/edgeId/stableId` | 稳定身份；类型、唯一性、目标网站和存在性检查 |
| `href/url/src`、`canonical/canonicalPath`、`targetPath/receiverPath`、带 prefill 的链接 | URL 安全、路由/媒体归属及允许行为；链接标签另属内容。不是任意 URL 都能编辑 |
| `label/title/heading/body/text/answer/question/placeholder/alt` 及 `form.errors.*` | 显示内容；不作为动作或事实显隐选择器；保留长度、转义与支持的渲染结构 |
| `value` | 技术参数/事实值为受控内容；form option 的 value、预填/传输值为行为协议，不能只按键名归类 |
| `id/key/name/type/style/control/required/requiredWhen` | 组件、表单与关系上下文下为技术/动作协议；业务人名或组织名称为内容，不用通用正则直接改运行校验 |
| `status/*Status/releaseState/publicEligibilityStatus/render_when` | 依据所在模块的发布/披露/复审含义保留；不因它位于内容块内而改成自由文案 |
| `packageId/reviewId/*Sha256/sourceFile/approvedBaselineId` | 追踪证据；技术读取不以历史全文匹配门禁，但证据本身不被删除 |
| `schemaVersion/contractVersion/templateVersion` | 明确技术兼容集合；`contentVersion/contentRevision/relationRevision` 分别记录内容/关系修订，不固定某次批准编号 |
| `lastReviewed/nextReviewDue/evidenceDate/checkedAt/eventStatus` | 保留复审政策、时区与到期拒绝；从历史快照相等比较迁移至当前有效复审记录 |
| `schema/schemaGraph` 内 `@type/@context/@id` 与 name/description/address 等 | schema 结构/实体身份由技术生成；其中业务事实和描述取相同 CMS 来源 |
| HTML/Markdown、带嵌套数组的 modules/sections | 文本归 CMS，结构支持范围归前端；支持范围内增减段落不与旧稿比数量，不静默丢弃合法正文 |

## 2. 26 个读取族的记录与事件对应

文件约定：族名对应 `lib/wordpress/<族>-queries.ts`、`<族>-dto.ts`、插件 `includes/<族>.php`。各合同 metadata 的准确值见 `wordpress/release/registry.php` 26 项白名单及 PHP 的 `*_CONTRACT_META`，不改为包任意指定数据库字段。

下表 F 表示当前 GraphQL 客户端默认 force-cache；N 表示显式 no-store。全站查询同时有站点/路由等标签，专属标签函数列于表内。表中通知是普通 WordPress webhook 静态映射，不是实际送达证明。

| 读取族 | CMS post_type | 专属查询标签 | 模式 | 普通 CMS 事件/前端接收 |
|---|---|---|---|---|
| homepage-v04 | tio2_homepage | homepageContentTag | F | post 变化映射 `/`；合同 JSON meta 不在通用 homepage 前缀中，单独 meta 写入触发需补 |
| about-page-v01 | tio2_about_page | aboutPageContentTag + aboutPageVersionTag | F | 合同/evidence meta → `/about`；稳定标签可失效，版本标签仍固定旧批准号 |
| market-hub-v01 | tio2_market_hub | marketHubContentTag | F | 普通 webhook 类型缺失；手动签名 `/markets` 接收端有标签 |
| market-page-v01 | tio2_market_page | marketPageContentTag | F | 合同 meta → EU 路径，接收端映射存在 |
| market-page-uk-v01 | tio2_market_page | marketPageContentTag | F | 合同 meta → UK 路径，接收端映射存在 |
| market-page-poland-v01 | tio2_market_page | marketPageContentTag | F | 合同 meta → Poland 路径，接收端映射存在 |
| market-country-v01 | tio2_market_page | marketPageContentTag | F | 四国合同 meta → 各 path，接收端有 pageId 映射 |
| market-page-brazil-en-v01 | tio2_market_page | marketPageContentTag | F | EN 合同 meta → EN path；双语关联还需 W5 验证 |
| market-page-brazil-pt-v02 | tio2_market_page | marketPageContentTag | F | PT 合同 meta → PT path；双语关联还需 W5 验证 |
| editorial-v01 | tio2_my_editorial | editorialTag | N | contract/review/pageId meta → registry path；TRADE 页额外带 `/resources` |
| product-hub-v01 | tio2_product_hub | productHubContentTag | F | 合同 meta → `/products`，被前端产品准入拒绝（C08） |
| product-process-chloride-v01 | tio2_product_hub | productProcessContentTag | F | 合同 meta → 氯化法 path，接收端显式放行 |
| product-detail-v01 | tio2_grade | productDetailContentTag | F | 类型包含但无 MY grade 路径分支，普通合同 meta 也未列入；特定 post 事件可能走空 paths 的站点级刷新。显式详情 path 被接收端拒绝 |
| application-hub-v01 | tio2_application_hub | applicationHubContentTag | F | 普通 webhook 类型缺失；接收 `/applications` 依靠 route/site，无专属标签分支 |
| documents-hub-v01 | tio2_documents_hub | documentsHubContentTag | F | 合同 meta → `/documents`，接收端映射存在 |
| document-tds-v01 | tio2_doc_tds | documentTdsContentTag | F | 合同 meta → TDS path，接收端映射存在 |
| document-reach-v01 | tio2_doc_tds | documentReachContentTag | F | 合同 meta → REACH path；独立 source readiness meta 未列入此通知条件 |
| document-coo-v04 | tio2_doc_tds | documentCooContentTag | F | 合同 meta → COO path，接收端映射存在 |
| request-documents-v01 | tio2_request_docs | requestDocumentsContentTag | F | 合同 meta → `/request-documents`，接收端映射存在 |
| request-sample-v01 | tio2_request_sample | requestSampleContentTag | F | 合同 meta → `/request-sample`，接收端映射存在 |
| rfq-page-v01 | tio2_rfq_page | rfqPageContentTag | F | 普通 webhook 类型缺失；接收 RFQ path 依靠 route/site |
| contact-page-v01 | tio2_contact_page | contactPageContentTag | F | 普通 webhook 类型缺失；接收 Contact path 依靠 route/site |
| resource-hub-v01 | tio2_resource_hub | resourceHubContentTag | F | 合同/relations meta → `/resources`；被引用子记录的指定 meta 变化也追加此 path |
| resource-origin-v01 | tio2_document | resourceOriginContentTag | F | 合同/relations/article metadata → origin path；按 hub 引用追加 `/resources` |
| resource-proc-v01 | tio2_document | resourceProcContentTag | F | 合同/relations/sources/article metadata → proc path；按 hub 引用追加 `/resources` |
| legal-pages-v01 | tio2_legal_page | legalPagesContentTag | F | 合同 meta → 对应法律 path；查询读取三个页面集合，依赖共享 legal 标签 |

对 F 查询，未特别指定 no-store 即沿用 client.ts 默认，并不代表路由都具备相同预渲染或 revalidate 周期。DOC-TDS/REACH/COO 的查询没有通用 siteTag，不能仅刷新 siteTag 就推断覆盖这些查询。

### 两种更新路径必须分开

- **普通编辑通知**：webhooks.php 的类型、相关 meta、发布状态变化和 scope hooks → 进程内队列 → 签名 HTTP 请求。队列 flush 清空后调用发送函数；本处没有持久重试和实际页面验证，不得描述为可靠消息队列。
- **受控内容发布**：wordpress/release/registry.php 按 pageId 定位受控 metadata；ops/production/server/content_hooks.py 从配置 pageId→path 构造带 contentRelease 的签名事件；前端立即过期并清 layout/sitemap；发布验证器另看实际输出。此路径不依赖每个普通编辑 hook，但仍受同一前端路径拒绝影响。
- 已存在维护窗口和恢复规则继续有效。本次没有确认这些程序在服务器上的安装或当前运行状态。

## 3. 组件与 SEO 对应规则

59 项 route 是最终接线入口，各入口 import 的组件/metadata 文件是改造消费者；不能以 config JSON 已更新代替它们已改。

- 首页经 homepage-queries.ts 分派，homepage-renderer.tsx 按版本选择组件；修改限定 MY v0.4。
- 产品详情共用 `[familySlug]` 路由，调用 malaysia-product-detail、product-detail-metadata 和 product-detail-jsonld；保留 Site A 的 ProductPageRenderer 分支。
- editorial 14 项经 malaysia-editorial-route.tsx 统一使用 malaysia-editorial-page 和 editorial-metadata（内含 JSON-LD）。四国页经 malaysia-country-market-route.tsx 使用 malaysia-country-market-page 和 market-country-metadata。
- 其他单页在各 route 显式导入 `components/sites/tio2-my/` 组件与 `lib/seo/` builder。精确 import 证据见[消费者清单](2026-09-13-cms-decoupling-w0-consumers.json)，用于 W3 文件冻结而非新增运行依赖。
- publication inventory 中的 59 项是发布策略和历史文案的混合。保留路径、语言、索引授权；可编辑 title/description 迁移至 DTO。系统 404 与 Thank You 不强制进入 CMS。

## 4. 数据兼容与迁移判定

| 变更 | 旧数据读取 | 数据写入/转换 | 回退边界 |
|---|---|---|---|
| 移除读取旧正文比较 | 新读端先接受原合同形态，再接受技术兼容新内容 | 不要求改数据库；seed/导入批准规则仍单独保留 | 旧读端可能拒绝已经更新的内容，回退先测当前内容 |
| CMS SEO 投影 | 现有 seo 字段可直接使用 | 缺字段必须报告或按明确技术规则生成，不能偷偷回填旧稿 | 保留 canonical/robots 策略，核对旧版接受性 |
| 段落/HTML 支持结构解耦 | 原合法结构继续显示；新结构只限 renderer 支持集合 | 不批量重写正文或媒体 | 新正文不能交给不支持的旧 renderer |
| action ID 分离 | 旧记录可能只有 label 或 Markdown Actions | 仅在受控转换阶段按已确认结构/动作映射；明确版本，不能让运行时猜标签成为永久兼容层 | 新动作字段与前端配套，未验证不单独切换 |
| analytics 授权配置分离 | 原法律内容保持不变 | 独立配置继承原有效授权，不扩大；生效阶段明确 | 回退必须保留同意模式、ID 及授权一致性 |
| 缓存标签稳定化 | 无需改内容记录 | 新旧标签共存或全面失效在测试中验证，不靠手工改批准编号 | 旧实例可能保留缓存；按授权切换/验证，不默认一致 |
| evidence/freshness 分离 | 当前有效状态、期限、时区必须仍可判断 | 当前复审记录与政策需独立来源；历史哈希不删除，不把无证据改成 verified | 不兼容/过期状态继续失败关闭 |
| 路由/接收/索引/披露调整 | 不属于本次文案解耦的自动迁移 | 若确需改变原业务含义，另提具体差异 | 不用技术计划扩大授权 |

以上是仓库模型兼容策略，不是对现网全部记录的有效性证明。实际数据快照只在获准环境与对应 W1/W3/W6 验证；没有为完成 W0 连接生产的需要。

## 5. 新发现与验收责任

| ID | 基线发现 | 责任包与关闭证据 |
|---|---|---|
| W0-E1 | 四种 CMS 自定义 post_type 不在普通 webhook 类型列表 | W5：合法发布/修改/撤回事件链测试；不能以控制器主动刷新掩盖普通编辑缺口 |
| W0-E2 | MY grade 普通事件缺准确路径和合同 meta 匹配；显式 path 又被拒绝 | W2 处理接收；W5 补事件生产、相关列表和实际更新证据 |
| W0-E3 | 首页合同 JSON 与 REACH source readiness 的单独 meta 修改未被相应通用条件覆盖 | W3 对应族/W5：真实 meta 修改→事件→正确内容/可用性输出；post 保存事件不能冒充 meta-only 验证 |
| W0-E4 | 精确刷新分支不等于所有依赖关系已覆盖，且部分查询无 siteTag | W5：按本表精确/广域/混合批次观察所有声明依赖 |
| W0-E5 | 总计划“未同意不加载统计”与现有 Consent Mode 模型不一致 | W4：按第 6 节修正验收，不因职责解耦改变模式 |

这些缺陷的修复不是 W0 工作；W0 的终点是准确定位、明确归属、给出后续验证要求，不把静态核对记成修复。

## 6. 需要保留的 Analytics 语义

现有 MalaysiaGoogleAnalytics 在网站/启用授权/ID 有效时，beforeInteractive bootstrap 设置四项 consent 默认 denied，随后加载 GTM；不是等访问者同意才加载 GTM。现有法律内容亦描述 denied 状态下可能存在有限 cookieless signals。

职责解耦只迁移启用授权来源，不自动将当前模型改成“完全不加载”。W4 验收应检查 bootstrap 先设置 denied、广告三项不被自动授予、访问者选择与撤回按原合同处理，而不是把拒绝同意等同于脚本不存在。真实外部 GTM 配置与网络行为仍需独立证据，本轮未调用外部统计。

总计划原有绝对“不加载”表述作为 W0 发现予以纠正，以已批准的“保留既有业务/同意行为”原则为准；若用户另要更换统计模式，则需单独审查具体政策和文案差异。

## 7. 法律页承接快照

2026-09-13 本轮只读核对：法律工作分支已到 `02d5c1d8`，工作树干净。其 `docs/verification/cms-read-decoupling-legal.md` 记录代码与测试、两轮清理修正，并明确最新成功真实运行绑定 `2f9a30b7`，不冒称后续清理提交已重跑成功链路。

`git merge-base --is-ancestor 02d5c1d8 develop` 返回 1，该提交尚不是本基线 develop 的祖先。W1 应消费该回执和真实差异，核对复审与集成；不得重做既有法律改造，也不得因新回执存在就直接认定已合入或全站完成。
