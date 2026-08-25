# Site A 编辑型 GEO Homepage（B 模式）实验设计

## 1. 文档状态

- 日期：2026-08-26
- 状态：设计已由用户逐段确认，等待书面规格复核
- 实施对象：Site A（`tio2-a`）
- 冻结对象：Site B（`tio2-b`）
- 路径：架构型变更，先完成设计与实施计划，再编码

## 2. 背景与目标

现有仓库已经验证了一个 WordPress、一个 Next.js 代码库和两个独立站点的基础模式。Next.js 通过 `SITE_ID` 为 Site A 与 Site B 分别构建；WordPress 通过 `site_scope` 隔离内容；预览、缓存刷新和 SEO 数据也按站点隔离。

现状仍是固定双站原型：站点 ID 分散写死在 TypeScript、PHP、脚本和测试中；两个站点共享较多 Homepage 组件与 `homepage-v0.1` 数据结构；因此还没有充分证明“共享底层能力，但每个网站的页面结构、组件和视觉可以完全不同”。

本实验选择 B 模式：保留一个共享 Next.js 应用和共享基础能力，为 Site A 建立独立 Shell、Homepage 模板、组件、样式和数据适配器。Site B 保持冻结。本实验同时把 Site A Homepage 升级为编辑型工业品牌视觉和内容更深、可验证、可持续追加的 GEO 信息结构。

实验需要验证：

1. Site A 可以拥有与 Site B 完全不同的 Homepage 实现。
2. Site A 的 GEO 内容可以在 WordPress 中编辑、预览和追加。
3. Site A 更新只能刷新 Site A，不能改变或泄漏 Site B 内容。
4. 后续增加新站时可以复用 WordPress 通信、预览、缓存和基础 SEO，而不复制整个项目。

## 3. 已确认的范围

### 3.1 包含

- Site A 独立编辑型 Homepage、Shell 和 CSS；
- Site A `homepage-v0.2-editorial-geo` WordPress 内容模型；
- 直接答案、采购决策框架、应用说明、供应路线比较、证据资料、评估方法、FAQ、术语表和内容复核信息；
- Header 中的 RFQ 行动入口；
- Site A 专属 GraphQL 数据适配和 DTO 验证；
- Site A Preview、Revalidation、Metadata、JSON-LD、Sitemap 和 Robots 的兼容；
- 站点注册与模板分发边界收敛；
- Site A 相关测试和少量 Site B 防回归测试；
- 本地实验数据、验证结果和使用说明。

### 3.2 不包含

- RFQ 表单、表单提交、CRM 或邮件发送集成；
- Site B 业务页面、模板或内容改造；
- Homepage 中的产品页或应用页链接；
- 通用拖拽页面搭建器或任意模块编排器；
- 新的产品页、应用页或知识详情页；
- Vercel 正式部署、DNS、正式域名切换或远程写入；
- Search Console、Bing Webmaster 或其他索引提交；
- 正式 WordPress 迁移或 505-to-1 迁移；
- `verify:root-only`；
- 对排名、引用、收录或流量结果的保证。

## 4. 关键设计原则

1. **共享能力，不共享站点表达。** GraphQL 传输、签名预览、缓存、安全文本处理和基础 SEO 可以复用；品牌、内容、Schema 版本、组件、布局与样式按站点独立。
2. **WordPress 是内容权威源。** Site A 的可见 GEO 内容必须来自 WordPress，并经过类型和归属校验；不能把新增 GEO 正文永久写死在 React 组件中。
3. **Git 是模板与部署配置权威源。** 域名、站点 ID、模板选择、RFQ 目标和部署环境不交给 WordPress 管理。
4. **站点隔离优先于降级可用性。** 系统可以明确失败，但不能回退到另一个站点、另一个 Schema 或另一条内容记录。
5. **可见内容与机器描述一致。** Metadata 与 JSON-LD 只能描述页面实际可见且经过验证的内容；不引入所谓“GEO 专用隐藏文本”或特殊 Schema。
6. **实验内容不冒充商业事实。** 本地种子继续标记为 synthetic demo；未经确认的参数、产能、认证和生产关系不得发布为事实。
7. **追加内容优先于追加模块。** 已确认的模块使用可重复字段持续扩充；只有出现新的信息类型时才新增 Schema 与组件。

Google 当前说明 AI 搜索继续依赖传统 SEO、可抓取的文本、可靠且以用户为先的内容，并且结构化数据应与可见内容一致；没有专用的 AI 标记要求。Bing 也强调清晰结构、内容深度、证据和新鲜度。本设计据此把 GEO 视为内容质量与信息架构问题，而不是堆积关键词或隐藏标记。

