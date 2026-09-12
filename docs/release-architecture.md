# D16 五类发布架构

> 第二阶段设计更新：用户已接受[最小内容发布改造](superpowers/specs/2026-09-12-minimal-content-release-design.md)，采用暂停共享 CMS 写入、整库备份和发布窗口内失败整库恢复，不再以 generation 或单站历史回退作为实施前提。以下阶段一能力登记仍描述现有实现，内容能力尚未安装。

本文稳定描述 D16 发布系统的代码结构与安全边界。批准设计来源为[五类发布系统与共享 CMS 架构设计](superpowers/specs/2026-09-12-multisite-production-release-architecture-design.md)；实际已安装能力以当前代码、测试和[网站登记](site-registry.md)为准。

## 1. 六个控制器组件

服务器由一个固定控制器承接登记主体。实现分为六个职责组件：

| 组件 | 代码入口 | 合同 |
|---|---|---|
| 候选合同与分类器 | `candidate_contract.py`、`release_classifier.py` | 校验不可变公共信封、严格 payload 和实际差异，只产生一个 `subject + releaseType` |
| 主体登记与资源所有权 | `subject_registry.py` | 从 root 保护的登记解析 `host`、`cms` 和网站，路径、域名、端口、Nginx 与证书不跨主体借用 |
| 状态、锁与审计回执 | `release_state.py` | 一个服务器全局锁、每主体独立状态、身份连续性、原子写入、脱敏审计 |
| 发布控制器 | `release_controller.py` | 在锁内解析主体、校验候选与生产基线，按包内类型分派唯一适配器 |
| 类型适配器 | `release_adapter.py`、`site_frontend_adapter.py` | 只接收控制器构造的上下文；不能重新解释命令行、越过主体或扩大权限 |
| 固定特权入口 | `d16_release.py`、`sudoers.tio2-release` | 只接受登记的 subject 和固定 action，不接受路径、Shell、类型覆盖或尾随参数 |

阶段一 `ReleaseController.system()` 只装配登记为网站前端的 `frontend-only` 适配器与可信生产基线读取器。`status` 可用于获 sudo allowlist 的登记主体；未安装能力的写动作稳定返回 `capability-not-installed`，没有默认适配器或跨站 fallback。

## 2. 五类包

五类包共享 `d16-release-candidate-v1` 信封，payload Schema 相互排斥。发布类型来自包，操作者不能在命令行覆盖。

| 类型 | 主体与内容 | 阶段一状态 |
|---|---|---|
| `frontend-only` | 一个网站的 Next.js 前台或运行配置 | `tio2-my` 已安装；当前只接受已验证兼容事务 |
| `content-only` | 一个既有 `site_scope` 的声明式内容 generation | `not-installed` |
| `combined` | 同一网站的前台与内容一起变化 | `not-installed` |
| `cms-platform` | WordPress、共享插件、API/Schema、数据库结构或跨 scope 变化 | `not-installed` |
| `host-infrastructure` | 发布程序、登记、公共 Nginx、网络、端口、证书公共配置或 sudo | `not-installed` |

公共信封绑定 `releaseId`、主体、类型、源 commit、Build、创建时间、上一生产回执、CMS/配置/预发布/payload 哈希和有序文件哈希。未知字段、额外文件、类型不匹配、哈希变化、权限越界或无法唯一分类都失败关闭。

## 3. 七动作与状态

固定入口为 `/usr/local/sbin/d16-release <subject> <action>`，动作只有：`status`、`prepare`、`backup`、`stage`、`activate`、`verify`、`rollback`。

主要状态链为：

```text
IDLE -> PREPARED -> BACKED_UP -> STAGED -> INTERNAL_VERIFIED
     -> ACTIVATED -> PUBLIC_VERIFIED -> COMPLETED
```

`status` 只读返回主体状态、能力和恢复标志。`prepare` 冻结事务身份，`backup` 生成与验证备份，`stage` 暂存并完成内部验证，`activate` 切换活动前台，第一次 `verify` 形成公开验证，第二次 `verify` 校验业务 E2E 与收件证据后进入 `COMPLETED`。`rollback` 使用已登记的前一前端和本事务证据进入 `ROLLED_BACK`。

可恢复的前置失败进入 `FAILED`；已证明安全回退进入 `ROLLED_BACK`。激活、验证或持久化窗口无法证明活动版本时进入 `RECOVERY_REQUIRED`，该状态没有普通后继动作，禁止猜测、重复激活或绕过控制器。

## 4. 权限与主体隔离

root 登记是路径和资源所有权的唯一来源。deploy 用户的 sudoers 只允许列出的 `d16-release <subject> <action>`；阶段一列出 `tio2-my` 七动作和 `cms status`，不列出 host 写动作。入口清空环境并使用固定 PATH。

每个主体有独立状态目录、incoming/outgoing、生产路径和配置路径，但所有主体共享一个全局事务锁。候选的 subject 必须与命令主体一致，登记 adapter 与包内类型必须精确匹配。适配器只能使用已校验 `ReleaseContext` 中的路径、候选、基线和事务日志。

密钥、邮箱地址、数据库口令和个人表单数据只存在于被忽略的本地配置或受保护平台/主机路径；包、审计和回执仅保存非秘密身份、状态、计数和哈希。

## 5. 备份、激活与恢复

备份在激活前完成，绑定同一 release、subject、类型、候选 manifest、生产基线和请求。`frontend-only` 备份活动前台槽位、Nginx upstream 与已登记身份，导出加密工件供本地真实解密和隔离恢复校验；它不导出 CMS 内容，也不恢复旧 SQL。

`stage` 在非活动槽构建并验证候选；`activate` 通过固定代理切换，在全局锁和原子日志内记录意图与结果。网络或进程中断后通过 `status` 和持久状态决定下一步。任何无法证明的中断都保持 `RECOVERY_REQUIRED`，由受控恢复处理。

回退只能作用于该主体和该事务登记的前一版本。状态、备份、活动身份或回执不一致时停止；不能使用临时 root Shell、手改状态或另一网站的备份完成回退。

## 6. Release Campaign

设计合同规定跨主体上线拆成有序 Release Campaign：每个子包仍只有一个主体、一种类型、独立备份、状态和回退；Campaign 只绑定子包哈希、依赖与顺序，不传播权限。前序未验证时不得启动后序。

阶段一没有安装 Campaign 执行器，也没有安装 `cms-platform` 或 `host-infrastructure` 写适配器。本节仅记录后续组件必须遵守的架构合同，不表示这些能力可执行。
