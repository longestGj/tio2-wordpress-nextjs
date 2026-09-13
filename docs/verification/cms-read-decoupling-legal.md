# TiO₂ Malaysia 法律页 CMS 读取解耦：首阶段技术回执

验证日期：2026-09-13。网站 `tio2-my`；范围仅 `/privacy-policy/`、`/ms/privacy-policy/`、`/cookie-policy/`。分支 `codex/cms-read-approval-decoupling`，Task 3 初版代码提交 `6164e048e651f00b083399b56880607e64a95cf4`、复审修正代码/最终运行提交 `2f9a30b73cff407523492a26104c6932b03c44c8`；Task 3 起点 `3d8320133f5f2fbab68b2c0becda097403fb64c2`。这是隔离本地开发验证，不是策划侧独立验收、全站迁移、预发布、生产安装或部署。

## 结果与边界

- PHP 法律页 resolver 与 TypeScript DTO 使用独立读取合同，接受安全的已发布 CMS 法律文案；原 seed、导入和发布写入批准校验未改。Task 1/2 的先行实现见提交 `f2a30031..3d832013`。
- Task 3 渲染直接输出 CMS H1、日期、分节、正文；修复 `###` 后紧邻正文原先被静默丢弃的情况。法律页 metadata 输出 CMS SEO 标题与描述，同时保留出版策略产生的 robots、canonical、hreflang、OpenGraph/Twitter 其他属性。未改批准业务文案、路由、缓存、索引或 Analytics 配置。
- TDD RED：新增测试最初观察到 metadata 返回静态批准标题，且 H3 后的 `Published body.` 未出现。最小修复后聚焦 20/20 通过。旧批准 JSON/哈希测试仍作为种子历史验证，不充当运行时读取准入条件。
- 复审修正补了变更 CMS 标题、描述及三种有效日期的序列化 JSON-LD 断言；把真实法律路由 fixture 构建目录改为每次运行独占，固定模板中的 `public`、`.next` 和 Next 生成文件不再被运行或清理修改。清理步骤分别尝试并聚合错误；无法安全停止服务或释放租约时保留运行目录。浏览器日志只容许明确的 fixture 首页预取 404，其余错误令测试失败。模拟测试先显示原所有权/清理/诊断缺口 3/3 RED，修正后 GREEN；JSON-LD 断言对临时静态日期突变产生 RED，恢复真实 builder 后 GREEN。
- 最终定向命令：`npx vitest run tests/unit/legal tests/integration/legal tests/infrastructure/legal-read-contract.test.ts tests/infrastructure/tio2-my-legal-pages-wordpress.test.ts tests/infrastructure/legal-read-runtime-fixture.test.ts tests/infrastructure/wordpress-test-compose.test.ts tests/infrastructure/wordpress-runtime-classification.test.ts tests/unit/analytics/malaysia-ga4.test.tsx tests/unit/rfq/malaysia-rfq-analytics.test.ts` → 223 通过，1 个显式门控的本地运行测试跳过；`npm run typecheck` → 通过。门控测试另以 `LEGAL_READ_LOCAL_RUNTIME=1` 实际运行 → 1/1 通过。

## 真实隔离本地链路

最终提交绑定运行 ID `legal-read-e902db4b-0f7f-4396-a12c-cdd320b7a620`。新建独立 WordPress/MariaDB Compose 项目 `d16-test-legal-read-e902db4b-0f7f-4396-a12c-cdd320-8ba533bfb38c`，GraphQL 端点 `http://127.0.0.1:32788/graphql`；Next 端点 `http://127.0.0.1:32100`，租约 `1ea44672-0828-491e-8331-810b77a2acf4`。全部端点仅本次运行有效，完成后均已停止。WordPress 安装使用合成账号、`--skip-email`；回调指向未开放的随机 loopback 地址 `http://127.0.0.1:63876`，未发送真实邮件或表单。WPGraphQL 是安装在该独立 WordPress 上的真实插件，不是 GraphQL mock。

在原批准 seed 上，仅对该独立项目的三条法律记录写入合成新 H1、H3 后紧邻正文、日期和 SEO 文本。真实 WPGraphQL 返回改动值；使用真实查询、DTO、组件、SEO 与布局的法律页专用、每运行独占的 Next fixture 做优化构建，Build ID `Q-9vMP1WH0rVqdY937AlM`。构建日志证明三条目标路由静态预渲染并保持 1 小时 revalidate。此为代表性的**法律目标路由 production-mode build**，不是整站 Build 或生产 Build；实际运行时仍依赖 CMS 构建读取，未宣称脱离 CMS 构建。

浏览器在三页桌面 1440×1000 与手机 390×844 检查 CMS H1、H3 后正文、meta description/title、`noindex, nofollow`、语言、分节锚点；手机 Cookie Settings 弹窗可打开、关闭及返回触发按钮，未写入选择。此合成环境没有公开 Analytics 配置，因此弹窗按既有 gate 显示 `Cookie settings` / `Optional Analytics is not active`；活跃配置的同意管理回归由单元测试覆盖，未在本地开启 Analytics。仅目标路由的 fixture 没有首页，记录了数次同类首页 `_rsc` 预取 404；实际断言排除这些明确项后无其他浏览器错误。马来文布局的 8px 外边距来自既有生产布局，未在本任务改动。

原始证据保存在工作区忽略且非 SDD 临时目录：`D:/16Wordpress_nextjs/.worktrees/fix-analytics-config-update/.local-evidence/cms-read-decoupling-legal/legal-read-e902db4b-0f7f-4396-a12c-cdd320b7a620/`。其中 `runtime-evidence.json` 绑定提交/Build/项目/端点/截图；`target-route-build.log`、`next-runtime.log`、`browser-diagnostics.log`、`cleanup-evidence.json` 保留构建、运行与清理证据；`privacy-en-*`、`privacy-ms-*`、`cookie-en-*` 各有桌面/手机全页及首屏截图，另有 `cookie-en-mobile-consent-dialog.png`。执行者已查看最终英文/马来文手机首屏和弹窗；控制者复核了最终英文隐私手机、马来文隐私桌面及 Cookie 弹窗，并核对清理记录；上一版六页桌面/手机截图亦已由双方查看。最终清理记录显示 Next 停止、租约释放、WordPress 停止、每运行独占的临时构建/公共资源 junction/合成环境移除，固定模板未被清理。

## 未决与后续

- 独立代码复审仍待控制者完成；本回执不是复审结论，也没有 develop/main 合并或部署。
- MY 其余读取族尚未迁移：首页、应用、关于、联系、产品及详情、市场、文档、资源、编辑内容与表单页。下一组须先核对各自 PHP 读取/写入调用者、TS DTO、渲染/SEO 与技术字段；发现清单见本轮 SDD `remaining-read-consumers.md`。不能把法律页合同套用全站。
- Task 1 已记录的安全代码字面量中 `[label](` 被链接扫描保守误拒，是待独立处理的范围外兼容性观察；本次合成/已批准法律内容没有触发，未扩展解析器或 PHP/TS 对等规则。
- WP 插件安装初试遇到独立卷内 WP-CLI/Web 用户差异；在所有权校验过的隔离 helper 中加入固定 Web 用户调用后成功。失败属于夹具搭建，不是生产故障或共享环境变更。
