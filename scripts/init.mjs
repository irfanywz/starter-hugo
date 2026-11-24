// Setup awal:  npm run init
// Menanyakan judul, deskripsi, author, dan baseURL, lalu memperbarui hugo.toml,
// static/site.webmanifest, dan nama paket di package.json.
//
// Non-interaktif:
//   npm run init -- --title="Blog Saya" --baseURL=https://saya.github.io/ --author="Nama" --description="..." --yes
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import readline from 'node:readline/promises';
import path from 'node:path';
import {
    readConfig, applyConfig, normalizeBaseURL, validateTitle,
    slugify, applyManifest, applyPackageName,
} from './lib/init-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = (...p) => path.join(root, ...p);

const { values: args } = parseArgs({
    options: {
        title: { type: 'string' },
        description: { type: 'string' },
        author: { type: 'string' },
        baseURL: { type: 'string' },
        yes: { type: 'boolean', short: 'y', default: false },
    },
    allowPositionals: false,
});

const toml = readFileSync(file('hugo.toml'), 'utf8');
const current = readConfig(toml);

const provided = ['title', 'description', 'author', 'baseURL'].every((k) => args[k] !== undefined);
const interactive = !args.yes && !provided && process.stdin.isTTY;

const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

async function ask(label, key, normalize) {
    if (args[key] !== undefined) return normalize(args[key]); // dari argumen: salah = error
    const fallback = current[key];
    if (!interactive) return normalize(fallback);
    for (;;) {
        const shown = fallback ? ` [${fallback}]` : '';
        const answer = (await rl.question(`${label}${shown}: `)).trim();
        try {
            return normalize(answer || fallback);
        } catch (err) {
            console.log(`  ✖ ${err.message}`);
        }
    }
}

try {
    if (interactive) console.log('Setup starter. Tekan Enter untuk memakai nilai di dalam [ ].\n');

    const title = await ask('Judul situs', 'title', validateTitle);
    const description = await ask('Deskripsi singkat', 'description', (v) => String(v ?? '').trim());
    const author = await ask('Nama penulis (boleh kosong)', 'author', (v) => String(v ?? '').trim());
    const baseURL = await ask('baseURL (mis. https://namamu.github.io/)', 'baseURL', normalizeBaseURL);

    writeFileSync(file('hugo.toml'), applyConfig(toml, { title, baseURL, description, author }));
    writeFileSync(file('static', 'site.webmanifest'), applyManifest(readFileSync(file('static', 'site.webmanifest'), 'utf8'), title));
    const slug = slugify(title);
    writeFileSync(file('package.json'), applyPackageName(readFileSync(file('package.json'), 'utf8'), slug));

    console.log(`
✅ Selesai.
   hugo.toml            title, baseURL, description, author
   static/site.webmanifest  name, short_name
   package.json         name = "${slug}"

Langkah berikut:
   • npm start                       jalankan situs di http://localhost:1313
   • ganti ikon & gambar share di static/ (lihat README)
   • edit judul beranda di content/_index.md
   • (CI GitHub Pages memakai baseURL dari Pages, jadi baseURL ini terutama untuk lokal/canonical)`);
} catch (err) {
    console.error(`❌ ${err.message}`);
    process.exitCode = 1;
} finally {
    rl?.close();
}
