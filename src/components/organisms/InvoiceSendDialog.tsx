"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Mail, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import {
  ensureInvoiceLink,
  markSent,
  sendInvoiceEmail,
} from "@/app/(portal)/admin/invoices/actions";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { formatRupiah } from "@/lib/invoice";
import { cn } from "@/lib/utils";

type Channel = "whatsapp" | "email";

type InvoiceSendDialogProps = {
  id: string;
  number: string;
  total: number;
  dueDate: string;
  status: string;
  /** Nama penerima & kontak (dari "Ditagihkan kepada" / data klien) untuk isian awal. */
  recipientName: string;
  contacts: string[];
  emailEnabled: boolean;
  disabled?: boolean;
};

/** "0812-3456 789" / "+62 812…" → "62812…"; kosong jika bukan nomor HP Indonesia yang wajar. */
function toWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return /^62\d{8,13}$/.test(local) ? local : "";
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Kirim invoice ke klien lewat WhatsApp atau email, berisi link lihat & unduh PDF. */
export function InvoiceSendDialog({
  id,
  number,
  total,
  dueDate,
  status,
  recipientName,
  contacts,
  emailEnabled,
  disabled,
}: InvoiceSendDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [phone, setPhone] = useState(contacts.find((value) => toWhatsApp(value)) ?? "");
  const [email, setEmail] = useState(contacts.find(isEmail) ?? "");
  const [message, setMessage] = useState("");
  const [markAsSent, setMarkAsSent] = useState(status === "draft");
  const [pending, startTransition] = useTransition();

  function buildMessage(url: string) {
    const name = recipientName.trim().split(" ")[0] || "Bapak/Ibu";
    return [
      `Halo ${name}, berikut invoice ${number} dari WeaveLens sebesar ${formatRupiah(total)}, jatuh tempo ${formatDate(dueDate)}.`,
      "",
      `Lihat & unduh PDF: ${url}`,
      "",
      "Terima kasih atas kerja samanya.",
    ].join("\n");
  }

  function openDialog() {
    setOpen(true);
    if (link) return;
    startTransition(async () => {
      const result = await ensureInvoiceLink(id);
      if (!result.ok) {
        toast.error(result.error);
        setOpen(false);
        return;
      }
      const url = `${window.location.origin}/invoice/${result.token}`;
      setLink(url);
      setMessage(buildMessage(url));
    });
  }

  async function afterSent() {
    if (markAsSent && status === "draft") await markSent(id);
    router.refresh();
  }

  function sendEmail() {
    if (!link) return;
    startTransition(async () => {
      const result = await sendInvoiceEmail(id, { to: email, message, link });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invoice ${number} terkirim ke ${email}.`);
      setOpen(false);
      router.refresh();
    });
  }

  const waNumber = toWhatsApp(phone);
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

  return (
    <>
      <Button variant="outline" onClick={openDialog} disabled={disabled}>
        <Send aria-hidden />
        <span className="hidden sm:inline">Kirim ke klien</span>
        <span className="sm:hidden">Kirim</span>
      </Button>
      <Dialog open={open} onOpenChange={(value) => !pending && setOpen(value)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>Kirim invoice {number}</DialogTitle>
          <DialogDescription className="text-ink/75">
            Klien menerima link untuk melihat dan mengunduh PDF invoice tanpa perlu login.
          </DialogDescription>

          {!link ? (
            <p className="flex items-center gap-2 py-6 text-sm text-ink/70">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Menyiapkan link invoice…
            </p>
          ) : (
            <div className="grid gap-4">
              <div
                role="radiogroup"
                aria-label="Kirim lewat"
                className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1"
              >
                {(
                  [
                    ["whatsapp", "WhatsApp", MessageCircle],
                    ["email", "Email", Mail],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={channel === value}
                    onClick={() => setChannel(value)}
                    className={cn(
                      "inline-flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium text-ink/70",
                      channel === value && "bg-paper text-ink shadow-xs",
                    )}
                  >
                    <Icon aria-hidden className="size-4" />
                    {label}
                  </button>
                ))}
              </div>

              {channel === "whatsapp" ? (
                <Field
                  id="invoice-wa"
                  label="Nomor WhatsApp klien (opsional)"
                  hint={
                    phone && !waNumber
                      ? "Format nomor belum benar, mis. 0812xxxxxxx. Kosongkan untuk memilih kontak di WhatsApp."
                      : "Kosongkan untuk memilih kontak sendiri di WhatsApp."
                  }
                >
                  <Input
                    id="invoice-wa"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    placeholder="0812xxxxxxx"
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </Field>
              ) : (
                <Field
                  id="invoice-email"
                  label="Email klien"
                  hint={
                    emailEnabled
                      ? undefined
                      : "Email belum aktif (Resend belum disetup). Sementara kirim lewat WhatsApp."
                  }
                >
                  <Input
                    id="invoice-email"
                    type="email"
                    value={email}
                    placeholder="nama@perusahaan.com"
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={!emailEnabled}
                  />
                </Field>
              )}

              <Field id="invoice-message" label="Pesan">
                <Textarea
                  id="invoice-message"
                  rows={7}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </Field>

              {channel === "whatsapp" && status === "draft" && (
                <label className="flex items-center gap-2 text-sm text-ink/80">
                  <input
                    type="checkbox"
                    checked={markAsSent}
                    onChange={(event) => setMarkAsSent(event.target.checked)}
                    className="size-4 accent-primary"
                  />
                  Tandai invoice sebagai terkirim
                </label>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      toast.success("Link invoice disalin.");
                    } catch {
                      toast.error("Browser menolak menyalin.");
                    }
                  }}
                >
                  <Copy aria-hidden />
                  Salin link
                </Button>
                {channel === "whatsapp" ? (
                  <Button asChild>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        setOpen(false);
                        void afterSent();
                      }}
                    >
                      <MessageCircle aria-hidden />
                      Buka WhatsApp
                    </a>
                  </Button>
                ) : (
                  <Button
                    onClick={sendEmail}
                    disabled={pending || !emailEnabled || !isEmail(email) || !message.trim()}
                  >
                    {pending ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <Mail aria-hidden />
                    )}
                    Kirim email
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
