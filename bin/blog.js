#!/usr/bin/env node

const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const pkg = require("../package.json");
const ROOT = path.resolve(__dirname, "..");

const COMMANDS = {
  init: { script: "init.js", desc: "Initialize blog workspace" },
  build: { script: "build.js", desc: "Build static site" },
  serve: { script: "serve.js", desc: "Start local dev server" },
};

function showHelp() {
  console.log(`
${pkg.name} v${pkg.version}
${pkg.description}

Usage:
  blog <command> [options]

Commands:
  init                  Initialize blog workspace
  build                 Build static site from Markdown
  serve [port] [base]   Start local dev server (default: 8080, /)
  serve --no-live       Start server without live-reload
  help                  Show this help message

Options:
  --version             Show version number
  --help                Show help
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
      cwd: ROOT,
    });
  } catch (err) {
    process.exit(err.status || 1);
  }
}

const rawArgs = process.argv.slice(2);
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
  console.error(`Unknown command: ${command}`);
  console.error(`Run "blog --help" for available commands.`);
  process.exit(1);
}

run(entry.script, rawArgs.slice(1));
