# D16 多网站开发、测试与发布

本工作区承接不同策划项目的网站内容，负责技术实现、测试、缺陷修复，以及获授权后的部署和发布。当前以 `D:\23MySec` 的 TiO₂ Malaysia 网站为主要实例；`D:\11SEO` 负责另一个网站的策划，具体承接身份在该站任务中核对。

## 工作入口

| 要做什么 | 先读哪里 |
|---|---|
| 了解规则与职责 | [AGENTS.md](AGENTS.md) |
| 确认网站及策划来源 | [网站登记](docs/site-registry.md) |
| 理解业务流程、规则及有效来源 | [业务文档入口](docs/business/README.md)，Malaysia询盘为首份待审阅样稿 |
| 理解当前软件结构、数据流与环境拓扑 | [当前软件架构](docs/software-architecture.md)，包含与历史设计的差异 |
| 接收任务、开发、测试、回执、发布 | [开发交付流程](docs/development-workflow.md) |
| 派发任何网站的开发任务、核对交接 | [通用任务模板](docs/templates/development-task.md) / [通用交接清单](docs/development-handoff.md)；D23另用其专属适配 |
| 组织Agent、架构设计工作、TDD与分层测试 | [内部开发与测试执行](docs/development-execution.md)，这是执行方法，不是软件架构现状 |
| 本地开发→CI检查→预发布晋级 | [两套环境与CI/CD](docs/development-execution.md#10-两套本地环境) / [预发布操作说明](docs/prerelease-environment.md) |
| 准备及执行一次发布 | [发布流程](docs/development-workflow.md#7-发布d16执行授权按网站和环境限定) / [任务记录的发布栏目](docs/templates/development-task-record.md#9-发布与运行交接记录适用时) |
| 记录一次开发任务 / 查看完整实例 | [任务记录模板](docs/templates/development-task-record.md) / [Poland交接实例](docs/examples/poland-development-handoff.md) |
| 核对D23策划→开发→验收的具体交付 | [Gate 6→8 / Gate 8→9交接清单](docs/d23-gate-handoff.md) |
| 查既有设计与实施记录 | `docs/superpowers/specs/`、`docs/superpowers/plans/` |
| 查页面技术验证 | `docs/verification/`对应页面或功能；历史结果须核对版本和日期 |
| 追溯早期双站操作 | [历史README](docs/runbooks/legacy-two-site-local.md)，不作为当前执行指令 |

策划项目维护内容、视觉、批准基线及独立验收；D16维护实现与技术证据。已有策划合同直接引用，不重新策划整站，也不要求未来网站都采用D23的Gate编号。

文档分工和按任务阅读路径统一见[开发交付流程的阅读导航](docs/development-workflow.md#0-按任务阅读与文档职责)。当前能力、发现的问题及后续工程缺口见[2026-09-08文档审视记录](docs/verification/workflow-review-2026-09-08.md)；这是本轮快照，不是页面进度或新操作授权。

分支流程：每项开发任务从`develop`创建`codex/<task>`，相关测试和E2E通过后合回`develop`；`develop`通过集成回归和E2E后再合入`main`，干净`main`用于本地预发布。具体条件见[开发交付流程第6节](docs/development-workflow.md#6-分支开发机器交回与串行集成)。

## 当前实现

当前代码是共享Next.js应用与WordPress CMS，通过精确站点身份隔离。完整模块、内容/表单链路、缓存/预览、两套本地环境及生产待核实项见[当前软件架构](docs/software-architecture.md)。这是现有实现方式，未来网站是否共享应用、CMS或部署项目按需求决定。

| 网站ID | 品牌 / 配置域名 | 本地控制器端口 | 构建目录 |
|---|---|---|---|
| `tio2-my` | TiO₂ Malaysia / `tio2malaysia.com` | 3003 | `.next-tio2-my` |
| `tio2-a` | TIOVAR / `tio2products.com` | 3001 | `.next-tio2-a` |
| `tio2-b` | TiO2 B / `tio2hub.com` | 3002 | `.next-tio2-b` |

身份配置见 `sites/`，控制器配置见 `scripts/start-local-sites.ps1`。其他任务可使用独立端口及构建目录；表中不是运行状态或部署证明。本地WordPress使用 `127.0.0.1:8080`。

- `app/`、`components/`：路由、页面及共享界面。
- `lib/`、`sites/`：站点身份、数据读取和校验、业务与SEO逻辑。
- `wordpress/`：CMS模型、GraphQL契约、内容配置及受控本地seed。
- `scripts/`、`tests/`：运行工具与验证。
- `public/`：可被网站提供的资产；草稿、密钥及未批准公开材料不放这里。
- `content/`、`documents/`、`.agent/tiovar-tds-agent/`：既有TIOVAR产品事实与TDS资料流程，保留其品牌和批准边界。
- `.tmp/`、`.local-evidence/`：忽略的本地临时产物；正式回执引用的唯一证据不能只留在可清理缓存中。

D16运行所需资产和数据应进入对应代码、CMS或部署环境，不在生产运行时读取策划项目的本机目录。

## 本地运行与验证

使用当前依赖锁文件和相关Next.js本地指南核对运行环境；锁文件指定的 `sanitize-html@2.17.7` 要求Node.js至少22.12.0。开发前核对本机已安装依赖与锁文件是否一致，运行环境记录以当次验证为准。

本地站点需匹配 `SITE_ID`、`NEXT_DIST_DIR`、WordPress入口及该站预览/重验证配置；参考 `.env.example` 与 `wordpress/.env.example`，实际密钥留在忽略文件或对应环境。创建或变更本地CMS按已授权任务使用现有脚本，先检查Plan及恢复范围。

| 命令 | 使用范围 |
|---|---|
| `npm run dev` / `npm run build` / `npm run start` | 当前环境配置指定的站点，执行前核对身份及构建目录 |
| `npm test -- <相关测试路径>` | 定向Vitest验证 |
| `npm run lint` / `npm run typecheck` | 代码变化需要时执行 |
| `npx playwright test <相关测试文件>` | 按实际配置核对测试站点、端口和CMS行为 |
| `npm run sites:status` | 查看本地控制器状态 |
| `npm run prerelease:start` / `npm run prerelease:status` / `npm run prerelease:test` / `npm run prerelease:stop` | `tio2-my`独立预发布；干净main构建，start含本地CMS写入，test为阻止非GET请求的冒烟。详见[操作说明](docs/prerelease-environment.md) |
| `npm run sites:start` / `npm run sites:stop` | 当前控制器覆盖三个站点；不是单站启动工具，停止时验证所管理进程身份 |
| `npm run validate` / `npm run verify:local` | 广泛验证，先读取实际脚本；不作为普通单页任务默认检查 |
| `npm run verify:root-only` | 特定TiO₂发布/505-to-1迁移检查，必须取得新的、单独明确授权 |

正常开发按影响范围验证。Site B保持业务冻结；Site A的Homepage链接限制不扩展到Malaysia站。

## 交付与发布

D16主回执记录网站、批准交付版本、实现版本、验证环境和结果、未决项及下一责任方。开发完成、独立验收通过、发布授权和实际部署分别记录。

Preview/Production部署、远程写入、DNS、迁移和索引按明确授权执行；已有授权直接复用。发布前核对目标网站与环境、适用验收、配置及回退，发布后保存实际结果。仓库中的Vercel配置或域名不代表已经部署或获准索引。
