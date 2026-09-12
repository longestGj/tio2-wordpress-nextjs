# 阶段一生产发布工具开发回执

- 状态：`MERGED_TO_DEVELOP`
- 任务 ID：`five-type-release-phase1-foundation`
- 网站 / 主体：D16 多网站发布系统；阶段一仅为 `site:tio2-my + frontend-only`
- 批准输入与版本：
  - `docs/superpowers/specs/2026-09-12-multisite-production-release-architecture-design.md`
  - `docs/superpowers/plans/2026-09-12-five-type-release-phase1-foundation.md`
- `develop` 合并 commit：`71f5e606074775c66989b684bd4024e42b2e63b5`
- 来源分支与实现 commit：`codex/production-backup-nginx-inventory`；`59916f803b04c65910a7af933f2a56f8ce72653c`
- 工具候选 commit：`3660a5cb83f25e486a6ddcec7ae33292169dbbed`
- 独立代码复审结论与对象：六项任务均完成独立复审；整阶段复审发现的两项 Important 与一项 Minor 已分别由 `2d5ba983ed41d2a0256efd0692289e13a1e44b0b`、`3660a5cb83f25e486a6ddcec7ae33292169dbbed` 关闭；最终复审无 Critical、Important 或 Minor。

## 改动路径

- `ops/production/`：候选合同、分类、主体登记、Nginx/TLS 身份、状态控制器、迁移、前台备份及 `frontend-only` 适配器。
- `scripts/production/`：固定七动作客户端、断线恢复和第二次 Verify 证据生成器。
- `.codex/agents/`、`.agents/skills/`：项目级发布 Agent 与 Skill。
- `docs/`：开发/发布边界、发布架构、生产手册、回执模板和阶段一候选回执。
- `tests/production/`、`tests/production-runtime/`、`tests/infrastructure/`：单元、集成、故障恢复、真实 Docker/age/SSH 和跨文档合同验证。

## 已运行测试

验证日期：2026-09-12；环境：本地 Windows 开发工作区及测试脚本建立的隔离 Linux/Docker/SSH 环境。

- 合并后的 Python 全量：`python -m unittest discover -s tests/production -p 'test_*.py' -v`，357 passed，8 skipped，0 failed。8 项跳过均为当前 Windows/POSIX 设施差异，未计为通过。
- 合并后的五个发布合同 Vitest 按文件串行运行：48/48 passed。组合运行时两个 PowerShell/Git fixture 分别超过默认 5 秒；对应文件单独运行分别为 10/10 和 6/6 passed，其余文件为 13/13、12/12、7/7 passed。
- 阶段实现证据：前台隔离演练 22/22 passed；最终 SSH pin 与断线恢复演练 7/7 passed；真实 age 解密、Docker load、隔离 HTTP 200、备份只执行一次及清理均通过。
- 第二次 Verify：真实 `New-ProductionCompletionEvidence.ps1` 输出驱动同一 RunRoot 从 `PUBLIC_VERIFIED` 到 `COMPLETED`；成功与失败关闭集成均通过。
- `git diff --check` 通过；根 `AGENTS.md` 无差异；工作树在合并前干净。

## 实际证据与消费者

- 阶段一候选回执：`docs/verification/production-release-system/phase1-candidate/2026-09-12-phase1-tooling-candidate.md`。
- 管理员归档 SHA-256：`c619b30e3b494dd46228b5ddf932e9a561d5448179cbec20537b0f6a2f4ca129`；两次构建逐字节一致，共 38 个固定成员。
- sidecar SHA-256：`72821af2165f91fbbcc690e65e3204c515af484248d7fe3b152b704a764f78d1`。
- `tio2-my` 的 `frontend-only` 适配器状态为 `installed`；`content-only`、`combined`、`cms-platform`、`host-infrastructure` 均为 `not-installed`，没有写入 fallback。
- 本次未连接、安装或修改生产环境；未修改 `main`，也未触发预发布或发布。

## 预计发布影响与未决项

- 后续独立发布任务可把本回执与实际 Git 差异作为输入，并重新冻结准确 `develop`。
- 生产前仍须取得独立发布指令，读取 fresh `status`，核对管理员包、38 项清单、迁移计划与 plan hash、旧程序 generation、当前 RunRoot、兼容候选和活动身份。
- 当前仅能执行已经安装的 `site:tio2-my + frontend-only` 路径；其余四类适配器属于后续阶段，不能据此发布。
- 8 项平台相关跳过仍需在相应 POSIX/root 环境使用正式候选重新验证；历史生产回执不能替代 fresh 状态。
