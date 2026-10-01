# WeaveLens — landing page

Landing page satu halaman untuk WeaveLens. Satu tujuan: calon klien menekan tombol dan mengirim pesan WhatsApp.

Dibangun dengan Next.js 15, Tailwind CSS v4, dan shadcn/ui. **Semua teks ada di folder `src/content/`** — untuk mengubah isi halaman, kamu hampir tidak perlu menyentuh komponen.

## Menjalankan di komputer

```bash
npm install        # sekali saja
npm run dev        # buka http://localhost:3000
```

Sebelum deploy, cek bahwa semuanya bersih:

```bash
npm run build
npm run lint
```

> Jangan menjalankan `npm run build` saat `npm run dev` masih hidup di folder yang sama — keduanya menulis ke `.next/` dan saling menimpa. Matikan `dev` dulu (Ctrl+C).

## Admin CMS (Supabase)

Testimoni, galeri, layanan, harga, FAQ, klien, admin WhatsApp, dan kontak bisa dikelola di **`/admin/konten`**, tanpa menyentuh kode dan tanpa deploy ulang. Selama Supabase belum dihubungkan, website tetap jalan dengan konten bawaan dari `src/content/`.

### Pasang sekali

CMS sekarang bagian dari portal admin (menu **Konten website** di `/admin/konten`). Setup Supabase, akun admin, dan login dijelaskan di **README-PORTAL.md**. Setelah itu, pindahkan konten landing page yang sekarang ke database:

```bash
npm run cms:seed            # hanya mengisi tabel yang masih kosong
```

### Cara kerjanya

- **Keamanan:** publik hanya bisa *membaca* baris yang tampil. Menulis hanya bisa dilakukan akun berperan admin di portal. Ini dijaga Row Level Security di database, bukan hanya di tampilan.
- **Tampil di website:** setiap tombol Simpan langsung memperbarui halaman (cache bertag `cms`). Tanpa perubahan, halaman tetap disegarkan setiap 1 jam.
- **Foto:** foto yang diunggah otomatis dikecilkan ke maksimal 1600px dan diubah ke WebP di browser, lalu disimpan di Storage bucket `media`. Foto yang diganti atau dihapus ikut dihapus dari bucket.
- **Saklar "Tampil":** menyembunyikan item tanpa menghapusnya. Panah atas dan bawah mengatur urutan tampil.
- **Pengaman WhatsApp:** kalau semua admin WhatsApp disembunyikan atau dihapus, tombol WhatsApp memakai nomor bawaan di `site.ts`, jadi CTA tidak pernah mati.
- **Pengaman koneksi:** kalau Supabase tidak bisa diakses, halaman memakai konten bawaan.

Teks yang jarang berubah tetap di kode: headline hero, judul section, langkah kerja, pesan WA otomatis, dan studi kasus.

## Peta file yang sering diubah

| Mau mengubah | Buka file |
|---|---|
| Testimoni, galeri, layanan, harga, FAQ, klien, admin WA, kontak (setelah Supabase terhubung) | `/admin/konten` di browser; file di bawah jadi isi bawaan |
| Admin & nomor WA, pesan WA otomatis, alamat, Instagram, email, jam respons, teks hero, CTA akhir, 404 | `src/content/site.ts` |
| Pertanyaan yang sering masuk (FAQ) | `src/content/faq.ts` |
| Layanan (termasuk "segera hadir" dan foto kartunya) | `src/content/services.ts` |
| Harga dan isi paket | `src/content/pricing.ts` |
| Foto portofolio dan foto hero | `src/content/portfolio.ts` |
| Studi kasus (proyek klien) | `src/content/case-studies.ts` |
| Logo klien | `src/content/clients.ts` |
| Tiga langkah cara kerja | `src/content/steps.ts` |
| Warna brand | `src/app/globals.css` |
| Logo dan ornamen batik | `public/brand/logo.svg`, `public/brand/ornament.svg` |

## 1. Admin dan nomor WhatsApp

Di `src/content/site.ts`, daftar admin ada di bagian paling atas:

```ts
const admins: WaAdmin[] = [
  { id: "admin-1", number: "6282112187810", display: "+62 821-1218-7810" },
  { id: "admin-2", number: "6281387273158", display: "+62 813-8727-3158" },
];
```

- `number`: format internasional **tanpa `+` dan tanpa spasi**. Dipakai untuk link wa.me.
- `display`: cara nomor ditulis di halaman (footer dan pilihan admin).
- Admin tampil tanpa nama, bernomor sesuai urutan: "Admin 1", "Admin 2".
- Tambah atau hapus admin cukup dengan menambah atau menghapus baris. Tombol WhatsApp di halaman otomatis menawarkan pilihan admin sesuai daftar ini; footer menulis setiap nomor langsung.

Nomor divalidasi saat build (harus cocok dengan `^62\d{8,13}$`). Kalau formatnya salah, build gagal dan menyebut admin ke berapa yang bermasalah.

