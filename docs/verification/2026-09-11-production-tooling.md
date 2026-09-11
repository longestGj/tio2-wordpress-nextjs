# 2026-09-11 TiO₂ Malaysia 发布工具分层验证

范围：`tio2-my`，`codex/oracle-vps-production-deployment` 工作区；Task4 起点 `e9effb3`。这是本地工具交付证据，未连接生产主机、修改 DNS、部署远端或修改共享分支。网站身份与操作入口见[发布工具说明](../production-deployment.md)。各任务的源码/回执/环境含义分别记录，不把早期通过替代当前整体通过。

## 已接受的 Tasks1–3

| 任务 | 交付与实际证据 | 边界 |
|---|---|---|
| Task1：基线与准备 | 唯一 root `baseline.json`、绑定 clean-main/预发布/包的 proof、固定三份输入和 prepare。2026-09-11 Python78通过；PowerShell真实打包→Python验证/提取/prepare、冻结合同 Vitest29通过。 | 当时 Windows + 受控 runner；没有把假 Docker 计为 Linux运行。后续基线由明确v2/v3扩展，早期部署动作不可用标记属于历史状态。 |
| Task2：可靠备份 | canonical request UUID、持久化恢复 journal、精确 writer fence、完整SQL/WP/source/config归档和age导出。最终修复 Windows100发现/98通过/2POSIX跳过，Linux40通过，基础设施6通过。真实安装备份/中断恢复 run `tio2-backup-test-3122a119dc624adc9f3eeb17bcf6ae21`：错误的另一有数据schema被拒绝；同UUID重试同backup；client解密、完整WP恢复、插件映射与实际加载、清理通过。 | Linux/amd64独有标签fixture；备份ID `20260910T231134Z-cccccccccccccccccccccccccccccccccccccccc-b7dac2ed2e19051f0a1df13430ad3d37`。不代表生产异地灾难隔离。 |
| Task3：前端更新与回滚 | v3/web-bluegreen固定adapter；兼容性门槛；实际 Next A→B→A→B、候选构建/启动/Nginx故障、SIGKILL切换恢复、重复指令、容器重启、三份独立解密恢复。run `tio2-update-test-84e4137a60264b20b140b7252ac69ce8` 清理通过。Windows108发现/106通过/2POSIX跳过；Linux43通过。独立审查后中断cleanup修复 Windows6/Linux6通过。 | 原完整循环证明未变路径；cleanup修复使用真实持久状态和限定adapter double，不夸大为新Docker SIGKILL循环。编译-only基础设施测试因worktree依赖缺失未通过；完整Docker Next构建与实际运行是独立证据。 |

三个 Task3 恢复分别取自 A、回滚后的 A、管理中的 B，均实际执行 UID33 PHP 插件加载。源文件保持root-private，恢复只消费 `tio2-ro-plugin-root-v1` 固定映射；未知映射/链接/多余文件拒绝。日常部署和回滚从未导入SQL或修改CMS记录。

## 可复用的真实镜像与来源

| 版本 | Linux/amd64 image ID | Next BUILD_ID |
|---|---|---|
| A | `sha256:83741678402b8eb16452c5db3d8e2b1f1fb5213fe32e3f4d079bf6330bdf9b09` | `e0Lcbj5TNdvW_ttlzVzSo` |
| B | `sha256:da82f19781024a5f3973d40d2f9b02f1200df4954ed561b0b9921b8c95532b4f` | `Xy-AugGO19I4jnRwi2wV3` |
| B2 | `sha256:9610eb960ae4c1c471139dea6267d09fa8e3c89576bef7d9cfd65f5722e78ed7` | `Xy-AugGO19I4jnRwi2wV3` |

B source archive SHA256 `a8403f155299b84b0792e84c13a724e889e1652e2b8d1929a0f6dc7fb511f215`，来自完整运行源子集和测试专用 `public/task3-version.txt`。全b提交和proof中的main/预发布字段是明确的fixture attestation，不代表真实clean-main发布来源。Task4复用此精确B包和普通安装程序的BuildKit缓存，不增加服务器缓存绕过。

Task3 当前A/B/B2的完整11个gzip层及config/history扫描未发现editorial token；A扫描展开637,652,091字节。公共表单key在客户端产物中符合预期。之前实际发现token落在Turbopack缓存，authoritative Dockerfile已以BuildKit secret + `/app/.next/cache` tmpfs修复；此前共享BuildKit旧缓存残留未清理，不能声称完全擦除。

原CMS某批准JSON的CRLF哈希与Git的LF哈希不同，Task3只在自己的clone登记前将“LF字节恰好等于批准JSON”的记录初始化为LF，原预发布不写入。实际采用需单独确认源/CMS字节一致。曾提出的standalone/runtime-config路由缺陷假设被实测否定，相关推测修改已撤回。原代码 `/about/`308→`/about`、`/markets`308→`/markets/` 保留。

## Task4 本地交付验证

本地控制器链路与实际候选浏览器证据已闭环，待独立代码审查。机器可核对的结果、绑定哈希和原始回执位置见[精简证据](2026-09-11-production-tooling-evidence.json)。原始日志和截图在本机忽略目录保留，下面的结论属于版本化交付记录。

