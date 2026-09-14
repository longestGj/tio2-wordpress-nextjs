# 内容发布：整库备份与本次失败恢复

本页对应用户批准的[最小改动方案](superpowers/specs/2026-09-12-minimal-content-release-design.md)。共享 WordPress 和数据库，前台继续按 `SITE_ID` 运行；不增加网站独立数据库或内容版本指针。

## 操作模型

日常内容操作为 `Test`、`Publish`、`Rollback`；`Status` 只读查看当前状态。

1. `Test` 调用固定的本地隔离测试脚本，读取本地预发布来源并克隆到独立测试资源，将指定内容包导入后验证实际 WordPress、Next 页面及恢复链路。使用 `ContentPath`，或从 `RunRoot/payload/content/package.json` 取包；`PythonExe` 可指定本地 Python。此操作不连接生产 SSH，日志保存在返回的 `logPath`，不会凭退出码编造预发布通过回执。
2. 完成实际测试后，使用该包及其有效预发布回执准备不可变候选。`Publish` 从候选 `RunRoot` 和连接 `ConfigPath` 读取网站与版本，内部依次完成准备、暂停共享 CMS 写入、整库备份、导入、缓存刷新、实际页面验证及回执封存。
3. `Publish` 失败后停止后续步骤，只查询并记录服务器状态；服务器在仍可恢复的窗口内处理导入/验证失败的回退。需要手动恢复时，对同一 `RunRoot` 执行 `Rollback`，由服务器核对窗口及备份所有权；不盲目重跑发布。
4. 已完成的同一候选再次调用 `Publish` 只报告现有完成状态。中断状态须先核对 `Status`，通过明确的恢复动作续接，不重新备份已改变的数据或撤销已经开放写入的成功发布。

备份包含其他网站的数据。发布成功并重新开放写入后，不自动恢复历史整库备份；需要改正内容时再发一个修正包。上传文件不在数据库里，本版只接受沿用现有媒体的内容包，新增或替换媒体在导入前拒绝。

## 开发入口

- [production.ps1](../scripts/production.ps1) 按连接配置选择网站、传输目录和回执主体，不通过替换网站名绕过服务器登记。
- `PackageContent` 使用 `ContentPath`、`ContentPrereleasePath`、`CandidateMetadataPath`、`OutputPath` 四个参数。等价 Python 工具为 [prepare_content_candidate.py](../scripts/production/prepare_content_candidate.py)。输出目录必须尚不存在；工具不生成测试通过证明。
- 内容包 `d16-content-package-v1` 的记录只有 `pageId` 和 `content`，不接收数据库 ID、metadata 名、SQL 或可执行脚本。现有 `tio2-my` 页面由安装的 PHP 注册表定位；新网站需要自己的已验证内容合同。
- 预发布回执绑定网站、代码版本、前台 Build、内容哈希和测试 runId。候选还绑定当前配置、CMS 合同及上次生产回执。
- `Publish` 内部固定动作使用 `Prepare → Backup → Stage → Activate → Verify → Verify`。第一次 Verify 完成实际验证和开放写入，第二次封存完成回执；这些低层动作保留作诊断及明确恢复入口，日常不需要逐条执行。内容发布不强制重复无关的表单邮件测试。
- 中断后先 Status。仍在暂停写入窗口内时，显式 Rollback 使用同一备份恢复。若已发布/已恢复且窗口已关闭，只核对持久化证据并补记回执，不重新写数据库。

客户端支持按登记配置选择网站，不代表所有网站已经安装内容适配器。旧兼容事务保持原有约束；MY 新候选接入和内容运行环境的管理员安装见[安装与发布衔接](production-installation.md)。这不表示任意新网站都已完成前台部署。

## CMS 与前台内容读取

既有内容发布路径仍按其[可编辑文本路径](../wordpress/plugins/tio2-site-model/includes/content-release-paths.json)及各自写入合同校验，不能据此推断所有 MY 页面在前台读取时均已脱离批准文案。2026-09-13 完成的首个读取纵向切片仅覆盖 `tio2-my` 三个法律页：独立的 PHP/TypeScript 读取合同验证已发布 CMS 记录后，将实际法律正文与 SEO 文本送到页面；原有 seed、导入和发布写入审批校验保持不变。身份、路径、结构、Markdown 安全、路由及索引控制仍受技术约束。其他 MY 页面族仍待逐族审查与迁移；详见[法律页读取回执](verification/cms-read-decoupling-legal.md)。

增加字段、调整页面结构或修改受保护合同仍属于开发任务。适用业务批准要求不会因技术校验通过而消失。

2026-09-13 已批准的[职责划分](superpowers/specs/2026-09-13-cms-frontend-build-responsibilities-design.md)要求后续按技术契约读取 CMS 内容，将审批证据、功能配置和显示内容分离，打通正文、SEO 与缓存刷新。支持结构内的内容变化不再依赖代码内旧批准稿相等；新增不支持的结构仍需开发，身份、安全、披露和授权检查继续保留。此为分批整改目标，不是本页所述发布工具或生产安装已经升级的证明。

其他页面族仍存在批准快照与静态 SEO 绑定，具体差距见[审计](verification/2026-09-13-tio2-my-content-coupling-audit.md)；上述法律页切片不代表全站解耦。

