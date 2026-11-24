import test from 'node:test';
import assert from 'node:assert/strict';
import { pickFontFile, FONTS } from '../scripts/lib/fonts-core.mjs';

test('pickFontFile memilih subset latin variable woff2, bukan latin-ext / woff biasa', () => {
    const files = [
        'plus-jakarta-sans-cyrillic-wght-normal.woff2',
        'plus-jakarta-sans-latin-ext-wght-normal.woff2',
        'plus-jakarta-sans-latin-wght-normal.woff',
        'plus-jakarta-sans-latin-wght-normal.woff2',
        'plus-jakarta-sans-latin-wght-italic.woff2',
    ];
    assert.equal(pickFontFile(files), 'plus-jakarta-sans-latin-wght-normal.woff2');
    assert.equal(pickFontFile(['x-latin-ext-wght-normal.woff2']), undefined);
    assert.equal(pickFontFile([]), undefined);
});

test('daftar font: dua keluarga dengan nama keluaran unik', () => {
    assert.equal(FONTS.length, 2);
    assert.equal(new Set(FONTS.map((f) => f.out)).size, 2);
});
