# tio2products.com 首页模板设计（homepage-v0.1）

## 1. 提案与审批记录

- 提案 ID：`homepage-v0.1`
- 目标站点：`tio2-a` / `https://tio2products.com`
- 隔离验证站点：`tio2-b` / `https://tio2hub.com`
- 设计状态：已获完整提案批准，尚未进入实施
- 完整审批原文：`同意第6端，并确认为完整提案`
- 已批准视觉方向：C — Credibility Editorial
- 外部动作：`none`

此前对“WordPress 专用首页内容类型、每站一条独立记录、固定版本化 DTO 和可复用 Next.js 组件”的批准仅建立架构前提。本文件记录随后逐段批准的完整字段、数据、组件、视觉、SEO、测试和本地验收契约。

## 2. 目标与成功标准

为 `tio2products.com` 建立项目级 Homepage Agent、Homepage Skill 和版本化首页模板。首页同时服务两类买家：

1. 工业终端与配方企业通过产品或应用入口发现合适的 TiO₂ 路径；
2. 经销商、进口商和批量采购商通过供应询价入口提交需求。

首屏主转化动作是提交询价/技术需求表单，产品浏览是次要动作。v0.1 仅提供英文首页、本地设计、本地预览和本地验收。RFQ 表单具备完整交互、校验和成功状态，但不发送、不存储任何数据。

成功必须有以下可核查结果：

- WordPress 能独立编辑两站的首页记录，且不会共享记录；
- Next.js 只消费稳定 `HomepageDto`，不让组件依赖 ACF 原始响应；
- `tio2-a` 显示获批首页，`tio2-b` 使用独立测试记录证明隔离；
- 页面符合获批的固定区块顺序和视觉方向 C；
- SEO、内部链接、响应式、无障碍、性能和错误路径均有自动测试；
- 两站现有构建、每站 505 个公开 URL 清单、Preview、Webhook、Sitemap、404 和产品详情行为保持通过；
- 不推送、不部署、不修改 DNS、不启用索引、不触碰远端或生产资源。

## 3. 非目标

- 不设计或实现产品详情页；
- 不修改 Product Agent 所有的 Product schema、DTO、详情模板或测试；
- 不建设自由页面构建器、可排序区块或任意 HTML 编辑区；
- 不建设真实邮件、CRM、数据库或 WordPress RFQ 收件箱；
- 不建设多语言、生产发布、分析追踪、聊天插件或站内搜索；
- 不复制参考站品牌、Logo、文案、图片或像素级视觉；
- 不保证搜索排名、搜索量、询盘数量或索引时间。

## 4. 已确认业务事实与证据边界

用户确认以下事实可以直接用于首页，无需附加来源文件：

> 部分产品自有生产，部分由代工/合作工厂生产。

首页必须准确区分自有生产与代工/合作生产，不得将全部产品描述为自有生产。具体产能、认证、性能数字、市场覆盖数字、排名、客户数量和其他量化或第三方可验证声明，只有存在明确来源时才能发布；否则对应字段留空且组件不渲染。

关键词是 v0.1 的编辑假设，不表示已有精确搜索量。初始主题包括：`titanium dioxide supplier`、`TiO2 supplier`、`titanium dioxide products`、`rutile titanium dioxide`、`anatase titanium dioxide`、`coatings`、`plastics`、`masterbatch`、`inks`、`paper`、`China titanium dioxide supplier`。

参考首页 `https://www.titantitanium.cn/` 仅用于学习“产品发现 → 应用匹配 → 询盘流程 → 信任理由 → FAQ → 询价”的信息节奏。所有品牌、文案和媒体重新创作。

## 5. 项目级 Homepage Agent 与 Skill

### 5.1 项目文件

- `.codex/agents/tio2-home-template.toml`
  - `name = "tio2_home_template"`
  - 窄职责：首页内容 schema、首页 GraphQL/DTO、首页模板、首页 SEO、fixtures 和测试。
- `.agents/skills/tio2-home-template/SKILL.md`
  - `name: tio2-home-template`
- `.agents/skills/tio2-home-template/references/homepage-template-contract.md`
- `.agents/skills/tio2-home-template/references/wordpress-field-contract.md`
- `.agents/skills/tio2-home-template/references/quality-gates.md`
- `.agents/skills/tio2-home-template/agents/openai.yaml`
- 根 `AGENTS.md` 增加首页任务路由，并保留 Product Agent 的既有边界。

这些全部位于仓库内。不得创建 `~/.codex/agents`、`~/.agents/skills` 或其他个人级配置。

