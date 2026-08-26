# TIOVAR 项目文件治理与交付边界设计

## 1. 状态与批准记录

- 状态：已批准设计，等待用户对书面规格做最终复核。
- 日期：2026-08-26。
- 适用仓库：`D:\16Wordpress_nextjs`。
- 外部资料库：`D:\11SEO\01ComInfo`。
- 批准选择：方案 B，即“外部原始资料库 + Git 技术资产 + WordPress 页面内容”。
- TDS 批准人：用户本人。TDS 不设置独立技术审核人、法律审核人或复杂审批流程。
- 网站开发方式：不设置网站开发 Agent；由 controller 对每个功能直接执行适用的 Superpowers 设计、计划、TDD、审查和验证流程。

## 2. 目标

建立一套简单、可持续、可追踪的文件边界，使原厂资料、TIOVAR 产品事实、自有 TDS、WordPress 页面内容和 Next.js 网站代码各有唯一职责，并防止未完成研究或临时产物进入公开网站。

成功标准：

1. 网站运行时不直接读取 `D:\11SEO`。
2. 原厂文件保持只读，不被自有品牌文件覆盖。
3. 每个正式技术参数可以追踪到具体原厂资料。
4. WordPress 页面编辑不能改变 Git 管理的正式技术事实。
5. 只有用户批准的 PDF 可以进入公开目录。
6. Site A 可以独立演进，Site B 保持冻结边界。
7. 竞品、关键词和市场研究在完成前不进入网站仓库、TDS 或公开页面。

## 3. 非目标

本设计不执行下列工作：

- 不移动或重命名 `D:\11SEO\01ComInfo` 的现有文件。
- 不完成竞品、关键词或市场研究。
- 不创建产品页、应用页或 Homepage 链接。
- 不修改 WordPress 数据或生产媒体库。
- 不执行部署、DNS、索引、迁移或任何远程写入。
- 不把现有单应用仓库改造成 Turborepo 或多应用 monorepo。
- 不建立新的项目级 Agent 或 Skill。

## 4. 现有系统边界

仓库继续采用一个 Next.js App Router 应用服务两个站点：

- Site A：正常业务页面和模板开发目标。
- Site B：保留在共享代码和 WordPress 中，但业务页面和模板冻结，除非用户另行改变范围。
- WordPress：负责可编辑页面内容、Preview、发布状态和站点归属。
- Next.js：负责站点解析、模板渲染、SEO、公开静态文档和 WordPress 数据组合。
- GitHub：负责代码、正式技术事实、品牌资产源文件、自有 TDS 源文件和公开 PDF 的版本记录。

现有顶层 `app/`、`components/`、`lib/`、`sites/`、`wordpress/`、`scripts/`、`tests/` 和 `docs/` 结构保持，不迁移到 `src/`。

## 5. 双层资料库

### 5.1 外部资料库

`D:\11SEO\01ComInfo` 是原始证据和未完成研究的资料库，不是网站运行时数据源。

未来可在单独获批的整理任务中逐步形成：

```text
D:\11SEO\01ComInfo\
├── 00-inbox\
├── 10-original-sources\
├── 20-research\
├── 30-brand-concepts\
├── 40-working\
└── 90-archive\
```

当前竞品、关键词和市场研究尚未完成，因此：

- 不移动它们以制造“已完成”的假象。
- 不复制到网站仓库。
- 不写入产品事实。
- 不写入 TDS。
- 不创建 Equivalent、alternative、competitor 或 SEO 声明。

### 5.2 网站仓库

`D:\16Wordpress_nextjs` 只保存经选择进入正式制作流程的资料和实现：

```text
D:\16Wordpress_nextjs\
├── app\
├── components\
├── lib\
│   ├── catalog\
│   ├── documents\
│   ├── seo\
│   └── wordpress\
├── sites\
├── content\
│   └── products\
├── assets\
│   └── brand\
│       └── tiovar\
├── documents\
│   └── tds\
├── public\
│   ├── brand\
│   └── documents\
│       └── tds\
├── wordpress\
├── docs\
├── scripts\
├── tests\
└── .tmp\
```

