"use client";

import { ClientForm } from "@/components/organisms/ClientForm";
import { CreateDialog } from "@/components/organisms/CreateDialog";
import { workspaceText } from "@/content/workspace";

const text = workspaceText.clients;

export function ClientCreate() {
  return (
    <CreateDialog label={text.create} title={text.create}>
      {(close) => (
        <ClientForm
          clientId={null}
          initial={{ name: "", contactName: "", contactEmail: "", contactPhone: "" }}
          onCreated={close}
        />
      )}
    </CreateDialog>
  );
}
