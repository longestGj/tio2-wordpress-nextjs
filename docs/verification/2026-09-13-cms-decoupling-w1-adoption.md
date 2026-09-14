# W1 法律页承接与读契约样板回执

日期：2026-09-13；网站：`tio2-my`；范围：三个法律路由的本地开发承接，不含发布。状态：W1 承接完成，W2–W6 未完成。

## 版本与独立验收依据

- 当前工作区：`D:/16Wordpress_nextjs/.worktrees/cms-responsibility-audit`，分支 `codex/cms-responsibility-audit`。
- 本次从 W0 基线 `7c849af234602cf299cb75e772a0104f77b849cd` fast-forward 至已在本地 develop 的 `05a52794b3b598b35335b3cd7196156c278c3ba3`。法律实现复审 HEAD 为 `47175c13fcc06c61993bd6a3d4097c12e757f5de`，05a52794 追加合并回执。
- [原法律页回执](cms-read-decoupling-legal.md)记录整体独立复审发现两项 P2，随后定向复审确认缺失 nullable 身份字段与表格后正文问题修复，无开放 Critical/Important。沿用该独立验收，不重复实现或再次向 develop 合并。
- 本次仅推进本任务分支；保留未提交的 W0 与整体职责文档。W0 的源哈希继续代表旧基线，不改写成新代码已被 W0 检查。

## 职责划分落地与可复用方式

- CMS 提供通过技术检查的实际标题、日期、正文及 SEO 文案；PHP resolver 与 TS DTO 的读契约不再用旧批准正文相等判断可读性。
- `wordpress/plugins/tio2-site-model/config/tio2-my-legal-read-contract.json` 描述站点、路由、语言、结构和安全边界；PHP/TS 通过共享样例对齐语义。写入/导入批准校验保留。
- 前端负责支持的 Markdown 呈现；metadata 使用 DTO 的实际 title/description，同时保留 canonical、语言和索引政策。H3 与表格后的正文有保留测试。
- 其他页面族可复用“技术身份与安全检查 → 实际 CMS 值投影 → 正文/SEO 共源 → 负例与真实链路证据”的方法，不复制法律特有结构或链接白名单。
- 此样板尚含历史 label/action 映射，不是纯技术职责最终态：`LegalActions` 的显示标签判定和契约中的 `actionBindings` 交 W4a；统计授权配置交 W4b，保留既有 Consent Mode 行为。

## 本次新执行的验证

在上述工作区、05a52794 代码上执行：

```powershell
npx --no-install vitest run tests/unit/legal tests/integration/legal tests/infrastructure/legal-read-contract.test.ts tests/infrastructure/tio2-my-legal-pages-wordpress.test.ts tests/infrastructure/legal-read-runtime-fixture.test.ts tests/infrastructure/wordpress-test-compose.test.ts tests/infrastructure/wordpress-runtime-classification.test.ts tests/unit/analytics/malaysia-ga4.test.tsx tests/unit/rfq/malaysia-rfq-analytics.test.ts
npx --no-install tsc --noEmit --incremental false
git diff --exit-code 47175c13 05a52794 -- components lib wordpress tests
```

- Vitest：13 文件通过、1 文件跳过；227 测试通过、1 跳过，退出码 0（22:06:29 开始）。
- TypeScript：退出码 0；复审版与承接版在上述代码及测试目录无差异，退出码 0。
- PHP 验证包含无网络、只读挂载的隔离 CLI harness 与内存桩，不冒充实际 WordPress 集成。
- 跳过项是需显式开启 `LEGAL_READ_LOCAL_RUNTIME` 的真实 WordPress/Next 浏览器用例。本次没有新建真实 CMS、运行目标站全量构建或产生新的 live 截图。

## 承接的历史真实证据及本次视觉核对

原证据目录：`D:/16Wordpress_nextjs/.worktrees/fix-analytics-config-update/.local-evidence/cms-read-decoupling-legal/legal-read-e902db4b-0f7f-4396-a12c-cdd320b7a620/`。

- 实际读取 `runtime-evidence.json` 与 `cleanup-evidence.json`；真实运行绑定 `2f9a30b73cff407523492a26104c6932b03c44c8`，Build `Q-9vMP1WH0rVqdY937AlM`，为 legal-only 目标路由生产构建，不是全站构建。
- 本次实际查看 `privacy-en-mobile-viewport.png`、`privacy-ms-desktop-viewport.png`、`cookie-en-mobile-consent-dialog.png`：英文移动端更新内容、马来文桌面端 H3 后正文及 Cookie 设置交互截图可见。
- 清理回执记录验收成功，Next/WordPress 已停止、租约释放、临时构建与环境移除；历史端口不代表当前服务。
- 后续 nullable 身份与表格正文修正由定向测试和独立复审覆盖；没有将 2f9a30b7 的真实截图重新标成 05a52794 运行证据。

## 遗留与交付边界

- W4：按钮文案与动作、法律内容与统计授权的既有绑定尚待处理。
- 已知非阻断限制：内联代码含 `[label](` 等字面量时扫描器可能保守拒绝；支持语法不因此扩大，不宣称任意 Markdown 都可读。
- W5/W6：稳定缓存身份、连续更新与当前集成版真实全站构建仍须分别验收。本回执不证明所有页面已解耦。
- 无 main、push、远程写入、Preview/Production 部署、生产 CMS 修改或真实表单外发。新承接文档尚在本任务工作区，未声称已提交或合入 develop。
- 下一工作包是 [W2 产品刷新入口](../superpowers/plans/2026-09-13-my-product-revalidation.md)，执行前重新核对基线及目标文件。
