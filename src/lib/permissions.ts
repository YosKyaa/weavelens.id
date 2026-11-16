/**
 * Izin yang bisa diberikan ke peran tim. Admin selalu punya semuanya.
 * Invoice, Pengaturan, dan Tim & akses sengaja TIDAK ada di sini: tetap khusus admin.
 * Daftar ini harus sama dengan constraint team_roles_permissions_check (terakhir di supabase/migrations/0012_booth.sql).
 */
export const PERMISSIONS = [
  {
    key: "projects.all",
    label: "Semua proyek",
    description: "Melihat & mengerjakan semua proyek tanpa perlu ditugaskan satu per satu.",
  },
  {
    key: "projects.manage",
    label: "Kelola proyek",
    description: "Membuat, mengubah, dan menghapus proyek, serta menugaskan tim.",
  },
  {
    key: "clients",
    label: "Klien & brand",
    description: "Menambah dan mengubah data klien serta brand.",
  },
  {
    key: "cms",
    label: "Konten website (CMS)",
    description: "Mengubah testimoni, galeri, layanan, harga, FAQ, dan kontak di weavelens.id.",
  },
  {
    key: "analytics",
    label: "Analitik website",
    description: "Melihat jumlah pengunjung dan klik WhatsApp.",
  },
  {
    key: "booth",
    label: "Photobooth",
    description: "Mengelola event, paket, frame, voucher, perangkat, dan transaksi WeaveLens Booth.",
  },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS = PERMISSIONS.map((item) => item.key) as Permission[];

export function permissionLabel(key: string): string {
  return PERMISSIONS.find((item) => item.key === key)?.label ?? key;
}
