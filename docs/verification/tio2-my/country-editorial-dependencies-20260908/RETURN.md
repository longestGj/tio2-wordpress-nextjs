# Country 目标依赖定向交回：ES-G9-F03 / IN-G9-F01

2026-09-08；授权 G8-TRADE4-APP5-20260908-01 §5。五个目标已在九页交付候选完成，并于本轮重新验证全部 200、准确 Page ID、单一 tio2-my scope、CMS 批准内容一致和实际点击/返回。**此交回是目标 owner 的实现证据；3029 Country 候选仍为 404，两个 Finding 不据此关闭。**

## 版本与环境

- 工作树：D:/16Wordpress_nextjs/.worktrees/trade4-app5-gate8；分支 codex/trade4-app5-gate8。
- 运行代码 b325aec6b5121f2ded604bcf3afad7886515990f；原交付证据 6de21ad；生产模式 `next start`，http://127.0.0.1:3216，BUILD_ID UV4ipmsCJ7cj7M2EHPfID。
- WordPress 为隔离本地 tio2my9 / 8186；本轮仅查询，不修改 CMS、代码或 D23。现有两个运行进程命令见 [processes.json](processes.json)。
- 3216 继承 Country 初始代码 2c97fe1；**未包含** Country 后续修订 d764c36 / 47307b8。此前主交付回执中的“继承共用 Chrome/Consent 修复”不能被理解为已包含这两次后续修订。本次 git 祖先和差异核对明确这一边界。
- 3029 的 Country 复验记录绑定 47307b8 / ax1NgfzN5PFVyPceTtKsF；本轮跟随原目标重定向后五条仍 404，未操作该服务。

## 定向实测

所有链接沿既有正文 href 点击，没有隐藏入口、改成 Contact、改写 href 或跨站替代。全过程同一 3216 origin 与 BUILD_ID。

| Finding | Page ID / CMS ID | 目标路径 | 点击来源与返回 | 3216 | 3029 |
|---|---|---|---|---:|---:|
| ES-G9-F03 | APP-COAT / editorial-18537 | /applications/titanium-dioxide-for-coatings/ | Spain 正文入口 → 目标 → 浏览器返回 Spain | 200 | 404 |
| ES-G9-F03 | APP-PLAS / editorial-18539 | /applications/titanium-dioxide-for-plastics/ | Spain 正文入口 → 目标 → 浏览器返回 Spain | 200 | 404 |
| ES-G9-F03 | APP-MB / editorial-18541 | /applications/titanium-dioxide-for-masterbatch/ | Spain 正文入口 → 目标 → 浏览器返回 Spain | 200 | 404 |
| ES-G9-F03 | RES-TRADE-EU / editorial-18529 | /resources/eu-titanium-dioxide-anti-dumping-duty/ | Spain 正文入口 → 目标 → 浏览器返回 Spain；另点批准 EU Procurement 入口到 /markets/european-union/，200 | 200 | 404 |
| IN-G9-F01 | RES-TRADE-IN / editorial-18533 | /resources/india-titanium-dioxide-anti-dumping-duty/ | India 正文入口 → 目标 → 浏览器返回 India；另点批准 India Procurement 入口到 /markets/india/，200 | 200 | 404 |

[results.json](results.json)保留逐页时间、准确 href/链接文字、源/目标/返回 URL、CMS ID、scope、批准一致性、源文件哈希及两个环境的结果。五页 Gate 6、intake 指定的当前 Manifest 和所绑定页面内源文件本轮均按哈希复读一致。初始 HTML 全文按批准允许的 Grade 入口投影后与批准正文一致；H1、canonical、noindex 和 data-editorial-page 一致。APP-PLAS/MB 的 provisional 路径状态未改变。

执行 `node docs/verification/tio2-my/country-editorial-dependencies-20260908/recheck.mjs`，五项全部通过、退出 0；脚本仅使用当前任务本地忽略环境文件中的令牌访问自己的 8186。该只读复验不发送表单或外部邮件。

五张本轮 `*-target-1440.png` 首屏截图已由负责人逐张实际查看：Logo、活动导航、准确标题、首屏正文和按钮完整，无重叠或缺图。完整三断点、原生缩放、菜单/Consent、隔离与撤回恢复沿用 [九页交付回执](../trade4-app5-20260908/DELIVERY_RECEIPT.md)中的对应证据；本轮不冒称重跑全部测试或完整视觉验收。

## EU / India Trade 时效

沿用同日 08:35 +08:00 的 [有界官方复核](../trade4-app5-20260908/trade-freshness.md)中 RES-TRADE-EU 与 RES-TRADE-IN 两节，及 [控制/撤回恢复报告](../trade4-app5-20260908/editorial-freshness-final-review.md)。本轮没有再次声称新的官方法律事实；重新查询 CMS，二者当前均为 verified / no_open_trigger，准确绑定本页 Gate 6 包和证据 SHA A40568E5A4A9EFE636D7DAB86E488A918B44A1D4DFE92AEAC4837A49A786329E，evidenceDate 2026-09-08，nextReviewDue 2026-10-07。完整字段见 results.json。

可见批准日期仍为 7 September 2026。官方门户提取限制继续保留；负面发现仅限所查入口，不等于不存在后续事件。发布前及触发事件仍须按各页规定重新核对。

## Gate 9 接收与未决项

目标页面实现及只读验收材料已就绪。Country 完整 Finding 关闭前，D16 仍须把目标实现与 Country 已复验修订纳入同一可验收候选，并验证受影响共享消费者；D23 再沿原 ID 实际复验。不能用 3216 的目标 200 替代 3029 的同版本路径闭环，也不能丢弃 Country 已关闭问题的后续修订。本轮未实施该候选整合，不把它标成完成。

UK、Brazil Trade、Printing Inks、Paper 已在原九页候选完成，其交付与未决项继续按原回执，不因优先级调整撤回。没有 merge 到 release/main、push、部署、生产写入、DNS、索引、真实外发或 Gate 9/10 关闭。

本记录是 D16 交回文件；没有新增外部消息送达或独立接单证据。
