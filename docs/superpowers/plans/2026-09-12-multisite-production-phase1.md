# D16 多网站生产发布阶段一实施计划

> **状态：已作废，禁止执行。** 2026-09-12后续确认将开发终点收紧为Gate8在Gate9通过后合入`develop`并写开发回执，同时把发布入口改为独立触发、五类公共包和七个固定动作。本计划基于更早的责任边界与六动作接口；待更新后的[发布架构规格](../specs/2026-09-12-multisite-production-release-architecture-design.md)完成书面复核后重新制定。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改动现有 WordPress、MariaDB、Nginx 内容、DNS 和公众流量的前提下，把当前生产系统登记为服务器、共享 CMS 与 `tio2-my` 三个主体；证明当前候选可归类为 `frontend-only`，并恢复同一 RunRoot 的生产发布。

**Architecture:** 新的固定控制器从 root 所有的主体登记解析资源和兼容路径，先完成只读迁移，再按主体执行固定动作。阶段一只允许 `tio2-my` 的 `frontend-only` 网站包：备份、部署和回退只处理前台资源；共享 CMS 只提供只读身份与内容证据，不进入网站备份或停止范围。

**Tech Stack:** Python 3.12 标准库、PowerShell 7、Docker Engine/Compose、Nginx、Certbot/OpenSSL、现有 Next.js 生产镜像、`unittest`、Vitest、Playwright。

**Spec:** [D16 多网站与共享 CMS 生产发布架构设计](../specs/2026-09-12-multisite-production-release-architecture-design.md)

## Global Constraints

- 本计划只实现设计中的阶段一；内容 generation 与 `content-only`/`combined` 在独立的阶段二计划实现，新网站标准接管在阶段三实现。
- 现有生产网站候选固定为 `8bf2a3d437b0582ef0ce193b69478622e26419af`，本地继续使用 `.production/runs/20260911T215847Z-8bf2a3d437b0`。
- 迁移前后，现网旧活动版本、候选身份、`PREPARED` 状态和所有既有生产数据保持不变；迁移程序不得写 Nginx 内容、调用 reload、停止容器、写数据库、移动卷或切流。
- 共享 CMS 是主体 `cms`；当前网站主体是 `tio2-my`；主体名和动作由 root 登记解析，deploy 用户不能传路径、命令、镜像、端口或挂载。
- 阶段一网站发布模式只能是 `frontend-only`。任何 CMS 证据不连续、内容变化、Schema/插件变化或跨作用域变化都停止当前批次，不得修改当前不可变发布包。
- 网站备份不得停止、导出或读取共享数据库、WordPress 文件、CMS 私钥或其他网站资源。
- TLS 登记保存证书名称、逻辑路径、允许的 archive 目录、DNS 名称、最低有效期和密钥配对规则；证书当前哈希只进入本次备份回执，不写成永久基线。
- 任何未登记的 Nginx 文件、混合主体配置、未知域名、端口冲突、目录逃逸、错误证书或跨站引用均失败关闭，并发生在生产写入前。
- 本地代码、测试和管理员包可以自主完成；把新的 root 程序、主体登记或 sudoers 安装到 `129.146.68.82` 前，必须提交确定的归档、SHA-256、变更清单、回退方法并取得该次明确授权。
- 不修改根 `AGENTS.md`，不在本计划引入 CI/CD，不改变业务内容、视觉、表单收件人或网站域名。

---

## 文件结构与职责

