# TiO₂ Malaysia 本地预发布环境

这套环境是`tio2-my`完成本地`main`集成后的权威全站本地测试入口。它使用独立Docker Compose项目`d16-tio2-my-prerelease`，包含MariaDB、独立WordPress后台、WP-CLI初始化、Next.js构建和Web运行实例。它不代表远程Preview、Production、Gate 9、Gate 10或发布授权。

与开发环境及CI/CD的关系见[内部开发与测试执行第10–13节](development-execution.md#10-两套本地环境)：开发任务从develop创建分支，相关测试与E2E通过后合回develop；develop组合回归与E2E通过后合入main，核对合并结果再冻结源码交付预发布。当前命令由操作者/Agent显式触发，不代表已配置提交触发的自动CI/CD。`prerelease:test`是代表性冒烟，完整全站验收仍按本批次条件补齐；测试代码版本需与被测候选一起记录。

## 地址与隔离

本环境在整个系统中的位置见[当前软件架构](software-architecture.md)第7节；本文维护具体操作及副作用。历史双站开发配置与这里的独立预发布不是同一概念。

| 服务 | 本机地址 | 暴露范围 |
|---|---|---|
| Next.js网站 | `http://127.0.0.1:3100` | 仅loopback |
| WordPress后台 | `http://127.0.0.1:8180/wp-admin/` | 仅loopback |
| WordPress GraphQL | `http://127.0.0.1:8180/graphql` | 仅loopback |
| MariaDB | 无主机端口 | 仅Compose内部网络 |

数据库、WordPress文件、Sample收据台账和npm缓存使用`d16-tio2-my-prerelease_`前缀的专用volume。控制器不会停止其他项目进程，也不会删除此前缀之外的volume。

## 首次配置

需要Docker Desktop、Node.js/npm、Git、PowerShell和本仓库已安装的Playwright浏览器。只在本地`main`工作树干净时启动。

复制[配置示例](../ops/prerelease/.env.example)为仓库根目录`.env.prerelease.local`，替换数据库、WordPress管理员、revalidation、preview和已批准Web3Forms receiver值。文件已被Git忽略。`PRERELEASE_SOURCE_DIR`和`PRERELEASE_RUN_DIR`由控制器在每次运行时覆盖；不要把密钥写入代码、文档或回执。

Sample服务器另需在同一忽略文件配置`TIO2_MY_SAMPLE_RECEIVER_BINDING`（包含`site_scope`、私有`recipient`、与现有key匹配的`key_sha256`），RFQ需`TIO2_MY_RFQ_ATTRIBUTION_SECRET`。Compose将Sample持久化目录固定为`/var/lib/tio2-sample-receipts`并挂载专用volume；更换候选、停止和CMS重置均保留该台账。绑定配置不等于实际收件证明。

`PRERELEASE_LIVE_FORMS_ENABLED=false`是默认值。启动前会检查必需字段，错误只报告字段名，不输出字段值。

## 日常命令

工作目录为主D16 checkout。本工具仍要求调用工作树当前分支为main且干净，不直接接受develop。准备预发布时先保存并隔离开发工作，再安全切换至已通过晋级检查的main；不得丢弃未提交修改或为启动而自动提交其他任务内容。先核对任务授权、现有运行及干净main；命令存在不表示当前环境已启动或测试通过。

| 命令 | 前提与副作用 | 应检查的结果 |
|---|---|---|
| `npm run prerelease:status` | 核对专用Docker运行，可能启动临时WP-CLI并写本地身份文件 | 机器状态及commit/Build/CMS/run身份；不能只看退出码 |
| `npm run prerelease:start` | 干净main、配置、Docker和空闲目标端口；写专用CMS、应用受控seed、安装构建依赖并启动容器 | 失败阶段或绑定成功的run/Build/CMS；启动不等于验收 |
| `npm run prerelease:test` | 当前候选身份HEALTHY；在调用仓库运行Playwright，写新证据目录 | 用例实际执行、零非GET请求、退出码与result；仅代表性冒烟 |
| `npm run prerelease:stop` | 操作准确专用栈，会中断该候选访问 | 目标栈停止；数据和历史证据保留 |

正常顺序：核对当前状态与候选 → 需要新候选时按保持条件停止旧实例并start → 核对身份 → test → 补齐本批次适用验收。没有新版本或重验依据时不重复构建。测试源码commit/未提交差异也要记录，不能假设它与冻结运行源码相同。

`start`先核对当前分支为`main`且工作树干净，再通过`git archive <full-commit>`创建冻结源码。它启动CMS、校验所有seed哈希、只应用未记录的匹配seed、构建Next.js、启动Web，并执行两轮只读HTTP检查。操作锁位于`.prerelease/operation.lock`。

`status`不输出环境变量或密钥。它读取精确Compose项目的`db`、`wordpress`和`web`实时健康状态，通过临时只读WP-CLI运行重新校验站点记录并写入独立的`live-cms-identity.json`，再核对Web身份接口；启动时的`cms-identity.json`保持不变，保存的旧身份文件本身不能构成`HEALTHY`。主要状态如下：

| 状态 | 含义 |
|---|---|
| `HEALTHY` | 保存的commit、站点、Build ID、CMS身份和当前运行实例一致，且本地`main`未移动 |
| `STALE_MAIN` | 运行实例本身仍一致，但本地`main`已前移；服务保持运行，需重新构建后才能代表最新`main` |
| `UNHEALTHY` | 运行不可达，或Build、站点、CMS、commit/run身份不一致 |
| `RESETTING` | 控制器正持有同一操作锁执行数据删除、重新初始化和新运行构建 |
| `STOPPED` | 没有当前运行，或已通过控制器停止 |

`test`仅运行`tests/e2e/prerelease-smoke.spec.ts`。测试拦截所有非GET请求，验证代表性页面、CMS页面身份、导航、canonical/robots、Cookie Settings、三张表单的本地验证、键盘流程、1440/768/390布局、横向溢出和Chromium 200%页面缩放。结果必须记录`externalPostCount: 0`。

`stop`只停止此Compose项目并保留数据及运行证据。

## 显式数据重置

`npm run prerelease:reset`会删除并重建专用CMS数据和上传文件，不是日常启动步骤、备份恢复或常规CD回滚。仅在任务明确覆盖数据重置时执行；先保存仍需保留的数据和证据，复用已有适用授权。

`reset`要求服务已停止；在删除前先输出`RESETTING` JSON，列出Compose项目及两个精确目标volume。控制器在同一操作锁内移除仍挂载volume的本项目容器，仅删除`d16-tio2-my-prerelease_prerelease_db`和`d16-tio2-my-prerelease_prerelease_wp`，保留npm缓存和旧运行证据，然后执行一次完整的新运行构建。新运行目录的`reset-receipt.json`记录实际删除的volume名称以及重置前后的run ID和CMS身份哈希。

## 显式真实表单测试

只有任务已有明确授权覆盖三张表单的真实对外测试时，才把`.env.prerelease.local`中的`PRERELEASE_LIVE_FORMS_ENABLED`改为`true`并运行下列命令。配置开关不构成授权；仅授权单张表单时，不能调用这个三张表单入口：

```powershell
npm run prerelease:test:forms-live
```

该命令会真实对外发送三次请求：RFQ、Request a Sample和Request Documents各一次。主题带`[LOCAL PRERELEASE]`，payload带`environment=local-prerelease`及复用现有请求令牌的`test_run_id`。RFQ与Sample通过真实本地服务端接口提交，Documents直接提交服务商；按各自明确成功契约验证，并验证进入对应Thank You状态。失败不阻止其他表单独立运行；禁止记录含key的网络trace。自动结果只证明对应接口明确接收确认；`inboxConfirmed`保持`false`，实际收件需要另行人工确认。普通`prerelease:test`不会发送表单。

## 身份、证据与排错

每次运行保存在`.prerelease/runs/<UTC>-<shortCommit>/`，其中包括源码tar及其SHA-256、冻结源码、`cms-identity.json`和`run-manifest.json`。`.prerelease/current-run.json`只指向当前运行。测试证据保存在忽略目录`docs/verification/prerelease/runs/<UTC>-<UUID>/`，每次新建且不覆盖。

常见恢复步骤：

- 3100或8180被占用：定位并处理占用者；控制器不会终止未知进程。
- 配置失败：按报告的字段名修正`.env.prerelease.local`，不要粘贴值到任务消息或日志。
- CMS/seed失败：查看本次`run-manifest.json`的`failedStage`；seed哈希不匹配时先核对当前`main`和Manifest，不能跳过校验。
- Build或HTTP失败：保留失败run目录，修复代码或环境后从新的干净`main`重新执行`start`。
- `STALE_MAIN`：执行`stop`，确认新`main`干净，再执行`start`；不要把旧Build作为新`main`证据。

本环境不执行Git push、远程WordPress写入、部署、DNS、索引或发布。
