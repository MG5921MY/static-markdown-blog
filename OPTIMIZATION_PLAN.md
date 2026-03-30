# 项目优化方案（源码分析版）

## 1. 当前问题与源码定位

1. 响应慢、性能差
- `index.html` 首页此前一次性渲染全部文章；已补充分页和搜索联动，降低首屏节点量。
- `blog.js` 中主题图标/Logo 使用 `HEAD` 请求探测资源，弱网下会增加额外 RTT。
- `blog.js` 的 `generateTOC`、`setupCardAnimations`、`setupDirTreePanel` 等交互逻辑集中在单文件，页面初始化阶段容易做过多工作。

2. 维护性差
- `blog.js` 体量约 1000+ 行，包含初始化、主题、渲染、目录树、导航、交互、CDN 依赖加载等多类职责，耦合较高。
- 页面脚本（`index.html` / `page.html` / `post.html`）存在重复的数据加载与渲染流程代码，后续改动容易漏改。

3. 配置难修改
- `conf/config.yml` 到 `site-config.json` 的转换链路较长，原先缺少“构建前校验”，配置错误只能在运行期暴露。
- 已增加 `build.js` 前置校验（ID、必填字段、交叉引用、功能模块 source 等）。

4. 页面不可定制、主题无法完整控制界面
- 当前主题主要通过 `usr/themes/*/style.css` 覆盖样式，页面布局结构和组件开关仍偏“写死”在 HTML 内。
- 主题配置仅控制有限外观信息，缺少布局级 token（间距、圆角、卡片密度、导航样式、首页模块开关）。

5. UI 观感弱
- 首页/功能页视觉层次和状态反馈较弱，且不同页面视觉语言不完全统一。

## 2. 已完成的优化

1. 首页性能与可用性
- 增加分类作用域下的搜索 + 分页（按 `display.postsPerPage`）。
- 目录模式（tree）下分页与路径切换联动。

2. 配置稳定性
- `build.js` 增加配置结构校验并在错误时阻断构建。
- README 补充“配置校验”说明与排错流程。

3. 前端可维护性（第一步）
- 已将原 `blog.js` 拆分为：
  - `blog.core.js`（初始化、加载、校验、通用工具）
  - `blog.render.js`（Markdown、列表、分类、目录渲染）
  - `blog.ui.js`（导航、回顶、进度条、TOC、动画）
  - `blog.js`（聚合入口，继续暴露 `window.Blog`）
- 所有页面已切换为模块化加载顺序，现有 `Blog.*` 调用保持兼容。
- 新增 `Blog.runPage()` / `Blog.showPageError()` 作为页面统一启动与错误处理入口，并已接入 `page.html`、`post.html`。
- `setFavicon` / `setNavLogo` 去掉 `HEAD` 预探测，改为直接设置资源并使用浏览器错误回退，减少额外请求。

## 3. 建议的下一阶段（按优先级）

### P1（本周，低风险高收益）

1. 拆分 `blog.js`（保持 API 不变）
- 目标文件：
  - `blog.core.js`：状态、`init`、数据加载、安全校验
  - `blog.render.js`：文章卡片、Markdown、分类/目录渲染
  - `blog.ui.js`：导航、回顶、进度条、TOC、动画
  - `blog.loader.js`：聚合并导出 `window.Blog`
- 要求：`Blog.init`、`Blog.renderNavLinks`、`Blog.setupCommonFeatures` 等对外接口完全兼容。

2. 页面初始化收敛
- 抽出统一入口方法（如 `Blog.bootstrapPage({ needIndex, needPathMap, onReady })`），减少各页面重复逻辑。

3. 主题能力补齐（不改框架）
- 新增 `theme.config` 字段：`layout`, `card`, `nav`, `hero`, `effects`。
- 将页面中硬编码样式参数改为 CSS 变量驱动，主题可覆盖变量实现“完整操作界面”。

### P2（两周，中等改动）

1. 资源加载优化
- 取消 favicon/logo 的 `HEAD` 探测，改为直接设置并通过 `onerror` 回退，减少请求数。
- Markdown/高亮资源按页面类型懒加载，并增加失败兜底 UI。

2. 构建优化
- 在 `build.js` 增加增量构建缓存（按文件 mtime/hash），减少重复扫描与解析。

3. 可定制页面增强
- 扩展 `pages` 配置：支持模板类型、组件开关、SEO 字段、布局参数。

### P3（持续改进）

1. 建立性能基线
- 指标：首屏渲染时长、文章列表渲染耗时、JS 体积、DOM 节点数。
- 每次发布输出基线对比。

2. UI 系统化
- 建立设计 token（颜色、字号、间距、阴影、圆角、动效时长）与页面组件规范，提升一致性与主题扩展效率。

## 4. 验证清单

1. 构建与运行
- `node build.js`
- `node serve.js`

2. 回归点
- 首页：分类切换、搜索、分页、tree 导航
- 文章页：Markdown 渲染、目录、高亮
- 自定义页/功能页：导航高亮、主题样式、移动端菜单

3. 配置错误注入测试
- 人为制造重复 `categories.id`、错误 `categoryId`、缺失 `source`，确认构建报错清晰且能阻断发布。
