# SEO 与产品详情组合修复

- 网站：tio2-my；集成基线：da92af9f（SEO/GA4 合并 0a379d23，加生产产品路由修复 e76940aa）。
- 问题：新批准路径清单为 TIO2-MY-FULL-PUBLIC-SEO-GA4-GATE6-2026-09-13，共 58 条；产品本地校验仍只认旧 42 条清单，导致全部 14 个 local 产品被拒绝。
- 修复：按准确 candidateId 匹配 42/58 条数。网站、语言、产品页面/路径/canonical 精确匹配保持不变；不接受任意清单。
- 验证：2026-09-13，修复前组合测试 45 passed / 1 failed，失败内容为 14 个 local 产品 invalid_route；修复后 8 文件 50 tests 全部通过，包含真实 Docker PHP 校验、路径清单、产品合同、SEO、GA4 与同意状态测试。
- 此为集成修复结果，不代表统一候选已通过完整预发布或已上线。
