# Poland 开发与本地 HTTP 测试回执

日期：2026-09-07。当前状态：**Poland 本页核心实现与本地 HTTP 测试通过；共享 Applications 目标未就绪，完整 Gate 9 验收及发布仍待后续处理。**

授权：用户已在 D23 批准 Poland 效果，并明确要求开发及直接测试。来源继续锁定 PL-G6-DELIVERY-01、B V0.2、C V0.4 与 Gate 5 批准视觉；未修改 D23 Manifest 或批准记录。

## 实现版本与访问

| 项目 | 值 |
|---|---|
| 网站 / 页面 / 语言 | `tio2-my` / `MARKET-EU-PL` / `en` |
| 本地预览 | http://127.0.0.1:3015/markets/poland/ |
| canonical | `https://tio2malaysia.com/markets/poland/` |
| 分支 / 基础 commit | `codex/poland-development` / `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb` |
| 当前代码 | 未提交工作区；[逐文件实现快照](IMPLEMENTATION_SNAPSHOT.json)，不得以基础 commit 冒充本次实现 |
| 当前构建 | `.next-poland-http`；Build ID 见实现快照；用户已启动新版，未停止用户进程 |
| 本地 WordPress | `http://localhost:8080/graphql`；记录 ID `18515` |
| CMS 身份 | CPT `tio2_market_page`；slug `tio2-my-market-poland`；唯一 scope `tio2-my`；public_path `/markets/poland` |
| 正文 meta / API | `_tio2_my_poland_market_contract_json` / `malaysiaPolandMarketRecordJson` |

本地记录为 `publish`，仅用于开发环境；未部署、未开放索引、未进行真实表单发送、未运行 `verify:root-only`。启动命令仍受工具自动审批限制，用户已手动启动，因此先前“无可访问环境”的阻塞现已解除。

## 实现范围

五个模块 PL-01…PL-05、完整批准正文、两列应用语境、七个动作及四级面包屑从真实 CMS 进入严格 DTO，再由 Next.js 渲染。PHP 与 DTO 校验固定站点、路径、模块结构和链接；缺失、错误 scope、未发布、重复记录及非法内容拒绝返回，无本地正文 fallback。后台编辑具有 capability/nonce/归属检查，种子脚本支持本地 Plan/Apply 与失败回滚。

页面入口是 `app/(en)/markets/poland/page.tsx`，专属组件为 `components/sites/tio2-my/markets/malaysia-poland-market-page.tsx`。不新增 FAQ、表格、页面内表单、媒体、型号推荐或目的国自动预填。RFQ 未知型号单选与 Request Documents 必选单型号/多文件选择保持原有接收方规则。

Header/Footer/Logo/Menu/Consent 复用既有共享组件。修复三项集成问题：PHP/DTO Unicode 首尾空白规则一致；仅本页消除默认 8px canvas 外边距；Cookie 使用原生模态以实现背景隔离、滚动锁定与焦点恢复。真实 HTTP 测试另发现共享 robots 入口位于路由组内而未被当前 Next 识别；新增根级 `app/robots.ts` 复用原政策，修复 404，未改变索引授权逻辑。

## 当前测试结果

