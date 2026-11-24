// Smoke test hasil build:  npm run smoke
// Membangun situs ke folder sementara (tanpa menyentuh public/), lalu memeriksa hasilnya:
// berkas wajib, meta SEO, CSS/JS, ikon menu, dan tautan internal yang rusak.
//
// Opsi:  --skip-css   lewati `npm run build` (CSS dianggap sudah dibangun)
//        --strict     peringatan (WARN) Hugo dianggap gagal
//        --keep       jangan hapus folder hasil build (path ditampilkan)
//        --dir <path> periksa folder yang sudah ada, tanpa build (harus dibangun dengan baseURL http://localhost/)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { checkSite } from './lib/smoke-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values: opts } = parseArgs({
    options: {
        'skip-css': { type: 'boolean', default: false },
        strict: { type: 'boolean', default: false },
        keep: { type: 'boolean', default: false },
        dir: { type: 'string' },
    },
});

const BASE_URL = 'http://localhost/';
const hugoToml = readFileSync(path.join(root, 'hugo.toml'), 'utf8');
const searchEnabled = /^\s*search\s*=\s*true/m.test(hugoToml);
const menuIcons = [...hugoToml.matchAll(/icon-\[([^\]]+)\]/g)].map((m) => m[1]);
let outDir = opts.dir ? path.resolve(opts.dir) : null;
let failed = false;
const extraProblems = [];

if (!outDir) {
    if (!opts['skip-css']) {
        console.log('• Build CSS Tailwind ...');
        const css = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true });
        if (css.status !== 0) {
            console.error('❌ Build CSS gagal. Sudah menjalankan `npm install`?');
            process.exit(1);
        }
    }

    const version = spawnSync('hugo', ['version'], { encoding: 'utf8' });
    if (version.error || version.status !== 0) {
        console.error('❌ Hugo tidak ditemukan di PATH. Pasang Hugo extended (versi di GitHub Actions: 0.164.0).');
        process.exit(1);
    }
    console.log(`• ${version.stdout.trim()}`);

    spawnSync(process.execPath, [path.join(root, 'scripts', 'fonts.mjs'), '--soft'], { cwd: root, stdio: 'inherit' });

    outDir = mkdtempSync(path.join(tmpdir(), 'hugo-smoke-'));
    console.log('• Build Hugo (production, ke folder sementara) ...');
    // Tanpa --minify: HTML mudah diperiksa. Lingkungan production tetap dipakai (fingerprint, dll).
    const build = spawnSync('hugo', ['--gc', '--environment', 'production', '--baseURL', BASE_URL, '--destination', outDir], { cwd: root, encoding: 'utf8' });
    const lines = `${build.stdout ?? ''}${build.stderr ?? ''}`.split(/\r?\n/);
    const warnings = lines.filter((l) => /\bWARN\b/.test(l));
    const errors = lines.filter((l) => /\bERROR\b/.test(l));
    [...errors, ...warnings].forEach((l) => console.log(`  ${l}`));

    if (build.status !== 0) {
        if (!errors.length) console.log(lines.join('\n'));
        console.error('❌ Build Hugo gagal.');
        rmSync(outDir, { recursive: true, force: true });
        process.exit(1);
    }
    if (searchEnabled) {
        console.log('• Membuat indeks pencarian (Pagefind) ...');
        const pf = spawnSync('npx', ['pagefind', '--site', outDir], { cwd: root, encoding: 'utf8', shell: true });
        if (pf.status !== 0) {
            console.log(`${pf.stdout ?? ''}${pf.stderr ?? ''}`);
            extraProblems.push('pagefind gagal membuat indeks (sudah `npm install`?)');
        }
    }
    if (warnings.length) {
        console.log(`${opts.strict ? '❌' : '⚠️ '} ${warnings.length} peringatan Hugo (lihat di atas).`);
        if (opts.strict) failed = true;
    }
}

console.log('• Memeriksa hasil build ...');
const problems = [...extraProblems, ...checkSite(outDir, { baseURL: BASE_URL, menuIcons, expectSearch: searchEnabled })];
problems.forEach((p) => console.log(`  ✖ ${p}`));

if (!opts.dir) {
    if (opts.keep) console.log(`• Hasil build disimpan di: ${outDir}`);
    else rmSync(outDir, { recursive: true, force: true });
}

if (problems.length) failed = true;
console.log(failed
    ? `\n❌ Smoke test gagal${problems.length ? ` (${problems.length} masalah)` : ''}.`
    : '\n✅ Smoke test lolos.');
process.exit(failed ? 1 : 0);