Di Vercel Analytics, setiap klik tercatat sebagai `cta_whatsapp` dengan `section` (asal tombol) dan `admin` (admin yang dipilih).

## 2. Angka dan janji layanan

Semua angka di halaman berasal dari draf awal dan portfolio WeaveLens: foto siap **3 hari kerja**, foto + video **5 hari kerja**, tim tiba **1 jam** sebelum acara, **50+** foto terpilih, **1 fotografer / 4 jam**, video highlight **60 detik**. Kalau ada yang berubah, cari dan ganti di `src/content/` (paling sering di `site.ts`, `pricing.ts`, `steps.ts`, `faq.ts`).

Jangan menulis klaim yang tidak bisa dibuktikan ("terbaik", "ribuan klien").

Pesan WhatsApp otomatis sengaja berisi baris kosong (`Tanggal: `, `Lokasi: `) supaya calon klien tinggal mengisi.

## 3. Menambah foto portofolio

1. Taruh foto asli (jpg/png, boleh besar) di folder `photos/`.
2. Jalankan:
   ```bash
   npm run images:optimize
   ```
   Foto diubah ke WebP lebar maks 1600px dan disimpan di `public/portfolio/`. Nama file dibuat huruf kecil dengan tanda hubung, mis. `Wisuda JGU 01.jpg` → `wisuda-jgu-01.webp`. Ukuran hasil (lebar × tinggi) tercetak di terminal — salin ke `width` dan `height`.
3. Di `src/content/portfolio.ts`, isi `src` dan data lainnya:
   ```ts
   {
     id: "wisuda-1",
     src: "/portfolio/wisuda-jgu-01.webp",
     alt: "Wisudawan melempar toga di halaman kampus JGU",
     category: "wisuda",          // "wisuda" | "corporate" | "event"
     client: "Jakarta Global University", // opsional
     year: "2025",                        // opsional
     width: 1600,
     height: 1067,                // sesuaikan dengan ukuran hasil optimize
   },
   ```
   Tulis `alt` sebagai deskripsi isi foto — ini dibaca oleh pembaca layar dan Google.
4. Foto utama hero diatur di `heroImage` di file yang sama. Pilih foto landscape terbaik.
5. Foto kartu layanan diatur di `src/content/services.ts` (`cardImage(...)`).

Foto pertama di `portfolioImages` tampil besar di galeri. Foto asli (sumber) disimpan di `photos/`, yang tidak ikut ke git.

## 4. Testimoni dan studi kasus

**Testimoni** ada di `src/content/testimonials.ts`. Isi hanya dengan kutipan asli dari klien (dengan izin). Begitu ada minimal satu testimoni, section "Kata klien kami" otomatis tampil menggantikan section proyek.

Selama testimoni masih kosong, section "Proyek yang pernah kami kerjakan" diisi dari `src/content/case-studies.ts` — ringkasan proyek nyata dari Creative Portfolio (klien, tantangan, yang dikerjakan):

```ts
{
  id: "malaysia-healthcare",
  client: "Malaysia Healthcare",
  project: "MHexpo",
  service: "Dokumentasi corporate",
  challenge: "Event resmi yang butuh liputan rapi ...",
  result: "Foto utama dan rangkaian foto ...",
},
```

Jangan menulis testimoni karangan.

## 5. Logo klien

Daftar klien di `src/content/clients.ts` (sumber: halaman Selected Partners di Creative Portfolio). Saat ini tampil sebagai teks berjalan. Untuk memakai logo: taruh file SVG/PNG di `public/clients/`, lalu isi `logo: "/clients/maybank.svg"`. Logo otomatis ditampilkan grayscale.

## 6. Mengubah harga

Di `src/content/pricing.ts`, ubah `price` (mis. `"450 ribu"`) dan daftar `features`. Harga sengaja **hanya tampil di section Harga** — kartu layanan tidak memuat harga.

## 6b. Mengubah FAQ

Di `src/content/faq.ts`, tambah atau ubah entri `question` dan `answer`. Tulis jawaban singkat, hanya berisi fakta yang benar (harga, waktu kirim, area) — jangan menambah janji baru di sini.

## 7. Mengaktifkan layanan "segera hadir"

Di `src/content/services.ts`, ubah layanan dari:

```ts
status: "coming_soon",
```

menjadi:

```ts
status: "available",
ctaLabel: "Tanya photobooth", // label tombol di kartu
waMessage: "general",    // atau buat pesan baru di site.ts → wa.messages
```

Kartu otomatis berubah: badge "Segera hadir" hilang dan tombol WhatsApp muncul. Tambahkan juga `image: cardImage(...)` agar kartu punya foto. Jika ingin pesan WA khusus, tambahkan kunci baru di `wa.messages` (`site.ts`) dan di tipe `WaMessageKey` (`src/types/index.ts`).

## 8. Deploy ke Vercel dan pasang domain