参考：

- [Google：AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google：General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Bing：Using AI Performance to Improve Your Visibility](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c)

## 5. 总体架构

```text
                         GitHub Repository
          site configs + templates + WP plugin + schema + tests
                                  │
                   ┌──────────────┴──────────────┐
                   │                             │
          Site A build/deployment       Site B build/deployment
          SITE_ID=tio2-a                SITE_ID=tio2-b
          editorial GEO v0.2            legacy v0.1 frozen
                   │                             │
                   └──────────────┬──────────────┘
                                  │
                         Shared Next.js Core
             GraphQL client + preview + cache + base SEO
                                  │
                              WPGraphQL
                                  │
                          One WordPress CMS
            Site A v0.2 content      Site B v0.1 content
```

每个生产站仍对应独立 Vercel Project、域名、环境变量、缓存、日志和回滚。该生产拓扑只作为后续目标，本实验不创建或修改 Vercel Project。

## 6. Site A 视觉与信息架构

### 6.1 已确认视觉方向

- 编辑型工业品牌风格；
- 温暖纸张色、深绿色与锈色构成的克制色彩体系；
- 大字号杂志式标题与清晰的分区编号；
- 首页是完整的可滚动页面，不是单屏 Landing Page；
- 视觉重点是供应背景、证据、方法和可信度，而不是产品卡片墙；
- 响应式支持 360、768 和 1440 宽度；
- Site A CSS 限定在 Site A 模板根节点，不能污染 Site B。

### 6.2 已确认页面顺序

1. Header：品牌、信息导航和 RFQ CTA；
2. Hero：核心定位与供应背景；
3. Direct Answer：直接回答采购前应确认什么；
4. Decision Framework：六类采购决策问题；
5. Application Briefs：应用背景说明，不链接应用页；
6. Supply Route Comparison：自有、OEM/合作及未确认路线的区别；
7. Evidence Library：TDS、SDS、COA 等证据类型说明；
8. Evaluation Method：Site A 如何组织与复核产品路线信息；
9. FAQ：具体、可见、可追加的问答；
10. Glossary：稳定的实体与术语定义；
11. Editorial Review Note：复核范围和时间；
12. Closing CTA：再次引导 RFQ，但不放表单。

Header 和 Closing CTA 使用同一站点级 RFQ 目标。Homepage 不提供产品页和应用页链接，直到用户另行批准。

## 7. WordPress 内容模型

### 7.1 Homepage 身份

Site A 的唯一 Homepage 必须同时满足：

- post type 为 `tio2_homepage`；
- 恰好一个 `site_scope`，且值为 `tio2-a`；
-内部 slug 为 `tio2-a--homepage`；
-公开路径固定为 `/`；
- Schema 版本为 `homepage-v0.2-editorial-geo`；
- 发布前通过 v0.2 合同校验。

Site B 继续使用 `homepage-v0.1`、`tio2-b--homepage` 和冻结模板。Site A v0.2 字段不能成为 Site B v0.1 发布的必填项。

### 7.2 字段组

#### Hero

- `hero_eyebrow`
- `hero_heading`
- `hero_summary`
- `hero_image`
- `hero_image_alt`
- `header_rfq_label`
- `closing_heading`
- `closing_body`
- `closing_label`

RFQ 目标不存 WordPress。Site A Git 配置新增受控 `rfqHref`；实验默认值由现有 `contactEmail` 生成 `mailto:` 地址。未来改成站内页面或 CRM 时必须修改站点配置并经过 URL 校验。

#### Direct Answer

- `direct_answer_question`
- `direct_answer_lead`
- `direct_answer_body`

该模块恰好一条，是页面核心问题的直接可见答案。

#### Decision Framework

可重复 1–12 条：

- `decision_number`
- `decision_question`
- `decision_answer`

实验种子提供六条；WordPress 编辑者可追加或调整顺序。

#### Application Briefs

可重复 1–12 条：

- `application_name`
- `application_summary`
- `application_considerations`

不提供公开链接字段。该模块只负责首页上下文说明。

#### Supply Route Comparison

可重复 1–6 条：

- `route_name`
- `route_meaning`
- `buyer_verification`
- `documentation_context`
- `claim_basis`
- `evidence_url`

`claim_basis` 使用明确枚举：`synthetic_demo`、`user_confirmed`、`source_document`。选择 `source_document` 时必须提供可验证的 `evidence_url`。

