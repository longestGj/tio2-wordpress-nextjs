# D16 五类发布系统阶段一基础 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可扩展到五类发布的统一包合同、主体控制器和七动作状态机，安全接管当前已处于`PREPARED`的`tio2-my`事务，并只开放经过完整演练的`frontend-only`生产发布能力。

**Architecture:** 本地发布层冻结准确`develop`候选、核对开发回执与实际差异、完成发布侧集成和`main`预发布，再生成包含`subject + releaseType`的不可变候选包。服务器端由root登记解析主体，以一个全局锁、每主体独立状态和固定七动作分派适配器；阶段一完整实现`tio2-my/frontend-only`，其他四类合同可被识别但写动作失败关闭。现有候选通过兼容事务引用旧包、CMS连续证据和相同RunRoot，不改写任何不可变制品。

**Tech Stack:** Python 3.12标准库、PowerShell 7.2、JSON严格合同、Docker Engine/Compose、Nginx、Certbot/OpenSSL、Next.js 16、`unittest`、Vitest、Playwright。

**Spec:** [D16 五类发布系统与共享 CMS 架构设计](../specs/2026-09-12-multisite-production-release-architecture-design.md)

## Global Constraints

- 本计划只实现设计第19节阶段一；阶段二的内容generation、`content-only`/`combined`写入与`cms-platform`适配器，以及阶段三的`host-infrastructure`执行、Release Campaign和新站接管，必须使用各自独立计划。
- 五种发布类型的包和分类合同在阶段一全部建立；未安装的适配器只能返回`capability-not-installed`，不能回退到`frontend-only`或现有单站逻辑。
- 七个固定动作是`status prepare backup stage activate verify rollback`；`stage`不得改变活动版本，`activate`不得绕过`INTERNAL_VERIFIED`。
- 开发以 Gate8 调用的独立代码复审通过、Gate8 合入`develop`并写开发回执为终点；发布必须由独立指令触发，冻结准确`develop` commit后才可开始。
- 当前生产网站候选固定为`8bf2a3d437b0582ef0ce193b69478622e26419af`，生产活动版本仍为`27f0a0da59df1e54cd01eab7d77eb7024b338d42`，本地RunRoot保持`.production/runs/20260911T215847Z-8bf2a3d437b0`。
- 兼容迁移前后保持现网活动版本、候选身份、`PREPARED`状态、数据库、WordPress文件、Nginx字节、容器和公众流量不变。
- 共享CMS是主体`cms`，网站主体是`tio2-my`，服务器控制面主体是`host`；路径、域名、端口、容器、证书和运行身份只由root登记解析。
- deploy用户只能调用已登记网站和CMS的固定动作；`host`动作只能由root调用。
- 当前候选只有在预发布seed身份、首次接管回执和fresh生产作用域读回形成连续证据时才能归为`frontend-only`；任何差异都封存当前批次并停止。
- 网站备份不得停止、导出或读取共享数据库、WordPress文件、CMS私钥或其他网站资源。
- 生产写入、管理员安装和切流不属于本实施计划的自动步骤。完成本地实现和演练后，另行形成可审查的管理员包与生产执行材料，并复用届时适用的用户授权。
- 不修改根`AGENTS.md`，不引入CI/CD，不改变业务内容、视觉、域名、DNS、表单收件配置或生产密钥。

---

## 文件结构与职责

| 文件 | 职责 |
|---|---|
| `ops/production/contracts/candidate-envelope.schema.json` | 五类候选共用信封字段与严格枚举 |
| `ops/production/contracts/*.payload.schema.json` | 五种相互排斥的payload字段与禁止项 |
| `ops/production/server/candidate_contract.py` | 严格读取、哈希和校验候选信封及payload |
| `ops/production/server/release_classifier.py` | 依据冻结Git差异、内容manifest、配置差异和开发回执确定主体与类型 |
| `ops/production/server/subject_registry.py` | 严格读取host、cms和site登记，返回固定资源与兼容路径 |
| `ops/production/server/nginx_inventory.py` | 解析`nginx -T`有效文件图并确认唯一主体所有权 |
| `ops/production/server/tls_identity.py` | 校验证书逻辑身份、动态Certbot目标、SAN、有效期和密钥配对 |
| `ops/production/server/release_adapter.py` | 定义七动作适配器Protocol及未安装能力失败实现 |
| `ops/production/server/release_controller.py` | 在全局锁内校验包、读取主体状态并分派唯一适配器 |
| `ops/production/server/d16_release.py` | `/usr/local/sbin/d16-release <subject> <action>`固定入口 |
| `ops/production/server/release_state.py` | 每主体状态、持久事务日志、审计回执和恢复语义 |
| `ops/production/server/cms_evidence.py` | 验证当前候选的三段CMS连续证据 |
| `ops/production/server/phase1_migration.py` | 对旧程序、登记和`PREPARED`状态进行可恢复兼容迁移 |
| `ops/production/server/frontend_backup.py` | 生成并验证只包含目标网站前台资源的加密备份 |
| `ops/production/server/site_frontend_adapter.py` | 实现前台`prepare/backup/stage/activate/verify/rollback` |
| `ops/production/server/deployment_core.py` | 保留底层Docker/Nginx蓝绿能力，拆开暂存、激活和公开验证 |
| `scripts/production/Production.Core.psm1` | 本地冻结候选、分类、包生成、同一RunRoot协调和回执验证 |
| `scripts/production.ps1` | 独立发布入口及七动作本地编排 |
| `tests/production/` | Python单元、合同、迁移和故障注入测试 |
| `tests/production-runtime/` | 隔离Linux/Docker发布、回退、断线和恢复演练 |
| `docs/release-workflow.md` | 独立发布触发、候选冻结、`main`、预发布和生产验收流程 |
| `docs/release-architecture.md` | 稳定记录控制器、适配器、状态、包、权限与回退架构 |
| `docs/production-deployment.md` | 只记录`tio2-my`生产事实和准确操作手册 |
| `.codex/agents/d16-release-agent.toml` | 发布Agent从独立触发到最终生产回执的职责 |
| `.agents/skills/d16-production-release/SKILL.md` | 项目级五类发布方法和阶段能力门 |

