// Pemeriksaan hasil build Hugo (folder public). Mengembalikan daftar masalah ([] = aman).
import fs from 'node:fs';
import path from 'node:path';

export function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true })
        .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];

// Mendukung atribut ber-kutip maupun tanpa kutip (HTML hasil minify).
export function attr(tag, name) {
    const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
    return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
}

function resolves(dir, url) {
    let clean;
    try { clean = decodeURIComponent(url.split('#')[0].split('?')[0]); } catch { return false; }
    const target = path.join(dir, clean);
    if (clean.endsWith('/')) return fs.existsSync(path.join(target, 'index.html'));
    if (!fs.existsSync(target)) return false;
    return fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html'));
}

const BAD_OUTPUT = /ZgotmplZ|<no value>|%!\(|\[error calling/;

export function checkSite(dir, { baseURL = 'http://localhost/', menuIcons = [], expectSearch = false } = {}) {
    const problems = [];
    const fail = (msg) => problems.push(msg);
    const exists = (...p) => fs.existsSync(path.join(dir, ...p));
    const read = (...p) => fs.readFileSync(path.join(dir, ...p), 'utf8');

    if (!exists('index.html')) return ['index.html tidak ada: build gagal atau folder salah'];

    // --- berkas situs ---
    if (!exists('404.html')) fail('404.html tidak ada');
    else if (!/noindex/i.test(read('404.html'))) fail('404.html tidak punya meta robots noindex');
    if (!exists('sitemap.xml') || !/<urlset/.test(read('sitemap.xml'))) fail('sitemap.xml tidak ada atau tidak valid');
    if (!exists('robots.txt') || !/^Sitemap:/mi.test(read('robots.txt'))) fail('robots.txt tidak ada atau tanpa baris Sitemap');
    if (!exists('index.xml') || !/<rss/.test(read('index.xml'))) fail('index.xml (RSS) tidak ada atau tidak valid');
    if (!exists('index.json')) fail('index.json tidak ada');
    else {
        try { if (!Array.isArray(JSON.parse(read('index.json')))) fail('index.json bukan array'); }
        catch { fail('index.json bukan JSON yang valid'); }
    }

    // --- semua halaman HTML ---
    const pages = walk(dir).filter((f) => f.endsWith('.html'));
    const rel = (f) => path.relative(dir, f).split(path.sep).join('/');
    for (const file of pages) {
        const name = rel(file);
        const html = fs.readFileSync(file, 'utf8');
        if (BAD_OUTPUT.test(html)) fail(`${name}: ada sisa error template (ZgotmplZ / <no value> / %!)`);
        if (/http-equiv=["']?refresh/i.test(html)) continue; // halaman alias/redirect

        const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
        if (!title) fail(`${name}: <title> kosong`);
        const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
        if (h1 !== 1) fail(`${name}: harus punya tepat 1 <h1> (ditemukan ${h1})`);
        if (!/<html[^>]*\slang=/i.test(html)) fail(`${name}: <html> tanpa atribut lang`);
        const metas = tags(html, 'meta');
        if (!metas.some((m) => attr(m, 'name') === 'description' && attr(m, 'content')?.trim())) fail(`${name}: meta description kosong/tidak ada`);
        if (!tags(html, 'link').some((l) => attr(l, 'rel') === 'canonical' && attr(l, 'href'))) fail(`${name}: link canonical tidak ada`);
        if (!/<main[^>]*\sid=["']?main/i.test(html)) fail(`${name}: <main id="main"> tidak ada`);

        // semua tautan/sumber internal harus menunjuk ke berkas yang ada
        const seen = new Set();
        for (const m of html.matchAll(/url\(\s*["']?(\/[^)"'\s]+)/g)) {
            if (m[1].startsWith('//') || seen.has(m[1])) continue;
            seen.add(m[1]);
            if (!resolves(dir, m[1])) fail(`${name}: url() rusak di CSS inline → ${m[1]}`);
        }
        for (const m of html.matchAll(/\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
            const url = m[1] ?? m[2] ?? m[3];
            if (!url.startsWith('/') || url.startsWith('//') || seen.has(url)) continue;
            seen.add(url);
            if (!resolves(dir, url)) fail(`${name}: tautan rusak → ${url}`);
        }
    }

    // --- beranda: CSS, JS, dark mode, menu, og:image ---
    const home = read('index.html');
    const cssHref = tags(home, 'link').filter((l) => attr(l, 'rel') === 'stylesheet').map((l) => attr(l, 'href')).find((h) => h?.startsWith('/') && h.endsWith('.css'));
    if (!cssHref) fail('index.html: stylesheet CSS situs tidak ditemukan (sudah `npm run build`?)');
    else if (resolves(dir, cssHref)) {
        const css = fs.readFileSync(path.join(dir, cssHref), 'utf8');
        if (css.length < 1000) fail(`CSS terlalu kecil (${css.length} byte): Tailwind mungkin tidak menemukan class`);
        for (const icon of menuIcons) {
            if (!css.includes(`icon-\\[${icon}\\]`)) fail(`CSS tidak memuat ikon menu "${icon}" (cek @source ke hugo.toml & set ikon terpasang)`);
        }
    }
    const jsSrc = tags(home, 'script').map((s) => attr(s, 'src')).find((s) => s?.startsWith('/') && s.endsWith('.js'));
    if (!jsSrc) fail('index.html: bundle JS (Alpine) tidak ditemukan');
    if (!/classList\.toggle\(\s*['"]dark['"]/.test(home)) fail('index.html: skrip anti-flash dark mode tidak ada');
    if (!tags(home, 'a').some((a) => attr(a, 'aria-current') === 'page')) fail('index.html: tidak ada menu aktif (aria-current)');
    const ogImage = metas0(home, 'property', 'og:image');
    if (!ogImage) fail('index.html: og:image tidak ada');
    else if (ogImage.startsWith(baseURL) && !resolves(dir, `/${ogImage.slice(baseURL.length)}`)) fail(`og:image menunjuk ke berkas yang tidak ada: ${ogImage}`);

    // --- font self-host: @font-face ada dan tidak memakai Google Fonts ---
    if (!/@font-face/.test(home)) fail('index.html: @font-face tidak ada (font self-host belum disalin? jalankan `node scripts/fonts.mjs`)');
    if (/fonts\.(googleapis|gstatic)\.com/.test(home)) fail('index.html: masih memuat font dari Google Fonts');

    // --- pencarian (Pagefind) ---
    if (expectSearch) {
        if (!exists('pagefind', 'pagefind.js') || !exists('pagefind', 'pagefind-entry.json')) fail('indeks Pagefind tidak ada (pagefind/pagefind.js)');
        const hasArticle = pages.some((f) => /<article[\s>]/i.test(fs.readFileSync(f, 'utf8')));
        const hasBody = pages.some((f) => /data-pagefind-body/.test(fs.readFileSync(f, 'utf8')));
        if (hasArticle && !hasBody) fail('tidak ada halaman dengan data-pagefind-body: indeks pencarian akan kosong');
        if (!/<dialog[\s>]/.test(home) || !/x-data=["']?search/.test(home)) fail('index.html: dialog pencarian tidak ada (params.search = true?)');
    }

    return problems;
}

function metas0(html, key, value) {
    const tag = tags(html, 'meta').find((m) => attr(m, key) === value);
    return tag ? attr(tag, 'content') : undefined;
}
