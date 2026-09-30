"use client";

import { CreateDialog } from "@/components/organisms/CreateDialog";
import { GalleryForm } from "@/components/organisms/GalleryForm";
import { workspaceText } from "@/content/workspace";

export function GalleryCreate({
  projectId,
  serviceAccount,
}: {
  projectId: string;
  serviceAccount: string | null;
}) {
  return (
    <CreateDialog label={workspaceText.galleries.create} title={workspaceText.galleries.create}>
      {(close) => (
        <GalleryForm
          projectId={projectId}
          galleryId={null}
          serviceAccount={serviceAccount}
          initial={{ title: "", driveFolder: "", maxSelection: "", deadline: "" }}
          onCreated={close}
        />
      )}
    </CreateDialog>
  );
}
