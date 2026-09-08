# Poland E02/E03 补证回执 V0.3

2026-09-07；回应 D23 `PL-G9-RECHECK-02`、Manifest V0.23。**补正 E03 图像证据并收窄 E02 当前环境关联缺口，交 D23 独立判断；不签 Gate 9 整体通过。** 未修改页面、共享样式或 receiver 生产代码，F01/F02 和已接收 E01 不重复返修。

## 同一运行身份与历史保留

Malaysia `http://127.0.0.1:3015/markets/poland/`，`.next-poland-g9` / Build `GjJdupnweqs0MK5nxZvnV`；基础提交 `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb` 加 V0.2 的 51 文件实现组合。新增一个定向测试 `tests/e2e/poland-g9-native-zoom-v03.spec.ts` 和本目录证据；没有重建、切服、CMS 修改或对外提交。

[补证身份快照](SUPPLEMENT_IDENTITY.json)逐项核对原 51 文件及 V0.2 证据库存，并记录新增测试哈希。原两张问题图、原测试源码和原 JSON 均保留。V0.2“测试通过”的运行事实不改变，但其图像不能支持完整视觉可读性；**撤回把那组旧图作为 200% 完整视觉通过证明的解释，改用本目录原始图与检查记录。** 旧 `poland-g9-native-zoom.spec.ts` 仅供历史复现，不作为新验收入口；本轮只运行 V03 测试，避免覆盖旧证据。

## E03：诊断、修正与结果

在同一个原生 `chrome.tabs.setZoom(2)` 浏览器会话，分别调用旧 Playwright 截图和原始 CDP compositor 截图，复现以下结果，见 [诊断 ledger](zoom-diagnostic/ledger.json)。

| 同一状态 | 旧方法 | 原始 compositor 画面 |
|---|---|---|
| 页面顶端 | 712×452，右半边未被捕获 | 1424×905，完整可读 |
| 菜单 | 712×452，宽度不全 | 1424×905，完整视口 |
| Cookie | 712×452，RGB 全部 255，纯白 | 1424×905，Cookie 正常显示 |

当前安装 Playwright 的 `node_modules/playwright-core/lib/coreBundle.js` 约 37182–37199 行显示：截图封装把 CSS viewport 尺寸与 legacy `visualViewport` 坐标组合进 clip。在这个 native zoom 会话中，两类坐标缩放不同；`Page.getLayoutMetrics` 的 legacy layout 宽 1424、CSS layout 宽 712，滚动位置也有 2 倍差异。直接比较表明旧 clip 对当前运行产生半宽/离屏采集。此为本机版本与本次会话的诊断，不推广为所有版本缺陷，也不把纯白图认定为页面纯白。

V03 使用 `Page.captureScreenshot` 的原始 PNG：视口截图不传 clip；全页截图使用浏览器返回的 rendered `contentSize`。无图片裁剪、拼接、修补、CSS zoom、页面缩放模拟或 viewport resize。Sharp 仅读取 PNG 尺寸/像素统计，不改变图像。

- 原生 zoom 保持 2；外窗口 1440×1000 不变；CSS viewport 1424×905 → 712×452；DPR 1→2；每张图采集前后核对 zoom 与页面几何不变。
- [完整页面](native-zoom/page-native-200-full.png) 1424×6101，五模块至 Footer 完整；另有九张带重叠区域的原始视口图覆盖文档全部纵向范围，不依赖全页截图单独证明。
- [菜单顶部](native-zoom/menu-native-200-top.png)、[菜单底部](native-zoom/menu-native-200-bottom.png)均 1424×905。452 CSS px 高视口容纳不下菜单全部内容时，菜单自身可滚动，末尾 RFQ 完整进入视口；这是滚动前后两状态，不声称在单一画面中同时展示完整菜单。
- [Cookie](native-zoom/cookie-native-200.png) 1424×905，标题、全文、Close 和 Read Cookie Policy 完整可见；各元素边界均处于实际视口内。
- 全页正文与 Footer 文本 Range 行边界无横向越界。菜单初始 Close，反向到顶部 RFQ、末尾 RFQ，前向返回，Escape 回 Menu；Cookie 初始 Close、首尾循环、Escape 回 Cookie Settings 均运行核验。
- [逐图尺寸、哈希、像素极值、DOM 几何和焦点记录](native-zoom/evidence.json)、[真实测试结果](native-zoom/test-results.json)。新增测试 1 项通过；ESLint、TypeScript 通过。

根代理已实际打开完整页、Cookie、菜单底部图；独立只读代码审查者另看完整页、Cookie、菜单上下状态和两张视口图，核对 13 张 PNG 哈希及九帧覆盖，无采集方法阻断问题。该代码/证据审查不是 D23 的独立复验。

**焦点观察边界：** 菜单末尾 RFQ 的 DOM 焦点与键盘可达已证明，但其既有 `#008078` 内侧 outline 与按钮底色相同，截图无法显示可区分的焦点环。本轮不声称所有控件的可见焦点全面通过；记录给共享 owner/D23 判断，不擅自重开或修改已关闭 F02。Close 的可见焦点图正常。真机、其他引擎、屏幕阅读器和浏览器工具栏截图仍未验证。

## E02：补齐的关联和未决项

[环境关联报告](RECEIVER_ENVIRONMENT_ASSOCIATION.md)及[脱敏机器记录](receiver-environment-association.json)证明：当前本地配置的路由值与 GET 实际送达的 RFQ HTML/RSC、DOC 客户端构建内值相同；两页同一 Build ID、各 13 项资源与构建文件相等。只保存指纹、路径与相等性，不保存原始路由值、账户凭据或邮箱地址。

这解决“当前本地配置是否真正被运行版本消费”的问题；**不能证明旧 DOC 测试用的是同一个值，也不能证明当前 provider 账户归属、RFQ 服务商接收或最终收件。** DOC 历史一次接受保留，旧发送授权已用完。本轮没有 POST、真实发送或邮箱读取。

后续路径已在报告列出：接收 owner 给出当前路由指纹与批准账户/目的地的只读绑定证明；核对历史 DOC 邮箱记录；若 RFQ 仍需实发，先准备准确版本、标记清楚的单次测试 payload，再取得对应一次发送授权，禁止自动重试。DOC 不搭用 RFQ 授权或重复使用旧额度。当前没有把这些外部条件写成已满足。

## 交回范围

请 D23 定向复验 E03 新原图及几何/焦点记录，并依 E02 新环境关联收窄未决条件。Applications 按原开发任务继续；不变更业务事实、Gate 10、发布、DNS 或索引。本会话当前未提供 `send_message_to_thread` 工具；文件可展示在 D23 会话面板，但这不等于已发送消息或已接单。
