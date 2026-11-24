import test from 'node:test';
import assert from 'node:assert/strict';
import { searchComponent } from '../themes/starter/assets/js/search.js';

function fakePagefind(pages, { debounced = true } = {}) {
    const calls = [];
    const pf = {
        calls,
        options: async (o) => { pf.opts = o; },
        search: async (q) => {
            calls.push(q);
            return { results: pages.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())).map((p) => ({ data: async () => ({ url: p.url, excerpt: `<mark>${q}</mark> di ${p.title}`, meta: { title: p.title } }) })) };
        },
    };
    if (debounced) pf.debouncedSearch = (q) => pf.search(q);
    return pf;
}

function make(options = {}) {
    const c = searchComponent(options);
    const dialog = { opened: false, showModal() { this.opened = true; }, close() { this.opened = false; } };
    c.$refs = { dialog, input: { focus() {} } };
    c.$el = { dataset: {} };
    return c;
}

const PAGES = [{ title: 'Halo Dunia', url: '/posts/halo-dunia/' }, { title: 'Tulisan Kedua', url: '/posts/tulisan-kedua/' }];

test('pencarian mengembalikan hasil (judul, url, excerpt)', async () => {
    const pf = fakePagefind(PAGES);
    const c = make({ load: async () => pf, baseUrl: '/' });
    c.query = 'halo';
    await c.run();
    assert.equal(c.results.length, 1);
    assert.deepEqual(Object.keys(c.results[0]).sort(), ['excerpt', 'title', 'url']);
    assert.equal(c.results[0].url, '/posts/halo-dunia/');
    assert.equal(c.searched, true);
    assert.equal(c.loading, false);
    assert.equal(c.error, '');
});

test('load dipanggil dengan URL bundle dan baseUrl (mendukung subpath)', async () => {
    let args;
    const c = make({ baseUrl: '/repo/', load: async (...a) => { args = a; return fakePagefind(PAGES); } });
    c.query = 'halo';
    await c.run();
    assert.deepEqual(args, ['/repo/pagefind/pagefind.js', '/repo/']);
});

test('query kosong mereset hasil tanpa memuat Pagefind', async () => {
    let loaded = false;
    const c = make({ load: async () => { loaded = true; return fakePagefind(PAGES); } });
    c.results = [{ url: 'x' }];
    c.searched = true;
    c.query = '   ';
    await c.run();
    assert.deepEqual(c.results, []);
    assert.equal(c.searched, false);
    assert.equal(loaded, false);
});

test('Pagefind gagal dimuat → pesan error, tidak melempar, bisa dicoba lagi', async () => {
    let attempt = 0;
    const c = make({ unavailable: 'Tidak tersedia', load: async () => { attempt++; if (attempt === 1) throw new Error('404'); return fakePagefind(PAGES); } });
    c.query = 'halo';
    await c.run();
    assert.equal(c.error, 'Tidak tersedia');
    assert.equal(c.loading, false);
    await c.run();
    assert.equal(c.error, '');
    assert.equal(c.results.length, 1);
});

test('hasil usang diabaikan (debouncedSearch mengembalikan null)', async () => {
    const pf = fakePagefind(PAGES);
    pf.debouncedSearch = async () => null;
    const c = make({ load: async () => pf });
    c.query = 'halo';
    await c.run();
    assert.deepEqual(c.results, []);
});

test('hasil dibuang jika input berubah selama pencarian', async () => {
    const pf = fakePagefind(PAGES);
    const c = make({ load: async () => pf });
    const original = pf.search;
    pf.search = async (q) => { c.query = 'lain'; return original(q); };
    pf.debouncedSearch = (q) => pf.search(q);
    c.query = 'halo';
    await c.run();
    assert.deepEqual(c.results, []);
});

test('fallback ke search() jika debouncedSearch tidak ada', async () => {
    const pf = fakePagefind(PAGES, { debounced: false });
    const c = make({ load: async () => pf });
    c.query = 'kedua';
    await c.run();
    assert.equal(c.results[0].title, 'Tulisan Kedua');
});

test('goFirst menuju hasil pertama; tanpa hasil tidak melakukan apa-apa', async () => {
    const visited = [];
    const c = make({ load: async () => fakePagefind(PAGES), navigate: (u) => visited.push(u) });
    c.goFirst();
    assert.deepEqual(visited, []);
    c.query = 'halo';
    await c.run();
    c.goFirst();
    assert.deepEqual(visited, ['/posts/halo-dunia/']);
});

test('dialog: show/hide, klik backdrop, Ctrl/Cmd+K', () => {
    const c = make({ load: async () => fakePagefind(PAGES) });
    c.show();
    assert.equal(c.$refs.dialog.opened, true);
    c.onBackdrop({ target: {} });
    assert.equal(c.$refs.dialog.opened, true, 'klik di dalam dialog tidak menutup');
    c.onBackdrop({ target: c.$refs.dialog });
    assert.equal(c.$refs.dialog.opened, false);

    let prevented = false;
    c.onKey({ ctrlKey: true, metaKey: false, key: 'K', preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(c.$refs.dialog.opened, true);
    prevented = false;
    c.onKey({ ctrlKey: false, metaKey: false, key: 'k', preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
});

test('init membaca data-* dari elemen, opsi tetap diutamakan', () => {
    const c = make();
    c.$el.dataset = { baseUrl: '/blog/', unavailable: 'Mati' };
    c.init();
    assert.equal(c.baseUrl, '/blog/');
    assert.equal(c.unavailable, 'Mati');
    const d = make({ baseUrl: '/x/' });
    d.$el.dataset = { baseUrl: '/blog/' };
    d.init();
    assert.equal(d.baseUrl, '/x/');
});
