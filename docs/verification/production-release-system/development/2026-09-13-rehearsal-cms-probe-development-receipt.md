# 隔离演练 PHP 采集器装配修复

- 状态：MERGED_TO_DEVELOP；日期：2026-09-13；范围：tio2-my 发布测试夹具。
- 基线：7d5798ba；修复：8bf7e2b91dd859ae08a1ed48f82ab32772b24ad3。
- 仅修改 tests/production-runtime/frontend_release_rehearsal.py：将 cms_content_snapshot.php 复制到 Python 模块旁，保持模块固定兄弟文件查找。
- 红灯：发布候选 7d5798ba 的隔离演练 d16-front-53f3102e4c6c4cc1891e35f5a7dd4a08 因缺文件失败，0 场景，清理通过。
- 绿灯：修复后真实隔离 Docker 演练 d16-front-d1b69586e6f74670a86f72631663aa14，22 场景全部通过，cleanupVerified=true。真实执行备份、解密、前台槽位切换、故障保护和回退；前台为生成的 Node 合同夹具，不是生产 Next.js 或生产验收。
- 运行命令：python tests/production-runtime/frontend_release_rehearsal.py --isolated；证据保存在修复 worktree 的 .tmp/frontend-release 对应目录。
- 独立 review_cms_comparison 复审通过，差异检查通过。除提交记录外，运行过程中源码不再变化。
- 未修改业务实现、main、生产或预发布数据。后继候选可复用代码完全相同的测试证据，须记录源码差异核对结果。
