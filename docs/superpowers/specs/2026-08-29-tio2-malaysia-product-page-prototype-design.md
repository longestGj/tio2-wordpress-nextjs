# TiO2 Malaysia 产品详情页独立原型设计说明

**日期：** 2026-08-29  
**状态：** 待用户最终审阅  
**原型型号：** M-350  
**目标技术：** Next.js App Router；未来对接独立 WordPress 站点

## 1. 已批准决策

1. 原型不绑定现有 Site A（TIOVAR）或 Site B，也不连接当前 WordPress。
2. 原型采用独立 Next.js 组件化方案，位于：
   `D:\16Wordpress_nextjs\site-prototypes\tio2-malaysia-product-page\`
3. 原型只完整制作 M-350，不提前撰写其余 13 个型号的最终正文。
4. 页面采用统一模块模板，未来可通过 WordPress 数据适配器为 14 个产品复用。
5. 事实控制采用模块级 `publishing_status`，不建立逐字段审核账本。
6. 视觉采用已批准的“精密白”方向：白色主导、深蓝信息层级、青绿转化强调。
7. RFQ 表单增加“Website Domain”字段，非必填。

## 2. 目标与非目标

### 2.1 目标

- 制作可在本地运行和评审的 M-350 响应式产品页。
- 验证统一产品页的模块顺序、视觉系统、状态隐藏和转化路径。
- 建立可迁移到未来新站的组件边界和产品数据结构。
- 输出桌面、平板和手机视觉截图以及页面长图。
- 为后续 WordPress 字段映射提供简单、明确的数据接口。

### 2.2 非目标

- 不修改现有两个站点的代码、路由、品牌或内容。
- 不修改现有 WordPress、WPGraphQL、Docker 或数据库。
- 不创建公开 URL、Canonical、Sitemap 或可索引页面。
- 不部署、不发布、不配置域名。
- 不为其余 13 个产品生产最终正文。
- 不制造未经验证的性能、法规、产地、包装、文件或应用事实。

## 3. 原型工程边界

原型作为独立 Next.js 应用保存在新目录，不从以下位置导入站点业务代码：

- 根项目的 `app/`
- 根项目的 `components/`
- 根项目的 `lib/`
- 根项目的 `sites/`
- 当前 WordPress GraphQL 层

允许参考根项目的工程约定和测试工具，但原型应拥有自己的：

```text
site-prototypes/tio2-malaysia-product-page/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx
│  └─ products/m-350/page.tsx
├─ components/
│  ├─ layout/
│  ├─ product/
│  └─ forms/
├─ data/
│  └─ m-350.ts
├─ lib/
│  ├─ module-visibility.ts
│  └─ product-adapter.types.ts
├─ styles/
│  └─ tokens.css
├─ tests/
├─ artifacts/
├─ next.config.ts
├─ package.json
└─ tsconfig.json
```

原型正式评审路径为 `/products/m-350`。根路径可直接重定向或链接到该页面，但不会进入现有站点的路由清单。

## 4. 数据结构原则

### 4.1 轻量产品记录

数据只包含渲染需要的内容，不保存以下逐字段元数据：负责人、批准日期、复核日期、证据版本、适用市场矩阵或逐字段公开权限。

每个事实型模块最多包含：

```ts
type PublishingStatus =
  | "verified"
  | "pending_verification"
  | "not_public";

