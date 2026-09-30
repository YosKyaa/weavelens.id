/**
 * Semua teks portal klien & admin. Klien tidak pernah melihat istilah internal (SPEC-PORTAL A7):
 * "Rencana kerja" bukan "plan items", "Minta revisi" bukan "request changes".
 */

/** Warna badge status (SPEC-PORTAL A7), dipetakan ke token brand di StatusBadge. */
export type StatusTone = "neutral" | "brand" | "sand" | "success" | "muted";

type StatusDef = { label: string; tone: StatusTone };

export const statuses = {
  project: {
    draft: { label: "Draf", tone: "neutral" },
    active: { label: "Berjalan", tone: "brand" },
    in_review: { label: "Menunggu review", tone: "brand" },
    revision: { label: "Direvisi", tone: "sand" },
    approved: { label: "Disetujui", tone: "success" },
    delivered: { label: "Selesai dikirim", tone: "success" },
    closed: { label: "Ditutup", tone: "muted" },
  },
  plan: {
    planned: { label: "Direncanakan", tone: "neutral" },
    in_progress: { label: "Dikerjakan", tone: "brand" },
    done: { label: "Selesai", tone: "success" },
  },
  design: {
    pending_review: { label: "Menunggu review", tone: "brand" },
    changes_requested: { label: "Revisi diminta", tone: "sand" },
    approved: { label: "Disetujui", tone: "success" },
  },
  photoSet: {
    uploading: { label: "Sedang diunggah", tone: "neutral" },
    ready: { label: "Siap", tone: "neutral" },
    selecting: { label: "Pilih foto", tone: "brand" },
    selection_closed: { label: "Pilihan terkirim", tone: "sand" },
    editing: { label: "Sedang diedit", tone: "brand" },
    delivered: { label: "Hasil siap", tone: "success" },
  },
  invoice: {
    draft: { label: "Draf", tone: "neutral" },
    sent: { label: "Belum dibayar", tone: "brand" },
    paid: { label: "Lunas", tone: "success" },
    void: { label: "Dibatalkan", tone: "muted" },
  },
} satisfies Record<string, Record<string, StatusDef>>;

export type StatusKind = keyof typeof statuses;

export const projectTypes: Record<string, string> = {
  design: "Desain",
  photo: "Foto",
  video: "Video",
  mixed: "Foto, video & desain",
};

export const portal = {
  name: "Portal WeaveLens",

  setup: {
    heading: "Portal belum terhubung",
    body: "Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local (lokal) atau Environment Variables di Vercel, lalu jalankan ulang server.",
    hint: "Langkah lengkapnya ada di README-PORTAL.md.",
  },

  login: {
    heading: "Masuk ke portal",
    sub: "Pantau proyek, review desain, pilih foto, dan unduh invoice.",
    clientTab: "Klien",
    teamTab: "Tim WeaveLens",
    emailLabel: "Email",
    passwordLabel: "Password",
    clientHint: "Kami kirim link masuk ke email ini. Tidak perlu password.",
    sendLink: "Kirim link masuk",
    sending: "Mengirim…",
    signIn: "Masuk",
    checking: "Memeriksa…",
    linkSent: (email: string) =>
      `Kalau ${email} terdaftar, link masuk sudah kami kirim. Cek kotak masuk atau folder spam; link berlaku 10 menit.`,
    errors: {
      emailInvalid: "Tulis email yang valid, mis. nama@kampus.ac.id.",
      passwordMissing: "Isi password.",
      wrongCredentials: "Email atau password salah.",
      notAdmin: "Akun ini bukan akun tim. Klien masuk lewat tab Klien.",
      linkFailed: "Link masuk tidak bisa dikirim. Coba lagi beberapa menit lagi.",
      linkExpired: "Link masuk sudah kedaluwarsa atau sudah dipakai. Minta link baru di bawah.",
      notConfigured: "Portal belum terhubung ke database.",
      serviceDown:
        "Portal sedang tidak bisa terhubung ke server login. Coba lagi sebentar; jika tetap gagal, hubungi admin teknis.",
    },
  },

  shell: {
    signOut: "Keluar",
    viewSite: "Lihat website",
    adminBadge: "Admin",
    /** Badge di header klien jika akun belum terhubung ke organisasi. */
    clientFallback: "Klien",
    menuLabel: "Menu portal",
    openMenu: "Buka menu",
    signedInAs: "Masuk sebagai",
  },

  /** Menu dikelompokkan per jenis pekerjaan; grup tanpa `label` tampil paling atas. */
  nav: {
    admin: [
      {
        items: [
          { href: "/admin", label: "Ringkasan", icon: "home" },
          { href: "/admin/analitik", label: "Analitik website", icon: "chart" },
        ],
      },
      {
        label: "Pekerjaan",
        items: [
          { href: "/admin/projects", label: "Proyek", icon: "folder" },
          { href: "/admin/invoice", label: "Invoice", icon: "invoice" },
        ],
      },
      {
        label: "Data",
        items: [{ href: "/admin/clients", label: "Klien", icon: "users" }],
      },
      {
        label: "Website",
        items: [
          { href: "/admin/konten", label: "Konten website", icon: "layout" },
          { href: "/admin/settings", label: "Pengaturan", icon: "settings" },
        ],
      },
    ],
    client: [{ items: [{ href: "/c", label: "Proyek saya", icon: "folder" }] }],
  },

  adminHome: {
    heading: "Menunggu saya",
    sub: "Hal yang perlu kamu tindak lanjuti. Kalau semua kosong, tidak ada yang tertunda.",
    revisions: {
      heading: "Desain menunggu revisi",
      empty: "Tidak ada permintaan revisi yang tertunda.",
      item: (asset: string, version: number) => `${asset} · versi ${version}`,
    },
    selections: {
      heading: "Pilihan foto sudah dikirim klien",
      empty: "Belum ada klien yang mengirim pilihan foto.",
    },
    overdue: {
      heading: "Invoice lewat jatuh tempo",
      empty: "Tidak ada invoice yang lewat jatuh tempo.",
      due: (date: string) => `Jatuh tempo ${date}`,
    },
    active: {
      heading: "Proyek berjalan",
      empty: "Belum ada proyek berjalan.",
    },
  },

  projects: {
    heading: "Proyek",
    sub: "Semua proyek dari semua klien, terbaru di atas.",
    empty: "Belum ada proyek.",
    columns: {
      title: "Proyek",
      client: "Klien",
      type: "Jenis",
      event: "Tanggal acara",
      status: "Status",
    },
  },

  clients: {
    heading: "Klien",
    sub: "Organisasi klien. Setiap anggota klien melihat proyek yang sama.",
    empty: "Belum ada klien.",
    columns: { name: "Klien", contact: "Kontak", projects: "Proyek" },
  },

  clientHome: {
    heading: "Proyek saya",
    sub: (client: string) => `Semua proyek ${client} bersama WeaveLens.`,
    empty: "Belum ada proyek. Kami akan mengirim email begitu proyek pertamamu dibuat.",
    noClient:
      "Akunmu belum terhubung ke proyek mana pun. Hubungi admin WeaveLens lewat WhatsApp agar akunmu dihubungkan.",
    eventDate: (date: string) => `Acara ${date}`,
    planProgress: (done: number, total: number) =>
      `${done} dari ${total} tahap rencana kerja selesai`,
  },

  cms: {
    heading: "Konten website",
    intro:
      "Isi landing page weavelens.id. Setiap perubahan yang disimpan langsung tampil di website.",
  },

  dateEmpty: "—",
};