## Task 1：建立五类候选包与自动分类合同

**交付结果：** 发布端能从准确`main..candidate`差异、开发回执、内容manifest和配置差异生成唯一的`subject + releaseType`；五种payload相互排斥，操作者不能在服务器命令行改变类型。

**Files:**
- Create: `ops/production/contracts/candidate-envelope.schema.json`
- Create: `ops/production/contracts/frontend-only.payload.schema.json`
- Create: `ops/production/contracts/content-only.payload.schema.json`
- Create: `ops/production/contracts/combined.payload.schema.json`
- Create: `ops/production/contracts/cms-platform.payload.schema.json`
- Create: `ops/production/contracts/host-infrastructure.payload.schema.json`
- Create: `ops/production/server/candidate_contract.py`
- Create: `ops/production/server/release_classifier.py`
- Create: `tests/production/test_candidate_contract.py`
- Create: `tests/production/test_release_classifier.py`
- Modify: `ops/production/server/release_contract.py`
- Modify: `ops/production/release-package.schema.json`
- Modify: `scripts/production/Production.Core.psm1`
- Modify: `tests/infrastructure/production-package.test.ts`

**Interfaces:**
- Produces: `CandidateEnvelope.from_path(path: Path) -> CandidateEnvelope`
- Produces: `validate_payload(envelope: CandidateEnvelope, payload_root: Path) -> ValidatedPayload`
- Produces: `classify_release(change_set: ChangeSet) -> tuple[ReleaseUnit, ...]`
- `ChangeSet`字段固定为`git_paths`、`site_ids`、`content_scopes`、`cms_contract_changed`、`host_paths`和`receipt_ids`，集合在构造时排序并冻结。
- `ReleaseUnit`字段固定为`subject: str`、`release_type: Literal[...]`、`paths: tuple[str, ...]`、`receipt_ids: tuple[str, ...]`。
- `ValidatedPayload`保存`subject`、`release_type`、排序后的文件及SHA-256，不提供类型覆盖字段。
- `classify_release`返回一个单元时可生成单包；返回多个单元时阶段一只输出`campaign-required`并停止，不能生成大包。

- [ ] **Step 1: 写五类payload相互排斥的失败测试**

```python
def test_frontend_payload_rejects_content_and_host_files(self):
    envelope = candidate(subject="tio2-my", release_type="frontend-only")
    for illegal in ("content/records.json", "host/sudoers", "cms/plugin.zip"):
        with self.subTest(illegal=illegal), self.assertRaises(ReleaseError):
            validate_payload(envelope, self.payload_with(illegal))

def test_validated_type_comes_only_from_the_manifest(self):
    envelope = CandidateEnvelope.from_path(self.frontend_manifest)
    validated = validate_payload(envelope, self.frontend_payload)
    self.assertEqual(validated.release_type, "frontend-only")
```

- [ ] **Step 2: 运行包合同测试并确认红灯**

Run: `python -m unittest tests.production.test_candidate_contract -v`

Expected: FAIL，`candidate_contract`模块尚不存在。

- [ ] **Step 3: 写严格信封、五种Schema和最小校验实现**

```python
RELEASE_TYPES = frozenset({
    "frontend-only", "content-only", "combined",
    "cms-platform", "host-infrastructure",
})

@dataclass(frozen=True)
class CandidateEnvelope:
    release_id: str
    subject: str
    release_type: str
    source_commit: str
    build_id: str
    created_at: str
    previous_production_receipt: str
    cms_contract_sha256: str
    configuration_sha256: str
    prerelease_receipt_sha256: str
    payload_sha256: str
    files: tuple[tuple[str, str], ...]
```

严格拒绝重复JSON成员、未知键、额外文件、非普通文件、软链接、路径逃逸、未排序文件和哈希不符。旧`tio2-production-release-v1`仍只由兼容迁移读取，正常新候选必须使用`d16-release-candidate-v1`。

- [ ] **Step 4: 写自动分类红灯测试**

```python
def test_classifies_site_frontend_and_scoped_content_as_combined(self):
    units = classify_release(ChangeSet(
        git_paths=("app/(en)/page.tsx",),
        site_ids=("tio2-my",),
        content_scopes=("tio2-my",),
        cms_contract_changed=False,
        host_paths=(),
        receipt_ids=("DEV-17",),
    ))
    self.assertEqual([(u.subject, u.release_type) for u in units], [("tio2-my", "combined")])

def test_cross_subject_change_requires_campaign(self):
    units = classify_release(self.frontend_changes("tio2-my", "site-b"))
    self.assertEqual({u.subject for u in units}, {"tio2-my", "site-b"})
```

- [ ] **Step 5: 实现失败关闭的分类优先级**

分类顺序固定为host公共资源、CMS共享资源、各网站运行资源、各`site_scope`内容。共享插件、Schema、数据库结构或跨作用域变化必须生成`cms-platform`；公共Nginx、发布程序、登记、sudo、网络或端口变化必须生成`host-infrastructure`；无法确定消费者或缺少开发回执时抛出`ReleaseError("unclassified release change")`。

