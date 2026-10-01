"use client";

import { useState } from "react";
import { Copy, KeyRound, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ResendAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: { name: string; email: string; phone: string | null };
  /** Login Google aktif → pesan menyarankan "Masuk dengan Google". */
  google: boolean;
  /** Buka alur "buat password sementara" (password lama tidak bisa ditampilkan ulang). */
  onNewPassword: () => void;
};

/** "0812-3456 789" / "+62 812…" → "62812…"; kosong jika bukan nomor HP Indonesia yang wajar. */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return /^62\d{8,13}$/.test(local) ? local : "";
}

function accessMessage(name: string, email: string, origin: string, google: boolean): string {
  const firstName = name.split(" ")[0] || name;
  return [
    `Halo ${firstName}! Ini akses portal WeaveLens kamu:`,
    "",
    `Link: ${origin}/login`,
    `Email: ${email}`,
    "",
    google
      ? 'Masuk lewat tombol "Masuk dengan Google" memakai email di atas, atau dengan password yang sudah kamu punya.'
      : "Masuk dengan email di atas dan password yang sudah kamu punya.",
    "Lupa password? Balas pesan ini, nanti kami buatkan password sementara.",
  ].join("\n");
}

/**
 * Kirim ulang info akses lewat WhatsApp tanpa mengubah password.
 * Nomor HP opsional: kosong = pilih kontak sendiri di WhatsApp.
 */
export function ResendAccessDialog({
  open,
  onOpenChange,
  member,
  google,
  onNewPassword,
}: ResendAccessDialogProps) {
  const [phone, setPhone] = useState(member.phone ?? "");
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const message = accessMessage(member.name, member.email, origin, google);
  const number = normalizePhone(phone);
  const waHref = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Pesan disalin.");
    } catch {
      toast.error("Browser menolak menyalin. Salin manual dari kotak pesan.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogTitle>Kirim ulang akses ke {member.name}</DialogTitle>
        <DialogDescription className="text-ink/75">
          Kirim link masuk dan email akunnya lewat WhatsApp. Password tidak ikut dikirim dan tidak
          berubah.
        </DialogDescription>

        <Field
          id="resend-phone"
          label="Nomor WhatsApp (opsional)"
          hint={
            phone && !number
              ? "Format nomor belum benar, mis. 0812xxxxxxx. Kosongkan untuk memilih kontak di WhatsApp."
              : "Kosongkan untuk memilih kontak sendiri di WhatsApp."
          }
        >
          <Input
            id="resend-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            placeholder="0812xxxxxxx"
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <div className="grid gap-1.5">
          <p className="text-sm font-semibold text-ink">Isi pesan</p>
          <p className="rounded-xl bg-canvas p-3 text-sm whitespace-pre-line text-ink/85">
            {message}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden />
              Kirim via WhatsApp
            </a>
          </Button>
          <Button variant="outline" onClick={copy}>
            <Copy aria-hidden />
            Salin pesan
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <p className="text-sm text-ink/70">Anggota lupa password?</p>
          <Button variant="ghost" size="sm" onClick={onNewPassword}>
            <KeyRound aria-hidden />
            Buat password sementara
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
