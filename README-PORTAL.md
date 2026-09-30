# Portal klien WeaveLens

Portal untuk tim (admin) dan klien: rencana kerja, review desain, seleksi foto, dan invoice. Spesifikasi lengkap ada di `weavelens-portal-spec.md`.

- **Admin:** `/admin`. Masuk dengan email dan password di tab "Tim WeaveLens".
- **Klien:** cukup buka **link akses** `/share/<token>` yang dikirim tim lewat WhatsApp, tanpa login. Portal login klien `/client` (magic link) tetap tersedia untuk klien yang punya akun.
- **Konten landing page (CMS):** `/admin/konten`.

> URL portal memakai bahasa Inggris: `/admin`, `/admin/projects`, `/admin/galleries`, `/admin/invoices`, `/admin/analytics`, `/admin/cms`, dan `/share/<token>` untuk klien. URL lama berbahasa Indonesia otomatis dialihkan.

## 1. Setup Supabase (sekali)

1. **Buat tabel.** Di Supabase Dashboard, buka **SQL Editor** dan jalankan dua file ini **berurutan**:
   1. `supabase/migrations/0001_cms.sql`: konten landing page.
   2. `supabase/migrations/0002_portal.sql`: portal, RLS, nomor invoice, dan bucket `designs`, `thumbs`, `invoices`.
2. **Atur Authentication.**
   - Di **Sign In / Providers**, matikan **Allow new users to sign up**. Semua akun dibuat admin.
   - Di **Email**, set masa berlaku link (*Email OTP expiration*) ke **600 detik** (10 menit).
   - Di **Sessions**, set masa sesi 30 hari. Opsi ini ada di paket berbayar; di paket gratis sesi tetap berjalan lewat refresh token.
   - Di **URL Configuration**:
     - Set *Site URL* ke `https://weavelens.id`.
     - Tambahkan *Redirect URLs* berikut: `https://weavelens.id/auth/callback` dan `http://localhost:3000/auth/callback`.
3. **Isi env.** Salin `.env.example` ke `.env.local`, lalu isi:

   | Variabel | Dari mana | Di Vercel? |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings, bagian API | Ya |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings, bagian API (anon/publishable) | Ya |
   | `NEXT_PUBLIC_SITE_URL` | `https://weavelens.id` (kosongkan di lokal) | Ya |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings, bagian API (service_role/secret) | Tidak untuk sekarang, hanya dipakai skrip seed |
   | `PORTAL_ADMIN_PASSWORD` | Buat sendiri, minimal 12 karakter | **Jangan** |
   | `PORTAL_DEMO_CLIENT_EMAIL` | Opsional: email kedua untuk mencoba login sebagai klien | Tidak |

4. **Isi data awal:**
   ```bash
   npm run portal:seed   # admin weavelens.studio@gmail.com, data perusahaan, klien & proyek contoh
   npm run cms:seed      # konten landing page (opsional, jika belum)
   ```
   Skrip ini aman dijalankan berulang: data yang sudah ada tidak ditimpa, dan password admin tidak diubah.
5. Jalankan ulang `npm run dev`, buka `http://localhost:3000/login`, lalu masuk di tab **Tim WeaveLens**.

## 2. Tipe database

`src/types/database.ts` mengikuti migrasi. Setelah mengubah migrasi, buat ulang dari database:

```bash
npx supabase login
npx supabase link --project-ref <ref-project>
npm run db:types
```

## 3. Keamanan

- Klien hanya bisa **membaca** data organisasinya. Aturan ini dijaga Row Level Security di database, bukan hanya di tampilan.
- Klien hanya bisa **menulis** komentar desain dan pilihan foto, dan pilihan foto hanya bisa diubah selama seleksi dibuka.
- Draf invoice tidak pernah terlihat oleh klien.
- Peran admin hanya bisa diberikan lewat service role (skrip seed, atau fitur undang di tahap 2). Metadata yang diisi user sendiri tidak bisa menjadikan akun itu admin.
- Parameter `?next=` di link login dibatasi ke halaman portal milik peran tersebut, supaya tidak bisa dipakai untuk mengarahkan ke situs lain.

## 4. Menambah admin baru (sementara, sampai tahap 2)

1. Buka Supabase, pilih **Authentication**, lalu **Users**, lalu **Add user**. Isi email dan password, lalu centang *Auto Confirm*.
2. Di SQL Editor:
   ```sql
   update public.profiles set role = 'admin', client_id = null
   where id = (select id from auth.users where email = 'email-admin-baru@contoh.com');
   ```

## 5. Analitik website

- **Cara mencatat:** pengunjung dicatat oleh `/api/t` ke tabel `analytics_events`, tanpa cookie dan tanpa menyimpan IP. Pengunjung dihitung unik per hari lewat hash harian. Tim atau klien yang sedang login tidak ikut dihitung.
- **Env di Vercel:** butuh `SUPABASE_SERVICE_ROLE_KEY` (hanya dipakai server). Opsional: `ANALYTICS_SALT`, string acak untuk hash pengunjung.
- **Sumber kunjungan:** dibaca dari UTM lebih dulu, lalu dari referrer. Link bio (`/bio`) menambahkan `utm_source=instagram&utm_medium=bio` secara otomatis.
- **Dashboard:** `/admin/analitik` untuk rentang 7, 30, atau 90 hari. Isinya rekomendasi otomatis, tren harian, sumber kunjungan, halaman, tombol WhatsApp, admin, perangkat, dan kota.

## 6. Invoice

