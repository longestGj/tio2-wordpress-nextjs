# CMS 插件目录绑定修复（开发中）

- 网站：tio2-my；共享 CMS 安装与前端准入代码，不改业务插件、数据库或其他网站内容。
- 批准：用户已确认修复绑定校验、回归测试及带备份和恢复的登记修复流程。
- 基线：develop `2d3593e6e80bc67ff5f2476bcf15a95805af08ef`。
- 开发分支：`codex/fix-cms-enrollment-binding`；复用当前隔离工作区。发布阻塞回执另存发布分支 `87f585ce`，main 保留 e2883161。
- 当前状态：IMPLEMENTED_PENDING_REVIEW，不是生产已修复或发布完成。

## 根因与修复范围

安装目录和 WordPress 实际只读挂载均为 `/opt/tio2-cms/tio2-wordpress-nextjs/wordpress/plugins/tio2-site-model`；登记错误沿用 `/opt/tio2-production/releases/27f0a0da59df1e54cd01eab7d77eb7024b338d42/wordpress/plugins/tio2-site-model`。旧目录 111 文件哈希 16cc7573…，安装包及新候选 113 文件哈希 62426e7a…。

安装登记现在重新验证资源回执，并交叉核对 root 批准配置、容器 ID/镜像、只读挂载、实际文件树。前端基线读取也验证挂载，不能再把旧源码副本当作运行 CMS。

新增管理员修复入口只针对本次固定安装包和旧版本，固定三份文件：baseline.json、cms-platform-enrollment.json、frontend-enrollment.json。计划保留原始字节及权限并绑定现场身份；apply 需要计划哈希，外部改动拒绝覆盖，中断要求 status/rollback。全部操作持有现有 host release.lock。只修改登记及私有事务日志；不启动维护、不暂停写入、不重装 CMS、不改数据库、Nginx、插件、容器或控制器 state.json。现有前端新式事务、活动内容发布能力或维护窗口不适用此一次性修复。

管理员程序须通过现有工具升级链安装；本开发任务没有上传或执行生产写入。入口的 plan/apply/status/rollback 不加入 deploy sudoers。正式执行前需复审通过、构建准确 Git 工具包、验证升级和现场 plan；禁止手工替换登记哈希。

## 验证记录

Windows PowerShell / Python unittest。原基线 82 项通过。新绑定测试先因缺少挂载绑定行为失败，修复后通过；新增恢复事务 6 项先失败后通过。后补管理员准入、容器 ID、未完成事务阻断测试分别观察失败后修复。真实文件事务测试覆盖计划只读、错误计划、现场变化、部分写入后恢复、外部修改拒绝、计划篡改。真实登记组装函数测试核对三份登记输出，不仅验证 helper。

最近组合命令 `python -B -m unittest tests.production.test_cms_enrollment_binding tests.production.test_cms_enrollment_repair tests.production.test_frontend_candidate tests.production.test_content_install_backend`：98 tests，6.197s，OK。管理员拒绝测试输出的 stopped JSON 是预期拒绝，不是生产执行。

独立复审、管理员包真实构建与隔离导入验证、完整相关回归待完成。未运行页面 E2E、真实表单或生产动作；此前预发布证据不自动变成本修复后的发布证据。
