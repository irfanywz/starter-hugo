// Memilih berkas woff2 subset "latin" (variable font) dari isi folder files/ paket Fontsource.
export function pickFontFile(names) {
    return names.find((n) => /-latin-wght-normal\.woff2$/.test(n));
}

export const FONTS = [
    { pkg: '@fontsource-variable/plus-jakarta-sans', out: 'plus-jakarta-sans-latin.woff2' },
    { pkg: '@fontsource-variable/fira-code', out: 'fira-code-latin.woff2' },
];
