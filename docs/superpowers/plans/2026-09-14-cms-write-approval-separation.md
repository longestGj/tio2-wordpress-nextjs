# CMS Write / Approval Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** HOME-001 与 APP-000 的获批技术兼容版本能够安全写入并更新，拒绝候选不会破坏当前有效页面。

**Architecture:** 独立内容技术校验、受控批准核验、普通 WordPress 写入和批量 SQL 导入两个适配器。复用已有读契约、内容包、事务/维护窗口及更新链，不把技术测试通过当作业务批准。

**Tech Stack:** 仓库锁定 PHP/WordPress/WPGraphQL、Python、TypeScript/Vitest、隔离 MariaDB、Next 与 Playwright。

**Spec:** [已确认正式设计](../specs/2026-09-14-cms-write-approval-separation-design.md)。本文为待执行计划，不是实现声明。

**执行状态（2026-09-14）：**Task 1–5 的局部实现、定向审查和两次隔离真实页面验收已记录于[W3-A1 验证回执](../../verification/2026-09-14-cms-decoupling-w3-a1.md)；本计划的未勾选步骤保留原验收清单语义，不表示已经逐项合入 `develop`。Task 6 文档与定向验证进行中，`a526d6ca` 至最终实现的总审查、四项 deferred minor 最终裁定、目标 `develop` 漂移核对及准确合并由控制者完成。在这些条件成立前仅可记 `LOCAL_VERIFIED_REVIEW_PENDING`，不得写 `MERGED_TO_DEVELOP`；无生产安装或发布。

## Global Constraints

- 范围限于 `tio2-my` HOME-001 `/`、APP-000 `/applications` 及其普通 CMS 保存、受控批量导入和直接更新依赖。其他页面族、Site A/B 继续原有规则。
- 共享外壳留 W3-A2；不新增审批后台、内容版本指针、数据库拆分或部署系统，不新增媒体、导航或业务事实。
- 摘要只标识内容版本，不证明批准；材料中的 `approved=true`、packageId 或 reviewId 都不能自行授予权限。
- 批准内容不等于允许修改真实环境；目标环境和允许动作继续依独立操作授权。
- 普通保存与批量导入分别执行真实隔离验证，不能以其中一条通过替代另一条。
- 本批不自动批准旧数据、不批量修改批准编号、不升级生产工具或安装服务器能力。
- 工作区 `D:/16Wordpress_nextjs/.worktrees/cms-responsibility-audit`；分支 `codex/cms-responsibility-audit`；计划前 HEAD `69545ade`。执行前重新核对 HEAD/develop，保留已有未提交文档。
- 发布工具源代码适配及隔离测试在范围内；生产安装、远程调用、main、预发布运行、真实表单/统计外发、`verify:root-only` 均不在范围内。
- 复用原 W3-A1 已审查的读取、SEO、事件实现，不重复派工；历史失败不改写为通过。本计划替代原“未授权裸 meta 更新应成功”的验收假设。

## 固定接线：批准记录不是测试回执

现有 `prepare_content_candidate.py` 与 `SiteContentAdapter._package` 只核对不可变候选及技术测试回执，没有独立的业务批准核验。保留 `d16-content-package-v1` 的记录格式，不往内容包添加自证批准字段。

采用小型只读批准材料适配器，不建立审批系统：受授权的运营/交付流程审核准确内容后登记批准记录；程序只核验，不自动生成真实批准。安装配置 `TIO2_CONTENT_APPROVAL_ROOT` 指定受控根目录，按严格 ID 读取 `<approvalId>.json`。根目录不可由请求/包指定，文件及父目录不可由 WordPress 写入身份修改；拒绝符号链接、非普通文件、路径穿越及权限不可信的来源。隔离测试启动器生成明确合成的材料并只读挂载，生产目录/权限安装另行授权。

记录字段固定为：`schemaVersion=d16-content-approval-v1`、`approvalId`、`sourceRef`、`sourceSha256`、`siteId`、`environmentId`、`validFrom`、`validUntil`、`operation`、`records`。每个 record 恰含 `pageId`、`locale`、`beforeSha256`、`afterSha256`；页面升序、无重复。时间为 UTC Unix 秒；摘要为小写 64 位 SHA-256。只接受 `update-published`、`publish-draft`，不扩大撤回权限。批准 ID 匹配 `[A-Za-z0-9][A-Za-z0-9_-]{0,95}`。

