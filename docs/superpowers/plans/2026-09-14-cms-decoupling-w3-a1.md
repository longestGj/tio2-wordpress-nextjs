# W3-A1 首页与应用中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute this approved work package with checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking. 不自动启动并行实现；独立代码复审按开发流程执行。

**Goal:** HOME-001 与 APP-000 的技术兼容 CMS 内容进入正文、SEO 和实际更新链，读取不再比对旧批准正文。

**Architecture:** 分离页面技术读契约和原批准写入校验；保留记录身份与政策。PHP/TS 共用技术定义与测试向量，按现有组件投影内容，不增加任意区块或 HTML 解析。共享外壳单列 W3-A2。

**Tech Stack:** 仓库锁定 Next.js/TypeScript/PHP/WPGraphQL/Vitest/Playwright；隔离 WordPress/MariaDB。

**Spec:** [已批准具体设计](../specs/2026-09-14-cms-decoupling-w3-a1-design.md)。

**替代与执行状态（2026-09-14）：**本计划 Task 4 的“裸 meta 更新可用于 3→4 摘要验收”以及“原批准写入合同不变”前提已在[历史阻断回执](../../verification/2026-09-14-cms-decoupling-w3-a1.md)中被实际运行否定。后续以[获批准的补充设计](../specs/2026-09-14-cms-write-approval-separation-design.md)和[写入/批准分离计划](2026-09-14-cms-write-approval-separation.md)替代该写入与验收方法；旧步骤保留以追溯 RED，不再作为待重复执行的授权。HOME/APP 读取、正文/SEO 和本批事件的既有实现不重做；当前本地两条路径验证与尚待总审查/集成的状态见[同一 W3-A1 回执](../../verification/2026-09-14-cms-decoupling-w3-a1.md)。

## Global Constraints

- 不改变站点域名、导航目的地、产品/应用关系、媒体、品牌事实、视觉、索引授权、表单或 Consent Mode。
- 不引入任意区块编辑器，不迁移真实 CMS 数据，不修改 main、预发布或生产。
- 工作区 `D:/16Wordpress_nextjs/.worktrees/cms-responsibility-audit`；初始基线 `a526d6ca178f2fe31ecdca24484ae0c3259242fc`。开工前重新核对 develop；保留其他未提交文件，明确暂存清单。
- 原合同 JSON 继续用于 seed、写入审批和测试输入，不作为新读 schema 的运行时模板；不得简单把 `matchesInstalledContent` 替换成 `true`。
- 不把本批目标路由构建记为 W6 全站构建；接口、模拟、真实页面和视觉证据分别报告。
- 现有 `globalChromeRef` 与代码外壳保持兼容，旧 footer 不消费状态保留；不宣称本批已完成共享外壳解耦。

## Task 1：两个页面的技术读契约与写入隔离

**Create:**

- `wordpress/plugins/tio2-site-model/config/tio2-my-home-application-read-contract.json`：两页技术结构、固定身份/关系、安全约束，不含批准正文。
- `lib/wordpress/home-application-read-contract.ts`：TS 验证与精确投影。
- `wordpress/plugins/tio2-site-model/includes/home-application-read-contract.php`：PHP 等价验证与记录只读入口。
- `tests/fixtures/home-application-read-cases.json`：PHP/TS 共用正反例，使用字段路径修改测试样本。
- `tests/unit/homepage/home-application-read-contract.test.ts`、`tests/infrastructure/home-application-read-contract.test.ts`、`tests/infrastructure/php/home-application-read-contract.php`。

**Modify:** `lib/wordpress/homepage-v04-dto.ts`、`homepage-v04-types.ts`、`application-hub-v01-dto.ts`、`application-hub-v01-types.ts`；PHP `includes/homepage-v04.php`、`application-hub-v01.php`、`fields.php`、`editorial-v01.php`；必要的 preview 只读调用在 `includes/preview.php`。不全局替换写入函数的调用者。

### 字段合同

