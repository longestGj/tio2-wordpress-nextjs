# 前台打包链修复开发回执

- 状态：`MERGED_TO_DEVELOP`
- 任务：frontend-package-chain-20260913；网站：`tio2-my`；主体：发布工具链。
- 批准输入：用户要求修复发布阻塞，并同意限定的参数接线、原始证据保留、独立基线绑定、真实制品生成和端到端回归方案。
- 开发基线：`d8d9d8fe177e8da582f313ba003b431abb0ed1ef`。
- 来源：`codex/fix-frontend-package-chain`；准确实现及 develop 快进合并 commit：`d902e84a8d2295b47b8d11630597e5db27061bf4`。
- 独立复审：`/root/review_frontend_package_chain` 只读审查上述 BASE/HEAD，结论 Ready to merge，无剩余 Critical / Important / 可执行 Minor；独立运行 10 项链路测试通过。

## 根因和改动

1. 正式 PowerShell Package 入口缺少参数接线，旧模块输出不能直接满足新前台候选三件套合同。新增完整离线生成链，使用现有服务器校验器实际校验。
2. 原始 sealer 输出、运行身份、开发回执和独立生产基线职责不同。保留原始字节并重新封存核验，新生成 proof 绑定其哈希，不修改历史通过证据。
3. PowerShell 7 的 JSON 日期自动转换破坏收件时间验证；支持 DateKind 的版本显式保留字符串。
4. CMS 插件中被前台静态引用的 config/includes JSON 必须随前台构建输入归档；完整插件仍须与已安装 CMS 哈希一致，PHP 不进入前台包。
5. 管理员只读基线采集主动禁用 Python 字节码写入，避免依赖导入创建缓存文件。

改动路径：`scripts/production.ps1`、`scripts/production/package_frontend.py`、`scripts/production/frontend_package_baseline.py`、`scripts/prerelease/Seal-ProductionGate.ps1`、`tests/production/test_frontend_package_chain.py`、`docs/production-installation.md`。

## 验证

日期：2026-09-13，Windows 本地开发；合并后工作目录：`D:/16Wordpress_nextjs/.worktrees/prerelease-public-paths-integration`；代码：上述准确实现 commit。

```text
python -B -m unittest tests.production.test_frontend_package_chain tests.production.test_frontend_candidate tests.production.test_release_coverage tests.production.test_release_contract tests.production.test_client_recovery
113 tests, OK, 77.608s, 无跳过

npx --no-install vitest run tests/infrastructure/production-package.test.ts tests/infrastructure/production-prerelease-gate.test.ts tests/infrastructure/production-controller.test.ts --exclude '**/.tmp/**' --exclude '**/.prerelease/**'
3 files, 36 tests passed, 62.53s, 无跳过
```

链路测试使用隔离 Git 仓库和明确的离线夹具，真实执行 CLI、sealer、归档、服务器候选校验；覆盖 CMS 不匹配、证据篡改、基线哈希错误、身份漂移、脏树及输出重放拒绝。JSON 缺失和缓存写入均先观察到失败，再验证修复通过。合并后确认实现树与复审 HEAD 相同、工作树干净；无业务页面变更，无视觉验收声明。

## 边界与交接

- 受影响消费者：tio2-my 新前台打包；共享 sealer 和旧生产模块兼容回归已运行。未改其他网站页面或 CMS 运行内容。
- 本轮没有访问生产、重装 CMS、启动预发布、发送表单或生成真实发布包。离线测试通过不等于网站构建、预发布或生产验收通过。
- main 保持 `eb92f1474c6b415334f2b31a69662261e3734c84`；7 个用户文件的 stash `0484d6625425d59848097dc2394f7a10af1aefba` 保留，未恢复或删除。
- 后续发布负责人须独立冻结版本，核对本次工具链与前台实际差异、开发回执覆盖、适用预发布证据及经核验的实时生产基线。不能将旧证据改绑定到新 commit，也不能以此开发回执宣称已部署。
- 开发未决缺陷：无。生产基线采集与真实发布链验收仍属于后续发布责任，不在本回执中冒充完成。
