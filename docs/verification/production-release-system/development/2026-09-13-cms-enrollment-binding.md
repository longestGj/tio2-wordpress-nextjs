# CMS 插件目录绑定修复（已合入 develop）

- 网站：tio2-my；共享 CMS 安装与前端准入代码，不改业务插件、数据库或其他网站内容。
- 批准：用户已确认修复绑定校验、回归测试及带备份和恢复的登记修复流程。
- 基线：develop `2d3593e6e80bc67ff5f2476bcf15a95805af08ef`。
- 开发分支：`codex/fix-cms-enrollment-binding`；复用当前隔离工作区。发布阻塞回执另存发布分支 `87f585ce`，main 保留 e2883161。
- 当前状态：MERGED_TO_DEVELOP，不是生产已修复或发布完成。

## 根因与修复范围

安装目录和 WordPress 实际只读挂载均为 `/opt/tio2-cms/tio2-wordpress-nextjs/wordpress/plugins/tio2-site-model`；登记错误沿用 `/opt/tio2-production/releases/27f0a0da59df1e54cd01eab7d77eb7024b338d42/wordpress/plugins/tio2-site-model`。旧目录 111 文件哈希 16cc7573…，安装包及新候选 113 文件哈希 62426e7a…。

安装登记现在重新验证资源回执，并交叉核对 root 批准配置、容器 ID/镜像、只读挂载、实际文件树。前端基线读取也验证挂载，不能再把旧源码副本当作运行 CMS。

新增管理员修复入口只针对本次固定安装包和旧版本，固定三份文件：baseline.json、cms-platform-enrollment.json、frontend-enrollment.json。计划保留原始字节及权限并绑定现场身份；apply 需要计划哈希，外部改动拒绝覆盖，中断要求 status/rollback。全部操作持有现有 host release.lock。只修改登记及私有事务日志；不启动维护、不暂停写入、不重装 CMS、不改数据库、Nginx、插件、容器或控制器 state.json。现有前端新式事务、活动内容发布能力或维护窗口不适用此一次性修复。

管理员程序须通过现有工具升级链安装；本开发任务没有上传或执行生产写入。入口的 plan/apply/status/rollback 不加入 deploy sudoers。正式执行前需复审通过、构建准确 Git 工具包、验证升级和现场 plan；禁止手工替换登记哈希。

## 验证记录

Windows PowerShell / Python unittest。原基线 82 项通过。新绑定测试先因缺少挂载绑定行为失败，修复后通过；新增恢复事务 6 项先失败后通过。后补管理员准入、容器 ID、未完成事务阻断测试分别观察失败后修复。真实文件事务测试覆盖计划只读、错误计划、现场变化、部分写入后恢复、外部修改拒绝、计划篡改。真实登记组装函数测试核对三份登记输出，不仅验证 helper。

最近组合命令 `python -B -m unittest tests.production.test_cms_enrollment_binding tests.production.test_cms_enrollment_repair tests.production.test_frontend_candidate tests.production.test_content_install_backend`：98 tests，6.197s，OK。管理员拒绝测试输出的 stopped JSON 是预期拒绝，不是生产执行。

## 独立复审与完成证据

初次复审 4637fcdc 发现 P2：计划文件已写、状态文件未写时中断无法恢复，空事务目录也会阻断准入。已按失败测试修复为：原始字节和观察值不变才允许恢复 planned；真正空目录不阻断；存在计划但缺少状态仍要求恢复；apply/rollback 必须显式提供正确哈希。补充实际 observer 准入/字段投影、配置和内容漂移，以及全部登记写完后的复验/回退测试。

独立复审 `/root/review_cms_binding_repair` 对 `2d3593e6..a78587d09cbd9dfe44e6c0fe5854969b556b5c98` 给出通过，无未解决 P1/P2；复审者独立执行 23 项测试全部通过。实施者最终 23 项测试 0.728s 全通过。两位结果不相加计数。

- 最终代码 a78587d0 的 Windows 相关回归：189 tests / 64.876s / OK，覆盖绑定、恢复、现场观察、CMS 安装、资源、身份、finalize、前端候选/适配器与 bootstrap。
- 补充较大范围回归：214 tests / 362.612s / OK（1 skipped：Linux/root 专属符号链接测试）。此批在初版启动，期间修订恢复代码，不将其单独作为最终版本证明；最终恢复变化已用上述独立复审和最终 189 项复验覆盖。
- 最终代码的本机隔离 Linux Docker：Python 3.12.3，network none、只读源目录、临时内存文件系统，20 tests / 1.563s / OK / 无跳过。含上述被 Windows 跳过的真实程序符号链接切换与恢复测试。未挂载 Docker socket、生产数据或凭据。
- 从准确 a78587d0 Git 对象构建管理员包两次，56 文件，两次 SHA-256 均为 `333c70306cb529af3b43ed8a3e10df4173450ed61a4d69c305b4060319e046a8`；解包后实际执行新 CLI `--help` 成功，未启动管理员写动作。本地包位于实施工作区 `.tmp/cms-enrollment-binding-a78587d0/`，未上传。

干净 develop 合并前仍为 2d3593e6；以 no-ff 合入准确已复审 a78587d0，得到 `ab50868d5617ce92b0a27ec93a14eee6071253ea`。与来源提交树 diff 为空。在 develop 工作区执行绑定、恢复、现场观察、安装 backend、前端 candidate 组合回归：105 tests / 6.622s / OK。

没有修改 main、业务插件、网站页面、数据库、服务器配置或生产登记。没有再次提交表单或发送邮件。现有前台发布候选和收件证据保留，之后由发布侧按实际差异核对可用范围。后续管理员工具升级、现场修复 plan/apply/验收及重新采集基线未执行。
