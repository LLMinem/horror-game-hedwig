// Syntax and behavioral checks without private reference or Blender inputs.
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
async function syntax(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) await syntax(relative);
    else if (/\.(m?js)$/.test(entry.name)) run(process.execPath, ['--check', relative]);
  }
}
await syntax('src');
await syntax('tools');
run(process.execPath, ['--check', 'vite.config.js']);
const python = process.env.HEDWIG_PYTHON ?? path.join(root, '.local/blueprint-venv/bin/python');
for (const directory of ['tools/references', 'tools/blueprint', 'tools/review']) {
  run(python, ['-m', 'unittest', 'discover', '-s', directory, '-p', 'test_*.py']);
}
console.log('PASS: JavaScript syntax and reference, Atlas and spatial behavior checks.');