### 5.2 模式

**Design**

- 在没有完整审批记录时使用；
- 只读检查并返回版本化提案；
- 不写代码、schema、测试、配置或规格文件；
- 由父 Agent 负责向用户呈现和记录审批。

**Implement**

- 只接受完整审批记录：提案 ID、准确提案文件路径、用户原文批准、获批范围与决策；
- 对本提案而言，审批记录必须引用本文件和原文 `同意第6端，并确认为完整提案`；
- 严格使用 TDD，记录 RED 和 GREEN；
- 只实现 `homepage-v0.1`，发现材料变化必须返回 Design 并重新审批。

**Audit**

- 只在显式审计请求提供提案 ID 和准确提案路径时使用；
- 始终只读；
- 报告文件与契约证据，不顺手修复；
- 修复必须重新以 Implement 模式派发。

### 5.3 所有权

Homepage Agent 拥有：

- 首页专用 WordPress 内容类型和字段；
- 首页 GraphQL operation、生成类型、adapter 和 `HomepageDto`；
- 根路由的首页数据装配、首页模板与区块组件；
- 首页 metadata、JSON-LD、fixtures 与测试。

Homepage Agent 不拥有：

- 产品详情 schema、DTO、模板或组件；
- 未经单独批准的全局导航、站点配置、设计 token 或跨模板基础组件；
- 批量内容生产、部署、DNS、索引或任何外部动作。

每次交接必须声明模式、提案 ID、决策、未决项、变更文件、验证证据、迁移影响以及 `external actions: none`。

## 6. 系统架构

```text
WordPress tio2_homepage（每站独立一条）
        ↓ GetHomepage GraphQL operation
committed generated GraphQL types
        ↓ strict homepage adapter
HomepageDto（固定 homepage-v0.1）
        ↓
app/page.tsx → SiteShell → HomepageTemplate → focused sections
```

架构不复用旧的通用 `ContentPageDto` 渲染首页。旧 Page/Post 路由继续使用原有 DTO；只有根路由切换到专用首页契约。

## 7. WordPress 内容模型

### 7.1 内容类型与身份

- Post type：`tio2_homepage`
- GraphQL single/plural：`Tio2Homepage` / `Tio2Homepages`
- WordPress 注册行为：`public=false`、`show_ui=true`、`show_in_rest=true`、`show_in_graphql=true`、`publicly_queryable=false`、`has_archive=false`、`rewrite=false`；WordPress 本身不产生第二套公开首页 URL；
- 支持项仅为内部 title、revisions 和必要的编辑能力；页面正文不使用 Gutenberg 自由内容；
- 固定 schema 版本：`homepage-v0.1`
- 固定公共路径：`/`
- 确定性内部 slug：`${siteId}--homepage`
- 每条记录必须且只能关联一个受支持的 `site_scope`；
- 每个站点最多存在一条非 revision、非 autosave 的首页记录，包括草稿；
- 发布前必须确认没有 Page/Post 或另一首页记录占用当前站点的 `/`；
- 重复、跨站、无 site scope、错误 schema 版本或路由冲突必须失败关闭。

### 7.2 字段契约

所有文案字段为纯文本；不提供任意 HTML。稳定 ACF field key 在实施时使用下表给出的 key，不随标签文案变化而重命名。