1. Push repo ini ke GitHub.
2. Di [vercel.com](https://vercel.com) → **Add New → Project** → pilih repo → **Deploy**. Pengaturan bawaan sudah benar, tidak perlu environment variable.
3. **Analytics**: di dashboard proyek → tab **Analytics** → **Enable**. Klik tombol WA tercatat sebagai event `cta_whatsapp` dengan properti `section` (hero, pricing, sticky, dll.).
4. **Domain**: **Settings → Domains** → tambahkan `weavelens.id` dan `www.weavelens.id`. Vercel menampilkan record DNS yang harus dipasang di tempat kamu membeli domain (biasanya record `A` ke `76.76.21.21` untuk domain utama dan `CNAME` ke `cname.vercel-dns.com` untuk `www`). Tunggu propagasi DNS (beberapa menit sampai 24 jam).
5. Jika domain berbeda dari `weavelens.id`, ubah `url` di `src/content/site.ts` supaya sitemap dan preview link benar.

Setiap push ke GitHub otomatis membuat deploy baru.

## 9. SEO & GEO (muncul di jawaban AI)

Supaya ChatGPT, Perplexity, Gemini, Claude, dan Google AI Overview bisa menemukan dan mengutip WeaveLens:

- **Data terstruktur (JSON-LD)** di beranda: profil bisnis lokal (Jakarta, area Jabodetabek, kontak, jam balas), katalog layanan + harga mulai, dan FAQ. Dibuat otomatis dari konten CMS (`src/lib/structured-data.ts`).
- **`/llms.txt`**: ringkasan fakta WeaveLens dalam Markdown untuk asisten AI. Ikut berubah saat CMS diubah (maks. 1 jam).
- **`robots.txt`** mengizinkan crawler AI secara eksplisit (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, dll.). Portal dan link klien tetap tertutup.
- **Sitemap** memuat foto portofolio (pencarian gambar). **Canonical** ke `https://www.weavelens.id`.
- **Jawaban FAQ selalu ada di HTML** (pakai `<details>`), jadi terbaca walau tertutup.

Tips konten agar makin sering dikutip AI: tulis FAQ dengan pertanyaan yang benar-benar diketik orang (mis. "Berapa harga jasa foto wisuda di Jakarta?") dan jawab dengan angka/fakta yang jelas lewat **CMS → FAQ**. Setelah deploy, daftarkan sitemap di Google Search Console dan Bing Webmaster Tools (Bing dipakai ChatGPT Search & Copilot).

## Struktur kode

```
src/
├── app/                layout, page (hanya render template), 404, sitemap, robots, OG image, icon
├── components/
│   ├── ui/             komponen shadcn (button, card, badge, dialog, tabs, separator, popover, accordion)
│   ├── atoms/          Logo, Ornament, WaLink, WaChooser, SectionHeading, PriceStamp, RotatingSeal, BatikPattern, GlassChip, ComingSoonBadge, Photo, ScrollProgress, CtaTracker
│   ├── molecules/      ServiceCard, PortfolioItem, CaseStudyCard, StepItem, PricingCard, FaqItem, ClientLogo, NavLink
│   ├── organisms/      Header, Hero, ClientStrip, Services, Portfolio (+ PortfolioGallery), HowItWorks, CaseStudies, Pricing, Faq, FinalCta, Footer, StickyWa
│   └── templates/      LandingTemplate (urutan section)
├── content/            semua teks dan data
├── lib/                wa.ts (link WhatsApp), analytics.ts, motion.ts (reveal), utils.ts
└── types/              tipe data
```

Aturan yang dijaga: tidak ada teks langsung di komponen (semua dari `content/`), hanya `WaLink` yang membuat link WhatsApp, dan tidak ada library animasi.

## Animasi

Semua gerak dibuat dengan CSS bawaan browser, tanpa library, dan didefinisikan di bagian bawah `src/app/globals.css`:

| Efek | Cara kerja |
|---|---|
| Garis progres di atas layar, parallax foto hero, ornamen berputar, garis penghubung langkah | CSS scroll-driven animation (`animation-timeline`) |
| Kartu dan heading muncul saat di-scroll | atribut `data-reveal` lewat helper `reveal()` di `src/lib/motion.ts` |
| Kata headline naik satu per satu, chip dan stempel harga mengambang, logo klien berjalan, tombol WA berdenyut | animasi CSS biasa (`.hero-word`, `.float`, `.marquee-track`, `.fab-ping`) |
| Kartu terangkat dan foto membesar saat disorot | transisi Tailwind (`hover:`) |

Browser yang belum mendukung scroll-driven animation (mis. Firefox) tetap menampilkan semua konten, hanya tanpa efek scroll. Pengunjung yang mengaktifkan "kurangi gerakan" di perangkatnya otomatis melihat versi tanpa animasi.

Untuk menambahkan efek muncul-saat-scroll ke elemen baru: `<li {...reveal(index)}>`.
