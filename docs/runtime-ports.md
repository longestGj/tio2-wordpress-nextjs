# 本地运行端口与归属操作手册

本手册对应本地开发、任务验收运行和自动化测试。网站身份及环境分工见[内部开发与测试执行第10节](development-execution.md#10-两套本地环境)，预发布的配置、启动、重置和验收继续按[预发布使用说明](prerelease-environment.md)。命令存在不表示环境已启动、已验收或已部署。

## 固定端点与动态分配

以下六个端点保持固定；被占用时先核对归属，不自动换端口。

| 环境 | 网站 / 服务 | 控制器或项目 | 端点 |
|---|---|---|---|
| 开发 | `tio2-a` / Next.js | 多站控制器（`d16-dev-sites`逻辑归属） | `http://127.0.0.1:3001` |
| 开发 | `tio2-b` / Next.js | 多站控制器（`d16-dev-sites`逻辑归属） | `http://127.0.0.1:3002` |
| 开发 | `tio2-my` / Next.js | 多站控制器（`d16-dev-sites`逻辑归属） | `http://127.0.0.1:3003` |
| 开发 | 共享WordPress / GraphQL / 后台 | 保留单例Compose项目`wordpress` | `http://127.0.0.1:8080` |
| 本地预发布 | `tio2-my` / Next.js | `d16-tio2-my-prerelease` | `http://127.0.0.1:3100` |
| 本地预发布 | 独立WordPress / GraphQL / 后台 | `d16-tio2-my-prerelease` | `http://127.0.0.1:8180` |

| 临时运行用途 | 分配方法 | 使用约束 |
|---|---|---|
| 人工查看的feature runtime | `feature-next`租约，`32000-32099` | 先申请再启动，记录实际URL、网站、worktree、Build和保持条件 |
| Node HTTP fixture | loopback端口`0`，读取`server.address()`后输出JSON | 使用返回的`host`、`port`、`baseUrl`；不猜测数字 |
| 自动化Next.js | 能接收OS选端口的helper先探测端口`0`并立即登记租约；需预先传数字的启动器从`32100-32999`租用 | 该范围是分配池，不是E2E源码默认值 |
| 只使用WP-CLI的隔离测试 | Compose内部网络，无主机WordPress或MariaDB端口 | 使用`docker-compose.test-no-host.yml` |
| 需要主机HTTP的隔离WordPress测试 | Docker随机loopback发布，启动器检查实际映射 | 使用`docker-compose.test-random-http.yml`；读取`runtime.graphqlUrl`，主机页面使用同一个已核实的origin |

动态运行不得借用固定开发/预发布端点。历史证据中的3004、3015、3216、4013、8186等数字不能直接作为新运行的默认值。端口租约是本地协作记录，不持有监听socket；启动器仍须处理绑定失败并确认监听者身份。

## 开发与诊断入口

普通共享开发由同一个明确的操作者维护。在主D16 checkout核对现有归属和适用任务后，正常入口为：

```powershell
npm run wordpress:start
npm run sites:start
npm run runtime:status
npm run runtime:doctor
npm run prerelease:status
```

`sites:start`启动A/B/MY三个网站，不是单页默认启动器。任务只需一个临时网站时采用租约或owned E2E启动器。开发CMS控制器通过Git公共目录定位canonical checkout，固定使用该目录的`wordpress/.env`和Compose文件；worktree可以消费它，但不能用自己的Compose文件重建保留项目`wordpress`。

| 命令 | 实际作用与副作用 |
|---|---|
| `npm run wordpress:start` | 检查canonical Compose路径、标签和已有容器；启动开发CMS并写`.runtime/development-wordpress.json`，保留持久卷 |
| `npm run wordpress:status` | 读取开发CMS标签、状态及记录的容器ID；归属不一致时拒绝继续 |
| `npm run wordpress:stop` | 重新核对已记录身份后停止准确开发服务，不执行`down`或删卷 |
| `npm run sites:start` / `npm run sites:status` / `npm run sites:stop` | 用调用checkout自己的`.tmp/local-sites/sites.json`管理3001/3002/3003；检查PID、创建时间、命令及网站标记，停止只针对匹配记录 |
| `npm run runtime:status` | 列出租约和stale判断；可能创建缺失的租约目录并进行bind探测，不执行租约清理 |
| `npm run runtime:doctor` | 严格只读：读取租约、连接探测端口、读取Docker标签；不创建目录、启动容器、释放租约或停止进程 |
| `npm run prerelease:status` | 专用预发布身份检查，可能启动临时WP-CLI并写本地身份文件；不是严格只读盘点命令 |

需要严格只读检查时使用Doctor。需要启动、停止或修复运行时，应先按其任务范围和现有控制器合同核对。预发布`start`仍只接受干净main，`reset`仍是显式数据删除与重建动作；本手册不改变两者语义。

## 租约、申请、附加与释放

默认租约目录是调用工作区的`.runtime/port-leases/`。Node CLI可以用`--lease-root <absolute-path>`指定目录；PowerShell包装器使用默认目录。不同工作区的默认目录不是全机器统一注册表；并行启动器需要共享登记时，须显式使用同一租约根，同时继续探测实际端口。Doctor默认只读取当前工作区的租约，不能由空列表推断其他worktree没有运行。

每份`<leaseId>.json`只保存下列字段，不保存密钥：

```json
{
  "schemaVersion": 1,
  "leaseId": "cb1b13d0-df46-4c4e-83d7-4f687fd7dd5c",
  "runId": "feature-review-example",
  "purpose": "feature-next",
  "siteId": "tio2-my",
  "worktree": "D:/16Wordpress_nextjs/.worktrees/example",
  "commit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "host": "127.0.0.1",
  "ports": [32000],
  "processIds": [],
  "composeProject": null,
  "createdAt": "2026-09-11T00:00:00.000Z",
  "retainUntil": null
}
```

示例中的ID、commit和端口仅说明结构。`purpose`取`feature-next`、`test-next`、`test-wordpress`或`fixture`；基础设施fixture的`siteId`可为null。`ports`记录一个或多个端口，`processIds`与`composeProject`在启动后附加。PID创建时间、命令和容器标签由各owned启动器另外核验；需要持久化的日志按下文实际输出位置由调用方保存，租约中的PID本身不构成终止权限。

在本任务worktree申请人工验收端口：

```powershell
$featureRunId = 'feature-' + [Guid]::NewGuid().ToString('N')
$featureResponse = powershell -NoProfile -ExecutionPolicy Bypass -File scripts/runtime-ports.ps1 -Action Reserve -Purpose feature-next -RunId $featureRunId -SiteId tio2-my -Json | ConvertFrom-Json
if (-not $featureResponse.ok) { throw 'Feature port reservation failed.' }
$featureLeaseId = $featureResponse.lease.leaseId
$featurePort = $featureResponse.lease.ports[0]
```

`Reserve`只申请端口，不启动Next.js。将返回的`$featurePort`交给本任务启动器，使用独立`NEXT_DIST_DIR`并记录真实PID、创建时间、命令身份及stdout/stderr位置。启动器返回PID后把它赋给`$featureProcessId`，立即附加，再检查预期网站的`data-site-id`与访问URL：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/runtime-ports.ps1 -Action Attach -LeaseId $featureLeaseId -ProcessId $featureProcessId -Json
```

需要多端口时在申请时传`-Count`，使用返回数组，不自行加减端口号。保持人工验收运行时，在任务记录明确释放条件；`retainUntil`当前由Node模块`reserveLease`接收ISO时间戳，CLI/PowerShell没有该参数，不能手改JSON冒充已受控保留。

结束时先由原启动器核对并停止本任务的进程树，等待监听关闭，再释放准确租约。以下命令只删除租约，不停止任何进程；必须保留启动时的真实ID，不能拿当前占用者替换：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/runtime-ports.ps1 -Action Release -LeaseId $featureLeaseId -ProcessId $featureProcessId -Json
```

CLI也提供`node scripts/runtime-ports/cli.mjs reserve|attach|release|status|doctor`。`attach`和`release`接受`--lease-id`、`--process-id`、`--compose-project`；自动化多PID释放使用模块的完整`expectedProcessIds`。未启动成功的空租约可按已记录lease ID释放。期待PID集合或Compose项目不同会报`OWNER_MISMATCH`并保留记录；省略期待身份不等于已经验证owner。不存在的lease ID返回`released: false`，不能当作释放了其他记录。分配器只自动清除已附加owner且可证明进程、项目和监听均不存在的过期记录，未附加的申请不会被并发申请抢走。

## 测试数据与启动器合同

每个Docker测试声明数据模式，不能从URL或端口推断：

| 模式 | 数据与归属 | 生命周期边界 |
|---|---|---|
| `isolated` | 唯一`d16-test-<run-id>-<collision-resistant-suffix>`项目、独立数据或受控PHP替身 | 测试只管理其准确项目；主机HTTP可选；清理只处理本次创建并核实的资源 |
| `shared-read-only` | canonical开发CMS | 使用既有显式opt-in，核对owner，只允许只读WP命令；没有`up/down/stop`权限 |
| `shared-mutating` | canonical开发CMS、显式串行授权、锁与恢复 | 维持原opt-in并串行运行，记录修改及恢复；不控制共享栈生命周期 |

共享数据即使端口隔离仍不能任意并行修改。保留项目名`wordpress`和`d16-tio2-my-prerelease`禁止用于自动化隔离栈的创建或清理；共享测试仅消费已验证的既有栈。清理只使用启动时记录的项目和Compose参数；持久开发及预发布volume不属于测试清理目标。`--volumes`仅能用于本次明确创建且已记录为可丢弃的卷。

普通E2E通过以下入口取得owned Next URL；下面示例以归属正确的开发CMS为前提：

```powershell
npm run test:e2e:owned -- --site tio2-my --spec tests/e2e/product-hub.spec.ts --env WORDPRESS_GRAPHQL_URL=http://127.0.0.1:8080/graphql
```

该npm入口调用[owned E2E启动器](../scripts/run-owned-e2e.mjs)，可重复传`--spec`、`--fixture`和合同允许的`--env`。fixture使用端口`0`并输出JSON，由启动器把实际URL传给声明的变量。Next的`WORDPRESS_GRAPHQL_URL`是独立合同：普通`*_FIXTURE_URL`不会隐式成为Next的CMS；若要让fixture承担Next GraphQL，须显式声明相应`WORDPRESS_GRAPHQL_URL`来源。

DOC-REACH状态测试需要`DOC_REACH_FIXTURE_URL`与Next的`WORDPRESS_GRAPHQL_URL`指向同一个fixture进程：前者使用其origin，后者使用同源`/graphql`；同时须满足签名revalidation等规格合同。当前每个`--fixture`声明都启动独立进程，即使重复传同一个脚本也不共享状态；启动器没有单实例的多变量URL别名映射。因此本手册不提供DOC-REACH的单命令示例，应先由支持共享fixture映射的owned工作流供给并验证两个实际URL，不能把状态控制fixture与8080 CMS或另一fixture实例拼接使用。

启动器生成`TIO2_MY_BASE_URL`等前端URL、检查网站标记和监听进程身份。规格通过`requiredLocalUrl`拒绝缺失、远程、带凭据、查询参数、片段或错误路径的URL；配置缺失会失败，不回退历史端口，也不因此跳过测试。传入8080相关CMS URL时，启动器在创建fixture、Next或Playwright进程前检查Doctor，只有`expected-owner`才继续。密钥从当前任务已有忽略配置安全加载，不放入命令行、文档或回执。

`npm run test:e2e`仍是底层Playwright入口，不负责补齐运行URL。固定预发布规格通过已有预发布控制器运行，保留3100例外，不能交给动态启动器。

## Doctor判读与OWNER_MISMATCH恢复

Doctor的JSON包含`fixedEndpoints`、`docker.available`、`duplicateProjects`、`leases`、`leaseError`和`actionsTaken`。`ok: true`/退出0只表示诊断已返回，不表示环境健康。

| 结果 | 可以得出的结论 |
|---|---|
| `available` | 本次未观察到该端口监听；不证明不存在已停止容器 |
| `expected-owner` | 正在监听的Docker服务及其项目/路径符合固定端点合同；不替代Build、CMS内容或业务验收 |
| `unknown-listener` | 监听者缺少可核实归属，或socket/Docker证据不可用；查看`reason`，保留现场 |
| `owner-mismatch` | 保留项目来自其他checkout或Compose配置；停止受影响启动/共享CMS测试流程 |
| `duplicateProjects`非空 | 同一Compose项目有不同working directory/config files来源；不是“多个服务”本身有错 |
| `stale: true` | 本次未发现有效保留期、存活owner或监听；Doctor只报告，不回收 |
| `evidenceIncomplete: true` / `leaseError` | 证据不足或无效，不能当作资源已空闲 |

Doctor目前不通过Windows进程记录给开发Next监听者判定`expected-owner`，因此正在运行的3001/3002/3003可能显示`unknown-listener`；用原多站控制器的status、PID创建时间和网站标记补齐证据。Doctor的Compose清单只检查运行中容器，停止的保留栈需另查`docker ps -a`。

定位占用者时只读检查，示例端口应替换为报告中的端口：

```powershell
$observedListeners = Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction SilentlyContinue
$observedListeners | Select-Object LocalAddress, LocalPort, OwningProcess
$observedListeners.OwningProcess | Sort-Object -Unique | ForEach-Object { Get-Process -Id $_ | Select-Object Id, ProcessName, StartTime, Path }
docker ps -a --filter label=com.docker.compose.project=wordpress --format '{{.ID}} {{.Names}} {{.Status}}'
```

对选定容器读取project、service、working_dir、config_files标签及端口映射，与原运行记录比较；不输出完整环境变量、凭据或私钥。进程名、端口、可访问页面、旧PID或一份lease文件都不足以证明可以停止它。

遇到`OWNER_MISMATCH`，保留租约、日志和当前ID，由原运行owner核对精确PID/创建时间或容器标签后处理。混合来源的`wordpress`项目需要单独的归属纠正工作；不能自动adopt、修改标签、重建、删卷或终止占用者来使检查变绿。未确认owner的监听不会被自动停止；超时、PID复用或清理失败也保留资源证据并阻止受影响验收。只有确认原资源结束且释放条件满足，才按原租约身份释放并重新诊断。

## 中断、日志与交回

owned E2E/Next启动器在正常结束、断言失败、启动失败、超时、SIGINT和SIGTERM时复用同一清理路径：核实owner → 停止本次进程树 → 等待监听关闭 → 释放本次租约。Next与WordPress helper的调用方仍须在`finally`/`afterAll`中`await runtime.stop()`；不能依赖测试成功才清理。WordPress部分启动或归属无法核实会保留现场并返回准确项目/Compose参数，不能保证自动清除。系统强制终止、断电或身份不匹配同样不能保证自动清理，下一次先Doctor并核对证据。不得运行按端口批量杀进程或全局Docker清理。

| 证据位置 | 内容与使用 |
|---|---|
| `.runtime/port-leases/` | 当前工作区的租约；清理完成后本次记录应消失 |
| canonical checkout的`.runtime/development-wordpress.json` | 开发CMS的repository/commit/Compose/container IDs；与实时标签一起使用 |
| `.tmp/local-sites/sites.json`及同目录stdout/stderr日志 | 多站启动身份与日志，具体路径来自记录 |
| `.tmp/owned-e2e/<runId>/` | `process-identities.json`、Playwright产物和规格证据；启动器控制台JSON/Playwright输出需由任务另存 |
| owned Next helper的`serverLogOffset()` / `serverErrorsSince(offset)` | 进程内的服务器日志读取接口；调用方保存当次需要的错误证据，不能假定已有日志目录 |
| `.prerelease/runs/`及预发布测试证据 | 继续按预发布使用说明记录源码、Build、CMS与测试身份 |

交回记录精确branch/commit、测试命令和计数、实际分配URL、Doctor前后结果、稳定owner/container IDs及未决项。全套验证需在稳定服务由正确owner运行时证明共存；若它们停止或归属错误，只能报告已执行的独立验证及共存阻断。应用断言失败单列调试，不为端口任务跳过、削弱断言或修改业务语义。

`.runtime`是忽略的本地运行状态，不是部署回执；本手册和本地检查不能证明已合入develop/main、已重建预发布、已备份或已发布生产。具体晋级继续按[开发交付流程第6–7节](development-workflow.md#6-分支开发机器交回与串行集成)。
