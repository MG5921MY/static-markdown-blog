# 热重载方案分析

> 目标：在零依赖约束下，为 `serve.js` 开发服务器添加文件监听 + 浏览器自动刷新能力，同时不引入安全风险。

---

## 1. 约束条件

| 约束 | 说明 |
|------|------|
| **零依赖** | 不能引入 npm 包（无 chokidar、ws、livereload） |
| **纯 Node.js 内置模块** | 只能用 `fs`、`http`、`path`、`child_process` 等 |
| **开发环境专用** | 热重载只在 `serve.js` 启动时激活，不影响构建产物 |
| **Windows 兼容** | 当前开发环境是 Windows，`fs.watch` 行为需验证 |
| **安全第一** | 不能暴露文件系统路径、不能执行用户输入、不能引入注入点 |

---

## 2. 通信方案对比

### 方案 A：轮询（Polling）

```
浏览器 ──GET /__status──→ 服务器
浏览器 ←─{ changed: true }─ 服务器
浏览器 → location.reload()
```

| 维度 | 评估 |
|------|------|
| 实现复杂度 | 最低（~30 行） |
| 安全性 | 最高（无持久连接，无用户输入） |
| 实时性 | 差（取决于轮询间隔，通常 500-1000ms） |
| 资源消耗 | 每个标签页每秒 1-2 个 HTTP 请求 |
| 多标签页 | 每个标签页独立轮询，无问题 |
| 断线恢复 | 天然恢复（下一次轮询自动重连） |

### 方案 B：Server-Sent Events（SSE）

```
浏览器 ──GET /__reload──→ 服务器（保持连接）
浏览器 ←─event: reload── 服务器（文件变化时推送）
浏览器 → location.reload()
```

| 维度 | 评估 |
|------|------|
| 实现复杂度 | 低（~50 行服务端 + ~20 行客户端） |
| 安全性 | 高（单向 server→client，无用户输入反射，无升级握手） |
| 实时性 | 好（毫秒级推送） |
| 资源消耗 | 每个标签页一个长连接 |
| 多标签页 | 每个标签页独立连接，无问题 |
| 断线恢复 | `EventSource` 内置自动重连（默认 3 秒） |
| 浏览器支持 | 所有现代浏览器（IE 不支持，不重要） |

### 方案 C：WebSocket

```
浏览器 ──GET /__ws (Upgrade)──→ 服务器
浏览器 ←─frame: reload────── 服务器
浏览器 → location.reload()
```

| 维度 | 评估 |
|------|------|
| 实现复杂度 | 高（需从零实现 RFC 6455 握手 + 帧解析 + 掩码） |
| 安全性 | 中（握手解析复杂，帧掩码逻辑易出错，攻击面大） |
| 实时性 | 最好（双向、低延迟） |
| 资源消耗 | 每个标签页一个长连接 |
| 多标签页 | 需要广播逻辑 |
| 断线恢复 | 需要自己实现重连 |

### 方案 D：长轮询（Long Polling）

```
浏览器 ──GET /__wait──→ 服务器（阻塞直到变化）
浏览器 ←─{ changed: true }─ 服务器
浏览器 → location.reload()
浏览器 ──GET /__wait──→ 服务器（立即发起下一次）
```

| 维度 | 评估 |
|------|------|
| 实现复杂度 | 中（需管理挂起的请求、超时、清理） |
| 安全性 | 高 |
| 实时性 | 好 |
| 资源消耗 | 每个标签页一个挂起连接 |
| 多标签页 | 每个标签页独立，无问题 |
| 断线恢复 | 需要自己实现重试 |

---

## 3. 推荐方案：SSE

**选择理由：**

1. **安全性最优组合** — 单向通信，无用户输入反射，无协议升级握手，无帧解析
2. **实现成本低** — 服务端 ~50 行，客户端 ~20 行，零依赖
3. **实时性好** — 毫秒级推送，比轮询体验明显好
4. **浏览器原生支持** — `EventSource` API 自带断线重连，无需自己实现
5. **与零依赖约束完全兼容** — 只用 `http` 模块

**不需要 WebSocket 的理由：**