这些目录按需要创建，不预先生成空目录或假数据。

## 6. 产品事实

每个进入正式制作的产品拥有一个稳定、小写的产品 ID。首个产品为 `tp-c120`。

建议文件：

```text
content/products/tp-c120/record.yaml
```

`record.yaml` 是该产品正式技术事实的唯一 Git 来源，至少包含：

- TIOVAR 产品 ID 和展示型号。
- 对应原厂型号。
- 产品族和应用范围。
- 规格值、单位和来源引用。
- 原厂事实与 TIOVAR 文案的明确区分。
- 每条非定量声明的验证状态。

禁止写入：

- 未完成的竞品映射。
- 关键词和搜索量。
- 市场排名或商业优先级。
- 未验证的 equivalent 或 drop-in replacement 声明。
- 没有资料来源的数值。
- 未确认的认证、制造能力或法规资格。

`source_confirmed` 只表示原厂资料中存在该事实，不表示已经在客户配方、目标工艺或终端应用中验证。

## 7. 品牌资产

品牌源文件位于：

```text
assets/brand/tiovar/
├── source/
└── licenses/
```

`source/` 保存主 Logo、反白版本、单色版本、图标、品牌板和包装设计源文件。`licenses/` 保存字体、图片和外部素材的授权记录。

网站实际使用的优化文件位于：

```text
public/brand/tiovar/
```

只有用户批准的版本可以复制到 `public/`。未确认注册状态前不得使用 `®`。包装中的责任主体措辞必须与用户确认的真实业务角色一致。

## 8. TDS 文件

### 8.1 简化目录

每个产品的 TDS 只保留可编辑源文件和紧凑来源记录：

```text
documents/tds/tp-c120/
├── tiovar-tp-c120-en.docx
└── sources.yaml
```

`sources.yaml` 记录：

- TIOVAR 产品 ID。
- 原厂文件名和文件哈希。
- TDS 中使用的参数与原始来源对应关系。
- TDS 版本和语言。
- 当前状态：`draft` 或 `user-approved`。

不创建 `approvals/` 目录，不要求独立技术审核或法律审核文档。

### 8.2 临时预览

候选 PDF、页面渲染和检查图片统一位于：

```text
.tmp/tds/tp-c120/
```

`.tmp/` 必须被 Git 忽略，不得被网站访问。仓库根目录不再使用未忽略的 `tmp/` 保存检查产物。

### 8.3 用户批准与公开 PDF

TDS 状态只有：

```text
draft -> user-approved
```

用户批准后，controller 才能把最终 PDF 放入：

```text
public/documents/tds/tiovar-tp-c120-en-v1.0.pdf
```

公开文件使用版本化文件名，不使用内容会静默变化的 `latest.pdf`。新版发布时，WordPress 页面改为引用新文档 ID；旧文件是否继续保留由当次版本任务设计决定。

## 9. WordPress 与 Next.js 数据流

WordPress 管理：

- 页面标题和正文。
- SEO 标题与描述。
- FAQ、CTA 和展示顺序。
- 页面状态、站点归属和 Preview。
- 产品记录 ID。
- 当前 TDS 文档 ID。

WordPress 不重复管理 TiO2 含量、粒径、pH、油吸收等正式技术参数。

Next.js 在未来获批的产品页面功能中：

1. 根据当前站点限制 WordPress 内容。
2. 从 WordPress 页面取得产品记录 ID 和 TDS 文档 ID。
3. 从 Git 管理的产品记录取得正式技术事实。
4. 验证产品记录、文档和 Site A 页面引用一致。
5. 将页面内容、技术事实和公开 PDF 链接组合成 Site A 页面。

