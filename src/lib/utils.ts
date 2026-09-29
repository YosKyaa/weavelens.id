import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Lebar konten standar semua section. */
export const container = "mx-auto w-full max-w-6xl px-4 md:px-6";

/** Padding vertikal standar semua section. */
export const sectionSpacing = "py-20 md:py-28";
