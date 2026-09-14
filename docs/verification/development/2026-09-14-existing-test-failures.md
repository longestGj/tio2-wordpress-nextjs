# 45 项既有测试失败修复开发回执

- 状态：`MERGED_TO_DEVELOP`
- 任务 ID：`existing-test-failures-20260914`
- 网站 / 主体：`tio2-my` SEO 与内容合同；共享本地 WordPress、测试运行隔离及种子清单验证
- 批准输入与版本：用户要求“45个既有失败全部处理”；承接[此前开发回执](../production-release-system/development/2026-09-14-production-release-recovery-development-receipt.md)记录的 45 项 Vitest 失败。沿用当前已批准内容、索引政策及网站身份约束。
- 合并前 `develop`：`896f119c4d4057873daf3c76e9886aca9c64e33a`
- 来源分支与实现 commit：`codex/fix-develop-test-failures`，`fa1ef062c32a5320d4395f25549af07f100f6153`
- `develop` 合并 commit：`beccf615b9d069ebf0f8025137362a8d826c915f`
- 测试、独立审查与合并共同绑定 tree：`7c0920bd0569a57bdd9a454234195fd02258925f`。已核对来源为合并结果祖先、合并前目标工作区干净，合并后实现树一致。
- 独立代码复审：`upgrade_design_review` 多轮只读复审通过，最终结论绑定上述 tree；复审提出的运行身份解析、测试隔离与历史清单验证问题均已修复并重新验证。

## 根因与改动

原 45 项失败全部关闭，未通过新增跳过或删除有效断言消除失败：

| 原失败数 | 根因与处理 |
| --- | --- |
| 3 | RFQ、Sample、Documents SEO 帮助函数丢弃 CMS 标题和描述。修复 `lib/seo/*metadata.ts` 的内容传递，保留站点政策决定的 canonical、robots 和语言信息；补验 Open Graph、Twitter 与跨站拒绝。 |
| 27 | 路由、索引与结构化数据测试仍采用旧发布状态。按当前批准 inventory 更新生产和预览预期，保留 thank-you 敏感信息禁止项。 |
| 1 | 根布局测试把第一个子节点固定视为 body。改为识别 body，继续验证巴西葡语文档语言。 |
| 7 | CMS 测试仍断言旧 hash 比较与种子 API 文本。更新到当前 JSON 比较、内容写入验证和批准输入路径；增加独立 PHP 内容政策执行测试。 |
| 2 | 当前预发布种子清单漂移，历史冻结清单错误对照当前源码。更新当前 43 个种子的 LF 字节哈希并通过 `.gitattributes` 固定换行；历史清单按原始冻结提交验证。 |
| 2 | 测试运行 URL、依赖解析及 owned Docker 参数识别与现有工作区方式不一致。修复显式 URL 和仓库相对依赖定位，识别可信不可变 owned compose 前缀，并补充伪造绑定、覆盖参数和未知 spread 拒绝测试。 |
| 3 | 本地数据库 readiness 与子进程耗时不可靠。数据库健康检查改为通过 WordPress 账户、数据库和 TCP 执行查询；控制器复用一次只读调用，Docker 子进程测试使用适当有界时限。 |

主要改动路径为 `lib/seo/`、`tests/helpers/wordpress-runtime-classification.ts`、相关 `tests/infrastructure/`、`tests/integration/`、`tests/unit/`、`wordpress/docker-compose.yml`、`ops/prerelease/seed-manifest.json`、`.gitattributes` 和 `vitest.config.ts`。Site A 草稿导入脚本测试改用自有隔离夹具，不读取真实工作区 `.env`；排除 `.tmp/**` 下的生成副本。

全量复测另发现并处理 3 项计时不稳定：种子审计 PowerShell 负例、产品清单 CLI 清理，以及 owned E2E 正常清理模拟。只为真实子进程和文件操作提供有界时间；永不返回用例仍保留 10ms 超时，生产 launcher 没有改动。

历史冻结生产清单继续绑定提交 `5a79bbb99771fdb44d227de7515b13d4e05da555` 及哈希 `8bc0db54ef1efe5ceff3474e0efc29d0696e6256ed1b9d59d141aed7ce3c1004`，40 个历史种子逐一验证。该测试证明历史制品一致，不证明当前 HEAD 可执行旧 bootstrap；生产清单和已安装发布合同未改写。

## 验证结果（2026-09-14，北京时间）

- 冻结实现全量：`npx vitest run --reporter=json --outputFile=.local-evidence/full-green.json`，退出码 0；442 个文件，3956 项测试，**3899 通过、0 失败、57 个既有条件跳过**。这些跳过项未宣称已执行。
- 全量报告 SHA-256：`147285c8e49c41989e864e20204a79cab815f79fc11330d01b60e2d87a755a37`；本地证据位于 `C:/Users/longe/.codex/worktrees/2437/16Wordpress_nextjs/.local-evidence/full-green.json`，未提交生成日志。
- 合并后回归：`npx vitest run tests/unit/wordpress-content-release-seo tests/infrastructure/wordpress-runtime-classification tests/infrastructure/prerelease-compose tests/infrastructure/production-contracts --reporter=json --outputFile=.local-evidence/existing-failures-merge.json`，**131/131 通过**，退出码 0。
- 合并后 `npm run typecheck`：Next 类型生成与 `tsc --noEmit` 通过，退出码 0；核对后仅移除 Next 自动加入的两项临时 `.next-public-paths-dev` include，未纳入代码。
- 修复期间定向验证：SEO 83/83；隔离 wrapper 12/12；运行、构建、清单与写入保护组合 52/52；种子审计和产品清单 CLI 两文件 358/358；owned E2E bounded 22/22。最终全量包含这些测试。
- 修改的应用和运行分类器文件定向 ESLint 通过；提交差异检查通过。
- 合并后核对 43 个当前种子哈希；将目标工作区 39 个既有 CRLF checkout 转为新属性要求的 LF 前，逐一确认标准化字节与清单完全匹配。没有种子语义改动。

## 实际运行证据与影响范围

定向组合及最终全量实际执行了 `production-runtime-contract` 的生产模式构建、`owned-e2e-launcher` 的真实自有浏览器启动，以及 `content-write-guards` 的隔离 WordPress 写入保护。数据库健康检查还在该任务自有数据库上确认正常账户可用、错误凭据被拒绝；没有操作共享业务数据库。

当前 C 盘任务工作区的跨盘 `node_modules` junction 曾导致构建和浏览器启动失败；使用原 lockfile 安装本工作区依赖后通过。只替换该任务的 junction，共享 D 盘依赖保留，package 文件未改动。

受影响消费者包括 MY 转化页面 SEO、本地开发/测试 WordPress 依赖启动、共享运行身份检查及种子测试。共享与 Site A 相关测试纳入全量回归，Site B 业务内容和 Site A 导航未修改。这里记录的是技术运行和测试证据，不替代策划侧视觉或业务批准。

## 发布影响与未决项

原回执所列 45 项既有 Vitest 失败在本回执对应实现中全部解决，额外发现的 3 项计时问题也已关闭。57 项既有条件跳过保留其原环境或输入前置条件；将来执行对应专项任务时由该任务负责人提供条件并验证。

本次完成本地 `develop` 集成。包含 SEO 行为修复、当前预发布清单刷新及本地测试基础设施变化，后续发布负责人须从准确差异重新分类并验证。未修改 `main`、未推送远程、未操作生产；前端自动回滚及其他生产恢复策略保持原设计。