任何缺失、未知或跨站引用必须失败关闭，而不是显示另一产品或 Site B 内容。

Homepage 在用户另行批准前继续禁止产品页和应用页链接。

## 10. Controller 与任务边界

### 10.1 Controller

Controller 负责：

- 维护设计和实施顺序。
- 确认任务范围及 Site A/Site B 边界。
- 组织用户审批。
- 合并 TDS 任务产物。
- 对每个网站功能直接执行适用的 Superpowers 流程。
- 只运行与当前改动直接相关的测试。
- 防止部署、迁移、DNS、索引和远程写入越权。

### 10.2 TDS 任务

现有独立 TDS 任务可以：

- 只读检查 `D:\11SEO\01ComInfo`。
- 制作 TDS 内容模型、可编辑源文件和候选 PDF。
- 提供紧凑来源记录和临时预览。

它不得：

- 覆盖原厂资料。
- 写入竞品、关键词或市场研究结论。
- 自行批准 TDS。
- 自行复制文件到 `public/`。
- 修改 WordPress。
- 提交、部署或确定正式公开 URL。

### 10.3 网站开发

不设置网站开发 Agent。每个网站功能均由 controller 单独分类和设计，并遵循：

```text
brainstorming
-> 用户批准设计
-> writing-plans
-> TDD 实施
-> 代码审查
-> 相关测试与验证
```

一次批准只覆盖当次明确功能，不自动授权后续页面、Homepage 链接、部署或发布。

## 11. Git 与提交边界

提交保持单一职责，例如：

```text
content: add TP-C120 product record
docs: add TP-C120 editable TDS source
assets: add approved TIOVAR web assets
feat: add Site A product record resolver
feat: add Site A TP-C120 page template
```

禁止把产品事实、TDS、WordPress 字段、页面模板和大量临时图片混在同一个提交中。

实施本设计时应单独处理当前未跟踪的 `tmp/01cominfo-inspection`，并保留用户或 Next.js 产生的其他未提交修改，除非当次任务明确授权处理。

## 12. 未来实施顺序

本设计批准后，实施仍拆成独立任务，每项重新经过 Superpowers 设计门禁：

1. 建立目录、忽略规则和产品记录契约。
2. 接收并整理用户批准的 TP-C120 TDS 产物。
3. 整理用户批准的 TIOVAR 品牌资产。
4. 建立 Site A 产品记录读取与验证基础设施。
5. 设计 WordPress 产品页面引用字段。
6. 设计 Site A 产品详情页和 TDS 下载组件。
7. 设计产品列表页和应用页。
8. 仅在用户单独批准后调整 Homepage 产品或应用链接。
9. 仅在竞品、关键词和市场研究完成并获批后设计相应内容。

## 13. 测试与验收原则

目录和产品记录基础设施未来至少需要：

- 产品记录 schema/解析测试。
- 缺少来源、非法单位、重复产品 ID 和未知状态的失败测试。
- 文档 ID 与公开 PDF 文件一致性测试。
- Site A/Site B 引用隔离测试。
- `public/` 中不存在 draft TDS 的检查。
- `.tmp/` 不进入 Git 的检查。

正常开发只运行与当前改动直接相关的测试。`verify:root-only`、正式迁移、部署、DNS、索引、远程写入和生产操作继续需要新的明确授权。

## 14. 验收标准

本设计实施完成后：

1. 原始资料、产品事实、TDS 源文件、公开 PDF 和 WordPress 内容边界明确。
2. TP-C120 可以从原厂 CR-510+ 资料追踪到自有 TDS 和公开 PDF。
3. 用户是 TDS 唯一批准人。
4. 网站开发没有额外 Agent 层，由 controller 使用 Superpowers 直接推进。
5. 未完成研究无法进入 TDS 或公开站点。
6. Site B 未被业务页面或模板开发影响。
7. Homepage 链接限制、测试限制和生产操作限制保持不变。
