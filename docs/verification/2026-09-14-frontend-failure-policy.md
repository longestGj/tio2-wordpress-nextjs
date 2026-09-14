# 前端失败时保留现场

用户要求：前端不要自动回滚，其他按原设计。范围为 `tio2-my` 本次新前端事务；不修改 CMS、内容导入、数据库恢复、备份或显式 rollback 的实现。

管理员可在对应 subject 的受保护 configuration 目录安装 `frontend-failure-policy.json`，内容为四个准确字段：`schemaVersion: d16-frontend-failure-policy-v1`、`subject: tio2-my`、本次 `releaseId`、`automaticRollback: false`。普通发布调用不能提供或修改此策略。

stage、activate、verify 先验证策略归属；新前端 journal 固定记录 automaticRollback。禁用时失败交回控制器原有 `RECOVERY_REQUIRED` 处理，不自动切换旧前端、不清理候选现场。显式人工恢复须另按实际状态决定；本次不调用 rollback。策略丢失、变更或与事务不匹配均停止，不重新启用默认行为。

没有策略的旧事务保留原设计。策略绑定准确 releaseId，后续新事务需管理员明确延续策略或恢复原行为，不能沿用错误 releaseId。

验证：先测试复现原程序七个失败阶段自动回滚及错误 releaseId 未阻止构建；另复现构建中删除策略后错误清理候选。修复后在 Linux root、可遍历的受保护临时目录中运行 frontend adapter、deployment core、CMS 权限、CMS resources 和 content release，共 63 项测试通过。独立代码审查通过。

当前仅本地代码完成，尚未安装到生产。main 前端源码仍冻结为 d5a061f60c7521a58b59292e337fe2788394cae9。

首次安装尝试在 plan 阶段停止，未安装程序、策略或前端。原因是程序升级准入只识别自动回滚的 `safeRecovery`，未识别发布控制器正常显式 rollback 保存的 `actionEvidence`。补丁严格验证显式回执的六个字段、完整非空事务 binding、`frontend-only` 类型、备份中的旧前端身份及公开健康结果；不改写生产状态。合法回执与各字段篡改、缺失、空值和错误发布类型均有红绿测试。
