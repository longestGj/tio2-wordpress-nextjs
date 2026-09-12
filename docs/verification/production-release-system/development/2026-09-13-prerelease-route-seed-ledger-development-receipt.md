# 预发布公开路径种子记录修复

- 状态：`MERGED_TO_DEVELOP`；日期：2026-09-13；环境：本地 Windows。
- 范围：`tio2-my` 预发布 bootstrap；用户授权继续修复。
- 基线：`4516bf99`；分支：`codex/fix-prerelease-route-seed-ledger`。
- 实现：`0b756a8fed23a4b508d9d45c96bc546fe33bead4`。
- 合并：`e293b63aa33520c60b6df6623c2a92aa9b9a1683`。

## 根因与改动

bootstrap 在普通循环中跳过公开路径脚本，最后单独运行，但没有调用 record_seed_result。清单和 orderedSeedHashes 因而有 42 项，CMS counts.seedFiles 从执行记录读取，只有 41 项。这是漏记，不是需要放宽校验的统计口径。

现在最后执行前从已验证清单取唯一有效哈希，成功后解析脚本既有结果前缀，将 JSON 交给共享记录函数，再执行站点验证。公开路径脚本不创建新页面，因此其 postIds 为空，页面数量不变。缺失或重复清单项、执行失败、错误结果均停止后续步骤。

只修改 bootstrap 与回归测试，没有修改种子脚本、历史 CMS 身份或生产校验。

## 验证证据

- TDD：旧代码下成功漏记、未验证执行、异常输出三个新增场景按预期失败；脚本执行失败场景是原有保护回归。
- 实现及合并后：prerelease-seed-inputs、prerelease-wordpress、tio2-my-prerelease-public-paths 三个测试文件，16 项全部通过。
- 独立复审：review_route_seed_ledger，针对准确 BASE/HEAD 无可执行缺陷；独立运行两个相关文件 12 项通过。
- 隔离 PHP 8.3 容器执行真实 record_seed_result 函数，WP option 存取由临时文件适配：41 条已有记录补齐至 42，唯一页面 ID 保持 57，重复调用通过。网络关闭、只读根文件系统、临时状态，不连接真实 WordPress。脚本在修复 worktree 的忽略目录 `.tmp/route-ledger/verify.py`。
- Git 差异检查通过；main、生产、现有预发布环境及根 AGENTS.md 未修改。

## 剩余接管问题与待讨论方案

原始接管候选 27f0a0da 与 PREPARED 候选 8bf2a3d4 的相关 wordpress、ops/prerelease 源码没有 Git 差异。但原始生产 migration-manifest 为 40 项，预发布 seed-manifest 为 42 项：后者另外执行 resource refresh 和 public-path readiness。共同种子的归档字节差异此前确认仅 CRLF/LF；这仍不是线上内容相等证明。

当前迁移校验把两份清单相等作为内容连续性的必要条件，所以仍会拒绝。旧预发布 identity 只记录版本、种子和数量，没有与生产同口径的内容摘要；新 bootstrap 修复也不能追溯改变已冻结的旧 identity。

建议另行确认最小校验调整：各版本分别验证自己的原始清单和字节；使用同口径的实际 CMS 内容摘要比较预发布与生产，相同才准许仅前台发布，不同则明确进入内容发布。历史回执保留原样，补充的新证据绑定准确版本、采集环境与时间。此建议尚未实现，不通过取消哈希检查、修改历史 41 为 42 或拼接新旧证明来放行。
