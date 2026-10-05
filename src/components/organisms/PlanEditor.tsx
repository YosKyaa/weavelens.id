"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpDown, GripVertical, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  deletePlanItem,
  deletePlanItems,
  reorderPlanItems,
  savePlanItem,
  type PlanInput,
} from "@/app/(portal)/admin/projects/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { selectClass } from "@/components/molecules/Field";
import { PlanImport } from "@/components/organisms/PlanImport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workspaceText } from "@/content/workspace";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const text = workspaceText.plan;

export type PlanRow = {
  id: string;
  title: string;
  dueDate: string | null;
  status: "planned" | "in_progress" | "done";
};

const STATUS_TONE: Record<PlanRow["status"], string> = {
  planned: "bg-canvas text-ink/70",
  in_progress: "bg-brand-soft text-primary",
  done: "bg-success-soft text-success",
};

/** Satu tahap (mode biasa): ubah langsung, tersimpan otomatis; bisa dicentang untuk hapus massal. */
function PlanRowEditor({
  projectId,
  row,
  selected,
  onToggle,
}: {
  projectId: string;
  row: PlanRow;
  selected: boolean;
  onToggle: () => void;
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
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border border-line bg-paper p-3 transition-colors",
        selected && "border-primary bg-brand-soft/30",
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        aria-label={`Pilih ${row.title}`}
        className="mt-3 size-4 shrink-0 accent-primary"
      />
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_9rem_auto] sm:items-center">
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
      </div>
    </li>
  );
}

/** Satu tahap di mode "Ubah urutan": hanya bisa diseret (lewat pegangan), tidak diedit. */
function SortableRow({ row, index }: { row: PlanRow; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-line bg-paper p-2 pr-4",
        isDragging && "relative z-10 border-primary shadow-lift",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Seret untuk memindahkan ${row.title}`}
        className="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-ink/55 hover:bg-canvas hover:text-ink active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-5" />
      </button>
      <span className="w-6 shrink-0 text-center text-sm text-ink/50 tabular-nums">{index + 1}</span>
      <span className="min-w-0 flex-1 truncate font-medium text-ink">{row.title}</span>
      {row.dueDate && (
        <span className="hidden shrink-0 text-sm text-ink/65 sm:inline">
          {formatDate(row.dueDate)}
        </span>
      )}
      <span
        className={cn(
          "hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline",
          STATUS_TONE[row.status],
        )}
      >
        {text.statuses[row.status]}
      </span>
    </li>
  );
}

/**
 * Rencana kerja: edit langsung (tersimpan otomatis), pilih banyak untuk dihapus,
 * dan mode "Ubah urutan" untuk menyeret tahapan lalu menyimpan urutannya.
 */
export function PlanEditor({ projectId, rows }: { projectId: string; rows: PlanRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  // `null` = mode biasa; berisi daftar = sedang mengubah urutan (belum disimpan).
  const [ordering, setOrdering] = useState<PlanRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Pilihan yang masih ada (baris yang sudah terhapus otomatis lepas).
  const chosen = selected.filter((id) => rows.some((row) => row.id === id));
  const allChosen = rows.length > 0 && chosen.length === rows.length;
  const changed = ordering !== null && ordering.some((row, index) => row.id !== rows[index]?.id);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

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

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrdering((current) => {
      if (!current) return current;
      const from = current.findIndex((row) => row.id === active.id);
      const to = current.findIndex((row) => row.id === over.id);
      return arrayMove(current, from, to);
    });
  }

  function saveOrder() {
    if (!ordering) return;
    startTransition(async () => {
      const result = await reorderPlanItems(
        projectId,
        ordering.map((row) => row.id),
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Urutan rencana kerja tersimpan.");
      setOrdering(null);
      router.refresh();
    });
  }

  // ── Mode ubah urutan ──
  if (ordering) {
    return (
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-brand-soft/40 px-4 py-3">
          <p className="inline-flex items-center gap-2 text-sm text-ink">
            <GripVertical aria-hidden className="size-4 text-primary" />
            Seret baris lewat pegangan di kiri untuk mengubah urutan, lalu simpan.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOrdering(null)} disabled={pending}>
              <X aria-hidden />
              Batal
            </Button>
            <Button onClick={saveOrder} disabled={pending || !changed}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
              Simpan urutan
            </Button>
          </div>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={ordering.map((row) => row.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="grid gap-2">
              {ordering.map((row, index) => (
                <SortableRow key={row.id} row={row} index={index} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  // ── Mode biasa ──
  return (
    <div className="grid gap-3">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
        {chosen.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{chosen.length} dipilih</span>
            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 aria-hidden />
                  Hapus terpilih
                </Button>
              }
              title={`Hapus ${chosen.length} tahap?`}
              description="Tahapan yang dipilih hilang dari timeline progres yang dilihat klien."
              confirmLabel={`Hapus ${chosen.length} tahap`}
              onConfirm={async () => {
                const result = await deletePlanItems(projectId, chosen);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success(`${result.deleted} tahap dihapus.`);
                setSelected([]);
                router.refresh();
              }}
            />
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Batal pilih
            </Button>
          </div>
        ) : (
          <p className="text-sm text-ink/70">
            {rows.length === 0 ? text.empty : "Perubahan tersimpan otomatis."}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelected([]);
              setOrdering(rows);
            }}
            disabled={rows.length < 2}
          >
            <ArrowUpDown aria-hidden />
            Ubah urutan
          </Button>
          <PlanImport projectId={projectId} existing={rows} />
        </div>
      </div>

      {rows.length > 0 && (
        <label className="inline-flex w-fit items-center gap-3 px-3 text-sm text-ink/75">
          <input
            type="checkbox"
            checked={allChosen}
            ref={(element) => {
              if (element) element.indeterminate = chosen.length > 0 && !allChosen;
            }}
            onChange={() => setSelected(allChosen ? [] : rows.map((row) => row.id))}
            className="size-4 accent-primary"
          />
          Pilih semua
        </label>
      )}

      <ol className="grid gap-2">
        {rows.map((row) => (
          <PlanRowEditor
            key={`${row.id}-${row.title}-${row.status}-${row.dueDate}`}
            projectId={projectId}
            row={row}
            selected={chosen.includes(row.id)}
            onToggle={() => toggle(row.id)}
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
