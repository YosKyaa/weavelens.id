import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminRowActions } from "@/components/molecules/AdminRowActions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CMS_BASE, displayValue, type CmsCollection } from "@/lib/cms/collections";
import { cn } from "@/lib/utils";

type AdminCollectionTableProps = {
  collection: CmsCollection;
  rows: Record<string, unknown>[];
};

/** Daftar item satu koleksi, urut sesuai tampilan di website. */
export function AdminCollectionTable({ collection, rows }: AdminCollectionTableProps) {
  const newHref = `${CMS_BASE}/${collection.slug}/baru`;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line px-6 py-16 text-center">
        <p className="text-muted-foreground">Belum ada {collection.singular}.</p>
        <Button asChild>
          <Link href={newHref}>
            <Plus aria-hidden />
            Tambah {collection.singular}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-paper">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>{collection.label}</TableHead>
            <TableHead className="hidden text-right md:table-cell">
              <span className="sr-only">Aksi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const id = String(row.id);
            const title = displayValue(
              collection,
              collection.titleField,
              row[collection.titleField],
            );
            const subtitle = collection.subtitleField
              ? displayValue(collection, collection.subtitleField, row[collection.subtitleField])
              : "";
            const image = collection.imageField ? row[collection.imageField] : null;
            const visible = row.visible !== false;
            const actions = (
              <AdminRowActions
                slug={collection.slug}
                id={id}
                title={title}
                visible={visible}
                isFirst={index === 0}
                isLast={index === rows.length - 1}
              />
            );

            return (
              <TableRow key={id} className={cn(!visible && "bg-muted/30")}>
                <TableCell className="text-center font-heading font-semibold text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="max-w-0 whitespace-normal">
                  <Link
                    href={`${CMS_BASE}/${collection.slug}/${encodeURIComponent(id)}`}
                    className="flex items-center gap-3 rounded-md hover:underline"
                  >
                    {collection.imageField && (
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-placeholder">
                        {typeof image === "string" && image && (
                          <Image src={image} alt="" fill sizes="48px" className="object-cover" />
                        )}
                      </span>
                    )}
                    <span className={cn("min-w-0", !visible && "opacity-60")}>
                      <span className="line-clamp-2 font-medium text-ink">{title || "—"}</span>
                      {subtitle && (
                        <span className="line-clamp-1 text-sm text-muted-foreground">
                          {subtitle}
                        </span>
                      )}
                    </span>
                  </Link>
                  {/* Di layar kecil aksi pindah ke bawah judul supaya tabel tidak melebar. */}
                  <div className="mt-2 md:hidden">{actions}</div>
                </TableCell>
                <TableCell className="hidden w-px md:table-cell">{actions}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
