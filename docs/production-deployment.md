# TiO₂ Malaysia 发布工具操作说明

> 2026-09-11 已完成首次生产接管和三道门验收，正式回执见[生产接管与发布记录](verification/2026-09-11-tio2-production-adoption.md)。生产业务版本固定为 `main@27f0a0da59df1e54cd01eab7d77eb7024b338d42`，服务器状态为 `PUBLIC_VERIFIED`，最终验收状态为 `PRODUCTION_VERIFIED`。以后使用本文件的日常入口；首次 Plan/Apply 只在接管新服务器或重新登记拓扑时使用，不能作为普通发布重复执行。

网站固定为 `tio2-my`，公网站点 `https://tio2malaysia.com`，CMS `https://cms.tio2malaysia.com`。本工具的源码能力、本地演练和实际生产采用分别记录；本文件不是生产操作授权。发布进入条件仍见[开发交付流程](development-workflow.md#7-发布d16执行授权按网站和环境限定)，当前证据见[四项交付验证](verification/2026-09-11-production-tooling.md)。

## 适用边界

日常入口是 `scripts/production.ps1`，要求 PowerShell 7.2+、Git、tar、OpenSSH，以及本地 Linux Docker 恢复环境。它提供 `Package / Status / Release / Verify / Rollback`，远端始终只有 `status prepare backup deploy verify rollback` 六个固定动作。调用者不能传入远端目录、Shell、镜像参数或挂载。

首版仅支持 root 登记的 `tio2-production-baseline-v3` / `tio2-web-bluegreen-v1` 拓扑：两个 Web 槽位、固定 Nginx 代理、明确的 frontend bridge（WordPress 可达、数据库不在其中）、CMS 构建回环端口、不可变镜像/容器/卷、插件只读映射，以及精确配置哈希。数据库不能发布端口，数据库网络只有已登记 DB/WP；必须无未登记写入者、宿主机作业或并行管理员变更。实际检查仍会拒绝身份或写入边界变化。

普通发布只更新前端。WordPress 容器、数据库、卷、插件来源和迁移合同必须保持相容；不同 WordPress 文件或 migration manifest 会被拒绝。普通 Release 和 Rollback 不导入 SQL、不重复 seed、不更新 CMS 数据。需要数据变化时另行批准迁移与回退方案。

## 三道发布门

1. **候选门**：从 clean `main` 打包，绑定同一提交的健康预发布回执、Build ID、CMS 指纹和发布表面；任一身份不一致即停止。
2. **部署门**：只通过 `scripts/production.ps1` 与 deploy 用户的固定 sudo 程序执行 `status / prepare / backup / deploy / verify / rollback`。先完成加密备份与隔离恢复，再切换前端；普通发布不改数据库和 WordPress 数据。
3. **生产验收门**：服务器达到 `PUBLIC_VERIFIED` 后，再完成公网对象 E2E、适用的真实表单服务商接受与人工收件确认，最后由 `Seal-ProductionReceipt.ps1` 产生 `PRODUCTION_VERIFIED`。服务器状态本身不代替浏览器和收件验收。

任一门失败都保留同一个 RunRoot 和原请求重试或回滚，不删除状态、改写证据、临时绕过主机指纹或改用 root 手工发布。

## 首次采用与特权程序升级

管理员先提供非秘密交接：实际网站/代码/镜像身份、原始受保护 source tree、现有容器和卷、固定配置路径及哈希、健康检查、写入者、备份和恢复情况。安装不自动把未知服务器拓扑改造成适用拓扑，也不自动登记 baseline。

特权程序升级与网站包分开。先在本地产生精确提交的管理员包：

```powershell
python ops/production/build_admin_bundle.py --revision <approved-40-character-tool-commit> --output .production/admin/<unique-id>
```

它按该提交的固定安装清单收集 Git blob，明确将 `ops/production/Dockerfile` 映射为 `web.Dockerfile`，并在目录旁生成 SHA-256 清单。源码目录不能直接当安装包：安装器拒绝多余或缺失文件。管理员在另外明确授权的流程中核对哈希、将包复制到 root 所有且不可被 deploy 修改的目录，再调用其中的 `install.sh`。安装器有自己的校验、升级和中断恢复；普通 Release 无权升级 root 程序、sudo 规则或 Dockerfile。

服务器需事先提供 Ubuntu 24.04、Docker（含 BuildKit/buildx）、Nginx、Python、age 和匹配的现有 WordPress/MariaDB 镜像。安装脚本可能安装 age；这不是本窗口已经执行的远端操作。管理员将准确 v3 登记写入 `/etc/tio2-production/baseline.enrollment.json` 后，另行调用固定 `release_baseline.py enroll`；不存在第七个 deploy 用户动作。

原始源码和 CMS 已批准 JSON 的 LF 字节必须一致。Windows checkout 的 CRLF 与批准哈希差异不能通过改冻结合同掩盖。打包命令仅对本次 `git archive` 使用 `-c core.autocrlf=false`；不会修改全局或仓库 Git 配置。真实 CMS 需要另外批准的字节对齐；本地演练只初始化自己的克隆。

## 本地配置与密钥

将以下配置放在忽略目录中，例如 `.production/connection.local.json`。所有值来自当次授权的管理员交接；主机公钥必须通过可信独立渠道核实，不能用未经核实的 `ssh-keyscan` 替代。

```json
{
  "siteId": "tio2-my",
  "host": "<approved-host>",
  "port": 22,
  "username": "deploy",
  "hostKey": "ssh-ed25519 <verified-public-key-base64>",
  "identityFile": "<absolute-private-SSH-key-path>",
  "baselineSha256": "<initial-validated-enrollment-sha256>",
  "dockerContext": "<local-Linux-docker-context>",
  "recoveryImageId": "sha256:<measured-local-recovery-tools-image-id>",
  "ageIdentityFile": "<absolute-private-age-identity-path>"
}
```

SSH 每次使用本次运行专用的公钥 pin 文件，禁用用户/global SSH 配置、口令交互和自动信任主机。私钥不复制入运行证据。保持本地配置、密钥与 `.production` 的操作系统访问权限，仅让授权操作者读取；它们不能提交到 Git。

恢复工具镜像是本地管理员登记的 Linux 镜像，需 Python3、Docker CLI、age；按不可变 SHA 选择，镜像必须已在本地。它需要本地 Docker socket，在唯一标签的内网/卷/容器中恢复同版本的 DB/WP，并在结束时核对归属清理。被恢复的 DB/WP/WP-CLI 镜像也必须已存在且匹配备份记录；不会悄悄升级或自动拉取替代版本。实际 ARM64 目标须有相应平台证据。

## 单一日常入口

打包必须在精确 clean `main` 工作区中，且已有同提交、同网站、完整 Build/CMS 身份的 HEALTHY 预发布回执：

```powershell
npm run production -- -Operation Package -PrereleaseReceiptPath .prerelease/runs/<run>/production-receipt.json -ReleaseId <unique-id>
```

输出位于该仓库 `.production/runs/<unique-id>`。保留 archive、manifest、proof 及其身份；工具分支的本地 fixture 证明不等于真实 clean-main provenance。

```powershell
npm run production -- -Operation Status -ConfigPath .production/connection.local.json -RunRoot .production/runs/<unique-id>
npm run production -- -Operation Release -ConfigPath .production/connection.local.json -RunRoot .production/runs/<unique-id>
npm run production -- -Operation Verify -ConfigPath .production/connection.local.json -RunRoot .production/runs/<unique-id>
npm run production -- -Operation Rollback -ConfigPath .production/connection.local.json -RunRoot .production/runs/<unique-id>
```

当前机器的忽略配置为 `.production/production-connection.json`。它包含主机指纹、部署私钥路径、活动基线、恢复镜像和 age 身份路径；不得提交。发布 Agent 的仓库入口见[AGENT.md](../.agent/d16-release-agent/AGENT.md)。

`Status` 展示能力标记和实际协议状态；`implemented` 不等于 readiness 或生产已验收。`Release` 上传三份包，准备并核对初始 enrollment，持久化第四份 `backup-request.json` 的 UUID 后才发送。服务端备份恢复写入后返回 `writesResumed=true / autoRestoreEligible=false`，因此不具备自动无损 SQL 回退资格。

随后控制器下载加密文件到本地，比较 ciphertext SHA，运行真实 age 解密、完整 manifest/component 校验、全部归档预检和隔离恢复。恢复会逐表对比 SQL 行数、核对完整 WordPress 字节和文章计数，并以 UID33 验证插件加载。只有成功并完成清理后才写入 `decryption.json`、`restore.json`，再生成第五份 `deployment-evidence.json`。此处使用[恢复权限合同](../ops/production/RECOVERY.md)的精确 `tio2-ro-plugin-root-v1`：只有固定插件树允许目录0755/文件0644，配置和其他源码保持私有。

部署证据绑定原 prepared proof、baseline、backup、manifest、ciphertext 和本地两份恢复证据哈希。它是受信发布者的执行证明，不是独立签名或审批根。服务端重新验证已保存备份和阶段连续性后，构建候选、健康检查、切换 current/proxy 并再次验证。`PUBLIC_VERIFIED` 表示登记代理的检查通过，不自动表示 DNS/TLS/互联网或用户发布验收完成。

`Rollback` 只切回登记的先前前端，不恢复数据库。保留旧前端镜像和容器是其前提。返回 `databaseRestored=false`；当前 CMS 数据不会被旧 SQL 覆盖。

回滚还要求控制器和 root 程序采用同一版 `tio2-rollback-intent-v1` 协议。控制器把候选四元组、刚从 Status 观察到的 active enrollment SHA、原 prepare baseline SHA 和 backupId 写入本运行的 `rollback-intent.json`，通过固定 `rollback` 动作的 stdin 发送；不增加动作、命令参数或第六份上传文件。root 最多接收4096字节JSON，在全局锁内检查完整字段、类型与当前候选/基线/备份绑定，匹配后才写journal或切换。另一运行已发布新版本时，旧回滚会在副作用前拒绝。同候选再次部署也必须匹配 canonical active enrollment（含当前容器身份），不能只凭提交相同就回滚。

同一回滚请求因中断或响应丢失重试时复用原 intent；root 仅凭相同 rollback journal intent 接受已变化的目标状态，支持 `ROLLING_BACK`/`ROLLED_BACK` 幂等恢复。不要删除 intent 来绕过陈旧运行拒绝；使用对应实际发布版本的运行记录。旧客户端缺少 intent 会被新root程序拒绝；此协议升级须走前述独立管理员安装流程，普通 Release 不更新root工具。

## 中断、证据与恢复

任何非零结果停止后续步骤。用相同配置、相同 RunRoot 重试同一个操作，不删除请求或手工改状态。`controller.lock` 防止同一运行并发；`connection.json` 固定 host pin 和初始 baseline；prepare/backup/deploy/verify/rollback 分阶段保留回执。备份 UUID 和请求字节跨重试保持不变；服务端锁忙时稍后重试，不生成新 UUID。

服务端备份子进程继承入口已经持有的同一个 flock 文件描述符。仅入口进程被杀或OOM时，仍存活的备份进程继续持锁，第二次调用不会在其捕获/恢复期间进入操作；子进程结束后锁才释放。这不把所有进程同时被杀的恢复机制替换掉，原持久journal仍负责下一次恢复。

下载先写 `.part`，只有 hash 匹配才发布 `ciphertext.age`。本地恢复失败不会发出部署证据；`recovery.log` 保存非秘密错误；远端非零会保留 `transport-failure.json` 并尝试读取固定Status保存 `failure-status.json`，不继续后续写入阶段。客户端临时解密内容在一次性恢复容器内，主机运行目录保留 ciphertext 和非秘密阶段证据。恢复验证的 Docker 容器、网络和卷带独有标签；意外强杀宿主机导致的残留必须按记录的唯一标签和实际归属核对清理，不能全局 prune。

已部署状态丢失响应时，由同一候选调用固定 deploy/verify 恢复和检查；不重新执行内容导入。服务端切换中断依其 root journal 恢复。恢复动作失败时保留错误和状态，不能把存在 receipt 文件视为完成。

真实表单完成后，用以下两个脚本封存人工收件与最终结果；它们不会保存邮箱地址、邮件正文或 access key：

```powershell
pwsh -NoProfile -File scripts/production/Confirm-ProductionInbox.ps1 -RunRoot .production/runs/<unique-id>
pwsh -NoProfile -File scripts/production/Seal-ProductionReceipt.ps1 -RunRoot .production/runs/<unique-id>
```

## 本地验证与实际能力

```powershell
npx vitest run tests/infrastructure/production-controller.test.ts
python tests/production-runtime/run_release_rehearsal.py --isolated
npx playwright test --config=tests/fixtures/production/playwright.fixture.config.ts
```

`run_release_rehearsal.py` 是本次开发环境的定向证据重放脚本，不能当作任意机器上的通用生产验收器。它依赖本机 `D:/16Wordpress_nextjs/.env.prerelease.local` 与已有独立预发布容器（只读克隆）、父目录Playwright依赖/浏览器、Task3已保留的三个精确包文件 `.tmp/task3/reuse/tio2-update-test-84e4137a60264b20b140b7252ac69ce8/`、Task3安全Next镜像和已安装工具镜像。缺少任一前置条件会停止，不能用fixture attestation补造clean-main证据。SSH工具镜像可用 `tests/production-runtime/release-runtime.Dockerfile` 从已接受的Task3工具镜像构建；所有fixture/恢复资源按唯一标签归属清理。旧包来源和image/build身份见验证记录；其他机器需要重新形成相应受控候选和CMS证据。

浏览器命令默认验证固定 fixture，不发送真实表单。真实候选验证必须设置 `TIO2_PRODUCTION_BASE_URL` 为自己的候选地址，同时指定独立 `TIO2_PRODUCTION_ARTIFACTS` 和 `TIO2_PRODUCTION_REPORT`，通过公开代理验收时还应设置 `TIO2_EXPECT_RELEASE` 为准确提交，逐页核对响应头。58对象保持冻结，其中57个正常对象和404；每个对象在1440/768/390核对源代码规定的 canonical redirect、最终状态、可见内容、溢出与适用交互并保留截图。`/about/` 的308到 `/about` 是既有批准代码行为，不修改冻结 surface 来消除它。真实表单使用独立live入口，服务商接受和实际收件分别记录。

本地独立 client/restore 容器证明转移、解密和恢复机制，不能代表不同物理主机的灾难隔离。首次采用已核对实际主机、clean-main来源、现网拓扑和独立验收；后续每次发布仍须形成自己的RunRoot证据和授权。当前安全镜像使用编译缓存 tmpfs，避免 BuildKit secret 留在 Turbopack 缓存；当前镜像扫描证据见验证记录。此前共享 BuildKit 缓存可能仍含旧层，本任务没有清空共享缓存或宣称完全擦除。
