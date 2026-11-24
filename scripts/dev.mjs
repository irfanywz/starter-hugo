// Mode kerja sehari-hari:  npm start
// Menjalankan Tailwind (watch, lewat `npm run dev`) dan `hugo server` sekaligus di satu terminal.
// Tekan Ctrl+C untuk menghentikan keduanya. Argumen tambahan diteruskan ke hugo:
//   npm start -- --port 1314
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const cssOutput = path.join(root, 'themes', 'starter', 'assets', 'css', 'output.css');

function runSync(command, args) {
    return spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: true });
}

// 1) Dependensi Node
if (!existsSync(path.join(root, 'node_modules'))) {
    console.log('node_modules belum ada, menjalankan npm install ...\n');
    if (runSync('npm', ['install']).status !== 0) process.exit(1);
}

// 2) Hugo harus ada di PATH
const hugoCheck = spawnSync('hugo', ['version'], { cwd: root, shell: true, stdio: 'ignore' });
if (hugoCheck.status !== 0) {
    console.error('❌ Hugo tidak ditemukan di PATH. Pasang Hugo extended (versi di GitHub Actions: 0.164.0) lalu coba lagi.');
    process.exit(1);
}

// 3) font self-host (disalin dari node_modules)
if (runSync('node', ['scripts/fonts.mjs', '--soft']).status !== 0) process.exit(1);

// 4) output.css tidak di-commit, jadi buat dulu kalau belum ada
if (!existsSync(cssOutput)) {
    console.log('output.css belum ada, membangun CSS Tailwind dulu ...\n');
    if (runSync('npm', ['run', 'build']).status !== 0) process.exit(1);
}

function run(command, args) {
    // Di Linux/macOS dijalankan sebagai grup proses sendiri supaya seluruh turunannya bisa dimatikan sekaligus.
    return spawn(command, args, { cwd: root, stdio: 'inherit', shell: true, detached: !isWindows });
}

function kill(child) {
    if (!child.pid || child.exitCode !== null) return;
    try {
        if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
        else process.kill(-child.pid, 'SIGTERM');
    } catch { /* sudah berhenti */ }
}

const children = [run('npm', ['run', 'dev']), run('hugo', ['server', ...process.argv.slice(2)])];

let stopping = false;
function stopAll(code = 0) {
    if (stopping) return;
    stopping = true;
    children.forEach(kill);
    setTimeout(() => process.exit(code), 300);
}

children.forEach((c) => c.on('exit', (code) => stopAll(code ?? 0)));
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