| 文件 | 职责 |
|---|---|
| `ops/production/server/subject_registry.py` | 严格读取 host/CMS/site 登记，解析主体兼容路径与资源所有者 |
| `ops/production/server/nginx_inventory.py` | 从 `nginx -T` 建立有效文件与引用图，并验证每个文件只有一个主体所有者 |
| `ops/production/server/tls_identity.py` | 解析 Certbot 动态链接，校验证书目录、SAN、有效期和公私钥配对 |
| `ops/production/server/cms_evidence.py` | 校验预发布 seed 身份、首次接管回执和当前生产作用域读回的连续证明 |
| `ops/production/server/phase1_migration.py` | 生成、应用、恢复阶段一迁移事务；保存旧程序、基线、状态和 sudoers |
| `ops/production/server/d16_release.py` | 提供 `/usr/local/sbin/d16-release <subject> <action>` 固定入口 |
| `ops/production/server/frontend_backup.py` | 只为一个前台主体生成加密、可恢复的网站备份 |
| `ops/production/server/deployment_core.py` | 复用现有蓝绿前台适配器，按主体路径完成候选、切流和回退 |
| `scripts/production/Production.Core.psm1` | 继续驱动同一 RunRoot，上传已封存的 CMS identity 证据并调用新固定入口 |
| `ops/production/server/bootstrap_install.py`、`build_admin_bundle.py` | 构建可回退的 root 程序代和阶段一管理员包 |
| `tests/production/` | Python 合同、证据、迁移、备份与部署故障测试 |
| `tests/production-runtime/` | Linux/Docker 的 A→B→A、备份恢复和中断重试演练 |
| `docs/production-deployment.md` | 记录阶段一能力、生产安装门槛、执行命令和回退边界 |

## Task 1：建立主体、Nginx 与 TLS 的可信登记

**交付结果：** 对现有服务器执行一次只读快照后，能够把每个有效 Nginx 文件和 TLS 依赖唯一归属到 `host`、`cms` 或 `site:tio2-my`；未知、重复或跨主体引用在任何写入前被拒绝。

**Files:**
- Create: `ops/production/server/subject_registry.py`
- Create: `ops/production/server/nginx_inventory.py`
- Create: `ops/production/server/tls_identity.py`
- Create: `tests/production/test_subject_registry.py`
- Create: `tests/production/test_nginx_inventory.py`
- Create: `tests/production/test_tls_identity.py`
- Modify: `ops/production/server/adoption_probe.py`

**Interfaces:**
- Produces: `load_registry(root: Path) -> SubjectRegistry`
- Produces: `classify_nginx(dump: str, registry: SubjectRegistry) -> NginxInventory`
- Produces: `resolve_certificate(policy: CertificatePolicy, run: CommandRunner) -> CertificateSnapshot`
- `NginxInventory.files` 是按绝对逻辑路径排序的不可变条目，每项包含 `logicalPath`、`resolvedPath`、`sha256`、`owner` 和 `references`。
- `CertificateSnapshot` 包含 `certName`、`fullchainPath`、`privateKeyPath`、两个当前哈希、SAN、`notAfter` 和 `keyPairVerified=true`。

- [ ] **Step 1: 写主体登记失败测试**

```python
def test_registry_rejects_unknown_subject_and_paths_outside_fixed_roots(self):
    registry = load_registry(self.fixture_root)
    with self.assertRaises(ReleaseError):
        registry.subject("site-b")
    self.write_site(path="../../root", site_id="tio2-my")
    with self.assertRaises(ReleaseError):
        load_registry(self.fixture_root)
```

- [ ] **Step 2: 运行主体登记测试并确认失败**

Run: `python -m unittest tests.production.test_subject_registry -v`

Expected: FAIL，错误指出 `subject_registry` 模块尚不存在。

- [ ] **Step 3: 实现严格登记类型和兼容路径**

```python
@dataclass(frozen=True)
class Subject:
    subject_id: str
    kind: Literal["cms", "site"]
    root: Path
    configuration: Path
    incoming: Path
    outgoing: Path

@dataclass(frozen=True)
class SubjectRegistry:
    host: HostRegistration
    cms: Subject
    sites: Mapping[str, Subject]

    def subject(self, subject_id: str) -> Subject:
        if subject_id == "cms":
            return self.cms
        try:
            return self.sites[subject_id]
        except KeyError as error:
            raise ReleaseError("release subject is not registered") from error
```

登记解析只接受 schema 中列出的键、绝对固定路径、`cms` 保留名和 `[a-z0-9][a-z0-9-]{0,62}` 站点 ID。为 `tio2-my` 固定映射现有 `/etc/tio2-production`、`/opt/tio2-production` 与 deploy 收发目录。

