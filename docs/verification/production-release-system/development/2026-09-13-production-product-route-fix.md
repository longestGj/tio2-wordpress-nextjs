# 生产产品详情路由兼容修复

- 网站：tio2-my；分支：codex/fix-production-product-route；基线：3a7d8fe1。
- 生产证据：M-350 记录 77，environment=production，releaseState=LIVE_APPROVED；校验返回 tio2_my_product_detail_invalid_route。构建失败于静态页面生成，未创建候选容器；事务已自动 ROLLED_BACK，旧站健康检查通过。
- 原因：产品详情校验器将 LIVE_APPROVED 限制为 local 候选环境。真实 PHP 执行测试复现全部 14 个生产产品均被拒绝。
- 修改：LIVE_APPROVED 在 production 可继续接受完整合同校验；local 候选配置检查保持不变。未修改环境、数据库、内容、批准状态或其他站点。
- 验证：2026-09-13，两个相关 Vitest 文件 19 项通过；其中真实 Docker PHP 测试覆盖 14 local + 14 production 产品，以及生产错误网站、页面、路径、canonical、slug、状态、内容拒绝；PHP 语法及差异检查通过。
- 扩展检查：产品汇总页静态测试要求源码包含 hash_equals，而现有实现使用共享内容校验器；在未修改 main 上同样复现。此历史失败不纳入本次修复，不宣称所有测试通过。
- 同类检索：插件 includes 中环境类型检查集中在本产品详情校验器。
- 独立复审：同任务 review_product_route 未发现阻断问题；未执行远程修改。
- 当前交付限制：代码修复完成，尚未部署 CMS 插件或重新发布前台。需先核对实际加载的生产文件及哈希，再准备保护原文件与发布基线的修复操作；不得直接重试已回退事务或改写状态。
