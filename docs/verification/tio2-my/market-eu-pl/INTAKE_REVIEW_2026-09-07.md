# Poland 单页承接检查

日期：2026-09-07。性质：D16文件与代码只读承接检查；不是Gate 8实现回执、D23批准、实际交出或发布授权。

## 1. 结论与当前身份

Poland适合作为D23→D16的第一个规则验证实例。已存在完整正文、行为合同、三端视觉、交付包及可执行验收要求；本次检查未发现阻止编制开发方案的核心资料缺失。正式开发前须核对本包的成果批准与具体开发授权，不能把文件存在当作授权。

| 项目 | 本次读取值 |
|---|---|
| 网站 / 页面 | `tio2-my` / `MARKET-EU-PL` |
| URL / 语言 | `/markets/poland/` / `en` |
| 当前Manifest | [V0.20](</D:/23MySec/pages/markets/poland/MARKET-EU-PL_CURRENT_GATE_BASELINE_MANIFEST_V0.20.md>) |
| 交付包 | [PL-G6-DELIVERY-01 V0.1](</D:/23MySec/pages/markets/poland/06_handoff/MARKET-EU-PL_GATE6_HANDOFF_PACKAGE_V0.1.md>) |
| 内容/视觉状态 | Manifest记录Gate 1–5 `APPROVED / CLOSED`，沿用其精确批准组合 |
| Gate 6状态 | `PROJECT_CONTROL_REVIEW_PASS_PENDING_USER_APPROVAL`；总控及独立包审查已完成 |
| 开发/实际交出 | Manifest记录Gate 8–10未授权、`HANDED_OFF=NO`；本次任务只做承接检查 |
| D16代码基线 | `main` / `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb`；工作区另有本会话的规则文档修改，未提交 |

用户本轮表示Poland已完成，选它作为实例。该表报告读取到的文件状态，不否定可能尚未同步的对话批准；后续如有有效批准记录，直接引用，不重复审批。不修改D23状态或生成虚假的派发回执。

## 2. 开发时使用哪些源

| 用途 | 唯一输入与使用方法 |
|---|---|
| 身份、有效批准与当前组合 | 上表Manifest，再读取其交付包及批准记录；不凭最高版本或文件头草稿字样判断 |
| 全部正文、标题及链接标签 | [B V0.2](</D:/23MySec/pages/markets/poland/04_planning/MARKET-EU-PL_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md>)；不重新写文案，不用A早期例句覆盖B |
| 动作、SEO及机器语义 | [C V0.4](</D:/23MySec/pages/markets/poland/04_planning/MARKET-EU-PL_GATE2_CONTENT_CONTRACT_V0.4.md>)；其旧草稿状态按后续有效批准记录解释 |
| 完整外观与适用状态 | [完整视觉规格](</D:/23MySec/pages/markets/poland/04_planning/gate5-v0.1/MARKET-EU-PL_GATE5_FULL_VISUAL_SPECIFICATION_V0.1.md>)、批准HTML及[正式图清单](</D:/23MySec/pages/markets/poland/04_planning/gate5-v0.1/approval_core/export-inventory.json>)；HTML用于还原参考，不作为网站部署源码 |
| 开发结果验收 | 交付包§5的`PL-G9-01–12`；直接建立需求→实现→证据映射，不另编竞争标准 |
| 其他页面和发布依赖 | 交付包§6的`PL-DEP-01–06`；按各自owner和允许关闭阶段处理 |

交付包记录旧工作流V2.0；当前治理解释从D23索引读取V3.1。只更新阶段理解，不改包字节、B/C/视觉哈希、页面批准或技术接口。原Gate 5/7文件仍可直接引用。

## 3. D16已有部分与本页差异

检查范围是本地源码，未查询当前WordPress数据、启动服务或验证HTTP响应。