- [ ] **Step 4: 写 Nginx 所有权与 include 图失败测试**

```python
def test_effective_nginx_rejects_unknown_and_cross_subject_private_key(self):
    with self.assertRaisesRegex(ReleaseError, "unregistered Nginx"):
        classify_nginx(self.dump_with("/etc/nginx/conf.d/unknown.conf"), self.registry)
    with self.assertRaisesRegex(ReleaseError, "TLS owner"):
        classify_nginx(self.site_dump_using_cms_private_key(), self.registry)
```

- [ ] **Step 5: 实现有效 Nginx 文件清单和单一所有权校验**

使用 `nginx -T` 的 `# configuration file <path>:` 边界收集真正加载的文件；解析 `include`、`ssl_certificate`、`ssl_certificate_key`、`proxy_pass`、`server_name` 和 `listen`。路径必须命中登记中的唯一规则；同一路径命中两个主体、未命中、站点读取 CMS 私钥、域名或端口重复都抛出 `ReleaseError`。

- [ ] **Step 6: 写动态 Certbot 证书测试**

```python
def test_certbot_renewal_changes_snapshot_without_changing_policy(self):
    first = resolve_certificate(self.policy, self.runner(fullchain="fullchain1.pem"))
    second = resolve_certificate(self.policy, self.runner(fullchain="fullchain2.pem"))
    self.assertEqual(first.cert_name, second.cert_name)
    self.assertNotEqual(first.fullchain_sha256, second.fullchain_sha256)

def test_certificate_rejects_archive_escape_or_key_mismatch(self):
    for runner in (self.escape_runner(), self.mismatched_key_runner()):
        with self.assertRaises(ReleaseError):
            resolve_certificate(self.policy, runner)
```

- [ ] **Step 7: 实现 TLS 身份策略校验**

只允许解析到 `/etc/letsencrypt/archive/<cert-name>/` 内的普通 root 文件；用固定 `openssl x509` 读取 SAN/有效期，用证书公钥与私钥公钥的 DER SHA-256 比较证明配对。不得把当前证书哈希写回登记。

- [ ] **Step 8: 运行 Task 1 测试并提交**

Run: `python -m unittest tests.production.test_subject_registry tests.production.test_nginx_inventory tests.production.test_tls_identity -v`

Expected: PASS；测试断言只读 runner 中不存在 `reload`、`stop`、`start`、数据库写入或文件替换。

Commit: `git commit -m "feat(production): register release subjects and owned ingress"`

## Task 2：建立 CMS 连续证据并迁移 PREPARED 状态

**交付结果：** 当前批次只有在预发布 seed 身份、首次接管导入回执和当前生产 `site_scope=tio2-my` 读回形成同一条证据链时，才能生成 `frontend-only` 状态；任何不一致都只输出阻断回执。

**Files:**
- Create: `ops/production/server/cms_evidence.py`
- Create: `tests/production/test_cms_evidence.py`
- Create: `tests/production/test_phase1_state_migration.py`
- Modify: `ops/production/server/adoption_probe.py`
- Modify: `ops/production/server/release_state.py`
- Modify: `scripts/production/Production.Core.psm1`
- Modify: `tests/infrastructure/production-controller.test.ts`

**Interfaces:**
- Produces: `verify_frontend_only_evidence(proof, prerelease_identity_bytes, seed_manifest, adoption, live_scope) -> CmsEvidence`
- Produces: `migrate_prepared_state(legacy_state, host_baseline, cms_evidence, site_baseline) -> dict[str, object]`
- `CmsEvidence` 保存 proof 中的 identity 哈希、seed manifest 哈希、有序 seed 哈希、接管后的内容哈希、当前内容哈希、记录数和 `verified=True`；不保存内容正文或秘密。
- 状态迁移输出 `schemaVersion=d16-site-release-state-v1`、`subject=tio2-my`、`mode=frontend-only`，并保留旧 candidate 的四个哈希、活动版本、`PREPARED` 和旧状态 SHA-256。

