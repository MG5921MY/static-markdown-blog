const { build } = require('./src/kernel/index');

const options = {
  includeDrafts: process.argv.includes('--include-drafts'),
  incremental: process.argv.includes('--incremental')
};

build(options).catch((err) => {
  console.error('Build failed:', err.message);
  process.exitCode = 1;
});
