# CMS 官方示例文件误拦修复

- 日期：2026-09-13；主体：`tio2-my` CMS 管理员安装器。
- 状态：`MERGED_TO_DEVELOP`；不代表服务器已更新或 CMS 已安装。
- 用户输入：生产安装检查失败截图，随后要求“下一步”；按已经说明的准确路径 + 官方哈希例外实施。
- 开发基线：`0e8ac716fc93b8b135ce4d8d02e65df04d4a3a5c`。
- 分支：`codex/fix-cms-official-env-example`；实现：`03ada1b920c6338f3fe43f5327c345c21d1d2cdc`。
- 工作区：`C:/Users/longe/.codex/worktrees/5bec/16Wordpress_nextjs`，从干净发布分支切到独立开发分支；原发布分支及其阻断记录保留。

## 根因和批准边界

安装器 `InstallationResources._capture` 将所有 `.env*` 文件拒绝。生产只读检查找到 `wp-content/plugins/wpgraphql-acf/.env.example`，插件头为 2.8.0。直接读取 [WordPress 官方 2.8.0 ZIP](https://downloads.wordpress.org/plugin/wpgraphql-acf.2.8.0.zip) 中 `wpgraphql-acf/.env.example` 的原始字节，SHA-256 为 `75f07f13f15864e3ccc9709f91cf6163adb17cd049ca91a3089d67350dfa0c1a`，与用户服务器截图一致。文件含公开本地测试占位值，不是本项目生产凭据。

只对上述路径和字节组合增加例外。示例仍进入快照、备份和密封导入器的哈希清单；改动、搬移或出现其他 `.env*` / `.key` / `.pem` / `.log` 继续拒绝。没有删除现场文件、宽泛忽略示例、关闭安全检查或修改安装状态。

## 改动与消费者

- `ops/production/server/content_install_resources.py`：准确路径与 SHA 例外。
- `tests/production/test_content_install_resources.py`：公开示例字节夹具，保留、拒绝和备份后漂移测试。
- `docs/production-installation.md`：说明例外边界。

消费者为初始 CMS 安装的资源观察、备份和密封导入器构建。共享 WordPress 执行树继续被完整绑定，不改网站内容、前端、数据库逻辑、站点归属或其他插件。此变更无视觉/UI 影响，不以浏览器测试代替资源合同测试。

## 已执行验证

Windows PowerShell / Python，命令在上述开发工作区运行：

1. 基线 `python -B -m unittest discover -s tests/production -p test_content_install_resources.py -v`：12 通过，0 跳过。
2. 仅新增测试、尚未修改实现：15 项中 13 通过、1 failure、1 error；failure 为官方示例被拒绝，error 为同一规则阻止漂移用例的备份前置步骤。不是导入或环境错误。拒绝类测试是已有安全行为的后补回归，不声称其曾红灯。
3. 最小修复后同命令：15 通过，0 跳过。
4. `python -B -m unittest discover -s tests/production -p 'test_content_install*.py' -v`：65 通过，0 跳过，14.904 秒。Docker 边界由既有 fixture 模拟；实际归档解析、哈希、文件备份及密封树构建参与测试。不是生产数据库恢复演练。
5. `git diff --check`：通过；仅 Windows LF/CRLF 提示。
6. `python -B -m unittest discover -s tests/production -p test_admin_bundle.py -v`：5 通过，0 跳过，46.490 秒。

## 独立复审与合并

独立复审者 `review_cms_env_example` 审查准确 BASE/HEAD，结论 Ready to merge：是；Critical / Important / Minor 均无。独立运行 15 项资源测试通过，并在内存加载 BASE 实现复现相同红灯。开发工作区未被复审修改，未操作生产。

重新核对 develop 工作树干净、HEAD 仍为原基线后，快进合入准确实现 `03ada1b920c6338f3fe43f5327c345c21d1d2cdc`。在 develop 工作区 `D:/16Wordpress_nextjs/.worktrees/prerelease-public-paths-integration` 重新运行 15 项资源测试，全部通过，0 跳过，0.948 秒；实际实现树与复审对象一致。本回执随后随独立文档提交进入 develop。

## 交回与未决项

独立代码复审和 develop 合入完成；管理员包构建及服务器计划/执行由发布侧另记。开发阶段没有修改 main、重建预发布、连接生产写入、暂停 CMS、升级 CMS 或执行 `verify:root-only`。服务器仍需安装包含本修复的新受保护程序，并重新生成、核对 CMS 安装计划；旧计划哈希不得复用。
