"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deletePlanItem,
  movePlanItem,
  savePlanItem,
  type PlanInput,
} from "@/app/(portal)/admin/projects/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { PlanImport } from "@/components/organisms/PlanImport";
import { selectClass } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workspaceText } from "@/content/workspace";

const text = workspaceText.plan;

export type PlanRow = {
  id: string;
  title: string;
  dueDate: string | null;
  status: "planned" | "in_progress" | "done";
};

function PlanRowEditor({
  projectId,
  row,
  isFirst,
  isLast,
}: {
  projectId: string;
  row: PlanRow;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<PlanInput>({
    title: row.title,
    dueDate: row.dueDate ?? "",
    status: row.status,
  });
  const [pending, startTransition] = useTransition();

  function save(next: PlanInput) {
    setValues(next);
    startTransition(async () => {
      const result = await savePlanItem(projectId, row.id, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(text.saved);
      router.refresh();
    });
  }

  return (
    <li className="grid gap-2 rounded-xl border border-line bg-paper p-3 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_auto] sm:items-center">
      <Input
        aria-label={text.titleField}
        value={values.title}
        onChange={(event) => setValues({ ...values, title: event.target.value })}
        onBlur={() => values.title !== row.title && save(values)}
      />
      <Input
        type="date"
        aria-label={text.dueField}
        value={values.dueDate ?? ""}
        onChange={(event) => save({ ...values, dueDate: event.target.value })}
      />
      <select
        aria-label="Status"
        value={values.status}
        onChange={(event) => save({ ...values, status: event.target.value as PlanRow["status"] })}
        className={selectClass}
      >
        {Object.entries(text.statuses).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="flex items-center justify-end gap-1">
        {pending && <Loader2 aria-hidden className="size-4 animate-spin text-ink/60" />}
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isFirst}
          aria-label={`Naikkan ${row.title}`}
          onClick={() =>
            startTransition(async () => {
              await movePlanItem(projectId, row.id, -1);
              router.refresh();
            })
          }
        >
          <ArrowUp aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isLast}
          aria-label={`Turunkan ${row.title}`}
          onClick={() =>
            startTransition(async () => {
              await movePlanItem(projectId, row.id, 1);
              router.refresh();
            })
          }
        >
          <ArrowDown aria-hidden />
        </Button>
        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-danger hover:bg-danger-soft hover:text-danger"
              aria-label={`Hapus ${row.title}`}
            >
              <Trash2 aria-hidden />
            </Button>
          }
          title={`Hapus tahap “${row.title}”?`}
          description="Tahap ini hilang dari timeline progres yang dilihat klien."
          confirmLabel="Hapus tahap"
          onConfirm={async () => {
            const result = await deletePlanItem(projectId, row.id);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(text.deleted);
            router.refresh();
          }}
        />
      </div>
    </li>
  );
}

/** Rencana kerja: perubahan tersimpan otomatis per kolom, klien melihatnya sebagai timeline. */
export function PlanEditor({ projectId, rows }: { projectId: string; rows: PlanRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const result = await savePlanItem(projectId, null, { title, dueDate: "", status: "planned" });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setTitle("");
      toast.success(text.saved);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink/70">
          {rows.length === 0 ? text.empty : "Perubahan tersimpan otomatis."}
        </p>
        <PlanImport projectId={projectId} existing={rows} />
      </div>
      <ol className="grid gap-2">
        {rows.map((row, index) => (
          <PlanRowEditor
            key={`${row.id}-${row.title}-${row.status}-${row.dueDate}`}
            projectId={projectId}
            row={row}
            isFirst={index === 0}
            isLast={index === rows.length - 1}
          />
        ))}
      </ol>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim()) add();
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <Input
          aria-label={text.titleField}
          value={title}
          placeholder="Mis. Desain 12 feed & 8 story"
          onChange={(event) => setTitle(event.target.value)}
          className="bg-paper"
        />
        <Button type="submit" variant="outline" disabled={pending || !title.trim()}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
          {text.add}
        </Button>
      </form>
    </div>
  );
}
