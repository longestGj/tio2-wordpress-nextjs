# MY 产品刷新接口修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 不自动创建子任务；独立代码复审按开发流程单独执行。

**Goal:** 让当前登记的 MY 产品总览与详情路径通过已签名刷新入口，并保持跨站、未知产品路径拒绝和既有 A/B 行为。

**Architecture:** 保留现有 POST、签名校验及缓存策略，按当前网站识别产品路径。复用现有 MY 产品身份 registry，不复制牌号列表；本批不重新设计 registry 或内容读取合同。

**Tech Stack:** TypeScript、Next.js App Router、Vitest；使用仓库锁定版本。

**Spec:** [已批准职责划分](../specs/2026-09-13-cms-frontend-build-responsibilities-design.md)，尤其第 4.3 节；问题 C08 见[审计](../../verification/2026-09-13-tio2-my-content-coupling-audit.md)。

本计划属于[总实施计划](2026-09-13-cms-decoupling-overall-plan.md)的 W2，不代表全部整改范围；前置基线、后续真实更新与整体交付按总计划执行。

## Global Constraints

执行状态更新（2026-09-13）：两轮 TDD 已完成，代码 `818b8a27` / `c3331199` 通过独立复审并合入 develop；5 组 113 项回归通过。准确类型检查、合并后验证与边界见 [W2 回执](../../verification/2026-09-13-cms-decoupling-w2-product-revalidation.md)。以下步骤保留原计划，复现结果以回执为准。

- 本次整改以 `tio2-my` 为主。共享代码变更需核对 A/B 消费者，保持 Site B 冻结及 Site A 既有业务限制。
- CMS 是纳入管理的可编辑内容的运行时来源，不替代策划/用户的业务批准。
- 不进行生产写入、发布、CMS 数据修改、全站构建或表单外发。
- 本批只证明 API 路径准入及失效调用正确，不宣称实际页面已更新或全站解耦完成。
- 普通事件继续使用 `max`；内容发布批次继续使用 `{expire: 0}` 和现有 layout/sitemap 处理，不改变刷新时效政策。
- 不修改法律页工作分支，不将其未合并内容作为本批依赖。

## 基线与范围

2026-09-13 读取：main `e2883161`；develop `7c849af2`；法律页工作分支 `codex/cms-read-approval-decoupling` 为 `6164e048`，存在未提交文档。进度账本包含先后矛盾记录，不能据此确认最终复审或合并。

执行前重新读取 develop 和工作区状态；使用 using-git-worktrees 技能建立隔离开发工作区，不在 main 写业务代码，不覆盖已有职责文档和审计文件。若最新基线已修复此问题，本计划转为有限回归核对，不制造重复实现或伪造红灯。

W1 承接更新：本任务隔离分支已推进至 `05a52794b3b598b35335b3cd7196156c278c3ba3`，包含已独立复审并合入 develop 的法律实现；上述旧读取记录仅为历史。W2 尚未实施，开工仍须核对最新 develop、目标刷新文件及工作区差异，详见 [W1 回执](../../verification/2026-09-13-cms-decoupling-w1-adoption.md)。

## 文件职责

| 文件 | 本批职责 |
|---|---|
| `app/(en)/api/revalidate/route.ts` | 按网站放行已登记产品路径，为 MY 总览/详情补相应内容标签 |
| `tests/integration/api/product-revalidation.test.ts` | 在既有签名请求工具上增加 MY 准入、拒绝、批次与重放用例 |
| `lib/wordpress/product-detail-v01-registry.ts` | 只读复用现有 `isApprovedMalaysiaProductDetailSlug(value: string)` |
| `lib/wordpress/cache-tags.ts` | 只读复用总览/详情/路由标签函数；不改全局版本策略 |

## Task 1：按站点识别产品刷新路径

**Modify:** `app/(en)/api/revalidate/route.ts`

**Test:** `tests/integration/api/product-revalidation.test.ts`

