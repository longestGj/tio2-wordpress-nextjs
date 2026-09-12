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

客户端支持按登记配置选择网站，不代表所有网站已经安装内容适配器。旧前台发布仍受已验证兼容事务约束；本次没有实现任意新网站的前台部署。

## CMS 与前台内容读取

既有页面的文本不再必须等于打包进代码的完整 JSON。PHP 与 TypeScript 使用同一份[可编辑文本路径](../wordpress/plugins/tio2-site-model/includes/content-release-paths.json)，将通过校验的 CMS 值交给页面和 SEO 输出。身份、结构、URL、媒体引用、枚举、证据状态和受保护字段继续校验。HTML/Markdown 文本变化也必须保持允许的结构和安全约束。

增加字段、调整页面结构或修改受保护合同仍属于开发任务。适用业务批准要求不会因技术校验通过而消失。

## 生产安装边界

本次开发不执行生产安装。服务器的 `content-only` 登记保持 `not-installed`，直到完成对应安装与验收。

需要登记实际容器、数据库凭据、只读导入器和网站身份，并安装维护、缓存刷新及实际页面验证程序。当前通用安装器不会自动创建这些环境资源，也没有可直接套用所有网站的维护/验证程序。缺失时内容发布拒绝执行。准确配置与接口见 [WordPress 内容发布说明](../wordpress/release/README.md)。

维护/验证程序必须操作真实环境：后台写入被数据库阻止，目标站维护期间保留内部验证入口；缓存通知必须签名，页面检查必须读取真实正文、状态、SEO 和 sitemap。仅返回成功标志或缓存接口应答不算通过。

开发验证包括两条真实链路：隔离 MariaDB/WordPress 演练整库恢复、重启写入封锁及恢复中断；另外克隆本地预发布数据到独立容器，使用真实 WPGraphQL 构建并启动 Next，验证 HOME 内容导入前后的缓存、页面、SEO、sitemap 和失败恢复。后者复用同一 Build 和进程；公开文本探针无法验证的自定义包会失败，不能当作任意字段都已完成浏览器验收。

生产环境的维护入口、权限安装、服务器资源以及真实目标站全站预发布/生产验收仍需单独完成。这次本地演练不改写网站登记中的生产能力状态。
