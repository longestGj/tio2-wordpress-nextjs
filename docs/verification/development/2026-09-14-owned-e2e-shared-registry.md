# Owned E2E 共享租约并发修复开发回执

- 状态：`MERGED_TO_DEVELOP`
- 任务 ID：`owned-e2e-shared-registry-20260914`
- 网站 / 主体：D16 共享测试运行基础设施；由 `tio2-my` 本地预发布的发布侧集成测试发现。
- 批准输入：用户要求对新 `develop` 执行预发布测试，并明确包含发布程序测试。发布侧冻结 `70053aef11ef82c761a25af681fb617ec0272a89` 后，全量 Vitest 的真实 Next/Playwright 用例暴露并行租约断言错误。
- 原始失败：共享租约目录中存在另一合法任务的两条租约时，`tests/infrastructure/owned-e2e-launcher.test.ts` 断言整个目录为空。被测 Next、Playwright及三个本次进程均成功并停止，但外部租约被误报为本次残留。首次环境修正后全量结果为 3897 通过、2 失败、57 跳过；其中生产构建失败由工作树外部依赖 junction 解释并在本地锁文件安装后通过，剩余此并发断言失败被稳定复现。
- 实现：真实用例确定性创建一条保留的外部租约，确认被测运行后其记录完整不变；读取本次 `cleanup-state.json`，要求 fixture 与 Next 恰好产生两个不同租约且不含外部租约，逐一检查本次租约文件已删除，并扫描共享目录确认本次 `runId` 无残留。扫描只忽略另一任务恰好释放文件造成的单文件 `ENOENT`，其他读取、解析和权限错误继续失败；`finally` 只释放本测试创建的外部租约。生产运行代码未改变。
- 合并前 `develop`：`70053aef11ef82c761a25af681fb617ec0272a89`
- 来源分支与实现 commit：`codex/fix-owned-e2e-shared-registry`，`eda398c9b3dea5d9e4bd4d0e0cbeb5ef9a746e69`
- `develop` 合并 commit：`3f5df08faad9eb8914125dd670761530c29835f0`
- 独立复审：最终通过，绑定 tree `43f3fea66c7bd53dc715f206605ba57acb8a17bc`。复审先后阻断了空租约列表可空跑通过、以及无锁共享扫描可能因外部释放产生 `ENOENT` 误报的问题；两项均修复后确认无剩余阻断。实现提交及合并树一致。
- 测试：原失败在共享目录存在真实其他任务租约时复现两次；确定性外部租约用例 1/1 通过；owned launcher、bounded cleanup、port leases、shared registry 组合 77/77 通过；`npm run typecheck`、目标 ESLint 和 `git diff --check` 通过。合并后相同组合再次 77/77 通过。
- 实际运行证据：回归实际启动 Next 与 Playwright，验证站点身份和动态自有端口，并核对本次子进程停止及租约回收。未停止或修改其他任务进程。
- 受影响消费者：所有共享 Git 仓库内并行运行的 owned E2E。测试现在按 `runId` 和准确 lease ID 判断归属，仍严格拒绝本次资源泄漏。
- 预计发布影响：仅测试断言，不改变网站、发布程序、端口分配、恢复策略或生产状态。
- 未决项：原冻结候选 `70053aef` 的发布侧集成证据被本修复替代；发布负责人须从包含本合并及本回执的新 `develop` commit 重新冻结候选。该旧候选不得合入 `main` 或用于预发布通过声明。
