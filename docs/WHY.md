# 设计理念：为什么做这个项目

> 本文档说明 static-markdown-blog 项目的设计动机、技术选择和行业判断。
>
> 项目地址：https://github.com/MG5921MY/static-markdown-blog

---

## 一、初衷

两年前，我喜欢用 Markdown 写笔记和博客。当时市面上的静态博客方案，要么主题设计过时，要么依赖链复杂，要么不支持子路径部署。没有一个能让我满意，于是决定自己动手。

最初只是解决个人需求。后来在使用 AI 的过程中，发现一个契合点：AI 产生的知识（调试经验、架构决策、代码模式）本质上也是 Markdown，也需要持久化存储，也需要一种方式展示给其他人。于是开始围绕这个方向完善功能。

这个项目是两件事的交汇：**一个人的笔记需求**，和 **AI 时代的知识管理痛点**。

---

## 二、核心问题

**AI 产生的知识锁在对话历史里，用户看不到、搜不到、用不到。**

同时也为喜欢用 Markdown 写静态博客的人提供一个零依赖、主题精美、部署自由的平台。

这个项目让 AI 把知识写成 Markdown，构建为可搜索的网站，部署到任何地方。人和 AI 都能用。

---

## 三、为什么选择 Markdown

2026 年，三类 AI 智能体都选择 Markdown 作为记忆主体：

| 类型 | 代表 | 记忆格式 |
|------|------|---------|
| 被动响应型 | Claude Code / Cursor / Windsurf / Aider | Markdown |
| 主动管家型 | OpenClaw（346k+ stars） | Markdown |
| 自学习进化型 | Hermes Agent（57k+ stars） | Markdown |

**原因很简单：**

- Markdown 是纯文本，人类能直接阅读
- Markdown 可以版本控制（git diff、git blame）
- Markdown 可以迁移到任何工具
- Markdown 不依赖任何服务商

向量数据库做不到这些。SaaS 笔记做不到这些。**只有 Markdown 能同时满足"人类可读 + AI 可写 + 版本可追溯 + 可迁移"。**

向量数据库是检索补充，不是存储主体。Karpathy LLM Wiki（X 上 1500 万浏览）和 Google OKF 标准都指向同一结论——Markdown 文件 + YAML frontmatter 正在被标准化为供应商中立的知识存储格式。

---

## 四、设计理念

每个功能都围绕一个核心问题：**用户是否被绑定？**

| 原则 | 体现 |
|------|------|
| 不被格式锁定 | 纯 Markdown + Git |
| 不被运行时绑定 | 零依赖，dist/ 自包含 |
| 不被部署绑定 | 静态输出，任意托管 |
| 不被 UI 绑定 | 5 主题 + Token 系统 + 自定义 HTML |
| 不被许可证绑定 | Apache 2.0 |

一句话：**用户拥有完全的控制权。**

---

## 五、安全边界

`src/` 和 `site/` 的分离，本质是给 AI 划的边界。AI 只能在 `site/` 里活动，不可能破坏构建系统。这意味着可以放心把写入权限交给 AI，不需要人工审核每次修改。

---

## 六、可继承性

即使作者弃坑，这个知识库也不会变成废墟：

- **架构清晰** — kernel / plugins / client / pages 四层，目录结构即文档
- **零运行时依赖** — dist/ 自包含，所有 JS 库以 vendor 方式本地加载
- **构建是纯函数** — 输入 site/ → 输出 dist/，无副作用无状态

一个强 AI + 10 分钟代码阅读 = 可维护。AI 用它积累知识，AI 也能维护它本身——自举系统。

---

## 七、参考文献

所有理论、事实、数据均来自以下来源，按权威性分级：

### A 级（官方文档与一手报告）

[1] Anthropic. *How Claude remembers your project*. https://docs.anthropic.com/en/docs/claude-code/memory

[2] Anthropic. *Anthropic Economic Index: Cadences*. https://www.anthropic.com/research/economic-index-june-2026-report

[3] Anthropic. *Agentic coding and persistent returns to expertise*. https://www.anthropic.com/research/claude-code-expertise

[4] Google Cloud. *Open Knowledge Format (OKF) v0.1*. https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md

[5] Karpathy A. *LLM Knowledge Bases*. https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

[6] OpenClaw. *记忆概览*. http://docs.openclaw.ai/concepts/memory

[7] Nous Research. *Hermes Agent*. https://github.com/NousResearch/hermes-agent

### B 级（二手解读）

[8] PromptSpace. *OpenClaw vs Hermes Agent*. https://www.promptspace.in/blog/openclaw-vs-hermes-agent-comparison-2026

[9] 腾讯新闻. *开源"爱马仕"两个月狂揽 7.7 万星*. https://new.qq.com/rain/a/20260414A049DQ00
