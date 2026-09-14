# W3-A1：首页与应用中心读取解耦

日期：2026-09-14。状态：用户已批准 W3-A 拆分，并在设计讲解后明确同意本批具体设计；不是实现或验收完成。执行见[实施计划](../plans/2026-09-14-cms-decoupling-w3-a1.md)。

**后续决定（2026-09-14）：**本设计第 3 节“原写入审批校验保持不变”、第 5 节以裸 CMS meta 更新完成连续内容变化的假设，已被[真实阻断记录](../../verification/2026-09-14-cms-decoupling-w3-a1.md)否定。用户批准的[CMS 技术写入与内容批准分离补充设计](2026-09-14-cms-write-approval-separation-design.md)及其[实施计划](../plans/2026-09-14-cms-write-approval-separation.md)在这两点上取代本设计：技术合法不等于获业务批准；本批公开内容必须以独立受保护批准来源、准确前后版本、权限与环境核验，经普通 CMS 或受控 SQL 路径写入。本文其余读取、SEO、页面范围与未迁移消费者边界仍适用；保留原文作为当时决策和失败成因，不倒改为已成功。

依据：[整体职责](2026-09-13-cms-frontend-build-responsibilities-design.md)、[总计划](../plans/2026-09-13-cms-decoupling-overall-plan.md)。工作区 `D:/16Wordpress_nextjs/.worktrees/cms-responsibility-audit`，基线 `a526d6ca178f2fe31ecdca24484ae0c3259242fc`，与本次检查的 develop 相同。

## 1. 范围与方案选择

本批只迁移 `tio2-my` 的 HOME-001 `/`、APP-000 `/applications/` 及直接影响这两页的读取、SEO、可用性和更新依赖。共享页头/页脚的数据来源仍为现有 global-chrome JSON，留 W3-A2；整个 W3-A 不随本批完成而关闭。

采用独立页面技术读契约：PHP/API 与 TS 使用同一技术定义和共享正反例，写入校验继续走原批准合同。拒绝两个替代方案：仅删除全文匹配会失去必要结构检查；继续用批准 JSON 推导允许结构，会保留文案、数组位置与运行 schema 的隐式绑定。

不改变站点域名、导航目的地、产品/应用关系、媒体、品牌事实、视觉、索引授权、表单或 Consent Mode。不引入任意区块编辑器，不迁移真实 CMS 数据，不修改 main、预发布或生产。

## 2. 已核对的问题与入口

| 问题 | 当前入口 | 处理边界 |
|---|---|---|
| PHP 读取调用写入批准校验 | `includes/homepage-v04.php`、`includes/application-hub-v01.php` | 新读校验只接读取消费者，保留原写函数 |
| TS 与旧批准稿比较，DTO 类型从稿件推导 | `homepage-v04-dto.ts/types.ts`、`application-hub-v01-dto.ts/types.ts` | 显式内容类型与技术校验，投影实际 CMS 值 |
| metadata 忽略 DTO 文案 | `lib/seo/homepage-metadata.ts`、`application-hub-metadata.ts` | 使用 DTO title/description，保留发布策略 |
| JSON-LD 的内容接线不统一 | `homepage-jsonld.ts`、`application-hub-jsonld.ts` | 保留实体结构与身份，页面名称/描述和列表标题共源 |
| 应用中心局部显示文本写死 | `malaysia-application-hub.tsx` | 已有对应内容字段的面包屑/标题使用 DTO；无对应字段不擅自新增数据迁移 |
| 首页可用性继续调用旧批准函数 | `includes/editorial-v01.php` 的首页就绪判断 | 合法新首页不因旧全文比较变成不可用；仍查真实记录身份/发布状态 |
| 首页合同 meta-only 变化未覆盖，应用中心事件与标签缺口 | `includes/webhooks.php`、`app/(en)/api/revalidate/route.ts` | 只补本批类型/meta/准确标签；其他族留 W5 |

以上均以当前实际源文件为依据；W0 的历史哈希继续保存，不改写成已在当前版本验证。

## 3. 字段责任与兼容策略

### 内容

标题、介绍、正文、问题/回答、按钮标签、卡片描述和 SEO title/description 从 CMS 读取；保留非空、类型、长度和转义检查，不匹配旧文字。现有块渲染普通字符串，不顺带引入 HTML/Markdown 解析。

纯文案集合（例如应用中心 evaluation.items、首页 company.summaries）按组件支持的统一 item 类型验证，允许有界增减，不保持旧稿长度。包含关系的集合则按下节规则，不因“数组”就全部自由化。

### 身份、关系与呈现结构

