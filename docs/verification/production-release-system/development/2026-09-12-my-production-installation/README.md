# MY 生产安装开发验证记录

- 日期：2026-09-12；网站：`tio2-my`，共享 CMS 的其他范围纳入数据保留检查。
- 分支：`codex/my-production-installation`；基线 develop：`b39cc830995ed9742d2b0cf5e54a8b9679812c80`。
- 本轮程序验证版本：`aa8499c7d143f70ddbed1b97f0d0b25b07ed4cae`。此后仅整理文档、证据和演练说明；每次演练的实际源版本与逐文件哈希以对应 JSON 为准。
- 状态：`DEVELOPMENT_VERIFIED`，等待下述开发合并回执。main 保持 `8b92adf391ab1fbe1564e8821f2fdf0535700f96`；本轮没有连接或修改生产服务器。

## 实现与验证

本次实现管理员 CMS 插件升级、整库备份与同窗口恢复、密封导入器、真实维护/刷新/页面验证 hooks，以及正常客户端的新前台候选接纳。内容能力在新前台和实际验证完成前保持待启用。没有新增 deploy 任意 sudo 权限，也没有历史整库覆盖后续更新的回退入口。

| 证据 | 结果及边界 |
|---|---|
| [完整单元及组件回归](unit-regression.json) | 558 项，9 项平台条件跳过，0 失败、0 错误；590.829 秒，退出码 0。 |
| [资源升级与恢复](resources-rehearsal.json) | 真实 WordPress 容器、插件与导入器升级/恢复通过；不是完整生产验收。 |
| [安装后实际 hooks](installed-hooks-rehearsal.json) | 实际 WordPress GraphQL、生产 Next.js 构建、Nginx、签名刷新、HTML/SEO/sitemap 及失败恢复通过；查看了桌面首页截图，不代表 58 个对象的全站视觉验收。 |
| [完整安装编排](backend-rehearsal.json) | 真实 CMS/数据库/备份恢复/维护/hooks/登记；成功安装和故意触发 HTML 验证失败后的回退均通过，两个 CMS 范围保留。前台为生成的只读 HTTP fixture，Nginx 使用实际 signal reload，未使用 systemd。 |
| [较早前台演练](frontend-earlier-fixture-pass.json) | 较早 C/D 候选切换与回退证据；不能代替最终代码的复验。 |
| [历史前台演练阻断](frontend-latest-blocked.json) | Docker 构建前失败，未产生本轮通过用例；独立网络诊断定位到 Docker Hub 依赖获取失败。 |
| [此前未完成的安装尝试](backend-incomplete.json) | 保留历史失败事实；当前完整安装结果由后续 backend-rehearsal.json 补足。 |

独立代码复审没有未解决的新增阻塞。CMS scope 绑定及挂载排序另运行 35 项定向测试通过。2026-09-12 代理恢复后，原始构建流程的最终前台演练已通过 11 个用例（执行代码 ee6aa01e，生产程序与 aa8499c7 相同）；用旧应用镜像代替构建、删掉 Dockerfile syntax 或跳过构建不算复验。

最终补验：[frontend-final-pass.json](frontend-final-pass.json)。实际构建新候选、C/D 候选发布与回退通过，cleanupVerified=true。使用生成的 Node fixture，不能代替待发布业务站点的预发布及生产 E2E。

## 本地环境事件与清理

此前并行测试期间 C 盘耗尽，完整测试因此报错，Docker Desktop 也停止响应；两者的直接因果未证明。该失败测试不作为代码通过依据。恢复 Docker 后，按所有权标签清理本任务残留容器与卷，恢复 D16 本地数据库、WordPress 和预发布前台。后续测试临时文件及镜像导出改放 D 盘。

完整安装重试退出码为 0；运行 `d16-test-backend-400b013e8dd7` 的容器和 daemon 卷已自动清理，随后按精确标签再次查询无残留。没有清理其他项目资源。

## 下一步

开发验证已通过。完成 develop 合并回执后，由独立发布流程冻结候选、晋级 main、预发布和生产。旧 `c619b30e…` 管理员包仍不可执行；本记录没有授权复用任何旧安装计划。
