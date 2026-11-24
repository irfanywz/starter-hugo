// Tes konsistensi antar-file (menangkap kesalahan umum tanpa perlu Hugo).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (p) => fs.readFileSync(p, 'utf8');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

test('semua kunci i18n yang dipakai layout ada di id.yaml', () => {
    const yaml = read('themes/starter/i18n/id.yaml');
    const defined = new Set([...yaml.matchAll(/^([a-z_]+):/gm)].map((m) => m[1]));
    const used = new Set();
    for (const f of walk('themes/starter/layouts').filter((f) => f.endsWith('.html'))) {
        for (const m of read(f).matchAll(/i18n\s+"([^"]+)"/g)) used.add(m[1]);
    }
    assert.ok(used.size > 0, 'tidak ada pemakaian i18n yang terdeteksi');
    const missing = [...used].filter((k) => !defined.has(k));
    assert.deepEqual(missing, [], `kunci i18n belum ada: ${missing.join(', ')}`);
});

test('set ikon yang dipakai di hugo.toml dan layout terpasang di package.json', () => {
    const pkg = JSON.parse(read('package.json'));
    const installed = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }));
    const sources = [read('hugo.toml'), ...walk('themes/starter/layouts').map(read)];
    const sets = new Set();
    for (const src of sources) for (const m of src.matchAll(/icon-\[([a-z0-9]+)--/g)) sets.add(m[1]);
    assert.ok(sets.size > 0);
    const missing = [...sets].filter((s) => !installed.has(`@iconify-json/${s}`));
    assert.deepEqual(missing, [], `set ikon belum terpasang: ${missing.join(', ')}`);
});

test('input.css memindai hugo.toml (class ikon menu) dan memakai @custom-variant dark', () => {
    const css = read('themes/starter/assets/css/input.css');
    assert.match(css, /@source\s+"\.\.\/\.\.\/\.\.\/\.\.\/hugo\.toml"/);
    assert.match(css, /@custom-variant\s+dark/);
    assert.doesNotMatch(css, /@import\s+url\(/, 'font jangan di-@import dari CSS (lambat); pakai <link> di head');
});

test('tidak ada data pribadi yang di-hardcode di layout', () => {
    const all = walk('themes/starter/layouts').map(read).join('\n');
    assert.doesNotMatch(all, /ca-pub-\d+/);
    assert.doesNotMatch(all, /google-site-verification/);
});

test('output.css tidak di-commit (ada di .gitignore)', () => {
    assert.match(read('.gitignore'), /themes\/starter\/assets\/css\/output\.css/);
});

test('layout tidak memakai {{ else if }} di dalam blok {{ with }} (tidak valid di template Go)', () => {
    for (const f of walk('themes/starter/layouts').filter((f) => f.endsWith('.html'))) {
        const src = read(f);
        // cari "with ... else if ..." tanpa "end" atau "if" pembuka di antaranya
        const stack = [];
        for (const m of src.matchAll(/\{\{-?\s*(if|with|range|define|block|else if|else with|else|end)\b/g)) {
            const t = m[1];
            if (['if', 'with', 'range', 'define', 'block'].includes(t)) stack.push(t);
            else if (t === 'end') stack.pop();
            else if (t === 'else if') assert.notEqual(stack.at(-1), 'with', `${f}: "else if" di dalam "with"`);
        }
    }
});

test('file statis yang direferensikan head.html, manifest, dan params.image benar-benar ada', () => {
    const head = read('themes/starter/layouts/_partials/head.html');
    const files = [...head.matchAll(/"([^"]+)"\s*\|\s*relURL/g)].map((m) => m[1]);
    assert.ok(files.length >= 3, 'link ikon tidak terdeteksi di head.html');
    for (const f of files) assert.ok(fs.existsSync(path.join('static', f)), `static/${f} tidak ada`);

    const manifest = JSON.parse(read('static/site.webmanifest'));
    for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join('static', icon.src)), `ikon manifest static/${icon.src} tidak ada`);

    const image = read('hugo.toml').match(/^\s*image\s*=\s*"([^"]+)"/m)?.[1];
    if (image && !/^https?:/.test(image)) assert.ok(fs.existsSync(path.join('static', image)), `params.image static/${image} tidak ada`);
});

