"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Memuat ulang data halaman tiap [seconds] detik selama foto belum sampai dari booth. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
