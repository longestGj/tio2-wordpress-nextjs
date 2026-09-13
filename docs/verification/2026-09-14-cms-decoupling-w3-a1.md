# W3-A1 开发进展与阻断记录

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
