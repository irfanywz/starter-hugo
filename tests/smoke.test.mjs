// Menguji pemeriksa hasil build (scripts/lib/smoke-core.mjs) dengan situs palsu.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkSite, attr } from '../scripts/lib/smoke-core.mjs';

const page = ({ title = 'Beranda', body = '<h1>Halo</h1>', extraHead = '', current = true } = {}) => `<!DOCTYPE html>
<html lang="id"><head>
<script>document.documentElement.classList.toggle('dark', false)</script>
<meta charset="utf-8"><title>${title}</title>
<meta name="description" content="Deskripsi">
<link rel="canonical" href="http://localhost/">
<meta property="og:image" content="http://localhost/og-default.png">
<link rel="icon" href="/favicon.svg">
<style>@font-face{font-family:X;src:url("/fonts/sans.abc.woff2") format("woff2")}</style>
<link rel="stylesheet" href="/css/output.min.abc.css">
<script defer src="/js/main.min.abc.js"></script>${extraHead}
</head><body>
<div x-data="search"><dialog></dialog></div>
<nav><a href="/" ${current ? 'aria-current="page"' : ''}>Beranda</a><a href="/posts/">Artikel</a></nav>
<main id="main">${body}</main></body></html>`;

function makeSite(overrides = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-test-'));
    const w = (f, c) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), c); };
    w('index.html', page());
    w('404.html', page({ title: '404', body: '<h1>404</h1>', extraHead: '<meta name="robots" content="noindex, nofollow">', current: false }));
    w('posts/index.html', page({ title: 'Artikel', body: '<h1>Artikel</h1><article data-pagefind-body>x</article>', current: false }));
    w('fonts/sans.abc.woff2', 'font');
    w('pagefind/pagefind.js', 'export {}');
    w('pagefind/pagefind-entry.json', '{}');
    w('sitemap.xml', '<urlset></urlset>');
    w('robots.txt', 'User-agent: *\nSitemap: http://localhost/sitemap.xml\n');
    w('index.xml', '<rss version="2.0"></rss>');
    w('index.json', '[]');
    w('favicon.svg', '<svg/>');
    w('og-default.png', 'x');
    w('js/main.min.abc.js', 'console.log(1)');
    w('css/output.min.abc.css', `.icon-\\[ri--home-line\\]{mask:url(x)}${'/*x*/'.repeat(300)}`);
    for (const [f, c] of Object.entries(overrides)) {
        if (c === null) fs.rmSync(path.join(dir, f)); else w(f, c);
    }
    return dir;
}
const check = (overrides, opts = { menuIcons: ['ri--home-line'], expectSearch: true }) => {
    const dir = makeSite(overrides);
    try { return checkSite(dir, opts); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
};

test('situs palsu yang benar → tanpa masalah', () => assert.deepEqual(check({}), []));

test('attr mendukung atribut ber-kutip dan tanpa kutip (HTML minify)', () => {
    assert.equal(attr('<a href="/x" class=y>', 'href'), '/x');
    assert.equal(attr('<a href=/x class=y>', 'class'), 'y');
    assert.equal(attr('<a data-href="/x">', 'href'), undefined);
});

test('HTML minify (atribut tanpa kutip) tetap lolos', () => {
    const minified = page().replace(/="([^"\s]+)"/g, '=$1');
    assert.deepEqual(check({ 'index.html': minified }), []);
});

test('mendeteksi CSS tidak ada / ikon menu tidak ada di CSS', () => {
    assert.ok(check({ 'css/output.min.abc.css': null }).some((p) => /tautan rusak.*css/.test(p)));
    assert.ok(check({}, { menuIcons: ['ri--tidak-ada'], expectSearch: true }).some((p) => /ikon menu "ri--tidak-ada"/.test(p)));
});

test('mendeteksi tautan internal rusak', () => {
    const p = check({ 'index.html': page({ body: '<h1>Halo</h1><a href="/hilang/">x</a>' }) });
    assert.ok(p.some((m) => m.includes('/hilang/')));
});

test('mendeteksi sisa error template dan h1 ganda', () => {
    assert.ok(check({ 'posts/index.html': page({ body: '<h1>A</h1><p>&lt;no value&gt; <no value></p>', current: false }) }).some((m) => /error template/.test(m)));
    assert.ok(check({ 'posts/index.html': page({ body: '<h1>A</h1><h1>B</h1>', current: false }) }).some((m) => /tepat 1 <h1>/.test(m)));
});

test('mendeteksi berkas wajib hilang dan 404 tanpa noindex', () => {
    assert.ok(check({ 'sitemap.xml': null }).some((m) => /sitemap/.test(m)));
    assert.ok(check({ 'index.json': 'bukan json' }).some((m) => /index\.json/.test(m)));
    assert.ok(check({ '404.html': page({ title: '404', body: '<h1>404</h1>', current: false }) }).some((m) => /noindex/.test(m)));
});

test('mendeteksi anti-flash dark mode, JS, dan og:image hilang', () => {
    const noInit = page().replace(/<script>[^<]*<\/script>/, '');
    assert.ok(check({ 'index.html': noInit }).some((m) => /anti-flash/.test(m)));
    assert.ok(check({ 'js/main.min.abc.js': null }).some((m) => /tautan rusak.*js/.test(m)));
    assert.ok(check({ 'og-default.png': null }).some((m) => /og:image/.test(m)));
});

test('folder kosong / tanpa index.html → satu masalah jelas', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-empty-'));
    try { assert.equal(checkSite(dir).length, 1); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('mendeteksi font self-host bermasalah (file hilang, @font-face hilang, Google Fonts)', () => {
    assert.ok(check({ 'fonts/sans.abc.woff2': null }).some((m) => /url\(\) rusak.*sans/.test(m)));
    assert.ok(check({ 'index.html': page().replace(/<style>[\s\S]*?<\/style>/, '') }).some((m) => /@font-face tidak ada/.test(m)));
    assert.ok(check({ 'index.html': page({ extraHead: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=X">' }) }).some((m) => /Google Fonts/.test(m)));
});

test('mendeteksi pencarian Pagefind bermasalah', () => {
    assert.ok(check({ 'pagefind/pagefind.js': null }).some((m) => /indeks Pagefind/.test(m)));
    assert.ok(check({ 'posts/index.html': page({ title: 'A', body: '<h1>A</h1><article>x</article>', current: false }) }).some((m) => /data-pagefind-body/.test(m)));
    assert.ok(check({ 'index.html': page().replace('<dialog></dialog>', '') }).some((m) => /dialog pencarian/.test(m)));
    // pencarian dinonaktifkan: tidak dicek
    assert.deepEqual(check({ 'pagefind/pagefind.js': null, 'pagefind/pagefind-entry.json': null }, { menuIcons: [], expectSearch: false }), []);
});