该职责调整不改变内容包审批、生产维护窗口、备份所有权或失败恢复规则；刷新接口应答不代替实际页面输出新内容的证据。

### HOME-001 / APP-000 的本地写入切片（2026-09-14）

本批 `tio2-my` 首页和应用中心已有独立技术读/写校验；正文、可编辑 SEO 与页面输出共用实际 CMS 内容。原首页 3→4 条摘要的裸 `update_post_meta` 在隔离 CMS 中失败，历史现场与后续合成批准运行分别见[W3-A1 验证记录](verification/2026-09-14-cms-decoupling-w3-a1.md)。现在的普通受控写入只接受固定 HOME-001/APP-000、准确前后完整 JSON 摘要、`update-published`/`publish-draft` 操作及有效批准证明；草稿可按技术规则保存，但不能因技术合法而自动公开。批量导入对这两页使用同一技术/批准边界，其他 24 个已登记 MY 内容族仍使用原 validator，A/B 不继承本批放宽。

批准证明由安装配置 `TIO2_CONTENT_APPROVAL_ROOT` 的受保护根目录按严格 ID 读取，需独立登记真实人工批准来源；`TIO2_CONTENT_ENVIRONMENT_ID` 独立匹配目标环境，非 root 的 `TIO2_CONTENT_WRITER_UID` 标识 WordPress 写身份，不由 CLI 有效 UID 推断。POSIX 下证明文件及所有父目录须 root 拥有、非组/其他可写且无符号链接；无法验证权限即拒绝。包内 `approved=true`、测试 PASS、packageId/reviewId 或内容哈希均不授予业务批准；测试仅使用一次性只读挂载的合成证明。普通公开写入还核对实际 WordPress 用户的目标编辑/发布 capability、当前版本与提交前再次有效的证明。缺少独立根/环境配置时本批公开改动失败关闭，不影响读取或未迁移页面族。

普通 WordPress `wp_insert_post`/`wp_update_post`、REST/ACF/meta 入口与正常 cron 公开化有前置守卫；既有 MY future 记录也须在 cron 触发低层发布前拒绝。特权自定义 PHP 直接调用核心低层 `wp_publish_post`（其 SQL 先于钩子且无 capability 门）、直接 SQL，以及拥有 root/数据库特权的操作不在普通守卫保证内；不得把它概括成所有 WordPress API 或数据库写入均受拦截。普通事务对无法证明缓存隔离的外部持久化 object cache 安装失败关闭并恢复请求内原缓存状态；本次没有修改此类安装。

提交前失败（技术/批准/身份/版本/锁/回读或收据持久化）保留原内容与状态并回滚；提交后的签名通知失败或状态持久化不确定保留已提交内容，以受权限限制的原收据仅重试通知，不重写正文。接收应答、实际缓存失效与页面已显示新版本分别核对。批量 SQL 路径保持维护入口、数据库只读围栏、整库备份、事务和一次批量刷新；在维护窗口内导入/回读/页面验证失败按同一所有权备份整库恢复，窗口关闭且后续写入开放后不得自动回滚历史备份，应以新的修正包处理。Task 4 的目标 posts/meta 快照只覆盖所选记录及其元数据观察，不包括 `post_modified_gmt` 等全部 post 字段、meta 行 ID 或 scope 关系；不能把该局部快照称为整库或完整记录不变证明。整库恢复另以 Task 5 的实际数据库演练和页面读回为依据。

新批准内容摘要与旧 `d16-content-package-v1` 内容包摘要是两个格式域。新摘要的 PHP/Python 共享向量允许字面 U+2028/U+2029；旧包传输遇这两个分隔符仍可能因既有两端 canonical 差异而拒绝，隔离导入测试观察到拒绝且目标 posts/meta 未变，详见[导入器说明](../wordpress/release/README.md)。本批不偷偷升级旧包格式。两次本地真实页面验收不等于生产批准、安装、发布或所有 CMS 页面族完成；`content-only` 仍为 `not-installed`。

## 生产安装边界

本次开发不执行生产安装。服务器的 `content-only` 登记保持 `not-installed`，直到完成对应安装与验收。

需要登记实际容器、数据库凭据、只读导入器和网站身份，并安装维护、缓存刷新及实际页面验证程序。[MY 安装程序](production-installation.md)负责当前已批准拓扑的这些资源；通用程序安装不等于所有站点的内容能力已经启用。缺失时内容发布拒绝执行。准确配置与接口见 [WordPress 内容发布说明](../wordpress/release/README.md)。

维护/验证程序必须操作真实环境：后台写入被数据库阻止，目标站维护期间保留内部验证入口；缓存通知必须签名，页面检查必须读取真实正文、状态、SEO 和 sitemap。仅返回成功标志或缓存接口应答不算通过。

开发验证包括两条真实链路：隔离 MariaDB/WordPress 演练整库恢复、重启写入封锁及恢复中断；另外克隆本地预发布数据到独立容器，使用真实 WPGraphQL 构建并启动 Next，验证 HOME 内容导入前后的缓存、页面、SEO、sitemap 和失败恢复。后者复用同一 Build 和进程；公开文本探针无法验证的自定义包会失败，不能当作任意字段都已完成浏览器验收。

生产环境的维护入口、权限安装、服务器资源以及真实目标站全站预发布/生产验收仍需单独完成。这次本地演练不改写网站登记中的生产能力状态。
