import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
    readConfig, applyConfig, normalizeBaseURL, validateTitle, slugify, shortName, applyManifest, applyPackageName,
} from '../scripts/lib/init-core.mjs';

const toml = fs.readFileSync('hugo.toml', 'utf8');

test('readConfig membaca nilai dari hugo.toml starter', () => {
    const c = readConfig(toml);
    assert.equal(c.title, 'Starter Hugo');
    assert.equal(c.baseURL, 'https://example.github.io/');
    assert.ok(c.description.length > 0);
    assert.equal(c.author, '');
});

test('applyConfig mengganti 4 nilai dan tidak merusak bagian lain', () => {
    const out = applyConfig(toml, { title: 'Blog "Keren"', baseURL: 'https://a.github.io/', description: 'Deskripsi \\ baru', author: 'Budi' });
    assert.deepEqual(readConfig(out), { title: 'Blog "Keren"', baseURL: 'https://a.github.io/', description: 'Deskripsi \\ baru', author: 'Budi' });
    // bagian lain tetap utuh
    assert.match(out, /theme = "starter"/);
    assert.match(out, /\[\[menus\.main\]\]/);
    assert.equal(out.split('\n').length, toml.split('\n').length);
    // idempotent
    assert.equal(applyConfig(out, readConfig(out)), out);
});

test('applyConfig melempar error jika kunci tidak ada', () => {
    assert.throws(() => applyConfig('title = "x"\n', { title: 'a', baseURL: 'https://a/', description: '', author: '' }), /baseURL/);
});

test('normalizeBaseURL', () => {
    assert.equal(normalizeBaseURL('https://a.github.io'), 'https://a.github.io/');
    assert.equal(normalizeBaseURL('a.github.io/repo'), 'https://a.github.io/repo/');
    assert.equal(normalizeBaseURL(' http://localhost:1313/ '), 'http://localhost:1313/');
    assert.throws(() => normalizeBaseURL(''), /kosong/);
    assert.throws(() => normalizeBaseURL('ftp://x.com'), /http/);
});

test('validateTitle, slugify, shortName', () => {
    assert.throws(() => validateTitle('   '));
    assert.equal(validateTitle('  Halo  '), 'Halo');
    assert.equal(slugify('Blog Saya yang Keren!'), 'blog-saya-yang-keren');
    assert.equal(slugify('Café Çok'), 'cafe-cok');
    assert.equal(slugify('!!!'), 'hugo-site');
    assert.equal(shortName('Blog'), 'Blog');
    assert.equal(shortName('Catatan Harian Seorang Programmer'), 'Catatan');
});

test('applyManifest dan applyPackageName hanya mengubah field yang dituju', () => {
    const m = JSON.parse(applyManifest(fs.readFileSync('static/site.webmanifest', 'utf8'), 'Blog Saya'));
    assert.equal(m.name, 'Blog Saya');
    assert.equal(m.short_name, 'Blog Saya');
    assert.equal(m.icons.length, 2);
    const p = JSON.parse(applyPackageName(fs.readFileSync('package.json', 'utf8'), 'blog-saya'));
    assert.equal(p.name, 'blog-saya');
    assert.equal(p.scripts.start, 'node scripts/dev.mjs');
});

test('npm run init non-interaktif (--yes) menulis berkas di salinan proyek', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'init-test-'));
    try {
        for (const f of ['hugo.toml', 'package.json', 'static/site.webmanifest']) {
            fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true });
            fs.copyFileSync(f, path.join(tmp, f));
        }
        fs.cpSync('scripts', path.join(tmp, 'scripts'), { recursive: true });
        fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ ...JSON.parse(fs.readFileSync('package.json', 'utf8')) }, null, 2));

        const run = spawnSync(process.execPath, [
            path.join(tmp, 'scripts', 'init.mjs'), '--yes', '--title=Catatan Budi', '--baseURL=budi.github.io',
            '--author=Budi', '--description=Tulisan harian',
        ], { encoding: 'utf8', cwd: tmp });
        assert.equal(run.status, 0, run.stderr + run.stdout);

        const cfg = readConfig(fs.readFileSync(path.join(tmp, 'hugo.toml'), 'utf8'));
        assert.deepEqual(cfg, { title: 'Catatan Budi', baseURL: 'https://budi.github.io/', description: 'Tulisan harian', author: 'Budi' });
        assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, 'static/site.webmanifest'), 'utf8')).name, 'Catatan Budi');
        assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8')).name, 'catatan-budi');

        const bad = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'init.mjs'), '--yes', '--title=X', '--baseURL=ftp://x', '--author=', '--description='], { encoding: 'utf8', cwd: tmp });
        assert.notEqual(bad.status, 0);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});