| 稳定 field key / machine name | 编辑类型与基数 | 验证和默认 | GraphQL → DTO → 渲染 | 证据规则 |
|---|---|---|---|---|
| `field_tio2_home_schema_version` / `homepage_schema_version` | hidden text，必填 | 默认且只能为 `homepage-v0.1` | `schemaVersion` → `identity.schemaVersion` → route/adapter | 不适用 |
| `field_tio2_home_hero_eyebrow` / `hero_eyebrow` | text，必填 | 1–80 字符 | `heroEyebrow` → `hero.eyebrow` → `HomepageHero` | 定位文案 |
| `field_tio2_home_hero_heading` / `hero_heading` | text，必填 | 1–90 字符；页面唯一 H1 | `heroHeading` → `hero.heading` → `HomepageHero` | 不得扩展制造边界 |
| `field_tio2_home_hero_summary` / `hero_summary` | textarea，必填 | 1–320 字符 | `heroSummary` → `hero.summary` → `HomepageHero` | 按事实分类 |
| `field_tio2_home_hero_primary_label` / `hero_primary_label` | text，必填 | 1–32 字符；href 固定为 `#rfq` | `heroPrimaryLabel` → `hero.primaryCta.label` → `HomepageHero` | 不适用 |
| `field_tio2_home_hero_secondary_label` / `hero_secondary_label` | text，必填 | 1–32 字符 | `heroSecondaryLabel` → `hero.secondaryCta.label` → `HomepageHero` | 不适用 |
| `field_tio2_home_hero_secondary_path` / `hero_secondary_path` | text，必填 | 本站相对路径，最长 172；不得为 `/` | `heroSecondaryPath` → `hero.secondaryCta.href` → `HomepageHero` | 目标必须存在 |
| `field_tio2_home_hero_image` / `hero_image` | image ID，可选，单值 | JPEG/PNG/WebP/AVIF；缺失时文字优先布局 | `heroImage` → `hero.image` → `HomepageHero` | 禁止复制参考站素材 |
| `field_tio2_home_hero_image_alt` / `hero_image_alt` | text，条件必填 | 非装饰图片 1–160；装饰图片保存空字符串 | `heroImageAlt` → `hero.image.alt` → `HomepageHero` | 必须描述真实图片 |
| `field_tio2_home_metrics` / `metrics` | repeater，0–4 | 空数组隐藏整个区块；不得有空行 | `metrics[]` → `metrics[]` → `CompanyMetrics` | 每项有 claim basis |
| `field_tio2_home_metric_value` / `metric_value` | repeater child text，必填 | 1–24 字符 | `value` → `value` → metric item | 数字需要来源或用户确认 |
| `field_tio2_home_metric_unit` / `metric_unit` | repeater child text，可选 | 0–16 字符 | `unit` → `unit` → metric item | 同上 |
| `field_tio2_home_metric_label` / `metric_label` | repeater child text，必填 | 1–60 字符 | `label` → `label` → metric item | 同上 |
| `field_tio2_home_metric_context` / `metric_context` | repeater child text，可选 | 0–120 字符 | `context` → `context` → metric item | 同上 |
| `field_tio2_home_metric_claim_basis` / `metric_claim_basis` | select，必填 | `user_confirmed` 或 `source_required` | 编辑校验字段；不传 UI | `source_required` 必须有 URL |
| `field_tio2_home_metric_evidence_url` / `metric_evidence_url` | URL，条件必填 | 仅 HTTPS；`source_required` 时必填 | 编辑校验字段；不传 UI | 支持量化声明 |
| `field_tio2_home_products_heading` / `products_heading` | text，必填 | 1–90 字符 | `productsHeading` → `productDiscovery.heading` → `ProductDiscovery` | 定位文案 |
| `field_tio2_home_products_intro` / `products_intro` | textarea，必填 | 1–240 字符 | `productsIntro` → `productDiscovery.intro` → `ProductDiscovery` | 不得制造产品性能 |
| `field_tio2_home_product_routes` / `product_routes` | repeater，2–6 | 路径唯一；确定顺序；不得跨站 | `productRoutes[]` → `productRoutes[]` → `ProductDiscovery` | 链接目标必须存在 |
| `field_tio2_home_product_title` / `product_title` | repeater child text，必填 | 1–80 字符 | `title` → `title` → product card | 对应目标页 |
| `field_tio2_home_product_summary` / `product_summary` | repeater child textarea，必填 | 1–220 字符 | `summary` → `summary` → product card | 对应目标页 |
| `field_tio2_home_product_path` / `product_path` | repeater child text，必填 | 本站相对路径，最长 172 | `path` → `href` → product card | 目标必须存在 |
| `field_tio2_home_product_image` / `product_image` | repeater child image，可选 | 受支持图片 MIME | `image` → `image` → product card | 原创或获授权素材 |
| `field_tio2_home_product_image_alt` / `product_image_alt` | repeater child text，条件必填 | 同 Hero 图片规则 | `imageAlt` → `image.alt` → product card | 描述真实图片 |
| `field_tio2_home_applications_heading` / `applications_heading` | text，必填 | 1–90 字符 | `applicationsHeading` → `applicationDiscovery.heading` → `ApplicationDiscovery` | 定位文案 |
| `field_tio2_home_applications_intro` / `applications_intro` | textarea，必填 | 1–240 字符 | `applicationsIntro` → `applicationDiscovery.intro` → `ApplicationDiscovery` | 不得制造适用性 |
| `field_tio2_home_applications` / `applications` | repeater，3–6 | 每项包含 name、summary、path、可选 image/alt；路径唯一且本站有效 | `applications[]` → `applications[]` → `ApplicationDiscovery` | 默认主题可包括 coatings、plastics、masterbatch、inks、paper |
| `field_tio2_home_inquiry_heading` / `inquiry_heading` | text，必填 | 1–90 字符 | `inquiryHeading` → `inquiry.heading` → `InquiryProcess` | 不适用 |
| `field_tio2_home_inquiry_steps` / `inquiry_steps` | repeater，恰好 3 | 每项 title 1–70、description 1–220；编号由位置派生 | `inquirySteps[]` → `inquiry.steps[]` → `InquiryProcess` | 过程声明必须准确 |
| `field_tio2_home_trust_heading` / `trust_heading` | text，必填 | 1–90 字符 | `trustHeading` → `trust.heading` → `SupplierTrust` | 供应定位 |
| `field_tio2_home_trust_intro` / `trust_intro` | textarea，必填 | 1–240 字符 | `trustIntro` → `trust.intro` → `SupplierTrust` | 按事实分类 |
| `field_tio2_home_trust_reasons` / `trust_reasons` | repeater，3–4 | 每项 title、description、claim basis、可选 evidence URL；不得有空项 | `trustReasons[]` → `trust.reasons[]` → `SupplierTrust` | 用户确认制造边界可用 `user_confirmed` |
| `field_tio2_home_rfq_heading` / `rfq_heading` | text，必填 | 1–90 字符 | `rfqHeading` → `rfq.heading` → `RfqSection` | 不适用 |
| `field_tio2_home_rfq_intro` / `rfq_intro` | textarea，必填 | 1–260 字符 | `rfqIntro` → `rfq.intro` → `RfqSection` | 明示 v0.1 不发送/不存储 |
| `field_tio2_home_rfq_labels` / `rfq_labels` | group，必填 | 固定键：name、company、countryRegion、workEmail、buyerType、interest、expectedQuantity、destination、message、privacy | `rfqLabels` → `rfq.labels` → `RfqForm` | 不适用 |
| `field_tio2_home_rfq_submit_label` / `rfq_submit_label` | text，必填 | 1–32 字符 | `rfqSubmitLabel` → `rfq.submitLabel` → `RfqForm` | 不适用 |
| `field_tio2_home_rfq_privacy_text` / `rfq_privacy_text` | textarea，必填 | 1–240 字符；必须说明本地演示不发送/不保存 | `rfqPrivacyText` → `rfq.privacyText` → `RfqForm` | 行为必须与实现一致 |
| `field_tio2_home_rfq_success_heading` / `rfq_success_heading` | text，必填 | 1–80 字符 | `rfqSuccessHeading` → `rfq.success.heading` → success state | 不得声称已收到询盘 |
| `field_tio2_home_rfq_success_message` / `rfq_success_message` | textarea，必填 | 1–240 字符；明确没有传输数据 | `rfqSuccessMessage` → `rfq.success.message` → success state | 行为必须与实现一致 |
| `field_tio2_home_faq_heading` / `faq_heading` | text，必填 | 1–90 字符 | `faqHeading` → `faq.heading` → `HomepageFaq` | 不适用 |
| `field_tio2_home_faqs` / `faqs` | repeater，3–6 | question 1–160；answer 1–600；可选 related label/path；不得重复问题 | `faqs[]` → `faqs[]` → `HomepageFaq` | 答案按事实分类 |
| `field_tio2_home_closing_heading` / `closing_heading` | text，必填 | 1–90 字符 | `closingHeading` → `closingCta.heading` → `ClosingInquiryCta` | 不适用 |
| `field_tio2_home_closing_body` / `closing_body` | textarea，必填 | 1–220 字符 | `closingBody` → `closingCta.body` → `ClosingInquiryCta` | 不适用 |
| `field_tio2_home_closing_label` / `closing_label` | text，必填 | 1–32 字符；href 固定为 `#rfq` | `closingLabel` → `closingCta.label` → `ClosingInquiryCta` | 不适用 |
| `field_tio2_home_seo_title` / `seo_title` | text，必填 | 1–60 字符 | `seoTitle` → `seo.title` → Metadata | 关键词自然使用 |
| `field_tio2_home_seo_description` / `seo_description` | textarea，必填 | 1–160 字符 | `seoDescription` → `seo.description` → Metadata | 不得使用无证据声明 |
| `field_tio2_home_og_image` / `og_image` | image，可选 | 受支持图片 MIME；缺失使用站点级安全默认 | `ogImage` → `seo.ogImage` → Metadata | 原创或获授权素材 |
| `field_tio2_home_primary_topic` / `primary_topic` | text，必填 | 1–80 字符 | 编辑配置 → `seo.primaryTopic`；不输出 `meta keywords` | 关键词假设 |
| `field_tio2_home_secondary_topics` / `secondary_topics` | repeater，0–10 | 每项 1–80；去重 | 编辑配置 → `seo.secondaryTopics[]`；不输出 `meta keywords` | 关键词假设 |