- [ ] **Step 6: 更新本地候选生成器并验证完整信封**

`New-ProductionPackage`先调用Git读取冻结commit及`main..candidate`实际差异，再读取涵盖这些路径的开发回执；分类结果只有一个且适配器已安装时才写`candidate-manifest.json`、`prerelease-proof.json`、`checksums.json`和`payload/`。当前旧RunRoot只增加单独的兼容事务引用文件，不改写原归档、manifest或proof。

- [ ] **Step 7: 运行Task 1测试并提交**

Run: `python -m unittest tests.production.test_candidate_contract tests.production.test_release_classifier tests.production.test_release_contract -v`

Run: `npx vitest run tests/infrastructure/production-package.test.ts`

Expected: PASS；五种合法最小payload各通过，任意混合载荷、缺少回执、跨主体单包和类型覆盖均失败。

Commit: `git commit -m "feat(release): add typed candidate contracts"`

## Task 2：建立主体、Nginx与TLS可信登记

**交付结果：** 一次只读生产快照可把所有有效Nginx文件、域名、端口和TLS依赖唯一归属到`host`、`cms`或`site:tio2-my`；未知、重复和跨主体引用在写入前被拒绝。

**Files:**
- Create: `ops/production/server/subject_registry.py`
- Create: `ops/production/server/nginx_inventory.py`
- Create: `ops/production/server/tls_identity.py`
- Create: `tests/production/test_subject_registry.py`
- Create: `tests/production/test_nginx_inventory.py`
- Create: `tests/production/test_tls_identity.py`
- Modify: `ops/production/server/adoption_probe.py`
- Modify: `ops/production/server/release_baseline.py`

**Interfaces:**
- Produces: `load_registry(root: Path) -> SubjectRegistry`
- Produces: `classify_nginx(dump: str, registry: SubjectRegistry) -> NginxInventory`
- Produces: `resolve_certificate(policy: CertificatePolicy, runner: CommandRunner) -> CertificateSnapshot`
- `SubjectRegistry.resolve(subject_id: str) -> ReleaseSubject`是后续控制器取得路径的唯一入口。
- `CertificatePolicy`来自主体登记，固定包含证书名、逻辑fullchain/private-key路径、允许archive目录、DNS集合和最低剩余有效期；`CommandRunner`复用`release_actions.py`的受控参数数组接口。
- `NginxInventory`保存按逻辑路径排序的`logicalPath/resolvedPath/sha256/owner/references`条目；`CertificateSnapshot`保存证书名、两个逻辑路径、两个resolved路径、当前哈希、SAN、`notAfter`和`keyPairVerified=true`。

- [ ] **Step 1: 写主体登记失败测试**

```python
def test_registry_rejects_unknown_subject_and_path_escape(self):
    registry = load_registry(self.fixture_root)
    with self.assertRaisesRegex(ReleaseError, "not registered"):
        registry.resolve("site-b")
    self.write_site(site_id="tio2-my", production_root="../../root")
    with self.assertRaisesRegex(ReleaseError, "fixed root"):
        load_registry(self.fixture_root)
```

- [ ] **Step 2: 运行登记测试并确认红灯**

Run: `python -m unittest tests.production.test_subject_registry -v`

Expected: FAIL，`subject_registry`模块尚不存在。

- [ ] **Step 3: 实现严格主体类型和兼容路径**

```python
@dataclass(frozen=True)
class ReleaseSubject:
    subject_id: str
    kind: Literal["host", "cms", "site"]
    incoming: Path
    outgoing: Path
    production: Path
    configuration: Path
    state_root: Path
    adapter: str
```

登记只接受定义字段、绝对规范路径、`host`和`cms`保留名及`[a-z0-9][a-z0-9-]{0,62}`网站ID。`tio2-my`兼容路径固定映射现有`/etc/tio2-production`、`/opt/tio2-production`和deploy收发目录，不接受命令行路径参数。

- [ ] **Step 4: 写Nginx唯一归属测试并确认红灯**

```python
def test_effective_nginx_rejects_unknown_and_cross_subject_key(self):
    with self.assertRaisesRegex(ReleaseError, "unregistered Nginx"):
        classify_nginx(self.dump_with("/etc/nginx/conf.d/unknown.conf"), self.registry)
    with self.assertRaisesRegex(ReleaseError, "TLS owner"):
        classify_nginx(self.site_using_cms_private_key(), self.registry)
```

Run: `python -m unittest tests.production.test_nginx_inventory -v`

Expected: FAIL，`nginx_inventory`模块尚不存在。

- [ ] **Step 5: 实现有效Nginx include图**

按`nginx -T`中的`# configuration file <path>:`边界收集实际加载文件，解析`include`、`server_name`、`listen`、`proxy_pass`、`ssl_certificate`和`ssl_certificate_key`。每个文件、域名、端口和私钥必须命中唯一主体；整机`nginx -t`仍是所有主体的公共前置条件。

- [ ] **Step 6: 写Certbot续期、逃逸和错配测试**

```python
def test_certbot_renewal_changes_snapshot_but_keeps_policy(self):
    first = resolve_certificate(self.policy, self.runner("fullchain1.pem"))
    second = resolve_certificate(self.policy, self.runner("fullchain2.pem"))
    self.assertEqual(first.cert_name, second.cert_name)
    self.assertNotEqual(first.fullchain_sha256, second.fullchain_sha256)

def test_rejects_archive_escape_and_private_key_mismatch(self):
    for runner in (self.escape_runner(), self.mismatch_runner()):
        with self.subTest(runner=runner), self.assertRaises(ReleaseError):
            resolve_certificate(self.policy, runner)
```

