#!/usr/bin/env node

const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const pkg = require("../package.json");
const ROOT = path.resolve(__dirname, "..");

// ── i18n ────────────────────────────────────────────────
const LOCALES = {
  zh: {
    usage: "用法",
    commands: "命令",
    options: "选项",
    init: "初始化博客工作区",
    build: "从 Markdown 构建静态站点",
    serve: "启动本地开发服务器",
    help: "显示此帮助信息",
    version: "显示版本号",
    lang: "指定语言 (zh/en)",
    unknown: "未知命令",
    runHelp: '运行 "blog --help" 查看可用命令',
    noLive: "启动服务器（禁用热重载）",
    port: "端口号（默认 8080）",
    base: "子路径（默认 /）",
  },
  en: {
    usage: "Usage",
    commands: "Commands",
    options: "Options",
    init: "Initialize blog workspace",
    build: "Build static site from Markdown",
    serve: "Start local dev server",
    help: "Show this help message",
    version: "Show version number",
    lang: "Specify language (zh/en)",
    unknown: "Unknown command",
    runHelp: 'Run "blog --help" for available commands.',
    noLive: "Start server without live-reload",
    port: "Port number (default: 8080)",
    base: "Base path (default: /)",
  },
};

function detectLang() {
  const env = process.env.BLOG_LANG || process.env.LANG || "";
  if (env.startsWith("zh")) return "zh";
  return "en";
}

function getLang() {
  const idx = process.argv.indexOf("--lang");
  if (idx !== -1 && process.argv[idx + 1]) {
    const lang = process.argv[idx + 1];
    if (LOCALES[lang]) return lang;
  }
  return detectLang();
}

function t(key) {
  const lang = getLang();
  return (LOCALES[lang] && LOCALES[lang][key]) || (LOCALES.en[key]) || key;
}

// ── Commands ────────────────────────────────────────────
const COMMANDS = {
  init: { script: "init.js" },
  build: { script: "build.js" },
  serve: { script: "serve.js" },
};

function showHelp() {
  const lang = getLang();
  console.log(`
${pkg.name} v${pkg.version}
${pkg.description}

${t("usage")}:
  blog <command> [options]

${t("commands")}:
  init                  ${t("init")}
  build                 ${t("build")}
  serve [port] [base]   ${t("serve")} (default: 8080, /)
  serve --no-live       ${t("noLive")}
  help                  ${t("help")}

${t("options")}:
  --version, -v         ${t("version")}
  --help, -h            ${t("help")}
  --lang <lang>         ${t("lang")}
`);
}

function run(script, args) {
  const scriptPath = path.join(ROOT, script);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Error: ${script} not found at ${scriptPath}`);
    process.exit(1);
  }
  try {
    execFileSync(process.execPath, [scriptPath, ...args], {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (err) {
    process.exit(err.status || 1);
  }
}

// ── Main ────────────────────────────────────────────────
const rawArgs = process.argv.slice(2).filter((a) => a !== "--lang" && !LOCALES[a]);
const command = rawArgs[0];

if (!command || command === "--help" || command === "-h" || command === "help") {
  showHelp();
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  console.log(pkg.version);
  process.exit(0);
}

const entry = COMMANDS[command];
if (!entry) {
  console.error(`${t("unknown")}: ${command}`);
  console.error(t("runHelp"));
  process.exit(1);
}

run(entry.script, rawArgs.slice(1));
