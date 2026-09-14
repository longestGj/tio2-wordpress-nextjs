# tio2-my Resource 数据迁移核对

状态：本地迁移测试及独立代码审查通过；用户 root 回执确认生产迁移完成；后续生产前端发布及全站公开面验证通过。

## 输入与边界

- 用户要求先修复 Resource，并明确不发起生产回滚。
- main 冻结版本：`d5a061f60c7521a58b59292e337fe2788394cae9`。
- 生产 CMS artifact：`73a9a9a0c373499460bb928a65ab979df82bd542a082da31f9e2967b910ce2ed`；安装程序 `b45e136163eb3fd799175a2fea546822333df16c`。
- root 只读核对确认 RES-000 的正文与关联，以及 RES-TRADE-EU/UK/IN/BR 的正文与审核记录，均匹配准确的 27f0 前版；网站身份正确、元数据无重复、新 CMS 文件匹配 main。
- RES-R706 和 RES-CHEMOURS 已为 main 且校验通过，保持原值。

## 原因和修复

CMS 已升级，但五页数据及附属元数据仍为旧版。现有普通内容导入在建立 registry 时先校验已有合同，会被这些旧记录拒绝；同时普通内容包未携带独立存储的资源关联和审核元数据，直接重试不是完整迁移。

本次采用管理员定向数据迁移，准确绑定上述前版和 main 后继数据。更新五页十条元数据及对应修改时间，保留正文结构、网站身份和既有批准内容。事务内校验后提交；异常只取消未提交事务，不恢复历史备份、不切换前端。

root 包装程序复用已安装数据库围栏、整库备份和隔离恢复验证，绑定完成的 CMS 安装、importer ID 和封存文件。使用 UID 33 复验七页后解除围栏。发生错误保留诊断状态，不盲目重跑。

## 本地实测（2026-09-14）

使用独立内部 Docker 网络与临时 MariaDB，读取 main 预发布数据库副本并只在临时库构造准确前版。开发库和 main 预发布库没有写入。

- 修复前复现五页校验失败；修复后七页通过，准确改变十条元数据。
- 整库备份在另一个隔离数据库恢复并核对通过；成功后围栏恢复开放。
- 重复运行保持数据不变；错误计划、未开启围栏、幂等情况下错误数据库均被拒绝。
- 第十条元数据写入失败，以及已改元数据和部分时间戳后的提交前失败，均验证全部元数据及时间戳不变。
- 独立代码审查通过；生产脚本封装后 Python 语法检查通过。

本地结果：`D:/16Wordpress_nextjs/.production/runs/20260914-main-eebfb029-preflight/resource-migration-local-result.json`。
测试脚本：任务 worktree 的 `.local-evidence/test-resource-migration.py`；生成器为同目录 `build-resource-migration.py` 和 `resource-repair-host.py`。
最终管理员脚本 SHA-256：`c718224ec9901a10612e325355011542651d97c17f00e2e1b885594b78e95473`。

## 生产结果

用户执行已校验管理员脚本并回传 `RESOURCE_MIGRATION_COMPLETED`：五页、十条元数据更新，七页验证通过，frontendUnchanged 和 pluginBytesPreserved 均为 true。备份 SHA-256：`d06670176209844ff6febd69fbe89fe7e11dc106a2f84fe0fc2aad93b5971616`。

2026-09-14 01:37:07 UTC 独立只读 HTTP 核对：Resource Hub GraphQL HTTP 200、无 GraphQL errors 且返回记录；公开 `/resources/` HTTP 200；四个贸易 Resource URL 均 HTTP 404。HTTP 200 仅证明请求成功，不代表新内容或视觉验收。结果保存在同一忽略 run 目录的 `resource-migration-public-readback.json`。

随后发布 main 前端 `d5a061f60c7521a58b59292e337fe2788394cae9`，生产 Build ID 为 `zDGcAWoA7CCOTguKFvOV1`，release ID 为 `tio2-my-main-d5a061f6-20260914-r3`。发布策略按用户要求关闭本次前端自动回滚，其他恢复策略保持原设计。生产公开面 177/177 通过，包含此前 404 的四个贸易 Resource URL。

生产 RFQ、Sample 和 Documents 三项真实表单测试均返回服务商 `accepted`；用户确认三封邮件均于北京时间 10:22 收到。按用户要求不保存 `.eml`，因此收件事实只记录用户回执，不生成依赖邮件原文的 completion evidence；服务器发布状态保持 `PUBLIC_VERIFIED`。

## 后续边界

本次一次性恢复脚本不等于已实现通用 CMS 合同升级与数据迁移机制。若后续内容合同再次变化，应通过正式内容候选和安装流程处理。
