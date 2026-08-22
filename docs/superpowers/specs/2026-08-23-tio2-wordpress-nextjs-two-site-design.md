# TiO₂ WordPress + Next.js 双站系统设计

## 1. 目标

为同一个现有钛白粉产品建立一套可扩展的网站生产架构，首先交付两个独立网站。系统必须覆盖：

- WordPress 内容管理；
- Next.js 前端开发；
- GitHub 版本与变更管理；
- 两个独立 Vercel 项目和域名；
- 自动化质量检查；
- 技术 SEO 与搜索引擎索引准备；
- 每个网站数百个简单页面的稳定读取、生成、更新与缓存。

本设计不承诺搜索排名或收录时间。可验证的交付结果是：页面公开可访问、允许抓取、技术 SEO 完整、Sitemap 可提交、索引状态可监测。

## 2. 已确认的设计原则

1. 一个 GitHub 仓库维护共享代码和两个站点定义。
2. 一个共享 Next.js 应用通过 `SITE_ID` 加载站点配置。
3. 一个 WordPress 实例管理共享钛白粉资料及两个站点各自的发布内容。
4. 两个网站分别部署为两个 Vercel Project，拥有独立域名、环境变量、缓存、日志、回滚和生产发布。
5. WordPress 是发布内容的权威源；GitHub 是代码、Schema、站点配置和部署定义的权威源；Vercel 只承载运行状态。
6. 页面规模采用“核心页预生成 + 长尾页按需 ISR + 精准刷新”，不在每次提交时全量重建所有页面。
7. GraphQL 生成类型提交到 Git；只有 WordPress Schema 变化时才重新生成，普通 Vercel 构建不依赖在线 Schema introspection。

## 3. 不在 v0.1 范围内

- 一次扩展到 20 个生产站；
- 自动购买域名或自动修改 DNS；
- WordPress Multisite；
- 一个 Vercel Project 承载多个域名的运行时多租户；
- Redis、Turborepo、部署编排器和自动分批发布；
- 关键词研究、批量写作和完整知识库建设；
- 对搜索排名、询盘数量或搜索引擎收录时点作结果保证。

上述能力不得阻碍未来扩展，但不会增加第一版的实现复杂度。

## 4. 系统架构

```text
                         GitHub Repository
                  code + schema + site configs + CI
                                  │
                   ┌──────────────┴──────────────┐
                   │                             │
           Vercel Project A              Vercel Project B
           SITE_ID=tio2-a                SITE_ID=tio2-b
           Domain A                      Domain B
                   │                             │
                   └──────────────┬──────────────┘
                                  │
                         Shared Next.js App
                                  │
                              WPGraphQL
                                  │
                            One WordPress
                 ┌────────────────┴────────────────┐
                 │                                 │
        Shared TiO₂ product data         Site-scoped pages/posts
```

### 4.1 本地环境

本地开发使用：

- Docker Compose：WordPress、MariaDB、持久化卷；
- WordPress 容器：安装并启用 WPGraphQL、ACF、WPGraphQL for ACF、Yoast SEO、WPGraphQL Yoast SEO，以及仓库自带的站点内容模型插件；
- 宿主机 Node.js：运行 Next.js 开发服务器和测试，缩短前端反馈周期；
- 两套本地启动配置分别设置 `SITE_ID=tio2-a` 与 `SITE_ID=tio2-b`。

Docker Desktop 是本地环境的必要依赖。当前已安装但未运行；进入实施时先启动并验证 Docker Engine。

### 4.2 生产环境

- WordPress 部署到支持 HTTPS、持久化数据库、备份、Cron 和 WPGraphQL 的生产主机；
- Next.js 代码推送到 GitHub；
- 同一 GitHub 仓库连接两个 Vercel Project；
- 每个 Project 设置自己的 `SITE_ID`、正式域名、WordPress endpoint 和刷新密钥；
- Preview 环境默认 `noindex`；Production 环境允许索引。

WordPress 生产主机、两个域名和 DNS 权限是生产部署前必须具备的外部输入。它们不阻塞本地实现和测试，但缺少任意一项都不能宣称最终目标完成。

## 5. 仓库结构

```text
wordpress-nextjs-factory/
├── app/                       # Next.js App Router
├── components/                # 展示组件
├── lib/
│   ├── wordpress/             # GraphQL client、queries、generated types
│   ├── sites/                 # 站点解析与验证
│   ├── seo/                   # metadata、canonical、JSON-LD
│   └── cache/                 # tag 与 revalidation 规则
├── sites/
│   ├── tio2-a.ts
│   └── tio2-b.ts
├── wordpress/
│   ├── docker-compose.yml
│   ├── plugins/tio2-site-model/
│   └── seed/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/
│   ├── generate-graphql-types
│   ├── seed-local-wordpress
│   └── verify-site
└── .github/workflows/
```

