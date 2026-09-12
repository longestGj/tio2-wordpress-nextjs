# 内容发布：整库备份与本次失败恢复

本页对应用户批准的[最小改动方案](superpowers/specs/2026-09-12-minimal-content-release-design.md)。共享 WordPress 和数据库，前台继续按 `SITE_ID` 运行；不增加网站独立数据库或内容版本指针。

## 操作模型

1. 准备指定网站的内容包及该包的预发布通过回执。
2. 暂停共享 CMS 写入，对整个数据库做一次备份。
3. 导入本次网站内容，刷新缓存，检查实际页面。
4. 验证成功后开放写入并记录回执；失败则在写入仍暂停时恢复本次整库备份，验证后开放。

备份包含其他网站的数据。发布成功并重新开放写入后，不自动恢复历史整库备份；需要改正内容时再发一个修正包。上传文件不在数据库里，本版只接受沿用现有媒体的内容包，新增或替换媒体在导入前拒绝。

## 开发入口

- [production.ps1](../scripts/production.ps1) 按连接配置选择网站、传输目录和回执主体，不通过替换网站名绕过服务器登记。
- `PackageContent` 使用 `ContentPath`、`ContentPrereleasePath`、`CandidateMetadataPath`、`OutputPath` 四个参数。等价 Python 工具为 [prepare_content_candidate.py](../scripts/production/prepare_content_candidate.py)。输出目录必须尚不存在；工具不生成测试通过证明。
- 内容包 `d16-content-package-v1` 的记录只有 `pageId` 和 `content`，不接收数据库 ID、metadata 名、SQL 或可执行脚本。现有 `tio2-my` 页面由安装的 PHP 注册表定位；新网站需要自己的已验证内容合同。
- 预发布回执绑定网站、代码版本、前台 Build、内容哈希和测试 runId。候选还绑定当前配置、CMS 合同及上次生产回执。
- 固定动作使用 `Prepare → Backup → Stage → Activate → Verify → Verify`。第一次 Verify 完成实际验证和开放写入，第二次封存完成回执；内容发布不强制重复无关的表单邮件测试。
- 中断后先 Status。仍在暂停写入窗口内时，显式 Rollback 使用同一备份恢复。若已发布/已恢复且窗口已关闭，只核对持久化证据并补记回执，不重新写数据库。

客户端支持按登记配置选择网站，不代表所有网站已经安装内容适配器。旧前台发布仍受已验证兼容事务约束；本次没有实现任意新网站的前台部署。

## CMS 与前台内容读取

既有页面的文本不再必须等于打包进代码的完整 JSON。PHP 与 TypeScript 使用同一份[可编辑文本路径](../wordpress/plugins/tio2-site-model/includes/content-release-paths.json)，将通过校验的 CMS 值交给页面和 SEO 输出。身份、结构、URL、媒体引用、枚举、证据状态和受保护字段继续校验。HTML/Markdown 文本变化也必须保持允许的结构和安全约束。

增加字段、调整页面结构或修改受保护合同仍属于开发任务。适用业务批准要求不会因技术校验通过而消失。

## 生产安装边界

本次开发不执行生产安装。服务器的 `content-only` 登记保持 `not-installed`，直到完成对应安装与验收。

需要登记实际容器、数据库凭据、只读导入器和网站身份，并安装维护、缓存刷新及实际页面验证程序。当前通用安装器不会自动创建这些环境资源，也没有可直接套用所有网站的维护/验证程序。缺失时内容发布拒绝执行。准确配置与接口见 [WordPress 内容发布说明](../wordpress/release/README.md)。

维护/验证程序必须操作真实环境：后台写入被数据库阻止，目标站维护期间保留内部验证入口；缓存通知必须签名，页面检查必须读取真实正文、状态、SEO 和 sitemap。仅返回成功标志或缓存接口应答不算通过。

开发验证使用隔离的真实 MariaDB/WordPress 证明整库导入与恢复；另用同一 Next 开发进程和受控 GraphQL 输入验证文本/SEO 更新及恢复。后者是前台集成测试，不代替生产构建、真实 CMS 到 Next 全链路预发布或生产安装验收。
