# 网站与策划来源登记

更新：2026-09-12。依据：用户明确D16负责多个网站的开发、测试及发布，D23是当前承接实例，D11负责另一网站策划。

本文件只登记身份和入口，不复制页面进度或宣称网站已上线。运行时身份仍由`sites/`及实际CMS配置实现；新增登记不会自动新增代码或部署。

系统的模块、数据流、共享CMS逻辑隔离及开发/预发布物理隔离见[当前软件架构](software-architecture.md)。早期双站设计保留历史范围，不能覆盖这里登记的当前网站，也不能作为远程部署证明。

## 当前关系

D16按网站与业务领域维护的说明和来源索引见[业务文档入口](business/README.md)。本表只负责网站身份；业务规则、跨页流程及未决项进入对应网站业务目录，具体任务再固定采用版本。

| 网站ID | 网站 / 配置域名 | 策划来源 | 开发边界 |
|---|---|---|---|
| `tio2-my` | TiO₂ Malaysia / `tio2malaysia.com` | `D:\23MySec` | 当前主要承接实例；按具体页面或共享功能的有效授权推进 |
| `tio2-a` | TIOVAR / `tio2products.com` | 历史资料见`D:\11SEO\01ComInfo`及仓库规格；后续承接入口按具体任务确认 | 保留既有实现；Homepage产品/应用链接限制继续有效 |
| `tio2-b` | TiO2 B / `tio2hub.com` | 当前未指定新的策划交付入口 | 业务页面和模板冻结 |
| 待绑定 | D11负责的另一网站 | `D:\11SEO` | 用户已明确其策划空间定位；准确网站ID、品牌及域名在该站实际承接时核对，不自动绑定到Site A或Site B |

D11行表示待明确的承接关系，不表示已经新增第四个运行站点。现有域名来自`sites/tio2-*.ts`，不能据此推断部署、DNS或索引状态。

## D23 当前承接入口

- 策划背景：[PROJECT_CONTEXT](</D:/23MySec/PROJECT_CONTEXT.md>)。
- 当前资料导航：[01_PROJECT_INDEX](</D:/23MySec/01_PROJECT_INDEX.md>)。
- 策划进度导航：[00_PROJECT_STATUS](</D:/23MySec/00_PROJECT_STATUS.md>)；具体批准组合回读该页当前Manifest。
- 阶段职责：[Gate工作流V3.2](D:/23MySec/docs/architecture/GATE_WORKFLOW_V3.2.md)。这是2026-09-07经D23项目索引及Poland复验核对的入口；后续通过D23索引定位生效版本，不按最大版本号猜测。
- D16技术交付证据：`docs/verification/`对应页面或功能。旧证据保留原文件名与Gate编号。

这些绝对路径是本机策划来源定位，不是生产运行依赖。其他机器承接时提供等价的可访问交付包，并保持批准版本可追溯。

## `tio2-my`环境登记

| 环境 | 用途 | 身份与边界 |
|---|---|---|
| feature runtime | 页面或共享功能开发中的定向验证 | 绑定任务分支、独立端口/Build；不能代表本地集成结果 |
| local prerelease | 本地`main`集成后的权威全站本地测试 | Docker项目`d16-tio2-my-prerelease`；Next `127.0.0.1:3100`，独立WordPress `127.0.0.1:8180`，MariaDB不暴露主机端口；详见[操作说明](prerelease-environment.md) |
| remote Preview | 获明确授权后的远程预览 | 单独记录部署、CMS和配置身份 |
| Production | `https://tio2malaysia.com`；CMS `https://cms.tio2malaysia.com`；Oracle VPS 固定发布程序 | 2026-09-11首次接管完成；日常发布与回退见[发布工具](production-deployment.md)，当前版本与验收见[生产记录](verification/2026-09-11-tio2-production-adoption.md) |

生产运行手册为[TiO₂ Malaysia 生产运行手册](production-deployment.md)。阶段一适配状态按已验证实现登记：

| 发布类型 | 适配状态 | 主体与边界 |
|---|---|---|
| `frontend-only` | `installed` | `tio2-my`；当前只接受已验证兼容事务 |
| `content-only` | `not-installed` | 合同可识别；写动作失败关闭 |
| `combined` | `not-installed` | 合同可识别；写动作失败关闭 |
| `cms-platform` | `not-installed` | `cms` 仅允许阶段一 `status` |
| `host-infrastructure` | `not-installed` | 阶段一 sudoers 不开放 host 动作 |

本地预发布的 `HEALTHY` 不表示发布侧集成、生产动作或最终验收已经通过。详细控制器合同见[发布架构](release-architecture.md)。

## 新网站接入时补齐

沿用本文件新增一条准确身份记录，并链接该网站自己的承接记录，至少明确：

- 稳定网站ID、品牌/业务实体、语言、市场、批准域名及策划负责人或入口。
- 当前批准交付包、页面身份与URL、使用的验收流程。
- 技术承接方式：复用现有应用/CMS还是独立应用/CMS，以及共享组件边界。
- 本地/Preview/Production目标、配置和密钥的存放位置、收件绑定、发布与回退责任。记录配置位置，不写密钥值。

尚未决定的字段明确标记待确认。只阻止依赖该信息的动作，不阻止独立的阅读、设计或实现工作。不预建空网站、空Agent或整套空目录。
