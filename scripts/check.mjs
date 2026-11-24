// Cek sebelum publish:  npm run check
// 1) tes JS  2) build CSS Tailwind  3) build Hugo + smoke test (lihat scripts/smoke.mjs)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = (script, ...args) => spawnSync(process.execPath, [path.join(root, 'scripts', script), ...args], { cwd: root, stdio: 'inherit' });
let failed = false;

console.log('1/3  Tes JS\n');
if (node('test.mjs').status !== 0) failed = true;

console.log('\n2/3  Build CSS Tailwind\n');
const css = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true });
if (css.status !== 0) {
    console.log('❌ Build CSS gagal. Sudah menjalankan `npm install`?');
    failed = true;
} else {
    console.log('✅ CSS berhasil dibangun.');
}

console.log('\n3/3  Build Hugo + smoke test\n');
if (!failed || css.status === 0) {
    if (node('smoke.mjs', '--skip-css').status !== 0) failed = true;
} else {
    console.log('(dilewati karena CSS gagal dibangun)');
}

console.log(failed ? '\n❌ Ada yang perlu diperbaiki sebelum publish.' : '\n✅ Aman untuk publish.');
process.exit(failed ? 1 : 0);
