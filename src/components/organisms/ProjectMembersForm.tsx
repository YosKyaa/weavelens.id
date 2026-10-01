"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { setProjectMembers } from "@/app/(portal)/admin/team/actions";
import { Button } from "@/components/ui/button";
import { teamText } from "@/content/team";
import { cn } from "@/lib/utils";

const text = teamText.assign;

export type TeamOption = { id: string; name: string; projects: number };

type MemberPickerProps = {
  options: TeamOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

/** Daftar centang anggota tim (dipakai di tab Tim proyek dan saat membuat proyek). */
export function MemberPicker({ options, selected, onChange }: MemberPickerProps) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-ink/70">
        {text.empty}{" "}
        <Link href="/admin/team" className="font-medium text-primary underline">
          Buka Tim & akses
        </Link>
      </p>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const checked = selected.includes(option.id);
        return (
          <li key={option.id}>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3 transition-colors hover:border-sand-deep",
                checked && "border-primary bg-brand-soft/40",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked ? selected.filter((id) => id !== option.id) : [...selected, option.id],
                  )
                }
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border border-line bg-paper peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
                  checked && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {checked && <Check className="size-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{option.name}</span>
                <span className="block text-xs text-ink/65">
                  {option.projects} proyek ditugaskan
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export function ProjectMembersForm({
  projectId,
  options,
  initial,
}: {
  projectId: string;
  options: TeamOption[];
  initial: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initial);
  const [saved, setSaved] = useState([...initial].sort().join());
  const [pending, startTransition] = useTransition();
  const dirty = [...selected].sort().join() !== saved;

  function save() {
    startTransition(async () => {
      const result = await setProjectMembers(projectId, selected);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved([...selected].sort().join());
      toast.success(text.saved);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <MemberPicker options={options} selected={selected} onChange={setSelected} />
      {options.length > 0 && (
        <div>
          <Button onClick={save} disabled={pending || !dirty}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
            {text.save}
          </Button>
        </div>
      )}
    </div>
  );
}