- [ ] **Step 7: 实现TLS逻辑身份验证**

只允许Certbot逻辑路径解析到`/etc/letsencrypt/archive/<cert-name>/`中的root普通文件；用固定OpenSSL命令读取SAN和有效期，并比较证书公钥与私钥公钥的DER SHA-256。当前证书字节哈希只进入当次快照和备份回执，不写成永久策略。

- [ ] **Step 8: 运行Task 2测试并提交**

Run: `python -m unittest tests.production.test_subject_registry tests.production.test_nginx_inventory tests.production.test_tls_identity tests.production.test_release_baseline -v`

Expected: PASS；测试runner证明只读检查未调用reload、容器停止、数据库写入或文件替换。

Commit: `git commit -m "feat(release): register subjects and ingress ownership"`

## Task 3：实现七动作、主体状态与统一控制器

**交付结果：** `/usr/local/sbin/d16-release <subject> <action>`只接受root登记的主体和七个动作，在全局锁内读取该主体的独立状态并分派唯一适配器；未安装能力稳定失败，不会调用其他主体实现。

**Files:**
- Create: `ops/production/server/release_adapter.py`
- Create: `ops/production/server/release_controller.py`
- Create: `ops/production/server/d16_release.py`
- Create: `tests/production/test_release_adapter.py`
- Create: `tests/production/test_release_controller.py`
- Create: `tests/production/test_d16_release_entrypoint.py`
- Modify: `ops/production/server/release_contract.py`
- Modify: `ops/production/server/release_state.py`
- Modify: `ops/production/server/tio2_release.py`
- Modify: `ops/production/server/bootstrap_selftest.py`
- Modify: `ops/production/server/sudoers.tio2-release`
- Modify: `tests/production/test_release_state.py`
- Modify: `tests/production/test_final_protocol.py`

**Interfaces:**
- Produces: `ReleaseAdapter`Protocol，方法为`prepare(context)`、`backup(context)`、`stage(context)`、`activate(context)`、`verify(context)`、`rollback(context)`。
- Produces: `ReleaseController.execute(subject_id: str, action: str) -> dict[str, object]`
- Produces CLI: `/usr/local/sbin/d16-release <host|cms|siteId> <status|prepare|backup|stage|activate|verify|rollback>`
- `ReleaseContext`固定包含已校验的`ReleaseSubject`、`CandidateEnvelope`、`ValidatedPayload`、当前状态、主体基线、全局基线和事务日志路径，不允许适配器自行重新解释命令行。
- 状态身份至少绑定`releaseId`、`subject`、`releaseType`、`sourceCommit`、`candidateManifestSha256`、当前生产回执和适配器版本。
- `verify`在`ACTIVATED`状态执行公开技术验证并推进到`PUBLIC_VERIFIED`；再次调用时只从主体固定incoming路径读取已校验的业务E2E/收件确认回执，证据完整才推进到`COMPLETED`。

- [ ] **Step 1: 写七动作状态图失败测试**

```python
def test_stage_and_activate_are_separate_transitions(self):
    self.advance("IDLE", "PREPARED", "BACKED_UP", "STAGED", "INTERNAL_VERIFIED")
    self.assertFalse(self.active_pointer_changed)
    activated = transition(self.root, {"INTERNAL_VERIFIED"}, "ACTIVATED", self.identity)
    self.assertEqual(activated["state"], "ACTIVATED")

def test_completion_requires_public_and_external_evidence(self):
    with self.assertRaisesRegex(ReleaseError, "completion evidence"):
        transition(self.root, {"PUBLIC_VERIFIED"}, "COMPLETED", self.identity)
```

- [ ] **Step 2: 运行状态测试并确认红灯**

Run: `python -m unittest tests.production.test_release_state -v`

Expected: FAIL，旧状态图仍包含`DEPLOYING`和`ROLLING_BACK`，且没有`STAGED`、`ACTIVATED`、`COMPLETED`、`RECOVERY_REQUIRED`。

- [ ] **Step 3: 实现新状态图和持久事务日志**

```python
TRANSITIONS = {
    "IDLE": {"PREPARED"},
    "PREPARED": {"BACKED_UP", "FAILED"},
    "BACKED_UP": {"STAGED", "FAILED"},
    "STAGED": {"INTERNAL_VERIFIED", "FAILED"},
    "INTERNAL_VERIFIED": {"ACTIVATED", "FAILED"},
    "ACTIVATED": {"PUBLIC_VERIFIED", "FAILED", "ROLLED_BACK", "RECOVERY_REQUIRED"},
    "PUBLIC_VERIFIED": {"COMPLETED", "ROLLED_BACK", "RECOVERY_REQUIRED"},
    "FAILED": {"PREPARED", "ROLLED_BACK", "RECOVERY_REQUIRED"},
    "ROLLED_BACK": {"PREPARED"},
    "COMPLETED": {"PREPARED"},
    "RECOVERY_REQUIRED": set(),
}
```

每次可能改变活动版本的操作先写`transaction.json`意图并fsync，再执行单一提交点，随后写结果并fsync。状态根改为`/opt/d16-release/state/<subject>/`；审计回执保留actor、action、前后状态、候选身份和失败阶段，并递归脱敏。

- [ ] **Step 4: 写控制器主体/类型/适配器分派测试**

```python
def test_controller_dispatches_only_exact_registered_adapter(self):
    result = self.controller.execute("tio2-my", "status")
    self.assertEqual(result["subject"], "tio2-my")
    self.assertEqual(self.site.calls, ["status"])
    self.assertEqual(self.cms.calls + self.host.calls, [])

def test_uninstalled_capability_fails_without_state_change(self):
    before = self.state_bytes("cms")
    with self.assertRaisesRegex(ReleaseError, "capability-not-installed"):
        self.controller.execute("cms", "stage")
    self.assertEqual(self.state_bytes("cms"), before)
```