test('render hook, shortcode, dan partial baru tersedia', () => {
    for (const f of [
        '_markup/render-link.html', '_markup/render-image.html', '_markup/render-heading.html',
        '_shortcodes/callout.html', '_partials/analytics.html', '_partials/post-nav.html',
    ]) assert.ok(fs.existsSync(path.join('themes/starter/layouts', f)), f);
});

test('shortcode di konten contoh hanya memakai shortcode yang tersedia', () => {
    const builtin = new Set(['youtube', 'vimeo', 'figure', 'gist', 'highlight', 'instagram', 'param', 'qr', 'ref', 'relref', 'x']);
    const have = new Set(fs.readdirSync('themes/starter/layouts/_shortcodes').map((f) => f.replace(/\.html$/, '')));
    for (const f of walk('content').filter((f) => f.endsWith('.md'))) {
        for (const m of read(f).matchAll(/\{\{[<%]\s*\/?\s*([a-z0-9_-]+)/gi)) {
            assert.ok(have.has(m[1]) || builtin.has(m[1]), `${f}: shortcode "${m[1]}" tidak ditemukan`);
        }
    }
});

test('font: self-host (tanpa Google Fonts) dan terhubung ke paket + skrip', () => {
    const all = walk('themes/starter/layouts').map(read).join('\n');
    assert.doesNotMatch(all, /fonts\.(googleapis|gstatic)\.com/);
    const pkg = JSON.parse(read('package.json'));
    const fonts = read('scripts/lib/fonts-core.mjs');
    for (const m of fonts.matchAll(/pkg:\s*'([^']+)'/g)) {
        assert.ok(pkg.devDependencies[m[1]] || pkg.dependencies[m[1]], `${m[1]} belum ada di package.json`);
    }
    const partial = read('themes/starter/layouts/_partials/fonts.html');
    for (const m of fonts.matchAll(/out:\s*'([^']+)'/g)) assert.ok(partial.includes(m[1]), `fonts.html tidak memakai ${m[1]}`);
    assert.match(read('.gitignore'), /assets\/fonts\/\*\.woff2/);
    assert.match(pkg.scripts.postinstall, /fonts\.mjs/);
});

test('pencarian: dependensi, atribut indeks, dan script npm', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.ok(pkg.devDependencies.pagefind);
    assert.ok(pkg.scripts.preview && pkg.scripts.index);
    assert.match(read('themes/starter/layouts/page.html'), /data-pagefind-body/);
    assert.match(read('.github/workflows/hugo.yaml'), /pagefind --site public/);
    assert.match(read('hugo.toml'), /^\s*search\s*=\s*true/m);
});

test('komentar giscus: kunci hugo.toml cocok dengan partial (huruf kecil)', () => {
    const toml = read('hugo.toml');
    assert.match(toml, /\[params\.comments\.giscus\]/);
    const partial = read('themes/starter/layouts/_partials/comments.html');
    for (const key of ['repo', 'repoId', 'category', 'categoryId', 'mapping', 'lang']) {
        assert.match(toml, new RegExp(`^\\s*${key}\\s*=`, 'm'), `hugo.toml: ${key}`);
        assert.ok(partial.includes(`$g.${key.toLowerCase()}`), `comments.html tidak memakai $g.${key.toLowerCase()}`);
    }
});

test('shortcode dasar tersedia dan konten contoh memakainya', () => {
    for (const s of ['callout', 'details', 'button', 'video']) {
        assert.ok(fs.existsSync(`themes/starter/layouts/_shortcodes/${s}.html`), s);
    }
    const posts = walk('content').filter((f) => f.endsWith('.md')).map(read).join('\n');
    for (const s of ['callout', 'details', 'button']) assert.match(posts, new RegExp(`\\{\\{[<%]\\s*${s}\\b`), `contoh ${s} tidak ada`);
});

test('LICENSE ada dan package.json konsisten', () => {
    assert.match(read('LICENSE'), /MIT License/);
    assert.equal(JSON.parse(read('package.json')).license, 'MIT');
});
