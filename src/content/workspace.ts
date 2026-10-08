/**
 * Teks workspace: klien & brand, proyek, papan konten, link akses, galeri seleksi, dan
 * halaman yang dibuka klien. Istilah untuk klien sengaja tanpa jargon internal (SPEC-PORTAL A7).
 */

export const STAGES = [
  "brief",
  "in_progress",
  "client_review",
  "revision",
  "approved",
  "published",
] as const;
export type Stage = (typeof STAGES)[number];

export const stageHints: Record<Stage, string> = {
  brief: "Ide & kebutuhan dari klien",
  in_progress: "Sedang didesain / diedit tim",
  client_review: "Menunggu persetujuan klien",
  revision: "Klien minta revisi",
  approved: "Siap dijadwalkan",
  published: "Sudah tayang",
};

export const FORMATS = ["feed", "carousel", "story", "reels", "other"] as const;
export type ContentFormat = (typeof FORMATS)[number];

export const formatLabels: Record<ContentFormat, string> = {
  feed: "Feed",
  carousel: "Carousel",
  story: "Story",
  reels: "Reels",
  other: "Lainnya",
};

/** Rasio bingkai pratinjau per format, supaya klien melihat hasil seperti di Instagram. */
export const formatAspect: Record<ContentFormat, string> = {
  feed: "aspect-[4/5]",
  carousel: "aspect-[4/5]",
  story: "aspect-[9/16]",
  reels: "aspect-[9/16]",
  other: "aspect-square",
};

export const PROJECT_TYPES = ["design", "photo", "video", "mixed"] as const;

export const BRAND_COLORS = ["#74342b", "#2f6b3a", "#1f4e79", "#8a5a00", "#6b2f6b", "#3d3d3d"];

