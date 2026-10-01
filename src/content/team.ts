/** Teks manajemen tim & akses. */
export const teamText = {
  title: "Tim & akses",
  description:
    "Admin mengakses semuanya. Anggota tim hanya melihat proyek yang ditugaskan kepadanya, tanpa invoice, analitik, CMS, dan pengaturan.",
  add: "Tambah anggota",
  addDescription:
    "Akun langsung aktif dengan password sementara. Kirim password ke anggota lewat WhatsApp; mereka bisa menggantinya di menu Akun saya.",
  search: "Cari nama atau email…",
  empty: "Belum ada anggota tim.",
  fields: { fullName: "Nama", email: "Email", role: "Peran" },
  roles: { admin: "Admin", team: "Tim" } as Record<string, string>,
  roleHints: {
    admin: "Akses penuh, termasuk invoice, analitik, CMS, klien, dan penugasan proyek.",
    team: "Hanya proyek yang ditugaskan: papan konten, galeri, rencana kerja, dan link klien.",
  } as Record<string, string>,
  columns: { member: "Anggota", role: "Peran", projects: "Proyek ditugaskan", status: "Status" },
  status: { active: "Aktif", inactive: "Nonaktif" },
  you: "kamu",
  actions: {
    menu: (name: string) => `Aksi untuk ${name}`,
    makeAdmin: "Jadikan admin",
    makeTeam: "Jadikan tim",
    resetPassword: "Buat password sementara",
    deactivate: "Nonaktifkan akses",
    activate: "Aktifkan lagi",
  },
  confirm: {
    resetTitle: (name: string) => `Buat password baru untuk ${name}?`,
    resetDescription:
      "Password lama langsung tidak berlaku. Password sementara baru ditampilkan sekali untuk kamu kirimkan.",
    deactivateTitle: (name: string) => `Nonaktifkan akses ${name}?`,
    deactivateDescription:
      "Akun tidak bisa login dan semua akses ke proyek langsung hilang. Datanya tetap tersimpan dan bisa diaktifkan lagi.",
  },
  password: {
    title: "Password sementara",
    description: (name: string) =>
      `Kirim ke ${name}. Password ini hanya ditampilkan sekali; setelah dialog ditutup tidak bisa dilihat lagi.`,
    copy: "Salin",
    copied: "Password disalin.",
    whatsapp: "Kirim via WhatsApp",
    message: (name: string, email: string, password: string, url: string) =>
      `Halo ${name}, ini akun portal WeaveLens kamu:\n\nLogin: ${url}/login (tab Tim WeaveLens)\nEmail: ${email}\nPassword sementara: ${password}\n\nSetelah masuk, ganti password di menu "Akun saya".`,
    done: "Selesai",
  },
  toast: {
    created: "Anggota ditambahkan.",
    roleChanged: "Peran diperbarui.",
    deactivated: "Akses dinonaktifkan.",
    activated: "Akses diaktifkan lagi.",
  },
  assign: {
    title: "Tim proyek",
    description: "Anggota tim yang dipilih bisa mengerjakan proyek ini. Admin selalu punya akses.",
    empty: "Belum ada anggota tim. Tambahkan di menu Tim & akses.",
    save: "Simpan tim proyek",
    saved: "Tim proyek diperbarui.",
    none: "Belum ditugaskan",
  },
  account: {
    title: "Akun saya",
    description: "Ganti nama tampilan dan password kamu.",
    password: "Password baru (kosongkan jika tidak diganti)",
    passwordHint: "Minimal 10 karakter.",
    confirm: "Ulangi password baru",
    save: "Simpan",
    saved: "Akun diperbarui.",
  },
  access: {
    title: "Siapa bisa apa",
    rows: [
      ["Proyek, papan konten, review desain", "Semua proyek", "Proyek yang ditugaskan"],
      ["Galeri seleksi foto & video", "Semua", "Proyek yang ditugaskan"],
      ["Link akses klien", "Semua", "Proyek yang ditugaskan"],
      ["Buat/hapus proyek & tugaskan tim", "Ya", "Tidak"],
      ["Klien & brand", "Ya", "Hanya lihat (proyeknya)"],
      ["Invoice", "Ya", "Tidak"],
      ["Analitik website & CMS", "Ya", "Tidak"],
      ["Tim & akses, Pengaturan", "Ya", "Tidak"],
    ],
  },
};
