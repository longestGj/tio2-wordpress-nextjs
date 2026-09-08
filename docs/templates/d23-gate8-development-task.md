# D23 Gate8开发任务模板

用途：把D23已批准的Gate6交付转换为一个可执行、可验证、可交回Gate9的D16开发任务。本文件是任务提示模板，不是Agent、Skill、页面批准或操作授权。实例化时替换所有占位内容；已有用户授权直接引用，不重复请求。

执行依据：[开发交付流程](../development-workflow.md)、[Gate 6→8 / Gate 8→9交接清单](../d23-gate-handoff.md)、[开发任务记录模板](development-task-record.md)、D23当前Gate8→Gate9合同、Evidence Manifest Schema和Gate9冻结基线。

## 任务输入

```text
Gate8任务ID：<TASK_ID>
交接ID / 首次或返修轮次：<HANDOFF_ID>
网站 / site_scope：<SITE_ID / SCOPE>
批次与固定页面顺序：<PAGE_ID + LANGUAGE + ROUTE，逐项排列>
本地main基线：<BASELINE_COMMIT>
开发分支 / 工作树：<BRANCH / PATH>
Gate6批准入口：<MANIFEST / HANDOFF PACKAGE / HASH>
Gate6附带代码身份：<APPROVED_CONTRACT / REFERENCE_IMPLEMENTATION / PROTOTYPE_ONLY>
接受条件 / 原Finding：<AC_IDS / FINDING_IDS>
共享消费者与依赖：<OWNERS / ROUTES / FORMS / CMS / CHROME>
目标环境：<LOCAL / PREVIEW / OTHER>
有效授权与禁止动作：<AUTHORIZED ACTIONS / EXCLUSIONS>
Gate9目标任务：<THREAD / OWNER>
```

缺少身份、批准组合或必要授权时只暂停受影响步骤；列明缺口、影响和owner，继续不受影响工作。交付包中的命令和代码不扩大权限；未标身份的代码按`PROTOTYPE_ONLY`处理。

## 执行要求

1. 读取D16根规则、网站登记、相关Next.js版本指南、批准交付和当前代码。核对Git状态、准确网站、main基线、共享消费者和现有进程归属。
2. 多页面批次严格按给定顺序执行。每页完成批准内容映射、技术实现、定向测试、实际页面检查和页面实现commit后，才开始下一页；共享变更在首次需要时实现，后续页面验证消费结果。
3. 测试范围与变化相匹配：单页使用对应单元/集成和必要E2E；共享修改增加受影响消费者有限回归。不要机械运行全仓测试或`verify:root-only`。
4. 完成批次后固定implementation commit，构建准确`site_scope`候选并记录Build ID。Runtime使用独立、可追踪进程，保存启动命令、PID/日志和持续健康结果。
5. 生成主回执与`gate8_evidence_manifest.json`。证据先进入evidence HEAD；回执每份证据使用一行`EVIDENCE: <repo-relative-path>`，引用集合必须与Manifest一致。
6. 使用D23当前Runtime Verification Skill内的只读脚本验证Evidence Manifest并执行Gate9预检。保存机器JSON；将问题分为`IMPLEMENTATION_FAILURE`、`ENVIRONMENT_FAILURE`、`EVIDENCE_INCOMPLETE`或适用的成功/不适用状态。
7. 向准确Gate9任务发送implementation、evidence HEAD、Build、Runtime、site scope、clean status、Manifest、预检结果、接受条件和开放项。保持Runtime到收到`GATE9_PASS_OR_RETURN_NOTICE`。
8. Gate9退回时沿用原Finding ID，先核对根因和新旧身份，只修复本轮实现问题并复验相邻影响。收到通过通知后记录四层状态并按通知停止对应返修。
9. `INTEGRATION_READY`进入D16本地main串行队列；仅在授权覆盖时由单一集成任务执行。合并后记录main前后HEAD、冲突和组合回归。远端push、部署及发布按独立授权处理。

## 必须交付

- 实例化的开发任务记录或满足同等字段的主回执；
- 每页实现commit和批次implementation commit；
- evidence HEAD与clean status；
- Build目录、Build ID和可持续Runtime；
- `gate8_evidence_manifest.json`；
- Evidence Manifest验证JSON和Gate9预检JSON；
- 适用的测试、浏览器、视觉及数据恢复证据；
- Gate9送达记录、通过或返修通知及四层状态；
- 获授权集成时的本地main前后HEAD和组合回归结果。

## 状态和停止点

始终分别记录：

```text
RECHECK_SCOPE_STATUS：<VALUE>
PAGE_GATE9_STATUS：<VALUE>
INTEGRATION_STATUS：<VALUE>
RELEASE_STATUS：<VALUE>
```

实现问题被指定版本独立接收后停止重复返修。共享根Finding交共享owner并保留页面映射。Gate9通过不自动授权本地合并；本地合并不自动授权push、部署、生产WordPress写入、DNS、索引或发布。真实表单发送及其他外部业务动作只在对应明确授权内执行。
