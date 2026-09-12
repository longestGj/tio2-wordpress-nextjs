# 最小内容发布程序开发回执

- 状态：`MERGED_TO_DEVELOP`
- 任务：2026-09-12 minimal-content-release；共享 CMS 内容发布程序开发。
- 网站 / 主体：发布客户端按登记网站绑定身份；本次真实内容链路验证为 `tio2-my`。共享 CMS 的其他网站在整库备份、暂停写入和恢复范围内。
- 批准输入：用户批准最小改动——发布前备份共享数据库，再发布指定网站的数据；失败时在暂停写入窗口内恢复整库。设计见[批准设计](../superpowers/specs/2026-09-12-minimal-content-release-design.md)。
- 原 `develop` 基线：`db36592574dc4847f9dae456ea36b9d9a984b2f8`。
- `develop` 合并 commit：`73df4a50774d080bd1dd32848a148cf102ff2221`，fast-forward，合并后 HEAD 与复审实现完全相同。
- 来源分支：`codex/phase2-tio2-my-content-release`；实现 commit 同上。
- 独立复审：`minimal_site_client` 和 `minimal_database_release` 对上述准确版本审查通过，无阻断项；分别独立复跑 22 项、32 项相关测试。实际运行证据由主控执行、查看并提供给复审者，没有将其表述为复审者自行运行。

## 交付内容

操作入口为 Test / Publish / Rollback，使用说明见[内容发布](../content-release.md)。Publish 内部完成候选校验、共享数据库写入隔离与整库备份、指定网站内容导入、缓存刷新、验证及回执。失败恢复绑定本次窗口与原始备份，不提供跨多个后续发布的单站历史回退。

改动涉及 `scripts/production*`、`ops/production/server/`、`wordpress/release/`、CMS 内容校验及 Next DTO/SEO、签名缓存刷新接口和相关测试。既有 MY 页面允许登记字段的内容更新，身份、结构、链接等约束仍校验。新媒体导入不在本次支持范围内。

## 验证（2026-09-12，本地隔离环境）

- `npx --no-install tsc --noEmit`：通过。
- Vitest：`wordpress-content-release`、`wordpress-content-release-all-pages`、`wordpress-content-release-projection`、`api/revalidate` 四个直接相关测试文件，185 项通过。
- `python -m unittest tests.production.test_content_release tests.production.test_content_docker tests.production.test_site_content_adapter tests.production.test_installed_content tests.production.test_release_controller tests.production.test_site_frontend_adapter tests.production.test_release_classifier tests.production.test_candidate_contract tests.production.test_bootstrap_install -q`：130 项，成功，1 项 Windows 符号链接创建能力不足而跳过。
- `python -m unittest tests.production.test_content_next_probes -q`：5 项通过，包括拒绝陈旧正文、排除脚本中的伪正文、canonical 比较和测试进程清理。
- 客户端测试 19 项通过；内容包构建测试 9 项中 Windows 8 项通过、1 项平台跳过。CMS/DTO 子任务回归 83 文件 738 项通过，SEO/转化页回归 23 文件 223 项通过；这些是子任务运行记录，不重复累加为最终版本全量测试数。
- 初次全生产测试发现 27 项旧前台测试夹具缺失必填 CMS 登记的错误；已补正夹具并通过相应 22 项和上述最终 130 项回归。没有将初次 411 项运行报告为全部通过。
- 隔离 MariaDB/WordPress 演练验证写入暂停、容器重启仍保持暂停、导入后恢复、恢复中断重试及双网站数据整库一致性。
- 最终准确实现版本执行 `python tests/production-runtime/content_next_rehearsal.py`，退出码 0：真实复制本地预发布 CMS 到独立资源，使用真实 WPGraphQL 和新构建的 Next 生产进程；先验证旧缓存，再发布及刷新，随后注入失败并整库恢复、再次验证正文/SEO/sitemap。无 GraphQL 或提交接口模拟。

实际链路证据：

- 运行 ID：`d16-test-content-next-cef04579dd9e`。
- Next Build ID：`hW4O2nDAfCh64GQiSPycW`；PID `49840`，全过程未重启。
- HOME-001 四次实际页面检查 HTTP 200，标题、描述、可见 heading 与 sitemap 通过；`databaseRestored=true`。
- 主控已查看恢复后截图，导航、正文、主图和卡片正常呈现。截图为测试用唯一文本，不是批准的生产文案。
- 本地证据保存在来源工作树 `.tmp/minimal-real-next-final.log` 与 `.local-evidence/d16-test-content-next-cef04579dd9e-restored.png`（忽略文件，不随代码发布）。截图 SHA256：`F421AD7BD0DA434198BCFD3454DE4C386D18A1485AA9AEA929427210E70459F2`。
- 演练正常结束后核实本次 Docker 容器和 PID 已退出；未修改共享预发布数据或生产环境。
- `git diff <原基线> --check` 通过，根 `AGENTS.md` 无差异；根工作树 `main` 保持 `8b92adf391ab1fbe1564e8821f2fdf0535700f96`。

## 发布影响与未决事项

这是开发完成回执，不是生产发布回执。本次真实运行覆盖 MY 首页内容成功发布和故障恢复，不代表所有页面、所有未来网站已完成实际发布验收。

生产负责人仍需单独安装并登记固定内容导入器、数据库访问配置，以及真实维护、身份检查、缓存刷新和页面验证 hooks；当前代码在未安装时拒绝内容发布。新网站须先有准确网站登记及对应运行资源。整库恢复会恢复共享 CMS 中全部网站的数据，因此仅用于本次统一暂停写入窗口内的失败恢复。

未改动 `main`，未上传或安装生产程序，未执行生产发布、DNS 切换或真实表单提交。后续发布须根据实际候选重新分类、检查安装能力及适用验收。
