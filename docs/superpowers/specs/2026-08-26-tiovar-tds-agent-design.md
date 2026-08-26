# TIOVAR TDS Agent 设计

## 1. 状态与适用范围

- 状态：聊天设计已获用户批准，等待用户复核本书面规格。
- 日期：2026-08-26。
- 适用仓库：`D:\16Wordpress_nextjs`。
- Agent ID：`tiovar-tds-agent`。
- 人工基准：任务“04制作 TIOVAR 自有 TDS”最终形成的 TP-C120 v0.2 制作与审核结果。

本 Agent 是网站仓库内唯一获批的项目专属非编程 Agent。它只负责制作和审核 TIOVAR 英文 TDS，每次只处理一个产品牌号。网站功能开发仍不设置 Agent，继续由 controller 使用适用的 Superpowers 流程执行。

## 2. 已批准的核心决策

1. Agent 定义和全部交付物保存在网站仓库，不放入 `D:\11SEO`。
2. `D:\11SEO\01ComInfo` 仅作为只读原始资料来源。
3. Agent 直接在当前工作区运行，不创建 worktree、分支或独立 Run 目录。
4. Agent 不依赖 `content/products/` 才能制作 TDS，也不负责维护网站产品数据。
5. 每个产品的 DOCX、审核 PDF 和来源记录统一放入 `documents/tds/<product-id>/`。
6. 用户是唯一批准人，状态只有 `draft -> user-approved`。
7. 用户批准后，由 controller 将批准的 PDF 复制到 `public/documents/tds/`。
8. PDF 进入 `public/` 不自动授权在 WordPress、产品页、Homepage 或其他页面添加链接，也不授权部署。
9. Agent 可以调用适用 Skills，并允许持续完善自身 SOP；不得借此改变本规格规定的权限和业务边界。

本规格对《TIOVAR 项目文件治理与交付边界设计》中“不建立新的项目级 Agent”作一项有限例外：只新增 `tiovar-tds-agent`。该例外不扩展到网站开发 Agent、其他品牌 Agent 或其他文档类型。

## 3. Agent 包结构

采用极简但可重复的正式 Agent 包：

```text
.agent/tiovar-tds-agent/
├── AGENT.md
├── templates/
│   ├── tiovar-tds-template.docx
│   └── sources.template.yaml
└── scripts/
    ├── build_tds.py
    └── verify_tds.py
```

职责如下：

- `AGENT.md`：唯一正式入口，集中定义身份、触发条件、输入、流程、审核规则、输出和禁止事项。
- `tiovar-tds-template.docx`：以已批准的 TP-C120 v0.2 为人工视觉基准，保存统一的 TIOVAR 英文 TDS 信息结构和版式。
- `sources.template.yaml`：定义每份 TDS 的紧凑来源记录格式。
- `build_tds.py`：根据已核实的单产品事实生成 DOCX 和 PDF。
- `verify_tds.py`：检查来源、参数、禁用表述、文件一致性和 PDF 可读性。

不为本 Agent 再拆分 `WORKFLOW.md`、`RUNBOOK.md`、`DATA_CONTRACTS.md`、`OUTPUT_STRUCTURE.md` 或独立 SOP 文件。

## 4. 输入契约

一次制作至少需要：

- 一个 TIOVAR 产品 ID，例如 `tp-c120`；
- 一个 TIOVAR 展示型号，例如 `TP-C120`；
- 明确的对应原厂牌号；
- 用户指定或已确认的原厂 TDS 文件；
- 已批准使用的 TIOVAR Logo 和 TDS 模板；
- 输出语言，v1 固定为英文；
- 当次用户提出的产品特定要求。

Agent 不自行从竞品研究、关键词研究、市场研究、网站页面或包装概念图推导技术事实。品牌板、网站效果图和包装效果图只能控制视觉方向；除非用户另行确认，它们不能证明法律主体、包装规格、联系方式、注册商标状态或产品性能。

## 5. 证据与内容规则

证据优先级为：

1. 用户指定的原厂 TDS 中可定位的技术事实；
2. 用户明确确认的 TIOVAR 产品身份和法律信息；
3. 基于原厂事实形成的审慎 TIOVAR 编辑性表述；
4. 未确认项目，必须保持 `Unknown`、省略或进入 `HOLD`。

必须遵守：

- 数值、单位、项目名称和定性描述必须与来源一致。
- 定性描述不得改写成定量结论。
- 不得虚构测试方法、容差、包装、保质期、SDS/COA 主体、联系方式、制造主体、认证或法规状态。
- 不得未经批准使用 `equivalent`、`drop-in replacement`、`Proven Performance`、自有制造、注册商标或类似扩大性声明。
- 原厂事实、TIOVAR 编辑性表述、用户决定和未确认字段必须能够区分。
- 缺失、不可用和冲突不得转换为 0、否或负面结论。

## 6. 产品交付结构

每个产品只保留三个制作文件：

```text
documents/tds/<product-id>/
├── tiovar-<product-id>-en.docx
├── tiovar-<product-id>-en.pdf
└── sources.yaml
```

例如：

```text
documents/tds/tp-c120/
├── tiovar-tp-c120-en.docx
├── tiovar-tp-c120-en.pdf
└── sources.yaml
```

