import type { NextConfig } from "next";

/** Foto yang diunggah dari admin disajikan dari Supabase Storage. */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  // CMS dulu punya halaman login sendiri; sekarang satu pintu untuk portal.
  async redirects() {
    // URL lama (bahasa Indonesia) tetap berfungsi untuk bookmark yang sudah tersimpan.
    return [
      { source: "/admin/login", destination: "/login", permanent: true },
      { source: "/admin/analitik", destination: "/admin/analytics", permanent: true },
      { source: "/admin/invoice/baru", destination: "/admin/invoices/new", permanent: true },
      { source: "/admin/invoice/:path*", destination: "/admin/invoices/:path*", permanent: true },
      { source: "/admin/invoice", destination: "/admin/invoices", permanent: true },
      { source: "/admin/konten/:path*", destination: "/admin/cms/:path*", permanent: true },
      { source: "/admin/konten", destination: "/admin/cms", permanent: true },
      { source: "/c/:path*", destination: "/client/:path*", permanent: true },
      { source: "/c", destination: "/client", permanent: true },
    ];
  },
};

export default nextConfig;
