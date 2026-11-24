import test from 'node:test';
import assert from 'node:assert/strict';
import { themeStore, STORAGE_KEY } from '../themes/starter/assets/js/stores/theme.js';

function fakeRoot(dark = false) {
    const set = new Set(dark ? ['dark'] : []);
    return {
        classList: {
            contains: (c) => set.has(c),
            toggle: (c, force) => { (force ? set.add(c) : set.delete(c)); return force; },
        },
        has: (c) => set.has(c),
    };
}
const fakeStorage = () => {
    const data = {};
    return { data, setItem: (k, v) => { data[k] = v; } };
};

test('state awal mengikuti class .dark di <html>', () => {
    assert.equal(themeStore({ root: fakeRoot(true), storage: fakeStorage() }).isDark, true);
    assert.equal(themeStore({ root: fakeRoot(false), storage: fakeStorage() }).isDark, false);
});

test('toggle: ganti class .dark, state, dan simpan ke storage', () => {
    const root = fakeRoot(false);
    const storage = fakeStorage();
    const store = themeStore({ root, storage });

    store.toggle();
    assert.equal(store.isDark, true);
    assert.equal(root.has('dark'), true);
    assert.equal(storage.data[STORAGE_KEY], 'dark');

    store.toggle();
    assert.equal(store.isDark, false);
    assert.equal(root.has('dark'), false);
    assert.equal(storage.data[STORAGE_KEY], 'light');
});

test('storage yang error tidak membuat toggle gagal', () => {
    const root = fakeRoot(false);
    const store = themeStore({ root, storage: { setItem() { throw new Error('denied'); } } });
    store.toggle();
    assert.equal(store.isDark, true);
    assert.equal(root.has('dark'), true);
});

test('tanpa storage (null) tetap jalan', () => {
    const store = themeStore({ root: fakeRoot(false), storage: null });
    store.toggle();
    assert.equal(store.isDark, true);
});
