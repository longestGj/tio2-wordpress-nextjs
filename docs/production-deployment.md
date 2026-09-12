# TiO₂ Malaysia 生产运行手册

`tio2-my` 公网站点为 `https://tio2malaysia.com`，CMS 为 `https://cms.tio2malaysia.com`，运行在已登记的 Oracle VPS。2026-09-11 首次接管回执记录的生产业务版本为 `main@27f0a0da59df1e54cd01eab7d77eb7024b338d42`，服务器状态为 `PUBLIC_VERIFIED`，最终验收为 `PRODUCTION_VERIFIED`；证据见[接管记录](verification/2026-09-11-tio2-production-adoption.md)。后续状态必须从固定 `status` 入口重新读取，不能只引用这段历史事实。

本手册只适用于 `tio2-my` 当前已登记拓扑。发布方法见[独立发布流程](release-workflow.md)，控制器和五类能力见[发布架构](release-architecture.md)。本文不是新的生产授权。

## 1. 阶段一能力

阶段一只安装 `tio2-my/frontend-only`，并只接受已验证的现有兼容事务。网站前台适配器可以执行七动作；`content-only`、`combined`、`cms-platform` 和 `host-infrastructure` 写能力均为 `not-installed`，不得退回旧单站逻辑或换用其他类型。

服务器固定入口为：

```text
sudo /usr/local/sbin/d16-release tio2-my <action>
```

`<action>` 只能是 `status`、`prepare`、`backup`、`stage`、`activate`、`verify`、`rollback`。deploy 用户不能传路径、Shell、发布类型或尾随参数。生产操作由本地控制器调用此入口，操作者不拼接远端命令。

## 2. 本地入口与同一 RunRoot

项目入口是 `scripts/production.ps1`：

```powershell
pwsh -NoProfile -File scripts/production.ps1 -Operation Status   -ConfigPath .production/production-connection.json -RunRoot .production/runs/<release-id>
pwsh -NoProfile -File scripts/production.ps1 -Operation Prepare  -ConfigPath .production/production-connection.json -RunRoot .production/runs/<release-id>
pwsh -NoProfile -File scripts/production.ps1 -Operation Backup   -ConfigPath .production/production-connection.json -RunRoot .production/runs/<release-id>
pwsh -NoProfile -File scripts/production.ps1 -Operation Stage    -ConfigPath .production/production-connection.json -RunRoot .production/runs/<release-id>
pwsh -NoProfile -File scripts/production.ps1 -Operation Activate -ConfigPath .production/production-connection.json -RunRoot .production/runs/<release-id>
pwsh -NoProfile -File scripts/production.ps1 -Operation Verify   -ConfigPath .production/production-connection.json -RunRoot .production/runs/<release-id>
pwsh -NoProfile -File scripts/production.ps1 -Operation Rollback -ConfigPath .production/production-connection.json -RunRoot .production/runs/<release-id>
```

一次生产事务始终复用同一 RunRoot、候选 manifest SHA-256、兼容事务、backup request 和回执。失败、超时或 SSH 断开后不能生成新 RunRoot、删除请求或改写状态；先用同一 RunRoot 执行 `Status`。

`.production/production-connection.json` 被 Git 忽略，保存批准主机、deploy 用户、独立核验的 SSH host key、私钥路径、活动基线、恢复镜像和 age identity 路径。密钥、邮箱、数据库口令和正文不得进入 Git 或普通回执。

## 3. 三道门

### 候选门

独立发布负责人先冻结准确 `develop`、核对 Git 中的开发回执与实际差异、通过发布侧集成，再准确合入 `main` 并完成 `main` 预发布。候选必须绑定同一网站、commit、Build ID、CMS 指纹、配置、发布表面和上一生产回执。

当前兼容事务还必须通过预发布 seed 身份、首次接管导入回执和 fresh 生产 `site_scope=tio2-my` 只读证据的连续性核对。任一身份变化都封存当前批次；阶段一不能改写不可变候选或生成通用 v2 前台上传。

### 部署门

按 `status -> prepare -> backup -> stage -> activate -> verify` 推进：

- `prepare` 校验并冻结事务身份；
- `backup` 导出与事务绑定的加密前台备份，本地核对 ciphertext、真实解密并隔离恢复；
- `stage` 在非活动槽构建、健康检查并持久化 `INTERNAL_VERIFIED`；
- `activate` 通过登记 upstream 切换前台，不修改 WordPress、MariaDB、seed、Nginx 公共配置、TLS 或 sudo；
- 第一次 `verify` 核对活动 commit、Build、镜像/容器、代理、CMS 未变化和 58 个登记对象，进入 `PUBLIC_VERIFIED`。

任何动作的主体、类型、候选、基线、备份、CMS 或 RunRoot 不一致都停止。`PUBLIC_VERIFIED` 只说明服务器公开验证完成，不代替业务 E2E 和收件。

### 生产验收门

在已有明确授权下，对 58 个对象、3 个视口、174 个浏览器案例运行公网 E2E，且非授权写请求为 0。RFQ、Sample、Documents 每个流程按批准次数真实提交；服务商接受、Thank You 和实际收件分别记录，失败不自动重发。

使用固定脚本封存人工收件和最终回执：

```powershell
pwsh -NoProfile -File scripts/production/Confirm-ProductionInbox.ps1 -RunRoot .production/runs/<release-id>
pwsh -NoProfile -File scripts/production/Seal-ProductionReceipt.ps1 -RunRoot .production/runs/<release-id>
```

最终证据上传到主体固定 incoming 文件名后，再用同一 RunRoot 执行第二次 `Verify`。只有状态进入 `COMPLETED` 且候选回执为 `PRODUCTION_VERIFIED`，才能宣布发布完成。

## 4. 回退与 `RECOVERY_REQUIRED`

`Rollback` 只切回本事务登记并已验证的前一前端，不恢复旧 SQL，返回的数据库恢复事实必须保持为 false。它要求当前活动身份、原 prepare 基线、backup ID 和 rollback intent 全部一致；旧运行不能回退后来发布的活动版本。

动作返回不确定、活动指针与事务日志不一致、激活/验证中断无法证明结果，或 `Status` 报告 `recoveryRequired=true` 时，状态为 `RECOVERY_REQUIRED`。此时：

1. 停止 `prepare`、`backup`、`stage`、`activate`、`verify` 和普通 `rollback`；
2. 保存同一 RunRoot、客户端 transport failure、服务器状态和事务日志；
3. 不凭 SSH 退出码、已存在的 receipt 文件或临时健康检查猜测成功；
4. 由受控恢复流程核对 active pointer、upstream、备份和审计后决定恢复，不手改状态或临时使用 root Shell。

安全回退有完整身份和公开验证证据时，控制器可进入 `ROLLED_BACK`。其他不明确结果保持 `RECOVERY_REQUIRED`。

## 5. 管理员工具候选

管理员包与网站发布包分开，从准确已提交版本的 Git blob 构建：

```powershell
python ops/production/build_admin_bundle.py --revision <40-character-tool-commit> --output .production/candidates/<unique-name>.tar.gz
```

包只包含 `bootstrap_install.py` 的固定清单及 sidecar 哈希，不能包含工作树文件、密钥、RunRoot 或生产快照。阶段一包的构建与演练不安装服务器程序；复制、root 安装、sudo 更新和迁移都需要另一个明确生产指令。

生产安装前必须提供管理员包 SHA-256、文件清单、只读迁移计划、旧程序回退目标、当前 RunRoot 和计划动作。首次采用或管理员程序升级不能由普通网站发布顺带执行。