v0.1 采用单应用仓库，不引入 Turborepo。只有当共享包和独立应用数量实际增长后才升级为 Monorepo。

## 6. WordPress 内容模型

### 6.1 GitHub 管理的站点身份

GitHub 中的 `sites/tio2-a.ts` 与 `sites/tio2-b.ts` 定义：

- 站点 ID、名称、正式 URL；
- 品牌、导航和联系方式；
- 默认 SEO 信息；
- 启用的页面类型；
- WordPress `site_scope` 对应值。

WordPress 只保存匹配的 `site_scope` 分类项，不重复拥有域名、部署或主题配置的主权。

### 6.2 共享内容

共享内容类型包括：

- `tio2_product`：产品与产品线；
- `tio2_grade`：钛白粉牌号、类型和技术指标；
- `tio2_application`：涂料、塑料、色母粒、油墨、造纸等应用；
- `tio2_document`：TDS、SDS、COA 等文件元数据；
- `tio2_faq`：可复用的事实型问答。

共享内容不自动产生两个站完全相同的发布正文。页面只引用相同的事实实体。

### 6.3 站点独立内容

站点独立内容使用 WordPress Page/Post 和必要的页面类型字段，并关联 `site_scope`。每条内容至少包含：

- 所属站点；
- 页面类型；
- 外部公开路径；
- 标题、摘要、正文和特色图；
- SEO title、description、canonical 策略；
- 发布状态和更新时间；
- 引用的共享产品、牌号、应用或文档。

WordPress 内部 slug 使用站点前缀保证唯一；Next.js 对外只暴露站点自己的公开路径。

### 6.4 查询契约

- 详情查询根据 `site_scope + 公开路径` 计算确定性的 WordPress 内部 slug，转换为平铺的 WordPress URI `/${internalSlug}/` 后以 `URI` 查询，并再次校验返回节点的 `site_scope` 与公开路径；禁止用昂贵的 ACF meta query 查找路由；
- 列表查询从 `siteScope(id: $siteId, idType: SLUG)` 的 `pages` connection 读取，必须使用 WPGraphQL cursor pagination，每批不超过 100 个节点；
- 禁止页面查询无界深层关系；
- GraphQL 响应转换为项目内部 DTO，React 组件不直接依赖完整 WordPress Schema；
- 未发布内容只能通过带签名的 Preview 流程读取。

运行时 Schema 修订（2026-08-23）：本地 WPGraphQL 的 `PageIdType` 不包含 `SLUG`，Page 全局 connection 也不提供 `taxQuery`；因此使用上述 Page URI 详情查询和 SiteScope SLUG 根 connection，保持确定性查找与站点隔离语义不变。

## 7. Next.js 页面策略

### 7.1 站点解析

生产构建从受校验的 `SITE_ID` 读取对应配置。缺失或未知 `SITE_ID` 时构建失败，禁止悄悄回退到另一个站点。

### 7.2 页面生成

- 首页、主要分类、产品入口和高优先级 SEO 页面在部署时预生成；
- 普通文章和长尾页面使用按需静态生成与 ISR；
- 首次生成后由 Vercel 缓存；
- WordPress 更新通过签名 Webhook 精准触发 `revalidatePath`/`revalidateTag`；
- GraphQL Schema 生成不在普通构建中在线执行；生产构建预生成核心内容时仍要求 WordPress 内容 endpoint 可用。若该构建失败，Vercel 不提升失败部署并继续提供上一生产版本；测试环境使用固定 GraphQL fixtures 验证不依赖实时 Schema 的代码构建。
- 开发者显式执行 `npm run schema:refresh`，通过本地 WP-CLI 将 SDL 刷新到已提交的 `wordpress/schema.graphql`，然后执行 `npm run codegen` 从该静态 Schema 和已提交 operations 生成类型与 typed documents；普通 `npm run build` 不执行其中任何一步。

### 7.3 缓存标签

缓存至少按以下粒度标记：

- `site:{siteId}`；
- `content:{contentId}`；
- `route:{siteId}:{path}`；
- `entity:{entityType}:{entityId}`。

更新一篇文章只刷新对应站点和路径；更新共享牌号时刷新引用该实体的两个站点页面。v0.1 可以使用显式依赖记录，暂不建设通用依赖图服务。

## 8. SEO 与索引准备

每个生产站必须独立生成并验证：

