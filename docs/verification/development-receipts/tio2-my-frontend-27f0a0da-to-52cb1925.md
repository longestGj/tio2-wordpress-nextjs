# TiO₂ Malaysia 前台历史交付机器回执补录

日期：2026-09-13。用户在发布因机器回执缺失暂停后要求“下一步”；本轮按开发侧补齐真实可追溯记录，既有发布分支和失败回执保留，不在那里修改实现。

## 本记录的含义

机器输入：[tio2-my-frontend-27f0a0da-to-52cb1925.json](tio2-my-frontend-27f0a0da-to-52cb1925.json)。逐路径实现来源：[provenance](tio2-my-frontend-27f0a0da-to-52cb1925.provenance.json)。只把已经合入 develop 的前台交付映射成现有打包合同，**不是重新批准内容、重新运行历史测试或宣称发布完成**。

- 活动前台基线：`27f0a0da59df1e54cd01eab7d77eb7024b338d42`。
- 已整合 develop：`52cb192545fd83c31453c64df4799ba725472411`，即机器记录的 mergeCommit；这是组合版本，不伪称单个业务合并提交。
- 比较范围与打包器一致：app/components/lib/public/sites 及其固定顶层运行文件。差异为 91 个路径，无额外或遗漏路径；provenance 为每个路径列出该区间内所有触及它的提交。
- 机器记录的 `subjects` / `affectedConsumers` 描述本次仅部署 tio2-my 前台的范围，不把共享实现的其他消费者从历史记录抹除。尤其 revalidate 的共享代码原有其他站点分支仍存在；这里不声明其他站点已部署或获得新的验收。
- `cmsContractChanged=false`、空 contentScopes/hostPaths 只描述本机器输入覆盖的**前台子集**。原内容发布交付同时修改过 CMS、主机程序及整库备份规则，那些变化不在这 91 个路径中，仍保留原回执。本次打包必须另外证明候选完整插件树等于已安装 CMS；尚未用本记录替代该证明。
- 本目录 `.gitattributes` 仅固定 JSON 为 LF，确保 Windows checkout 字节与冻结 Git 一致；不改仓库根属性或运行文件。

## 已核对的原交付依据

| 路径来源提交 | 原交付与合入依据 |
|---|---|
| 9a98071b、25f7e89d、5e4cf270、c91f5a9e | [七页首屏 develop 集成回执](../root-page-hero-seven/DEVELOP_INTEGRATION_RECEIPT_V1.0.md)：独立 Gate9 接受 c91f5a9e，aa83920f2ab6cd378d04bcf405c861ecab80aaaf 准确合入，32 项单元、21 项 E2E 和构建记录；这是历史结果。 |
| 21df958e、ac28c7f8 | [最小内容发布开发回执](../2026-09-12-minimal-content-release-development.md)：73df4a50774d080bd1dd32848a148cf102ff2221 快进合入，独立复审，真实 CMS→Next 及签名刷新验证。当前只投影已交付的前台 DTO/SEO/刷新路径，不授权再次写共享数据库。 |
| e0fa4fd1、b3e75568、30e02631、f61fb259 | [SEO/产品组合回执](../production-release-system/development/2026-09-13-seo-product-route-integration.md)及 [GA4 最终返修交接](../tio2-my-ga4-g9-return1-20260913/gate8_return1_handoff_receipt.md)。独立策划侧集成记录 `D:/23MySec/docs/architecture/TIO2_MY_GA4_ACTIVE_LOCAL_DEVELOP_INTEGRATION_V1.0.md` 已只读核对：Gate9 PASS、source 243d7546、implementation f61fb259、merge 0a379d232dbc228b4ade3243531061d56af4bd91、合并后 104 测试和类型检查。该记录不授权 GTM 发布、DNS 或索引，本轮亦不执行这些动作。 |
| 1f6f4633 | [Trade 预发布修复回执](../production-release-system/development/2026-09-13-prerelease-trade-upgrade.md)：独立复审及归档哈希核验记录；本机器回执仅列 `.gitattributes` 中已交付的单条 Trade seed LF 固定，不包含 seed/CMS 写入。 |

上述全部来源与相应集成提交均为冻结 develop 的祖先；没有从未合入分支借用实现。

## 当前生产身份观察及限制

通过项目固定 `production.ps1 -Operation Status` 与既有受核验连接只读查询，持久状态为 ROLLED_BACK，recoveryRequired=false，details.active.commit 为上述基线。原事务 sourceCommit 为 8bf2a3d437b0582ef0ce193b69478622e26419af，**它是已回退候选，不是活动版本**。

本机原始状态保留在忽略目录 `D:/16Wordpress_nextjs/.production/observations/frontend-receipts-20260913/status.json`，SHA-256：`1811482d752f4c44b2d8f6b44dbc8b8ec914264a2d690202c6a468308c5c5d5b`。状态查询不重新验证全部在线资源，因此此基线仅用于准确追溯路径；正式打包仍需独立管理员实时 baseline、CMS/配置身份和独立回传哈希，Prepare 仍重新观察并拒绝漂移。

本次未改 main、未重启预发布、未安装 CMS、未发送表单、未激活前台。此前用户新批次三张表单各一次的授权尚未执行。原始测试/收件/生产回执未改写。

## 补录验证

待冻结补录提交后，使用现有 `package_frontend.development_evidence` 实际读取已提交 JSON，与生产基线到候选差异精确比对，并独立复审。补录本身只有文档/机器输入变化，不重复声称运行网站构建或完整发布验收。
