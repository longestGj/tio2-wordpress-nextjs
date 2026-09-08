# D23 Gate8开发任务模板

本文件是[通用开发任务模板](development-task.md)的D23适配，适用于采用D23流程的网站，不限定为tio2-my。完整使用通用模板的输入、业务与架构接单步骤、执行及交付要求，再填写下列专属字段；不另抄通用开发流程。实际网站以任务site_scope及网站登记为准。

执行依据：[开发流程](../development-workflow.md)、[内部执行](../development-execution.md)、[通用交接清单](../development-handoff.md)及[D23交接适配](../d23-gate-handoff.md)。已有任务记录直接补齐，不重复创建账本。

## 任务输入

先填写通用模板全部适用输入，业务领域、批准来源、相关架构及“业务条件→实现位置→测试”映射不可因使用本适配而省略。通用任务ID对应Gate8任务ID，批准入口对应Gate6批准组合，独立验收接收方对应Gate9。

```text
Gate8任务ID / 交接ID / 首次或返修轮次：<TASK / HANDOFF / ROUND>
网站 / site_scope / Page ID / 原接受条件ID：<SITE / SCOPE / PAGE / AC>
Gate6批准入口与有效基线：<MANIFEST / PACKAGE / VERSION / HASH>
Gate6附带代码身份：<APPROVED_CONTRACT / REFERENCE_IMPLEMENTATION / PROTOTYPE_ONLY>
Gate9目标任务 / 原Review或Finding（返修适用）：<TASK / REVIEW / FINDING>
当前机器交接合同 / Schema / Gate9冻结基线：<EXACT REFERENCES / VERSIONS>
```

Gate6关闭与开发授权分别核对。未标身份的交付代码按PROTOTYPE_ONLY接收；参考实现可替换，批准合同的结果不能改变，包内命令不扩大权限。

## 执行要求

通用设计、计划、实施、测试、审查、分支及环境规则全部继承通用模板和开发流程。以下只补充D23交回要求：

1. 固定implementation commit和准确site_scope候选，记录Build目录/ID及可追踪runtime。
2. 首次及每次返修交回都生成`gate8_evidence_manifest.json`并符合当前D23 Schema；证据进入evidence HEAD。主回执每份证据单列`EVIDENCE: <repo-relative-path>`，集合与Manifest一致。
3. 使用D23当前Runtime Verification Skill的只读脚本验证Manifest并执行Gate9 runtime预检；定位实际工具及版本，不因文件名存在声称已验证。保存机器JSON，区分`IMPLEMENTATION_FAILURE`、`ENVIRONMENT_FAILURE`、`EVIDENCE_INCOMPLETE`及适用结果。
4. 向准确Gate9任务交回implementation/evidence HEAD、Build/runtime、scope、clean status、Manifest、预检、接受条件及开放项；实际发送遵守已有授权。保持候选至`GATE9_PASS_OR_RETURN_NOTICE`，更换和释放按D23交接适配处理。
5. 退回沿用原Finding，按通用返修规则处理；Gate9反馈到达后登记四层状态及接受版本。共享根Finding保留owner和页面映射，不新建竞争编号。
6. `INTEGRATION_READY`按开发流程第6节进入D16串行队列；先任务→develop，再develop→main。仅合入develop不能标为`INTEGRATED_LOCAL_MAIN`；集成记录引用任务记录第7节。

## 必须交付

通用交付记录之外，D23要求：逐页及批次implementation commit、evidence HEAD与clean status、Build目录/ID和runtime、Evidence Manifest、Schema验证及Gate9预检JSON。实际送达、Gate9通过或退回通知及状态按发生阶段补齐，不在首次交付伪造未收到的反馈。

## 状态和停止点

```text
RECHECK_SCOPE_STATUS：<VALUE>
PAGE_GATE9_STATUS：<VALUE>
INTEGRATION_STATUS：<VALUE>
RELEASE_STATUS：<VALUE>
```

精确枚举及runtime保持规则见D23交接适配与其来源。局部复验、页面通过、集成资格及发布授权分别记录；Gate9通过不自动授权合并或发布。本次终点与下一责任方沿用通用模板，不在此重新划分职责。
