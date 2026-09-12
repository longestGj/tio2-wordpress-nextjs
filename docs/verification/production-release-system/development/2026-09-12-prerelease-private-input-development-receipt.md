# 预发布私密输入测试修复开发回执

- 网站：tio2-my；范围：测试工具与安全诊断，不改变业务代码、内容、生产配置或根 AGENTS.md。
- 起点：develop `7bdf049d153c73f7837e14cfbe852267a10ee622`。
- 修复分支：`codex/fix-prerelease-private-input`。
- 实现提交：`8146c0e37bc6b92cf58f156527def758b4dc8423`。
- 合并提交：`164ee044f0d1e204c9b2635cb50cab86e1d728bb`；状态：MERGED_TO_DEVELOP。

## 原因与变更

实际预发布 Documents 首个字段在 React 接管时被即时清空，旧测试工具将输入事件派发等同于填值完成。新工具观察两个渲染帧后的当前节点及值；若发生已观察到的即时恢复或节点替换，则在 4 秒窗口内重试填写，外层仍有 5 秒超时。此操作只填写，不点击提交，不重试服务商请求。有限观察不保证任意未来脚本永不修改字段。

真实表单测试新增独立 failure JSON，阶段、分类、字段都经固定白名单转换；不保存输入值、任意 selector、密钥或原始异常。原控制器可以继续丢弃含隐私风险的原始输出。

## 验证及复审

- TDD：同步清空和下一帧节点替换两项在旧代码失败，修复后通过；安全诊断两项先失败后通过。
- 关联回归：5 个文件共 19 项通过；新增真实测试 harness 失败诊断断言后单独复跑隐私文件 5 项通过。
- 合并后在准确合并提交复跑同 5 个文件，19 项通过、0 失败。
- 实际预发布 `http://127.0.0.1:3100`、Build `ynbG1MlODSmjY2OPBetlU`：CPU 6 倍降速 Documents 填写连续 10 次通过；该诊断禁止所有外部写请求，不代替真实提交。
- 同 Build 真实 Documents 补测一次：HTTP 200/accepted、Documents Thank You 和三个宽度页面检查通过，已查看移动端截图。只发送一次，没有重发 RFQ/Sample。该补测的测试源码为实现提交，服务器仍为 main `ac892eb2`；收件结果由发布记录另记。
- 独立只读复审：production_new_frontend 最终通过。复审提出第三帧任意清空的合成反例，重新核对实际范围后撤回阻塞；注释已收窄为即时恢复/节点替换，未声称通用 hydration 就绪保证。
- `git diff --check` 通过。

## 证据和交接

原始测试日志位于修复 worktree 的 `.tmp/fix/`：red.log、green.log、diagnostic-red.log、regression.log、privacy-final.log、merged-regression.log、throttled.log、documents-live.log。公开补测 JSON 已封存于 release worktree 的 `docs/verification/production-release-system/release-7bdf049d/documents-supplemental/`，commandUuid 为 `bc1009d3-4a21-42bc-bfbc-e91b050fccd7`。

开发交付止于 develop。本次未修改 main 或生产，未打包；发布负责人须重新冻结最新候选。保留旧失败回执，不将不同 commandUuid 的记录拼成一份标准完整通过回执。