嵌套 group/repeater 的子字段同样使用固定 key：

- `applications`：`field_tio2_home_application_name`、`field_tio2_home_application_summary`、`field_tio2_home_application_path`、`field_tio2_home_application_image`、`field_tio2_home_application_image_alt`；
- `inquiry_steps`：`field_tio2_home_inquiry_step_title`、`field_tio2_home_inquiry_step_description`；
- `trust_reasons`：`field_tio2_home_trust_reason_title`、`field_tio2_home_trust_reason_description`、`field_tio2_home_trust_reason_claim_basis`、`field_tio2_home_trust_reason_evidence_url`；
- `rfq_labels`：`field_tio2_home_rfq_label_name`、`field_tio2_home_rfq_label_company`、`field_tio2_home_rfq_label_country_region`、`field_tio2_home_rfq_label_work_email`、`field_tio2_home_rfq_label_buyer_type`、`field_tio2_home_rfq_label_interest`、`field_tio2_home_rfq_label_expected_quantity`、`field_tio2_home_rfq_label_destination`、`field_tio2_home_rfq_label_message`、`field_tio2_home_rfq_label_privacy`、`field_tio2_home_rfq_buyer_industrial_label`、`field_tio2_home_rfq_buyer_distributor_label`、`field_tio2_home_rfq_buyer_other_label`；
- `faqs`：`field_tio2_home_faq_question`、`field_tio2_home_faq_answer`、`field_tio2_home_faq_related_label`、`field_tio2_home_faq_related_path`；
- `secondary_topics`：`field_tio2_home_secondary_topic`。

