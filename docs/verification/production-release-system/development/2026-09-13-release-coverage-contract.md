# 发布验收清单合同修复回执

- 状态：`MERGED_TO_DEVELOP`。
- 网站：`tio2-my`；日期：2026-09-13。
- 用户要求：修正发布阻断；不安排维护窗口、不暂停 CMS 写入。其他备份、验证、必要升级的授权不允许绕过这两个限制。
- 基线：`9d8f3131027e31187a9934185f0cf6bef00f5654`。
- 来源分支：`codex/fix-release-coverage-contract`。
- 独立复审通过的实现及 develop 快进合并 commit：`cb52067e3348e8cca9b8501b1416aae67b6c4171`。
- 复审：独立 reviewer `review_release_coverage` 对准确 BASE/HEAD 给出 PASS；无未关闭的 actionable finding。只批准代码合入，不是生产验收。

## 根因与改动

1. 当前生产清单已经是 59 个对象，但预发布封存、打包、服务器 proof 与最终证据生成器仍硬编码旧 58/174。红测实际观察到当前 177 案例被拒绝、当前清单配旧 174 案例却被服务器接受。
2. 新增按已审查清单 SHA-256 选择准确计数的本地和服务器策略：当前 `6655c74b695b0f0f4d0f9ac94607ba138bf1d42b063e2d5daa101d2953c19cad` 对应 57 业务页、59 对象、3 视口、177 案例；历史 `42b29755e99dec1ec71fe07a98a7cf586349cf60bfb25f7f90d74ca6f35bd152` 保持 56/58/3/174；未知哈希及交叉借用计数拒绝。
3. 新增 `tio2-production-contracts-v3` 准确 schema/surface/migration 哈希组合；原 v2 两套组合保持不变。当前打包器采用 v3，不改写历史包或回执。
4. 新候选使用 `frontend/<releaseId>` 逻辑运行身份及 `candidate-manifest.json` + `payload/frontend/`。最终生成器原先只认识旧磁盘路径，红测复现 RunRoot 拒绝。现分支处理新旧格式，新候选重用完整离线 envelope/归档/proof 校验，并将活动 Build 绑定到 proof。
5. 修正测试夹具的当前清单计数；合同测试补充排除仅预发布使用的 `refresh-tio2-my-trade-candidate.php`。未改变生产 migration manifest 或新增生产 seed 执行。

共享消费者为本地预发布封存、前台打包、生产服务器候选验证、最终六文件生成器及其测试。未改网站页面、批准内容、Site A/B 行为、CMS 安装器、生产状态或权限。

## 验证

工作目录：`C:/Users/longe/.codex/worktrees/5bec/16Wordpress_nextjs`，准确实现 `cb52067e`。

- 红绿：当前 177 案例与旧计数混用两例、预发布封存、最终 177 案例生成、实际新候选 RunRoot 四组失败均先复现后关闭。
- `python -m unittest tests.production.test_release_coverage tests.production.test_completion_current_candidate.CurrentCompletionTests tests.production.test_prepare_action tests.production.test_release_contract tests.production.test_client_recovery tests.production.test_frontend_candidate`：117 通过，38.649 秒，退出 0。
- `python -m unittest tests.production.test_release_coverage tests.production.test_completion_current_candidate.CurrentCompletionTests tests.production.test_release_controller tests.production.test_site_frontend_adapter tests.production.test_admin_bundle tests.production.test_bootstrap_install`：98 通过，128.503 秒，退出 0。与上组有重叠，不当作 215 个不同案例。
- `npx --no-install vitest run tests/infrastructure/production-contracts.test.ts tests/infrastructure/production-prerelease-gate.test.ts tests/infrastructure/production-package.test.ts tests/infrastructure/production-controller.test.ts --exclude '**/.tmp/**' --exclude '**/.prerelease/**'`：4 文件、42 通过，71.37 秒，退出 0。
- 三个修改的基础设施测试 TS 文件 ESLint 通过；`git diff --check` 通过。
- 合并后在 develop 工作区重跑 `python -m unittest tests.production.test_release_coverage tests.production.test_completion_current_candidate.CurrentCompletionTests`：9 通过，6.047 秒，退出 0。

以上是本地合同/控制器/工具验证。邮件均为明确标记的 synthetic 本地夹具，外部进程使用测试替身或隔离安装夹具；不是实际服务商发送、真实收件、生产上线或全站浏览器验收。本次更新运行演练夹具计数，但未重新执行完整 Docker 前台上线/回退演练；页面运行代码未变，未重建共享预发布。

## 发布边界与未决项

- 本次没有修改 main、远程写入、维护页切换、暂停 CMS 写入、数据库恢复、插件安装或真实表单提交。已有 main 工作区视觉证据文件保持原状。
- v3 服务器策略尚未生产安装；此开发回执不改变 `content-only` / `combined` 的 `not-installed` 登记。
- 现有 `content_install_backend.py` / `content_install_database.py` 依赖维护页与共享数据库写入暂停，不能在用户禁止这些动作时执行，也不能删掉保护后声称等价安全。不中断服务、不停写的 CMS 升级需要单独设计、实现及验证；本轮未实现该能力。
- 后续发布必须从新的 develop 候选完成正式同版本预发布、适用工具安装与内容发布、生产业务与真实收件验收。本回执只关闭 58/59 清单及新候选最终证据格式的代码缺陷，不声明发布已完成。
