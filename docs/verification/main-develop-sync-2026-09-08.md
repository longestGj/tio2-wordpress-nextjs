# main同步develop记录

用户授权：将main已有成果同步到develop，保留文档提交，并核对架构与代码。

- 同步前develop：`dbc2bab1fc4e5ab2a6a3abeb7b7c10fb9445373d`；main：`41be5cf39395025d39ccb270495c6a7a4eae4b0b`。
- 共同祖先：`de89d8c9dd48f3027d1649fce609d153ac7cc6f1`。
- 执行`git merge --no-edit main`，无冲突，合并commit：`1e2b954582ab979f9502d4f98aa99e8d251255c7`。
- 合并后相对main仅保留此前20个文档文件差异，应用代码一致。没有main回退、远端push或部署。
- 核对APP-000、共享外壳公开投影及RFQ context/submit接口后更新软件架构、询盘样稿与来源索引。原预填决定保留当时范围，服务端来源变化记录为合入代码事实，不自动新增业务批准。

## 验证

工作目录：`D:\16Wordpress_nextjs`。

首次Vitest命令未排除`.prerelease`，误收集历史冻结源码中的同名测试并出现失败；已中止，该结果不能作为当前代码通过或失败结论。未修改历史快照或测试配置。

重新明确测试范围：

```powershell
npm test -- tests/unit/rfq tests/integration/rfq tests/unit/applications tests/integration/applications tests/infrastructure/tio2-my-application-hub-contract.test.ts tests/infrastructure/tio2-my-global-chrome-contract.test.ts --exclude '.prerelease/**' --exclude '.tmp/**' --exclude 'tmp/**'
```

结果：退出码0，25个测试文件、139个测试通过。覆盖选定RFQ、Applications与共享合同的单元/集成检查。

本次没有运行浏览器E2E、重新构建预发布、真实提交或邮箱验收；同步结果不标记为新的E2E通过或发布就绪。此次是main既有代码同步，未新增应用实现；后续develop→main晋级仍遵守统一门槛。
