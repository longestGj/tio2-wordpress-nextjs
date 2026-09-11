# TiO₂ Malaysia 生产接管与发布记录（2026-09-11）

## 结论

本次生产发布已经达到 `PRODUCTION_VERIFIED`。生产业务版本为 `main@27f0a0da59df1e54cd01eab7d77eb7024b338d42`，Build ID 为 `wQLBw5iwDoUK0QoWOnb10`，活动基线为 `1189e46490fb155298c00323391d717091d5de490c9ae9d396ff7880ae5f783e`。正式网站与 CMS 均保持可用，公网只返回一个与该 commit 相同的 `X-Tio2-Release` 响应头。

本记录保存非秘密摘要；完整运行证据保存在忽略目录 `.production/runs/20260911T082815Z-27f0a0da59df/`。

## 三道门结果

| 门 | 结果 | 主要证据 |
|---|---|---|
| 候选 | PASSED | clean main、预发布 Gate A、同一 Build/CMS/58对象身份 |
| 部署 | PUBLIC_VERIFIED | 加密备份与隔离恢复通过；Next.js 候选接管；WordPress/MariaDB 保持已登记数据；正式 Status 读取通过 |
| 生产验收 | PRODUCTION_VERIFIED | 58对象×3视口=174/174；RFQ、Sample、Documents 各一次 provider accepted；用户确认三项实际收件 |

公网复核结果：apex `200`、`/about/` `200`、`/markets/` `200`、`www` `301`、CMS `200`，发布响应头数量为1。生产表面测试没有产生额外 POST；三次真实表单使用原运行记录，没有重发。

## 发布身份

| 项目 | 值 |
|---|---|
| 网站 | `tio2-my` |
| 生产 commit | `27f0a0da59df1e54cd01eab7d77eb7024b338d42` |
| 发布 archive SHA-256 | `5f8ac3533f8106f561a86095c646624700a00547805817c918488f125cb7302e` |
| Build ID | `wQLBw5iwDoUK0QoWOnb10` |
| CMS identity SHA-256 | `611c094aee1ffe901afd660cbea88e2bea9021c41f010dee9724a28ae7fdfeaf` |
| 活动基线 SHA-256 | `1189e46490fb155298c00323391d717091d5de490c9ae9d396ff7880ae5f783e` |
| 备份 ID | `20260911T083550Z-27f0a0da59df1e54cd01eab7d77eb7024b338d42-f7df48b15858476a954e9f1c5767a0ea` |
| 发布工具修复 commit | `e363e1c3d75622c790ecdf4a599231ed83a9d9f6` |

## 本次发现并固化的问题

- 首次接管需把 Plan 持久化到 root 所有目录，安装包不能依赖临时解压目录。
- Windows 源码、root 安装与 WP-CLI 临时目录必须按真实 Linux 权限和只读挂载验证。
- Certbot 证书是符号链接链，校验必须限制在批准归档目录内并读取实际目标。
- Nginx reload 后要等待新 worker 生效；健康路径使用站点的 canonical trailing-slash 形式。
- 发布响应头只保留在可切换 upstream include 中，避免主配置与 include 重复输出。
- SSH 断开后通过固定 Status 读取持久状态，不以会话是否存在判断发布结果。

对应修复已在 `codex/production-release-hardening` 完成155项发布测试并快进合入 `develop`。生产仍运行原 `main` 业务 commit；这些工具修复将在后续按正常 develop→main→预发布→生产流程进入下一版本。

## 运行交接

日常自动化使用忽略的 `.production/production-connection.json` 和 [生产发布工具](../production-deployment.md)。deploy 用户只可调用固定发布程序；普通发布不导入 SQL、不重复 seed、不修改 WordPress 数据。root 仅用于首次接管或经过单独批准的特权程序升级。

最终非秘密结构化摘要见[生产接管回执](2026-09-11-tio2-production-adoption-receipt.json)。