### 7.3 通用验证

- 所有字符串先 trim，再执行长度和必填校验；
- 站内路径符合现有小写、数字、单连字符路径规则；除固定 `#rfq` 外不允许 fragment、query、protocol 或 host；
- HTML-capable 字段不存在；React 按文本输出；
- 图片缺失时使用文字优先布局，不渲染破损占位；
- ACF Admin 保存和 WP-CLI/程序化写入都必须执行同一最终发布约束；
- draft、pending、private 和 trash 记录仍保留站点首页身份，避免预览或重新发布歧义；
- revision 和 autosave 不计入唯一记录检查。

## 8. GraphQL、DTO 与数据流

### 8.1 查询

`GetHomepage` 使用 `idType: SLUG` 和确定性 slug `${siteId}--homepage` 获取单条记录，不依赖 WordPress rewrite URI。返回后 adapter 必须再次验证：

- `site_scope` 恰好等于请求站点；
- schema 版本为 `homepage-v0.1`；
- 公共路由是固定 `/`；
- 正式读取只接受发布状态；
- Preview 只接受当前签名 Preview session 所属站点的草稿；
- 所有 repeater 数量、链接和字段长度满足契约。

查询一次获取全部有界字段，不做无界关系查询，也不读取 Product Agent 私有 schema。

### 8.2 DTO

```ts
interface HomepageDto {
  identity: {
    id: string
    siteId: string
    path: '/'
    schemaVersion: 'homepage-v0.1'
    status: string
    modified: string
  }
  hero: HomepageHeroDto
  metrics: readonly HomepageMetricDto[]
  productDiscovery: HomepageSectionIntroDto
  productRoutes: readonly HomepageLinkCardDto[]
  applicationDiscovery: HomepageSectionIntroDto
  applications: readonly HomepageLinkCardDto[]
  inquiry: HomepageInquiryDto
  trust: HomepageTrustDto
  rfq: HomepageRfqDto
  faq: HomepageFaqDto
  closingCta: HomepageClosingCtaDto
  seo: HomepageSeoDto
}
```

生成的 GraphQL 类型只在 WordPress adapter 层使用。React 组件只能导入 `HomepageDto` 及其子 DTO。无效必填字段抛出 `HomepageContractError`；跨站数据抛出既有或兼容的 `CrossSiteContentError`；版本错误单独标识，便于迁移诊断。

### 8.3 缓存与 Preview

- 缓存标签：`site:{siteId}`、`route:{siteId}:/`、`content:{homepageId}`；
- 首页更新只刷新拥有它的站点和 `/`；
- `tio2-b` 的更新不得刷新 `tio2-a`；
- Preview 使用现有独立签名机制和站点 scope cookie；
- Preview、本地和其他非生产环境保持 `noindex`。