**Interfaces:** 消费现有 `isApprovedMalaysiaProductDetailSlug(value: string)`；POST(Request) → Promise<Response> 不变。新增本地 MY 路径判定，不新增公开 API。

- [ ] 在既有测试文件追加以下用例，复用已有 `payloadFor`、`signedRequest` 和 cache mocks。用例内覆盖 beforeEach 的 Site A 环境。

```ts
describe('Malaysia Product route admission', () => {
  it.each(['/products', '/products/cr-901', '/products/m-108'])
  ('accepts a registered MY path: %s', async (path) => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const response = await POST(signedRequest(payloadFor({
      siteIds: ['tio2-my'], paths: [path],
    })))
    expect(response.status).toBe(200)
    expect(revalidatePath).toHaveBeenCalledWith(path)
  })

  it.each(['/products/unknown-grade', '/products/coatings/tp-c120'])
  ('rejects an unknown or Site A product path on MY: %s', async (path) => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const response = await POST(signedRequest(payloadFor({
      siteIds: ['tio2-my'], paths: [path],
    })))
    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects a MY event on a Site A runtime', async () => {
    const response = await POST(signedRequest(payloadFor({
      siteIds: ['tio2-my'], paths: ['/products/cr-901'],
    })))
    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
```

- [ ] 运行 `npx vitest run tests/integration/api/product-revalidation.test.ts`。预期新增合法 MY 路径在旧实现返回 400，出现真实行为红灯；拒绝用例是基线回归。
- [ ] 在 handler 导入 `isApprovedMalaysiaProductDetailSlug`，在已有路径校验前构造以下本地映射；输入路径已由 payload schema 规范化，不重复处理尾斜杠。

```ts
const malaysiaProductSlugByPath = new Map<string, string>()
if (currentSite.id === 'tio2-my') {
  for (const path of payload.paths) {
    const match = /^\/products\/([^/]+)$/u.exec(path)
    if (match && isApprovedMalaysiaProductDetailSlug(match[1]!)) {
      malaysiaProductSlugByPath.set(path, match[1]!)
    }
  }
}
```

- [ ] 扩展原 `currentSite.id === 'tio2-my'` 特例内部 OR 条件，保留两种工艺页例外和 Site A 分支：

```ts
path === '/products' ||
malaysiaProductSlugByPath.has(path) ||
path === '/products/chloride-process-titanium-dioxide' ||
editorialPageIdForPath(path) === 'PRODUCT-PROC-SU'
```

- [ ] 重跑同一文件，预期新增合法路径通过、未知路径和跨站仍拒绝。核对差异只影响 MY 准入。
- [ ] 在隔离任务分支仅提交上述两文件，提交信息 `fix: admit registered Malaysia product revalidation paths`。

## Task 2：补齐内容标签和批次回归

**Modify/Test:** 同 Task 1 两文件。

**Interfaces:** 消费 Task 1 本地 `malaysiaProductSlugByPath`；使用现有 `productHubContentTag(siteId: string)` 与 `productDetailContentTag(siteId: string, slug: string)`；响应形状和签名协议不变。

- [ ] 增加总览、详情与工艺页混合批次测试。前两类预期包含查询端使用的专属内容标签，不仅是 route 标签。

