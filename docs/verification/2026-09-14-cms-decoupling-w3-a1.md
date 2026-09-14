# W3-A1 开发进展：历史阻断与后续本地验收

- 日期：2026-09-14；状态：`BLOCKED_UNMERGED`，不是开发完成回执。
- 网站/页面：`tio2-my`，HOME-001 `/` 与 APP-000 `/applications`。
- 批准依据：[设计](../superpowers/specs/2026-09-14-cms-decoupling-w3-a1-design.md)、[实施计划](../superpowers/plans/2026-09-14-cms-decoupling-w3-a1.md)。
- 工作分支：`codex/cms-responsibility-audit`；基线与尚未变更的 `develop`：`a526d6ca178f2fe31ecdca24484ae0c3259242fc`。
- 本批未合入 `develop`，未操作 `main`、共享 CMS、预发布或生产。

## 已形成的开发结果

| 检查点 | 实现提交 | 验证与审查 | 状态边界 |
|---|---|---|---|
| 1 技术读契约、记录守卫与原写入隔离 | `03212d0d`、返修 `db4a5e2a` | 6 文件 103 项定向测试；类型/定向 lint 通过；独立审查及返修复审通过 | PHP/TS 共享向量与真实函数测试，非完整 CMS 更新验收 |
| 2 正文/SEO 共源 | `84a9ba50` | 22 文件 362 项测试及类型检查通过；独立审查通过 | 保留 publication policy、A/B、图实体关系 |
| 3 事件与标签 | `3723d74c` | 5 文件 119 项测试；类型/定向 lint/PHP 语法通过；独立审查通过 | 事件生产与 API 失效调用测试，不等于页面已更新 |
| 4 真实隔离运行 | `eeb0869e`（未验收测试夹具） | 真实两页 GraphQL 基线、目标生产模式构建/启动成功；HOME 第一轮内容更新失败 | 连续更新、视觉、负例运行、最终全分支审查未完成 |

以上计数属于不同定向命令，存在重叠，不相加为全站测试总数。原始命令、红绿及复审台账保存在本工作区 `.superpowers/sdd/2026-09-14-cms-decoupling-w3-a1/`。

## 实测根因：读契约已允许，原写契约仍禁止内容集合增项

本轮未修改 `packageId`、`reviewId` 或 `contentRevision`。在真实独立 CMS 中，仅以 `update_post_meta` 修改首页标题、正文、SEO，并将 `company.summaries` 从 3 项增加为 4 项。

实际生产 PHP matcher 的只读最小比较结果：

| 输入 | 原写入校验 |
|---|---|
| 原始合同 | 通过 |
| 仅修改已登记的标题/正文/SEO 文本 | 通过 |
| 上述文字变化，再增加第 4 条摘要 | 拒绝 |

因此并非所有正文仍要求逐字相同。`content-release-validation.php` 已允许登记路径的文本变化，但仍要求数组数量和结构与原合同相同。

实际调用链：`updated_post_meta` → `tio2_enforce_homepage_after_meta_mutation` → `tio2_enforce_homepage_contract` → 原 `tio2_validate_homepage_contract` → 内容 matcher 拒绝新增项 → 将首页降为 `draft`。新公开读记录校验正确拒绝草稿。

最终现场记录：`writeError=tio2_my_homepage_contract_mismatch`、`readError=tio2_my_homepage_read_identity`、`postStatus=draft`；`savePostCalls=0`，`post_modified_gmt` 未变。没有关闭钩子、强制保留 publish 或把旧缓存 HTTP 200 记为通过。

只读核对已有 `wordpress/release/release.php` 与 `registry.php` 后，未找到可接纳本次集合增项的既有批准写入路径；它们仍使用相同 matcher/原页面 validator。

## 真实运行及清理证据

最终 run：`home-application-4002522e-ebaa-47ab-ad12-ed78602178cd`。

