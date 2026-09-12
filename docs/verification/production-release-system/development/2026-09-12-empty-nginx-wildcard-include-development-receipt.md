# Nginx 空通配符 include 修复开发回执

- 状态：`MERGED_TO_DEVELOP`
- 任务 ID：`empty-nginx-wildcard-include`
- 网站 / 主体：D16 多网站生产发布工具；缺陷由 `tio2-my` 生产环境的只读 Nginx 清单采集触发，修复适用于共享 Nginx 清单解析器。
- 批准输入与版本：用户指定本代理作为 Gate8，并批准“仅允许真实通配符 include 在零匹配时为空；缺失字面量 include 继续拒绝；后来出现但未登记的文件继续拒绝”的最小修复设计。用户要求分支按修改内容命名。
- 原 `develop` 基线：`db36592574dc4847f9dae456ea36b9d9a984b2f8`。
- 合并前 `develop`：`babaccfc51848e2e6fe9db70f5d8a169ac3c067a`；期间新增的是独立内容发布工作，与本修复的两个路径无重叠。
- `develop` 合并 commit：`1fab9b0b8cfe319dfc3122972a0b68010c5363dd`，双亲为 `babaccfc51848e2e6fe9db70f5d8a169ac3c067a` 与已复审实现 `84f7f56e5125eb2899a9d61b5c8c06e144eac973`。
- 来源分支与实现 commit：`codex/fix-empty-nginx-wildcard-include`；`84f7f56e5125eb2899a9d61b5c8c06e144eac973`。
- 独立代码复审结论与对象：独立复审准确实现 commit `84f7f56e5125eb2899a9d61b5c8c06e144eac973`，Critical 0、Important 0、Minor 0；结论为可合入 `develop`。复审独立运行 44 项相关测试，全部通过。

## 改动路径

- `ops/production/server/nginx_inventory.py`：仅当 include 值包含 glob 元字符且登记表零匹配时返回空引用；字面量零匹配仍抛出 `ReleaseError`。
- `tests/production/test_nginx_inventory.py`：新增空 glob 允许、缺失字面量拒绝，以及 glob 下后来出现未登记文件仍拒绝的三个回归测试。

## 已运行测试

验证日期：2026-09-12；环境：本地 Windows 开发工作区。

- TDD 红灯：新增三个测试首次运行时，空 glob 用例按预期以 `unregistered Nginx include` 失败；另外两个保护用例通过。
- 实现分支定向测试：新增 3/3 通过；完整 `tests.production.test_nginx_inventory` 23/23 通过。
- 实现分支完整生产测试：`python -m unittest discover -s tests/production -p 'test_*.py' -q`，360 项完成，8 项因既有 Windows/POSIX/root/symlink 条件跳过，0 失败。
- 合并后定向测试：`python -m unittest tests.production.test_nginx_inventory -q`，23/23 通过。
- 合并后完整生产测试：`python -m unittest discover -s tests/production -p 'test_*.py' -q`，428 项完成，9 项因既有平台条件跳过，0 失败；测试时长 462.756 秒。测试数增加来自合并前已进入 `develop` 的独立内容发布工作。
- 两次从实现 commit 构建的本地管理员归档逐字节一致：归档 SHA-256 `100992171789023463970aa7ee6834e0b44503b3b9283af367e5196bf0f2e13d`，sidecar SHA-256 `52189f5fc35e6ae97449d090057e31a4e23aaaccc99b2a47dbfe1111e2801865`。这只是开发阶段的可复现性证据，不是已冻结或获准上传的发布候选。

## 实际证据与受影响消费者

- 生产只读证据确认 `/etc/nginx/nginx.conf` 包含 `include /etc/nginx/modules-enabled/*.conf;`，而 `/etc/nginx/modules-enabled` 当前没有有效 `.conf` 文件；Nginx 自身接受这一配置，但旧解析器误报未登记 include。
- 全量有效配置文件清单仍先于 include 引用分类校验，因此 glob 下后来出现但未登记的文件会被 `unregistered Nginx file` 保护逻辑拒绝。
- 缺失字面量 include 仍被拒绝，未放宽非通配符路径或 Nginx 文件登记边界。
- 本次没有改变站点文案、路由、CMS 数据、TLS、DNS、表单或业务行为；共享消费者由完整生产测试覆盖。

## 预计发布影响与未决项

- 原阶段一管理员包（归档 SHA-256 `c619b30e3b494dd46228b5ddf932e9a561d5448179cbec20537b0f6a2f4ca129`）包含该缺陷，已被本修复取代，禁止继续执行其 `plan` 或 `apply`。
- 生产端此前只完成旧包的隔离目录创建、上传、校验和解包；没有执行 `plan`、`apply` 或其他生产变更，生产运行状态未被本次 Gate8 工作修改。
- 后续发布负责人必须从实际 `develop`/`main` 差异重新分类，重新冻结并构建准确候选，再执行独立发布流程；本回执不是发布授权或生产完成证明。
- 本次未修改 `main`，未上传新包，未安装生产程序，未触发预发布、生产发布、DNS 或真实表单提交。