- **Nomor:** `/admin/invoice/baru`. Item, harga, dan penerima diisi bebas. Nomor `WL-YYYY-NNNN` dibuat Postgres saat pertama disimpan, jadi tidak pernah dobel.
- **Cetak / simpan PDF:** memakai dokumen yang sama dengan pratinjau. Di jendela cetak, pilih "Simpan sebagai PDF". Ukurannya A4 dengan latar brand penuh.
- **Status:** Draf, lalu Belum dibayar ("Tandai terkirim", bisa diurungkan), lalu Lunas atau Dibatalkan. Kedua status terakhir dikunci dan harus dikonfirmasi.
- **Duplikat:** menyalin penerima dan item ke invoice baru.
- **Data bawaan:** perusahaan, rekening, dan penanda tangan diatur di `/admin/settings`.

## 7. Alur kerja harian

### A. Konten sosial media (mis. 1 klien dengan 4 perusahaan)
1. **Klien & brand:** buka **Klien & brand**, lalu **Tambah klien** (mis. nama grup). Di halaman klien, tambahkan 4 brand dengan warna penanda masing-masing.
2. **Proyek:** buka **Proyek & konten**, lalu **Buat proyek** dengan jenis "Konten sosial media & desain". Mis. "Konten Instagram Oktober 2026".
3. **Rencana kerja:** isi tab **Rencana kerja** dengan tahapan yang dilihat klien sebagai timeline progres.
4. **Papan konten:**
   - Tambah kartu per konten (brand, format Feed/Carousel/Story/Reels, tenggat).
   - Geser kartu antar tahap. Di HP, pakai menu ⋯ di kartu.
5. **Kirim desain:** buka kartu, lalu **Unggah versi baru**.
   - Carousel: pilih beberapa file sekaligus.
   - Reels di atas 50 MB: tempel link Google Drive.
   - Setelah dikirim, kartu otomatis pindah ke "Menunggu review".
6. **Link klien:** di tab **Link klien**, buat link. Pilih "Hanya Brand X" supaya PIC tiap perusahaan hanya melihat kontennya sendiri. Link otomatis tersalin; kirim lewat tombol WhatsApp.
7. **Klien me-review:**
   - Klien membuka link, mengisi nama, lalu mengklik bagian desain untuk menaruh titik komentar.
   - Setelah itu klien memilih **Setujui desain** atau **Minta revisi**.
   - Kartu otomatis pindah ke "Disetujui" atau "Direvisi", dan semuanya tercatat di tab **Aktivitas**.
8. **Revisi:** tandai komentar selesai, unggah versi berikutnya. Versi lama tetap bisa dibuka.

### B. Seleksi foto/video (wisuda, acara korporat)
1. Buat proyek jenis **Dokumentasi foto / video / Foto & video**.
2. Unggah file mentah ke folder Google Drive, lalu bagikan folder itu ke email service account (lihat bagian 8).
3. Di tab **Galeri seleksi**, klik **Buat galeri** dan tempel link folder. Isi **maksimal pilihan** (mis. 50) dan batas waktu.
4. Klik **Sinkronkan dari Drive**, lalu **Buka seleksi untuk klien**. Kirim link proyek (tab **Link klien**).
5. **Klien memilih:**
   - Klien memilih foto/video, dengan penghitung "23 / 50" yang selalu terlihat.
   - Setiap pilihan bisa diberi catatan untuk editor.
   - Terakhir klien menekan **Kirim pilihan**, lalu galeri otomatis tertutup.
6. **Tim mengedit:**
   - Klik **Unduh daftar file (.txt)**, atau **Salin nama file** untuk ditempel di filter Lightroom.
   - Klik **Mulai edit**.
7. **Kirim hasil:** unggah hasil edit ke folder Drive, tempel link foldernya, lalu klik **Kirim hasil edit**. Klien melihat tombol **Buka hasil edit**.

## 8. Menghubungkan Google Drive (sekali)
1. Buka [console.cloud.google.com](https://console.cloud.google.com), buat project, lalu aktifkan **Google Drive API**.
2. Buka **IAM & Admin**, pilih **Service Accounts**, lalu **Create service account** (peran tidak perlu diisi).
3. Buka service account itu, pilih **Keys**, lalu **Add key** (JSON). File JSON akan terunduh.
4. Isi env `GOOGLE_SERVICE_ACCOUNT_JSON` dengan isi file JSON (boleh dalam bentuk base64) di `.env` dan di Vercel.
5. Di Google Drive, buat folder induk (mis. "WeaveLens Clients"), lalu **Bagikan** ke email service account (`…@….iam.gserviceaccount.com`) sebagai **Editor**. Semua subfolder di dalamnya ikut bisa dibaca portal.

**Catatan:**
- **Thumbnail:** diambil server lewat `/api/drive/thumb/…` dan di-cache CDN. Browser klien tidak pernah mengakses Drive langsung, kecuali saat memutar video.
- **Video:** diputar dengan pemutar Google Drive. Karena itu, saat seleksi dibuka, folder dibuat "siapa pun yang punya link bisa melihat".
- **Hapus galeri:** file di Drive tidak ikut terhapus.

## 9. Keamanan link klien
- Token link terdiri dari 192 bit acak, sehingga tidak bisa ditebak. Link bisa diberi masa berlaku dan **dicabut kapan saja**; aksesnya langsung terputus.
- Setiap aksi dari link diperiksa ulang di server: token masih aktif, izin review, dan data yang disentuh memang milik proyek/brand link itu.
- Link "hanya lihat" tidak bisa memberi komentar atau persetujuan.