显式类型使用页面现有键，不用 `typeof approvedContract`。定义 `MalaysiaHomepageContent`、`MalaysiaApplicationHubContent`，DTO 在内容之上增加记录 identity、globalChrome 和 routeReadiness。

| 规则 | 精确应用范围 |
|---|---|
| 有界普通文本 | 首页 hero 的 eyebrow/heading/body、各 section 的显示标题/介绍、卡片 title/description/ctaLabel、CTA.label、company.entityName、问答 question/answer、pageRfq 文案、SEO title/description/h1/primaryKeyword；应用中心 breadcrumb.label、hero 文案与 action.label、applicationPaths 文案、applications title/scope/gradeLabel/actionLabel、evaluation/support/finalRfq 文案与 SEO title/description |
| 文本安全 | 非空、首尾无空白、Unicode code point 上限 100000；拒绝 `<`、`>` 和 C0/DEL 控制字符。允许 logo/装饰图片既有空 alt；不把该例外泛化到正文 |
| 纯内容数组 | 首页 company.summaries、pageRfq.fieldSummaries，应用中心 evaluation.items：1–32 项；使用统一 item 类型，不匹配原数量；不会新增导航关系 |
| 关系数组 | 首页 startHere/markets/applications/documents/resources 中含 targetPageId 的对象、products.groups.gradeIds/processLinks、resources.answers.cta；应用中心 applications/grades/support/routeRegistry：保留既有身份集合与关系，按 ID 匹配而非标签匹配，拒绝重复/缺失/错配；显示顺序可按组件支持范围投影，不按旧索引恢复内容 |
| 无稳定 ID 的产品分组 | 保持既有 gradeIds 成员集合，作为当前组身份，不用组 title 决定产品关系；不新增 grade；组名和说明可变 |
| 技术固定项 | identity 的 pageId/siteScope/locale/path/schemaVersion/pageType、锚点与链接目标、globalChromeRef、media.src/width/height/role、responsive；从原技术事实逐项登记成独立 schema，不复制整篇 JSON 作模板 |
| 政策固定项 | lifecycle、mappingState、assetState、releaseControls 维持当前语义；不因旧值名称包含 APPROVED 就当普通文案放开 |
| 追踪字段 | packageId/reviewId/contentRevision 允许合规字符串变化、不匹配旧编号；不冒充批准或据其启用功能 |
| JSON-LD | 只支持既有五节点及其已存在字段；结构、实体 ID、类型与关系固定，name/description 类文本按内容验证；不允许任意新增节点或属性进入 script |
| 不消费字段 | 首页旧 footer 保留输入兼容但不投影成运行页脚；未知字段不透传至 DTO/DOM/SEO。schema 明确 required keys，缺失和 null 不混同 |

若发现当前实际字段不在此表或读取方依赖了未分类字段，先补精确技术定义和测试，不用泛型“任何 string 都可改”兜底。边界定义本身须在此检查点复审。

**Interfaces:**

```ts
export function validateMalaysiaHomepageReadContent(value: unknown): MalaysiaHomepageContent
export function validateMalaysiaApplicationHubReadContent(value: unknown): MalaysiaApplicationHubContent
// 原 toMalaysiaHomepageDto / toMalaysiaApplicationHubDto 签名保留。
```

```php
// 失败返回 WP_Error；成功返回投影后的 array。
function tio2_my_home_application_read_content($value, string $page_id);
// published 只接 publish；preview 只供既有授权预览消费者，不开放新路由。
function tio2_validate_homepage_v04_read_record(int $post_id, string $mode = 'published');
function tio2_validate_application_hub_v01_read_record(int $post_id);
```

- [ ] 在现有 DTO 测试中先用旧合同为输入，只修改内容/追踪值及纯内容数组，调用真实 DTO；确认旧代码因旧稿约束而失败。两个页面必须各有 RED，不把导入错误当有效 RED。

