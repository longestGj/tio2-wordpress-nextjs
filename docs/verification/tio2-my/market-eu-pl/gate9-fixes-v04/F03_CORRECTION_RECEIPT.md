# Poland F03 定向修复回执 V0.4

2026-09-07；回应 D23 `PL-G9-RECHECK-03 / PL-G9-F03`，Manifest V0.24。**末尾菜单 RFQ 可见焦点已修复，本地定向自检通过，交 D23 独立复验。Gate 9 整体仍未关闭。**

## 变更和版本

生产源码仅修改共享 `components/sites/tio2-my/malaysia-global-chrome.module.css`：给 compact 菜单末尾 RFQ 的 `:focus-visible` 增加 6px 内侧白色分隔层，将原 3px `#008078` 焦点 outline 移至 `-6px` offset。白色分隔使同色填充按钮上的焦点可区分；全部绘制在控件内部，避免滚动容器裁切。未聚焦外观、布局、文案、按钮功能色、共享组件复用和页面业务代码不变。未重做 F01/F02/E01 或已关闭 E03 采集问题。

新构建 `.next-poland-g9-f03`，Build ID **`51GHGEaKhS8jeu855WrXQ`**，预览 `http://127.0.0.1:3015/markets/poland/`。基础 commit `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb`，分支 `codex/poland-development` 加未提交快照。见[源码快照](IMPLEMENTATION_SNAPSHOT.json)及[实际运行绑定](BUILD_RUNTIME_BINDING.json)。Poland/RFQ/DOC 每页各 12 个 JS/CSS 资源与新构建逐字节匹配，页面响应均含新 Build ID。仅构建 Malaysia；A/B 现有服务不变。

旧 51 文件组合中除上述共享 CSS 外的 50 文件哈希不变；新快照补入原生缩放测试和焦点测试。V0.2/V0.3 证据未覆盖；原 V03 测试源码另存 [history](history/native-zoom-v03.spec.ts.source)。旧构建保留。更新后的原生测试仍使用已接受的 CDP 原始画面采集，只补新 Build 身份、聚焦前后两状态与像素检查，输出独立 V0.4 目录。

## 失败复现与实际通过

按 TDD 先在旧 Build 的 768 视口复现：Close → Shift+Tab 顶部 RFQ → Shift+Tab 末尾 RFQ。聚焦前后左右边缘像素均为 `[0,128,120]`，新可见分隔断言失败，见 [旧版状态](red/result-768.json)和同目录两张图。没有先改生产代码再伪造失败。

新 Build [8 项浏览器测试](test-results.json)全部通过：

| 检查 | 证据 |
|---|---|
| 768 compact 聚焦前后 | [未聚焦](focus/unfocused-768.png)、[键盘聚焦](focus/focused-768.png)、[像素/DOM](focus/result-768.json) |
| 390 compact 聚焦前后 | [未聚焦](focus/unfocused-390.png)、[键盘聚焦](focus/focused-390.png)、[像素/DOM](focus/result-390.json) |
| 原生 200% 菜单底部 | [未聚焦](native-zoom/menu-native-200-bottom-unfocused.png)、[键盘聚焦](native-zoom/menu-native-200-bottom.png)、[原始画面/几何/焦点记录](native-zoom/evidence.json) |
| 相邻共享回归 | Home 三端菜单/当前导航状态；Home/1440、UK/768、Privacy/390 Cookie 开关、背景隔离、焦点和滚动恢复 |
| 页面稳定性 | 新 Build 的实际 SSR 正文、动作、metadata、query、规范跳转和 sitemap 排除核对通过 |

三个焦点场景中，左右边缘的实际画面像素均从绿色变为白色分隔，仍保留绿色 outline；控件未移位。两种 compact 和原生 200% 均检查首尾循环、Escape 关闭和触发器焦点恢复。200% 使用固定窗口、原生 `tabs.setZoom(2)`，CSS viewport 712×452、DPR2；底部 RFQ 经菜单内部滚动后完整可达，原始截图 1424×905。全页和 Cookie 画面随同保存，未使用 resize 或图像修补。

已实际打开 390 聚焦图及 200% 两状态核对可见分隔和控件边界。构建、TypeScript、定向 ESLint 通过；独立只读代码审查未发现该限定 CSS/测试变更的阻断缺陷。未运行全仓或发布检查，未将旧 62 项测试冒充本轮重跑。

独立审查者随后逐组查看 768、390、原生 200% 的未聚焦/聚焦图，确认白色分隔清晰、位于按钮内部且未观察到裁切，核对 Build 和 8 项通过报告，无追加发现；此为 D16 内部独立审查，不替代 D23 验收。

## E02 当前状态与具体 owner 条件

**当前本地配置→实际 RFQ/DOC 接线已经验证，且本轮重新绑定新 Build。** [运行绑定](BUILD_RUNTIME_BINDING.json)保留配置指纹与实际输出相等性，不保存原值。不能再笼统列为本地环境关联缺失。

仅保留以下外部条件，处理路径沿用 [V0.3 账户/收件路径](../gate9-fixes-v03/RECEIVER_ENVIRONMENT_ASSOCIATION.md)：

- provider/接收 owner：提供当前路由指纹与批准账户、启用状态和批准目的地的只读绑定证明。
- DOC 历史记录/邮箱 owner：核对既有一次测试收件记录；历史路由值没有已记录指纹，无法凭当前配置反推相同。
- RFQ 接收 owner：如仍需真实服务商接受证据，先准备准确版本和单次标记 payload，再取得对应单次外发授权。当前没有该授权；不自动重试、不重发 DOC。

本轮真实业务提交为 0。Applications 按原 owner 开发，不改路。生产、发布、DNS、索引和 Gate 10 未获授权。当前会话没有可调用的跨线程消息发送工具；将文件排入 D23 面板不代表消息已送达或 D23 已完成复验。
