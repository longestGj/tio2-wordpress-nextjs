# CMS 安装后首个前台事务衔接修复

- 主体：tio2-my；开发任务，不执行生产操作。
- 用户批准：解释精确安装/修复证据衔接方案后，用户“继续”。
- BASE develop：60af1be341b31db01ad5db033a43c30f881882db。
- 分支：codex/fix-cms-baseline-transition；复用已隔离 worktree，main 和预发布不动。
- 发布阻断记录：codex/release-cms-binding-a78587d0@ebb3c47b。
- 现象：CMS 安装及登记修复后，两项差异（nginx.sha256、pluginSourceRoot）导致历史回退槽位与当前登记严格比较失败；候选已冻结，源码未解包，生产仍为旧 ROLLED_BACK。
- 范围：frontend_candidate.py、独立证据校验模块、管理员包固定清单、相关测试。共享消费者为首个新前台 Prepare；普通后续前台及其他网站保留原限制。
- 方案：只在旧兼容事务 ROLLED_BACK、存在精确安装完成证据及完成的登记修复链时证明旧基线到当前基线；检查原 Nginx 字节及安装 render_maintenance 输出、原/新插件路径、控制器状态、安装原始备份和修复哈希，其他差异失败关闭。保留历史槽位字节，不更新历史 old/target；新的备份及回退仍使用当前基线。
- 当前状态：实现及独立复审通过，待准确合入 develop；未打包或部署生产。

## 验证进度

基线：17 tests / OK（现有登记修复和候选归档测试）。新 Prepare 回归先在真实候选校验/冻结路径报 previous frontend active slot changed，复现服务器阻断。随后最小实现通过该比较；测试对历史归档字节的尾随换行预期纠正为实际无换行，不能将此测试预期错误作为实现红灯。

测试使用临时文件和真实归档、证据哈希及安装 Nginx 生成器；仅替代宿主注册表、root 权限环境及解包属主设置。没有 Docker、HTTP、邮件或远程写操作。生产证据本身仍需管理员只读验证，开发夹具不作为生产安装事实。

## 最终实现验证及复审

- 实现 HEAD：31a863aaad497e3284698ab1ffe04ae5f3549b99（代码提交 4e92932e，后续只添加 Linux 权限测试）。
- Windows 定向回归：`python -B -m unittest tests.production.test_cms_frontend_transition tests.production.test_frontend_candidate tests.production.test_cms_enrollment_repair tests.production.test_cms_enrollment_binding tests.production.test_cms_enrollment_observer`，119 tests / 8.915s / OK，2 skipped 为 POSIX root 权限与符号链接测试。负向 CLI 测试预期输出停止 JSON，不是测试失败。
- 本机 Linux 隔离回归：`test_cms_frontend_transition` + `test_phase1_program_upgrade`，42 tests / 15.308s / OK / 无跳过。使用已有 d16-content-resources-runtime:v1，本地 network none、read-only、只读源码、0700 TMPDIR 内存盘，不挂载生产数据或 Docker socket。真实 protected_path 验证私有证据，拒绝组写权限及符号链接。
- 独立复审 review_cms_transition：已核对 BASE..31a863aa 全部差异，PASS，无未决问题；独立运行初版相关模块 106 tests / OK。确认旧槽位只用于受身份约束的非活动容器清理，新事务回退使用当前基线，管理员固定包包含新模块。
- 补充回归：`python -B -m unittest tests.production.test_site_frontend_adapter tests.production.test_frontend_backup tests.production.test_deployment_core tests.production.test_bootstrap_install tests.production.test_admin_bundle`，66 tests / 113.765s / OK / 无跳过，覆盖本地模拟槽位备份、激活/回退及管理员包固定清单、精确 Git 制品。
- main 干净，用户七文件 stash 对象 0484d6625425d59848097dc2394f7a10af1aefba 仍存在；未恢复或删除。本轮未连接生产。
