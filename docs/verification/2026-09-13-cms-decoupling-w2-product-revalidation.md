# W2 MY 产品刷新入口开发回执

- 日期：2026-09-13；网站：`tio2-my`；共享消费者：Site A/B 刷新接口。
- 状态：`MERGED_TO_DEVELOP`（仅 W2 API 修复）。
- 工作区：`D:/16Wordpress_nextjs/.worktrees/cms-responsibility-audit`；分支：`codex/cms-responsibility-audit`。
- 基线：`05a52794b3b598b35335b3cd7196156c278c3ba3`；准入提交：`818b8a27`；标签及回归提交：`c3331199248e8cb29f149164e4f5d5e5e663ec13`。
- 批准输入：本任务用户已批准 CMS/前端/配置/构建职责及 W0–W6 总计划，本轮要求继续；具体范围为 W2 产品刷新接口。规划文档仍保留在本任务工作区，不混入这两个代码提交。

## 根因与修改

`app/(en)/api/revalidate/route.ts` 原产品准入只构造 Site A 产品身份；MY 仅有氯化法/硫酸法工艺页例外。因此 MY `/products` 与登记详情被拒绝，且路径循环没有添加产品总览/详情查询使用的内容标签。

本批仅修改该处理器与 `tests/integration/api/product-revalidation.test.ts`：复用既有 `isApprovedMalaysiaProductDetailSlug`，按 MY 身份放行产品总览和登记详情；补充 `productHubContentTag` / `productDetailContentTag`。没有重设计 registry、签名、事件协议、去重、时效或 CMS 读取合同。

## 新执行验证

工作目录为上述任务工作区，Vitest 4.1.11，真实 POST 处理函数与签名流程，Next 缓存 API 使用边界 spy，无网络和 CMS 写入。

1. 基线：产品测试 6/6 通过。
2. 准入 RED：新增 3 个合法路径预期 200，实际 400；3 失败/10 通过。GREEN：13/13 通过，形成 818b8a27。
3. 标签 RED：普通/受控混合批次及尾斜杠规范化用例缺少内容标签；3 失败/16 通过。GREEN：产品 19 项纳入以下 113 项通过结果。

```powershell
npx --no-install vitest run tests/integration/api/product-revalidation.test.ts tests/integration/api/revalidate.test.ts tests/integration/api/application-resource-revalidation.test.ts tests/integration/products/chloride-process-revalidate.test.ts tests/integration/editorial/editorial-revalidation.test.ts
npx --no-install tsc --noEmit --incremental false
git diff --check
```

5 文件、113 项通过，无跳过（22:15:49 开始）；类型检查退出码 0；差异检查退出码 0，只有 Windows LF/CRLF 提示。直接运行 tsc，不调用 package typecheck 中的 Next typegen，避免无必要生成运行环境 include；本批未改变路由结构或类型生成接口。

新增覆盖：MY 总览与两个代表性详情、未知/跨站产品、A/B 运行身份隔离、非法签名、混合非法批次零失效、尾斜杠规范化、重放零重复副作用；混合批次覆盖两种工艺页，普通 `max` 与受控 `{expire: 0}`、layout/sitemap 保持原行为。既有 A 产品准确依赖回归保留。

## 独立复审与合并后验证

- 独立只读复审者 `w2_review` 核对 BASE `05a52794` → HEAD `c3331199`、计划、真实查询消费者及差异；结论 Critical/Important/Minor 均无，允许合入 develop。复审者独立执行差异检查，测试数字引用实施侧实际输出，没有假称重复执行。
- 合并前确认 develop 工作区干净且 HEAD 仍为基线，来源仍为准确复审 HEAD；在 `D:/16Wordpress_nextjs/.worktrees/prerelease-public-paths-integration` fast-forward develop 至 `c3331199`，合并树与复审树一致。
- 合并后于 22:17:21 在 develop 工作区重跑同一 5 组测试：113/113 通过、无跳过；`npx --no-install tsc --noEmit --incremental false` 退出码 0，工作区干净。没有重新运行真实 CMS/页面更新链。
- 本回执作为后续文档提交进入 develop，不改变上述已验证代码树。后续发布按独立发布流程另行冻结候选。

## 明确未覆盖与后续

- 缓存调用测试不是实际 WP → Next 内容更新证据，不代表真实缓存已刷新或页面已显示新值。
- 不新增产品详情自动 webhook，不关闭 W0-E2 的全部事件生产链；W3/W5 承接。
- 沿用 registry 当前批准身份与打包合同校验，不在 W2 重构其旧批准快照绑定；其职责解耦仍归 W3。没有新增正文相等校验。
- 无 UI/业务文案修改，不运行全站构建或视觉验收；没有 main、push、部署、CMS 修改、真实表单/统计外发。
- 既有职责文档、W0/W1 文件仍留在工作区，本批不自动提交这些较大文档差异。
