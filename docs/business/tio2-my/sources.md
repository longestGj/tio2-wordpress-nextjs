# Malaysia 业务来源索引

核对日期：2026-09-08。范围：D16本地资料。本轮未重新核实D23当前批准组合，也未进行运行或收件验收；下面是来源定位，不是新的批准清单。

| 来源 | 身份与用途 | 有效性边界 |
|---|---|---|
| [RFQ页面合同](../../../wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json) | `CONV-RFQ-G7-HANDOFF-01`、`CONV-RFQ-G7-PCR-02`、`rfq-page-v0.1-malaysia`；字段、文案、选项、路由、预填合同 | 当前仓库副本；采用时固定commit/hash并追溯本次批准，保留原Gate名称 |
| [首次开发回执](../../verification/conv-rfq/GATE8_LOCAL_VERIFICATION_2026-09-01.md) | 2026-09-01实现和检查记录 | 历史版本；预填描述与当前代码有差异，不直接作为当前规则 |
| [定向修复关闭记录](../../verification/conv-rfq/GATE9_PCR01_TARGETED_FIX_CLOSURE_2026-09-02.md) | `CONV-RFQ-G9-PCR-01`；接受commit `0461e594039b89764ecff89fb26b62f2acfd8f61` | 仅关闭超时与robots控制两项；当时页面整体仍在验收，不代表当前发布就绪 |
| [输入校验](../../../lib/rfq/malaysia-rfq-validation.ts)、[预填](../../../lib/rfq/malaysia-rfq-prefill.ts)、[接收适配器](../../../lib/rfq/malaysia-rfq-receiver.ts) | 当前实现的规则映射 | 代码事实，不是独立业务批准 |
| [RFQ浏览器测试](../../../tests/e2e/rfq-page.spec.ts) | 已有浏览器检查入口 | 使用前核对真实/模拟边界、运行前提和输出位置；本次未执行 |
| [策划资料导航](../../site-registry.md#d23-当前承接入口)、[交接清单](../../d23-gate-handoff.md) | 查找准确批准组合及接受条件的方法 | 当前任务读取实际来源后才能固定有效版本 |

新增来源时记录：业务领域、文件路径、合同/批准身份、采用版本或hash、适用范围、替代关系。不要仅按最大版本号或最近修改时间判断有效性；任务记录保存本次实际采用值。
