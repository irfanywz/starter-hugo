// Pratinjau seperti produksi, termasuk pencarian:  npm run preview
// Build CSS + Hugo (minify) ke public/, buat indeks Pagefind, lalu sajikan di http://localhost:1414
// (Pencarian butuh indeks hasil build, jadi tidak tersedia di `npm start`.)
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
const PORT = 1414;

console.log('1/3  Build CSS\n');
if (run('npm', ['run', 'build']).status !== 0) process.exit(1);

console.log('\n2/3  Build Hugo (production)\n');
const hugo = spawnSync('hugo', ['--gc', '--minify', '--environment', 'production', '--cleanDestinationDir', '--baseURL', `http://localhost:${PORT}/`], { cwd: root, stdio: 'inherit' });
if (hugo.error || hugo.status !== 0) {
    console.error('❌ Build Hugo gagal (Hugo terpasang di PATH?).');
    process.exit(1);
}

console.log(`\n3/3  Indeks pencarian + server di http://localhost:${PORT}  (Ctrl+C untuk berhenti)\n`);
const server = spawn('npx', ['pagefind', '--site', 'public', '--serve'], { cwd: root, stdio: 'inherit', shell: true });
const stop = () => { server.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => process.exit(code ?? 0));