- pageId、siteScope、locale、path、schemaVersion/pageType、记录类型、唯一性和状态必须准确。
- `targetPageId`、`href`、`gradeId/gradeIds`、`edgeId`、`key`、`anchorId`、routeRegistry 及 required/conditional 行为属于已存在的关系与协议。明确技术映射只保存这些字段，不复制正文；目标身份与 URL 必须成对一致，拒绝错站、错配、重复标识和悬空锚点。
- 本批保持既有关系集合和已批准链接，不自动增加新应用/产品。显示内容不能决定关系是否存在；关系变更另走有效批准输入。
- 图片 src、尺寸、装饰用途、清权状态和响应式行为保留；不把标为 CLEARANCE_REQUIRED 的历史字段直接改成新授权，也不替换图片。
- `globalChromeRef` 暂保留兼容检查；它的独立来源与版本解耦属于 A2，不隐藏此遗留。

### 审批与政策

packageId、reviewId、contentRevision 是历史追踪信息，合法新值不因与某次旧编号不同而拒绝读取；保留原始 CMS 元数据，不能伪造批准状态。indexingAuthorized/sitemapAuthorized、lifecycle、mappingState 等逐项保持既有有效政策语义，不能当成随意显示文案。

读取端不把内容技术有效等同于允许写入。原 seed/import/publication 的批准验证函数保持原接口与行为；测试同时证明“读允许技术兼容变化”和“原批准写入校验没有被替换”。

### 不使用的重复字段

首页旧 footer 与独立 globalChrome 同时存在：本批不能把修改旧 footer 字段宣传为共享页脚可编辑。新内容投影只对实际消费者负责，冗余字段在兼容输入中明确标为不消费，A2 决定迁移。未知字段不自动透传到 DOM、JSON-LD 或行为分支。

## 4. 读取与 SEO 接线

PHP 记录边界先核对类型、scope、路径、发布状态和唯一性，再验证页面技术结构。首页 GraphQL、显式预览序列化和就绪消费者分别核对调用路径：不把 draft 变成公开 publish，也不新增 MY 首页公开预览入口。

TS 对响应再次校验后构造 DTO，不再通过 `typeof approvedContract` 承担运行契约。PHP 与 TS 用同一共享向量检验缺失、null、错误类型、危险文本、错误关系和合法内容变更。

metadata 保留 `buildTio2MyPublicationMetadata` 的 canonical、语言、robots 和索引授权；只覆盖可编辑 title/description 及已有 OG/Twitter 对应字段。草稿/预览继续 noindex，不用旧文字静默回填。

首页 JSON-LD 保留原五类节点、实体 ID 和关系，不创造新业务事实。WebPage 的名称取实际 hero.heading，已有描述字段适用时取 seo.description；组织名称与页面 company.entityName 共源，保留其他被校验的 CMS 业务字段。应用中心 CollectionPage 保持 hero.h1/seo.description，ItemList.name 改取 applicationPaths.heading；子列表继续受真实 routeReadiness 约束。

## 5. 更新链与隔离验证

补首页合同 meta-only 事件和应用中心类型/合同事件；加入应用中心查询使用的专属标签。保留普通 max 与受控 expire:0 语义，不把两页修改扩成全站 webhook 重构。

真实测试使用本任务唯一隔离 WordPress/MariaDB 和 Next 目标路由构建。复用现有隔离运行工具及所有权/租约/清理边界，不改共享开发 CMS，不触发真实 RFQ 或统计。

一次 Build/进程内，分别对两页做两轮合成安全内容更新：核对实际 GraphQL、页面正文、metadata、JSON-LD 和更新后输出；普通事件以总计划 60 秒观察窗口验收。meta-only 测试不能由保存 post 代替，接口 200 不能代替页面新值。

还需拒绝错站、未发布/重复记录、破坏技术关系及危险输入；核对首页内容变化后关联页面的就绪判断仍正确。抽查桌面/移动端布局及应用中心折叠/条件链接，实际查看截图。失败或证据缺失时不标本批完成。

## 6. 实施与交付顺序

1. 冻结两个页面的精确字段分类、技术映射与共享正反例，写入对应独立 read-contract；不从旧批准正文在运行时生成 schema。
2. 通过 TDD 成套完成 PHP、TS DTO 和读取型 readiness；保留写入路径，运行共享 PHP/TS 向量。
3. 接通正文局部遗漏与 metadata/JSON-LD，回归 Site A/B 共享首页和应用路由。
4. 补本批事件/标签并在真实隔离 CMS 执行连续更新、失败路径与视觉验证。
5. 冻结代码/Build/CMS 证据后独立复审、准确合入 develop、更新开发回执。A2、其他 W3 组与 W5/W6 保持未完成。

本设计仍需落实为包含精确技术字段及测试代码的实施计划；不得仅凭这里的字段类别直接删除旧校验。
