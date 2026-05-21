import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set([
  '.git',
  '.wrangler',
  'node_modules',
]);

function collectJavaScriptFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        files.push(...collectJavaScriptFiles(join(dir, entry.name)));
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(join(dir, entry.name));
    }
  }

  return files;
}

const files = collectJavaScriptFiles(ROOT)
  .filter((file) => statSync(file).isFile())
  .sort((a, b) => a.localeCompare(b));

if (!files.length) {
  console.log('No JavaScript files found.');
  process.exit(0);
}

let failed = 0;

for (const file of files) {
  const displayPath = relative(ROOT, file).replace(/\\/g, '/');
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    failed += 1;
    console.error(`✗ ${displayPath}`);
    if (result.stdout) console.error(result.stdout.trim());
    if (result.stderr) console.error(result.stderr.trim());
  } else {
    console.log(`✓ ${displayPath}`);
  }
}

if (failed > 0) {
  console.error(`Syntax check failed: ${failed}/${files.length} file(s) failed.`);
  process.exit(1);
}

console.log(`Syntax check passed: ${files.length} JavaScript file(s) checked.`);