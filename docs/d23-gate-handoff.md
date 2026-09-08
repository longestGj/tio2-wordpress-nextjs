# D23 Gate 6→8 与 Gate 8→9 交接清单

本文件是[通用开发交接清单](development-handoff.md)的D23适配。通用接单输入、业务/架构定位、条件→实现→测试映射、交付证据和返修规则必须执行；这里只维护D23接口差异。适用于采用D23流程的网站，不把Gate编号、Schema或工具强制用于其他策划项目。

来源：[工作流V3.2](D:/23MySec/docs/architecture/GATE_WORKFLOW_V3.2.md)、[Gate8→Gate9机器交接合同V1.0](D:/23MySec/docs/architecture/GATE8_GATE9_EVIDENCE_HANDOFF_CONTRACT_V1.0.md)、[Evidence Manifest Schema V1.0](D:/23MySec/docs/architecture/GATE8_EVIDENCE_MANIFEST_SCHEMA_V1.0.json)、[Gate9当前基线](D:/23MySec/docs/architecture/GATE9_AGENT_SKILL_CURRENT_BASELINE_MANIFEST_V1.0.md)。这些是现有登记来源；接单通过策划当前入口核对有效版本，不凭文件名猜测。本文不修改D23文件或批准状态。

使用[通用任务模板](templates/development-task.md)和[D23 Gate8模板](templates/d23-gate8-development-task.md)组织任务，用[任务记录](templates/development-task-record.md)保存同一份实际记录。

## 1. Gate 6→Gate 8：策划交给开发

| 通用概念 | D23映射/附加要求 |
|---|---|
| 批准输入 | Gate6有效批准组合、交付包、Manifest及原接受条件ID；Gate6关闭不自动授权Gate8开发 |
| 开发任务 | 准确Gate8任务ID、交接ID、首次/返修轮次、site_scope及Page ID |
| 交付代码身份 | APPROVED_CONTRACT / REFERENCE_IMPLEMENTATION / PROTOTYPE_ONLY；未标身份按PROTOTYPE_ONLY接收 |
| 独立验收目标 | 准确Gate9任务及有效验收合同、Schema、冻结基线 |
| 编号与共享问题 | 接受条件ID贯穿6→8→9，保留ROOT-*共享Finding及owner映射，不重编外部编号 |

### 交付内容与D16接收检查

完整输入及检查直接执行[通用清单第1节](development-handoff.md#1-批准输入交给开发)。D23原批准正文、视觉、行为、技术合同和授权保持其范围；参考实现可替换但批准结果不能改变。历史“草稿/未授权”标记结合有效后续批准解释，不改写历史原件。

### Gate 8收到后必须留下的接单结果

执行[通用接单结果](development-handoff.md#接单结果)：必须定位D16业务领域、实际批准版本和相关软件架构，建立业务条件→实现位置→测试对应。另保存本节D23身份及原条件ID；可执行、部分可执行和受阻范围沿用通用定义，不增加接单审批。

## 2. Gate 8→Gate 9：开发交给独立验收

发送方为D16实施负责人，接收方为准确D23只读验收任务；完整交付内容按[通用清单第2节](development-handoff.md#2-开发交给独立验收)。

### 主回执必须覆盖的内容

通用证据之外，D23首次及返修交回必须提供`gate8_evidence_manifest.json`及当前Schema验证结果。Manifest至少绑定任务/交接身份、site_scope、Page ID、原接受条件ID、repository/branch/baseline/implementation/evidence HEAD、工作树检查时间、Build目录/ID、runtime身份及路径检查、证据路径与SHA-256、主回执和开放项。

证据使用仓库相对路径并进入指定evidence HEAD；Git换行过滤导致工作树字节与commit blob不同的，分别记录SHA-256与blob ID。主回执每份证据单列`EVIDENCE: <repo-relative-path>`，集合与`receipt_evidence_references`完全一致。

### 交回前检查与缺项处理

1. 先执行通用交回前检查；用D23当前工具验证Manifest并执行Gate9 runtime预检，保存机器JSON，准确区分实现、环境和证据失败。核心身份/环境/证据不足时不能签受阻条件通过。
2. 局部可验与未关闭页面整体状态分别记录；允许后置的发布依赖不自动变成代码缺陷。Gate9整体关闭由其有效规则与授权决定。
3. runtime的`hold_until`为`GATE9_PASS_OR_RETURN_NOTICE`，保持同一候选直到Gate9向原Gate8任务发出通过、返修/补证或明确释放通知。需更换时先交回新的implementation、evidence、Build/runtime身份及差异；无法保持时如实标为受影响条件环境失败或未验证。
4. 实际送达规则沿用通用清单。收到反馈后保存Review ID、准确implementation/evidence/Build/runtime及结论，不能把面板排队当送达。

## 3. Gate 9退回Gate 8及最终接收

通用返修、证据继承、恢复和停止规则按[通用清单第3节](development-handoff.md#3-退回接收与后续集成)执行。D23返回同时保存`RECHECK_SCOPE_STATUS`、`PAGE_GATE9_STATUS`、`INTEGRATION_STATUS`、`RELEASE_STATUS`及依据，局部复验通过不能改成页面整体通过，Gate10未授权单独保留。

`INTEGRATION_READY`仅表示具备集成资格，实际任务→develop→main按[开发流程第6节](development-workflow.md#6-分支开发机器交回与串行集成)串行处理，不在此维护第二套队列。D23外部枚举保持原合同，develop结果另记；未实际合入main并验证不能使用`INTEGRATED_LOCAL_MAIN`。资格不授予合并、push、部署或发布权限。

## 4. Poland 对应关系

以下是历史实例，不是当前整站状态，也不自动启动任务：

- Gate6输入：`PL-G6-DELIVERY-01`引用正文/合同/完整视觉，`PL-G9-01…12`为接受条件，`PL-DEP-01…06`为依赖。
- Gate8输出：最终53文件快照、新Build、CMS/API/初始HTML映射、测试及原图，见[Poland实例](examples/poland-development-handoff.md)。
- Gate9结果：`PL-G9-RECHECK-04`接收F01/F02/F03及E03采集问题；该轮本地接线已验，外部接收、Applications及发布条件仍按原责任保留。它说明实现返修可以停止而页面整体仍未关闭，后续状态须查新证据。
