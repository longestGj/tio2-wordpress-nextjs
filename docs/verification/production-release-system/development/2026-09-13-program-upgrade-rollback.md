# 已回退事务的程序升级兼容修复

- 状态：`MERGED_TO_DEVELOP`。
- 日期：2026-09-13；网站：`tio2-my`；范围：管理员程序升级工具，本地开发与测试。
- 用户已批准：修复升级脚本，使其能够在当前已回退状态安全运行，补测试和独立复审，然后继续既有 CMS 升级流程。此回执不是生产安装或维护窗口开始的证据。
- 基线：`458d8ceb298398d0f377ea4a08c8a54626fdf7cd`。
- 分支：`codex/fix-program-upgrade-rolled-back`，工作区 `C:/Users/longe/.codex/worktrees/5bec/16Wordpress_nextjs`。
- 独立复审通过的实现及 develop 快进提交：`37aa07bbbadcc5cad66aad99170da417014cf824`。
- 允许修改：`scripts/production/phase1_program_upgrade.py`、其专用测试、安装说明及本回执。消费者只有阶段一管理员程序升级流程；不改变 Site A/B、页面、内容、CMS 安装器或日常发布类型。

## 根因与实现

原脚本的计划前检查与新程序后检查均只允许 `PREPARED` / `BACKED_UP`。当前生产事务为 `ROLLED_BACK`，即使具有控制器生成的安全回退证据也无法生成程序升级计划。

修复保留两种原状态，仅增加带完整安全前台回退证据的 `ROLLED_BACK`。复用 `ReleaseController._safe_recovery`，校验事务绑定、备份与活动版本、公开健康及 CMS 未变证明；不把状态名称当作证明。后检查还要求准确主体、持久状态一致、前台能力可用、无恢复需求和共享 CMS 窗口。

双锁、不可变计划哈希、保护文件哈希、原程序保留、中断续跑和显式程序恢复保持不变。未修改生产状态以绕过检查。

## 验证与边界

- 原实现基线：`python -m unittest tests.production.test_phase1_program_upgrade`，运行 12 项，11 通过、1 跳过，169.501 秒，退出 0。
- 红测：`ProgramUpgradeTests.test_verified_rollback_upgrade_preserves_state_and_resumes_after_interruption` 在原实现中因 `upgrade requires preserved pre-deployment transaction` 拒绝失败，10.049 秒；这是目标状态拒绝，不是导入或环境故障。
- `python -m unittest tests.production.test_release_controller`：45 通过，8.015 秒，退出 0。
- 离线读取已有 `status.json`，新校验接受其中真实持久化 `ROLLED_BACK` 及安全回退证据。此操作不连接服务器，不代表新程序已在服务器运行。
- 额外负向检查：IDLE、COMPLETED、FAILED、STAGED、INTERNAL_VERIFIED、ACTIVATED、PUBLIC_VERIFIED、RECOVERY_REQUIRED 均被拒绝。
- `python -m unittest tests.production.test_phase1_program_upgrade`：运行 17 项，16 通过、1 跳过，248.787 秒，退出 0。包含已回退升级、只读计划、证据缺失拒绝、状态漂移、中断续跑、显式程序恢复与 CLI 后检查。
- 独立复审 `review_upgrade_rollback` 对准确 BASE/HEAD `458d8ceb..37aa07bb` 返回最终 PASS，确认脚本、测试与新增安装说明一致，没有需返修问题。
- 合并后在 `D:/16Wordpress_nextjs/.worktrees/prerelease-public-paths-integration` 运行 `python -m unittest tests.production.test_phase1_program_upgrade.ProgramUpgradeTests.test_cli_postcheck_accepts_same_verified_rollback tests.production.test_phase1_program_upgrade.ProgramUpgradeTests.test_verified_rollback_upgrade_preserves_state_and_resumes_after_interruption`：2 通过，37.183 秒，退出 0；develop 代码为 `37aa07bb` 且工作树干净。

测试实际操作本地隔离文件夹并模拟运行资源；CLI 子进程状态输出为测试替身。Windows 不具备 root-owned Linux 符号链接场景，相关测试按原规则跳过。本轮不宣称完成 Linux root 演练、全站浏览器验收、生产程序安装、CMS 升级或发布。

## 交回

准确实现已快进合入 develop，合并后复验通过。发布侧随后重新冻结候选；此前 `458d8ceb` 包不包含本修复，不能把新脚本混入旧包或复用旧计划哈希。
