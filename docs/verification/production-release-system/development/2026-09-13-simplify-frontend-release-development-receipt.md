# 2026-09-13 日常前台发布简化开发回执

- 网站 / 范围：tio2-my，frontend-only 发布程序和客户端；不修改业务页面或共享 CMS 数据发布规则。
- 分支：codex/simplify-frontend-release；基线：4b46d749。
- 用户授权：日常前台发布不再要求下载、解密及本地隔离恢复；由当前发布任务完成修复并继续原事务。
- 实现：客户端只保存严格绑定的服务器备份回执；BACKED_UP 重入不重复备份。服务器保留备份回执、密文哈希及旧版本回退检查，移除 frontend-restore.json 前置。补齐 STAGED 重入备份检查。程序升级支持 BACKED_UP，按工具 commit 分目录保留升级回执。
- 验证日期：2026-09-13。
- 测试：客户端回执 13 项、多站客户端 6 项、服务器相关 4 模块 95 项、Linux 程序升级 12 项通过；真实本地 SSH/Docker 演练 7 项通过，清理已验证。
- SSH 证据：本 worktree 忽略目录 .tmp/frontend-ssh/d16-ssh-77343663721c4aeea26eb1ee9a40f6be/evidence.json。验证丢失备份响应后仅一次服务器 backup、只恢复客户端回执、未生成恢复成功证据。
- 测试环境问题：首次 SSH 夹具因 Windows CRLF sudoers 失败；已在测试上传文本边界规范换行，重跑通过。
- 独立复审：同任务 review_phase1_compat 复审，无阻断问题；git diff --check 通过。
- 生产事实：本回执不表示程序已安装。原事务 20260911T215847Z-8bf2a3d437b0 保持 BACKED_UP，候选、备份请求及已完成服务器备份继续复用；线上前台尚未切换。
