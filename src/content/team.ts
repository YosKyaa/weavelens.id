/** Teks manajemen tim & akses. */
export const teamText = {
  title: "Tim & akses",
  description:
    "Atur siapa saja yang bisa masuk ke portal dan apa yang boleh mereka kerjakan. Admin mengakses semuanya; anggota tim mengikuti izin dari perannya.",
  add: "Tambah anggota",
  addDescription:
    "Akun langsung aktif dengan password sementara. Kirim password ke anggota lewat WhatsApp; mereka bisa menggantinya di menu Akun saya.",
  search: "Cari nama atau email…",
  empty: "Belum ada anggota tim.",
  fields: { fullName: "Nama", email: "Email", role: "Peran" },
  roleHints: {
    admin: "Akses penuh, termasuk invoice, analitik, CMS, klien, dan penugasan proyek.",
    team: "Hanya proyek yang ditugaskan: papan konten, galeri, rencana kerja, dan link klien.",
  } as Record<string, string>,
  columns: { member: "Anggota", role: "Peran", projects: "Proyek ditugaskan", status: "Status" },
  status: { active: "Aktif", inactive: "Nonaktif" },
  you: "kamu",
  actions: {
    menu: (name: string) => `Aksi untuk ${name}`,
    changeRole: "Ubah peran",
    changeRoleTitle: (name: string) => `Ubah peran ${name}`,
    changeRoleHint: "Izin langsung berlaku saat anggota membuka halaman berikutnya.",
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
  roles: {
    title: "Peran tim",
    description:
      "Kumpulan izin yang bisa dipakai ulang. Ubah izin satu peran, semua anggotanya ikut berubah. Setiap anggota tim selalu bisa mengerjakan proyek yang ditugaskan kepadanya.",
    add: "Buat peran",
    edit: "Ubah izin",
    editTitle: "Ubah peran",
    editorHint: "Centang hal yang boleh dikerjakan anggota dengan peran ini.",
    name: "Nama peran",
    namePlaceholder: "Mis. Editor CMS",
    descriptionLabel: "Keterangan singkat (opsional)",
    permissions: "Izin",
    base: "Dasar (selalu): proyek yang ditugaskan, papan konten, galeri, link klien.",
    adminOnly: "Invoice, Pengaturan, dan Tim & akses selalu khusus admin.",
    save: "Simpan peran",
    saved: "Peran tersimpan.",
    delete: "Hapus",
    deleteTitle: (name: string) => `Hapus peran “${name}”?`,
    deleteDescription: (members: number) =>
      members
        ? `${members} anggota memakai peran ini. Mereka kembali ke akses dasar (hanya proyek yang ditugaskan) sampai diberi peran lain.`
        : "Peran ini belum dipakai siapa pun.",
    deleted: "Peran dihapus.",
    assignedProjects: "Proyek yang ditugaskan",
    adminDescription: "Akses penuh: semua menu, termasuk invoice, pengaturan, dan Tim & akses.",
    adminLocked: "Peran bawaan, tidak bisa diubah.",
  },
};
