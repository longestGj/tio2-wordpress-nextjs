# PL-G9-E02 当前环境关联与真实接收处理路径 V0.3

2026-09-07。对象：`tio2-my` / Poland 的 RFQ 与 Request Documents 接收依赖。对应 D23 `PL-G9-RECHECK-02 / E02`。本轮仅私下读取本地配置中的指定变量、源码/既有回执，GET 本地页面与其引用的静态资源；未 POST、未提交表单、未发邮件、未访问邮箱、未改变账户或 CMS。V0.2 原件保持不变。本报告不签 E02 或 Gate 9 整体关闭。

## 已补齐的当前关联

[机器证据](receiver-environment-association.json)记录准确 UTC 采集时间、文件哈希、两条 HTTP 响应哈希和全部资源哈希。运行对象为 `http://127.0.0.1:3015`，目录 `.next-poland-g9`，Build ID `GjJdupnweqs0MK5nxZvnV`。

| 项目 | 本轮直接观察 |
|---|---|
| 本地配置 | 仅读取 `.env.local` 中 `NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY`；存在一项非空赋值。原值不进入证据或工具输出 |
| 同一值的 SHA-256 | `60df07ba6eef8ae5dbd728df0d441b5fe4da780917f40efc319f343ac63d882f` |
| RFQ | GET `/request-a-quote/` 为 200，HTML 含当前 Build ID；同一配置值存在于送达客户端的 HTML/RSC 数据。13 项引用资源全部逐字节匹配当前磁盘构建；这些静态资源内未发现该配置值，符合 RFQ 由运行层向表单传参的通路 |
| DOC | GET `/request-documents/` 为 200，HTML 含当前 Build ID；同一配置值存在于客户端资源 `/_next/static/chunks/2-u6i86eu--72.js` 的 `accessKey` 字面量。该资源及其他 12 项引用资源均逐字节匹配构建。页面 HTML 本身未检出该值 |
| 当前源码身份 | 本轮重新计算 V0.2 51 文件快照，51/51 相等；另外计算六个 receiver/runtime/form/validation 源文件的 SHA-256/Git blob，全部等于当前 HEAD 对应 blob |
| 原码版本 | `codex/poland-development`，base `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb` 加 V0.2 已登记未提交组合。运行绑定沿用 V0.2 既有构建回执并新验实际 HTTP 资源；未声称重建构建 |

因此，**当前本地配置值、RFQ 运行输出和 DOC 已构建客户端实际使用的路由标识已经关联为同一值**。这弥补 V0.2 未核对当前环境值的具体缺口。六个文件的源码身份和 V0.2 51 文件组合也已复核；扫描可用服务端 source map 未找到 receiver 嵌入源码，故不将不存在的 source-map 对应关系作为证明。

准确原始响应和 JavaScript 中可能包含浏览器可用的路由标识，本轮只保存其哈希、相等性与路径，不复制完整原文。指纹不是账户所有权或邮箱凭证。

## 历史、账户、邮箱仍须分开

V0.2 [历史审计](../gate9-fixes-v02/RECEIVER_EVIDENCE_AUDIT.md)的结论继续有效：DOC 一次授权测试在 `2026-09-04T22:34:08.728Z` 获得 provider `success=true`；历史回执的 CRLF/LF 哈希差异已解释，transport/validation blob 仍相同。历史测试未记录路由值指纹，故**无法证明历史值等于本轮指纹**。当前非空配置及输出一致，也不能证明 provider 仍接受该值、对应账户归属或最终收件人。

限定检查的既有意向来源为：

- [DOC 接收目的地决定 V0.2](D:/23MySec/pages/conversion/05_review/CONV-DOC_RECEIVER_DESTINATION_DECISION_V0.2.md)：保存批准目的地的私下来源；旧 server-only 实现假设不再生效。
- [Free/browser-direct 决定 V0.1](D:/23MySec/pages/conversion/05_review/CONV-DOC_WEB3FORMS_FREE_PLAN_RUNTIME_DECISION_V0.1.md)：用户批准的固定 provider endpoint 与接收目的地。证据不复制该地址。
- [当前 Manifest V0.4](D:/23MySec/pages/conversion/05_review/CONV-DOC_CURRENT_GATE9_BASELINE_MANIFEST_V0.4.md)：关联共享变量接线，保留一次真实接受，同时将实际邮箱与生产账户绑定列为开放项。

