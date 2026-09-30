"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProject } from "@/app/(portal)/admin/projects/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { workspaceText } from "@/content/workspace";

const text = workspaceText.projects;

export function ProjectDangerZone({ projectId, title }: { projectId: string; title: string }) {
  const router = useRouter();

  return (
    <section className="max-w-3xl rounded-2xl border border-danger/20 bg-paper p-5 md:p-6">
      <h2 className="text-lg">Hapus proyek</h2>
      <p className="mt-1 text-sm text-ink/70">{text.deleteDescription}</p>
      <ConfirmDialog
        trigger={
          <Button
            variant="outline"
            className="mt-4 border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 aria-hidden />
            Hapus proyek
          </Button>
        }
        title={text.deleteTitle(title)}
        description={text.deleteDescription}
        confirmLabel="Hapus permanen"
        onConfirm={async () => {
          const result = await deleteProject(projectId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(text.toast.deleted);
          router.replace("/admin/projects");
        }}
      />
    </section>
  );
}