- 热重载只需要 server→client 单向通知，不需要 client→server 通信
- 从零实现 WebSocket 协议（握手 + 帧解析 + 掩码）复杂度高，且是安全攻击面
- `EventSource` 已经内置了 WebSocket 的核心优势（长连接、自动重连）

---

## 4. 文件监听方案

### 4.1 监听范围

```text
需要监听：
  workspace/site/          ← 用户内容（config、posts、pages、data、assets、themes/custom）
  themes/                  ← 内置主题（开发者修改主题时）
  *.html                   ← 页面模板（开发者修改模板时）
  *.js                     ← 核心脚本（开发者修改脚本时）

不需要监听：
  dist/                    ← 构建产物（由 build.js 生成）
  .git/                    ← 版本控制
  node_modules/            ← 不存在，但排除以防万一
  docs/                    ← 文档不影响构建
  legacy/                  ← 旧结构
  examples/                ← 示例
  docker/                  ← Docker 配置
```

### 4.2 fs.watch vs fs.watchFile

| 特性 | fs.watch() | fs.watchFile() |
|------|-----------|----------------|
| 类型 | 事件驱动 | 轮询（stat 间隔） |
| CPU 消耗 | 低 | 高（默认每 5007ms stat 一次） |
| 递归监听 | Windows/macOS 原生支持，Linux 需手动递归 | 不支持递归 |
| 可靠性 | 平台相关（Windows 上可靠） | 最可靠 |
| 适合场景 | 已知目录结构、本地开发 | 需要极高可靠性 |

**选择：`fs.watch()`**

理由：
- Windows 上递归监听原生支持（`{ recursive: true }`）
- 本项目开发环境是 Windows
- 事件驱动，CPU 消耗低
- 有已知问题（某些编辑器保存时可能触发多次事件），通过 debounce 解决

### 4.3 防抖（Debounce）策略

文件系统事件可能短时间内触发多次（编辑器保存、格式化、自动备份等）：

```
t=0ms    文件开始写入 → fs.watch 触发
t=5ms    文件写入中  → fs.watch 触发
t=10ms   文件写入完成 → fs.watch 触发
t=50ms   编辑器格式化 → fs.watch 触发
t=100ms  格式化完成   → fs.watch 触发
```

**策略：滚动窗口 debounce 300ms**

- 每次收到 fs.watch 事件，重置 300ms 定时器
- 300ms 内无新事件 → 触发重建
- 重建期间收到的事件 → 排队，重建完成后再等 300ms

```javascript
let debounceTimer = null;
let building = false;
let pendingRebuild = false;

function scheduleRebuild() {
  if (building) {
    pendingRebuild = true;
    return;
  }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    building = true;
    await runBuild();
    building = false;
    if (pendingRebuild) {
      pendingRebuild = false;
      scheduleRebuild();
    }
  }, 300);
}
```

### 4.4 重建策略

**选项 A：调用 `execSync('node build.js')`**

```javascript
const { execSync } = require('child_process');
execSync('node build.js', { stdio: 'inherit' });
```

- 优点：复用现有 build.js，零改动
- 缺点：每次全量清理重建（`cleanDir`），启动新进程

**选项 B：在进程内调用 build 逻辑**

```javascript
// 动态 require build.js 的 main 函数
delete require.cache[require.resolve('./build.js')];
require('./build.js');
```

- 优点：无进程开销，可做增量构建
- 缺点：build.js 当前没有导出 main 函数，需要改造

**推荐：选项 A（保持简单）**

理由：
- build.js 的重建速度对开发场景足够（全量 < 1 秒）
- 不需要改造 build.js
- 进程隔离更安全（build 崩溃不影响 serve）
- 后续如果需要增量构建，再改造不迟

---

## 5. 客户端注入方案

### 5.1 注入方式

serve.js 在返回 HTML 文件时，自动在 `</body>` 前注入一段小脚本：

```javascript
// 在 serve.js 的响应处理中
if (ext === '.html') {
  const reloadScript = `<script src="./__reload.js"></script>`;
  data = Buffer.from(data.toString().replace('</body>', `${reloadScript}\n</body>`));
}
```

客户端脚本 `__reload.js` 由 serve.js 动态生成（不写入 dist/），内容约 20 行。

### 5.2 客户端脚本设计

