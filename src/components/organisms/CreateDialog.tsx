"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CreateDialogProps = {
  label: string;
  title: string;
  description?: string;
  /** Form di dalam dialog; terima fungsi `close` untuk menutup setelah berhasil. */
  children: (close: () => void) => ReactNode;
  size?: "default" | "lg";
};

/** Tombol "Tambah …" yang membuka form singkat dalam dialog. */
export function CreateDialog({
  label,
  title,
  description,
  children,
  size = "lg",
}: CreateDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size}>
          <Plus aria-hidden />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription className="text-ink/75">{description}</DialogDescription>
        ) : (
          <DialogDescription className="sr-only">{title}</DialogDescription>
        )}
        {children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}