- [ ] **Step 1: 写证据算法不同但证明链成立的失败测试**

```python
def test_identity_hash_is_not_compared_to_content_hash(self):
    evidence = verify_frontend_only_evidence(
        proof=self.proof(cms_identity_sha256=sha256(self.identity_bytes)),
        prerelease_identity_bytes=self.identity_bytes,
        seed_manifest=self.seed_manifest,
        adoption=self.adoption(content_sha256="a" * 64),
        live_scope=self.scope(content_sha256="a" * 64),
    )
    self.assertNotEqual(evidence.prerelease_identity_sha256, evidence.live_content_sha256)
    self.assertTrue(evidence.verified)
```

- [ ] **Step 2: 运行 CMS 证据测试并确认失败**

Run: `python -m unittest tests.production.test_cms_evidence -v`

Expected: FAIL，错误指出 `cms_evidence` 模块尚不存在。

- [ ] **Step 3: 实现三段证据校验**

`verify_frontend_only_evidence` 必须依次验证：原始 `cms-identity.json` 字节哈希等于 proof；identity 的 `siteScope`、seed manifest、seed 顺序和计数等于候选归档；首次接管状态绑定相同 candidate、seed manifest、导入后记录数与内容哈希；fresh 生产读回的 scope、记录数和内容哈希等于接管回执。日期字段不参与内容比较，但其格式仍严格验证。

- [ ] **Step 4: 增加每一环篡改和缺失测试**

```python
def test_every_evidence_break_blocks_frontend_only(self):
    mutations = (
        lambda x: x["proof"].update(cmsIdentitySha256="0" * 64),
        lambda x: x["identity"].update(orderedSeedHashes=list(reversed(x["identity"]["orderedSeedHashes"]))),
        lambda x: x["adoption"].update(candidate={"commit": "0" * 40}),
        lambda x: x["live"].update(contentSha256="f" * 64),
    )
    for mutate in mutations:
        with self.subTest(mutate=mutate), self.assertRaises(ReleaseError):
            verify_frontend_only_evidence(**self.mutated(mutate))
```

- [ ] **Step 5: 让本地控制器封存并上传既有 CMS identity**

PowerShell 从 `.prerelease/runs/20260911T214529Z-8bf2a3d437b0/cms-identity.json` 读取原始字节，只在其 SHA-256 等于当前 `release-proof.json` 中的 `cmsIdentitySha256` 时，原子复制到当前生产 RunRoot 的 `cms-identity.json`。传输白名单增加这个固定文件名；不修改 `release.tar.gz`、manifest 或 proof。

- [ ] **Step 6: 写 PREPARED 状态无损迁移测试**

```python
def test_prepared_migration_preserves_candidate_and_state(self):
    migrated = migrate_prepared_state(self.legacy, self.host, self.cms, self.site)
    self.assertEqual(migrated["state"], "PREPARED")
    self.assertEqual(migrated["details"]["candidate"], self.legacy["details"]["candidate"])
    self.assertEqual(migrated["details"]["mode"], "frontend-only")
    self.assertEqual(migrated["details"]["legacyStateSha256"], sha256_json(self.legacy))
```

- [ ] **Step 7: 实现无损状态映射和阻断回执**

旧状态保持原文件不变；新站点状态写入迁移暂存目录。证据失败时生成 `d16-phase1-blocked-v1` 回执，包含失败阶段和输入哈希，不创建新活动状态、不改 `PREPARED`、不把当前 RunRoot 标为成功。

- [ ] **Step 8: 运行 Task 2 测试并提交**

Run: `python -m unittest tests.production.test_cms_evidence tests.production.test_phase1_state_migration -v`

Run: `npx vitest run tests/infrastructure/production-controller.test.ts`

Expected: PASS；相同 RunRoot 重试复用同一 identity 证据，文件已存在但字节不同则失败关闭。

Commit: `git commit -m "feat(production): prove frontend only CMS continuity"`

## Task 3：实现可回退的阶段一 root 迁移和固定入口

