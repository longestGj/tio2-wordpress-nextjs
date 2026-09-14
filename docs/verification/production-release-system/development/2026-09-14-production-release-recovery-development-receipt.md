# 生产发布恢复与证据链修复开发回执

- 状态：`MERGED_TO_DEVELOP`
- 任务 ID：`production-release-recovery-20260914`
- 网站 / 主体：`tio2-my`；共享生产安装程序、前端发布恢复策略及完成证据生成器
- 批准输入与版本：用户在 2026-09-14 明确要求修复 CMS 重复升级、先解决 Resource 合同数据、前端失败不自动回滚且其他恢复策略保持原设计，并确认三封生产表单邮件均于北京时间 10:22 收到；用户要求不保存 `.eml`
- `develop` 合并 commit：`1ab1a9a02958394135b655d912463dd12d69e1cf`
- 合并前 `develop`：`975e2f2cddc8fef31589bd67ab9cd8d3009428a5`
- 来源分支与实现 commit：`codex/fix-cms-repeat-upgrade`，`5274fdd2dc2d3876e5998d4059d93ceb310d39e2`
- 独立代码复审：最终通过，准确绑定 `5274fdd2dc2d3876e5998d4059d93ceb310d39e2`。复审发现并阻断 malformed `actionEvidence` 降级漏洞；返修后确认只有字段完全缺失时才允许 legacy，字段存在但为 `null`、字符串或数组均被拒绝。独立复跑 completion 14/14 通过，未发现剩余代码阻断

## 改动路径

- CMS 安装与权限：`ops/production/server/content_install_resources.py`、`ops/production/server/deployment_core.py`
- 前端恢复与程序升级：`scripts/production/phase1_program_upgrade.py`、`tests/production/test_phase1_program_upgrade.py`、`tests/production/test_site_frontend_adapter.py`
- 完成证据：`scripts/production/New-ProductionCompletionEvidence.ps1`、`tests/production/test_completion_current_candidate.py`
- 发布测试隔离：`tests/e2e/prerelease-live-forms.spec.ts`、`tests/e2e/production-public-surface.spec.ts`
- 历史合同测试夹具：`tests/production/test_collect_cms_comparison.py`、`tests/production/test_route_repair.py`、`tests/production/fixtures/tio2-my-route-repair-public-paths.json`
- 权限回归：`tests/production/test_content_install_permissions.py`
- 验证记录：`docs/verification/2026-09-14-cms-repeat-upgrade-local.md`、`docs/verification/2026-09-14-frontend-failure-policy.md`、`docs/verification/2026-09-14-resource-contract-migration.md`

## 合并后验证（2026-09-14）

- `python -m unittest tests.production.test_completion_current_candidate tests.production.test_site_frontend_adapter tests.production.test_route_repair tests.production.test_collect_cms_comparison tests.production.test_phase1_program_upgrade tests.production.test_content_install_permissions`：共 82 项，77 通过、5 个平台条件跳过，退出码 0
- `python -m unittest discover -s tests/production -p 'test_*.py'`：共 802 项，785 通过、17 个平台条件跳过，退出码 0
- `npm run typecheck`：Next 路由类型生成及 `tsc --noEmit` 通过；Next 自动加入的临时 `tsconfig.json` include 已恢复，未纳入提交
- `npm run test:production:surface`：177/177 通过，覆盖 59 个页面或系统路由及 1440、768、390 三个视口
- `npx vitest run --exclude ".tmp/**"`：3843 通过、57 跳过、45 失败，23 个测试文件失败。失败集中于合并前已存在的 SEO/索引旧预期、种子哈希和清单漂移，以及 WordPress/Docker 并发环境测试；失败文件均不属于本次 16 个合并路径。本次 release、completion、恢复策略和权限测试没有失败
- `git diff --check HEAD^1..HEAD` 通过；合并后未跟踪 `.env`、`.eml`、`.local-evidence` 或 `.tmp` 文件

## 实际运行证据与消费者

生产热修复实际运行仍绑定前端 commit `d5a061f60c7521a58b59292e337fe2788394cae9`、Build ID `zDGcAWoA7CCOTguKFvOV1`、release ID `tio2-my-main-d5a061f6-20260914-r3` 和已安装程序 `dfc33d97000846edb9d9b8421c0d3d571fb1b296`。该生产候选公开面 177/177 通过；RFQ、Sample、Documents 服务商均返回 `accepted`，用户确认三封邮件均于北京时间 10:22 收到。Resource 五页十条元数据迁移完成，七页合同验证通过。

受影响消费者为 root 管理员 CMS 安装、WordPress 容器对插件目录的读取、`tio2-my/frontend-only` 发布失败恢复、显式 rollback、程序升级状态验证、生产完成证据生成和两套生产 E2E。前端自动回滚仅对发布绑定策略关闭；显式回滚、CMS/配置等其他恢复策略保持原设计。测试夹具修复没有放宽已安装的发布面或一次性路由修复生产策略。

## 发布影响与未决项

本次 develop 集成包含共享发布程序变化，未来发布负责人须按实际差异重新分类并冻结候选。`1ab1a9a0` 及其后的 develop 提交尚未部署；上述生产证据不能转绑定到 develop。

按用户要求不保存 `.eml`，因此没有生成依赖邮件原文的 completion evidence，生产服务器状态保持 `PUBLIC_VERIFIED`。完整 Vitest 的 45 个既有失败仍需由对应 SEO、内容种子和本地 WordPress 测试责任范围处理；它们不由本次发布恢复补丁改写或掩盖。