- 运行代码：`3723d74c6b30993cb6c94319d551da264ac2af11` 加证据中保存的未跟踪测试夹具；无已跟踪生产代码差异。
- Build：`gtPDtE3illNNZqIB7ckew`；Next PID `60860`，已停止。
- 独立 CMS：`d16-test-home-application-4002522e-ebaa-47ab-ad12--e2798de4c7dc`，已清理。
- 默认测试：2 项 cleanup 测试通过、1 项 live gate 跳过；最终类型检查通过。
- 启用 gate 后：2 项 cleanup 测试通过、1 项真实更新测试失败；失败阶段 `home-round-1`。
- 清理证据的 9 个步骤全部通过；临时凭据、测试构建目录、独立数据库/文件卷已删除，不能作为可恢复的测试实例继续使用；原始诊断日志保留。仓库 `public` 未删除。没有截图生成或视觉验收结论。

本机原始证据：

- [最小写入边界比较](../../.local-evidence/cms-decoupling-w3-a1/home-application-4002522e-ebaa-47ab-ad12-ed78602178cd/write-boundary-probe.json)
- [真实失败](../../.local-evidence/cms-decoupling-w3-a1/home-application-4002522e-ebaa-47ab-ad12-ed78602178cd/failure.json)
- [清理证据](../../.local-evidence/cms-decoupling-w3-a1/home-application-4002522e-ebaa-47ab-ad12-ed78602178cd/cleanup-evidence.json)
- [运行身份](../../.local-evidence/cms-decoupling-w3-a1/home-application-4002522e-ebaa-47ab-ad12-ed78602178cd/runtime-evidence.json)

这些 `.local-evidence` 文件为本机忽略证据，不随此文档提交自动分发。此前四次尝试的测试设施错误/同一写入失败及清理结果在 Task 4 报告中完整保留。

## 已作的局部实施裁定

1. 增补原计划漏列的公开 GraphQL visibility 和 HOME required-parent 两处读取消费者；依据是设计要求真实公开读取与直接依赖可用性。若判断错误，代价为两处额外局部读取变更；已做定向回归及复审。
2. 删除旧测试要求源码包含 `hash_equals` 的过时读取断言，保留结构检查并以真实函数验证读写分离。若判断错误，损失一条源码标记检查；真实原写入拒绝测试仍在。
3. 测试夹具改用与真实路由一致的静态 `revalidate=3600`、`runtime='nodejs'`，继续重导出真实页面与 POST；当前 Next 拒绝配置重导出。潜在代价是未来配置漂移，夹具已加入一致性预检。

## 待用户决定与恢复入口

当前批准设计同时要求“原写入校验不变”和“实际 CMS 内容集合可增减”，真实链路证明两者无法同时满足。本次停止修改写入规则；不把批准校验替换为纯技术读校验，也不缩减验收后宣称完成。

建议由用户决定是否将 CMS 写入校验与批准依据的职责调整纳入本批，再先补设计供审查。决定前保留当前分支与测试失败证据，不合入 `develop`。

两个非阻断审查观察仍待最终审查：PHP absent 断言未严格区分 null；非目标 slug 的 MY application_hub 可能造成额外失效。Task 4、最终全分支审查、集成均未完成；W3-A2、其余 W3/W4/W5/W6 和生产不在本次完成声明内。

## 后续设计决定（2026-09-14）

用户已同意将本批 CMS 技术写入与内容批准职责分离，正式文本见[补充设计](../superpowers/specs/2026-09-14-cms-write-approval-separation-design.md)。此决定允许补充设计与后续计划，不代表本记录中的运行失败已修复；本文保持 `BLOCKED_UNMERGED`，待新实现与真实验收后另记结果。

## 后续本地验证（2026-09-14；`LOCAL_VERIFIED_REVIEW_PENDING`）

以上 `BLOCKED_UNMERGED`、HOME 第一轮裸 meta 写入失败、未生成截图及“Task 4 未完成”均为**当时的历史状态**，原 run 和失败归因保留，不倒写成 PASS。用户后来批准[补充设计](../superpowers/specs/2026-09-14-cms-write-approval-separation-design.md)和[执行计划](../superpowers/plans/2026-09-14-cms-write-approval-separation.md)：对本批两页以独立技术写契约、受保护批准依据、准确版本和权限替代“旧写校验完全不变/裸 meta 更新可成功”的假设。合成证明不是业务批准，两个页面的 `packageId`/`reviewId` 也不是批准凭据。

