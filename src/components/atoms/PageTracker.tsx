"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sendEvent } from "@/lib/beacon";

/** Mencatat satu tampilan halaman setiap kali path berubah (termasuk navigasi client-side). */
export function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    sendEvent("pageview");
  }, [pathname]);

  return null;
}