**交付结果：** 一个哈希绑定的管理员包能在全局锁内原子安装新程序代、主体登记、准确 sudoers 和迁移后的状态；任一点失败或进程中断都能恢复旧程序、旧基线和旧状态。迁移本身不改变运行流量。

**Files:**
- Create: `ops/production/server/phase1_migration.py`
- Create: `ops/production/server/d16_release.py`
- Create: `ops/production/server/root-migrate-phase1.sh`
- Create: `tests/production/test_phase1_migration.py`
- Create: `tests/production/test_d16_release_entrypoint.py`
- Modify: `ops/production/build_admin_bundle.py`
- Modify: `ops/production/server/bootstrap_install.py`
- Modify: `ops/production/server/bootstrap_selftest.py`
- Modify: `ops/production/server/install.sh`
- Modify: `ops/production/server/sudoers.tio2-release`
- Modify: `tests/production/test_admin_bundle.py`
- Modify: `tests/production/test_bootstrap_install.py`

**Interfaces:**
- Produces: `Phase1Migration.plan() -> MigrationPlan`
- Produces: `Phase1Migration.apply(expected_plan_hash: str) -> dict[str, object]`
- Produces: `Phase1Migration.recover() -> dict[str, object]`
- Produces CLI: `/usr/local/sbin/d16-release <cms|siteId> <status|prepare|backup|deploy|verify|rollback>`
- `cms` 在阶段一只报告 status；写动作返回固定的 `capability-not-installed`，不能落到网站适配器。

- [ ] **Step 1: 写迁移 dry-run 和零副作用测试**

```python
def test_plan_classifies_current_host_without_mutation(self):
    before = self.snapshot_bytes()
    plan = Phase1Migration(self.paths, self.runner).plan()
    self.assertEqual(plan.subjects, ("cms", "tio2-my"))
    self.assertEqual(self.snapshot_bytes(), before)
    self.assertFalse(any(call.action in {"reload", "stop", "start"} for call in self.runner.calls))
```

- [ ] **Step 2: 运行迁移测试并确认失败**

Run: `python -m unittest tests.production.test_phase1_migration -v`

Expected: FAIL，错误指出 `phase1_migration` 模块尚不存在。

- [ ] **Step 3: 实现迁移计划、日志和原子写入**

迁移日志逐项记录旧文件 SHA-256、暂存文件 SHA-256、替换是否完成和恢复动作。应用顺序固定为：验证 root/锁/管理员包 → 只读快照 → 证据链 → 暂存程序代与登记 → 自检 → 原子安装登记和新站点状态 → 原子切换程序 symlink → 安装 sudoers。成功后再次只读核对再删除日志。

- [ ] **Step 4: 写每个提交点的故障注入与重复执行测试**

```python
def test_each_commit_point_recovers_exact_previous_generation(self):
    for point in self.commit_points:
        with self.subTest(point=point):
            self.reset_fixture()
            with self.assertRaises(ReleaseError):
                self.migration(fail_after=point).apply(self.plan_hash)
            self.migration().recover()
            self.assertEqual(self.current_generation(), self.original_generation)
            self.assertEqual(self.protected_tree_hash(), self.original_tree_hash)
```

- [ ] **Step 5: 实现固定多主体入口**

```python
def run(arguments: Sequence[str]) -> dict[str, object]:
    if len(arguments) != 2:
        raise ReleaseError("subject and fixed action are required")
    subject_id, action = arguments
    if action not in ACTIONS:
        raise ReleaseError("release action is not supported")
    subject = load_registry(DEFAULT_REGISTRY).subject(subject_id)
    return dispatch(subject, action)
```

入口清空环境、固定 PATH/umask、获取 `/opt/d16-release/state/release.lock`，并为该主体加载 root 登记的路径。sudoers 只列出已登记主体与六个固定动作；不得允许通配符、附加参数或旧的任意路径。

- [ ] **Step 6: 扩展管理员包和安装自检**

