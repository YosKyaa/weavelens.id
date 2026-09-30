import "server-only";
import { cookies } from "next/headers";

/** Nama tamu (pemegang link) disimpan di cookie supaya tidak perlu diketik ulang di setiap aksi. */
export const GUEST_COOKIE = "wl_guest_name";

export async function getGuestName(): Promise<string | null> {
  const value = (await cookies()).get(GUEST_COOKIE)?.value;
  if (!value) return null;
  try {
    const name = decodeURIComponent(value).trim();
    return name.length > 0 && name.length <= 60 ? name : null;
  } catch {
    return null;
  }
}