`sourceRef/sourceSha256` 是受控登记者核对原批准材料后的追踪依据，不代表程序能自行解释任意文档的审批结论。信任根是独立登记权限及执行权限，不是哈希或“文件存在”。每次提交前重新读取，记录缺失/移除/过期即拒绝；环境 ID 来自安装配置 `TIO2_CONTENT_ENVIRONMENT_ID` 并与实际运行核对。操作方可选批准 ID，不能选择根目录、数据库 ID、验证函数或 SQL。缺少批准根或环境配置时，本批公开内容变更拒绝；只读和其他未迁移页面不凭空失效。

内容摘要覆盖完整受保护存储 JSON，不能只覆盖展示投影。复用现有 canonical 规则并通过 PHP/Python 共享向量核对：对象键排序，数组顺序保留，重复键/非有限数字/不支持的值拒绝。未知写入键拒绝；旧 footer 只允许保留当前值，不开放共享外壳编辑。读端保留已有未知字段忽略策略。

## Task 1：技术写契约与批准核验核心

**Files:** Create `wordpress/plugins/tio2-site-model/includes/content-write-contract.php`、`content-write-approval.php`；Create `tests/fixtures/content-write-approval-cases.json`、`tests/infrastructure/php/content-write-approval.php`、`tests/infrastructure/content-write-approval.test.ts`；Modify `tio2-site-model.php` 加载模块，必要时从 `includes/home-application-read-contract.php` 抽取共用技术核心，不放宽规则。

**Interfaces:**

```php
function tio2_validate_my_content_write(string $page_id, string $candidate_json, ?string $current_json); // true|WP_Error
function tio2_content_digest(string $json): string; // invalid JSON throws
function tio2_load_content_approval(string $approval_id); // array|WP_Error
function tio2_check_content_approval(array $approval, string $environment_id,
    string $operation, array $before, array $after, int $now); // true|WP_Error
// before/after 为 pageId => 完整 JSON；校验内容不要求 publish，不授予批准。
```

- [ ] 测试先复现旧 matcher 对技术合法增项的拒绝；新核心测试不得把缺文件/函数错误当有效 RED。覆盖 HOME summaries 和 APP evaluation 增减、32 项上限、危险文字、错链接、未知键和旧 footer 变更拒绝。
- [ ] 共享批准向量包含合法匹配、缺/重复页面、错环境/站点/语言、尚未生效/过期、篡改 after、过时 before、包内自证批准、穿越、可写来源、符号链接、重复 JSON 键。

```php
// test_approval_for 仅为本任务 harness 的合成材料构造器，不进入生产代码。
$before = ['HOME-001' => $original_json];
$after = ['HOME-001' => $changed_json];
$proof = test_approval_for($before, $after);
assert(tio2_check_content_approval($proof, 'isolated-run-001', 'update-published', $before, $after, $now) === true);
$proof['records'][0]['afterSha256'] = str_repeat('0', 64);
assert(is_wp_error(tio2_check_content_approval($proof, 'isolated-run-001', 'update-published', $before, $after, $now)));
```

- [ ] 最小实现复用技术 schema，保持 object/list、Unicode、关系和政策规则。批准来源校验和纯内容匹配分开；生产时钟来自系统，不来自包。错误分为 `approval_missing`、`approval_untrusted`、`approval_scope`、`approval_expired`、`approval_content`、`write_schema`，不输出正文/密钥。
- [ ] 运行 `npx --no-install vitest run tests/infrastructure/content-write-approval.test.ts tests/infrastructure/home-application-read-contract.test.ts`；保存真实 RED/GREEN，精确暂存，提交 `feat: separate content write schema and approval checks`。

## Task 2：普通 CMS 受控写入与前置保护

**Files:** Create `wordpress/plugins/tio2-site-model/includes/content-write.php`、`wordpress/plugins/tio2-site-model/includes/content-write-guards.php`、`wordpress/approved-write.php`（CLI-only，无公开 HTTP 入口）、`tests/infrastructure/php/content-write-guards.php`、`tests/infrastructure/content-write-guards.test.ts`；Modify 插件 `tio2-site-model.php`、`includes/fields.php`、`includes/homepage-v04.php`、`includes/application-hub-v01.php`、`includes/webhooks.php`，以及 `wordpress/seed/apply-tio2-my-homepage.php`、`wordpress/seed/apply-tio2-my-application-hub.php` 的批准传入适配。

