# Portal klien WeaveLens

Portal untuk tim (admin) dan klien: rencana kerja, review desain, seleksi foto, dan invoice. Spesifikasi lengkap ada di `weavelens-portal-spec.md`.

- **Admin:** `/admin`. Masuk dengan email dan password di tab "Tim WeaveLens".
- **Klien:** `/c`. Masuk lewat link di email (magic link), tanpa password. Akun klien dibuat oleh admin, tidak ada halaman daftar.
- **Konten landing page (CMS):** `/admin/konten`.

> Status: **Tahap 1 (fondasi & auth)**. Modul klien/proyek, desain, foto, dan invoice menyusul di tahap 2–5. Bagian README ini dilengkapi di tahap 6.

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