```javascript
// __reload.js — 由 serve.js 动态生成，不写入 dist/
(function() {
  var es = new EventSource('./__reload');
  var reconnectDelay = 1000;

  es.onopen = function() {
    reconnectDelay = 1000;  // 重连成功，重置延迟
  };

  es.addEventListener('reload', function() {
    location.reload();
  });

  es.onerror = function() {
    // EventSource 内置重连（默认 3 秒），这里不需要额外处理
    // 但如果要自定义重连间隔：
    es.close();
    setTimeout(function() {
      // 重新创建连接
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);  // 指数退避，最大 30 秒
  };
})();
```

### 5.3 仅开发模式注入

关键点：**只在 serve.js 运行时注入**，构建产物中不包含热重载脚本。

```
node build.js           → dist/ 中无 __reload 脚本
node serve.js           → HTML 响应中注入 __reload 脚本
                        → /__reload.js 端点由 serve.js 动态提供
                        → /__reload SSE 端点由 serve.js 动态提供
```

这意味着：
- `dist/` 目录干净，不含开发代码
- `build.js` 零改动
- 热重载完全是 serve.js 的附加行为

---

## 6. 安全分析

### 6.1 攻击面评估

| 攻击面 | 风险 | 缓解措施 |
|--------|------|----------|
| **SSE 端点注入** | 低 | SSE 事件数据是硬编码的 `{ "type": "reload" }`，不反射用户输入 |
| **路径遍历** | 低 | serve.js 已有 `filePath.startsWith(DIST_DIR)` 检查 |
| **__reload.js 内容篡改** | 低 | 脚本由 serve.js 内存中生成，不读取外部文件 |
| **fs.watch 目录逃逸** | 低 | 只监听已知目录，不接受用户指定的监听路径 |
| **资源耗尽** | 中 | 连接数限制 + debounce 防止频繁重建 |
| **跨域访问** | 低 | SSE 遵循同源策略，且 serve.js 只绑定 localhost |
| **信息泄露** | 低 | SSE 事件不含文件路径、错误堆栈等敏感信息 |

### 6.2 具体安全措施

**A. SSE 端点不反射任何输入**

```javascript
// 安全：事件数据完全硬编码
res.write('event: reload\ndata: {"type":"reload"}\n\n');

// 危险：不要这样做
// res.write(`event: reload\ndata: ${JSON.stringify({ path: changedFile })}\n\n`);
```

**B. 连接数限制**

```javascript
const MAX_SSE_CLIENTS = 10;
let sseClients = new Set();

function handleSSE(req, res) {
  if (sseClients.size >= MAX_SSE_CLIENTS) {
    res.writeHead(429);
    res.end('Too many connections');
    return;
  }
  // ...
}
```

**C. 绑定 localhost**

```javascript
server.listen(PORT, '127.0.0.1', () => { ... });
// 而不是 server.listen(PORT, '0.0.0.0', () => { ... });
```

**D. 不暴露文件路径**

```javascript
// 安全：只通知变化，不告知哪个文件变了
broadcast('reload');

// 危险：暴露了内部路径结构
// broadcast(JSON.stringify({ file: changedPath, type: 'changed' }));
```

**E. Build 进程隔离**

```javascript
// 安全：固定命令，不拼接用户输入
execSync('node build.js', { stdio: 'inherit', cwd: ROOT });

// 危险：不要拼接任何变量到命令中
// execSync(`node build.js --theme=${userInput}`, ...);
```

### 6.3 与 WebSocket 方案的安全对比

| 安全维度 | SSE | WebSocket |
|----------|-----|-----------|
| 协议握手 | 标准 HTTP GET，无特殊处理 | 需要解析 Upgrade 头、计算 SHA-1 accept key |
| 数据帧 | 原始文本，无掩码 | 需要解析帧头、处理掩码、分片 |
| 用户输入 | 无（单向推送） | 需要解析客户端消息（潜在注入面） |
| DoS 风险 | 低（每客户端一个连接） | 中（可发送大量帧消耗 CPU） |
| 实现出错概率 | 低（API 简单） | 高（RFC 6455 复杂） |

---

## 7. 完整数据流

