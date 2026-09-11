# D16 部署工具修订开发计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. 用户于本计划讨论后明确“继续开发”，批准按本计划开展本地开发；远程部署仍属另一窗口。

**Goal:** 复用现有代码，开发能接入实际生产基线、完成备份和受控更新的部署工具，并在隔离环境证明可恢复。

**Architecture:** 本地 PowerShell 管理候选包和证据；固定 root-owned Python 程序管理服务器动作。真实部署由另一个窗口负责，本开发计划以导入的非秘密环境合同和隔离环境为输入。

**Tech Stack:** PowerShell、Python 标准库、Docker Compose、WordPress/MariaDB、Next.js、Nginx、Vitest、Playwright。

**Spec:** [代码评估与调整建议](../specs/2026-09-11-release-tooling-assessment.md)。以下执行补充落实用户确认前讨论的四项缺口。

## 执行补充

- 接管部署窗口的实际环境：只读校验后生成差异报告；不搬迁卷、不重建容器、不改 DNS。登记需 root 安装阶段验证并保存；上传包不能自行改写可信基线。未获得实际交接时用隔离 fixture 开发，真实适配保持未验收。
- 工具升级与网站发布分离：复用现有幂等 root 安装器、固定文件清单和恢复日志验证升级。普通 deploy 动作不得覆盖特权程序或 sudo 策略。首版工具升级仍走受信任的管理员安装渠道，不宣称 deploy 能无人值守升级自身权限代码；若需自动升级，须另行建立独立签名信任根。
- 本版支持指定应用配置和兼容代码更新；数据库迁移、数据库版本升级、基础设施变更默认拒绝，需对应适配与批准。兼容性未知时不自动宣称可回滚；不恢复已开放写入的旧库。
- 完整演练覆盖 A→B→A→B、断线重试、进程中断、磁盘不足和恢复验证。维护范围仅为版本查询、备份、发布、验证及回滚，不包含监控、定时备份、系统升级或自动修复。

## Global Constraints

- 仅在 `codex/oracle-vps-production-deployment` 工作区开展本地开发；保留现有未提交内容，先审查再整理提交。
- 网站 `tio2-my`，公网站点 `https://tio2malaysia.com`，CMS `https://cms.tio2malaysia.com`；真实部署结果若不同，先呈报差异，不覆盖服务器。
- 固定动作保留 `status prepare backup deploy verify rollback`；调用者不能选择服务器任意路径、Shell、镜像参数或挂载。
- 不修改根 AGENTS.md，不自动操作生产/DNS/SSH，不自动合并 main/develop；不替代另一窗口的上线验收。
- 精确 clean main、预发布证据、包哈希、服务端现网身份分别记录；测试、审查嵌入每个交付任务。
- 保留已有生产镜像版本约束；重新核对实际平台可用性，不悄悄升级数据库或 WordPress。
- Windows 假工具测试不能替代 Linux/真实容器/ARM64；不可用的环境明确记为未验收，不能用跳过的测试填满完成表。
- 日常发布不自动重跑首次内容导入；数据变化必须有当次批准的迁移计划和回退条件。

## 评估时验证

评估基线为 `386f414` 加当前未提交备份重构。代码实现中仅 status/backup 已分派，其余四个动作仍拒绝执行。本次执行 `python -m unittest discover -s tests/production -p 'test_*.py' -q`：65 项通过，耗时 73.326 秒，退出码 0。这只是本地隔离测试，不是发布通过。完整 Next 镜像、真实 Linux root 行为和真实容器恢复未在本次评估执行；工作区未发现 `node_modules/next/dist/bin/next`，不得继承历史构建通过结论。

## 文件与职责

| 文件 | 处置与职责 |
|---|---|
| `scripts/production/Production.Core.psm1` | 复用包生成，补传输、回执及状态驱动控制 |
| `scripts/production.ps1` | 新增供操作者使用的本地命令入口 |
| `ops/production/server/release_contract.py`、`release_state.py`、`tio2_release.py` | 保留校验/状态/入口；补基线与门槛 |
| `ops/production/server/release_baseline.py` | 新增可信现网基线规范化与验证 |
| `ops/production/server/backup_core.py`、`backup.sh` | 验收现有未提交重构；Python 编排、Shell 固定入口 |
| `ops/production/server/release_actions.py` | 连接准备、备份、发布、验证和回滚；不复制各模块核心逻辑 |
| `ops/production/server/deployment_core.py` | 新增受控升级、候选验证、激活和失败恢复 |
| `ops/production/server/bootstrap_install.py`、`bootstrap_selftest.py`、`install.sh` | 每次新增模块同步安装清单，验证安装包完整性 |
| `ops/production/Dockerfile`、`docker-compose.yml`、`nginx/` | 在实际构建/运行测试后接受，升级按基线约束 |
| `tests/production/`、`tests/infrastructure/production-*.test.ts` | 单元/假工具/合同验证，嵌入对应任务 |
| `tests/production-runtime/` | 新增显式启用的隔离 Linux 实景演练入口与证据 |
| `docs/production-deployment.md` | 最终单一操作入口与能力边界 |