管理员包 manifest 精确列出新增模块、安装目标、模式与 SHA-256。`bootstrap_selftest.py` 在临时根中验证导入、入口拒绝非法主体/动作、程序代回退和 sudoers 文本；安装器拒绝额外文件、软链接、组可写文件和目标碰撞。

- [ ] **Step 7: 运行 Task 3 测试和 POSIX 安装测试**

Run: `python -m unittest tests.production.test_phase1_migration tests.production.test_d16_release_entrypoint tests.production.test_admin_bundle tests.production.test_bootstrap_install -v`

Run: `python -m unittest tests.production.test_prepare_posix -v`

Expected: PASS；所有故障点恢复原字节，迁移成功路径中没有 Nginx reload、Docker stop/start、数据库写入或 current 前台切换。

- [ ] **Step 8: 提交 root 迁移实现**

Commit: `git commit -m "feat(production): add atomic multi subject migration"`

## Task 4：恢复 frontend-only 发布并形成生产候选

**交付结果：** 同一 RunRoot 可以通过新入口完成前台专属备份、异地恢复验证、Gate B、蓝绿切流、公开验证和回退；隔离演练证明整个路径不停止、不归档、不改写共享 CMS。

**Files:**
- Create: `ops/production/server/frontend_backup.py`
- Create: `tests/production/test_frontend_backup.py`
- Create: `tests/production-runtime/frontend_release_rehearsal.py`
- Modify: `ops/production/server/release_actions.py`
- Modify: `ops/production/server/deployment_core.py`
- Modify: `ops/production/server/release_baseline.py`
- Modify: `ops/production/server/release_contract.py`
- Modify: `scripts/production/Production.Core.psm1`
- Modify: `scripts/production.ps1`
- Modify: `tests/production/test_backup_action.py`
- Modify: `tests/production/test_deployment_core.py`
- Modify: `tests/production/test_client_recovery.py`
- Modify: `tests/production-runtime/run_release_rehearsal.py`
- Modify: `docs/production-deployment.md`
- Modify: `.agents/skills/d16-production-release/SKILL.md`

**Interfaces:**
- Produces: `backup_frontend(subject: Subject, baseline: SiteBaseline, certificate: CertificateSnapshot) -> FrontendBackupReceipt`
- Produces: `restore_frontend_backup(ciphertext: Path, identity: Path) -> FrontendRestoreEvidence`
- `Release` 仍按 `prepare → backup → off-host restore evidence → deploy → verify` 执行，并在每一步绑定同一 candidate、subject、mode、host baseline、CMS evidence 和 backup ID。
- `Rollback` 只恢复 `tio2-my` 的旧镜像、活动前台指针、upstream、站点 Nginx/证书与站点状态，不调用 CMS 恢复。

- [ ] **Step 1: 写前台备份范围失败测试**

```python
def test_frontend_backup_contains_only_owned_site_resources(self):
    receipt = backup_frontend(self.site, self.baseline, self.certificate)
    names = self.decrypt_names(receipt)
    self.assertEqual(names, self.expected_site_files)
    self.assertFalse(any(name.startswith(("database/", "wordpress/", "cms/")) for name in names))
    self.assertFalse(any("stop" in call or "mariadb-dump" in call for call in self.runner.calls))
```

- [ ] **Step 2: 运行前台备份测试并确认失败**

Run: `python -m unittest tests.production.test_frontend_backup -v`

Expected: FAIL，错误指出 `frontend_backup` 模块尚不存在。

- [ ] **Step 3: 实现前台专属加密备份与恢复验证**

备份 manifest 只接受登记中的活动前台版本、站点 Nginx/upstream、当前站点证书快照、站点登记/基线/状态以及 host/CMS 引用。先在本地临时目录完成 tar 全量读取和 manifest 核对，再 age 加密；异地恢复验证必须解密、完整读取归档并重建一个隔离前台槽位，不能只校验密文哈希。

- [ ] **Step 4: 将现有蓝绿适配器绑定到 Subject**