这些文件说明**应当绑定谁与采用何种运行模型**，没有提供当前 provider 控制台 read-back 或指纹对应的账户证明。RFQ 目录中现有 receiver blocker 和隐私依赖资料不能替代该账户证明。本轮没有扩大扫描到无关工作区、邮件或其他配置。

## 可执行的 owner 处理路径

以下是待准备/待明确授权的后续路径，本轮不请求批准、也不实施发送。

1. **接收 owner 补一份当前账户只读关联证明。** 在已授权的 provider 控制台或 owner 私下记录中确认当前账户、启用状态、批准目的地、上述指纹对应的路由值、RFQ/DOC 共享接线是否适用。公开回执只保留 owner 确认、日期、当前指纹与“与批准目的地一致”的判定；原始地址、路由值、账户凭据保持私下。若没有该证据，明确 `ACCOUNT_BINDING_NOT_VERIFIED`，不凭代码配置推断。
2. **先处理历史 DOC 邮箱确认。** 由获授权的收件 owner 在批准邮箱中核对已有 `2026-09-05 06:34:08 +08:00` 附近那一次 `[TEST]` 消息（对应原 request-token 哈希）；返回是否出现、消息时间及不含私人正文的证据标识。不能找回则保持未确认；无需为了证明历史接收再次发送。
3. **RFQ 真实 receiver 单次测试候选。** 在账户绑定可核对后，准备一份与现有合同完全一致的 `[TEST]` RFQ：使用 `Not sure / Need help` 或 owner 指定合法型号、正数 MT、可见目的国和获准测试联系人。先在截获模拟中确认 payload/接收者路由与标记，记录准确 build/source/指纹和允许测试的本地环境；这一步不对外发送。
4. **后续必须有新的明确单次发送授权才执行步骤 3 的外发。** 范围应为仅 RFQ、指定本地构建、一个已审测试 payload、批准账户/目的地、最多一次 provider POST、禁止自动重试。授权后才能让拦截退出并真实提交一次。记录 UTC、HTTP 状态、media type、显式 `success`、request-token 哈希与 UI 结果，provider accepted 与收件 owner 确认分开报告。任何失败/超时保持 unconfirmed，不自动重发；失败/重试恢复由既有模拟覆盖。
5. **DOC 不重复使用旧额度。** 原一次实际发送授权已耗用。当前补齐的 config/runtime 相等性与 owner 账户证明可由 D23 判断历史接受是否适用；如果仍必须新测，单独准备 DOC 的明确一次新授权及批准 payload。RFQ 的新授权也不自动覆盖 DOC。

这条路径不要求先部署生产；真实 provider 的单次本地候选只能在其精确范围获准后执行。生产 CMS 数据、目标平台环境变量/账户绑定、适用 Privacy/Consent 及 Gate 10 仍按原 owner 条件关闭，当前本地结果不替代。

## 本轮状态

- `CURRENT_LOCAL_CONFIG_TO_RFQ_RUNTIME_AND_DOC_BUILD = VERIFIED_EQUAL`。
- `CURRENT_HTTP_ASSETS_TO_BUILD = VERIFIED`；两页各 13 项。
- `CURRENT_51_FILE_SNAPSHOT = MATCHED`；六个 receiver 相关文件另列准确 hash。
- `HISTORICAL_DOC_PROVIDER_ACCEPTED = PRESERVED`。
- `HISTORICAL_KEY_EQUALS_CURRENT_KEY = NOT_VERIFIED`。
- `CURRENT_PROVIDER_ACCOUNT_BINDING / RFQ_REAL_RECEIPT / INBOX = NOT_VERIFIED`。
- `REAL_SUBMISSIONS_THIS_RUN = 0`；DOC 旧授权未重复使用。

请 D23 按新增环境关联证据缩小 E02 的剩余缺口；真实 receiver 及账户/邮箱项仍归接收 owner，不能用本轮 GET 或历史模拟冒充关闭。
