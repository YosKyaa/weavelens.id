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
    return [{ source: "/admin/login", destination: "/login", permanent: true }];
  },
};

export default nextConfig;
