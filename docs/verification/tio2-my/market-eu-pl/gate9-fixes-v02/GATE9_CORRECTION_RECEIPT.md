# Poland Gate 9 定向修复交回 V0.2

2026-09-07；`tio2-my / MARKET-EU-PL / en`。针对 D23 `PL-G9-REVIEW-01`、Gate 9 review V0.1、Manifest V0.22。**D16 本次定向技术检查通过，提交 D23 独立复验；不表示 Gate 9 整体关闭。**

## 版本与环境

当前为 `codex/poland-development`，基础提交 `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb` 加未提交工作区；不能仅以基础提交代表交付。逐文件身份见 [实现快照](IMPLEMENTATION_SNAPSHOT.json)，三站实际响应中的 Build ID 及各 12 个 JS/CSS 文件与磁盘构建逐字节哈希一致，见 [构建与运行绑定](BUILD_RUNTIME_BINDING.json)。本轮最终运行时间为 07:36–07:39 UTC（北京时间 15:36–15:39）。

| 网站 | 本地地址 | 构建目录 / Build ID |
|---|---|---|
| Malaysia | http://127.0.0.1:3015/markets/poland/ | `.next-poland-g9` / `GjJdupnweqs0MK5nxZvnV` |
| A | http://127.0.0.1:3017/ | `.next-poland-g9-a` / `2em7Cq2F5qlxEtZgH5FYw` |
| B | http://127.0.0.1:3018/ | `.next-poland-g9-b` / `NWKVDMtM13HNNtf5aMDrP` |

三份构建使用同一生产源码，分别绑定 SITE_ID；均构建成功。使用本地 Docker WordPress `localhost:8080/graphql`，Poland 记录 18515、唯一 scope `tio2-my`、发布态 `publish`、路径 `/markets/poland`。本地测试签名口令在每站端点实际通过；不记录环境密钥，不主张当前 provider 账户或历史密钥一致。服务由用户启动，未停止用户服务。原 `.next-poland-http` 及其证据完整保留于原位置和 [历史副本](../history/pre-gate9-fixes/)；新结果不覆盖旧验收记录。

## 反馈逐项处理

| 项目 | 本次结果 | 原始证据与边界 |
|---|---|---|
| F01 共享外观 | 已修复并自检通过：共享 Inter；1200px Header；1100px compact 断点；深蓝单列下拉；菜单顶端保留 RFQ；Cookie 正常大小写、批准排版；Footer 字体/字号修正 | [三端样式](shared-visual/)、[完整页面与交互](runtime/)。继续使用共享 owner，无 Poland 分叉。D23 决定 Finding 是否关闭 |
| F02 功能色 | Header/Footer RFQ、共享焦点、Cookie 边框使用 `#008078`；保留键盘焦点、44px 控件；实际 hover/AX/axe 检查通过 | [1440](shared-visual/result-1440.json)、[768](shared-visual/result-768.json)、[390](shared-visual/result-390.json)。按反馈 F02 执行；原 HTML 个别白色 focus、`#00a99d` active stripe 与此指令不完全相同，不声称每一旧源色值逐项相等 |
| E01 跨站与异常 CMS | 本地同源码三站 HTTP 通过。A/B 带斜杠先 308 到本站规范路径，再 404，无 Poland 标题/canonical/ID/表单。六种异常状态被 GraphQL 拒绝、Malaysia HTTP 500 且没有批准正文回退；每次恢复及最终恢复哈希一致 | [完整 ledger](isolation/ledger.json)、同目录各状态 GraphQL/HTML、三站首页导航/媒体/表单字段/SEO 身份；[测试结果](isolation/test-results.json)。这是本路由和记录的定向矩阵，不扩展为全仓所有站点隔离证明 |
| E01 正向缓存 | 实际修改正文→签名失效→HTTP 显示新值→恢复原文和缓存通过；仅 Poland route/content 标签；错误站点事件拒绝 | [缓存证据](cache/live-cache.json)。最终私有备份已清理，原始 seed SHA 为 `6dde78992cd23eae2ae667f555c5cc31e07b611ac336b363ba39859b1bd94f4c` |
| E02 receiver | 当前构建 RFQ/DOC 校验、失败保留、重试、明确成功 JSON 后确认的两个浏览器测试通过；所有 POST 截获或拒绝，无实际发送。DOC 两次模拟使用同一请求 token | [当前模拟结果](receivers/test-results.json)、[RFQ](receivers/rfq-simulated-receiver.json)、[DOC](receivers/doc-simulated-receiver.json)、[历史适用性审计](RECEIVER_EVIDENCE_AUDIT.md)。RFQ 真实接收阻塞仍开放；DOC 历史 provider accepted 有可追溯源码关联，但缺历史配置/Build ID，不能证明当前账户/密钥等价；实际邮箱和生产控制仍开放 |
| E03 缩放与可访问性 | Chromium 151.0.7922.34 原生 tab zoom 200% 通过：窗口宽 1440 不变，CSS viewport 1424→712，DPR 1→2，visualViewport scale 保持 1；键盘菜单/Cookie可用，无横向溢出 | [原生缩放证据](native-zoom/evidence.json)与同目录截图。通过隔离测试扩展的 `chrome.tabs.setZoom(2)`，不是 CSS zoom、pinch 或单纯 resize。headless；无浏览器工具栏截图、真机、其他引擎或屏幕阅读器运行证明，这些范围仍未验证 |
| I01 Applications | 保持用户确认的既有开发依赖；未重复开发或移除批准链接 | [13 个目标实际 HTTP](http/navigation.json)：12 个 200，Applications 404。完成后再复验 |

## 验证与独立代码审查

- 三站构建通过；最终 TypeScript 和受影响测试文件 ESLint 通过；`git diff --check` 无错误。
- [62 项定向单元/集成](unit-results.json)通过，覆盖 Poland CMS/DTO/route/cache、共享模态、RFQ/DOC 接收状态；PHP runtime 包含权限、回滚和非法记录规则。
- 浏览器核心 12 项通过：三端共享视觉 3、原生 zoom 1、Poland 初始 HTML/正文/SEO/crawler/三端交互/重排/真实导航/共享 Cookie 回归 8。逐项运行记录见 [执行汇总](EXECUTION_RESULTS.json)，细节保存在 runtime/shared-visual/native-zoom。
- 另 7 项浏览器测试通过：模拟 receiver 2、Home 三端共享导航 3、六异常状态隔离套件 1、真实正向缓存 1。合计 19 项；没有执行广泛发布检查。
- Home/1440、UK/768、Privacy/390 的 Cookie 背景隔离、关闭、焦点和滚动恢复通过；Home 三端导航状态通过。未声称所有共享消费者所有场景全面测试。
- 按 Superpowers requesting-code-review 完成独立只读代码审查。审查指出 pointer 开启后断言 `:focus-visible` 的测试不可靠，已改为键盘开启并通过运行；未留下该范围的阻断缺陷。审查者未执行 HTTP，不将其意见冒充 D23 独立验收。
- 首次隔离运行发现测试错误：A/B 路由规范化 308 未纳入预期；WP CLI eval-file 不接受脚本 strict_types 声明。均在 CMS 变更前失败，已修正测试工具后重跑通过；未为适配测试改变生产路由或 CMS 校验行为。

正文、合同和发布状态未扩改；没有真实表单发送、远程写入、部署、DNS、索引或 `verify:root-only`。下一步由 D23 绑定本快照/Build ID，定向复验 F01/F02、E01–E03 已补范围，并保留上述 receiver、设备及 Applications 依赖。当前工具未提供向 D23 线程发消息的能力，本文件尚未通过工具交回其他线程。
