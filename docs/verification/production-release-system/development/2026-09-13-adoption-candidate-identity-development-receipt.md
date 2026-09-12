# 接管与候选身份分离修复开发回执

- 状态：`MERGED_TO_DEVELOP`
- 日期与环境：2026-09-13，本地 Windows；未操作生产。
- 范围：D16 阶段一迁移与 CMS 证据校验；由 `tio2-my` 接管触发。
- 授权：用户要求“进行修复”。
- 基线：`b331b16ec9edf95dee0ccf17253b6ea2065389e5`。
- 实现分支：`codex/fix-adoption-candidate-identity`；实现提交：`c5c09e50`。
- 合并提交：`e548ac157a5aadf0d534e25a0c1877a4fe3a8166`。

## 原因与修复

原程序要求原始接管 candidate 与后续 PREPARED candidate 完全一致，导致合法的后续前台版本被误拒绝。本次分别验证两者身份，取消跨版本相等要求。

原始接管仍须通过受保护计划、计划哈希、PUBLIC_READY 日志状态与原始冻结种子文件校验；PREPARED 候选仍须通过自身归档及清单验证。CMS 网站归属、种子顺序和哈希、内容哈希、数量及新鲜度检查仍保留。原始 candidate 新增严格字段及哈希格式检查，其身份仍绑定于 adoption 证据摘要。

修改文件：`ops/production/server/cms_evidence.py`、`ops/production/server/phase1_migration.py` 及对应两个测试文件。

## 验证

- TDD 红灯：原代码下两个身份分离回归按预期失败。
- 实现分支：迁移测试 25 项，1 项平台条件跳过，0 失败；关联测试 55 项，全部通过。合计 80 项，1 项跳过。
- 新增日志计划哈希错误、日志状态错误拒绝用例后，系统输入回归单独重跑通过。
- 独立复审：`review_adoption_identity`，未发现阻塞问题；建议补充的日志保护用例已落实。
- 合并后：`python -m unittest tests.production.test_phase1_state_migration tests.production.test_release_controller tests.production.test_cms_evidence tests.production.test_phase1_migration.Phase1MigrationTests.test_system_inputs_bind_actual_adoption_seed_sequence_before_any_migration_write`，56 项全部通过。
- `git diff --check` 通过。测试日志保存在修复 worktree 的忽略目录 `.tmp/fix/`。

## 发布未决项

本次完成身份逻辑修复，不代表生产接管已通过。离线检查历史归档另发现：

1. 先前准备的 seed-manifest 输入不是预发布回执绑定的原始字节；历史预发布 source 中存在匹配原始文件，后续须使用该原件。
2. 历史 CMS 身份 counts.seedFiles 为 41，orderedSeedHashes 和清单为 42；现有校验会继续拒绝。生成端 seedFiles 统计种子登记记录，须进一步核对统计口径，不能伪造回执。
3. 原始接管清单 40 项，后续候选 42 项。新增 public-paths 与 resource-candidate 两个脚本；38 个共同种子的字节差异经离线比对仅为 CRLF/LF。此结果不能证明当前线上数据一致，不能通过归一化已签定输入或取消内容检查强行放行。

离线回放使用历史证据，不是生产实时验证。本次未修改 main、根 AGENTS.md、生产程序、数据库或流量。旧 1db55914 管理员包不包含本修复，不能作为本次修复后的接管包继续 apply；应解决剩余输入问题，再按发布流程冻结、验证并生成新包。