**Interface:**

```php
function tio2_apply_approved_content(string $approval_id, string $operation, array $records); // array|WP_Error
// records 只含 pageId/content；postId/metaKey 在服务器登记中定位。
// 成功结果：changedPages, beforeDigests, afterDigests, committed, notificationState。
```

入口验证实际 actor 对目标记录的 edit/publish capability；CLI 显式选择 WordPress 用户，包不决定用户。服务核验批准后建立本次精确上下文，内部调用真实 WordPress meta/状态 API。已有后台/REST/ACF 请求无此上下文时只能做有效草稿操作或拒绝公开内容变更；不新增审批 UI。

- [ ] 用真实函数复现旧行为：未批准 scalar 可覆写、增项事后降草稿。新目标均为拒绝且原 JSON/status 不变；另写获批上下文成功测试。
- [ ] 在 add/update/delete meta 前置过滤器注册守卫，早于既有 before-mutation 捕获。无精确许可的公开内容变更拒绝；同值无变化不制造批准或事件。状态入口防止 publish→draft→修改→publish 绕过批准，合法撤回仍按原权限处理。
- [ ] 实现事务及固定 pageId 顺序锁，锁定目标 post/meta/scope 归属，重新核对唯一性、身份、权限、完整 before 摘要及有效批准。无法确认事务能力、锁或外部事务协调时拒绝，不假装原子性。

```text
begin → lock/reload → schema + fresh approval + capability check
→ exact operation context → WordPress API writes → readback/identity check
→ commit → release deferred events
failure → rollback + invalidate touched object caches
finally → clear exact context/locks
```

- [ ] 上下文只允许确定网站/记录/meta/摘要/操作，禁止通用布尔 bypass、嵌套借用和异常后残留。最终提交边界重新验证，不能仅在请求开始比较版本。
- [ ] 本批事后守卫改查技术有效性而非旧稿形状，损坏记录仍防御。原批准函数的调用语义明确迁移，不将其改成总是 true。seed 更新/发布同样显式承接批准，不因运行 seed 自动批准新版本。
- [ ] 覆盖双进程竞争只允许正确 before 的一个提交、权限不足、草稿再发布、meta 删除/重复行、读回故障、异常清理、A/B 不变。事务内事件捕获但不外发，Task 3 补齐提交后处理。
- [ ] 运行 `npx --no-install vitest run tests/infrastructure/content-write-guards.test.ts tests/infrastructure/content-write-approval.test.ts tests/infrastructure/homepage-wordpress-contract.test.ts tests/infrastructure/homepage-seed-contract.test.ts`；提交 `feat: guard approved CMS writes before mutation`。

## Task 3：提交后的事件与错误结果

**Files:** Modify 插件 `includes/content-write.php`、`webhooks.php`；Create `tests/infrastructure/php/content-write-events.php`、`tests/infrastructure/content-write-events.test.ts`。

**Interface:** Task 2 结果分别记录 `committed` 与 `notificationState`；后者为 `not-needed`、`pending`、`sent`、`failed`。提交后通知失败不等于内容已回滚。

- [ ] 实际 webhook HTTP 边界测试：事务内零外发，rollback 后零外发，commit 后按站点/路径合并一次。预期不可从被测函数生成。

```php
// harness 注入 HTTP 失败，观察真实写入与 webhook 函数。
$result = tio2_apply_approved_content($id, 'update-published', $records);
assert($result['committed'] === true);
assert($result['notificationState'] === 'failed');
assert(test_current_json('HOME-001') === $approved_json);
assert(test_content_write_count() === 1);
```

- [ ] 最小实现按操作暂存事件，提交后释放；失败仅清理本操作事件，不丢弃同请求其他合法事件。保留 HMAC、站点、重放、max/expire:0。
- [ ] 操作回执保存失败事件身份及目标，重试仅通知、不重写内容。复用既有刷新机制，不新增后台调度服务；回执存储不可写入页面正文。
- [ ] 回归 `npx --no-install vitest run tests/infrastructure/content-write-events.test.ts tests/infrastructure/home-application-webhooks.test.ts tests/integration/api/home-application-revalidation.test.ts tests/integration/api/product-revalidation.test.ts tests/integration/api/revalidate.test.ts`；提交 `fix: emit content events only after committed writes`。