#### Evidence Library

可重复 0–12 条：

- `document_type`
- `document_title`
- `document_summary`
- `applicability`
- `revision_label`
- `evidence_url`
- `verification_status`

`verification_status` 使用 `demo`、`needs_review`、`verified`。`verified` 必须同时具备证据 URL、复核负责人和复核时间。实验种子只能使用 `demo`，除非用户提供真实证据并明确确认。

#### Evaluation Method

可重复 1–10 条：

- `method_number`
- `method_title`
- `method_description`

#### FAQ

可重复 3–20 条：

- `faq_question`
- `faq_answer`

FAQ 必须在页面中可见。是否输出 `FAQPage` JSON-LD 由届时适用的搜索文档与页面资格决定；本实验不把 FAQ 富结果作为目标。

#### Glossary

可重复 0–30 条：

- `term`
- `definition`

同一 Homepage 内术语大小写标准化后不得重复。

#### Editorial Metadata

- `editorial_reviewed_at`
- `editorial_reviewed_by`
- `editorial_review_scope`

实验内容可以使用明确的 demo 负责人标签，但不能伪造个人或机构背书。正式发布时这三个字段必填。

### 7.3 发布校验

WordPress 在 ACF 保存、普通后台保存、REST 保存和状态转换边界执行同一合同：

- Site A v0.2 必填模块完整；
-所有路径、URL、枚举、日期和重复数量合法；
-图片必须有明确 alt 文本，纯装饰图片例外但必须显式标记；
-证据状态与证据字段一致；
-根路径只有唯一 Homepage 所有者；
-发布失败时保留草稿并显示持久后台错误；
-不能因为 v0.2 校验失败而改变 Site B 内容。

## 8. GraphQL、DTO 与数据流

### 8.1 共享 GraphQL 客户端

共享客户端继续负责：

- WPGraphQL endpoint 与请求序列化；
-超时、HTTP、网络、JSON 与 GraphQL 错误分类；
-Next.js 缓存标签；
-GraphQL Codegen 生成类型；
-不在日志中暴露密钥或完整敏感载荷。

共享客户端只共享通信机制，不共享站点内容。

### 8.2 版本化 Homepage 适配

Homepage 数据在站点模板边界形成判别联合：

```text
HomepageEnvelope
├── siteId: tio2-a
│   schemaVersion: homepage-v0.2-editorial-geo
│   data: SiteAEditorialGeoHomepageDto
└── siteId: tio2-b
    schemaVersion: homepage-v0.1
    data: LegacyHomepageDto
```

Site A v0.2 适配器必须验证：

-返回节点恰好属于 `tio2-a`；
-路径为 `/`；
-Schema 版本与 Site A 模板配置一致；
-所有必填文本、重复字段、URL、枚举与日期合法；
-可见文本经过当前 SEO 安全文本管道处理；
-GraphQL 返回的 Site B、未知 Scope 或 v0.1 节点不能进入 Site A 组件。

### 8.3 数据流

```text
WordPress 编辑 Site A Homepage
        ↓
保存时验证 Scope、Schema、字段和证据状态
        ↓
WPGraphQL 返回 Site A v0.2 节点
        ↓
共享 GraphQL 客户端执行带 Site A 缓存标签的查询
        ↓
Site A v0.2 适配器生成严格 DTO
        ↓
模板注册表选择 Site A 编辑型 Homepage
        ↓
Site A 组件渲染可见内容、Metadata 与 JSON-LD
        ↓
WordPress Webhook 只刷新 Site A 的 `/` 和相关缓存标签
```

Preview 继续绑定精确的 `siteId + path + expiry`。Site A `/` 的预览令牌不能授权 Site B 或第二条路径。

## 9. Next.js 模板隔离

### 9.1 目标结构

```text
app/
├── page.tsx                         # 识别当前站点并分发模板
├── layout.tsx
└── api/
    ├── preview/route.ts
    └── revalidate/route.ts

components/
├── core/                            # 真正通用的展示与错误边界
└── sites/
    ├── tio2-a/
    │   ├── site-a-shell.tsx
    │   └── homepage/
    │       ├── editorial-homepage.tsx
    │       ├── hero.tsx
    │       ├── direct-answer.tsx
    │       ├── decision-framework.tsx
    │       ├── application-briefs.tsx
    │       ├── supply-route-comparison.tsx
    │       ├── evidence-library.tsx
    │       ├── evaluation-method.tsx
    │       ├── faq.tsx
    │       ├── glossary.tsx
    │       └── homepage.module.css
    └── legacy/
        └── homepage-template.tsx    # Site B 冻结实现

lib/wordpress/
├── core/
├── homepage-v01/
└── homepage-v02/

sites/
├── index.ts
├── tio2-a.ts
├── tio2-b.ts
└── template-profiles.ts
```