## Task 1：建立可验证基线，打通准备动作

开发状态：已在 `97681ab` 保存，独立审查及修复复审通过。实际 PowerShell→Python 准备联通已验证；修复后 Windows 定向 43 项、隔离 Linux 定向 18 项通过。此结论不包含生产基线接管、完整 Linux 套件或备份适配验收。

**交付结果：** 精确包能通过真实本地打包器进入服务端准备流程；现网基线错误时拒绝，准备不触碰运行服务。

**Files:** 修改 `Production.Core.psm1`、`release_contract.py`、`release_state.py`、`release_actions.py`、`tio2_release.py` 和安装清单；新增 `release_baseline.py`、`tests/production/test_release_baseline.py`、`tests/production/test_prepare_action.py`；扩展 `tests/infrastructure/production-package.test.ts`。

**Interfaces:** `validate_baseline(paths: ReleasePaths) -> dict` 返回 `{siteId, active, runtime, configurationFingerprint}`；`prepare_release(paths: ReleasePaths) -> dict` 返回 `{action, ok, state, candidate, active}`。active 与 candidate 永远为独立对象；现网身份来自可信登记和实测，不能来自上传者自述。

- [ ] 先将已提交和未提交版本差异写入任务记录；审查保留备份重构，不重置工作区。
- [ ] 定义同一版基线 schema，覆盖现网代码/镜像、卷、配置路径、写入状态和真实部署窗口的交接字段；私密值仍仅在环境中。
- [ ] 先写失败测试：缺基线、错误站点、容器/卷不匹配、破损 current、篡改包、预发布回执不匹配都拒绝。
- [ ] 实现规范化与 prepare；同步明确合同哈希变更规则和 root 程序独立更新边界。
- [ ] 执行打包器→校验器→prepare 联通测试，断言没有 start/stop、DB 写入或网络切换；审查后提交本任务文件。

验证命令：`python -m unittest discover -s tests/production -p 'test_*.py' -q`；`npx vitest run tests/infrastructure/production-package.test.ts tests/infrastructure/production-contracts.test.ts`。

## Task 2：完成可恢复备份并验收现有重构

开发状态：独立审查及三项修复复审通过。Windows 98 项通过、2 项 POSIX 专用测试跳过；隔离 Linux 40 项、合同测试 6 项通过；实际安装后的错库拒绝、SIGKILL 重试、解密、数据库/WP/独立插件挂载恢复已验证。仅为本地 amd64 候选工具证据，生产与 ARM64 未验收。

**交付结果：** 真实隔离数据库与完整 WordPress 文件可备份、恢复、核对；错误和重试不损坏旧备份，不导致服务停留在维护状态。

**Files:** 修改 `backup_core.py`、`release_actions.py`、`release_state.py`、固定 `backup.sh` 与安装清单；扩展 `test_backup_core.py`、`fake_backup_tool.py`、`test_backup_action.py`；新增 `tests/production-runtime/backup_restore.py`。

**Interfaces:** 复用 `Backup.run()` 回执 `{backupId, manifestSha256, ciphertextSha256}`，增加绑定本次备份的恢复证据；状态分别记录服务端完成、异地文件校验、解密恢复验证及是否已经恢复写入。旧 PREPARED/BACKED_UP 不作为全部门槛的替代。

- [ ] 先审查未提交核心，复验已存在的失败测试；只为未覆盖的写入隔离、断电/进程终止、凭据清理、资源峰值增加测试。
- [ ] 建立可验证的备份一致性边界，说明编辑、定时任务和其他写入者的处理；不以 sleep 五秒证明请求已排空。
- [ ] 绑定现网与候选身份，完整归档配置/卷/插件/库存；凭据仅经受控文件或 stdin 传递，断点重试能清理本程序遗留物。
- [ ] 在隔离真实 MariaDB 中导入 SQL，启动恢复后的 WordPress 并核对内容/媒体/插件；验证 age 加密产物可在隔离客户端解密，不只校验密文哈希。
- [ ] 验证备份碰撞、密文发布与状态写入中断、服务恢复失败、旧回滚备份保留和磁盘不足；审查后提交。

验证命令：`python -m unittest discover -s tests/production -p 'test_*.py' -q`；`python tests/production-runtime/backup_restore.py --isolated`。实景入口只能创建本次带身份标识的隔离资源；不接受生产路径，不删除其他 Docker 资源。

## Task 3：打通基于已部署环境的更新与回滚

开发状态：独立审查及清理中断修复复审通过。本地真实 Next 镜像完成 A→B→A→B、命令故障/SIGKILL/重启及三次备份解密恢复；原源码与独立插件挂载保留。首版适配器仅支持兼容前台更新，拒绝 WordPress/数据变化；生产接管、ARM64及浏览器验收仍未通过。证据使用明示的本地 fixture 身份，不代替 clean main 发布来源。

**交付结果：** 已验证版本 A 可更新到 B；构建、候选、切换任一步失败有确定结果；B 可按兼容性条件回到 A。

**Files:** 新增 `deployment_core.py`、`tests/production/test_deployment_core.py`；修改 `release_actions.py`、`release_state.py`、`tio2_release.py`、安装清单、Dockerfile/Compose/Nginx；新增 `tests/production-runtime/update_rollback.py`。