## Task 4：受控批量导入适配

**Files:** Modify `wordpress/release/registry.php`、`release.php`、`README.md`；Modify `ops/production/server/content_docker.py`、`content_release.py`、`site_content_adapter.py`（只做批准依据传递和两页适配，不重构控制器/安装器）；Create `tests/production/test_content_approval_binding.py`、`tests/infrastructure/php/content-approved-import.php`、`tests/infrastructure/content-approved-import.test.ts`；更新直接受影响的 `tests/production/test_content_docker.py`、`test_site_content_adapter.py`、`test_content_release.py`。

**Interface:** 保留内容包和 `validate/export/import` 操作。固定调用从受控执行配置取得 `D16_CONTENT_APPROVAL_ID`；它仅选取独立批准根中的记录，不能来自内容包。只读 export 不要求写许可；validate/import 都核验批准，import 另核验执行身份和数据库 fence。测试 PASS 永远不生成批准。

- [ ] 用实际导入器复现旧 matcher 拒绝获批增项；测试未迁移页面保持原规则、mixed batch 一条无效则全批不提交。
- [ ] 注册表两个分支改用技术记录校验，能定位已合法更新的记录，不因旧数组长度失效；其他 validator 原样保留。
- [ ] 事务前预检，事务内锁定记录后重新核对 before、批准有效性、实际归属和数据库身份，不能使用事务前快照完成最终判断。固定 SQL 目标、fence、备份和整库恢复保持原边界。
- [ ] 写入完整候选而非按旧稿恢复数组数量；旧 footer 依 Task 1 兼容规则。读回 hash 与批准摘要一致，否则回滚；不调用逐条 WordPress webhook。

```python
def test_test_receipt_is_not_content_approval():
    # 两个 helper 在本任务测试文件定义；准备真实候选，调用隔离 PHP 导入器。
    result = run_isolated_import(candidate_with_test_receipt(), approval_id=None)
    assert result.committed is False
    assert result.before_json == result.after_json
```

- [ ] PHP/Python 共享向量核对 canonical 摘要；拒绝过期/错环境/错误摘要/旧基线/数据库身份不符。运输参数单测与真实导入测试分别记证据，不用预设返回值代替导入行为。
- [ ] 提交后沿用现有引擎 refresh/verify，不重复发逐记录事件。失败维持可恢复窗口与备份所有权；无生产调用。
- [ ] 运行 `python -m pytest tests/production/test_content_approval_binding.py tests/production/test_content_docker.py tests/production/test_site_content_adapter.py tests/production/test_content_release.py` 及 `npx --no-install vitest run tests/infrastructure/content-approved-import.test.ts`；提交 `feat: verify approved versions in content import`。

## Task 5：两条真实链路与故障验收

**Files:** Modify `tests/helpers/home-application-runtime-fixture.ts`、`tests/fixtures/home-application-runtime/apply-synthetic-home-application.php`、`tests/integration/homepage/home-application-local-runtime.test.ts`；Create `tests/production-runtime/content_approval_rehearsal.py`，复用既有 `content_rehearsal.py` 的 owned 资源/恢复模式；更新 `tests/infrastructure/home-application-read-contract.test.ts` 及 PHP harness 中原写校验断言，保留未批准拒绝证据。

**Interface:** 测试启动器在本次隔离环境登记合成批准并只读挂载，绑定 runId/精确前后摘要。PHP fixture 调 Task 2 服务，服务内部仍执行真实 meta-only API，钩子保持启用；生产代码不得根据测试 gate 放行。

