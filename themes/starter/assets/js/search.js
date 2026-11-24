// Komponen pencarian (Alpine) di atas Pagefind JS API.
// Indeks dibuat setelah build Hugo: `pagefind --site public` (otomatis di CI dan `npm run preview`).
async function defaultLoad(bundleUrl, baseUrl) {
    // URL dinamis: sengaja tidak di-bundle (file dibuat Pagefind saat build, bukan saat Hugo).
    const pagefind = await import(/* webpackIgnore: true */ bundleUrl);
    await pagefind.options?.({ baseUrl });
    return pagefind;
}

export function searchComponent(options = {}) {
    const load = options.load ?? defaultLoad;
    const navigate = options.navigate ?? ((url) => globalThis.location.assign(url));
    let pagefind = null; // di luar state reaktif Alpine

    return {
        query: '',
        results: [],
        loading: false,
        searched: false,
        error: '',
        baseUrl: options.baseUrl ?? '/',
        unavailable: options.unavailable ?? 'Pencarian tidak tersedia.',

        init() {
            const data = this.$el?.dataset ?? {};
            this.baseUrl = options.baseUrl ?? data.baseUrl ?? '/';
            this.unavailable = options.unavailable ?? data.unavailable ?? this.unavailable;
        },

        show() {
            this.$refs.dialog.showModal();
            this.$refs.input?.focus();
            this.ensure(); // pemanasan: muat Pagefind saat dialog dibuka
        },

        hide() {
            this.$refs.dialog.close();
        },

        onBackdrop(event) {
            if (event.target === this.$refs.dialog) this.hide();
        },

        onKey(event) {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                this.show();
            }
        },

        async ensure() {
            if (pagefind) return pagefind;
            try {
                pagefind = await load(`${this.baseUrl}pagefind/pagefind.js`, this.baseUrl);
                this.error = '';
            } catch {
                pagefind = null;
                this.error = this.unavailable;
            }
            return pagefind;
        },

        async run() {
            const q = this.query.trim();
            if (!q) {
                this.results = [];
                this.searched = false;
                this.loading = false;
                return;
            }
            this.loading = true;
            const pf = await this.ensure();
            if (!pf) {
                this.loading = false;
                return;
            }
            try {
                const search = await (pf.debouncedSearch ? pf.debouncedSearch(q, {}, 150) : pf.search(q));
                if (search === null) return; // ada pencarian yang lebih baru
                const items = await Promise.all(search.results.slice(0, 8).map((r) => r.data()));
                if (q !== this.query.trim()) return; // input sudah berubah
                this.results = items.map((item) => ({
                    url: item.url,
                    title: item.meta?.title || item.url,
                    excerpt: item.excerpt,
                }));
                this.searched = true;
                this.error = '';
            } catch {
                this.error = this.unavailable;
            }
            this.loading = false;
        },

        goFirst() {
            if (this.results[0]) navigate(this.results[0].url);
        },
    };
}