实际实施可以保留现有文件位置以减少无关移动，但边界必须等价：Site A 新组件和 v0.2 DTO 独立，Site B 继续调用旧实现。

### 9.2 模板分发

`app/page.tsx` 不直接依赖一个固定 Homepage 组件。服务端模板注册表根据当前站点的模板 key 选择实现：

```text
tio2-a → site-a-homepage-editorial-v0.2 → Site A components + v0.2 DTO
tio2-b → site-b-homepage-v0.1-frozen   → legacy components + v0.1 DTO
```

模板 key 必须穷举并在未知值时失败。Site A 组件不得导入 Site B 配置或模板。Site B 防回归测试继续锁定冻结 key 与输出。

浏览器构建只应发送当前页面实际使用的客户端 JavaScript。新增的 Site A 模块优先保持 Server Component；只有需要交互的模块才添加小范围 Client Component。本实验没有 RFQ 表单，FAQ 可使用原生 `<details>`，因此不需要为 Homepage 引入大型客户端状态库。

## 10. 基础 SEO 与 GEO 边界

共享基础 SEO 继续负责：

-每站 Metadata Base、Title、Description 和 Canonical；
-Open Graph 基础字段；
-Robots 与 Sitemap 生成规则；
-本地和 Preview `noindex`；
-JSON-LD 安全序列化；
-HTML 到纯文本的安全转换；
-404 与草稿索引边界。

每站独立的数据包括：

-品牌、域名、标题与描述；
-可见 GEO 正文；
-实体、术语、FAQ、证据和复核信息；
-图片和替代文本；
-适用于该站点的 JSON-LD 值。

本实验不添加隐藏 GEO 文本、`llms.txt` 承诺或未经搜索平台支持的特殊标记。JSON-LD 只使用适用类型，并且字段必须与可见正文一致。

## 11. RFQ 行为

-页面中不存在 RFQ 表单；
-Header 与 Closing 各显示一个 RFQ CTA；
-两个 CTA 使用同一 `rfqHref`；
-实验默认由 Site A `contactEmail` 生成 `mailto:contact@tio2products.com`；
-CTA 标签由 WordPress 管理，目标由 Git 站点配置管理；
-目标只允许 `mailto:` 或同站 HTTPS URL；
-未来接入 CRM、独立询盘页或外部服务属于新范围，需要单独设计和授权。

## 12. 容错与错误处理

### 12.1 WordPress 保存失败

-必填模块或身份合同失败：内容保持草稿并显示持久后台错误；
-可选模块为空：前端省略整个模块，不渲染空容器；
-单个证据链接或状态不合法：阻止 `verified` 发布状态，不影响 Site B；
-重复 Homepage 或 Scope 错误：拒绝公开状态。

### 12.2 读取失败

-已有有效 Next.js 缓存时可以继续服务缓存内容；
-没有有效缓存且 WordPress 不可用时返回明确服务错误；
-GraphQL 合同不匹配时记录不含敏感载荷的结构化错误；
-不得回退到 Site B、旧 Schema 或任意第一条 Homepage；
-可选数组合法但为空时省略对应区块；
-必填 DTO 字段缺失时拒绝渲染。

### 12.3 Preview 失败

-签名、站点、路径或过期时间无效：拒绝；
-WordPress Preview source 不可用：返回明确上游错误；
-不存在匹配草稿：返回 404；
-不得把 Production 内容、其他路径草稿或其他站点草稿当作预览降级。

## 13. 安全与可信度

-每站独立 Preview Secret 与 Revalidation Secret；
-Webhook 使用 HMAC、时间窗口、体积限制、严格 Payload 和事件去重；
-站点 ID、路径、模板 key 和 Schema 版本使用允许列表；
-RFQ URL 使用协议和同站校验；
-WordPress 富文本不得注入脚本、事件属性或危险 URL；
-JSON-LD 使用现有安全序列化，不拼接未经转义的脚本内容；
-秘密不进入客户端 Bundle、Git、截图、测试输出或普通日志；
-技术参数、认证、产能和生产关系必须有明确 claim basis；
-AI 生成内容必须由人复核，并标记实验或证据状态；
-结构化数据不得描述页面未显示的事实。

## 14. 扩站流程

后续新增 Site C 时：