- [ ] 重现保留的 summaries 3→4 失败用例，使用有效合成批准修复目标行为，保存新 RED/GREEN 与旧 run，不改写旧记录。
- [ ] 普通路径每页两轮：第一轮增项并修改正文/SEO，第二轮删去新增项并再改文字。各轮批准不同准确版本，同一 Build/PID；60 秒内采集 GraphQL、事件、POST、HTML/meta/JSON-LD 新值。
- [ ] 无批准裸 meta、批准后篡改、错站/页/环境、过期、重用旧 before、并发竞争均验证拒绝且 JSON/status 不变；合法批准但危险内容仍拒绝。草稿保存、未批准发布、获批发布分别验证。
- [ ] 真实数据库注入读回/通知失败，核对回滚或“已提交但通知失败”；重试通知不重复写内容。
- [ ] 批量路径实际验证两页增减、混合未迁移页面、过时 before、读回错误和至少一次维护窗口内恢复；核对其他站数据与备份/窗口所有权。导入后连接真实 Next 目标 fixture、实际刷新并读两页输出，不把旧 rehearsal 的 HTTP stub 当页面验收。
- [ ] 保存并实际查看两页 390/1440 截图、应用折叠/条件链接；更新后核对首页 readiness。没有截图查看不称视觉通过。
- [ ] 成功/失败均逐步清理本任务浏览器、Next、租约、callback、CMS、两个卷、fixture、临时批准/凭据；保护 public junction 目标。保留脱敏证据，不保留可写临时许可。

```powershell
$env:HOME_APPLICATION_LOCAL_RUNTIME = '1'
try {
  npx --no-install vitest run tests/integration/homepage/home-application-local-runtime.test.ts
  if ($LASTEXITCODE -ne 0) { throw 'Live acceptance failed; retain failure evidence.' }
} finally { Remove-Item Env:HOME_APPLICATION_LOCAL_RUNTIME -ErrorAction SilentlyContinue }
python tests/production-runtime/content_approval_rehearsal.py
npx --no-install tsc --noEmit --incremental false
```

- [ ] rehearsal 只创建 owned `d16-test-*` 资源，拒绝生产端点。保存精确 commit/dirty hash、Build、CMS、合成批准身份、各轮摘要和清理；默认 gate 的清理测试通过。提交 `test: verify approved content writes end to end`。

## Task 6：复审、文档与准确集成

**Files:** 更新 `docs/superpowers/specs/2026-09-14-cms-decoupling-w3-a1-design.md`、`docs/superpowers/plans/2026-09-14-cms-decoupling-w3-a1.md` 的替代说明；`docs/content-release.md`、`docs/software-architecture.md` 只写经过验证的现状；更新 `docs/verification/2026-09-14-cms-decoupling-w3-a1.md`，保留历史失败。

- [ ] 各任务独立审查；实现完毕后对 W3-A1 起始 `a526d6ca` 至最终实现做一次全范围审查。原 ledger 的 PHP absent/null 和 app 错 slug 额外失效两项 minor 明确处置，不静默丢弃。
- [ ] 汇总运行所有新测试及直接影响回归、类型检查和 diff check，精确记录跳过；不跑无关全仓或 root-only。
- [ ] 核对文档链接、信任根、执行权限及两类恢复条件；没有安装就不修改生产能力登记。
- [ ] 重新核对 develop、来源 HEAD、工作树及 merge diff。现有 dirty 文档逐项确认，不能整批暂存。来源或目标变化触发相关复验。
- [ ] 依既有开发授权准确合入 develop，运行合并相关回归并提交 `MERGED_TO_DEVELOP` 回执；不改 main、不 push、不部署。

## 自检与停止条件

| 设计要求 | 任务 |
|---|---|
| 独立技术规则、原稿非模板 | 1、2、4 |
| 批准来源、准确版本、时效/环境/权限 | 1、2、4、5 |
| 拒绝保留当前版本、草稿/发布隔离 | 2、5 |
| 并发最终边界、rollback/通知分离 | 2、3、4、5 |
| 两类写入与未迁移消费者 | 2、4、5 |
| 同 Build 连续更新和视觉 | 5 |
| 文档、复审、准确集成 | 6 |

1 输出核心；2 消费核心并输出受控服务；3 完成服务的提交后事件；4 消费核心但保留批量事务；5 验证两条链；6 交付。任务 2/3 共享文件，必须串行。目录/配置/测试设施归属于需要它的任务，不单独扩成系统。

如果现有权限/数据库接口不能实现提交边界一致性，或需要新增审批系统、生产安装、破坏既有恢复机制，停止对应任务并提出具体差异，不用 bypass 或削减验收继续。没有真实更新、两类路径和独立审查证据，W3-A1 不标记完成。
