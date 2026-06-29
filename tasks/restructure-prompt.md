# 目录结构重构任务书

## 项目路径
E:\MIJIAOGAME\MijiaoGamePak\MijiaoGameVuePak\HtmlPak\静态博客

## 背景
当前目录结构是开发阶段遗留，平台代码和用户数据混在同一个目录空间。需要重构为清晰的分层结构。

## 当前结构 → 目标结构

### 移动映射

```
当前                              目标
──────────────────────────────────────────────────
*.html (9个)                    → src/pages/*.html
*.page.js (6个)                 → src/pages/*.page.js
kernel/                         → src/kernel/
plugins/                        → src/plugins/
client/                         → src/client/
config/blog.config.yml          → site/config.yml
content/                        → site/content/
assets/                         → site/assets/
workspace/site/themes/custom/   → site/themes/custom/
workspace/site/.gitkeep         → 删除（site/ 本身就是目录）
examples/                       → 删除（Docker seed 用 site/ 即可）
_test_ssg_dist/                 → 删除（测试产物）
```

### 不变的

```
themes/           ← 内置主题，保持
locales/          ← i18n，保持
vendor/           ← 第三方库，保持
docker/           ← Docker 配置，保持
docs/             ← 文档，保持
.gitignore        ← 保持
build.js          ← 保持（但更新路径引用）
serve.js          ← 保持（但更新路径引用）
init.js           ← 保持（但更新路径引用）
test.js           ← 保持（但更新路径引用）
package.json      ← 保持
bin/              ← 保持
README.md         ← 保持
```

## 执行步骤

### Step 1: 创建新目录
```
mkdir src
mkdir src/pages
mkdir site
```

### Step 2: 移动平台文件
```
mv kernel/ → src/kernel/
mv plugins/ → src/plugins/
mv client/ → src/client/
mv index.html → src/pages/
mv index.page.js → src/pages/
mv post.html → src/pages/
mv page.html → src/pages/
mv 404.html → src/pages/
mv 404.page.js → src/pages/
mv moments.html → src/pages/
mv moments.page.js → src/pages/
mv links.html → src/pages/
mv links.page.js → src/pages/
mv gallery.html → src/pages/
mv gallery.page.js → src/pages/
mv disclaimer.html → src/pages/
mv disclaimer.page.js → src/pages/
mv about.html → src/pages/
mv favicon.ico → src/pages/
```

### Step 3: 移动用户数据
```
mv config/blog.config.yml → site/config.yml
mv content/ → site/content/
mv assets/ → site/assets/
mv workspace/site/themes/custom/ → site/themes/custom/
```

### Step 4: 清理
```
rm -rf workspace/
rm -rf examples/
rm -rf _test_ssg_dist/
rm -rf config/（已空）
```

### Step 5: 更新代码路径引用

以下文件需要更新路径引用：

#### build.js
- `PKG_ROOT` 不变（仍用 `__dirname`）
- `STATIC_FILES` 数组：路径从 `index.html` 改为 `src/pages/index.html`
- `copyStaticFiles()`：从 `src/pages/` 复制到 `dist/`
- `copySiteAssetsToDist()`：用户资产从 `site/assets/` 复制
- locales 从 `locales/` 复制（不变）
- config 查找链：`site/config.yml` → `config/blog.config.yml`（PKG_ROOT 下的旧路径保留兼容）

#### serve.js
- `ROOT` 不变（仍用 `process.cwd()`）
- watch 目录：`site/` 替代 `workspace/site/`
- watch 文件：从 `src/pages/*.html` 和 `src/pages/*.page.js` 监听

#### init.js
- `STARTER_DIR` 改为 `site/`（不再需要 examples）
- 复制逻辑：从 PKG_ROOT 的 `site/` 默认内容复制到用户 `site/`
- 或者：init.js 直接创建 `site/config.yml` + `site/content/` + `site/assets/`

#### kernel/config.js
- 配置查找链：`site/config.yml` → `config/blog.config.yml`（兼容旧路径）
- `WORKSPACE_SITE_DIR` 改为 `site/`

#### kernel/output.js
- `buildFeatures` 的 siteRoot 改为 `site/`

#### kernel/index.js
- 传入的 siteRoot 改为 `site/`

#### plugins/static-copy.js
- `STATIC_FILES` 路径更新为 `src/pages/` 前缀

#### test.js
- 所有路径引用更新

#### package.json
- `files` 字段更新

#### .gitignore
- `workspace/` 不再需要

### Step 6: 验证

```bash
node build.js          # 必须成功
node test.js           # 必须 212/212 通过
node serve.js 8098     # 浏览器访问必须正常
```

## 约束

- 零依赖（不引入 npm 包）
- 不改变 config.yml 格式（只是位置变了）
- 不改变 content/ 内部结构
- 不改变 themes/ 内部结构
- 不丢失任何现有功能
- build.js、serve.js、init.js 的核心逻辑不变，只改路径

## 关键检查点

1. `node build.js` 成功，输出 Posts: 2, RSS: 2, Sitemap: 7, Search: 2, SSG: 2
2. `dist/` 包含所有预期文件（index.html, client/*.js, themes/*, vendor/*, locales/*）
3. `site/config.yml` 存在且可读
4. `site/content/` 包含 posts/, pages/, data/
5. 所有 HTML 模板引用 `./client/*.js` 而非旧路径
6. 根目录干净：只有 src/, site/, themes/, locales/, vendor/, docker/, docs/, dist/, bin/, *.js, *.json, *.md