- 唯一的 `<title>`、meta description 和 canonical；
- `robots.txt`；
- XML Sitemap，覆盖全部可索引页面；
- Organization、WebSite、BreadcrumbList、Product/Article/FAQ 等适用 JSON-LD；
- Open Graph 与 Twitter metadata；
- 正确的 200、301、404 和 410 行为；
- 面包屑、栏目导航和内部链接；
- Preview/Staging 的 `noindex`；
- Production 的抓取允许规则；
- Search Console 验证与 Sitemap 提交所需材料。

数百页无需拆分 Sitemap；实现保留以后按 50,000 URL 分片的接口。

## 9. 错误处理和安全

- WordPress 短暂不可用时，Vercel 继续提供已有 ISR 缓存；
- 未缓存且无法取得内容的请求返回明确的临时错误，不输出空白成功页；
- 不存在或不属于当前站点的内容返回 404；
- Preview、刷新和发布操作使用独立密钥并验证签名；
- 所有密钥只保存在本地 `.env`、GitHub Secrets 或 Vercel Environment Variables；
- GraphQL mutation 不向匿名访问者开放；
- WordPress Admin 与 API 使用 HTTPS，生产环境启用备份和最小权限账户；
- 用户提交内容做服务端校验、防垃圾和速率限制。

## 10. 测试策略

实施采用 TDD，测试先于对应功能代码。

### 10.1 单元测试

- `SITE_ID` 解析和配置校验；
- WordPress DTO 转换与空值处理；
- 页面路径、canonical、metadata 和 JSON-LD；
- 缓存标签与刷新路由计算；
- Sitemap 和 robots 规则。

### 10.2 集成测试

- 使用 MSW 模拟 WPGraphQL 的成功、空结果、分页、错误和超时；
- 验证 `site_scope` 不发生跨站内容泄漏；
- 验证 WordPress Webhook 只刷新正确站点；
- 验证 Preview 未授权时拒绝访问。

### 10.3 WordPress 测试

- 插件激活成功；
- CPT、Taxonomy 和 ACF 字段可在 GraphQL Schema 中查询；
- Seed 数据能创建两个站点的共享实体与独立页面；
- 更新、草稿、发布和删除能产生正确 Webhook 事件。

### 10.4 端到端与规模测试

- 同一代码分别以 `tio2-a`、`tio2-b` 启动并展示不同品牌和内容；
- 两站相同公开路径不会串站；
- 每站生成至少 500 条合成内容进行分页、Sitemap、构建和 ISR 验证；
- Playwright 检查导航、404、表单和关键页面；
- Lighthouse 检查性能、可访问性、最佳实践和 SEO；
- 抽样 URL 验证 HTML 中存在 canonical、结构化数据和可抓取正文。

## 11. GitHub 与发布流程

```text
feature branch
    → tests / lint / typecheck / build
    → GitHub Pull Request
    → Vercel Preview（noindex）
    → 人工检查关键页面
    → merge main
    → 两个 Vercel Production 部署
    → 自动生产 smoke test
```

v0.1 允许两个 Vercel 项目在共享核心代码变化时同时构建。站点数量增加后再实现 affected-site detection。

## 12. 验收标准

只有以下证据全部存在，目标才可判定完成：

1. 本地 WordPress、数据库和两个 Next.js 站点可重复启动；
2. WordPress 后台可以创建、编辑、预览、发布和删除两站内容；
3. 共享钛白粉实体可被两站引用，站点正文不会互相泄漏；
4. 每站 500 条合成页面测试通过，分页、ISR 和 Sitemap 行为正确；
5. GitHub 仓库存在通过的 CI 记录；
6. 两个 Vercel Project 分别连接同一仓库并成功部署；
7. 两个正式域名分别返回正确站点，HTTPS 正常；
8. Lint、TypeScript、单元、集成、WordPress、E2E 和生产 smoke tests 通过；
9. 两站的 robots、Sitemap、canonical、JSON-LD、状态码和内部链接通过自动检查；
10. Search Console 验证和 Sitemap 提交完成，或由用户持有的账户完成最后授权操作并留下可核查证据。

## 13. 实施顺序

1. 本地 Docker WordPress/MariaDB；
2. WordPress 内容模型插件与 Seed 数据；
3. Next.js GraphQL 数据层和双站配置；
4. 页面、缓存、Preview 与 Revalidation；
5. SEO、Sitemap、robots 和结构化数据；
6. 500 页规模测试与质量门；
7. GitHub CI；
8. WordPress 生产主机；
9. 两个 Vercel Project、域名和生产验收；
10. Search Console 与索引准备收尾。