- 控制器7项：主机/网站身份、错误回执、持久UUID、断线、错误备份绑定、缺失恢复证明均通过；这些使用模块内部transport double，只证明本地协议分支。
- 真实Windows `core.autocrlf=true` 仓库打包→Python校验回归通过，命令范围LF覆盖修复，原仓库配置仍true。
- 新client安全提取2项通过：路径逃逸、链接/特殊成员、重复项、文件祖先与未知外层成员先拒绝，随后才写入。
- 管理员包producer真实Git blob测试通过，固定14文件明确映射authoritative Dockerfile→web.Dockerfile，不执行安装。
- 完整针对性基础设施 Vitest66通过；Python112发现/110通过/2POSIX跳过；实际Linux提取2通过。后续控制器严格布尔回执和错误状态保留修复后7/7再次通过。
- 最终真实本地 run `tio2-controller-test-08c150f134df4895a96ef9b94e6694f4`：错误主机pin拒绝；真实上传/prepare；UUID落盘后强制终止并以相同请求字节恢复；真实加密备份下载/hash/解密；18张SQL表、7166个WP文件、UID33插件和文章计数恢复验证；清理后才生成第五证据。Release及重复Release均 `PUBLIC_VERIFIED`，Rollback及重复Rollback、回滚后Verify均 `ROLLED_BACK`，所有自有运行资源清理通过。
- 使用同一B源包和普通安装构建产生当前镜像 `sha256:8ce6a3774db80b337cdb26b557020ed41677a9ad8cb8ed10779744ca16634a51`，BUILD_ID `SYpUybrHqee4_MwBA19uE`。扫描全部11个gzip层、config/history，展开637,652,836字节，未发现该fixture的私有editorial token。这不是对任意未知秘密的证明。
- 浏览器通过本地loopback relay访问root登记的Nginx公共入口，并逐响应核对 `X-Tio2-Release`。实际58对象×3视口初跑166通过/8失败；失败来自测试错误假设summary初始关闭，修复为核对相反状态后，同一镜像、同一代理复验EU/UK/APP各3视口9/9通过。机器聚合确认8个原失败全覆盖，174个唯一对象/视口通过；没有将原始浏览器退出码1改写为单次174全绿。
- 实际检查包含批准canonical redirect、最终状态、标题/h1/可见内容、横向溢出及适用菜单、FAQ/summary、必填输入与键盘交互。无真实表单提交。固定fixture174通过只用于验证测试程序，不替代上述实际Next候选结果。
- 实际查看174个视口切片的6张概览及6个关键原图：HOME1440、RFQ390、DOC-TDS768、404390、HOME菜单390和EU1440 FAQ。所查看切片未见明显溢出或错误渲染；很多是交互后滚动位置，不能称全页面视觉验收。截图索引 `.tmp/task4/visual-review/inventory.json` 保存精确路径与SHA；概览 `contact-{1440,768,390}-{1,2}.jpg`。

调试记录保留边界：第三轮恢复文章计数比较口径不一致，修正为与服务端相同的skip模式，插件加载仍单独实际验证；第四轮远端非零未保存root journal，原因未知；第五轮发布本身成功，但fixture错误要求旧BUILD_ID，现改为真实登记镜像/BUILD_ID一致性。最终控制器会保留非秘密失败摘要并尝试读取Status，fixture保存失败前状态/journal，cleanup异常不覆盖原错误。没有因未知原因绕过服务端门槛，也没有重复未变化的Task3整套A→B→A→B构建来累加计数。

Task4独立审查fix1：默认SSH端口22现在写入裸hostname pin，非默认端口仍为 `[host]:port`；字段验证测试先证明存在临时密钥的完整配置有效，再逐字段破坏。新增pin格式回归先RED后GREEN，最终控制器9/9通过。真实SSH-only run `tio2-ssh-pin-8891528bf886432197f9c28d4ae1f1a7` 在本地22/57507各验证正确pin成功、全新RunRoot错误pin由OpenSSH拒绝（exit255），远端fixture Status总执行恰好2次；容器与临时私钥清理通过。旧完整演练的 `wrongHostPinRejected` 只证明已绑定RunRoot拒绝变更pin，本轮才补齐实际SSH错误密钥拒绝证据。SSH-only脚本使用精确既有工具镜像和模拟Status回执，没有重跑CMS/部署/浏览器。操作文档的发布流程锚点同步修正。

## 仍须独立记录的目标条件

当前物理Docker主机是amd64。精确生产基础镜像 `node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553` 以 `--platform linux/arm64 --network none` 本地模拟启动成功，实测 `arm64/linux/v24.21.0`；这只是模拟基础运行时preflight，完整Next ARM64构建和原生ARM64启动未验收。当前本地client和restore命名空间不等于不同物理主机。真实服务器交接/拓扑、实际异地存储、clean-main来源、生产DNS/TLS/互联网访问、表单服务商接收/实际收件与用户发布批准均未由本窗口完成。没有安排监控、定时任务、CI触发或新常驻Agent。