| 部分 | 现有依据 | 本页需要的工作 |
|---|---|---|
| 网站身份 | `sites/tio2-my.ts`、`lib/sites/current-site.ts` | 沿用`tio2-my`，验证其他站无法读取本页 |
| CMS→GraphQL→Next.js | `lib/wordpress/market-page-uk-v01-queries.ts`、EU查询/DTO及对应WordPress模型/seed | 参考既有模式设计Poland内容映射；WordPress须管理完整正文、顺序、链接与元数据，不在前端维护另一套正文 |
| Market页面 | `app/(en)/markets/united-kingdom/page.tsx`和`european-union/page.tsx` | 未找到Poland独立路由及专用内容合同；新增本页路由、数据转换、组件和样式。UK/EU正文结构不同，不整页复制 |
| 全局界面 | `components/sites/tio2-my/malaysia-global-chrome.tsx`及共享法律/Consent | 复用Header/Footer/Logo/Menu/Cookie，当前导航为Markets，来源页面为Poland；验证实际组装 |
| 已有入口 | `tio2-my-market-hub.json`含Poland链接；`tio2-my-market-eu-001.json`含Poland `planned`关系 | 页面实现后核对入口、owner和关系就绪条件；不因有链接就宣称路由已可用，不提前开放索引 |
| RFQ / Documents | 现有`/request-a-quote/`、`/request-documents/`、`/documents/`代码 | 普通导航到准确owner；不新建receiver、不自动选型号/COO或把Poland填成公司所在地。可选RFQ目的国预填暂不作为本页新增要求 |

## 4. 建议的一次开发范围

目标是忠实实现一个有真实CMS数据链的Poland页面，完整走通单页承接和返回验收；本检查不确定未来所有国家页的数据模型，也不启动整站重构。

1. **技术承接设计**：读取相关本地Next.js指南，明确本页语义到WordPress字段/GraphQL/DTO/组件的映射、必需内容缺失处理、scope及缓存策略；记录共享消费者及回退范围。
2. **本页实现**：按批准顺序实现Hero、Material、Product Review、Documents、RFQ五模块；保留四级面包屑与平级URL、两个平级应用说明和全部限定句。该页没有表单、FAQ、型号推荐或专属媒体，不新增这些内容。
3. **SEO及隔离**：精确Title/Description/Canonical、en、WebPage/BreadcrumbList及有效共享实体引用；预览保护与最终索引分开。内容和元数据不能跨站fallback，query不得改变Canonical或泄露表单上下文。
4. **定向验证**：按1440/768/390及适用菜单、Cookie、焦点/hover检查完整页面；覆盖真实WordPress→API→初始HTML、导航owner、scope负向情形、受影响共享/市场页回归，并逐条对应`PL-G9`。需要的本地CMS导入必须属于开发任务范围并使用受控seed。
5. **返回D23**：交付实现版本、可访问本地环境、映射和测试/视觉证据、差异及未决项。由D23对该准确版本独立验收；D16接收并修复具体问题。

RFQ接收、Documents实际邮箱及生产配置、共享法律/Consent和设备覆盖等继续按`PL-DEP`分工，不把所有后置发布项变成开发停止理由，也不在本页工作中未经授权发送真实表单。发布另按目标环境和既有授权执行。

## 5. 本次新鲜核验与限制

机器核验详情：[INTAKE_SOURCE_CHECK_2026-09-07.json](INTAKE_SOURCE_CHECK_2026-09-07.json)。

- 交付包、B正文、C行为合同和批准HTML共4个核心文件，实际SHA-256全部与Gate 6提交登记吻合。
- 交付包36个相对引用全部存在；这只证明可定位，不代表所有来源语义已重新审查。
- 正式图清单中的14张PNG，实际SHA-256全部吻合。
- 本轮打开了1440完整页面图以理解页面组成；没有重新进行14张图的逐张视觉验收。
- 已核对D16相邻Market路由、查询、共享界面及Poland导航配置；未验证本地或生产CMS记录、HTTP可达性、表单交付、浏览器交互和跨站运行。
- 没有修改D23、网站代码、CMS、公开资源、依赖安装、Git提交或部署。保留已有规则改动，本轮仅新增此检查及身份核验JSON。

本次完成的是可追溯的开发前承接检查。后续实际开发必须生成新的实现回执和运行证据，不能把本文件升级为Gate 8完成或Gate 9通过。
