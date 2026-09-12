# D16 独立发布流程

发布只由一条明确的独立发布指令触发。开发侧的 `MERGED_TO_DEVELOP` 回执是输入，不是触发器；没有独立发布指令时，发布负责人不得修改 `main`、建立预发布候选、生成生产包或操作远程环境。

## 1. 输入与职责

发布指令至少限定网站或发布主体、目标环境、允许动作和本次终点。发布负责人读取根规则、[网站登记](site-registry.md)、[发布架构](release-architecture.md)、目标网站运行手册、Git 中的开发回执和实际差异。

发布负责人不修改业务实现。发布侧集成或预发布发现代码缺陷时，写阻断回执，记录准确候选、失败命令和证据，退回 Gate8 形成新的 `MERGED_TO_DEVELOP` 回执；不在发布 worktree 中顺手修复。

## 2. 候选形成

1. **独立触发**：记录发布指令、主体、环境、授权范围和终点。
2. **冻结 `develop`**：记录准确 commit，建立隔离 worktree；后续源码变化产生新候选。
3. **回执与差异核对**：读取 Git 中涵盖实际差异的开发回执，核对主体、路径、消费者、测试和未决项。缺少覆盖或无法分类时停止。
4. **发布侧集成 E2E**：对冻结候选运行适用的组合回归、关键业务 E2E 和视觉核对。通过后回执状态记为 `INTEGRATION_PASSED`。
5. **准确合入 `main`**：串行核对最新 `main`，只合入通过发布侧集成的准确候选；记录合并 commit 和实际树。
6. **`main` 预发布**：从干净的准确 `main` 建立独立预发布，绑定 Build、CMS、配置和测试身份。全部适用检查通过后记为 `MAIN_PRERELEASE_PASSED`。
7. **分类与打包**：根据实际 Git/内容/配置差异和开发回执确定唯一 `subject + releaseType`。只有唯一类型且对应适配器已安装时才能形成不可变包；成功后记为 `PACKAGED`。

冻结建立后先写 `FROZEN` 回执。任何阶段失败使用明确失败状态，例如 `INTEGRATION_FAILED`、`MAIN_PRERELEASE_FAILED`、`CLASSIFICATION_FAILED` 或 `PACKAGE_FAILED`，并保存失败位置；不得把失败候选改写成通过候选。

## 3. 生产三道门

生产步骤仅在发布指令明确包含对应远程动作、准确包和目标环境时执行。

### 候选门

核对不可变包、主体、发布类型、源 commit、Build、配置、CMS 合同、上一生产回执和预发布回执。生产基线变化使事务失效，不允许改写候选。

### 部署门

使用项目级发布 Skill 和目标网站运行手册，以固定 `subject + action` 入口按 `status -> prepare -> backup -> stage -> activate -> verify` 推进。整个事务使用同一 RunRoot、候选哈希、备份请求和证据身份。

`stage` 必须完成内部验证后才可 `activate`。第一次 `verify` 将已激活候选推进到公开验证状态。任何身份漂移、恢复不完整或 `RECOVERY_REQUIRED` 都停止后续写动作。

### 生产验收门

公开验证后运行适用业务 E2E、授权的真实表单和收件确认。服务商接受、Thank You 和实际收件分别记录；失败不自动重发。使用目标网站运行手册指定的 `New-ProductionCompletionEvidence.ps1` 消费实际业务 E2E 汇总、明确确认输入和三份真实原始邮件，生成第二次 `verify` 的固定六文件；旧接管脚本生成的旧回执不能替代这六项。最终证据由第二次 `verify` 校验并完成状态，发布候选回执只有此时才能记为 `PRODUCTION_VERIFIED`。

## 4. 回退、失败与回执

`rollback` 只使用对应主体、同一事务和已验证备份/前一版本；它不是重新分类或临时 Shell。网络中断后先执行 `status` 读取持久状态，不根据 SSH 退出码猜测结果。状态为 `RECOVERY_REQUIRED` 时保留现场，由适用的恢复流程处理。

发布过程使用[发布候选回执模板](templates/release-candidate-receipt.md)。开发回执、候选回执、服务器动作回执、业务 E2E 和收件证据分别保存；每一项绑定产生它的 commit、环境、日期和哈希。

## 5. 阶段一能力边界

当前生产登记仍只安装 `tio2-my/frontend-only` 的已验证兼容事务。新前台与内容运行能力须先完成[管理员安装与启用](production-installation.md)并记录实际验收；开发代码存在不改变生产登记。未安装的 `content-only`、`combined`、`cms-platform` 和 `host-infrastructure` 写动作仍返回 `capability-not-installed`。

阶段一候选只能记录为 `PHASE1_TOOLING_CANDIDATE`。它不表示管理员包已安装、生产已改变或发布已完成。内容 generation、共享 CMS 写入、Release Campaign 执行和新站接管分别属于后续计划。