```ts
const changed = structuredClone(contract)
changed.reviewId = 'APP-000-READ-TEST-2'
changed.hero.h1 = 'Application selection test heading'
changed.evaluation.items.push({title: 'Additional evaluation step', body: 'Synthetic test guidance.'})
const source = malaysiaApplicationHubSource()
const result = toMalaysiaApplicationHubDto({...source, malaysiaApplicationHubContractJson: JSON.stringify(changed)})
expect(result.hero.h1).toBe('Application selection test heading')
expect(result.evaluation.items.at(-1)?.body).toBe('Synthetic test guidance.')
```

首页在 `malaysia-dto.test.ts` 的 `source()` 中替换 JSON：修改 packageId、hero.heading、company.summaries 追加一项，断言实际 DTO 值。负例逐项覆盖错 scope/locale/path/schema、缺失必填/null、危险文本、错配 href/targetPageId、重复 edge/anchor、非法 policy、超限数组。

- [ ] 实现两套读验证和显式类型；DTO 用 validated content 返回，不展开未验证原对象。PHP resolver 使用新读记录函数，原 `tio2_validate_homepage_v04_contract` / `tio2_validate_application_hub_v01_contract` 留给写入。
- [ ] 首页记录校验从 `fields.php:tio2_validate_homepage_contract` 提取纯记录部分供读写复用：保留 WP_Post 类型、revision/autosave、scope、内部 slug、重复 homepage、普通 Page/Post 根路由占用、schema 版本全部检查；写入口仍接原内容批准检查，不引入调用方可控的绕过批准参数。
- [ ] `tio2_editorial_homepage_target_ready` 改用新 published 读记录函数。preview 只接既有权限/nonce/scope 后的读校验，保留草稿与公开读取隔离。
- [ ] PHP harness 用同一 JSON 向量验证每个案例接受/拒绝和投影；同时调用真实原写校验，证明新追踪编号仍不能冒充旧批准包。模拟记录须覆盖唯一性、内部 slug 和根路径占用，不能只调用纯 JSON 校验。
- [ ] 运行并保存结果：

```powershell
npx --no-install vitest run tests/unit/homepage/malaysia-dto.test.ts tests/unit/homepage/home-application-read-contract.test.ts tests/unit/applications/malaysia-application-hub-dto.test.ts tests/infrastructure/home-application-read-contract.test.ts tests/infrastructure/homepage-wordpress-contract.test.ts
```

- [ ] 准确暂存本检查点文件并提交 `feat: separate MY home and application read contracts`，冻结范围供独立复审。保持其他未提交文档不动。

## Task 2：正文与 SEO 共源

**Modify:** `lib/seo/homepage-metadata.ts`、`homepage-jsonld.ts`、`application-hub-metadata.ts`、`application-hub-jsonld.ts`；`components/sites/tio2-my/applications/malaysia-application-hub.tsx`。

**Tests:** `tests/unit/homepage/metadata.test.ts`、`jsonld.test.ts`、`tests/unit/applications/malaysia-application-hub-seo.test.ts`、`malaysia-application-hub-page.test.tsx`；现有路由集成测试。

**Interfaces:** 原 metadata/JSON-LD builder 签名不变，消费检查点一 DTO。Site A/B 分支保持既有输出。

- [ ] 用真实 DTO 的合法新标题/description 构造输入，断言 metadata、已有 OG/Twitter 取同一值，canonical/robots 仍由 publication policy 决定。先观察原 metadata 返回静态文本的 RED。

```ts
const current = dto()
const changed = {...current, seo: {...current.seo, title: 'Synthetic applications title', description: 'Synthetic applications description.'}}
const output = buildMalaysiaApplicationHubMetadata(getSiteConfig('tio2-my'), changed, {})
expect(output).toMatchObject({title: 'Synthetic applications title', description: 'Synthetic applications description.', robots: {index: false, follow: false}})
```

- [ ] 两个 builder 在已验证站点分支保留 publication 对象，仅替换已有文案属性；不新增不存在的社交字段或改变图片。