- [ ] **Step 5: 实现控制器和固定入口**

```python
def main(argv: Sequence[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if argv is None else argv)
    actor = os.environ.get("SUDO_USER", "root")
    clear_environment()
    if len(arguments) != 2:
        return emit_failure("subject and fixed action are required")
    subject_id, action = arguments
    with ReleaseLock(Path("/opt/d16-release/state/release.lock")):
        return emit(ReleaseController.system().execute(subject_id, action), actor)
```

控制器先解析主体，再读取包中的`subject + releaseType`，验证与命令主体一致后选择适配器。`status`可用于所有登记主体；阶段一对`cms`和`host`写动作返回`capability-not-installed`。旧`tio2-release <action>`保留为只读兼容诊断或明确退出提示，不再拥有发布写能力。

- [ ] **Step 6: 生成逐项sudo规则并测试无通配符**

sudoers只列出`d16-release tio2-my <七动作>`及阶段一允许的`d16-release cms status`；不列出`host`，不允许尾随参数、路径参数或shell。`bootstrap_selftest.py`在临时根中验证入口拒绝未知主体、未知动作和多余参数。

- [ ] **Step 7: 运行Task 3测试并提交**

Run: `python -m unittest tests.production.test_release_adapter tests.production.test_release_controller tests.production.test_d16_release_entrypoint tests.production.test_release_state tests.production.test_final_protocol -v`

Expected: PASS；`stage`测试中活动指针字节不变，`activate`缺少`INTERNAL_VERIFIED`时失败，`RECOVERY_REQUIRED`不能通过普通动作继续。

Commit: `git commit -m "feat(release): add subject controller and seven actions"`

## Task 4：迁移当前PREPARED事务与CMS连续证据

**交付结果：** 一个哈希绑定的管理员包能只读确认生产归属，把旧单站状态无损映射为`tio2-my/frontend-only/PREPARED`，并在任意提交点失败后恢复旧程序、登记、状态和sudoers；迁移本身不切流。

**Files:**
- Create: `ops/production/server/cms_evidence.py`
- Create: `ops/production/server/phase1_migration.py`
- Create: `ops/production/server/root-migrate-phase1.sh`
- Create: `tests/production/test_cms_evidence.py`
- Create: `tests/production/test_phase1_state_migration.py`
- Create: `tests/production/test_phase1_migration.py`
- Modify: `ops/production/build_admin_bundle.py`
- Modify: `ops/production/server/bootstrap_install.py`
- Modify: `ops/production/server/install.sh`
- Modify: `ops/production/server/adoption_probe.py`
- Modify: `scripts/production/Production.Core.psm1`
- Modify: `tests/production/test_admin_bundle.py`
- Modify: `tests/production/test_bootstrap_install.py`
- Modify: `tests/infrastructure/production-controller.test.ts`

**Interfaces:**
- Produces: `verify_frontend_only_evidence(proof, identity_bytes, seed_manifest, adoption, live_scope) -> CmsEvidence`
- Produces: `migrate_prepared_state(legacy_state, transaction, host_baseline, cms_evidence, site_baseline) -> dict[str, object]`
- Produces: `Phase1Migration.plan() -> MigrationPlan`、`apply(plan_hash: str) -> MigrationReceipt`、`recover() -> RecoveryReceipt`。
- `CmsEvidence`只保存输入哈希、`siteScope`、记录数、接管后内容哈希、fresh内容哈希和`verified=True`，不保存内容正文或秘密。
- `MigrationPlan`绑定旧程序代、旧状态SHA-256、目标程序代、登记、兼容事务和替换顺序；`MigrationReceipt`逐项记录提交结果与迁移后只读快照；`RecoveryReceipt`逐项记录恢复字节及最终旧状态SHA-256。

- [ ] **Step 1: 写三段证据算法边界红灯测试**

```python
def test_identity_hash_is_not_compared_to_content_hash(self):
    evidence = verify_frontend_only_evidence(
        self.proof(cms_identity_sha256=sha256(self.identity_bytes)),
        self.identity_bytes,
        self.seed_manifest,
        self.adoption(content_sha256="a" * 64),
        self.live_scope(content_sha256="a" * 64),
    )
    self.assertNotEqual(evidence.prerelease_identity_sha256, evidence.live_content_sha256)
    self.assertTrue(evidence.verified)
```

- [ ] **Step 2: 运行CMS证据测试并确认红灯**

Run: `python -m unittest tests.production.test_cms_evidence -v`

Expected: FAIL，`cms_evidence`模块尚不存在。

- [ ] **Step 3: 实现并穷举三段证据断点**

依次验证原始`cms-identity.json`字节哈希等于proof；identity中的`siteScope`、seed manifest、有序seed哈希与候选归档一致；首次接管回执绑定相同候选、记录数和导入后内容哈希；fresh生产读回的scope、记录数和内容哈希等于接管结果。对每个字段分别篡改，均断言在任何生产写入前抛出`ReleaseError`。

- [ ] **Step 4: 写PREPARED无损迁移测试**

```python
def test_prepared_migration_preserves_candidate_and_run_root(self):
    migrated = migrate_prepared_state(self.legacy, self.transaction, self.host, self.cms, self.site)
    self.assertEqual(migrated["state"], "PREPARED")
    self.assertEqual(migrated["details"]["candidate"], self.legacy["details"]["candidate"])
    self.assertEqual(migrated["details"]["runRoot"], self.legacy_run_root)
    self.assertEqual(migrated["details"]["releaseType"], "frontend-only")
```

