# D16 五类发布系统阶段一候选回执

- 状态：`PHASE1_TOOLING_CANDIDATE`
- 验证日期：2026-09-12（Asia/Shanghai）
- 网站 / 主体：`tio2-my` / site
- 工具候选 commit：`3660a5cb83f25e486a6ddcec7ae33292169dbbed`
- 能力：只安装 `tio2-my/frontend-only` 的已验证兼容事务路径
- 未安装：`content-only`、`combined`、`cms-platform`、`host-infrastructure`
- 生产操作：未执行

本回执只证明阶段一代码、文档、角色合同和可复现管理员包形成可审查候选。它不表示管理员包已安装、兼容事务已迁移、网站候选已部署或生产已重新验证。

## 验证摘要

| 检查 | 结果 |
|---|---|
| 直接合同 TDD 红灯：3 个基础设施文件 | 3 项新增合同按预期因缺少发布架构、发布流程和回执模板失败；原有 19 项通过 |
| 直接合同绿灯 | 3 files / 22 tests passed |
| 复审修复 TDD 红灯：跨文档导航合同 | 1 项新增合同按预期因缺少根规则指定的精确标题失败；原有 5 项通过 |
| 复审修复绿灯：3 个基础设施合同文件 | 3 files / 23 tests passed |
| `python -m unittest discover -s tests/production -p 'test_*.py' -v` | 353 tests passed；8 skipped |
| 阶段一 Vitest 组合 | 5 files / 47 tests passed；0 skipped |
| `frontend_release_rehearsal.py --isolated` | `passed=true`；22 cases |
| `run_ssh_pin_rehearsal.py --isolated` | `passed=true`；6 cases |
| Skill `quick_validate.py` | passed |
| `git diff --check`、目标文件 Gate 旧角色扫描、根 `AGENTS.md` 差异 | passed；无残留；根规则无差异 |
| second Verify 证据接口 TDD 红灯 | 1 项真实客户端集成按预期失败：固定六文件生成脚本不存在，旧脚本不能满足接口 |
| second Verify 证据接口绿灯 | 真实 PowerShell 生成器产生六文件并驱动同一 RunRoot 从 `PUBLIC_VERIFIED` 进入 `COMPLETED` |
| 证据生成失败关闭 | 1 项集成通过；分别拒绝 173/174、活动 Build 漂移、recipient 不匹配和重复 Message-ID，失败时无六文件残留 |
| 当前影响面 Python 回归 | 62 tests：59 passed；3 skipped（隔离 Linux root fixture） |
| 当前客户端/合同 Vitest | 5 files / 29 tests passed；0 skipped |
| 当前管理员包单元回归 | 5 tests passed；两次归档与两次 sidecar 分别逐字节一致 |
| 当前 `git diff --check` | passed |

此前完整阶段一验证在 `afd87489adbd0cae71b9db3de81c438552e77fcd` 上执行，包含 353 项 Python、47 项阶段一 Vitest、22 场景前台隔离演练、6 场景 SSH pin 演练和 Skill 校验；其 8 个跳过均来自 Windows 与 POSIX 设施差异，未计为通过：2 个需要 Windows 符号链接权限，3 个需要隔离 Linux root fixture，1 个需要真实 root-owned POSIX symlink，2 个需要真实 POSIX filesystem。后续 `2d5ba983ed41d2a0256efd0692289e13a1e44b0b` 修复了丢失 SSH 回执后的已提交备份恢复。

本轮在准确修复 HEAD 上新增本地 second Verify 证据生成器并修改其直接客户端集成、运行手册和发布 Skill，没有修改 `Production.Core.psm1`、服务端管理员程序、容器或 SSH 文件。因此当前验证选择直接客户端、服务端完成合同、最终协议和相邻 Vitest 合同；未重复 Docker/前台隔离演练、SSH pin 演练或全量 353 项 Python。阶段一未安装适配器的写动作继续由既有单元与控制器合同验证为 `capability-not-installed`，没有 fallback。

## 管理员候选与可复现性

两次构建均从上述准确已提交 HEAD 读取 Git object bytes，未读取工作树内容：

| 工件 | SHA-256 |
|---|---|
| `.production/candidates/admin-phase1-completion-fix-a.tar.gz` | `c619b30e3b494dd46228b5ddf932e9a561d5448179cbec20537b0f6a2f4ca129` |
| `.production/candidates/admin-phase1-completion-fix-b.tar.gz` | `c619b30e3b494dd46228b5ddf932e9a561d5448179cbec20537b0f6a2f4ca129` |
| `admin-phase1-completion-fix-a.tar.gz.sha256.json` | `72821af2165f91fbbcc690e65e3204c515af484248d7fe3b152b704a764f78d1` |
| `admin-phase1-completion-fix-b.tar.gz.sha256.json` | `72821af2165f91fbbcc690e65e3204c515af484248d7fe3b152b704a764f78d1` |

