// Menguji skrip inline anti-flash di layouts/_partials/theme-init.html
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('themes/starter/layouts/_partials/theme-init.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function run({ saved = null, systemDark = false, storageThrows = false } = {}) {
    const classes = new Set();
    const ctx = vm.createContext({
        localStorage: { getItem: () => { if (storageThrows) throw new Error('denied'); return saved; } },
        window: { matchMedia: () => ({ matches: systemDark }) },
        document: { documentElement: { classList: { toggle: (c, f) => (f ? classes.add(c) : classes.delete(c)) } } },
    });
    vm.runInContext(script, ctx);
    return classes.has('dark');
}

test('skrip ditemukan di partial', () => assert.ok(script));
test('pilihan tersimpan "dark" → gelap, walau sistem terang', () => assert.equal(run({ saved: 'dark' }), true));
test('pilihan tersimpan "light" → terang, walau sistem gelap', () => assert.equal(run({ saved: 'light', systemDark: true }), false));
test('belum ada pilihan → ikuti sistem', () => {
    assert.equal(run({ systemDark: true }), true);
    assert.equal(run({ systemDark: false }), false);
});
test('storage error tidak melempar exception', () => assert.doesNotThrow(() => run({ storageThrows: true })));