- [ ] **Step 5: 实现兼容事务和阻断回执**

旧状态文件保持不变；迁移在暂存目录生成`d16-production-transaction-v1`，引用旧归档、manifest、proof和原始CMS identity的SHA-256。证据失败时只生成`d16-phase1-blocked-v1`回执，不创建新活动状态，也不把当前RunRoot标为成功。

- [ ] **Step 6: 写迁移零副作用和故障注入测试**

```python
def test_each_commit_point_recovers_exact_previous_generation(self):
    for point in self.commit_points:
        with self.subTest(point=point):
            self.reset_fixture()
            with self.assertRaises(ReleaseError):
                self.migration(fail_after=point).apply(self.plan_hash)
            self.migration().recover()
            self.assertEqual(self.protected_tree_hash(), self.original_tree_hash)
            self.assertEqual(self.runtime_snapshot(), self.original_runtime)
```

- [ ] **Step 7: 实现迁移计划、日志、原子安装和确定性管理员归档**

顺序固定为：验证root、管理员包和全局锁；只读探测；验证CMS证据；暂存程序代、登记、兼容事务和新状态；执行自检；逐项原子替换并记录fsync日志；切换程序symlink；安装sudoers；再次只读核对；封存迁移回执。恢复按日志倒序恢复旧字节。成功和失败路径均不得reload Nginx、停止容器、写数据库或改变upstream。`build_admin_bundle.py`把准确40位commit中的固定文件清单写成gzip时间戳、tar成员mtime/uid/gid/uname/gname、顺序和模式均固定的`.tar.gz`，同时输出独立SHA-256 manifest；工作树字节不进入归档。

- [ ] **Step 8: 让本地RunRoot封存原始CMS identity**

PowerShell只在`.prerelease/runs/20260911T214529Z-8bf2a3d437b0/cms-identity.json`原始字节SHA-256等于当前proof中的`cmsIdentitySha256`时，原子复制到当前生产RunRoot并加入兼容事务上传白名单。目标已存在且字节不同则失败关闭。

- [ ] **Step 9: 运行Task 4测试并提交**

Run: `python -m unittest tests.production.test_cms_evidence tests.production.test_phase1_state_migration tests.production.test_phase1_migration tests.production.test_admin_bundle tests.production.test_bootstrap_install tests.production.test_prepare_posix -v`

Run: `npx vitest run tests/infrastructure/production-controller.test.ts`

Expected: PASS；迁移dry-run和apply均证明运行中的Nginx、容器、数据库、upstream和公众版本未改变。

Commit: `git commit -m "feat(release): migrate the prepared frontend transaction"`

## Task 5：实现frontend-only备份、暂存、激活、验证与回退

**交付结果：** 同一RunRoot可依次执行`prepare -> backup -> stage -> activate -> verify`；隔离演练证明A→B→A、SSH断线和每个中断点可恢复，且共享CMS全程未停止、未导出、未改写。

**Files:**
- Create: `ops/production/server/frontend_backup.py`
- Create: `ops/production/server/site_frontend_adapter.py`
- Create: `tests/production/test_frontend_backup.py`
- Create: `tests/production/test_site_frontend_adapter.py`
- Create: `tests/production-runtime/frontend_release_rehearsal.py`
- Modify: `ops/production/server/release_actions.py`
- Modify: `ops/production/server/deployment_core.py`
- Modify: `ops/production/server/backup_core.py`
- Modify: `scripts/production/Production.Core.psm1`
- Modify: `scripts/production.ps1`
- Modify: `tests/production/test_backup_action.py`
- Modify: `tests/production/test_deployment_core.py`
- Modify: `tests/production/test_client_recovery.py`
- Modify: `tests/production-runtime/run_release_rehearsal.py`
- Modify: `tests/production-runtime/run_ssh_pin_rehearsal.py`

**Interfaces:**
- Produces: `backup_frontend(context: ReleaseContext) -> FrontendBackupReceipt`
- Produces: `restore_frontend_backup(ciphertext: Path, identity: Path) -> FrontendRestoreEvidence`
- Produces: `SiteFrontendAdapter(ReleaseAdapter)`，所有路径和运行资源从`ReleaseContext.subject`取得。
- `FrontendBackupReceipt`绑定主体、候选、活动版本、备份ID、密文SHA-256、明文manifest SHA-256和CMS未纳入证明；`FrontendRestoreEvidence`绑定相同备份ID、隔离恢复槽位、Build ID和健康检查结果。
- `stage`只构建/启动候选槽位并完成内部URL、Build ID、CMS contract和内容指纹验证。
- `activate`只原子切换目标站点upstream并写持久事务点；`verify`读取公开版本后推进`PUBLIC_VERIFIED`。

- [ ] **Step 1: 写前台备份范围红灯测试**

```python
def test_frontend_backup_contains_only_owned_site_resources(self):
    receipt = backup_frontend(self.context)
    names = self.decrypt_names(receipt)
    self.assertEqual(names, self.expected_site_files)
    self.assertFalse(any(name.startswith(("database/", "wordpress/", "cms/")) for name in names))
    self.assertFalse(any("stop" in call or "mariadb-dump" in call for call in self.runner.calls))
```

- [ ] **Step 2: 运行备份测试并确认红灯**

Run: `python -m unittest tests.production.test_frontend_backup -v`

Expected: FAIL，`frontend_backup`模块尚不存在。

- [ ] **Step 3: 实现前台专属加密备份和异地恢复合同**

