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
- **Data bawaan:** perusahaan, metode pembayaran, dan penanda tangan diatur di `/admin/settings`.
- **Metode pembayaran:** pilih dari dropdown (BCA, Mandiri, BNI, BRI, BSI, bank lain, QRIS, GoPay, OVO, DANA, ShopeePay, tunai), lalu isi nomor rekening/HP dan atas nama. Bisa lebih dari satu (maks. 6). Baris bank/e-wallet tanpa nomor tidak dicetak. Invoice lama yang masih berupa teks bebas tetap tampil apa adanya.

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
   - **Per satu desain:** di halaman konten admin, bagian **Kirim ke klien** berisi tombol **Salin link desain** / **Kirim via WhatsApp**. Klien langsung masuk ke desain itu, tidak perlu mencari di daftar.
   - **Klien yang punya akun portal:** login di `/login` (tab Klien), buka **Proyek saya**, pilih proyek, lalu review desain dengan cara yang sama. Namanya tercatat dari akunnya.
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

## 10. Peran & akses tim

**Admin** selalu punya akses penuh. Hanya admin yang bisa membuka **Invoice**, **Pengaturan**, dan **Tim & akses**.

**Anggota tim** selalu bisa mengerjakan **proyek yang ditugaskan**: papan konten, review desain, galeri seleksi, rencana kerja, link klien, dan aktivitas. Izin tambahan berasal dari **peran tim** yang dipilih admin. Peran ini bisa dibuat dan diubah sendiri di **Tim & akses → Peran tim**:

| Izin | Membuka |
|---|---|
| Semua proyek | Semua proyek tanpa perlu ditugaskan satu per satu |
| Kelola proyek | Membuat, mengubah, dan menghapus proyek, serta menugaskan tim |
| Klien & brand | Data klien dan brand |
| Konten website (CMS) | Menu CMS: testimoni, galeri, layanan, harga, FAQ, kontak |
| Analitik website | Pengunjung dan klik WhatsApp |

Peran bawaan dari migrasi: **Tim proyek** (tanpa izin tambahan), **Editor CMS** (CMS), dan **Project manager** (semua proyek, kelola proyek, klien). Kalau izin sebuah peran diubah, semua anggotanya langsung ikut berubah. Peran yang dihapus membuat anggotanya kembali ke akses dasar.

**Satu anggota bisa punya beberapa peran sekaligus** (mis. Editor CMS + Project manager). Izinnya digabung. Anggota tim tanpa peran tambahan tampil sebagai "Tim dasar": hanya proyek yang ditugaskan. Peran disimpan di tabel `profile_team_roles` (migrasi `0007_multi_team_roles.sql`).

- **Tambah anggota:** buka **Tim & akses**, lalu **Tambah anggota**, dan pilih perannya. Akun langsung aktif dengan password sementara yang tampil **sekali**. Kirim lewat tombol WhatsApp; anggota menggantinya di **Akun saya**.
- **Kirim ulang akses:** menu **⋯** → **Kirim ulang akses**. Pesan WhatsApp berisi link login dan email akunnya (password tidak ikut dan tidak berubah). Nomor HP opsional; kosongkan untuk memilih kontak sendiri. Kalau anggota lupa password, pakai **Buat password sementara** dari dialog yang sama.
- **Ubah peran anggota:** menu **⋯** di baris anggota, lalu **Ubah peran**. Pilih **Admin**, atau **Tim WeaveLens** lalu centang satu/lebih peran.
- **Tugaskan ke proyek:** saat **Buat proyek** (centang anggota), atau lewat tab **Tim** di halaman proyek.
- **Nonaktifkan akses:** akun tidak bisa login dan semua aksesnya langsung hilang. Data tetap tersimpan dan bisa diaktifkan lagi. Sistem selalu menyisakan minimal satu admin aktif.
- **Penegakan akses:** aturan dijaga Row Level Security di database (migrasi `0005_team_roles.sql` dan `0006_team_permissions.sql`), jadi tetap aman walau seseorang mengetik URL halaman secara langsung.

## 11. Login dengan Google

Tombol **Lanjutkan dengan Google** di `/login` baru muncul setelah provider Google aktif di Supabase. Hanya akun yang **sudah didaftarkan** di Tim & akses (dengan email Google yang sama) yang bisa masuk.

1. **Google Cloud Console:** buka APIs & Services → Credentials → Create OAuth client ID (Web application).
   - *Authorized redirect URI*: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - Selesaikan juga OAuth consent screen (nama aplikasi WeaveLens, domain `weavelens.id`).
2. **Supabase → Authentication → Sign In / Providers → Google:** aktifkan, lalu tempel Client ID dan Client Secret.
3. **Supabase → Authentication → Sign In / Providers:** pastikan **Allow new users to sign up** dimatikan. Tanpa ini, siapa pun yang punya akun Google bisa membuat akun kosong. Akun tersebut tetap tidak bisa masuk portal, tapi lebih baik dicegah sejak awal.
4. **Supabase → URL Configuration → Redirect URLs:** tambahkan `https://www.weavelens.id/auth/callback`.

## 12. Review konten: fitur untuk klien & tim

**Untuk klien** (link klien dan portal klien):
- **Mode review berurutan:** tombol **Mulai review (N desain)** di daftar konten. Setelah menekan Setujui atau Minta revisi, desain berikutnya langsung terbuka. Penanda "2 dari 6" dan panah sebelumnya/berikutnya ada di kanan atas.
- **Komentar caption:** caption tampil di samping desain. Klien memilih **Desain** atau **Caption** saat menulis komentar, jadi persetujuan mencakup visual dan teks.
- **Bandingkan versi:** tombol **Bandingkan dengan versi N** menampilkan versi lama dan baru berdampingan.
- **Kalender:** tampilan **Daftar | Kalender** berdasarkan tanggal tayang, berwarna per brand (di HP berupa agenda per hari).

**Untuk tim:**
- **Lonceng notifikasi** (kanan atas): klien menyetujui, minta revisi, atau berkomentar. Membuka lonceng = semua ditandai dibaca.
- **Tenggat terlihat:** kartu kanban menampilkan "Lewat N hari" (merah), "Hari ini", atau "Besok". Ringkasan berisi **Tenggat konten minggu ini**.
- **Kalender di proyek:** **Papan | Kalender**. Seret kartu ke tanggal lain untuk mengubah jadwal tayang, atau dari "Belum dijadwalkan".
- **Unggah banyak:** di papan konten, **Unggah banyak** → pilih brand & format → seret banyak file. Setiap file menjadi satu kartu (judul dari nama file, bisa diedit) dan langsung masuk "Menunggu review". Klien menerima satu email ringkasan.
- **Link per brand otomatis:** proyek konten baru langsung punya link klien "PIC <brand>" untuk setiap brand. Di tab **Link klien**, tombol **Buat link per brand** melengkapi brand yang belum punya link.

**Email pemberitahuan (opsional, Resend):** isi `RESEND_API_KEY` dan `EMAIL_FROM` (mis. `WeaveLens <notifikasi@weavelens.id>`) di Vercel setelah domain diverifikasi di resend.com. Klien menerima email saat desain siap direview (ke kontak klien + akun portal klien); admin dan tim yang ditugaskan menerima email saat klien menyetujui atau minta revisi. Tanpa env ini, semua tetap jalan tanpa email.

Migrasi: `0008_review_ux.sql` (penanda notifikasi dibaca, komentar caption).