| 检查 | 结果与证据 |
|---|---|
| Malaysia 单站构建 | 通过，当前 `.next-poland-http` 包含 `/robots.txt` 和 Poland；TypeScript、改动文件 ESLint 通过 |
| 定向单元/集成 | 前轮 11 文件 105 项通过；本轮受影响的 SEO/路由/cache 20 项及 crawler 7 项通过 |
| PHP webhook 回归 | EU/UK 40 个隔离案例通过；Poland runtime 覆盖权限、非法记录、scope、回滚等 |
| 真实浏览器 | 8 项通过：HTTP 初始正文/SEO、robots、三端布局/axe/菜单/Cookie/focus/hover、重排、导航/表单基数、Home/UK/Privacy Cookie 回归 |
| 真实 CMS→HTTP 缓存 | 1 项通过：编辑正文→签名失效→HTTP 可见→原文及缓存恢复；见 [缓存证据](runtime/live-cache.json) |
| 实际 scope 负向 | 错误站点签名刷新请求返回 400；只刷新 Poland route/content 两个标签。A/B 本路由在查询前拒绝已有模块测试，尚未运行 A/B 独立 HTTP 服务 |
| URL / SEO | 无斜杠 308、规范路径 200、query 不改变 title/description/canonical、en、仅 WebPage/BreadcrumbList、noindex/nofollow、sitemap 不含 Poland |
| robots | 新版 HTTP 200、text/plain、`Disallow: /`；见 [浏览器矩阵](runtime/browser-matrix.json) |
| 全导航 HTTP | 13 个唯一目标中 12 个 200；共享 `/applications/` 404。见 [导航清单](runtime/navigation-http.json) |
| 来源冻结 | 4 个主要源文件及 14 张批准 PNG 哈希一致，见 [来源复核](IMPLEMENTATION_SOURCE_RECHECK.json) |

真实测试全页截图：[1440](runtime/poland-1440.png)、[768](runtime/poland-768.png)、[390](runtime/poland-390.png)。同目录包含焦点、悬停、菜单、Cookie 与 720/320 重排截图。此前 [离线矩阵](offline-build/browser-matrix.json) 和 [CMS 探针](live-cms-probe.json) 保留为早期证据；当前 HTTP 证据以 runtime 为准。

## 验收与发布开放项

| 范围 | 当前结论 |
|---|---|
| PL-G9-01/02/07 | 本页真实数据链、初始 HTML、三端与 SEO 核心自检通过；D23 尚未独立验收 |
| PL-G9-03/09 | 菜单/Cookie 实际键盘行为通过。当前共享 owner 的 Arial、1280px Header、900px 菜单断点、白色全屏菜单及 Footer/Cookie 外观与策划 HTML 适配层存在差异；未复制适配层覆盖共享组件，需 D23 核对共享版本 |
| PL-G9-04/05 | RFQ/文件申请真实入口、字段基数、无静默预填已核对；没有 provider 接收或邮箱收件新证据 |
| PL-G9-06 / PL-DEP-01 | 正文七个目标正常。共享 Applications 404 保持开放；不隐藏批准链接，不创建替代 Contact，不扩大为 Applications 开发任务 |
| PL-G9-08 | 本地禁止索引已通过；生产 robots、索引、部署配置继续由发布授权控制 |
| PL-G9-10 / PL-DEP-05 | 实际缓存、错误站点事件拒绝与模块负向通过；A/B 独立 HTTP 环境矩阵仍未测，不声称跨站 HTTP 全面通过 |
| PL-G9-11 / PL-DEP-02/03/04 | receiver、真实收件、生产账户绑定、法律/BM 复核与 Consent 生产配置仍由各 owner 提供适用证据 |
| PL-G9-12 / PL-DEP-06 | 相关回归已执行；仅 Chromium 桌面模拟。720px 为 200% 等效重排，真实 UI zoom、真机、其他引擎和屏幕阅读器未测 |

不将这些局部测试写成 Gate 9 全面通过或发布许可。Applications 未就绪与共享视觉差异应在 D23 验收中明确登记；是否需要额外设备/跨站运行覆盖按验收合同判断。

## 审查、恢复与后续

初次独立审查发现空白校验差异，已修复并测试；颜色疑问在审查者补读最终 visual-rules.css 后撤回。后续独立复审受代理额度限制未完成，不能宣称二次审查通过。

两次本地正文探针均恢复原文；最终 SHA-256 为 `6dde78992cd23eae2ae667f555c5cc31e07b611ac336b363ba39859b1bd94f4c`。恢复仅针对核实身份的 Poland 记录与快照所列文件；不得重置整个工作区，先前规则整理改动需保留。

下一步：固定实现版本及共享差异，完成独立复审，将本回执与本地预览交回 D23 只读验收；Applications/receiver 等开放项由对应 owner 处理。验收后再单独授权发布。
