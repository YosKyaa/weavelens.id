"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteClient } from "@/app/(portal)/admin/clients/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { workspaceText } from "@/content/workspace";

const text = workspaceText.clients;

export function ClientDangerZone({ clientId, name }: { clientId: string; name: string }) {
  const router = useRouter();

  return (
    <section className="rounded-2xl border border-danger/20 bg-paper p-5 md:p-6 xl:col-span-2">
      <h2 className="text-lg">Hapus klien</h2>
      <p className="mt-1 text-sm text-ink/70">{text.deleteDescription}</p>
      <ConfirmDialog
        trigger={
          <Button
            variant="outline"
            className="mt-4 border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 aria-hidden />
            Hapus klien
          </Button>
        }
        title={text.deleteTitle(name)}
        description={text.deleteDescription}
        confirmLabel="Hapus permanen"
        onConfirm={async () => {
          const result = await deleteClient(clientId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(text.toast.deleted);
          router.replace("/admin/clients");
        }}
      />
    </section>
  );
}
