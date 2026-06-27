# 热重载实现

## 目标
为 serve.js 添加文件监听 + 浏览器自动刷新

## 约束
- 零依赖
- SSE 方案（非 WebSocket）
- 只在 serve.js 运行时注入，dist/ 产物干净
- 绑定 localhost，不暴露文件路径

## 状态
- [x] 方案分析（docs/architecture/hot-reload-analysis.md）
- [x] 实现 serve.js 改造
- [x] 本地验证

## 验证结果
- [x] /__reload.js 端点返回客户端脚本
- [x] /__reload SSE 端点正常
- [x] HTML 文件注入热重载脚本
- [x] 文件变化触发自动重建（0.2s）
- [x] --no-live 禁用热重载
- [x] --no-live 时 HTML 无注入
- [x] 静态文件正常响应
