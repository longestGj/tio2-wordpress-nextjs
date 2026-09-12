# 原始预发布种子来源修复

- 状态：MERGED_TO_DEVELOP；范围：tio2-my 阶段一接管输入与校验，无业务/数据变更。
- 基线 c5976a23；实现 069f1be63ea54ab12ef99d34ffbfc7c9021d3f85，分支 codex/fix-prerelease-seed-provenance。
- 修复准备包继承 CRLF 清单而原证明绑定 LF 字节的问题。新增 prepare_prerelease_seed_inputs.py，认证原候选/identity 后按原始字节复制清单及脚本，拒绝覆盖和篡改。
- 服务器从固定 inputs/prerelease-seeds/ 读取并验证原脚本，对应各自预发布清单；生产归档和历史接管清单仍独立验证，实际 CMS 比较继续要求相同。不再跨清单要求生产包含有两个预发布专用脚本，或字节换行相同。
- 红灯：新增独立来源测试和缺失来源拒绝测试在旧实现失败；准备工具测试先因未实现失败。修复后相关 13 项通过。
- 完整相关回归：test_cms_evidence、test_prerelease_seed_inputs、test_phase1_migration、test_collect_cms_comparison 共 50 项，49 通过、1 项 POSIX 平台跳过、0 失败，472.653 秒。
- 独立复审通过，另运行 14 项相关测试通过；一项文档措辞建议已修正。
- 真实原候选输入验证：8bf2a3d4 的全部 42 个脚本哈希和原清单哈希验证成功，逐字节输出到主 checkout .production/install-f0f06efd/verified-original-seed-inputs/；清单哈希 79994a35d1530ae2a5fd186cfaea5308a0c681e51f59e480aa0577819cf61fe7。
- 本次未操作生产、未生成生产安装成功声明；发布侧仍须冻结新候选、验证并生成新管理员包及新 inputs，旧包不能继续 apply。
