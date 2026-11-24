// Fungsi murni untuk `npm run init` (tanpa I/O, supaya mudah dites).

const STRING_RE = (key) => new RegExp(`^(\\s*${key}\\s*=\\s*)"((?:[^"\\\\]|\\\\.)*)"`, 'm');

export function getString(toml, key) {
    const raw = toml.match(STRING_RE(key))?.[2];
    if (raw === undefined) return undefined;
    try { return JSON.parse(`"${raw}"`); } catch { return raw; }
}

export function setString(toml, key, value) {
    const re = STRING_RE(key);
    if (!re.test(toml)) throw new Error(`Kunci "${key}" tidak ditemukan di hugo.toml`);
    return toml.replace(re, (_, prefix) => prefix + JSON.stringify(value));
}

export function readConfig(toml) {
    return {
        title: getString(toml, 'title') ?? '',
        baseURL: getString(toml, 'baseURL') ?? '',
        description: getString(toml, 'description') ?? '',
        author: getString(toml, 'author') ?? '',
    };
}

export function applyConfig(toml, { title, baseURL, description, author }) {
    let out = toml;
    out = setString(out, 'title', title);
    out = setString(out, 'baseURL', baseURL);
    out = setString(out, 'description', description);
    out = setString(out, 'author', author);
    return out;
}

export function normalizeBaseURL(input) {
    let value = String(input ?? '').trim();
    if (!value) throw new Error('baseURL tidak boleh kosong');
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;
    let url;
    try { url = new URL(value); } catch { throw new Error(`baseURL tidak valid: ${input}`); }
    if (!/^https?:$/.test(url.protocol)) throw new Error('baseURL harus diawali http:// atau https://');
    return value.endsWith('/') ? value : `${value}/`;
}

export function validateTitle(title) {
    const value = String(title ?? '').trim();
    if (!value) throw new Error('Judul situs tidak boleh kosong');
    return value;
}

export function slugify(text) {
    const slug = String(text)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'hugo-site';
}

export function shortName(title) {
    const t = title.trim();
    return t.length <= 12 ? t : t.split(/\s+/)[0].slice(0, 12);
}

export function applyManifest(jsonText, title) {
    const manifest = JSON.parse(jsonText);
    manifest.name = title;
    manifest.short_name = shortName(title);
    return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function applyPackageName(jsonText, slug) {
    const pkg = JSON.parse(jsonText);
    pkg.name = slug;
    return `${JSON.stringify(pkg, null, 2)}\n`;
}
