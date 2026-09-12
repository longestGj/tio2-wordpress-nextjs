# 预发布客户端导航测试修复

- 状态：MERGED_TO_DEVELOP；网站：tio2-my；仅修改测试，不改业务或服务器。
- 基线：66cbb7714873eb1951408a34d8c44bfda9e37e81；实现：695eac5c；分支：codex/fix-prerelease-client-navigation。
- 真实预发布 2a9bae05320c / CXYnbLtptnohFHFH8Le4l 的 390px 应用链接检查失败：客户端导航返回空 response，原断言得到 undefined，而非 HTTP 200。
- 两处点击/键盘导航使用准确 waitForURL，独立 GET 验证 200；保留页面身份、返回、焦点、Axe、三宽度和 58 对象内链验证。
- 同一真实预发布上，以修复分支测试代码运行 prerelease-public-paths.spec.ts：4/4 通过，1.6 分钟；非新 main 预发布验收。日志在 release-66cbb771/.tmp/release/navigation-fix.log。
- 独立复审：review_cms_comparison 通过，无阻断问题；git diff --check 通过。
- 发布侧重新冻结候选并完成新 main 预发布；原失败回执保留。
