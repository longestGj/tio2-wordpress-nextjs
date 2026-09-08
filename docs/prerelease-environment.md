# TiO₂ Malaysia 本地预发布环境

这套环境是`tio2-my`完成本地`main`集成后的权威全站本地测试入口。它使用独立Docker Compose项目`d16-tio2-my-prerelease`，包含MariaDB、独立WordPress后台、WP-CLI初始化、Next.js构建和Web运行实例。它不代表远程Preview、Production、Gate 9、Gate 10或发布授权。

## 地址与隔离

| 服务 | 本机地址 | 暴露范围 |
|---|---|---|
| Next.js网站 | `http://127.0.0.1:3100` | 仅loopback |
| WordPress后台 | `http://127.0.0.1:8180/wp-admin/` | 仅loopback |
| WordPress GraphQL | `http://127.0.0.1:8180/graphql` | 仅loopback |
| MariaDB | 无主机端口 | 仅Compose内部网络 |

数据库、WordPress文件和npm缓存使用`d16-tio2-my-prerelease_`前缀的专用volume。控制器不会停止其他项目进程，也不会删除此前缀之外的volume。

## 首次配置

需要Docker Desktop、Node.js/npm、Git、PowerShell和本仓库已安装的Playwright浏览器。只在本地`main`工作树干净时启动。

复制[配置示例](../ops/prerelease/.env.example)为仓库根目录`.env.prerelease.local`，替换数据库、WordPress管理员、revalidation、preview和已批准Web3Forms receiver值。文件已被Git忽略。`PRERELEASE_SOURCE_DIR`和`PRERELEASE_RUN_DIR`由控制器在每次运行时覆盖；不要把密钥写入代码、文档或回执。

`PRERELEASE_LIVE_FORMS_ENABLED=false`是默认值。启动前会检查必需字段，错误只报告字段名，不输出字段值。

## 日常命令

```powershell
npm run prerelease:start
npm run prerelease:status
npm run prerelease:test
npm run prerelease:stop
npm run prerelease:reset
```

`start`先核对当前分支为`main`且工作树干净，再通过`git archive <full-commit>`创建冻结源码。它启动CMS、校验所有seed哈希、只应用未记录的匹配seed、构建Next.js、启动Web，并执行两轮只读HTTP检查。操作锁位于`.prerelease/operation.lock`。

`status`不输出环境变量或密钥。主要状态如下：

| 状态 | 含义 |
|---|---|
| `HEALTHY` | 保存的commit、站点、Build ID、CMS身份和当前运行实例一致，且本地`main`未移动 |
| `STALE_MAIN` | 运行实例本身仍一致，但本地`main`已前移；服务保持运行，需重新构建后才能代表最新`main` |
| `UNHEALTHY` | 运行不可达，或Build、站点、CMS、commit/run身份不一致 |
| `STOPPED` | 没有当前运行，或已通过控制器停止 |

`test`仅运行`tests/e2e/prerelease-smoke.spec.ts`。测试拦截所有非GET请求，验证代表性页面、CMS页面身份、导航、canonical/robots、Cookie Settings、三张表单的本地验证、键盘流程、1440/768/390布局、横向溢出和Chromium 200%页面缩放。结果必须记录`externalPostCount: 0`。

`stop`只停止此Compose项目并保留数据及运行证据。`reset`要求服务已停止，只删除该项目实际拥有的volume；旧运行证据仍保留。

## 显式真实表单测试

只有需要验证真实Web3Forms接收时，先把`.env.prerelease.local`中的`PRERELEASE_LIVE_FORMS_ENABLED`改为`true`，再明确运行：

```powershell
npm run prerelease:test:forms-live
```

该命令会真实对外发送三次请求：RFQ、Request a Sample和Request Documents各一次。主题带`[LOCAL PRERELEASE]`，payload带`environment=local-prerelease`及复用现有请求令牌的`test_run_id`。自动结果只证明服务商返回明确JSON success；`inboxConfirmed`保持`false`，实际收件需要另行人工确认。普通`prerelease:test`不会发送表单。

## 身份、证据与排错

每次运行保存在`.prerelease/runs/<UTC>-<shortCommit>/`，其中包括源码tar及其SHA-256、冻结源码、`cms-identity.json`和`run-manifest.json`。`.prerelease/current-run.json`只指向当前运行。测试证据保存在忽略目录`docs/verification/prerelease/runs/<UTC>-<UUID>/`，每次新建且不覆盖。

常见恢复步骤：

- 3100或8180被占用：定位并处理占用者；控制器不会终止未知进程。
- 配置失败：按报告的字段名修正`.env.prerelease.local`，不要粘贴值到任务消息或日志。
- CMS/seed失败：查看本次`run-manifest.json`的`failedStage`；seed哈希不匹配时先核对当前`main`和Manifest，不能跳过校验。
- Build或HTTP失败：保留失败run目录，修复代码或环境后从新的干净`main`重新执行`start`。
- `STALE_MAIN`：执行`stop`，确认新`main`干净，再执行`start`；不要把旧Build作为新`main`证据。

本环境不执行Git push、远程WordPress写入、部署、DNS、索引或发布。
