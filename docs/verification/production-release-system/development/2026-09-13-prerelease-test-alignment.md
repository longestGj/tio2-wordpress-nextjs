# 预发布失败用例修复回执

- 状态：`MERGED_TO_DEVELOP`
- 任务：`prerelease-analytics-isolation`；网站 `tio2-my`；2026-09-13。
- 用户要求：解决预发布报告中的七项失败，查明用例还是页面代码问题。
- 基线：`c82e2785d6656561ca906658ff3062004508eee4`。
- 来源分支：`codex/fix-prerelease-analytics-isolation`。
- 实现及 develop 快进合并 commit：`abb349d7ad6180f5d2c9795e39a6fba6995314cf`（包含 `07135b56` 初修与复审补正）。
- 独立复审：准确最终 commit 已通过，Critical / Important / Minor 均无未关闭项。

## 根因与修复

本次是测试和证据记录缺陷，没有修改网站业务代码、批准文案、CMS 数据或生产程序行为。

1. 普通测试加载真实 GTM，却拦截全部非 GET 请求。Google 统计 POST 被拦截后产生浏览器 console error，七个用例在截图前运行错误断言失败。现与既有 GA4 专项一样隔离第三方 GTM GET 响应；非 GET 仍落入原有禁止写入的计数和拦截逻辑，不放行真实表单。
2. 公开路径测试沿用旧五应用页的 provisional 预期，要求 canonical、OG URL、结构化数据及 sitemap 条目缺席；2026-09-13 批准公开清单已要求它们存在。现验证 canonical/OG 的准确地址、WebPage/BreadcrumbList 和 sitemap 条目，保留本地 noindex/nofollow。
3. 新清单扩展至 21 个 candidate-consumer，测试 switch 只支持原五个入口页，在 About 抛出 `Unexpected consumer`。现保留原五入口的精确清单检查，并对新增消费者执行登记链接、Axe、布局、截图、键盘导航与返回检查。
4. 原 afterEach 在非 GET 断言之前调用 recordCheck，令另外三项过早记录为 PASSED；原始 trace 实际显示它们随后也因禁止写入断言失败。现记录函数直接把普通测试中任何非零写入计数标记 FAILED。

复审另关闭两个测试隔离问题：GTM 模拟仅处理 GET，其他方法 fallback 到原 guard；证据回归在独立 Node 子进程内设置环境，避免污染共享 worker 的环境和模块缓存。

## 改动与验证

改动文件：`tests/e2e/prerelease-smoke.spec.ts`、`tests/e2e/prerelease-public-paths.spec.ts`、`tests/e2e/support/prerelease-evidence.ts`、`tests/e2e/prerelease-evidence-guards.spec.ts`，以及 `scripts/prerelease/Prerelease.Core.psm1` 的验收项目名称（public metadata 替代 provisional metadata）。

- 原始失败证据：`D:/16Wordpress_nextjs/.worktrees/prerelease-e7494bdc/docs/verification/prerelease/runs/20260913T055312Z-96898ae8-3910-4fa0-9dc1-2c1a71bd3e42/` 及该 checkout 的 Playwright trace；原记录累计拦截 134 次非 GET 请求，不能解释成 134 次实际表单提交。
- 红绿验证：新增 recordCheck 回归先观察到预期 FAILED、实际 PASSED；修复后通过。逐步复跑先关闭 GTM 问题，再分别暴露并关闭旧 SEO 预期与旧消费者 switch。
- 最终命令：`npx --no-install playwright test tests/e2e/prerelease-evidence-guards.spec.ts tests/e2e/prerelease-smoke.spec.ts tests/e2e/prerelease-public-paths.spec.ts --workers=1 --reporter=list,json --output=.tmp/prerelease-final-browser`。
- 最终结果：12/12 通过，0 失败、0 跳过、0 flaky，214.051 秒；包含原完整十项及两项保护回归。同一个 worker 执行，十份普通证据全部 PASSED，非 GET 总数为 0。
- 测试环境：`TIO2_PRERELEASE_EVIDENCE_DIR=<来源工作树>/.tmp/prerelease-final-fix`；command UUID `final-fix-20260913`。
- 原始机器报告：`C:/Users/longe/.codex/worktrees/5bec/16Wordpress_nextjs/.tmp/prerelease-final-report.json`；SHA-256 `b9aa639da8ea20c07e9fd95374f3cffd130326e093818a4c68a7161947feac28`。
- 基础设施回归：`npx --no-install vitest run tests/infrastructure/prerelease-test-actions.test.ts tests/infrastructure/prerelease-evidence-scope.test.ts --exclude '**/.tmp/**' --exclude '**/.prerelease/**'`，27/27 通过。首次未排除忽略目录时误收集历史测试副本，产生两项旧清单断言失败；不计作当前修复失败或通过证据。
- 修改的四个 TS 文件 ESLint 通过；`git diff --check` 通过。
- 合并后：develop 精确快进到已复审/测试的实现 commit，两个证据保护回归再次通过。未重复构建应用。
- 实际查看本轮首页桌面/手机及 About 桌面截图；这属于本次测试修复核对，不代替整站策划视觉验收。

## 运行身份及发布边界

- 被测实例始终是 `http://127.0.0.1:3100`；run `20260913T054359Z-db293a4747aa`。
- 运行源码 commit：`db293a4747aa085aaf56f954a7e458bae8187c91`；Build `UDktmQOl2le9Aor2DUMv8`。
- 测试源码 commit：`abb349d7ad6180f5d2c9795e39a6fba6995314cf`。与运行源码的实际差异只有上列五个测试/证据文件；页面运行代码相同。测试前后实时身份一致。
- 这是修复测试对现有预发布实例的通过证据。未调用或绕过要求测试 commit 与候选 commit 完全相同的正式 Test 入口，未把旧 FAILED 回执覆盖成 PASSED。
- 后续正式发布采用修复版本后，仍须按正常候选流程生成相同源码身份的正式预发布回执；本回执不声明 `MAIN_PRERELEASE_PASSED` 或生产已完成。
- 本次未更新 main、未重新构建/重启共享预发布栈、未操作生产或真实表单。GTM 被模拟的普通页面检查不证明真实 Google 后台接收数据。