Task 1–4 的独立局部审查及返修复审已清；Task 5 实现提交为 `f14da2a65fe41773c28813cf5c3601cb2be6edfe`，其两次完整真实隔离运行绑定父提交 `2f2aa847e8949ea2ce97fe29e13b833738951aff` 加冻结的 dirty-code SHA-256 `004134d026cd1bc628df15f52bc220ec5c2467831ab1c857db7565e47b144007`（提交后同一源码）。此后仅测试设施清理失败路径修正提交 `f3099ef391ae444c29f291fdfc49ccbc825fffd5`，针对该修正的 9 项故障/清理测试通过；**未**把下列旧页面 run 声称为在 `f3099ef3` 上重跑。Task 5 独立审查及 fix1 复审现已清，最终 W3-A1 全范围审查仍待控制者执行。

| 原始 run / 命令 | 实际结果与身份 | 证据边界 |
|---|---|---|
| `4c7f13cd-8074-473b-81af-875aa7c96357`；gate 启用的 `npx --no-install vitest run tests/integration/homepage/home-application-local-runtime.test.ts` | 退出 0，3 passed，346.10 秒；真实隔离 CMS/Next，Build `Bf94Vgts_sEown13N9NxP`，同一进程 PID 39380 | HOME/APP 普通路径各两轮、批量 SQL 各两轮；失败/恢复/视觉与所有 10 项 owned 清理通过 |
| `6d83b5e9-cdee-4858-af89-22531e4cff0f`；`python tests/production-runtime/content_approval_rehearsal.py` | 退出 0，3 passed，328.07 秒；独立资源，Build `g5_5N6yGzZmP0Kme2NLER`，同一进程 PID 61828 | 同样两条真实写入→GraphQL→签名刷新→HTML/meta/JSON-LD/站点地图路径；10 项 owned 清理通过，非前一次 run 的重播 |

两次运行都在同一各自 Build/PID 内实际观察 HOME/APP 正文、SEO、数组增减及随后删减；普通回调接收、Next 失效调用、页面新值分别留痕，不能以 HTTP 200 或同 body 重播的空失效列表代替新版本。实际数据库注入读回错误时未提交目标变更；批量维护窗口内注入读回或提交后页面验证故障时以所属整库备份恢复并核对旧页面和 reopened public 入口。数据库恢复和通知失败分开：普通写入已 COMMIT 后通知失败保留新内容，可在权限约束下仅重试原收据，不重新提交内容；批量窗口关闭且新写入开放后不自动回滚旧备份。12 张桌面/移动截图及应用展开/折叠、条件链接已实际查看；长图只按缩放总览，不宣称逐像素验收。证据见本机忽略目录 `.local-evidence/cms-decoupling-w3-a1/home-application-<runId>/`，不随 Git 自动分发。

本批仅覆盖 `tio2-my` HOME-001/APP-000。普通保护包括 `wp_insert_post`/`wp_update_post`、REST/ACF/meta 与正常 cron，但特权代码直调低层 `wp_publish_post` 或 SQL 不在保证内；外部持久化 object cache 无法证明隔离时拒绝公开写入。批准根、环境 ID、非 root WP writer UID、真实 edit/publish capability 均须由安装/实际用户独立提供并在写入前核对；只读、其他页面族、A/B 保持先前规则。旧 `d16-content-package-v1` 对 U+2028/U+2029 的既有 canonical 传输差异仍会拒绝此类包，虽新批准摘要 PHP/Python 已一致；隔离导入器复现拒绝且所选目标 posts/meta 未变。Task 4 的目标快照未覆盖全部 post 字段、meta 行 ID 或 scope 关系，不能据此单独宣称“完整 posts/meta/整库未变”；整库恢复另据上列 Task 5 实际演练。没有安装证明、正式业务批准、Preview/Production 部署或生产能力变更；登记仍为 `content-only: not-installed`。

