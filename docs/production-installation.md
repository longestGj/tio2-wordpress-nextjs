# MY 管理员安装与后续发布

本说明承接已批准的[安装方案](superpowers/specs/2026-09-12-my-production-installation-design.md)。当前处于开发及隔离演练阶段；文档存在不代表服务器已安装。生产能力仍以[网站登记](site-registry.md)和现场回执为准。

修改和验证安装器时执行[安装生命周期 R03](release-engineering-rules.md#r03)、[真实消费者 R05](release-engineering-rules.md#r05)及[状态消费者 R07](release-engineering-rules.md#r07)。若新 CMS 合同不能接受现有数据，还须按[迁移规则 R04](release-engineering-rules.md#r04)准备受控迁移路径，不能通过删除已有维护或安装状态绕过识别。

## 执行顺序

1. 发布负责人冻结通过验证的代码，生成管理员程序包和独立 CMS 安装包。两个包都从准确 Git 提交取文件，不读取未提交工作树。旧包的授权、哈希和计划不能用于新包。
2. 管理员安装受保护程序，准备当前站点的安装配置、只读验证内容包及私密凭据。运行 `content_install_cli.py plan`，核对工件哈希、数据库、WordPress、当前前台、配置和内容身份。`apply` 必须带该计划哈希。
3. 安装程序进入维护、暂停共享数据库写入，备份整个数据库并在隔离数据库实际恢复验证，再备份和升级插件、安装密封导入器及 hooks。验证原有内容和旧前台后恢复访问。此时内容配置处于待启用状态。
4. 通过正常发布流程部署新前台。旧兼容前台不支持批量内容刷新；不能拿旧前台的只读验证冒充新内容能力验收。
5. 新前台完成发布验收后，执行明确的内容启用步骤，实际验证签名刷新、页面、SEO 和 sitemap。只有成功后才写入活动内容配置。

后续内容发布改变了 CMS 内容，再发布前台前，使用已完成内容事务对应的包执行 `finalize-content`，验证并更新当前内容登记。这个步骤不再次导入数据库；必须有匹配的已完成内容回执，不能把现场任意变化直接登记为批准内容。

CMS 安装和前台发布各有自己的备份与回执。管理员入口没有增加 deploy 的任意 sudo 权限；日常发布仍走固定客户端和服务器命令。

## 程序升级前提

已完成阶段一接管后的 `phase1_program_upgrade.py` 只更新受保护的程序代次，不修改登记、事务状态、入口权限、CMS 或活动前台。它保留 `PREPARED` / `BACKED_UP` 的兼容路径；`ROLLED_BACK` 只有在现有控制器的安全前台回退证据验证通过时才可生成计划，不能仅凭状态名称放行。其他状态继续拒绝。

计划绑定原程序和受保护文件哈希；执行仍须使用准确计划哈希。新程序的只读状态必须与原持久状态一致、无共享 CMS 窗口或恢复标志，并具备前台能力。后检查失败不声明升级完成，应按同一计划显式恢复程序。该工具的本地测试不代表生产程序已更新，也不代替 CMS 安装计划。

## 中断与恢复

安装器拒绝执行树中的 `.env*`、`.key`、`.pem` 和 `.log` 文件。唯一例外是官方 WPGraphQL ACF 2.8.0 包中已核对的 `wp-content/plugins/wpgraphql-acf/.env.example`，且 SHA-256 必须为 `75f07f13f15864e3ccc9709f91cf6163adb17cd049ca91a3089d67350dfa0c1a`。该文件是公开测试占位配置，仍保留在快照、备份和密封导入器中；路径或字节变化继续拒绝。不得删除现场文件或宽泛放行所有示例文件来绕过检查。规则进入 Git 不表示服务器已安装新版本。

- 先读 `status`，保留同一安装目录、工件和计划哈希。
- 安装尚未恢复写入时，`rollback` 只使用本次整库备份和原插件、配置，恢复同一窗口。
- 恢复访问期间断线，使用 `finish-opening` 继续开放和检查。这个入口不会恢复数据库，也不会重装插件。
- 已经开放写入或完成安装，禁止用本次旧备份覆盖后续数据。恢复开放失败不能转成历史数据库回退。
- 内容启用有独立状态；它不导入内容，不恢复历史数据库。
- `recover-finalization` 只恢复本次内容启用窗口的访问；恢复后内容能力保持未启用，重新验证成功才能启用。

## 新前台候选

候选由冻结的 `release.tar.gz`、`release-manifest.json`、实际预发布生成的 `release-proof.json` 组成。使用 `scripts/production/prepare_frontend_candidate.py` 生成候选封装，再使用正常 `scripts/production.ps1` 发布。打包器只校验已有证据，不生成虚假的测试或收件结果。

### 新前台的完整离线打包入口

`scripts/production.ps1 -Operation Package` 接通完整生成链：干净 main → 已有普通/真实表单/收件证据复核 → 独立生产基线绑定 → Git 精确归档 → `prepare_frontend_candidate.py` → 现有 `frontend_candidate.validate_source` 校验。它不调用生产连接、不构建新网站、不发送表单、不升级 CMS。`New-ProductionPackage` 保留为旧开发分类合同的模块接口，不再是正式 CLI 的新前台生成路径；不能把其散装 payload 当作可上传的新前台包。

生产基线须由获授权管理员执行经过独立 SHA-256 核对的 `scripts/production/frontend_package_baseline.py --release-id <新ID>` 副本取得。脚本仅从 `/opt/tio2-production/program` 加载已安装、root 保护的控制器，对登记的 `tio2-my` 调用现有实时 baseline loader，并要求终态、新 ID、CMS/配置/前台身份连续。stdout 是非秘密 JSON，stderr 给出包含换行的精确 stdout SHA-256。使用现有受核验传输取回 JSON，并把管理员回传哈希独立传给打包器；不能只对任意本地 JSON 自算哈希就声称它来自生产。此一次性观察脚本不安装程序或改状态，管理员执行仍须适用授权。源码未知、观察失败或生产变化则停止，不能借用历史 baseline。

PowerShell 在主 checkout 的干净 main 上调用：

```powershell
pwsh -NoProfile -File scripts/production.ps1 -Operation Package `
  -ReleaseId <与基线观察一致的新ID> `
  -PrereleaseReceiptPath docs/verification/prerelease/runs/<live-evidence>/production-gate.json `
  -TestReceiptPath docs/verification/prerelease/runs/<ordinary-evidence>/result.json `
  -PrereleaseRunRoot .prerelease/runs/<candidate-run> `
  -BaselinePath .production/<verified-baseline.json> `
  -BaselineSha256 <管理员独立回传的SHA256> `
  -DevelopmentReceiptPath docs/verification/development-receipts/<frontend-receipt.json>
```

多份开发回执可通过 PowerShell 数组调用脚本参数。每份必须是已提交的 `d16-development-receipt-v1` JSON，状态 MERGED_TO_DEVELOP、mergeCommit 属于冻结候选、subjects/affectedConsumers 均仅 tio2-my，且 contentScopes/hostPaths 为空、cmsContractChanged=false；所有 paths 精确覆盖生产前台 commit 到候选的**已打包前台路径**变化（含删除），不是已经合入 main 后的空 `main..candidate`。此机器输入不替代发布负责人对其他开发 Markdown 回执的审查；缺少对应机器回执时先补齐开发侧可追溯记录，不改旧证据。

前台包包含 app/components/lib/public/sites、固定顶层运行文件、三个已批准合同文件，以及前台构建引用的 tio2-site-model/config 和 includes 下的 JSON 数据。不会下发 CMS PHP 程序、seed、管理员程序或其他文档；候选 Git 中完整 tio2-site-model 插件文件集的规范化 SHA-256 必须等于实时基线的已安装 CMS 合同，否则要求另行 CMS 流程。JSON 仅作为不可变前台构建输入，不执行 CMS 安装。这使已安装的后台和工具升级不被重复分类为本次前台发布。前台查询代码属于这个仅运行前台的包，但仍须声明正确消费者和具备同版本预发布证据。

正式 sealer 原始输出保持不变。打包器复制并严格复验普通测试、实发表单、收件、run、CMS 身份和独立 baseline，在新 `package-evidence/binding.json` 中绑定原始字节哈希，再生成 `d16-frontend-prerelease-v1`；不向旧 gate 填写 previousProductionReceipt。原始收件的分钟精度说明仍随源证据保留，不声称读过原始邮件头。输出目录 `.production/runs/<新ID>` 原子创建且拒绝覆盖，包内 `package-evidence/` 保存输入副本；服务器只接收固定 payload 文件。离线打包不能证明基线仍然新鲜，服务器 Prepare 仍重新观察所有身份并拒绝漂移。

该链的离线测试使用受控合成收件/运行输入，经真实 sealer、真实 CLI、真实 Git 归档和现有服务器校验器验证衔接；不是本次生产验收，不替代实际发布侧回归或生产 177 案例与原始邮件证据。

前台远端上传目录为登记主体的 `incoming/frontend-payload/frontend/`；内容包保留独立 `incoming/payload/content/`。两个目录分别执行严格文件清单验证。旧兼容事务和已完成候选的证据保留。

数据库备份采用共享 CMS 整库范围。一个网站的数据发布也必须暂停共享写入，失败时在本次窗口立即恢复；不提供保留其他站后续更新的单站历史回退。