```ts
it('invalidates MY product content tags in a mixed batch and deduplicates replay', async () => {
  vi.stubEnv('SITE_ID', 'tio2-my')
  const payload = payloadFor({
    siteIds: ['tio2-my'],
    paths: ['/products', '/products/cr-901', '/products/chloride-process-titanium-dioxide'],
  })
  const response = await POST(signedRequest(payload))
  expect(response.status).toBe(200)
  expect(revalidateTag).toHaveBeenCalledWith('content:tio2-my--products', 'max')
  expect(revalidateTag).toHaveBeenCalledWith('content:tio2-my--product-detail--cr-901', 'max')
  expect(revalidatePath).toHaveBeenCalledWith('/products')
  expect(revalidatePath).toHaveBeenCalledWith('/products/cr-901')
  const before = revalidateTag.mock.calls.length
  const replay = await POST(signedRequest(payload))
  expect(replay.status).toBe(200)
  expect(revalidateTag).toHaveBeenCalledTimes(before)
})

it('rejects an entire mixed batch containing an unknown product before invalidation', async () => {
  vi.stubEnv('SITE_ID', 'tio2-my')
  const response = await POST(signedRequest(payloadFor({
    siteIds: ['tio2-my'], paths: ['/products', '/products/unknown-grade'],
  })))
  expect(response.status).toBe(400)
  expect(revalidateTag).not.toHaveBeenCalled()
  expect(revalidatePath).not.toHaveBeenCalled()
})
```

- [ ] 运行同一测试文件。预期专属内容标签断言失败，批次拒绝保持通过。
- [ ] 在 handler 的 cache-tags 导入中增加两个既有函数，在 path 循环内追加如下逻辑。不移除现有 site/sitemap 标签、不增加全站刷新优化。

```ts
if (siteId === 'tio2-my') {
  if (path === '/products') tags.add(productHubContentTag(siteId))
  const slug = malaysiaProductSlugByPath.get(path)
  if (slug) tags.add(productDetailContentTag(siteId, slug))
}
```

- [ ] 运行定向回归：

```powershell
npx vitest run tests/integration/api/product-revalidation.test.ts tests/integration/api/revalidate.test.ts tests/integration/api/application-resource-revalidation.test.ts tests/integration/products/chloride-process-revalidate.test.ts tests/integration/editorial/editorial-revalidation.test.ts
npm run typecheck
git diff --check
```

预期全部通过；若原有测试失败，记录基线与本批差异，不放宽原有授权、安全或站点断言。类型检查需使用任务自己的构建目录与实际基线工具配置。

- [ ] 在隔离任务分支仅提交两个改动文件，提交信息 `fix: invalidate Malaysia product content dependencies`。
- [ ] 冻结 BASE/HEAD、红绿输出和边界说明，按开发流程调用独立代码复审。经复审与合并后验证才能合入 develop 并形成开发回执；本计划本身不执行合并或发布。

## 验收与未覆盖范围

本批交付标准是实际 POST 处理函数对合法路径返回 200、调用正确失效 API，并保持拒绝/重放/站点回归；cache 函数被 mock，不能当作实际缓存更新证明。

WordPress 总览 webhook 已静态确认产生 `/products`。本批不新增详情自动 webhook，不宣称详情 CMS 事件生产链已完成；实际 WP → Next 更新及内容 schema 解耦由后续页面族整链任务承接。既有读取契约可能仍拒绝合法新内容，不能把本批接口修复标为 C01/C03/C09 已关闭。

## 后续批次与覆盖账本（不是本计划执行范围）

| 目标 | 下一份独立计划的交付边界 |
|---|---|
| 法律页读写解耦与 SEO | 承接现有法律页分支，核对最终复审、实际证据和合并状态；不重复其已完成测试 |
| 各页面族 C01/C02/C03/C04/C06 | 每族固定字段分类，成套处理 PHP、DTO、正文、SEO、披露/复审策略和真实内容变化验证 |
| 标签驱动动作 C05 | 稳定动作 ID、显示文案和白名单行为的兼容迁移，保留法律与同意行为 |
| 配置职责 C07 | 独立启用授权、环境 ID、用户同意，固定构建/启动/运行生效阶段与测试 |
| 缓存版本 C09 与真实更新链 | 技术 schema 与内容修订分开，跨修订失效；普通/敏感更新时效、失败与实际页面观察 |
| 构建和总体验收 | 在目标兼容内容上验证构建、故障、正文/SEO/交互与受影响 A/B 消费者，形成独立开发回执 |

选择先做本批，是因为有明确复现且不与法律页所有权重叠；总体设计仍全部有效，其他批次不能因本批通过而标记完成。
