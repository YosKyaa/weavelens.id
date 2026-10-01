"use client";

import { useMemo, useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CalendarDays, MessageSquare, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { moveContent } from "@/app/(portal)/admin/projects/actions";
import { ContentCreate } from "@/components/organisms/ContentCreate";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { statuses } from "@/content/portal";
import {
  FORMATS,
  STAGES,
  formatLabels,
  stageHints,
  workspaceText,
  type ContentFormat,
  type Stage,
} from "@/content/workspace";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const text = workspaceText.board;

export type BoardBrand = { id: string; name: string; color: string };

export type BoardItem = {
  id: string;
  title: string;
  stage: Stage;
  format: ContentFormat;
  sort: number;
  brandId: string | null;
  dueDate: string | null;
  publishDate: string | null;
  versions: number;
  openComments: number;
  thumbnail: string | null;
};

type ContentBoardProps = {
  projectId: string;
  items: BoardItem[];
  brands: BoardBrand[];
};

function stageLabel(stage: Stage): string {
  return statuses.stage[stage].label;
}

/** Nilai urut di antara dua kartu tetangga (tanpa menomori ulang semua kartu). */
function sortBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return Date.now();
  if (before === undefined) return after! - 1000;
  if (after === undefined) return before + 1000;
  return (before + after) / 2;
}