export const workspaceText = {
  clients: {
    title: "Klien & brand",
    description: "Satu klien bisa punya beberapa brand, mis. grup yang mengelola 4 perusahaan.",
    create: "Tambah klien",
    search: "Cari klien atau kontak…",
    empty: "Belum ada klien. Tambahkan klien pertama untuk mulai membuat proyek.",
    detailBack: "Semua klien",
    fields: {
      name: "Nama klien / grup",
      contactName: "Nama PIC",
      contactEmail: "Email PIC",
      contactPhone: "WhatsApp PIC",
    },
    brands: {
      title: "Brand",
      description: "Setiap konten ditandai brand-nya. Link akses bisa dibatasi per brand.",
      add: "Tambah brand",
      name: "Nama brand",
      color: "Warna penanda",
      instagram: "Akun Instagram",
      empty: "Belum ada brand. Tambahkan jika klien punya lebih dari satu perusahaan/akun.",
      removeTitle: (name: string) => `Hapus brand “${name}”?`,
      removeDescription:
        "Konten yang memakai brand ini tetap ada, hanya penanda brand-nya yang dilepas. Link akses khusus brand ini ikut dihapus.",
    },
    deleteTitle: (name: string) => `Hapus klien “${name}”?`,
    deleteDescription:
      "Klien beserta semua brand, proyek, konten, dan galeri miliknya dihapus permanen. Invoice tetap disimpan.",
    toast: {
      saved: "Data klien tersimpan.",
      created: "Klien ditambahkan.",
      deleted: "Klien dihapus.",
      brandSaved: "Brand tersimpan.",
      brandDeleted: "Brand dihapus.",
    },
  },

  projects: {
    title: "Proyek & konten",
    teamTitle: "Proyek saya",
    teamDescription: "Proyek yang ditugaskan admin kepadamu.",
    teamEmpty: "Belum ada proyek yang ditugaskan kepadamu. Hubungi admin.",
    description: "Buat proyek, susun konten di papan kerja, lalu kirim link ke klien untuk review.",
    create: "Buat proyek",
    back: "Semua proyek",
    fields: {
      client: "Klien",
      title: "Nama proyek",
      titlePlaceholder: "Mis. Konten Instagram Oktober 2026",
      type: "Jenis proyek",
      eventDate: "Tanggal acara / tayang (opsional)",
      description: "Catatan untuk tim & klien (opsional)",
      status: "Status proyek",
    },
    noClients: "Tambahkan klien dulu sebelum membuat proyek.",
    tabs: {
      board: "Papan konten",
      galleries: "Galeri seleksi",
      plan: "Rencana kerja",
      report: "Laporan",
      share: "Link klien",
      activity: "Aktivitas",
      team: "Tim",
      settings: "Pengaturan",
    },
    deleteTitle: (title: string) => `Hapus proyek “${title}”?`,
    deleteDescription:
      "Semua konten, versi desain, komentar, galeri, dan link klien di proyek ini dihapus permanen.",
    toast: {
      created: "Proyek dibuat.",
      saved: "Proyek tersimpan.",
      deleted: "Proyek dihapus.",
    },
  },

  board: {
    add: "Tambah konten",
    addIn: (stage: string) => `Tambah konten di ${stage}`,
    allBrands: "Semua brand",
    allFormats: "Semua format",
    empty: "Kosong",
    noDesign: "Belum ada desain",
    moveTo: "Pindahkan ke",
    dragHint: "Seret kartu untuk memindahkan tahap, atau pakai menu ⋯ di kartu.",
    moved: (stage: string) => `Dipindah ke ${stage}.`,
    versions: (count: number) => `${count} versi`,
    comments: (count: number) => `${count} komentar`,
    noBrand: "Tanpa brand",
  },

  content: {
    back: "Papan konten",
    newTitle: "Konten baru",
    fields: {
      title: "Judul konten",
      titlePlaceholder: "Mis. Promo akhir bulan — slide 1–5",
      brand: "Brand",
      format: "Format",
      stage: "Tahap",
      dueDate: "Tenggat desain",
      publishDate: "Rencana tayang",
      brief: "Brief / arahan",
      caption: "Caption",
    },
    save: "Simpan konten",
    saved: "Konten tersimpan.",
    created: "Konten ditambahkan ke papan.",
    deleteTitle: (title: string) => `Hapus konten “${title}”?`,
    deleteDescription: "Konten beserta semua versi desain dan komentarnya dihapus permanen.",
    deleted: "Konten dihapus.",
    versions: {
      title: "Versi desain",
      upload: "Unggah versi baru",
      uploadHint:
        "Gambar (JPG/PNG/WebP), PDF, atau video MP4 maks. 50 MB per file. Carousel: pilih beberapa file sekaligus sesuai urutan slide.",
      externalLabel: "Atau tempel link video (Google Drive) untuk file di atas 50 MB",
      note: "Catatan untuk klien (opsional)",
      notePlaceholder: "Mis. Sudah sesuai revisi: logo diperbesar, warna teks diganti.",
      submit: "Kirim ke klien",
      uploading: (done: number, total: number) => `Mengunggah ${done}/${total}…`,
      sent: (version: number) => `Versi ${version} dikirim. Konten pindah ke “Menunggu review”.`,
      empty: "Belum ada versi. Unggah desain pertama untuk dikirim ke klien.",
      label: (version: number) => `Versi ${version}`,
      decided: (status: string, name: string) => `${status} oleh ${name}`,
      tooLarge: (name: string) =>
        `${name} lebih dari 50 MB. Unggah ke Google Drive lalu tempel link-nya.`,
      badType: (name: string) => `${name} bukan gambar, PDF, atau MP4.`,
      needFile: "Pilih file atau tempel link video dulu.",
    },
    comments: {
      title: "Komentar",
      empty: "Belum ada komentar di versi ini.",
      general: "Komentar umum",
      pin: (index: number) => `Titik ${index}`,
      resolve: "Tandai selesai",
      reopen: "Buka lagi",
      resolved: "Selesai",
      add: "Tulis komentar",
      addPlaceholder: "Tulis balasan atau catatan untuk klien…",
      send: "Kirim",
      team: "Tim WeaveLens",
    },
  },

  plan: {
    title: "Rencana kerja",
    description: "Tahapan yang dilihat klien sebagai timeline progres.",
    add: "Tambah tahap",
    titleField: "Nama tahap",
    dueField: "Target tanggal",
    empty: "Belum ada rencana kerja. Tambahkan tahapan supaya klien bisa memantau progres.",
    statuses: { planned: "Direncanakan", in_progress: "Dikerjakan", done: "Selesai" },
    saved: "Rencana kerja tersimpan.",
    deleted: "Tahap dihapus.",
  },

  share: {
    title: "Link akses klien",
    description:
      "Klien membuka link tanpa perlu login. Buat link terpisah per brand supaya PIC tiap perusahaan hanya melihat kontennya.",
    create: "Buat link",
    label: "Nama link",
    labelPlaceholder: "Mis. PIC Brand A — Ibu Sari",
    scope: "Yang bisa dilihat",
    scopeAll: "Semua brand di proyek ini",
    canReview: "Boleh menyetujui & minta revisi",
    expires: "Berlaku sampai (opsional)",
    copy: "Salin link",
    copied: "Link disalin. Kirim ke klien lewat WhatsApp.",
    whatsapp: "Kirim via WhatsApp",
    waMessage: (project: string, url: string) =>
      `Halo! Ini link untuk memantau progres dan review "${project}" dari WeaveLens:\n${url}\n\nTidak perlu login. Kalau ada revisi, klik titik di desainnya lalu tulis komentarnya ya.`,
    revoke: "Cabut link",
    revokeTitle: "Cabut link ini?",
    revokeDescription:
      "Siapa pun yang memegang link ini langsung kehilangan akses. Buat link baru jika perlu dibagikan ulang.",
    revoked: "Link dicabut.",
    created: "Link dibuat dan disalin.",
    empty: "Belum ada link. Buat satu untuk dikirim ke klien.",
    status: { active: "Aktif", revoked: "Dicabut", expired: "Kedaluwarsa" },
    lastOpened: (date: string) => `Terakhir dibuka ${date}`,
    neverOpened: "Belum pernah dibuka",
    viewOnly: "Hanya lihat",
  },

  galleries: {
    title: "Seleksi foto & video",
    description:
      "Kirim foto/video mentah dari Google Drive, klien memilih yang akan diedit, lalu kirim hasilnya.",
    create: "Buat galeri",
    empty: "Belum ada galeri. Buat galeri dari proyek dokumentasi untuk mulai seleksi.",
    back: "Semua galeri",
    fields: {
      project: "Proyek",
      title: "Nama galeri",
      titlePlaceholder: "Mis. Wisuda Sesi 1 — Foto mentah",
      driveFolder: "Link folder Google Drive (file mentah)",
      driveFolderHint:
        "Bagikan folder ke email service account sebagai Editor, lalu tempel link-nya di sini.",
      maxSelection: "Maksimal pilihan",
      maxSelectionHint: "Jumlah foto/video yang akan diedit. Kosongkan jika tidak dibatasi.",
      deadline: "Batas waktu memilih (opsional)",
      editedFolder: "Link folder hasil edit",
    },
    steps: {
      uploading: "1. Unggah file mentah ke folder Drive, lalu klik Sinkronkan.",
      ready: "2. Periksa isi galeri, lalu buka seleksi untuk klien.",
      selecting: "3. Klien sedang memilih. Kamu bisa melihat pilihannya secara langsung.",
      selection_closed: "4. Pilihan terkirim. Unduh daftar file untuk diedit.",
      editing: "5. Unggah hasil edit ke Drive, lalu kirim ke klien.",
      delivered: "Selesai. Klien sudah menerima link hasil edit.",
    },
    sync: "Sinkronkan dari Drive",
    syncing: "Menyinkronkan…",
    synced: (added: number, total: number) => `${added} file baru. Total ${total} file di galeri.`,
    syncSkipped: (count: number) =>
      `${count} file dilewati (bukan foto/video atau file RAW tanpa pratinjau).`,
    driveMissing:
      "Google Drive belum terhubung. Isi GOOGLE_SERVICE_ACCOUNT_JSON di Vercel (panduan ada di README-PORTAL.md).",
    openSelection: "Buka seleksi untuk klien",
    openSelectionDescription:
      "Klien dengan link proyek bisa mulai memilih. Folder Drive dibuat bisa dilihat oleh siapa pun yang punya link, supaya video bisa diputar.",
    closeSelection: "Tutup seleksi",
    reopenSelection: "Buka ulang seleksi",
    markEditing: "Mulai edit",
    deliver: "Kirim hasil edit",
    deliverDescription:
      "Klien akan melihat tombol untuk membuka folder hasil edit. Pastikan semua file sudah ada di folder tersebut.",
    downloadList: "Unduh daftar file (.txt)",
    copyNames: "Salin nama file",
    copiedNames: "Nama file disalin. Tempel di kolom filter Lightroom.",
    selectedCount: (count: number, max: number | null) =>
      max ? `${count} dari ${max} dipilih` : `${count} dipilih`,
    filters: { all: "Semua", selected: "Dipilih", unselected: "Belum dipilih" },
    deleteTitle: (title: string) => `Hapus galeri “${title}”?`,
    deleteDescription:
      "Galeri dan pilihan klien dihapus dari portal. File di Google Drive TIDAK ikut terhapus.",
    toast: {
      created: "Galeri dibuat.",
      saved: "Galeri tersimpan.",
      deleted: "Galeri dihapus.",
      opened: "Seleksi dibuka. Kirim link proyek ke klien.",
      closed: "Seleksi ditutup.",
      editing: "Status: sedang diedit.",
      delivered: "Hasil edit dikirim ke klien.",
    },
    noteLabel: "Catatan klien",
    video: "Video",
  },

  activity: {
    title: "Aktivitas",
    empty: "Belum ada aktivitas.",
    actions: {
      "content.created": "menambahkan konten",
      "content.moved": "memindahkan konten",
      "content.published": "menandai konten tayang",
      "content.assigned": "menugaskan konten",
      "project.duplicated": "membuat proyek ini dari duplikat",
      "version.uploaded": "mengunggah versi baru",
      "version.approved": "menyetujui desain",
      "version.changes_requested": "meminta revisi",
      "comment.added": "menulis komentar",
      "selection.submitted": "mengirim pilihan foto",
      "gallery.delivered": "mengirim hasil edit",
      "gallery.synced": "menyinkronkan galeri dari Drive",
      "share.opened": "membuka link",
    } as Record<string, string>,
  },
};

