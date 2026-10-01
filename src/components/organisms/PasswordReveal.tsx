"use client";

import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { teamText } from "@/content/team";

const text = teamText.password;

type PasswordRevealProps = {
  /** `null` = dialog tertutup. */
  credential: { name: string; email: string; password: string } | null;
  onClose: () => void;
};

/** Menampilkan password sementara SEKALI, dengan tombol salin & kirim WhatsApp. */
export function PasswordReveal({ credential, onClose }: PasswordRevealProps) {
  async function copy() {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential.password);
      toast.success(text.copied);
    } catch {
      toast.error("Browser menolak menyalin. Salin manual dari kotak di atas.");
    }
  }

  const message = credential
    ? text.message(credential.name, credential.email, credential.password, window.location.origin)
    : "";

  return (
    <Dialog open={credential !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{text.title}</DialogTitle>
        <DialogDescription className="text-ink/75">
          {credential && text.description(credential.name)}
        </DialogDescription>
        {credential && (
          <div className="grid gap-2 rounded-xl bg-canvas p-4">
            <p className="text-sm text-ink/70">{credential.email}</p>
            <p className="font-mono text-lg font-semibold tracking-wide break-all select-all">
              {credential.password}
            </p>
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={copy}>
              <Copy aria-hidden />
              {text.copy}
            </Button>
            <Button asChild variant="outline">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden />
                {text.whatsapp}
              </a>
            </Button>
          </div>
          <Button onClick={onClose}>{text.done}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
