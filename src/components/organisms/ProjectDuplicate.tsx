"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { duplicateProject } from "@/app/(portal)/admin/projects/actions";
import { Field, selectClass } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayJakarta } from "@/lib/format";
import { nextPeriodTitle } from "@/lib/month-title";

type ProjectDuplicateProps = {
  projectId: string;
  title: string;
  eventDate: string | null;
  counts: { plan: number; content: number; members: number };
};

const PERIODS = [
  { value: 1, label: "Bulan berikutnya (+1 bulan)" },
  { value: 2, label: "+2 bulan" },
  { value: 3, label: "+3 bulan" },
  { value: 0, label: "Tanggal sama (salinan biasa)" },
];

/** Salin proyek ke periode berikutnya — untuk retainer bulanan, cukup sekali klik tiap bulan. */
export function ProjectDuplicate({ projectId, title, eventDate, counts }: ProjectDuplicateProps) {
  const router = useRouter();
  const base = eventDate ?? todayJakarta();
  const [months, setMonths] = useState(1);
  const [name, setName] = useState(() => nextPeriodTitle(title, 1, base));
  const [touched, setTouched] = useState(false);
  const [copyPlan, setCopyPlan] = useState(counts.plan > 0);
  const [copyContent, setCopyContent] = useState(false);
  const [copyMembers, setCopyMembers] = useState(counts.members > 0);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function changePeriod(value: number) {
    setMonths(value);
    if (!touched) setName(nextPeriodTitle(title, value, base));
  }

  function submit() {
    startTransition(async () => {
      const result = await duplicateProject(projectId, {
        title: name,
        months,
        copyPlan,
        copyContent,
        copyMembers,
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(`Proyek "${name}" dibuat.`);
      router.push(`/admin/projects/${result.id}`);
    });
  }

  const options = [
    {
      checked: copyPlan,
      set: setCopyPlan,
      label: `Rencana kerja (${counts.plan} tahap)`,
      hint: "Status kembali ke Direncanakan, tanggal ikut digeser.",
      disabled: counts.plan === 0,
    },
    {
      checked: copyContent,
      set: setCopyContent,
      label: `Daftar konten sebagai Brief (${counts.content} konten)`,
      hint: "Judul, format, brand, brief, penanggung jawab & tanggal. Desain dan komentar tidak ikut.",
      disabled: counts.content === 0,
    },
    {
      checked: copyMembers,
      set: setCopyMembers,
      label: `Anggota tim (${counts.members} orang)`,
      hint: "Tim yang sama langsung bisa mengerjakan proyek baru.",
      disabled: counts.members === 0,
    },
  ];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_15rem]">
        <Field id="duplicate-title" label="Nama proyek baru" required error={error}>
          <Input
            id="duplicate-title"
            value={name}
            onChange={(event) => {
              setTouched(true);
              setName(event.target.value);
            }}
          />
        </Field>
        <Field id="duplicate-period" label="Periode">
          <select
            id="duplicate-period"
            value={months}
            onChange={(event) => changePeriod(Number(event.target.value))}
            className={selectClass}
          >
            {PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset className="grid gap-3">
        <legend className="mb-1 font-heading font-semibold text-ink">Ikut disalin</legend>
        {options.map((option) => (
          <label
            key={option.label}
            className="flex items-start gap-3 text-sm aria-disabled:opacity-50"
            aria-disabled={option.disabled || undefined}
          >
            <input
              type="checkbox"
              checked={option.checked && !option.disabled}
              disabled={option.disabled}
              onChange={(event) => option.set(event.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="block font-medium text-ink">{option.label}</span>
              <span className="block text-ink/65">{option.hint}</span>
            </span>
          </label>
        ))}
        <p className="text-sm text-ink/65">
          Klien, brand, jenis proyek, deskripsi, dan logo selalu ikut. Link klien baru dibuat
          otomatis.
        </p>
      </fieldset>
      <div>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <CopyPlus aria-hidden />}
          Buat proyek baru
        </Button>
      </div>
    </form>
  );
}
