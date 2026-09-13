# CMS 安装后首个前台事务衔接修复

- 主体：tio2-my；开发任务，不执行生产操作。
- 用户批准：解释精确安装/修复证据衔接方案后，用户“继续”。
- BASE develop：60af1be341b31db01ad5db033a43c30f881882db。
- 分支：codex/fix-cms-baseline-transition；复用已隔离 worktree，main 和预发布不动。
- 发布阻断记录：codex/release-cms-binding-a78587d0@ebb3c47b。
- 现象：CMS 安装及登记修复后，两项差异（nginx.sha256、pluginSourceRoot）导致历史回退槽位与当前登记严格比较失败；候选已冻结，源码未解包，生产仍为旧 ROLLED_BACK。
- 范围：frontend_candidate.py、独立证据校验模块、管理员包固定清单、相关测试。共享消费者为首个新前台 Prepare；普通后续前台及其他网站保留原限制。
- 方案：只在旧兼容事务 ROLLED_BACK、存在精确安装完成证据及完成的登记修复链时证明旧基线到当前基线；检查原 Nginx 字节及安装 render_maintenance 输出、原/新插件路径、控制器状态、安装原始备份和修复哈希，其他差异失败关闭。保留历史槽位字节，不更新历史 old/target；新的备份及回退仍使用当前基线。
- 当前状态：实现中，未独立复审、未合入 develop、未打包或部署。

## 验证进度

基线：17 tests / OK（现有登记修复和候选归档测试）。新 Prepare 回归先在真实候选校验/冻结路径报 previous frontend active slot changed，复现服务器阻断。随后最小实现通过该比较；测试对历史归档字节的尾随换行预期纠正为实际无换行，不能将此测试预期错误作为实现红灯。

测试使用临时文件和真实归档、证据哈希及安装 Nginx 生成器；仅替代宿主注册表、root 权限环境及解包属主设置。没有 Docker、HTTP、邮件或远程写操作。生产证据本身仍需管理员只读验证，开发夹具不作为生产安装事实。