1. 在 Next.js 站点注册表增加 Site C 配置；
2. 在 WordPress 支持站点注册处增加 `site-c` Scope，并通过契约测试保证两个运行时一致；
3. 选择现有 Homepage Schema 或定义新版本；
4. 新建 Site C 独立 Shell、Homepage 模板和样式；
5. 为 Site C 配置独立 Preview 与 Revalidation Secret；
6. 建立独立 Vercel Project，设置 `SITE_ID=site-c`；
7. 绑定独立域名并执行单站发布检查。

实验会把散落的 A/B 判断收敛到注册表、模板分发器和 WordPress 支持站点函数。它不会实现自动创建 Vercel Project 或部署编排器。

## 15. 测试策略

遵守仓库开发约束，只运行与本实验直接相关的测试。`verify:root-only` 明确排除。

### 15.1 WordPress 与契约测试

-注册并暴露 Site A v0.2 字段；
-Site A v0.2 发布合同成功与失败路径；
-Site B v0.1 不受 v0.2 必填规则影响；
-Scope、内部 slug、唯一 Homepage 和 Schema 版本校验；
-Evidence status、claim basis、URL 和 editorial metadata 校验；
-GraphQL 静态 Schema 与生成类型确定性；
-Preview 序列化包含 v0.2 且不泄漏其他站点；
-Webhook 只产生 Site A `/` 的受影响状态。

### 15.2 TypeScript 单元测试

-Site A 模板 key 与注册表解析；
-未知 Site ID、模板 key 和 Schema 版本失败；
-v0.2 DTO 正常转换与所有非法边界；
-跨站数据、重复术语、非法 URL、证据状态不一致被拒绝；
-可选模块为空时被省略；
-基础 Metadata、Canonical 和 JSON-LD 使用 Site A 数据；
-RFQ CTA 存在且 RFQ 表单不存在；
-Homepage 不出现产品页或应用页链接；
-Site B 冻结模板 key 和关键输出保持不变。

### 15.3 集成测试

-Site A Published GraphQL 查询到 v0.2 DTO；
-Site A 草稿 Preview；
-Site A Revalidation 只刷新 Site A；
-Site A 请求遇到 Site B、v0.1 或错误 Scope 数据时拒绝；
-Sitemap、Robots 与 noindex 行为符合当前环境；
-WordPress 上游错误不会导致跨站降级。

### 15.4 浏览器与构建检查

-Site A 在 360、768、1440 宽度的关键视觉检查；
-无横向溢出，键盘焦点可见；
-没有 serious/critical 可访问性发现；
-Header/Closing RFQ CTA 正确；
-FAQ 原生交互可用；
-页面模块顺序与已确认设计一致；
-没有产品页和应用页链接；
-Site A Build 成功；
-必要时执行 Site B Build 和少量两站 E2E，确认 Site B 冻结且无跨站泄漏；
-检查 Site A 新模板没有引入不必要的大型客户端 Bundle。

## 16. 实验交付物

1. Site A v0.2 WordPress 字段、发布校验、GraphQL 和 Preview 支持；
2. Site A 独立编辑型 Homepage 与 Shell；
3. Site A GEO 模块和响应式样式；
4. Site A Header/Closing RFQ CTA，无表单；
5. Site A v0.2 DTO、查询、Metadata 和 JSON-LD；
6. Site A 精准 Revalidation；
7. Site A synthetic demo seed 与追加内容说明；
8. 相关自动化测试与验证记录；
9. Site B 冻结回归证据。

## 17. 验收标准

实验完成需要同时满足：

-Site A 首页呈现已确认的编辑型 GEO 视觉和完整信息结构；
-所有新增可见正文来自 WordPress v0.2，而不是永久写死的业务内容；
-WordPress 可以追加决策问题、应用说明、供应路线、证据、方法、FAQ 和术语；
-RFQ 表单不存在，Header 与 Closing CTA 存在；
-Homepage 不链接产品页或应用页；
-Site A Preview、Metadata、JSON-LD、缓存刷新和响应式行为通过相关测试；
-Site A 不读取或渲染 Site B 内容；
-Site B 模板、内容和关键输出保持冻结；
-没有执行 Vercel、DNS、索引、远程 WordPress 或正式迁移操作；
-没有运行 `verify:root-only`。

## 18. 实施边界

本规格通过书面复核后，下一步只创建详细实施计划。实施必须遵循 TDD、相关测试优先和完成前验证流程。任何部署、生产写入、DNS、索引或正式迁移仍需用户另行明确授权。