最终复审需明确裁定原 W3-A1 ledger 的两项 minor（PHP absent/null 断言、非目标 slug 的 MY application_hub 可能额外失效），以及新计划的两项 deferred minor（Task 1 单缺陷负例夹具、Task 4 局部快照措辞）；不能因局部审查已清而静默关闭。当前分支来源 `f3099ef3`，`develop` 已从原 W3-A1 基线 `a526d6ca` 前进到 `d5a061f6`；合入前须复核目标新增的 content hooks/产品路由相关回归、全范围审查、工作树及 merge diff。**本记录现在是本地验证且待审查，不是 `MERGED_TO_DEVELOP` 开发回执。**W3-A2、其余 W3/W4/W5/W6 及生产均未因此完成。

## 最终开发回执（2026-09-14；`MERGED_TO_DEVELOP`）

上节 `LOCAL_VERIFIED_REVIEW_PENDING` 及更早的 `BLOCKED_UNMERGED` 是各自时点，原失败和 run 不变。本节仅对 `tio2-my` HOME-001 `/`、APP-000 `/applications/` 的本批代码与本地开发合入结果生效。原基线 `a526d6ca178f2fe31ecdca24484ae0c3259242fc`；目标 `develop` 合入前为 `d5a061f60c7521a58b59292e337fe2788394cae9`；控制者已将最终实现 `034a416f58b490ee504052e92ffc361f1228c4f4` 准确 fast-forward 到 `develop`。本次写回执前只读核对目标工作树干净、HEAD 为 `034a416f` 且该提交是 `develop` 祖先。当前回执提交由控制者另核差异后推进，不把回执写入动作冒称此前生产或主分支操作。

Task 1–5 各自独立审查与返修复审已清；针对 `a526d6ca..19797e19` 的最终全范围只读审查发现一项 Important：新生成的 HOME/APP 页面验证映射仍取旧 inventory SEO，而前端已取 CMS SEO，合法候选可能在维护窗口页面验证时被误拒。修复提交 `034a416f` 只改 fresh-map 选择和直接测试，改由候选 CMS title/description 派生两页预期 SEO，仍由 inventory/环境控制 canonical、robots、sitemap；既有已登记 map 不被自动改写。修复前真实 verifier 用例 7 项中 HOME/APP 两项 RED，修复后同命令 7 项 GREEN，另有 18 项 content-hook 回归通过；定向独立复审结论为该 Important 已解决、无新增破坏。该修复是源码兼容，不是生产重新登记。

控制者在准确目标 `develop@034a416f`、本地 2026-09-14 09:12（Asia/Shanghai）运行并记录：

| 命令 / 环境 | 结果 | 边界 |
|---|---|---|
| `python -m pytest tests/production/test_content_hooks.py tests/production/test_content_verification_map.py tests/production/test_content_docker.py tests/production/test_site_content_adapter.py tests/production/test_content_release.py tests/production/test_content_rehearsal_failures.py -q` | 64 passed、1 skipped，22.47 秒，退出 0 | 唯一 skip 为未启用 `D16_TEST_REHEARSAL_DOCKER_FAILURES` 的门控 Docker probe；较早在 `f3099ef3` 上单独启用并实际通过 9 项故障/清理测试，不能记作本次未跳过 |
| `npx --no-install vitest run tests/integration/api/revalidate.test.ts tests/integration/api/product-revalidation.test.ts tests/integration/api/home-application-revalidation.test.ts tests/unit/homepage/metadata.test.ts tests/unit/homepage/jsonld.test.ts tests/unit/applications/malaysia-application-hub-seo.test.ts tests/unit/homepage/home-application-read-contract.test.ts` | 7 文件、215 passed，4.54 秒，退出 0 | 本批刷新与正文/SEO 及直接共享消费者回归；不与前述旧命令计数相加 |
| `npx --no-install tsc --noEmit --incremental false`；`git diff --check` | 均退出 0，类型检查无诊断、差异检查无问题 | 目标开发代码核对；不是生产构建或发布侧验收 |

两次真实隔离 CMS→Next 页面验收仍严格属于前述 `f14da2a6` 冻结源码/hash 和两个独立 run；`f3099ef3` 是清理失败路径修正，`034a416f` 是 fresh-map 修正。合并后定向测试覆盖新映射及直接消费链，但未把旧 Build、截图或数据库 run 重新标为最终 SHA 的全页面运行。接收事件、失效调用与最终页面输出继续分别报告；目标站适用完整生产安装、业务批准、预发布/生产验收及发布均未发生，网站登记 `content-only: not-installed` 不变。未迁移 MY 页面族、Site A/B 和共享 chrome 仍按原边界；W3-A2 及其余 W3、W4–W6 不随本批关闭。