备份manifest只允许活动前台版本、站点Nginx/upstream、站点证书当前快照、主体登记/基线/状态以及host/CMS引用。先完整读取本地tar并核对manifest，再使用现有age边界加密；异地验证必须解密、完整读取归档并在隔离Docker网络中恢复一个前台槽位，不能只比较密文哈希。

- [ ] **Step 4: 写stage不切流和activate前置门测试**

```python
def test_stage_keeps_active_upstream_and_reaches_internal_verified(self):
    before = self.upstream.read_bytes()
    result = self.adapter.stage(self.context)
    self.assertEqual(result["state"], "INTERNAL_VERIFIED")
    self.assertEqual(self.upstream.read_bytes(), before)

def test_activate_requires_internal_verified_and_exact_backup(self):
    for state in ("PREPARED", "BACKED_UP", "STAGED"):
        with self.subTest(state=state), self.assertRaises(ReleaseError):
            self.adapter.activate(self.context_with(state=state))
```

- [ ] **Step 5: 拆分现有deployment_core并实现网站适配器**

将当前`Deployment.deploy()`中的候选构建、内部验证和upstream切换拆成`stage()`与`activate()`；底层Docker和Nginx操作仍留在`deployment_core.py`。`SiteFrontendAdapter`每个动作都重新核对候选、主体基线、CMS证据、备份ID和状态身份；不再读取全局`tio2-my`路径常量。

- [ ] **Step 6: 写A→B→A、断线和中断恢复矩阵**

```python
def test_frontend_release_and_rollback_leave_cms_unchanged(self):
    cms_before = self.cms_runtime_identity()
    self.release("A", "B")
    self.rollback("B", "A")
    self.assertEqual(self.cms_runtime_identity(), cms_before)
    self.assertEqual(self.cms_stop_calls(), [])
    self.assertEqual(self.database_write_calls(), [])
```

矩阵覆盖候选构建失败、内部验证失败、upstream替换前后中断、`nginx -t`失败、reload失败、公开验证失败、SSH断开、相同请求重试和回退验证失败。可安全恢复的路径进入`ROLLED_BACK`；无法证明恢复完成的路径进入`RECOVERY_REQUIRED`。

- [ ] **Step 7: 更新本地七动作协调、同一RunRoot和最终证据校验**

`scripts/production.ps1`接受`Status/Prepare/Backup/Stage/Activate/Verify/Rollback`并调用`sudo /usr/local/sbin/d16-release tio2-my <action>`。每次远端回执必须匹配`subject=tio2-my`、`releaseType=frontend-only`、candidate manifest SHA-256、CMS evidence SHA-256、同一backup request和同一RunRoot；SSH断开后先调用`status`读取持久状态，不凭退出码猜测结果。第一次`Verify`只允许`ACTIVATED -> PUBLIC_VERIFIED`；生产E2E和三封邮件确认完成后，本地把签名/哈希绑定的最终验收回执上传到主体固定incoming文件名，再次`Verify`校验它并执行`PUBLIC_VERIFIED -> COMPLETED`。

- [ ] **Step 8: 运行Task 5单元与隔离演练并提交**

Run: `python -m unittest tests.production.test_frontend_backup tests.production.test_site_frontend_adapter tests.production.test_backup_action tests.production.test_deployment_core tests.production.test_client_recovery -v`

Run: `python tests/production-runtime/frontend_release_rehearsal.py --isolated`

Run: `python tests/production-runtime/run_ssh_pin_rehearsal.py --isolated`

Expected: PASS；演练回执列出CMS容器ID、数据库卷、WordPress文件指纹和CMS配置在A→B→A全程未改变，前台备份真实解密恢复通过。

Commit: `git commit -m "feat(release): add isolated frontend release adapter"`

## Task 6：接通发布流程、Agent、Skill与阶段一候选验收

**交付结果：** 稳定文档清楚区分开发和发布；发布Agent从独立指令开始，能冻结准确候选、核对开发回执、运行发布侧集成、推进`main`预发布并生成类型化包；阶段一实现形成可审查的管理员候选，但不自动操作生产。

**Files:**
- Create: `docs/release-workflow.md`
- Create: `docs/release-architecture.md`
- Create: `docs/templates/development-receipt.md`
- Create: `docs/templates/release-candidate-receipt.md`
- Modify: `docs/development-workflow.md`
- Modify: `docs/development-execution.md`
- Modify: `docs/development-handoff.md`
- Modify: `docs/production-deployment.md`
- Modify: `docs/software-architecture.md`
- Modify: `docs/site-registry.md`
- Modify: `.codex/agents/d16-release-agent.toml`
- Modify: `.agents/skills/d16-production-release/SKILL.md`
- Modify: `.agents/skills/d16-production-release/agents/openai.yaml`
- Modify: `tests/infrastructure/production-contracts.test.ts`
- Modify: `tests/infrastructure/production-runtime-contract.test.ts`
- Modify: `tests/infrastructure/production-prerelease-gate.test.ts`

**Interfaces:**
- Development receipt state: `MERGED_TO_DEVELOP`，由 Gate8 调用独立代码复审、通过后完成准确合并并写入。
- Release candidate receipt states: `FROZEN`、`INTEGRATION_PASSED`、`MAIN_PRERELEASE_PASSED`、`PACKAGED`、`PRODUCTION_VERIFIED`或明确失败状态。
- 发布Agent只消费Git中的开发回执和实际差异；没有独立发布指令时不得修改`main`或生成生产包。

- [ ] **Step 1: 写文档与Agent边界合同测试**