## 9. Next.js 组件树

```text
app/page.tsx
└── SiteShell
    └── HomepageTemplate
        ├── HomepageHero
        ├── CompanyMetrics              optional when metrics=[]
        ├── ProductDiscovery
        ├── ApplicationDiscovery
        ├── InquiryProcess
        ├── SupplierTrust
        ├── RfqSection
        │   └── RfqForm                 only primary Client Component
        ├── HomepageFaq
        └── ClosingInquiryCta
```

固定区块顺序不可由编辑者调整。除 `CompanyMetrics` 外，所有核心区块必须存在。`RfqForm` 之外均保持 Server Components。

获批视觉稿中的顶栏只表示页面处于站点壳层中的上下文，不授权 Homepage Agent 重做全局导航或页脚。Homepage Agent 在 `SiteShell` 提供的 `<main>` 内渲染首页主体，并将字体、颜色和布局样式限制在首页命名空间。若现有 SiteShell 仍是占位实现，需要另行提交共享壳层提案；不得在首页内部复制一套只对根路由生效的导航。

`RfqForm` 固定字段：Name、Company、Country/Region、Work Email、Buyer Type、Product/Application Interest、Expected Quantity（可选）、Destination（可选）、Message、Privacy acknowledgement。

提交行为：

1. 阻止默认网络提交；
2. Name、Company、Country/Region、Work Email、Buyer Type、Product/Application Interest、Message 和 Privacy acknowledgement 必填；Expected Quantity、Destination 可选；
3. 文本上限分别为：Name 80、Company 120、Country/Region 80、Work Email 254、Interest 160、Expected Quantity 80、Destination 120、Message 1200；email 使用原生 `type=email` 和同一服务端无关的客户端校验；
4. Buyer Type 使用稳定值 `industrial`、`distributor`、`other`，WordPress 分别管理其英文显示标签，默认含义为 industrial end user/formulator、distributor/importer/wholesaler、other business buyer；
5. 字段使用适当的 `autocomplete` 属性；隐私确认不预选；
6. 失败时保留输入、展示错误摘要并聚焦首个错误字段；
7. 成功时清空内存中的字段值、切换浏览器内状态，并明确说明数据没有传输或保存；
8. 不调用 fetch、Server Action、API route、Cookie、localStorage、sessionStorage、WordPress 或第三方服务。

## 10. 视觉方向 C

### 10.1 视觉语言

- 风格：Credibility Editorial；安静、专业、偏工业材料而非电商目录；
- 暖白：`#FBFAF6`；
- 深矿物绿：`#2F4939`；
- 主操作绿：`#415C49`；
- 浅鼠尾草：`#EEF1E9`；
- 深灰绿正文：`#243329`；
- 黄铜强调：`#B9A26A`，只用于大面积或高对比强调，不承载小字号正文；
- 标题：`Source Serif 4`；正文和 UI：`Inter`；
- 字体通过 `next/font` 自托管，最多使用必要的 Latin 子集和权重；
- 图片使用原创或获授权的 TiO₂ 材料、生产或供应协调视觉；不得下载参考站素材。

### 10.2 布局

- Hero 使用左文案、右材料视觉的非对称构图；
- Hero 后立即显示产品、应用和批量询价三个发现入口；
- 产品卡片保持大面积留白和清楚链接，不堆叠规格；
- 应用卡片强调 coatings、plastics、masterbatch、inks 和 paper 的并行入口；
- 信任区明确分开 owned production 与 partner production；
- RFQ 区使用深绿背景形成页面主要转化焦点；
- FAQ 后使用收尾 CTA 返回 `#rfq`。

动效仅使用短时 opacity/transform；`prefers-reduced-motion` 下完全关闭。

## 11. 响应式与无障碍

### 11.1 响应式

- `<768px`：单列；Hero 文案在图片前；RFQ 单列；
- `768–1023px`：产品/应用两列，表单双列；
- `>=1024px`：获批桌面布局；
- DOM 和阅读顺序在所有断点保持一致；
- 不使用横向滚动承载核心内容；
- 360、768 和 1440 像素宽度必须无水平溢出。

### 11.2 无障碍

- 目标：WCAG 2.2 AA；
- 页面只有一个 H1；区块按 H2/H3 连续分级；
- `<section>` 使用可识别标题；不嵌套第二个 `<main>`；
- 所有交互可用键盘，焦点始终可见且不被遮挡；
- 操作目标设计为至少 44×44 CSS 像素；
- 正文对比度至少 4.5:1，非文本控件至少 3:1；
- FAQ 优先使用原生 `<details>/<summary>`；
- 表单使用可见 label、字段说明、`aria-describedby`、错误摘要和可播报成功状态；
- 图片遵循装饰图空 alt、信息图准确 alt；
- 页面支持 200% 缩放和 reduced motion。

