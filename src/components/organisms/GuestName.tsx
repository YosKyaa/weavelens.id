"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { setGuestName } from "@/app/share/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shareText } from "@/content/workspace";

const text = shareText.askName;

/**
 * Nama pemegang link: tampil sebagai sapaan jika sudah diisi, atau form singkat jika belum.
 * Tidak memblokir melihat-lihat; nama baru diperlukan saat memberi komentar/persetujuan/pilihan.
 */
export function GuestName({ name }: { name: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!name);
  const [value, setValue] = useState(name ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await setGuestName(value);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing && name) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-ink/80">
        <UserRound aria-hidden className="size-4 text-primary" />
        {shareText.greeting(name)}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {text.change}
        </button>
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) save();
      }}
      className="grid gap-2 rounded-2xl border border-primary/25 bg-brand-soft/50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
    >
      <div className="grid gap-1.5">
        <label htmlFor="guest-name" className="font-heading text-sm font-semibold text-ink">
          {text.title}
        </label>
        <p id="guest-name-hint" className="text-sm text-ink/75">
          {text.body}
        </p>
        <Input
          id="guest-name"
          value={value}
          autoComplete="name"
          placeholder={text.placeholder}
          aria-describedby="guest-name-hint"
          onChange={(event) => setValue(event.target.value)}
          className="bg-paper"
        />
      </div>
      <Button type="submit" disabled={pending || !value.trim()}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {text.submit}
      </Button>
    </form>
  );
}
