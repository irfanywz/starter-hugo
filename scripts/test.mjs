// Menjalankan semua tes JS:  npm test
// Hanya butuh Node (tanpa Hugo, tanpa paket tambahan).
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = readdirSync(path.join(root, 'tests'))
    .filter((f) => f.endsWith('.test.mjs'))
    .sort()
    .map((f) => path.join('tests', f));

const result = spawnSync(process.execPath, ['--test', ...files], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
});

console.log(result.status === 0
    ? '\n✅ Semua tes JS lolos.'
    : '\n❌ Ada tes yang gagal (lihat bagian "not ok" di atas).');
process.exit(result.status ?? 1);
