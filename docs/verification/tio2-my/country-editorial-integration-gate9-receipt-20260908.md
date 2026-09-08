# D23 独立定向验收接收回执

接收日期：2026-09-08。D16 已收到 D23 Controller 对独立 Gate 9 复验结果的正式交回，并实际读取 [D23 复验报告 V0.3](D:/23MySec/pages/markets/07_qa/MARKET_FOUR_ROUTE_DEPENDENCY_TARGETED_RECHECK_V0.3.md)。报告控制 ID 为 `G9-MARKET-ROUTE-DEPENDENCY-RECHECK-03`，读取时 SHA-256 为 `91F56A6BE7F68D3B2B6C612371CC188ED5959DED02203E65BDC25D844070805A`。

## 精确候选

- 站点：`tio2-my`；分支：`codex/country-editorial-integration`。
- 运行代码：`4fa585bc125c7b8fa926ab66059f4fc6887877f4`。
- 交付证据：`58af74dbe44b4ccaafe517d592ecae5d5ff37ef2`。
- BUILD_ID：`1AwBNw0A1szLVVlTyLyQU`；本地生产模式候选：`http://127.0.0.1:3226`。
- D16 交付入口：[整合交回回执](country-editorial-integration-20260908/RETURN.md)。

## 独立接收结果

| Finding | D23 独立结论 | 适用范围 |
|---|---|---|
| ES-G9-F03 | CLOSED FOR EXACT CANDIDATE | Spain → APP-COAT、APP-PLAS、APP-MB、RES-TRADE-EU 四条批准目标 |
| IN-G9-F01 | CLOSED FOR EXACT CANDIDATE | India → RES-TRADE-IN 批准目标 |

D23 实际验证 5/5 目标返回 200、原 href 点击、history back、Trade 明确返回、Page ID、CMS publish、单一 site_scope、canonical、EU/India freshness 和错误 scope 拒绝；独立执行 5 个测试文件、78 项测试通过，并实际查看五张整页截图。以上为 D23 独立报告结论，区别于 D16 原有自检。

本回执补足独立接收依据；此前原交付回执中的“尚无独立接收证据”为交付时状态，保留原文件及证据提交不回写。该关闭不传播到旧 3029、旧 3216、其他构建或未复验页面。

## 停止返修与保留边界

D16 对这两个已独立关闭 Finding 停止重复返修；只有新反证或相关变化才触发对应范围复验。运行候选、批准路由和既有证据保持不变。本次仅新增接收记录，不修改代码、CMS、进程、D23 文件或批准事实。

Spain / India 整体 Gate 9 仍为 **GATE9_NOT_PASS**。RFQ/DOC provider、最终收件、设备/AT/非 Chromium/native zoom/forced-colors、生产及其他原未验证层继续按 D23 原记录开放；D16 局部 Chromium 证据不自动关闭这些独立验收层。

未扩大到 Gate 10、release/main 合并、push、部署、生产操作、发布、DNS、索引或真实外发表单/邮件。