type ProductModule<T> = {
  publishingStatus: PublishingStatus;
  content: T;
};
```

页面基础字段包括：

- `slug`
- `model`
- `productFamily`
- `title`
- `positioning`
- `primaryCtaLabel`
- `secondaryCtaLabel`
- 各事实模块的 `ProductModule<T>`

### 4.2 状态渲染规则

- `verified`：渲染整个模块。
- `pending_verification`：不渲染标题、正文、空容器或导航锚点。
- `not_public`：不渲染标题、正文、空容器或导航锚点。
- 未定义状态按不可公开处理，默认不渲染。
- 隐藏模块不得出现在页面内导航、未来结构化数据或内部链接集合中。
- 不用“待确认”“Coming soon”“N/A”替代被隐藏的事实。

## 5. 页面模块顺序

| 顺序 | 模块 | 类型 | 主要行为 |
|---:|---|---|---|
| 1 | Breadcrumb | 必选 | 显示 Home / Products / M-350 Titanium Dioxide |
| 2 | Hero | 必选 | 产品定位、包装视觉、RFQ 与样品 CTA |
| 3 | Hero Quick Facts | 条件显示 | 只展示少量已验证信息 |
| 4 | In-page Navigation | 必选 | 自动排除未渲染模块 |
| 5 | Product Positioning | 必选 | 解释产品类别和评估场景 |
| 6 | Main Applications | 条件显示 | 未来链接 Applications，不在原型中绑定正式 URL |
| 7 | Recommended / Not Recommended | 条件显示 | 使用谨慎的适配语言，不构造绝对禁令 |
| 8 | Technical Specifications | 条件显示 | 只显示已验证参数；移动端转为参数卡片 |
| 9 | Document Request | 条件显示 | 不伪造下载；CTA 预选 Document Request |
| 10 | Malaysia-origin Support | 条件显示 | 未验证时整个模块隐藏 |
| 11 | Market Support | 条件显示 | 不抢占 Markets 页的国家供应商词 |
| 12 | Related Grades | 条件显示 | 最多三个型号；不虚构 M-996/M-2196 差异 |
| 13 | Sample Request | 必选 | 说明样品申请所需信息并预选询盘类型 |
| 14 | RFQ | 必选 | 统一接收报价、样品和文件申请 |

## 6. 首屏设计

已批准的首屏采用“精密白”方向：

- 顶部使用窄幅 Deep Navy 服务栏。
- 主导航为白底，标题和品牌使用 Primary Navy。
- Hero 左侧为内容，右侧为产品包装/材料图片区域。
- 页面白色占比保持约 60–70%。
- 青绿只用于 CTA、状态和少量强调。
- 不使用大面积渐变、玻璃拟态、巨大圆角、霓虹或促销式装饰。
- Hero H1 桌面端约 52–64px；移动端重新排版至约 38–42px。
- 正式产品照片缺失时使用明确标记的视觉占位，不伪装为已批准包装。

当前批准的首屏视觉基线：

`C:\Users\longe\.codex\visualizations\2026\08\29\01a04c1c-41cc-7b20-ac45-646888191307\m350-refined-hero-1440.png`

## 7. 视觉系统

### 7.1 色彩

- Primary Navy：`#062B5B`
- Deep Navy：`#031B3A`
- Malaysia Teal：`#00A99D`
- Accent Teal：`#14B8A6`
- White：`#FFFFFF`
- Soft Background：`#F5F8FB`
- Border Gray：`#D9E2EC`
- Body Text：`#334155`

### 7.2 字体与组件

- 全站原型使用 Inter。
- H1/H2 通过字重和留白建立层级，不引入展示字体。
- CTA 圆角 6–8px。
- 内容卡片仅在确有边界需求时使用，圆角 10–14px。
- 卡片保持白底、浅边框和极轻阴影。
- 分区优先使用留白、细分隔线和 Soft Background，不堆叠卡片。

## 8. 页面交互

### 8.1 页面内导航

- 首屏下方显示定位、应用、参数、文件、相关型号和询盘锚点。
- 桌面端滚动后吸顶。
- 移动端允许横向滑动，但不得遮挡或截断标签。
- 隐藏模块对应锚点自动消失。

### 8.2 CTA 行为

- “Request a Quote”滚动至 RFQ，并预选 `Quote Request`。
- “Request a Sample”滚动至 RFQ，并预选 `Sample Request`。
- “Request Documents”滚动至 RFQ，并预选 `Document Request`。
- 原型仅执行本地交互，不向服务器发送内容。

### 8.3 RFQ 字段

必填字段：

- Name
- Company
- Business Email
- Country / Region
- Enquiry Type
- Application
- Message / Requirement

非必填字段：

- Website Domain
- Estimated Volume

原型校验规则：

- 必填字段缺失时就地提示。
- Email 使用基本格式校验。
- Website Domain 为空时允许提交；填写后执行宽松的域名/URL 格式校验。
- 提交后只显示模拟成功状态，不发送网络请求。

## 9. 响应式行为

### 桌面端

