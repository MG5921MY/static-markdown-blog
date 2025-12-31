---
title: 安全特性
date: 2025-01-01
tags: [功能, 安全]
---

# 安全特性

博客系统内置多项安全防护措施。

## XSS 防护

- 所有用户输入经过 `escapeHtml()` 转义
- Markdown 渲染使用 DOMPurify 净化
- 阻止恶意脚本注入

## 路径安全

- Hash ID 系统隐藏真实文件路径
- 路径遍历检测 (`../` 攻击防护)
- 危险路径过滤

## URL 验证

- 协议白名单验证
- 阻止 `javascript:`、`data:`、`vbscript:` 等危险协议
- 外部链接自动添加 `rel="noopener noreferrer"`

## ID 格式验证

- 严格的 ID 格式校验
- 防止注入攻击
- 只允许安全字符

## 最佳实践

1. 定期更新依赖
2. 使用 HTTPS 部署
3. 配置适当的 CSP 头
4. 不要在前端暴露敏感信息