```
┌─────────────────────────────────────────────────────────┐
│ serve.js                                                │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │ HTTP     │    │ SSE      │    │ File Watcher     │   │
│  │ Server   │    │ Endpoint │    │ (fs.watch)       │   │
│  │          │    │          │    │                  │   │
│  │ 静态文件  │    │ /__reload│    │ workspace/site/  │   │
│  │ dist/    │    │          │    │ themes/          │   │
│  │          │    │ 保持连接  │    │ *.html, *.js     │   │
│  └──────────┘    └──────────┘    └──────────────────┘   │
│       │               │                   │             │
│       │               │            fs.watch 事件         │
│       │               │                   │             │
│       │               │            debounce 300ms       │
│       │               │                   │             │
│       │               │         execSync('node build.js')│
│       │               │                   │             │
│       │               │          构建完成 → 通知         │
│       │               │                   │             │
│       │          event: reload ←───────────┘             │
│       │               │                                 │
└───────┼───────────────┼─────────────────────────────────┘
        │               │
        │    ┌──────────┴──────────┐
        │    │                     │
        ▼    ▼                     │
   ┌─────────────┐                │
   │  Browser    │                │
   │             │                │
   │ EventSource │──GET /__reload─┘
   │     ↓       │
   │ reload 事件  │
   │     ↓       │
   │ location    │
   │ .reload()   │
   └─────────────┘
```

---

## 8. 实现方案

### 8.1 serve.js 改动范围

```text
serve.js 当前：100 行
serve.js 改动后：约 200 行

新增：
  - SSE 连接管理（~30 行）
  - fs.watch 文件监听（~40 行）
  - debounce + 重建调度（~30 行）
  - 客户端脚本注入（~15 行）
  - __reload.js 端点（~10 行）
  - __reload SSE 端点（~15 行）

改动：
  - HTML 响应处理（注入脚本）（~5 行）
  - server.listen 绑定地址（1 行）
```

### 8.2 新增端点

| 端点 | 方法 | 类型 | 说明 |
|------|------|------|------|
| `/__reload` | GET | SSE | 保持连接，推送 reload 事件 |
| `/__reload.js` | GET | JS | 客户端脚本（serve.js 动态生成） |

### 8.3 命令行参数

```bash
# 现有用法（不变）
node serve.js
node serve.js 8080 /blog/

# 新增：禁用热重载
node serve.js 8080 --no-live

# 新增：自定义 debounce 间隔
node serve.js 8080 --debounce=500
```

### 8.4 控制台输出

```
Building dist...
  Build completed

Serving dist on http://localhost:8080
  Live reload: enabled
  Watching: workspace/site/, themes/, *.html, *.js

[01:15:46] File changed: workspace/site/content/posts/guide/getting-started.md
[01:15:46] Rebuilding...
[01:15:47] Build completed (0.4s)
[01:15:47] Reloaded 2 client(s)
```

---

## 9. 不做的事情

| 不做 | 理由 |
|------|------|
| **CSS 热注入（不刷新页面）** | 实现复杂（需要解析 CSS 依赖链），且 build.js 会清理重建 dist/，无法只替换 CSS 文件 |
| **增量构建** | build.js 当前 cleanDir + 全量重建，增量需要大改。全量重建 < 1 秒，开发场景可接受 |
| **WebSocket** | 单向通知不需要双向通信，SSE 更简单更安全 |
| **自定义重连策略** | EventSource 内置重连已经够用，不需要覆盖 |
| **多文件变化合并通知** | debounce 已经处理了这个问题，300ms 内的多次变化合并为一次重建 |
| **构建错误推送** | 第一版不推送构建错误到客户端（避免暴露内部路径），只在控制台输出 |

---

## 10. 后续扩展方向

| 方向 | 时机 | 说明 |
|------|------|------|
| CSS 热注入 | 构建时渲染 Markdown 后 | 如果 build.js 改为只更新变化的文件，可以做 CSS-only reload |
| 增量构建 | 文章数量 > 100 篇 | 按文件变化范围决定是否需要全量重建 |
| 构建状态推送 | 用户反馈需要 | 可以在 SSE 中推送 building/built/error 状态到浏览器状态栏 |
| 文件变化类型 | 用户反馈需要 | 可以区分 content/config/theme 变化，做不同的刷新策略 |
