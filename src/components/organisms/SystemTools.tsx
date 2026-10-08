"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DatabaseBackup, Download, Loader2, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  backupDownloadUrl,
  clearErrorLog,
  runBackupNow,
  sendTestEmail,
} from "@/app/(portal)/admin/settings/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Button } from "@/components/ui/button";

export function TestEmailButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await sendTestEmail();
          if (result.ok) toast.success("Email uji terkirim ke email akunmu.");
          else toast.error(result.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Mail aria-hidden />}
      Kirim email uji
    </Button>
  );
}

export function BackupNowButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await runBackupNow();
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Backup selesai.");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <DatabaseBackup aria-hidden />}
      {pending ? "Membuat backup…" : "Backup sekarang"}
    </Button>
  );
}

export function BackupDownload({ name }: { name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Unduh backup ${name}`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await backupDownloadUrl(name);
          if (!result.ok) toast.error(result.error);
          else window.location.assign(result.url);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
    </Button>
  );
}

export function ClearErrorsButton() {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm" className="text-danger hover:text-danger">
          <Trash2 aria-hidden />
          Kosongkan log
        </Button>
      }
      title="Kosongkan log error?"
      description="Semua catatan error dihapus. Error baru tetap tercatat."
      confirmLabel="Kosongkan"
      onConfirm={async () => {
        const result = await clearErrorLog();
        if (!result.ok) toast.error(result.error);
        else router.refresh();
      }}
    />
  );
}