**Interfaces:** `deploy_release(paths: ReleasePaths) -> dict`、`verify_release(paths: ReleasePaths) -> dict`、`rollback_release(paths: ReleasePaths) -> dict`，统一返回 action/ok/state/candidate/active/evidence；回滚目标只能取根状态登记的上一已验证版本。

- [ ] 先写 A→B 的全流程失败用例，明确阶段门槛与恢复行为；BACKED_UP 缺异地/恢复证明时不能进入部署。
- [ ] 验证生产构建配置、BuildKit secret 和真实 CMS 连通性；候选使用独立版本路径，不提前修改 current；明确构建与运行的网络路径。
- [ ] 实现无数据变化的日常代码发布，验证候选后切换并登记 previous/current；首次服务器安装和 DNS/SSH 加固不嵌入此动作。
- [ ] 数据变化默认拒绝，直到该次变更带有批准的 Plan/Apply/readback、写入冻结和向后兼容性说明；按实际任务扩展迁移适配，禁止通用重跑全量 seed。
- [ ] 注入构建失败、候选失败、切换失败、重启及断点恢复；数据库已开放写入时不得自动恢复旧库；审查后提交。

验证命令：`python -m unittest discover -s tests/production -p 'test_*.py' -q`；`python tests/production-runtime/update_rollback.py --isolated`。验收包含第二次发布与工具重复运行，不只首次成功。

## Task 4：形成完整操作入口与交付证据

开发状态：实现、独立审查及 SSH 修复复审通过。本地真实控制器完成备份恢复、更新、重复执行和回滚；实际浏览器初跑166项通过加同版本9项复验覆盖174个唯一案例。SSH默认/非默认端口正确与错误公钥4项通过，修复后控制器9项通过。原生ARM64、生产采用和物理异地恢复未验收。整个分支最终审查另行记录。

**交付结果：** 一个本地入口能完整走通状态查询、打包、准备、备份、证据校验、更新、验证与回滚；交付给部署窗口的是已演练工具和适用条件。

**Files:** 新增 `scripts/production.ps1`、`tests/infrastructure/production-controller.test.ts`、`tests/production-runtime/run_release_rehearsal.py`、`tests/e2e/production-public-surface.spec.ts`、`tests/fixtures/production/playwright.fixture.config.ts`、`tests/fixtures/production/server.mjs`、`docs/production-deployment.md`；修改 `Production.Core.psm1`、`package.json` 与相关工作流/架构导航文档。

**Interfaces:** 本地提供 `Package/Status/Release/Verify/Rollback`，底层远程命令保持固定六个动作；`Release` 每一步核对相同版本和前一步证据，非零结果立即停止。演练入口以固定 fixture 完成，不连接生产。

- [ ] 先写控制器失败测试：错主机身份、版本不一致、未完成备份/恢复证明、断线、重复调用和错误回执均不能误报成功。
- [ ] 复用已有打包模块实现操作入口，明确配置缺失、恢复请求和实际能力状态；只输出非秘密证据。
- [ ] 运行隔离 Linux 的完整安装→A 基线→备份恢复→B 更新→回滚→再更新演练；验证 root 权限、锁、目录攻击、断点恢复。ARM64 真实构建/启动单列必要证据。
- [ ] 运行 58 对象、三个视口的页面/交互验证；本地 fixture 检验测试程序，真实候选检验网站。无提交与真实表单提交结果分开；本窗口不发送真实表单。
- [ ] 更新单一操作说明和导航，明确“本地工具开发通过”与“已在生产采用”不同；独立整体审查后整理任务分支交付，不自动合并或安装。

验证命令：`npx vitest run tests/infrastructure/production-controller.test.ts`；`python tests/production-runtime/run_release_rehearsal.py --isolated`；`npx playwright test tests/e2e/production-public-surface.spec.ts --config=tests/fixtures/production/playwright.fixture.config.ts`。

## 执行与完成判断

以上四项是交付任务，测试、文档和审查属于各任务内部步骤，不再拆成独立十几项。正常按顺序实施；缺实际环境交接时只阻止真实适配验收，可继续 fixture 开发。

每个任务结束记录准确提交、环境、成功/失败场景及未决项。发现重复架构缺陷时先修设计和测试边界，不依靠增加修复轮数宣布完成。所有需要真实环境才能证明的条件未通过之前，结果只能叫“候选工具”。

用户已确认继续本地开发。正式服务器执行、共享分支集成、首次上线数据迁移和基础设施加固仍由另一窗口协调处理。

最终审查：整个分支审查发现的备份子进程锁、回滚身份竞争及安装权限解析三项已修复，独立定向复审通过。修复后 Python37项、Linux3项（含12种权限）、控制器10项及真实本地SSH传输验证通过；具体范围见发布工具验证记录。四项本地开发交付完成，保留任务分支，不自动合并、推送或部署；生产采用、原生/完整ARM64和物理异地恢复仍未验收。任务中的平台条件须以此证据边界解释，不能因本地交付完成将未验收项视为通过。
