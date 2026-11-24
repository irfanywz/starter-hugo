# Hugo Starter

Starter siap pakai untuk situs **Hugo + Tailwind CSS v4 + Alpine.js**, berbahasa Indonesia. Cocok untuk blog, catatan, atau situs dokumentasi sederhana.

**Fitur**

- Dark mode (tanpa flash), menu responsif (header & footer), pagination, taksonomi `topics`
- Pencarian offline dengan [Pagefind](https://pagefind.app) (Ctrl/⌘ + K)
- Font self-host (Plus Jakarta Sans & Fira Code), tanpa Google Fonts
- Daftar isi, navigasi tulisan sebelumnya/berikutnya, render hook Markdown (link eksternal, gambar lazy, anchor heading)
- Shortcode: `callout`, `details`, `button`, `video` (+ `youtube` dan `figure` bawaan Hugo)
- SEO dasar: meta, canonical, Open Graph, Twitter Card, sitemap, RSS, robots.txt, 404 `noindex`
- Opsional: komentar (giscus) dan analytics (Plausible / Umami / GA4)
- Tooling: `npm run init`, tes JS, smoke test hasil build, deploy GitHub Pages lewat Actions

## Kebutuhan

- [Hugo](https://gohugo.io/installation/) versi extended (CI memakai 0.164.0)
- Node.js 20+

## Mulai

```bash
npm install     # sekali saja, lalu commit package-lock.json
npm run init    # isi judul, deskripsi, author, baseURL
npm start       # Tailwind (watch) + hugo server
```

Buka http://localhost:1313. Argumen tambahan diteruskan ke Hugo: `npm start -- --port 1314`.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm start` | Mode kerja harian: Tailwind watch + `hugo server`. Pencarian belum aktif di mode ini (lihat bagian Pencarian). |
| `npm run preview` | Pratinjau seperti produksi: build, buat indeks pencarian, sajikan di http://localhost:1414 |
| `npm run init` | Setup awal interaktif. Non-interaktif: `npm run init -- --title="Blog" --baseURL=https://x.github.io/ --author="Nama" --description="..." --yes` |
| `npm run build` | Salin font + build CSS Tailwind (minify) ke `themes/starter/assets/css/output.css` |
| `npm test` | Tes JS (hanya butuh Node) |
| `npm run smoke` | Build ke folder sementara lalu periksa hasilnya (berkas wajib, SEO, CSS/JS/font, ikon menu, tautan rusak, indeks pencarian). Opsi: `--skip-css`, `--strict` (WARN Hugo = gagal), `--keep` |
| `npm run check` | Sebelum publish: tes JS + build CSS + smoke test |
| `npm run fonts` | Salin ulang font dari `node_modules` (otomatis saat install/build/start) |

`output.css` dan berkas font di `assets/fonts/` **tidak** di-commit. Keduanya dibuat oleh perintah di atas dan oleh GitHub Actions.

## Struktur

```
hugo.toml                 konfigurasi situs, menu, params
content/                  isi situs (contoh: beranda, tentang, artikel)
archetypes/default.md     template `hugo new`
layouts/                  override layout di level proyek (opsional)
static/                   favicon, ikon, og-default.png, site.webmanifest
themes/starter/
  assets/css/input.css    sumber Tailwind (@theme, plugin, @source)
  assets/js/              main.js (Alpine), search.js, stores/theme.js
  i18n/id.yaml            teks antarmuka (Bahasa Indonesia)
  layouts/                baseof, home, page, section, taxonomy, term, 404
    _partials/            head, seo, header, footer, fonts, analytics, comments, ...
    _markup/              render hook (link, image, heading)
    _shortcodes/          callout, details, button, video
scripts/                  dev, init, preview, smoke, check, test, fonts (+ lib/)
tests/                    tes Node
.github/workflows/        deploy GitHub Pages
```

## Konten

```bash
hugo new posts/judul-tulisan.md
```

Front matter yang didukung:

| Kunci | Fungsi |
| --- | --- |
| `title`, `date`, `description` | Judul, tanggal, ringkasan (dipakai di SEO dan kartu tulisan) |
| `topics = ['hugo']` | Taksonomi topik (`/topics/hugo/`) |
| `image = "gambar.png"` | Gambar og:image halaman ini (path `static/`, URL, atau berkas di page bundle) |
| `toc = false` | Matikan daftar isi |
| `comments = false` | Matikan komentar di halaman ini |
| `noindex = true` | Tambahkan `<meta name="robots" content="noindex">` |
| `hideHeader`, `hideFooter` | Sembunyikan header/footer (mis. untuk landing page) |

Halaman tanpa `date` (seperti `about.md`) tidak mendapat navigasi sebelumnya/berikutnya dan komentar.

### Shortcode

```md
{{% callout type="warning" title="Perhatian" %}}
Tipe: info, tip, warning, danger. Isi boleh **markdown**.
{{% /callout %}}

{{% details summary="Klik untuk membuka" open=true %}}
Isi yang bisa dilipat.
{{% /details %}}

{{< button url="/posts/" text="Lihat tulisan" style="outline" >}}   <!-- style: primary | outline -->

{{< video src="/video/demo.mp4" poster="/video/demo.jpg" title="Demo" >}}
```

Shortcode paired (`callout`, `details`) dipanggil dengan `{{% %}}` supaya isinya diproses sebagai Markdown. Shortcode bawaan Hugo juga tersedia: `{{< youtube ID >}}` (sudah mode privacy-enhanced) dan `{{< figure >}}`.

Link eksternal di Markdown otomatis `target="_blank" rel="noopener noreferrer"`. Link internal tidak di-resolve otomatis; tulis path-nya (`/about/`) atau pakai `ref`/`relref`.

## Kustomisasi

- **Judul, deskripsi, author, baseURL**: `npm run init`, atau edit `hugo.toml`.
- **Menu**: `[[menus.main]]` dan `[[menus.footer]]` di `hugo.toml`. `pre` berisi class ikon Iconify, mis. `icon-[ri--home-line]` (set terpasang: `ri`, `lucide`; set lain: `npm i -D @iconify-json/<nama>`).
- **Warna**: token `--color-primary` di blok `@theme` pada `input.css`.
- **Font**: ganti paket di `scripts/lib/fonts-core.mjs` (daftar Fontsource), `@font-face` di `layouts/_partials/fonts.html`, dan `--font-sans` / `--font-mono` di `input.css`.
- **Teks antarmuka**: `themes/starter/i18n/id.yaml`.
- **Ikon & gambar share**: ganti semua berkas di `static/` (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `og-default.png` 1200×630) dan sesuaikan `name` di `site.webmanifest`. Ikon bawaan hanyalah placeholder.
- **Override layout** tanpa mengubah theme: taruh berkas dengan nama dan path yang sama di `layouts/` proyek.

## Pencarian (Pagefind)

Pagefind membuat indeks **dari hasil build**, jadi:

- **Produksi / CI**: indeks dibuat otomatis (`pagefind --site public` di workflow).
- **Lokal**: `npm start` tidak punya indeks, jadi dialog pencarian menampilkan petunjuk. Gunakan `npm run preview` untuk mencoba pencarian sungguhan.
- Yang diindeks hanya isi artikel (`data-pagefind-body` di `page.html`), bukan menu atau footer. Untuk mengecualikan bagian tertentu, beri atribut `data-pagefind-ignore`.
- Matikan seluruhnya dengan `search = false` di `[params]`.

## Komentar (giscus, opsional)

1. Aktifkan **Discussions** di repo GitHub dan pasang [giscus app](https://github.com/apps/giscus).
2. Isi konfigurasi di https://giscus.app, lalu salin ke `[params.comments.giscus]` di `hugo.toml` (`repo`, `repoId`, `categoryId`, dan `category`).
3. Komentar muncul di halaman bertanggal. Tema giscus mengikuti toggle terang/gelap. Matikan per halaman dengan `comments = false`.

Catatan privasi: giscus memuat skrip dan iframe dari `giscus.app` serta `github.com`.

## Analytics (opsional)

Isi salah satu di `[params.analytics]`: Plausible (`plausibleDomain`), Umami (`umamiWebsiteId`), atau Google Analytics 4 (`gaMeasurementId`). Skrip hanya dimuat saat build production.

## Deploy (GitHub Pages)

1. Ubah `baseURL` di `hugo.toml` (atau `npm run init`).
2. Repo Settings → Pages → Source: **GitHub Actions**.
3. Push ke branch `main`. Workflow: install dependensi → tes → build CSS → smoke test → build Hugo → indeks Pagefind → deploy.

Saat deploy, `baseURL` diambil dari GitHub Pages, jadi situs di sub-path (`https://nama.github.io/repo/`) tetap benar.

## Pemecahan masalah

| Gejala | Penyebab / solusi |
| --- | --- |
| Situs tampil tanpa gaya | `output.css` belum dibuat. Jalankan `npm run build` atau `npm start`. |
| Peringatan "Font belum ada" | Jalankan `npm install` (atau `npm run fonts`). Sementara itu dipakai font sistem. |
| Ikon menu tidak muncul | Set ikon belum terpasang (`npm i -D @iconify-json/<set>`) atau nama ikon salah. `npm run smoke` menunjuk ikon yang hilang. |
| Pencarian: "Indeks pencarian dibuat saat build" | Wajar di `npm start`. Pakai `npm run preview`. |
| `npm run smoke` gagal | Pesannya menyebut berkas dan masalahnya (tautan rusak, meta kosong, dll.). Tambahkan `--keep` untuk memeriksa hasil build-nya. |
| Warna dark mode tidak berubah saat toggle | Pastikan `input.css` masih memakai `@custom-variant dark (...)`. |

## Lisensi

Kode starter ini berlisensi [MIT](LICENSE). Ganti nama pemegang hak cipta di `LICENSE` jika kamu mendistribusikan ulang starter-nya. Konten situs yang kamu tulis adalah milikmu dan tidak tercakup lisensi ini. Font Plus Jakarta Sans dan Fira Code berlisensi [SIL OFL 1.1](https://openfontlicense.org) (dibawa lewat paket Fontsource).
