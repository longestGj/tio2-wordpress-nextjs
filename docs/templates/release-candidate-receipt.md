# D16 发布候选回执

- 状态：`FROZEN` / `INTEGRATION_PASSED` / `MAIN_PRERELEASE_PASSED` / `PACKAGED` / `PRODUCTION_VERIFIED` / `<明确失败状态>`
- 发布指令与授权范围：
- 网站 / 主体：
- 目标环境与本次终点：
- 冻结 `develop` commit：
- 隔离 worktree：
- 覆盖实际差异的开发回执：
- 发布侧集成 E2E（命令、日期、结果）：
- `main` 合并 commit：
- 预发布 Run、Build、CMS 与配置身份：
- `subject + releaseType`：
- 候选 manifest SHA-256：
- 包路径与 SHA-256：
- RunRoot：
- 服务器状态与动作回执：
- 备份、解密和隔离恢复证据：
- 业务 E2E、真实表单和收件证据：
- 回退定位：
- 失败阶段 / 未决项 / 下一责任方：

状态按证据递进，失败时使用与阶段对应的明确失败状态。`PRODUCTION_VERIFIED` 只在服务器公开验证、适用业务 E2E、真实提交与收件确认全部绑定同一事务后填写。