/** Teks halaman yang dibuka klien lewat link. */
export const shareText = {
  metaTitle: (project: string) => `${project} — WeaveLens`,
  invalid: {
    title: "Link tidak bisa dibuka",
    body: "Link ini sudah dicabut, kedaluwarsa, atau salah ketik. Minta link terbaru ke admin WeaveLens.",
  },
  askName: {
    title: "Sebelum mulai, siapa nama kamu?",
    body: "Nama ini muncul di komentar dan persetujuan supaya tim tahu siapa yang memberi masukan.",
    label: "Nama",
    placeholder: "Mis. Sari (Marketing Brand A)",
    submit: "Lanjut",
    change: "Ganti nama",
  },
  greeting: (name: string) => `Halo, ${name}`,
  tabs: { content: "Konten", galleries: "Galeri foto & video", plan: "Progres" },
  progress: {
    title: "Progres",
    summary: (approved: number, total: number) => `${approved} dari ${total} konten disetujui`,
    waiting: (count: number) =>
      count > 0 ? `${count} konten menunggu review kamu` : "Tidak ada yang menunggu review",
  },
  content: {
    empty:
      "Belum ada konten di sini. Kami akan mengabarkan lewat WhatsApp begitu desain pertama siap.",
    waitingFirst: "Perlu review kamu",
    noVersion: "Desain sedang dikerjakan",
    open: "Buka & review",
    back: "Semua konten",
    versionOf: (version: number, total: number) => `Versi ${version} dari ${total}`,
    latest: "terbaru",
    pinHint: "Klik bagian desain yang ingin direvisi untuk menaruh titik komentar.",
    pinHintTouch: "Ketuk bagian desain untuk menaruh titik komentar.",
    commentLabel: "Komentar",
    commentPlaceholder: "Mis. Tolong logo dibuat lebih besar.",
    addComment: "Tambah komentar",
    pinComment: (index: number) => `Komentar untuk titik ${index}`,
    cancelPin: "Batal",
    approve: "Setujui desain",
    approveTitle: "Setujui versi ini?",
    approveDescription:
      "Tim akan menyiapkan konten ini untuk tayang. Keputusan ini tidak bisa diubah dari halaman ini.",
    approved: "Terima kasih! Desain disetujui.",
    requestRevision: "Minta revisi",
    revisionTitle: "Kirim permintaan revisi?",
    revisionDescription: (count: number) =>
      `${count} komentar akan dikirim ke tim. Kamu akan mendapat versi baru di halaman ini.`,
    revisionNeedsComment:
      "Tambahkan minimal satu komentar dulu supaya tim tahu apa yang perlu diubah.",
    revisionSent: "Permintaan revisi terkirim ke tim.",
    commentSent: "Komentar terkirim.",
    decidedApproved: "Disetujui",
    decidedRevision: "Revisi diminta",
    readOnly: "Link ini hanya untuk melihat. Hubungi admin jika perlu memberi persetujuan.",
    caption: "Caption",
    publishDate: "Rencana tayang",
    openVideo: "Buka video",
    design: "Desain",
    commentFor: "Komentar untuk",
    commentCaption: "Komentari",
    captionComment: "Komentar untuk caption",
    captionPlaceholder: 'Mis. Ganti kata "promo" jadi "diskon" di kalimat pertama.',
    compareWith: (version: number) => `Bandingkan dengan versi ${version}`,
    compareOff: "Selesai membandingkan",
    noFile: "Tidak ada file di versi ini.",
    nextDesign: "Lanjut ke desain berikutnya.",
    startReview: (count: number) => `Mulai review (${count} desain)`,
    queue: {
      label: "Mode review",
      position: (index: number, total: number) => `${index} dari ${total}`,
      previous: "Desain sebelumnya yang menunggu review",
      next: "Desain berikutnya yang menunggu review",
      more: (count: number) => `Tersimpan. Masih ada ${count} desain yang menunggu review kamu.`,
      done: "Semua desain sudah kamu review. Terima kasih!",
      continue: "Lanjut review",
    },
    slide: (index: number, total: number) => `Slide ${index} dari ${total}`,
  },
  gallery: {
    empty: "Belum ada galeri untuk dipilih.",
    statusHint: {
      ready: "Galeri sedang disiapkan.",
      selecting: "Pilih foto/video yang ingin diedit.",
      selection_closed: "Pilihan kamu sudah terkirim. Tim sedang memprosesnya.",
      editing: "Tim sedang mengedit pilihan kamu.",
      delivered: "Hasil edit sudah siap.",
    } as Record<string, string>,
    open: "Buka galeri",
    counter: (count: number, max: number | null) =>
      max ? `${count} / ${max} dipilih` : `${count} dipilih`,
    limitReached: (max: number) =>
      `Batas ${max} pilihan sudah tercapai. Batalkan pilihan lain untuk mengganti.`,
    select: "Pilih",
    selected: "Dipilih",
    note: "Catatan untuk editor",
    notePlaceholder: "Mis. Tolong hapus orang di kiri.",
    noteSaved: "Catatan tersimpan.",
    submit: "Kirim pilihan",
    submitTitle: (count: number) => `Kirim ${count} pilihan ke tim?`,
    submitDescription: "Setelah dikirim, pilihan tidak bisa diubah lagi dari halaman ini.",
    submitted: "Pilihan terkirim. Terima kasih!",
    deadline: (date: string) => `Pilih sebelum ${date}`,
    closed: "Seleksi sudah ditutup.",
    downloadEdited: "Buka hasil edit",
    play: "Putar video",
    previous: "Sebelumnya",
    next: "Berikutnya",
    close: "Tutup",
    filters: { all: "Semua", selected: "Dipilih", unselected: "Belum dipilih" },
    keyboardHint: "Panah kiri/kanan untuk berpindah, spasi untuk memilih.",
  },
  plan: {
    empty: "Rencana kerja belum dibuat.",
  },
  footer: "Portal klien WeaveLens",
};
