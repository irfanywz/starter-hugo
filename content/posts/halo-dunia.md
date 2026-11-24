+++
title = 'Halo Dunia'
date = '2026-11-24'
description = 'Tulisan contoh pertama.'
topics = ['hugo', 'tailwind']
+++

Selamat datang! Ini tulisan contoh. Hapus atau ganti dengan tulisanmu sendiri.

## Callout

{{% callout type="tip" title="Tips" %}}
Gunakan shortcode `callout` dengan tipe `info`, `tip`, `warning`, atau `danger`. Isinya boleh **markdown**.
{{% /callout %}}

## Detail dan tombol

{{% details summary="Klik untuk membuka" %}}
Isi yang disembunyikan. Boleh berisi **markdown**, daftar, bahkan kode.
{{% /details %}}

{{< button url="/posts/" text="Lihat semua tulisan" style="outline" >}}

## Contoh kode

```js
console.log('Halo, Hugo!');
```

### Tulisan baru

Buat tulisan baru dengan `hugo new posts/judul-tulisan.md`. Link eksternal seperti [Hugo](https://gohugo.io) otomatis terbuka di tab baru.

## Daftar isi

Daftar isi di atas dibuat otomatis dari heading `##` dan `###`. Matikan per halaman dengan `toc = false` di front matter.