### 技术裁定与显式代价（按执行台账原顺序）

1. HOME 旧 footer 只允许保留当前完整值与存在性，`current_json=null` 不得新添；代价是新草稿 seed 须省略该字段，不用旧稿推导新运行 schema。
2. 独立安装非 root `TIO2_CONTENT_WRITER_UID`；批准文件及祖先须 root 拥有、不可组/其他写且无符号链接，不从 CLI euid 推断写身份。代价是配置更严格、无法验证时拒写；root CLI 本身不构成受保护来源证明，未改机器权限。
3. 完整 JSON 内容摘要拒绝浮点和超出精确 53 位范围的整数；代价是未来不受支持数据被拒，而非悄悄舍入或改批准字节。
4. 新批准摘要在 PHP/Python 两端使用字面 U+2028/U+2029，旧内容包 canonical 保持原样；代价是将来若迁移批准格式须另做版本转换，不能静默改旧包哈希，现存分隔符传输拒绝另行披露。
5. 普通 PHP `meta_input` 拒绝用核心 pre-SQL `wp_insert_post_empty_content` 门，REST 用明确 pre-insert 错误；代价是低层 PHP 调用得到核心通用 `empty_content`（按调用方式为 0 或 WP_Error）而非定制文案，限制仅本批目标。
6. 无法证明隔离的外部持久化 object cache 安装拒绝普通事务；请求内暂停 cache additions 后恢复原状态。代价是此类环境中的获批写入暂不可用，而非冒险留下未提交缓存；未改生产 cache 安装。
7. 普通保证覆盖 `wp_insert_post`/`wp_update_post`、REST/ACF/meta 与正常 cron（MY future 在低层发布前拒绝），其他族委派原行为。特权自定义 PHP 直接调用无 capability 门且先写 SQL 的低层 `wp_publish_post` 及直接 SQL 不支持；代价是可信特权代码仍可绕过普通钩子，不能声称普遍拦截所有 API。
8. 通知重试在时效内复用原收据/事件体，过期时先持久化新事件 ID/时间并保留旧尝试身份；代价是模糊超时后可能重复失效缓存，但不重复写内容；409/超时不得记作已送达。
9. 通知专用重试仅接受服务端存储的不透明收据 ID，重新核对固定目标的 edit/publish capability、已安装站点/环境，不要求额外 `manage_options`；代价是未来操作员模型可能需收紧权限。收据提交前持久化失败回滚，提交后结果持久化失败保留已提交内容及不确定状态，不能由调用者供应事件/终点。
10. 受保护 runtime-v1 可选严格 `approvalId`，只由固定执行配置传给 validate/import，包不能覆盖；根/环境/writer UID 仍由 PHP 安装常量提供。代价是未来工具需协调配置版本；缺 ID 只拒本批迁移页写入，export 与其他族保持兼容；源代码支持不等于安装。
11. 真实 POSIX root 保护/执行钩子的测试采用准确命名且归属核验的 Linux 控制器，Windows 不模拟权限；代价是多一个 Docker 测试运行依赖。Docker socket 只读挂载不限制其 API 权限，仍须以 owned 名称、标签和配置限界；未操作共享镜像或生产。

最终审查的三项非阻断 minor **递延、未静默关闭**：Task 1 来源负例夹具存在替代拒绝原因（后续改为其余字段有效、每例单缺陷）；PHP absent/null 投影断言混淆（后续加存在标志/哨兵）；MY application_hub 非规范 slug 可能造成额外失效（后续精确身份过滤且保留真实身份变化的 before-image 失效）。审查未发现它们在本批造成批准绕过、内容泄漏或跨站写入。两项文档 minor **已解决**：Task 4 局部目标快照不再称完整 post/meta/整库证明；README 已披露旧包 U+2028/U+2029 限制。它们的处置及已知旧包拒绝边界不扩展本次安装、生产或其他网站授权。