```typescript
it('keeps Gate8-owned review and development ending at develop', () => {
  expect(developmentWorkflow).toContain('MERGED_TO_DEVELOP')
  expect(developmentWorkflow).not.toMatch(/Gate8[^\n]*(main|生产|切流)/)
  expect(releaseAgent).toContain('独立发布指令')
  expect(releaseAgent).toContain('冻结')
  expect(releaseAgent).toContain('main')
})
```

- [ ] **Step 2: 运行边界测试并确认红灯**

Run: `npx vitest run tests/infrastructure/production-contracts.test.ts tests/infrastructure/production-runtime-contract.test.ts tests/infrastructure/production-prerelease-gate.test.ts`

Expected: FAIL，现有文档和Agent仍把开发、`main`、预发布或生产动作混在同一流程中，且没有五类包与七动作合同。

- [ ] **Step 3: 更新开发文档和开发回执模板**

`development-workflow.md`只保留 Gate8 开发/测试、Gate8 调用的独立代码复审、返修、Gate8 合入`develop`和开发回执；`development-execution.md`只保留任务TDD、单元/集成/任务E2E和开发环境。开发回执必须包含任务、主体、合并commit、改动路径、已运行测试、受影响消费者、预计发布影响和未决项，不含生产命令或授权。

- [ ] **Step 4: 新增稳定发布流程和发布架构文档**

`release-workflow.md`按`独立触发 -> 冻结develop -> 回执/差异核对 -> 发布侧集成E2E -> 准确合入main -> main预发布 -> 分类/打包 -> prepare/backup/stage -> activate -> verify -> 业务E2E/收件 -> 最终回执`记录职责。`release-architecture.md`引用规格并稳定描述六个控制器组件、五类适配器、七动作、状态、权限、Campaign、备份和恢复；明确阶段一仅安装`frontend-only`适配器。

- [ ] **Step 5: 更新生产手册、软件架构和网站登记**

`production-deployment.md`只保留`tio2-my`当前服务器事实、同一RunRoot、阶段一准确命令、三道门、回退和`RECOVERY_REQUIRED`处理。`software-architecture.md`只描述系统结构并链接发布架构。`site-registry.md`为`tio2-my`登记生产运行手册和`frontend-only=installed`，其余适配状态按真实实现写为`not-installed`。

- [ ] **Step 6: 更新项目级Release Agent和Skill**

Agent从独立发布指令开始，先冻结commit并建立隔离worktree；若发布侧测试发现代码缺陷，写阻断回执并退回 Gate8，不直接改业务代码。Skill使用`subject + action`统一入口，先读适配状态，再按三道生产门执行；所有路径保持项目级，不复制或安装到个人skills目录。

- [ ] **Step 7: 运行阶段一全量验证**

Run: `python -m unittest discover -s tests/production -p 'test_*.py' -v`

Run: `npx vitest run tests/infrastructure/production-package.test.ts tests/infrastructure/production-controller.test.ts tests/infrastructure/production-contracts.test.ts tests/infrastructure/production-runtime-contract.test.ts tests/infrastructure/production-prerelease-gate.test.ts`

Run: `python tests/production-runtime/frontend_release_rehearsal.py --isolated`

Run: `python tests/production-runtime/run_ssh_pin_rehearsal.py --isolated`

Run: `git diff --check`

Expected: 全部可执行检查 PASS；如实报告当前平台因 Windows/POSIX 设施不可用产生的跳过，不把跳过改写为通过或零跳过。阶段一未安装适配器全部失败关闭，根`AGENTS.md`无差异，生产环境未被连接或修改。

- [ ] **Step 8: 提交Task 6文档与角色合同**

Run: `git diff --check`

Commit: `git commit -m "docs(release): connect development and release ownership"`

- [ ] **Step 9: 从准确HEAD构建两次管理员包并核对可复现性**

Run: `$revision=(git rev-parse HEAD).Trim(); python ops/production/build_admin_bundle.py --revision $revision --output .production/candidates/admin-phase1-a.tar.gz`

Run: `python ops/production/build_admin_bundle.py --revision $revision --output .production/candidates/admin-phase1-b.tar.gz`

Run: `Get-FileHash -Algorithm SHA256 .production/candidates/admin-phase1-a.tar.gz,.production/candidates/admin-phase1-b.tar.gz`

Expected: 两个SHA-256完全相同；归档只包含manifest列出的root程序、登记模板、迁移器和sudoers，没有密钥、RunRoot、生产快照或未跟踪文件。

- [ ] **Step 10: 写阶段一候选回执并提交**

在`docs/verification/production-release-system/phase1-candidate/`写入测试摘要、两个管理员包哈希、迁移dry-run、故障矩阵、生产未修改证明、当前候选/活动版本和后续生产动作。回执状态只能是`PHASE1_TOOLING_CANDIDATE`，不能写`DEPLOYED`或`PRODUCTION_VERIFIED`。

Commit: `git commit -m "docs(release): record phase one tooling candidate"`

## 阶段一完成门槛与后续计划

六个任务全部通过后，阶段一只达到“生产工具候选”。生产执行前必须提交准确管理员包SHA-256、文件清单、只读迁移计划、旧程序回退目标、当前RunRoot和生产动作序列。服务器安装成功后仍需按`status -> prepare -> backup -> stage -> activate -> verify`推进，并完成58对象、174浏览器案例、RFQ/Sample/Documents真实提交、三封邮件确认和最终`PRODUCTION_VERIFIED`回执。

阶段二另写“网站内容generation与共享CMS发布”计划，实现`content-only`、`combined`和`cms-platform`适配器及CMS写冻结/恢复。阶段三另写“主机发布、Release Campaign与新站接管”计划，实现root-only `host-infrastructure`、有序多主体事务和标准新站登记。两者不得在阶段一执行中顺带实现。
