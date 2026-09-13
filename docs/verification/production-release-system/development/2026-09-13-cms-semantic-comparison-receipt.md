# CMS 语义比较修复开发记录

网站 tio2-my；分支 codex/fix-cms-semantic-routes；基线 develop ac79b8e7。本记录仅覆盖比较器，不表示生产数据修复完成。

- 修复范围：24 个明确 JSON 合同/证据 key 的语义规范化；未知 meta 保持原样，路由字段继续校验；保留生产历史 slug，排除其 headless 内容摘要影响。
- 快照版本 v2，拒绝旧 v1；需要重新采集预发布和生产证据，不能继承旧强摘要。
- TDD：先观察 JSON 格式等价测试失败，再实现并通过。独立审查检出数字类型合并问题；补充 int/float 测试再次观察失败后修复。Docker 镜像检查意见也已处理。
- 最终相关测试：49 项通过，0 失败（49.677 秒）；涵盖 PHP probe、CMS evidence、collector、frontend adapter。独立审查复审通过。
- 实际本地预发布只读快照：57 条，v2 内容摘要 0a39a908862e458119c6790cad71b43ac764823be0ea72a113a8a567c7d3157e。此读取不是新候选的全站验收。
- 已另外准备只读生产演算脚本，在内存中补齐固定批准配置对应的 41 条路由，输出实际变更项和修改后摘要；本地零变化演算通过，root 命令通过 bash -n。脚本未写数据库，未安装管理员程序。
- 待办：生产演算确认 95 项变化及 v2 等价后，接入独立受控管理员修复步骤；复用全库备份/恢复和写入封锁，必须实际演练失败恢复。现有安装入口依赖已完成前台事务，不能绕过其限制。
- develop/main 未修改，生产未写入或切流；不得把本分支当成已完成路由发布能力。

## 生产只读演算结果

用户 root 返回 ROUTE_SIMULATION_RESULT=0，报告经 pinned SCP 取回。matchesExpected=true；实际演算变更 95 项，81 项新增、14 项更新，涉及 41 条记录。

- 生产演算前 v2 摘要：77da62f74c073623f406743f2ce22906331e7d92bd8c4fe339f6d968fb282271。
- 内存演算后 v2 摘要：0a39a908862e458119c6790cad71b43ac764823be0ea72a113a8a567c7d3157e，与预发布目标完全相等。
- 结论：在本次读到的生产数据上，95 项固定路由元数据足以消除 v2 内容差异；无需覆盖正文或 JSON 合同。此为只读演算，不是数据库更新、备份恢复测试或生产发布验收。
- 后续执行前必须重新核对生产基线，并完成整库备份、恢复演练和受控写入步骤。尚未生成可执行生产写入包。

## 受控修复实现与演练

- 已实现独立 `route_repair.py` 后端及 root-only CLI，复用 Installation 状态恢复与 InstallationDatabase 写入封锁、整库备份和隔离恢复校验；不启用通用内容适配器、不增加 sudo。
- 最终相关回归 64 项通过，0 失败（48.145 秒）。独立复审已处理实际数据库账户、表前缀绑定、空 metadata 编码及缓存问题，无剩余阻塞发现。
- 最终真实隔离演练返回 success=true、backupRestoreRehearsal=true、fullDatabaseFailureRestore=true、historicalRestoreRejected=true、cleanupVerified=true。源预发布库只读导出；更新只发生于拥有独立名称的克隆。
- 数据库演练的 HTTP/cache 回调为 fixture-only。另在真实本地预发布前台验证站点签名失效通知及 41 个容器内页面请求，返回成功；不等于生产旧前台已验收。
- 原前台 API 的多路径请求会拒绝部分产品路径；采用其已存在的空路径站点标签失效模式，保留签名、站点及事件校验。SWR 不是同步新页面验收，正式前台验收仍待后续发布。
- 包构建器从冻结 Git blob 取程序与批准路由，目标包仅绑定 95 项变化。当前仍未执行生产更新，develop/main 合并及正式包冻结另记。

## 开发合并回执

2026-09-13：实现提交 5ac4c94d（含前序 3444433f、9db2afb1），经独立复审及上述 64 项回归和真实数据库恢复演练，合并到 develop：6da68cf78ccf43f18405bc6a9f502746dcc8d0f3。状态 MERGED_TO_DEVELOP。main 和生产尚未修改；发布侧仍需冻结、集成与预发布核验。

## Production probe configuration correction

2026-09-13: production read-only diagnosis confirms legacy baseline, database observation, CMS snapshot and route before values pass. Plan/state journals remain absent. Frontend homepage responds 200; 40 slashless routes respond canonical 308 (final targets not asserted by that diagnostic). SITE_ID matches, but REVALIDATION_SECRET is absent from docker exec's environment. Exact deployed Dockerfile 27f0a0da exports that alias from NEXTJS_REVALIDATION_SECRET_TIO2_MY in its entrypoint shell; an independent exec process does not inherit it.

Added regression reproducing both read-only-without-secret and scoped-secret refresh failures, observed two failures before correction. Probe now requires SITE_ID for GET and uses the production scoped secret (legacy alias fallback) only for signed refresh. Missing refresh secret still fails. Related 16 tests pass. No server program or database changed; corrected administrator package still requires release handoff.