export function ContentBoard({ projectId, items: initialItems, brands }: ContentBoardProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [dragging, setDragging] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [, startTransition] = useTransition();

  // Data server terbaru menggantikan state lokal setelah router.refresh().
  const [lastInitial, setLastInitial] = useState(initialItems);
  if (initialItems !== lastInitial) {
    setLastInitial(initialItems);
    setItems(initialItems);
  }

  const brandById = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands]);
  const visible = items.filter(
    (item) =>
      (brandFilter === "all" ||
        (brandFilter === "none" ? !item.brandId : item.brandId === brandFilter)) &&
      (formatFilter === "all" || item.format === formatFilter),
  );
  const columns = STAGES.map((stage) => ({
    stage,
    cards: visible.filter((item) => item.stage === stage).sort((a, b) => a.sort - b.sort),
  }));

  function move(id: string, stage: Stage, beforeId?: string) {
    const current = items.find((item) => item.id === id);
    if (!current) return;
    const column = items
      .filter((item) => item.stage === stage && item.id !== id)
      .sort((a, b) => a.sort - b.sort);
    const index = beforeId ? column.findIndex((item) => item.id === beforeId) : column.length;
    const sort = sortBetween(column[index - 1]?.sort, column[index]?.sort);
    if (current.stage === stage && current.sort === sort) return;

    const previous = items;
    setItems((list) => list.map((item) => (item.id === id ? { ...item, stage, sort } : item)));
    startTransition(async () => {
      const result = await moveContent(projectId, id, stage, sort);
      if (!result.ok) {
        setItems(previous);
        toast.error(result.error);
        return;
      }
      if (current.stage !== stage) toast.success(text.moved(stageLabel(stage)));
      router.refresh();
    });
  }

  function onDrop(event: DragEvent, stage: Stage, beforeId?: string) {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData("text/plain");
    setDragging(null);
    setOverStage(null);
    if (id && id !== beforeId) move(id, stage, beforeId);
  }

  const filterClass =
    "h-10 rounded-md border border-input bg-paper px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {brands.length > 0 && (
          <select
            value={brandFilter}
            onChange={(event) => setBrandFilter(event.target.value)}
            aria-label="Filter brand"
            className={filterClass}
          >
            <option value="all">{text.allBrands}</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
            <option value="none">{text.noBrand}</option>
          </select>
        )}
        <select
          value={formatFilter}
          onChange={(event) => setFormatFilter(event.target.value)}
          aria-label="Filter format"
          className={filterClass}
        >
          <option value="all">{text.allFormats}</option>
          {FORMATS.map((format) => (
            <option key={format} value={format}>
              {formatLabels[format]}
            </option>
          ))}
        </select>
        <p className="hidden text-sm text-ink/60 lg:block">{text.dragHint}</p>
        <div className="ml-auto">
          <ContentCreate projectId={projectId} brands={brands} stage="brief" />
        </div>
      </div>

      {/* Kolom bisa digeser menyamping di HP; di desktop lebar penuh. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0">
        <div className="grid w-max auto-cols-[16.5rem] grid-flow-col gap-3 min-[1800px]:w-full min-[1800px]:auto-cols-fr">
          {columns.map(({ stage, cards }) => (
            <section
              key={stage}
              aria-labelledby={`col-${stage}`}
              onDragOver={(event) => {
                event.preventDefault();
                setOverStage(stage);
              }}
              onDragLeave={() => setOverStage((current) => (current === stage ? null : current))}
              onDrop={(event) => onDrop(event, stage)}
              className={cn(
                "flex min-h-72 flex-col gap-2 rounded-2xl border border-line bg-sand/35 p-2 transition-colors",
                overStage === stage && dragging && "border-primary bg-brand-soft",
              )}
            >
              <header className="flex items-center justify-between gap-2 px-2 pt-1">
                <div>
                  <h2 id={`col-${stage}`} className="font-heading text-sm font-semibold text-ink">
                    {stageLabel(stage)}
                    <span className="ml-1.5 font-normal text-ink/60">{cards.length}</span>
                  </h2>
                  <p className="text-xs text-ink/60">{stageHints[stage]}</p>
                </div>
                <ContentCreate projectId={projectId} brands={brands} stage={stage} compact />
              </header>

              <ol className="flex flex-1 flex-col gap-2">
                {cards.map((item) => {
                  const brand = item.brandId ? brandById.get(item.brandId) : null;
                  return (
                    <li
                      key={item.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", item.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDragging(item.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setOverStage(null);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => onDrop(event, stage, item.id)}
                      className={cn(
                        "group relative rounded-xl border border-line bg-paper shadow-xs transition-shadow hover:shadow-soft",
                        dragging === item.id && "opacity-50",
                      )}
                    >
                      <Link
                        href={`/admin/projects/${projectId}/content/${item.id}`}
                        className="flex flex-col gap-2 rounded-xl p-3 pr-10"
                      >
                        {item.thumbnail && (
                          <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-placeholder">
                            <Image
                              src={item.thumbnail}
                              alt=""
                              fill
                              sizes="272px"
                              unoptimized
                              className="object-cover"
                            />
                          </span>
                        )}
                        <span className="flex flex-wrap items-center gap-1.5 text-xs">
                          {brand && (
                            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-canvas px-2 py-0.5 font-semibold whitespace-nowrap text-ink">
                              <span
                                aria-hidden
                                className="size-2 rounded-full"
                                style={{ backgroundColor: brand.color }}
                              />
                              {brand.name}
                            </span>
                          )}
                          <span className="rounded-full border border-line px-2 py-0.5 text-ink/75">
                            {formatLabels[item.format]}
                          </span>
                        </span>
                        <span className="font-medium text-ink">{item.title}</span>
                        <span className="flex flex-wrap items-center gap-3 text-xs text-ink/65">
                          {item.dueDate && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays aria-hidden className="size-3.5" />
                              {formatDate(item.dueDate)}
                            </span>
                          )}
                          {item.versions > 0 && <span>{text.versions(item.versions)}</span>}
                          {item.openComments > 0 && (
                            <span className="inline-flex items-center gap-1 font-semibold text-primary">
                              <MessageSquare aria-hidden className="size-3.5" />
                              {text.comments(item.openComments)}
                            </span>
                          )}
                        </span>
                      </Link>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="absolute top-2 right-2"
                            aria-label={`${text.moveTo}: ${item.title}`}
                          >
                            <MoreHorizontal aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{text.moveTo}</DropdownMenuLabel>
                          {STAGES.filter((target) => target !== stage).map((target) => (
                            <DropdownMenuItem key={target} onSelect={() => move(item.id, target)}>
                              {stageLabel(target)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
                {cards.length === 0 && (
                  <li className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-ink/55">
                    <Plus aria-hidden className="mr-1 size-3.5" />
                    {text.empty}
                  </li>
                )}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