删除 `deployment_core.py` 中对全局 `tio2-my` 路径的隐式读取，所有路径、域名、端口和容器前缀来自已验证的 `Subject`。阶段一显式拒绝 `cms` 写动作及站点 mode 非 `frontend-only`；部署和回退均验证 fresh CMS evidence 未改变。

- [ ] **Step 5: 写 A→B→A、CMS 隔离和中断恢复测试**

```python
def test_frontend_release_and_rollback_leave_cms_identity_unchanged(self):
    cms_before = self.cms_runtime_identity()
    self.release("A", "B")
    self.rollback("B", "A")
    self.assertEqual(self.cms_runtime_identity(), cms_before)
    self.assertEqual(self.cms_stop_calls(), [])
    self.assertEqual(self.database_write_calls(), [])
```

故障矩阵必须覆盖候选构建失败、内部验证失败、upstream 原子替换前后中断、Nginx 测试失败、reload 失败、公开验证失败、SSH 断线、同一请求重复执行和回退中断。

- [ ] **Step 6: 更新本地控制器以复用同一 RunRoot**

`scripts/production.ps1 -Operation Release -RunRoot <exact-path>` 调用 `sudo /usr/local/sbin/d16-release tio2-my <action>`。每次远端回执必须匹配 `siteId=tio2-my`、`mode=frontend-only`、四个 candidate 哈希、CMS evidence SHA-256 和同一个 backup request；旧的 `tio2-release` 入口不再用于该批次的后续动作。

- [ ] **Step 7: 运行完整本地测试与 Linux/Docker 演练**

Run: `python -m unittest discover -s tests/production -p 'test_*.py' -v`

Run: `npx vitest run tests/infrastructure/production-package.test.ts tests/infrastructure/production-controller.test.ts tests/infrastructure/production-contracts.test.ts`

Run: `python tests/production-runtime/frontend_release_rehearsal.py --isolated`

Run: `python tests/production-runtime/run_ssh_pin_rehearsal.py --isolated`

Expected: 全部 PASS；演练回执明确列出 CMS 容器 ID、数据库卷和 CMS 配置在 A→B→A 全程未改变，前台备份解密与隔离恢复通过。

- [ ] **Step 8: 更新发布文档与项目级 Skill**

`docs/production-deployment.md` 记录三类主体边界、阶段一只支持 `frontend-only`、同一 RunRoot 恢复顺序、生产安装门槛和回退。项目级 `.agents/skills/d16-production-release/SKILL.md` 只引用稳定命令和门槛，不复制实现细节，也不安装到个人 skill 目录。

- [ ] **Step 9: 整体审查并提交阶段一候选**

Run: `git diff --check`

Run: `$patterns=@(('T'+'BD'),('T'+'ODO'),('implement '+'later'),('fill '+'in')); rg -n ($patterns -join '|') ops/production scripts/production tests/production tests/production-runtime docs/production-deployment.md .agents/skills/d16-production-release/SKILL.md`

Expected: `git diff --check` 无错误；placeholder 扫描无命中；生产相关完整测试保持通过。

Commit: `git commit -m "feat(production): isolate frontend only releases from shared CMS"`

## 阶段一完成与生产安装门槛

四个任务完成、测试通过和整体审查通过后，只能称为“阶段一生产工具候选”。执行者随后生成一个固定管理员归档及 SHA-256，并提供：

1. 新旧程序代和文件差异；
2. 主体登记、Nginx/TLS 所有权快照和 CMS 连续证据摘要；
3. 迁移 dry-run 回执；
4. 每个故障点的回退演练结果；
5. root 安装的唯一命令及自动恢复条件；
6. 安装后只读核对命令；
7. 当前 RunRoot 后续 `Release`、Gate B、生产 E2E、三次真实表单和最终回执步骤。

用户对这份确定材料批准后，才在生产服务器安装 root 程序与登记。安装成功只代表控制面迁移完成；仍须按现有生产发布三道门继续同一 RunRoot，完成 58 对象、174 浏览器案例、RFQ/Sample/Documents 真实提交、用户确认三封邮件和最终 `PRODUCTION_VERIFIED` 回执，才能关闭当前发布。