```ts
const publication = buildTio2MyPublicationMetadata('APP-000', env)
return {
  ...publication, title: applicationHub.seo.title, description: applicationHub.seo.description,
  ...(publication.openGraph ? {openGraph: {...publication.openGraph, title: applicationHub.seo.title, description: applicationHub.seo.description}} : {}),
  ...(publication.twitter ? {twitter: {...publication.twitter, title: applicationHub.seo.title, description: applicationHub.seo.description}} : {}),
}
```

首页同样消费 homepage.seo，保留 draftMode/status 禁止索引；增加错站/错误 schema 负例，不能返回貌似有效的 MY metadata 掩盖错误输入。

- [ ] 首页 JSON-LD 的 WebPage.name 取 hero.heading，Organization.name 取 company.entityName；不新增旧图没有的 description 属性，已有描述取其已验证 CMS 源。应用中心 ItemList.name 取 applicationPaths.heading。测试断言改内容不改节点类型/ID/关系。
- [ ] 应用中心 `breadcrumbLabel` 使用现有 breadcrumb 的当前页 label；现有固定装饰 eyebrow 没有独立 CMS 字段，本批标为呈现常量，不新增数据库字段。未知字段或冗余 footer 不得影响输出。
- [ ] 回归：

```powershell
npx --no-install vitest run tests/unit/homepage tests/unit/applications/malaysia-application-hub-seo.test.ts tests/unit/applications/malaysia-application-hub-page.test.tsx tests/integration/homepage/route.test.tsx tests/integration/homepage/seo.test.tsx tests/integration/applications/malaysia-application-hub-route.test.tsx
npx --no-install tsc --noEmit --incremental false
```

- [ ] 提交 `fix: render current MY home and application SEO content`；本检查点单元/集成通过不等于真实链路验收。

## Task 3：本批事件与缓存标签

**Modify:** `wordpress/plugins/tio2-site-model/includes/webhooks.php`、`app/(en)/api/revalidate/route.ts`。

**Create:** `tests/integration/api/home-application-revalidation.test.ts`、`tests/infrastructure/php/home-application-webhook-mutations.php`、`tests/infrastructure/home-application-webhooks.test.ts`。

**Interfaces:** 保留原 payload/HMAC/max/expire:0/replay；查询端 `homepageContentTag('tio2-my')`、`applicationHubContentTag('tio2-my')` 不改。

- [ ] 基于现有产品刷新测试的 signedRequest/payloadFor 测试工具，在新文件测试 `['/applications','/products/cr-901']` 混合事件：必须调用应用中心专属标签，非法签名/跨站零副作用，replay 不重复调用。先确认缺标签 RED。

```ts
expect(revalidateTag).toHaveBeenCalledWith('content:tio2-my--applications', 'max')
expect(revalidatePath).toHaveBeenCalledWith('/applications')
```

标签字面值开工时与 `cache-tags.ts` 核对；测试预期独立编写，不调用被测构造函数生成。

- [ ] 将 `tio2_application_hub` 加入普通 webhook 类型，在对应身份分支映射 `/applications`；首页 `_tio2_my_homepage_contract_json` 和应用中心 `_tio2_my_application_hub_contract_json` 只对正确 post_type 判相关。post publish/update/withdraw 及 meta-only 各有行为测试。
- [ ] 在现有 path 循环追加，不删除 site/sitemap 或扩大 precise 规则：

```ts
if (siteId === 'tio2-my' && path === '/applications') {
  tags.add(applicationHubContentTag(siteId))
}
```

- [ ] PHP 测试以真实 webhook 函数生成签名事件，HTTP 边界捕获 body；验证事件包含正确站点与路径，不是源码字符串测试。A/B 与无关 meta 不触发新增分支。
- [ ] 运行新测试、`tests/integration/api/product-revalidation.test.ts`、`tests/integration/api/revalidate.test.ts`、`tests/integration/homepage/revalidation.test.ts`；提交 `fix: cover MY home and application content events`。

