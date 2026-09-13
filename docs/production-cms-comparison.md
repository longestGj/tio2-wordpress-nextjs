# 接管与仅前台发布的 CMS 比较

适用于 `tio2-my` 阶段一兼容接管。用户于 2026-09-13 批准：各版本验证各自清单，实际内容相同才允许仅前台发布。该检查不导入 CMS，不自动授权内容发布。

## 校验

1. 原始接管计划、PUBLIC_READY 日志、计划哈希、原始 migration-manifest 和原始种子文件继续校验。
2. PREPARED 候选归档、清单、原始 proof、原始 cms-identity 继续逐字节验证。原始预发布脚本逐字节对应其清单，清单由原始 identity 绑定，不要求等于生产历史清单或生产归档中的脚本字节。
3. 新增 `cms-comparison-evidence.json`，绑定候选三项身份、原始 identity/proof 哈希、近期预发布内容快照和相应验证记录。缺失、过期、不匹配、失败均拒绝。
4. 现场只读采集生产快照，实际内容不同则停止，转内容发布处理，不允许关闭检查继续。
5. 完整快照摘要写入 `comparison_content_sha256`，兼容前台后续动作继续现场复核。

历史 seedFiles 是执行记录条数，漏记的旧值保持原样，不作为内容摘要。继续检查其合法范围、清单顺序哈希和原始文件字节。

## 摘要范围

当前开发采用 `d16-cms-content-snapshot-v2`，旧 v1 证据拒绝，不能仅改 schema 标签继续使用。仅枚举的已知 JSON 合同/证据 meta 使用对象键排序后的 JSON；保留数组顺序、标量类型及整数/浮点数区别，非法 JSON 拒绝。未知 meta（包括未知 JSON）仍逐值原样比较，路由、canonical 和发布状态不排除。

`_wp_old_slug` 从 headless 内容身份中排除，生产记录保持原样。本身份不证明 WordPress 原生旧 slug 重定向历史相同；不应将此身份用于批准重定向修改。它与编辑锁、最后编辑者一样不进入快照，其他字段保持校验。

共享采集器以 SHORTINIT、只读一致性事务读取 site_scope=tio2-my 的已发布记录。覆盖类型、slug、标题、正文、摘要、状态、排序、密码、父页面身份、业务 meta 和分类关系。同键 meta 值顺序保留；忽略范围见上述 v2 定义。

数据库 ID 和查询返回次序不作为内容，不输出明文正文或 meta。未知 meta 中嵌入的 ID、序列化值、URL 按原值比较，可能保守拒绝不同环境，不能为通过而全局替换。此摘要不证明媒体文件字节、全库 options 或插件代码相同；代码归档和其他发布类型仍执行各自检查。

## 补充证据

发布负责人使用准确候选的冻结源码及对应预发布 CMS，测试前后采集同口径快照，并重新执行适用测试。快照变化使本轮证据失效。根据真实测试输出形成 `d16-cms-comparison-verification-v1` 记录：schemaVersion、state、siteId、commit、runId、contentSnapshotSha256、passed、failed、skipped、completedAt。contentSnapshotSha256 为完整四字段快照规范 JSON 的 SHA-256，不是内部 contentSha256。通过数至少覆盖原 proof 的 browserCases，失败和跳过为零；不得虚构记录或沿用旧测试时间。

`ops/production/collect_cms_comparison.py` 接收 `--run-root`（原候选四个工件和原 identity）、`--source-root`（对应解包源码）、`--wordpress-container64hex`（完整实际 ID）、`--verification`（本轮记录）、`--output`（新路径）。它校验归档、源码、插件挂载和前后快照；不运行测试，不制造 PASSED，不覆盖输出。验证与采集须在 24 小时内。

准备种子输入使用 `ops/production/prepare_prerelease_seed_inputs.py --run-root <原候选四工件及原identity目录> --prerelease-source <原冻结预发布源码> --output <新的空目标目录>`。它先认证原始候选/identity，再校验原清单哈希和全部脚本字节，逐字节复制 `seed-manifest.json` 与 `prerelease-seeds/wordpress/seed/*`；不重新编码 JSON、不归一换行、不从其他准备包继承清单，不覆盖旧输出。

管理员把这两项放入 `/root/d16-phase1/inputs/`，并沿原输入准备流程把比较证据放入 `cms-comparison-evidence.json`，用新包重新 plan。服务器从该固定目录读取原脚本，逐个匹配预发布清单，而非要求它们与生产归档字节一致；生产归档继续独立执行 validate_manifest / inspect_archive，原始生产种子继续匹配接管回执。预发布专用脚本可以不在生产归档中，但不能缺少其原始字节。新证据改变计划哈希，不能复用旧 planHash；生产快照仍须满足五分钟新鲜度。

## 证据边界

本轮开发曾真实只读查询本地预发布 CMS，得到 57 条记录，仅为采集链路验证。尚未形成旧 PREPARED 候选的新全站验证记录或生产内容相同证明。旧包不能作为新校验包继续 apply。