- Hero 使用左右双栏。
- 技术参数使用语义化表格。
- 页面内导航吸顶。
- RFQ 可使用两列表单，但阅读顺序保持自然。

### 平板端

- Hero 保持双栏或根据有效宽度转为上下布局。
- 导航隐藏次要菜单项，保留品牌和主 CTA。
- 卡片网格最多两列。

### 手机端

- Hero 改为内容在前、产品视觉在后。
- CTA 使用整行或等宽双按钮，不依赖悬停。
- 技术参数由表格转为标签/数值卡片，不产生整页横向滚动。
- RFQ 单列显示；输入字号不低于 16px。
- 交互目标约 44px，高优先级 CTA 清晰可见。

## 10. SEO 与结构化数据边界

原型环境：

- 全部页面设置 `noindex, nofollow`。
- 不设置生产 Canonical。
- 不输出生产 Product JSON-LD。
- 不加入 Sitemap 或现有站点导航。

未来接入新站后：

- Title、Meta Description、H1 使用批准的型号关键词规则。
- 型号页只拥有“型号 + titanium dioxide”意图。
- 泛应用词归 Applications；工艺泛词归 Process；国家供应商词归 Markets。
- Canonical 指向未来新站的最终自引用 URL。
- Breadcrumb 与 Product JSON-LD 仅使用已公开、已验证的信息。

## 11. 内部链接原型规则

- Applications、Markets、Documents、Process 和相关型号只展示未来链接的视觉与组件状态。
- 原型不指向 Site A、Site B 或现有 WordPress。
- 不创建虚假正式 URL。
- 未来接入时由路由映射表注入正式链接。
- Related Grades 最多显示三个，且每个比较理由必须有已验证内容支持。

## 12. 非阻塞冲突处理

- M-2377 资料冲突不会阻塞模板和公共组件开发；其未验证事实模块未来保持不渲染。
- M-996 与 M-2196 差异不足不会阻塞 Related Grades 组件；无证据时不显示强差异文本。
- M-350 中任何未验证事实也按同一规则隐藏，不用临时营销文案补空。

## 13. 未来 WordPress 接入

未来新站接入时新增一个数据适配器：

```text
WordPress / WPGraphQL response
            ↓
Product page adapter
            ↓
Prototype product view model
            ↓
Existing product components
```

WordPress 负责编辑内容；Next.js 负责：

- 模块顺序
- 状态过滤
- 响应式布局
- CTA 交互
- SEO 规则
- Schema 过滤
- 错误与空状态防护

未来接入不应要求重写展示组件，只替换本地 M-350 数据来源和链接映射。

## 14. 交付物

1. 独立 Next.js 原型工程。
2. M-350 完整响应式产品页。
3. 本地模块状态控制。
4. RFQ 本地校验和模拟成功状态。
5. 桌面、平板、手机首屏截图。
6. 桌面和手机页面长图。
7. 未来 WordPress 字段映射说明。
8. 原型运行与迁移说明。

## 15. 验收标准

- 原型可独立启动，不要求 Site A、Site B 或 WordPress 运行。
- 现有两个站点的受跟踪文件无意外修改。
- `/products/m-350` 可在桌面、平板和手机宽度下正常显示。
- 所有 14 个模块按批准顺序出现或按状态整体隐藏。
- 隐藏模块不留下空白标题、导航锚点或占位符。
- 三种 CTA 正确预选 RFQ 类型并滚动至表单。
- Website Domain 为非必填，填写时可校验。
- 原型无生产请求、无 WordPress 请求、无索引配置。
- 颜色、字体、按钮、卡片和留白符合批准视觉方向。
- 无整页横向滚动，关键内容无需悬停即可使用。
- 页面截图和长图保存在 `artifacts/`。

## 16. 已知待提供素材

以下内容不阻塞原型骨架，但正式发布前必须替换或核验：

- 正式品牌 Logo 文件。
- M-350 批准的产品包装照片或包装设计。
- M-350 最终已验证技术参数。
- 可公开的应用、推荐/不推荐、文件、产地和市场支持内容。
- 未来新站域名与最终 URL。

在上述内容到位前，原型只使用明确的占位素材和已批准的安全文案。