## 12. SEO 与内部链接

### 12.1 关键词映射

| 页面位置 | 初始主题 |
|---|---|
| SEO title、Hero H1 | titanium dioxide supplier、TiO2 supplier |
| Hero 简介 | China titanium dioxide supplier、已确认制造边界 |
| 产品系列 | titanium dioxide products、rutile titanium dioxide、anatase titanium dioxide |
| 应用分类 | coatings、plastics、masterbatch、inks、paper |
| 信任区 | 产品匹配、供应协调、自有与合作生产、文件支持 |
| FAQ | 产品类型、应用、询价资料、样品和文件需求 |

组件不硬编码上述文案。WordPress 保存主主题和次级主题，供编辑和审计；页面不输出 `meta keywords`。

### 12.2 Metadata 和 JSON-LD

- WordPress `seo_title`、`seo_description`、`og_image` 映射到 Next Metadata；
- canonical 固定为当前站点正式 URL 的 `/`，编辑者不能输入任意 canonical；
- JSON-LD 使用 `Organization`、`WebSite`、`WebPage`；
- FAQ 可见且 DTO 有效时才增加与可见内容完全一致的 `FAQPage`；
- 首页不生成 Product、评分、评论、认证或虚假 SearchAction；
- 本地、Preview 和未单独授权环境保持 `noindex, nofollow`；
- 本提案不授权生产索引。

### 12.3 内部链接

- Hero 主 CTA → `#rfq`；
- Hero 次 CTA → 本站产品入口；
- 产品卡片 → 本站产品系列或详情路径；
- 应用卡片 → 本站应用路径；
- 信任理由 → 只有对应 About/Documents 页面存在时才显示链接；
- FAQ → 只有对应本站目标存在时才显示上下文链接；
- Closing CTA → `#rfq`。

本地审计必须验证每个路径存在、属于当前 `site_scope`、链接文字有描述性。另一站存在相同路径不能使当前站链接通过。

## 13. 性能契约

- 除 `RfqForm` 外保持 Server Components；
- 不添加轮播、背景视频、聊天插件、分析追踪或第三方脚本；
- Hero 图片使用明确尺寸和响应式 `sizes`，仅首屏必要图片优先加载；
- 其他图片延迟加载并保留宽高比例；
- 字体使用 `next/font`，避免运行时第三方请求与字体布局偏移；
- Homepage 自有客户端 JavaScript 增量 gzip 不超过 25 KB；
- 无 JavaScript 时正文、链接、FAQ 和表单字段仍可阅读，只有本地表单状态增强不可用；
- 移动端 Lighthouse Performance 不低于 90；Lighthouse Accessibility 为 100。

## 14. 错误处理

- 首页缺失、重复、跨站或 schema 版本错误：核心构建失败并报告具体契约错误；
- WordPress 暂时不可用：已有缓存继续服务；无缓存时返回明确错误，不输出空白 200；
- 正式读取不得回退到旧通用 Page 或另一站首页；
- 企业数据为空：隐藏整个区块；
- 可选图片为空：切换为文字优先布局；
- 必需区块无效：不做静默隐藏；
- 站内链接不存在或跨站：阻止发布或构建；
- RFQ 失败和成功均只改变本地 UI，不产生外部副作用。

## 15. 迁移与回滚

1. 在测试中先证明当前 `tio2-a` Page `/` 和 `tio2-b` Page `/` 的所有权；
2. 注册 `tio2_homepage` 和全部字段，但不发布新记录；
3. 创建 `tio2-a` 获批英文首页记录和独立 `tio2-b` 测试记录；
4. 将旧根 Page 转为草稿备份，不删除；
5. 发布新首页记录并验证确定性 slug 与唯一根路由；
6. 两站构建和完整本地验收通过后保留新首页；
7. 回滚时先将新首页转为草稿，再恢复旧 Page 的 `/` 所有权。

迁移不能改变其他 Page/Post 路由，不能修改 Product Agent 内容，也不能减少每站现有 505 个公开 URL。旧根 Page 转为草稿后，Sitemap 将专用首页记录的 `/` 与其余 504 个 Page URL 合并、去重，因此公开 URL 总数仍为 505；回归门禁从“Page CPT 数量”升级为“站点公开 URL 数量”。

## 16. TDD、测试与质量门