`sources.yaml` 至少记录：

- 产品 ID、TIOVAR 型号和对应原厂型号；
- 语言、文档版本和 `draft`/`user-approved` 状态；
- 原厂来源文件路径和 SHA-256；
- TDS 中各技术参数与来源位置的对应关系；
- 未确认字段、冲突和限制；
- DOCX 与 PDF 文件哈希。

不在仓库中建立 `.tmp/tds/`、候选目录、审批目录或 Run 目录。渲染检查产生的预览只作为当次临时验证材料，不作为仓库交付物保存。

## 7. 制作与审核流程

固定流程为：

```text
确认单一产品身份和原厂资料
-> 提取并登记有来源的事实
-> 生成 TIOVAR 英文 DOCX
-> 生成同内容 PDF
-> 执行事实、来源、措辞和版式审核
-> 将三个 draft 文件写入 documents/tds/<product-id>/
-> 等待用户批准
```

审核必须覆盖：

- 产品身份与原厂牌号没有混用；
- 所有技术参数与来源一致并可追踪；
- 禁用表述数量为 0；
- 未确认法律和供应链字段没有被补猜；
- DOCX 与 PDF 的正文内容一致；
- PDF 页面不存在截断、重叠、乱码、不可读文本或破损表格；
- `sources.yaml` 可解析，来源文件哈希与读取时一致。

Agent 只有在 DOCX、PDF 和 `sources.yaml` 均生成且验证通过时，才能报告“draft 制作完成”。这不等于用户批准。

## 8. 异常处理

- 必需的原厂 TDS、产品映射或品牌模板缺失：停止并返回 `HOLD`，不生成猜测性成品。
- 产品身份错误或混入其他产品、品牌、语言：停止并返回 `HOLD`。
- 同一技术事实在来源之间冲突：列出冲突并停止受影响 TDS 的完成声明。
- 非关键法律或联系字段未确认：保持 `Unknown` 或从客户版正文省略，允许生成明确标记为 draft 的审核文件。
- DOCX 转 PDF 或视觉验证失败：状态保持未完成，不得把失败文件交付为可批准版本。
- 已有同名文件：先识别当前状态和用户修改，不得静默覆盖用户已批准或已编辑的内容。

## 9. 用户批准与 public 边界

Agent 无权把自身结果标记为 `user-approved`。用户明确批准后，controller 才可以：

1. 记录 `sources.yaml` 状态为 `user-approved`；
2. 确认待复制 PDF 与用户审核的 PDF 哈希一致；
3. 使用版本化文件名复制到：

```text
public/documents/tds/tiovar-<product-id>-en-v<version>.pdf
```

文件进入 Next.js `public/` 后，在包含该文件的版本部署时可以通过直接 URL 访问。它仍不会自动出现在网站页面上。添加 WordPress 引用、产品页链接、Homepage 链接、站内导航、部署或其他公开操作，均需要单独的用户授权。

## 10. 运行与权限边界

Agent 可以：

- 只读检查用户指定的本地原厂资料；
- 调用适用的文档、PDF、表格、调试、测试和验证 Skills；
- 在当前工作区维护自己的 `AGENT.md`、模板和脚本；
- 写入本规格规定的 `documents/tds/<product-id>/`。

Agent 不得：

- 创建 worktree、分支或独立运行仓库；
- 修改或覆盖 `D:\11SEO\01ComInfo` 原始资料；
- 制作其他品牌、中文 TDS、SDS、COA 或其他文档类型；
- 使用未完成的竞品、关键词或市场研究结论；
- 自行批准或自行写入 `public/`；
- 修改 WordPress、产品页面、网站链接或 Homepage；
- 部署、迁移、DNS、索引、远程写入或生产操作；
- 自动提交 Git。

## 11. 验证场景

实现至少验证以下场景：

1. 正常场景：TP-C120/CR-510+ 能按照 v0.2 人工基准生成并通过审核。
2. 缺资料：缺少原厂 TDS 或关键产品映射时返回 `HOLD`，不补猜。
3. 错误身份：混入其他产品、品牌或语言时阻断。
4. 禁用声明：输入或生成内容包含未经批准的扩大性表述时阻断。
5. 来源冲突：参数不一致时保留冲突并停止完成声明。
6. 视觉失败：PDF 截断、重叠、乱码或不可读时不得完成。
7. 权限边界：draft 制作不得写入 `public/`、WordPress 或网站页面。

## 12. 验收标准

设计实施完成后必须满足：

1. `.agent/tiovar-tds-agent/AGENT.md` 是唯一正式入口。
2. TP-C120 v0.2 已转化为可复用模板和正常场景人工基准。
3. Agent 可在不创建 worktree 的情况下完成单一 TIOVAR 英文 TDS。
4. 每个产品的永久制作产物只有 DOCX、PDF 和 `sources.yaml`。
5. 所有技术参数可追踪且不存在无来源的产品声明。
6. Agent 的内部审核不能替代用户批准。
7. 只有 controller 在用户批准后才能将 PDF 复制到 `public/`。
8. 进入 `public/` 不自动修改页面、添加链接或触发部署。
9. Site B、Homepage 限制和网站开发的 Superpowers 工作方式不受影响。
