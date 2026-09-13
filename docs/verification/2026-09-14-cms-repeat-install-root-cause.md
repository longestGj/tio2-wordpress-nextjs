# CMS 再次升级：本地代码根因检查

对象：tio2-my；目标 CMS 为冻结 main eebfb0299ab8d3a4de7241211be9b6b20b9ad090。此次只做本地诊断，没有修改安装程序或生产环境。

## 已确认的直接原因

生产实际执行 `content_install_cli.py plan` 后，补充诊断返回：`maintenance gate already installed`，调用链为 `Installation.plan → InstallationBackend.observe → render_maintenance`。不是插件包哈希失败，也不是数据库导入失败。

1. [render_maintenance](../../ops/production/server/content_install_backend.py) 在第 37 行只要发现文本 `d16-install-maintenance` 就拒绝；没有区分本网站已登记的合法规则与外来或被篡改规则。
2. `enter()` 第 154 行把该规则写入 Nginx。
3. `leave()` 第 256–259 行只在恢复分支还原原 Nginx；正常成功时仅删除维护标记文件，保留 Nginx 规则。保留规则允许后续内容窗口通过创建标记进入维护，本身不能简单认定为错误清理。
4. 下一次 `observe()` 第 124 行再次调用同一个只接受未安装状态的 renderer，于是正常成功留下的状态无法通过下次计划检查。

因此问题是**再次升级的前置条件不接受上次成功后的合法状态**。不能把“规则存在”解释成网站正在维护，也不应以删除规则来绕过。

## 第二个独立限制

[InstallationResources.snapshot](../../ops/production/server/content_install_resources.py) 第 191–194 行拒绝配置名称对应的任何现存导入器。`install()` 创建新导入器，`verify()` 将其 owner、只读挂载和密封文件绑定到本次事务。`restore()` 第 317–321 行也只允许删除本次 owner 的导入器。

生产配置确认当前导入器为 `d16-my-content-importer`，上次完成回执记录了其创建。即使修复维护规则复用，该入口仍不能按原配置直接升级。直接删除拒绝条件不足以解决 Docker 同名创建、旧版本保存及恢复所有权问题。没有在生产越过第一处检查去试验第二处。

## 错误信息问题

[CLI](../../ops/production/server/content_install_cli.py) 第 64–65 行将 ReleaseError 等异常统一替换为 `administrator installation failed; inspect persisted status`。计划检查发生在保存 plan/state 之前，因此本次状态仍为 idle，状态文件不能补回被丢弃的具体错误。应保留脱敏错误码、阶段和具体已知拒绝原因，同时避免输出配置或凭据。

## 实际本地复现

调用真实 `render_maintenance()`、`InstallationBackend.leave()`，只模拟 HTTP 边界：成功 leave 后标记消失、Nginx 字节保持不变，再次 render 稳定返回 `maintenance gate already installed`。

复用现有 DockerFixture，调用真实 `backup()` 和 `install()`，第一次资源安装通过只读验证；使用新事务目录、相同配置创建第二个 InstallationResources，snapshot 稳定返回 `initial installation refuses an existing importer`。

输出：`D:/16Wordpress_nextjs/.production/runs/20260914-main-eebfb029-preflight/repeat-install-root-cause.json`。这是本地文件与边界模拟复现，不是 Docker 真机再次升级或生产验证。

此前实际执行的 26 项相关单元测试全部通过。其中 `test_double_install_refuses_existing_gate` 和 `test_plan_rejects_wrong_mount_and_existing_importer_without_writing_plugin` 明确把拒绝行为作为期望；测试通过证明当前初装约束按设计生效，不能证明再次升级已支持。

## 修复范围建议

- 明确区分首次安装与已登记环境的升级，保留未知资源拒绝逻辑。
- 对升级核验已有维护规则的主体、路径、内容及状态，再复用合法规则；未释放的维护窗口仍应拒绝。
- 纳入旧导入器身份和密封文件，明确新版本创建、切换及本次失败恢复，不能仅换名称或删除旧容器。
- 核验新计划的当前配置/生产回执绑定，不能直接复用旧计划及历史 previousProductionReceipt。
- 增加“第一次安装完成 → 第二次升级 → 第二次失败恢复到第一版”的连续验证，而非只测试初装和重复拒绝。

此次已完成原因定位，尚未实现或验证上述修复。