### 16.1 WordPress

- CPT、GraphQL 名称和稳定 field key 注册；
- 每站唯一首页、固定 `/`、固定 schema 版本；
- Admin、ACF、WP-CLI 和程序化写入执行相同发布约束；
- 旧 Page 与新首页的路由切换及回滚；
- Preview 和 webhook 只影响 owning site。

### 16.2 单元与组件

- GraphQL → DTO 完整映射；
- 缺失必填字段、数组上下限、跨站、错误版本和非法链接；
- `metrics=[]` 隐藏企业数据；
- 固定区块顺序和唯一 H1；
- FAQ 语义；
- RFQ 必填、email、隐私、错误聚焦和成功状态；
- 提交期间零 fetch、零存储、零 Cookie。

### 16.3 集成与 SEO

- GraphQL 成功、缺失、重复、错误和超时；
- Draft Preview 与正式读取隔离；
- owning-site cache tag 和 revalidation；
- Metadata、canonical、OG 和 JSON-LD；
- FAQPage 与可见 FAQ 一致；
- 本地和 Preview 始终 noindex。

### 16.4 浏览器、无障碍和性能

- `tio2-a` 与 `tio2-b` 首页内容互不泄漏；
- 360、768、1440 宽度截图和无水平溢出；
- 键盘顺序、焦点可见、RFQ anchor 和 FAQ 操作；
- axe 无 serious/critical 问题；
- Lighthouse Accessibility 100；移动 Performance ≥90；
- Homepage 客户端 JS 增量 gzip ≤25 KB；
- 浏览器测试拒绝任何意外远端请求。

### 16.5 回归

- 两个 site ID 构建通过；
- 两站既有 505 个公开 URL、Sitemap、robots、404、Preview、Webhook 和 HTTP audit 通过；
- Product 页面和 Product Agent 契约不受影响；
- 完整 `npm run verify:local` 通过；
- 独立 Audit Agent 对照本文件审查且无阻塞发现。

## 17. 本地预览

- WordPress：`http://localhost:8080`
- `tio2-a` / tio2products.com：`http://localhost:3001`
- `tio2-b` / 隔离验证：`http://localhost:3002`
- 所有本地页面：`noindex, nofollow`

交付证据包括：WordPress 编辑与 Preview、两站首页、桌面/平板/手机截图、表单本地校验和成功状态、两站隔离、迁移回滚、完整测试输出以及 `external actions: none`。

## 18. 预计文件范围

### 项目 Agent/Skill

- `AGENTS.md`
- `.codex/agents/tio2-home-template.toml`
- `.agents/skills/tio2-home-template/**`

### WordPress

- `wordpress/plugins/tio2-site-model/includes/content-types.php`
- `wordpress/plugins/tio2-site-model/includes/fields.php`
- `wordpress/plugins/tio2-site-model/includes/preview.php`
- `wordpress/plugins/tio2-site-model/includes/webhooks.php`
- 首页迁移、seed 和 WordPress smoke tests

### Next.js 数据和页面

- `app/page.tsx`
- `app/sitemap.ts`
- `lib/wordpress/homepage-queries.graphql`
- `lib/wordpress/homepage-queries.ts`
- `lib/wordpress/homepage-types.ts`
- `lib/wordpress/homepage-dto.ts`
- `lib/wordpress/generated.ts`
- `components/homepage/**`
- 首页专用 metadata/JSON-LD helper

### 测试与本地门禁

- `tests/unit/homepage/**`
- `tests/integration/homepage/**`
- `tests/e2e/homepage.spec.ts`
- WordPress schema/seed tests
- `scripts/verify-local.ps1` 的首页门禁扩展

若实施发现必须修改本列表之外的全局导航、共享设计 token、Product Agent 文件或另一模板族，Homepage Agent 必须停止并返回新的共享契约提案，不得自行扩大范围。

## 19. 实施与审查顺序

1. 父 Agent 确认本规格路径和完整审批记录；
2. 编写并审批实施计划；
3. 创建项目级 Homepage Agent/Skill 与路由规则；
4. 以 Implement 模式把本规格交给 `tio2_home_template`；
5. Homepage Agent 使用 TDD 实现 WordPress → GraphQL → DTO → 组件 → SEO → 本地验收；
6. 独立 Audit 模式对照本规格审查；
7. 有问题时重新以带完整审批记录的 Implement 模式修复；
8. 仅交付本地证据，报告 `external actions: none`。

本设计不授权任何 GitHub push、Vercel 部署、DNS 变更、搜索引擎索引或远端生产操作。