## Task 4：真实隔离 CMS 与目标路由构建验收

**Create:** `tests/integration/homepage/home-application-local-runtime.test.ts`、`tests/helpers/home-application-runtime-fixture.ts`、`tests/fixtures/home-application-runtime/next.config.mjs`、`tsconfig.json`、`next-env.d.ts`、`app/layout.tsx`、`app/page.tsx`、`app/applications/page.tsx`、`app/api/revalidate/route.ts`、`apply-synthetic-home-application.php`。

**Read/reuse:** `tests/helpers/wordpress-runtime.ts`、`scripts/runtime-ports/lease-core.mjs`、已验收 legal runtime 的所有权与分步清理实现。新 helper 使用本批目录，不能修改或放宽 legal 的浏览器错误过滤。

- [ ] fixture 页面重导出真实路由，不手写模拟页面：

```ts
// app/page.tsx
export {default, generateMetadata} from '@/app/page'
// app/applications/page.tsx
export {default, generateMetadata, revalidate} from '@/app/applications/page'
// app/api/revalidate/route.ts
export {POST, runtime} from '@/app/api/revalidate/route'
```

- [ ] 独立 runId、d16-test 项目、动态端口、任务构建目录、临时凭据；只有本任务资源允许清理。Next callback 从隔离容器可达但不连接共享/生产端点。浏览器阻止非本地第三方请求，不实发 RFQ/GTM。
- [ ] 启动 `startIsolatedWordPress`，安装/启用已需插件，导入原两页与就绪依赖的受控测试记录；合成变化仅使用 `update_post_meta`。启用 gate `HOME_APPLICATION_LOCAL_RUNTIME=1`，默认普通单元测试不启动容器。
- [ ] 构建一次并保存 commit、dirty code 差异/hash、Build ID、CMS run 身份；使用真实页面查询。每页连续两轮安全变化：标题/正文/SEO、纯内容数组增项，第二轮删去新增项。每轮采集 GraphQL、事件 body、POST 响应、页面 HTML/meta/JSON-LD，持续访问 60 秒内观察新值；Build ID/进程必须不变。
- [ ] PHP meta-only 更新不能调用 post save 人为补发；未发布/错站/重复记录/危险内容在隔离副本逐项验证拒绝，然后恢复本任务合成有效记录。捕获失败必须记录明确阶段，不能吞错后以旧缓存 200 当成功。
- [ ] Playwright 查看 390 与 1440 宽度，保存并实际查看两页截图；应用中心展开/折叠及可用/不可用链接与原合同一致。首页更新后实际调用只读 readiness 验证，不冒充所有依赖页视觉验收。
- [ ] 完成/失败均执行独立清理步骤，任一步失败不跳过剩余步骤；删除动作先核实目录位于本任务 run root、处理 junction 不递归删除目标 public。保存 cleanup-evidence。

```powershell
$env:HOME_APPLICATION_LOCAL_RUNTIME = '1'
npx --no-install vitest run tests/integration/homepage/home-application-local-runtime.test.ts
Remove-Item Env:HOME_APPLICATION_LOCAL_RUNTIME
```

- [ ] 合并前执行所有新增/受影响测试、typecheck、diff check；独立复审准确 BASE/HEAD，返修仅复验相关范围。准确合入 develop 后运行相关回归并保存 `docs/verification/2026-09-14-cms-decoupling-w3-a1.md`，状态符合真实结果。

## 完成判定与停止条件

四个检查点均有证据、无开放阻断并合入 develop，才称 W3-A1 完成；W3-A2 和其他 W3/W5/W6 保持未完成。CMS 无法运行、回退不兼容、需修改批准导航/事实或第三方实发权限时，停止依赖步骤并报告，不扩权。

本计划是施工顺序，不是现有实现的声明。检查点一的精确 schema、PHP 共享向量及记录边界尚未编写，所有复选框保持未勾选。
