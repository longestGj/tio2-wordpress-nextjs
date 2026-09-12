# 接管与仅前台发布的 CMS 比较

适用于 `tio2-my` 阶段一兼容接管。用户于 2026-09-13 批准：各版本验证各自清单，实际内容相同才允许仅前台发布。该检查不导入 CMS，不自动授权内容发布。

## 校验

1. 原始接管计划、PUBLIC_READY 日志、计划哈希、原始 migration-manifest 和原始种子文件继续校验。
2. PREPARED 候选归档、清单、原始 proof、原始 cms-identity 继续逐字节验证。预发布种子与自身归档对应，不再要求等于生产历史清单。
3. 新增 `cms-comparison-evidence.json`，绑定候选三项身份、原始 identity/proof 哈希、近期预发布内容快照和相应验证记录。缺失、过期、不匹配、失败均拒绝。
4. 现场只读采集生产快照，实际内容不同则停止，转内容发布处理，不允许关闭检查继续。
5. 完整快照摘要写入 `comparison_content_sha256`，兼容前台后续动作继续现场复核。

历史 seedFiles 是执行记录条数，漏记的旧值保持原样，不作为内容摘要。继续检查其合法范围、清单顺序哈希和原始文件字节。

## 摘要范围

共享采集器以 SHORTINIT、只读一致性事务读取 site_scope=tio2-my 的已发布记录。覆盖类型、slug、标题、正文、摘要、状态、排序、密码、父页面身份、业务 meta 和分类关系。同键 meta 值顺序保留；只忽略编辑锁及最后编辑者。

数据库 ID 和查询返回次序不作为内容，不输出明文正文或 meta。未知 meta 中嵌入的 ID、序列化值、URL 按原值比较，可能保守拒绝不同环境，不能为通过而全局替换。此摘要不证明媒体文件字节、全库 options 或插件代码相同；代码归档和其他发布类型仍执行各自检查。

## 补充证据

发布负责人使用准确候选的冻结源码及对应预发布 CMS，测试前后采集同口径快照，并重新执行适用测试。快照变化使本轮证据失效。根据真实测试输出形成 `d16-cms-comparison-verification-v1` 记录：schemaVersion、state、siteId、commit、runId、contentSnapshotSha256、passed、failed、skipped、completedAt。contentSnapshotSha256 为完整四字段快照规范 JSON 的 SHA-256，不是内部 contentSha256。通过数至少覆盖原 proof 的 browserCases，失败和跳过为零；不得虚构记录或沿用旧测试时间。

`ops/production/collect_cms_comparison.py` 接收 `--run-root`（原候选四个工件和原 identity）、`--source-root`（对应解包源码）、`--wordpress-container64hex`（完整实际 ID）、`--verification`（本轮记录）、`--output`（新路径）。它校验归档、源码、插件挂载和前后快照；不运行测试，不制造 PASSED，不覆盖输出。验证与采集须在 24 小时内。

管理员沿原输入准备流程把证据放入 `/root/d16-phase1/inputs/cms-comparison-evidence.json`，用新包重新 plan。新证据改变计划哈希，不能复用旧 planHash；生产快照仍须满足五分钟新鲜度。

## 证据边界

本轮开发曾真实只读查询本地预发布 CMS，得到 57 条记录，仅为采集链路验证。尚未形成旧 PREPARED 候选的新全站验证记录或生产内容相同证明。旧包不能作为新校验包继续 apply。
