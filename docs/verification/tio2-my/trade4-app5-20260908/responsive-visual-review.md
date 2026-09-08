# 九页响应式截图人工查看记录

日期：2026-09-08。查看者：D16 主实施 agent。代码 `b325aec6b5121f2ded604bcf3afad7886515990f`；BUILD_ID `UV4ipmsCJ7cj7M2EHPfID`，本地 Next 3216 / WordPress 8186。

已用图像查看工具实际打开下列全部 27 张原始 PNG；不是只依据 JSON、DOM 或测试数量作视觉判断。每行三个文件分别覆盖 1440、768、390 CSS px。

| 页面 | 实际查看的文件（相对本目录） | 可见布局观察 |
|---|---|---|
| RES-TRADE-EU | `runtime/RES-TRADE-EU-1440.png`、`runtime/RES-TRADE-EU-768.png`、`runtime/RES-TRADE-EU-390.png` | 标题、日期限定、税率表、七项交易输入、分开税种、来源和页脚顺序完整；窄屏长标题换行，三列表保持可见；主 CTA 与来源按钮分行。 |
| RES-TRADE-UK | `runtime/RES-TRADE-UK-1440.png`、`runtime/RES-TRADE-UK-768.png`、`runtime/RES-TRADE-UK-390.png` | 浅底首屏与调查/注册限定分层清楚；桌面表格在窄屏成为带字段标签的逐条记录，长商品代码换行；来源和复核注释未被页脚遮挡。 |
| RES-TRADE-IN | `runtime/RES-TRADE-IN-1440.png`、`runtime/RES-TRADE-IN-768.png`、`runtime/RES-TRADE-IN-390.png` | 时间线、排除条件、六行建议金额和两个 681 路径所在表、发票条件依次可见；宽表在平板/手机转换为逐行信息块，没有把数字覆盖到文字上。 |
| RES-TRADE-BR | `runtime/RES-TRADE-BR-1440.png`、`runtime/RES-TRADE-BR-768.png`、`runtime/RES-TRADE-BR-390.png` | 范围/排除、四档税率、独立公益程序、交易输入、EN/PT动作和六项来源完整排布；窄屏表格字段与数值分组清楚。 |
| APP-COAT | `runtime/APP-COAT-1440.png`、`runtime/APP-COAT-768.png`、`runtime/APP-COAT-390.png` | 淡色交替章节、十个模块和两张表保持层级；八个 Grade 的中性标签与动作在窄屏独立排列；三种请求卡片纵向展开；Logo/页脚可见。 |
| APP-PLAS | `runtime/APP-PLAS-1440.png`、`runtime/APP-PLAS-768.png`、`runtime/APP-PLAS-390.png` | 深蓝首屏装饰与白字清楚；系统输入、观察表、树脂问句、Grade 列表和十三项来源按预期重排；手机列表/CTA未超出容器。 |
| APP-MB | `runtime/APP-MB-1440.png`、`runtime/APP-MB-768.png`、`runtime/APP-MB-390.png` | 深蓝首屏、双阶段解释、四张语义表和七个 Grade 顺序保留；手机表头转标签，长条件完整接续；末尾三种请求和技术来源可见。 |
| APP-INK | `runtime/APP-INK-1440.png`、`runtime/APP-INK-768.png`、`runtime/APP-INK-390.png` | 印墨系统、成膜与分散条件分段清楚；四个中性 Grade 与三种请求卡片重排；失效 Applications breadcrumb 只保留文字；六项来源与页脚衔接完整。 |
| APP-PAPER | `runtime/APP-PAPER-1440.png`、`runtime/APP-PAPER-768.png`、`runtime/APP-PAPER-390.png` | 深蓝首屏与纸张系统输入、四项光学指标、证据范围、实验室筛选、两个中性 Grade 和七项来源层级清楚；手机逐条展开，没有挤压标题或遮挡 CTA。 |

页面统一的 primary/reverse Logo、桌面导航/紧凑菜单切换及页脚有可见证据。三种宽度均未观察到页面级横向溢出、文字重叠、内容被裁掉或原型模拟导航残留；运行几何与真实字体加载断言提供对应量测。正文表格的精确内容和 `th/headers/scope` 关联另由批准正文对比及语义测试覆盖。

本记录的人工查看重点是整体层级、重排、完整性和明显视觉缺陷，不把缩小显示的超长整页图当作逐字人工校稿，也不替代内容负责人或屏幕阅读器验收。原始文件可用于放大复核；200%原生分段和菜单补录由 [独立原生视觉记录](native-visual-review.md)另行说明。其他浏览器、实体设备、实际收件和正式 Gate 9 仍在交付回执的开放项中。
