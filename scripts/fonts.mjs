// Menyalin font (self-host) dari node_modules ke themes/starter/assets/fonts/.
// Dipanggil otomatis oleh `npm install` (postinstall), `npm run build`, dan `npm start`.
//   node scripts/fonts.mjs          gagal (exit 1) jika font tidak bisa disalin
//   node scripts/fonts.mjs --soft   hanya memberi peringatan (dipakai postinstall)
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FONTS, pickFontFile } from './lib/fonts-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'themes', 'starter', 'assets', 'fonts');
const soft = process.argv.includes('--soft');

const problems = [];
mkdirSync(outDir, { recursive: true });

for (const { pkg, out } of FONTS) {
    const filesDir = path.join(root, 'node_modules', ...pkg.split('/'), 'files');
    if (!existsSync(filesDir)) {
        problems.push(`${pkg} belum terpasang (jalankan npm install)`);
        continue;
    }
    const names = readdirSync(filesDir);
    const picked = pickFontFile(names);
    if (!picked) {
        problems.push(`${pkg}: berkas "*-latin-wght-normal.woff2" tidak ditemukan. Isi folder: ${names.filter((n) => n.includes('latin')).slice(0, 6).join(', ')} ...`);
        continue;
    }
    copyFileSync(path.join(filesDir, picked), path.join(outDir, out));
}

if (problems.length) {
    problems.forEach((p) => console.warn(`${soft ? '⚠️ ' : '❌'} fonts: ${p}`));
    if (!soft) process.exit(1);
} else {
    console.log(`fonts: ${FONTS.length} font disalin ke themes/starter/assets/fonts/`);
}