两个归档和两个 sidecar 分别逐字节一致。sidecar 记录 `schemaVersion=d16-phase1-admin-v1`、`toolCommit=3660a5cb83f25e486a6ddcec7ae33292169dbbed`、`installationPerformed=false`。归档哈希因 `tool-commit.txt` 精确绑定新的修复提交而变化；客户端证据脚本不属于管理员安装清单。

归档有 38 个 `admin/` 下的固定成员：

```text
adoption_apply.py
adoption_contract.py
adoption_finalize.py
adoption_internal.py
adoption_phase_a.py
adoption_probe.py
adoption_state.py
adoption_tls.py
adoption_wordpress.py
backup.sh
backup_core.py
bootstrap_install.py
bootstrap_selftest.py
candidate_contract.py
cms_evidence.py
d16_release.py
deployment_core.py
frontend_backup.py
install.sh
nginx_inventory.py
phase1_migration.py
release_actions.py
release_adapter.py
release_baseline.py
release_contract.py
release_controller.py
release_state.py
root-adopt.sh
root-migrate-phase1.sh
site_frontend_adapter.py
sshd-tio2-production.conf
subject_registry.py
sudoers.tio2-release
tio2_adopt.py
tio2_release.py
tls_identity.py
tool-commit.txt
web.Dockerfile
```

清单来自该 commit 中 `bootstrap_install.py` 的 `REQUIRED_FILES`。归档不包含密钥、connection JSON、RunRoot、生产状态/快照、测试临时目录或未跟踪文件。

## 迁移 dry-run 与故障矩阵

隔离 fixture 上执行：

```text
python -m unittest tests.production.test_phase1_migration.Phase1MigrationTests.test_plan_is_read_only_binds_old_new_generations_registry_state_and_order -v
```

结果为 1 test passed。`plan()` 重复产生同一个哈希，绑定旧/新 generation、登记、状态、固定替换顺序和目标 commit；该步骤没有调用 `apply`，没有修改受保护树或运行时。

完整 Python 套件执行了迁移故障矩阵：9 个提交目标各自覆盖 `intent`、`replaced`、`committed` 三个窗口，另覆盖 8 个文件/链接 `staged` 窗口、`verified` 和 `receipt`，共 37 个中断窗口。每个窗口要求恢复原受保护字节与原运行时；额外覆盖损坏 journal、包/源码/plan/旧状态/登记漂移、证据失败、运行漂移、已安装状态篡改、root 拒绝、链接、单目标恢复失败与重试。

前台隔离演练的 22 个场景覆盖低空间、运行身份漂移、A→B→A、精确重试、安全回退和不确定状态；不确定结果保持 `RECOVERY_REQUIRED`。SSH pin 演练 6 个场景覆盖固定 argv、host-key pin 与失败后状态读取。它们均使用本地隔离资源。

## 生产未修改证明与当前版本

本任务调用的外部动作只有本地 Git、Vitest、Python 单元测试、两个 `--isolated` rehearsal、Skill 校验和管理员包构建。没有调用 `scripts/production.ps1` 的远程操作，没有运行 SSH 到生产，没有上传工件，没有执行 migration `apply`，也没有连接或修改生产 Docker、Nginx、CMS、数据库、DNS、TLS 或 sudoers。

| 身份 | 当前可陈述事实 |
|---|---|
| 阶段一工具候选 | `3660a5cb83f25e486a6ddcec7ae33292169dbbed`；管理员包 SHA-256 如上 |
| 兼容发布候选 | 代码只受理 Task 4 迁移的既有不可变候选和同一 RunRoot；本任务未从生产读取其当前状态 |
| 最近一次已记录活动生产版本 | `main@27f0a0da59df1e54cd01eab7d77eb7024b338d42`，Build ID `wQLBw5iwDoUK0QoWOnb10`，活动基线 `1189e46490fb155298c00323391d717091d5de490c9ae9d396ff7880ae5f783e` |
| 最近一次生产回执 | 2026-09-11 记录服务器公开验证和最终生产验收通过；RunRoot `.production/runs/20260911T082815Z-27f0a0da59df/` |

上述生产版本来自已提交的 2026-09-11 接管回执，不是本任务 fresh `status`。这一区分是刻意的：阶段一候选形成不授予连接生产的权限。

## 后续生产动作

生产前仍需另一条明确指令，并在动作发生前提交和核对：准确管理员包 SHA-256 与 38 项清单、只读迁移计划及 plan hash、旧程序 generation 回退目标、当前生产 RunRoot、fresh `status`、实际兼容候选/活动身份和完整动作序列。

管理员安装与迁移通过后，仍需使用同一 RunRoot 按 `status -> prepare -> backup -> stage -> activate -> verify` 推进，再完成 58 个对象、174 个浏览器案例、RFQ/Sample/Documents 真实提交、三封邮件确认和第二次 `verify`。只有新的最终生产验收回执成立才能宣称生产完成。

阶段二另行实现内容 generation、`content-only`、`combined` 与 `cms-platform`；阶段三另行实现 `host-infrastructure`、Release Campaign 与新站接管。本候选不包含这些执行能力。
