"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Copy,
  Loader2,
  MoreHorizontal,
  Printer,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteDraft,
  markDraft,
  markPaid,
  markSent,
  saveInvoice,
  voidInvoice,
} from "@/app/(portal)/admin/invoices/actions";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { FormSection } from "@/components/molecules/FormSection";
import { InvoiceItemsField } from "@/components/molecules/InvoiceItemsField";
import { PageHeader } from "@/components/molecules/PageHeader";
import { ScaledPage } from "@/components/molecules/ScaledPage";
import { InvoiceDocument } from "@/components/organisms/InvoiceDocument";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { invoiceText } from "@/content/invoice";
import { formatDate, todayJakarta } from "@/lib/format";
import {
  computeTotals,
  formatRupiah,
  formatThousands,
  newItemKey,
  parseRupiah,
  type CompanyInfo,
  type InvoiceDraft,
  type InvoiceItem,
} from "@/lib/invoice";
import { cn } from "@/lib/utils";

const text = invoiceText.editor;

export type ClientOption = {
  id: string;
  name: string;
  contactName: string | null;
  contact: string | null;
};

type InvoiceEditorProps = {
  id: string | null;
  initial: InvoiceDraft;
  company: CompanyInfo;
  clients: ClientOption[];
};

type FieldErrors = Partial<Record<"name" | "items" | "dueDate", string>>;

function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="font-heading font-semibold text-ink">
        {label}
      </Label>
      {children}
      {hint && <p className="text-sm text-ink/70">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Pemeriksaan yang sama dengan server, supaya pesan muncul tepat di kolomnya sebelum menyimpan. */
function validate(draft: InvoiceDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.billTo.name.trim()) errors.name = text.errors.name;
  if (!draft.items.some((item) => item.description.trim())) errors.items = text.errors.items;
  if (draft.dueDate < draft.issueDate) errors.dueDate = text.errors.dueDate;
  return errors;
}

export function InvoiceEditor({ id, initial, company, clients }: InvoiceEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [tab, setTab] = useState<"form" | "preview">("form");
  const [paidAt, setPaidAt] = useState(todayJakarta());
  const [saving, startSaving] = useTransition();
  const [mounted, setMounted] = useState(false);

  const locked = draft.status === "paid" || draft.status === "void";
  const dirty = JSON.stringify(draft) !== saved;
  const totals = useMemo(
    () => computeTotals(draft.items, draft.discount, draft.taxRate),
    [draft.items, draft.discount, draft.taxRate],
  );

  useEffect(() => setMounted(true), []);

  // Peringatan sebelum meninggalkan halaman dengan perubahan yang belum disimpan.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(patch: Partial<InvoiceDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateBillTo(patch: Partial<InvoiceDraft["billTo"]>) {
    setDraft((current) => ({ ...current, billTo: { ...current.billTo, ...patch } }));
    if (patch.name?.trim()) setErrors((current) => ({ ...current, name: undefined }));
  }

  function updateItem(key: string, patch: Partial<InvoiceItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
    if (patch.description?.trim()) setErrors((current) => ({ ...current, items: undefined }));
  }

  function addItem() {
    setDraft((current) => ({
      ...current,
      items: [...current.items, { key: newItemKey(), description: "", qty: 1, unitPrice: 0 }],
    }));
  }

  function removeItem(key: string) {
    const index = draft.items.findIndex((item) => item.key === key);
    const removed = draft.items[index];
    if (!removed) return;
    setDraft((current) => ({
      ...current,
      items: current.items.filter((item) => item.key !== key),
    }));
    toast(text.itemRemoved, {
      action: {
        label: text.undo,
        onClick: () =>
          setDraft((current) => {
            const items = [...current.items];
            items.splice(index, 0, removed);
            return { ...current, items };
          }),
      },
    });
  }

  function pickClient(clientId: string) {
    const client = clients.find((option) => option.id === clientId);
    if (!client) {
      update({ clientId: null });
      return;
    }
    update({
      clientId: client.id,
      billTo: {
        ...draft.billTo,
        name: client.contactName || client.name,
        company: client.contactName ? client.name : draft.billTo.company,
        contact: client.contact ?? draft.billTo.contact,
      },
    });
    setErrors((current) => ({ ...current, name: undefined }));
  }

  /** Simpan; mengembalikan nomor invoice jika berhasil. */
  async function save(): Promise<string | null> {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setTab("form");
      toast.error(Object.values(found)[0]);
      return null;
    }

    const result = await saveInvoice(id, {
      clientId: draft.clientId,
      issueDate: draft.issueDate,
      dueDate: draft.dueDate,
      billTo: draft.billTo,
      items: draft.items.map(({ description, qty, unitPrice }) => ({
        description,
        qty,
        unitPrice,
      })),
      discount: draft.discount,
      taxRate: draft.taxRate,
      notes: draft.notes,
      paymentMethods: draft.paymentMethods,
      paymentDetails: draft.paymentDetails,
      signerName: draft.signerName,
      signerRole: draft.signerRole,
    });
    if (!result.ok) {
      toast.error(result.error);
      return null;
    }

    const next = { ...draft, number: result.number };
    setDraft(next);
    setSaved(JSON.stringify(next));
    if (id) {
      toast.success(text.toast.updated);
      router.refresh();
    } else {
      toast.success(text.toast.saved(result.number));
      router.replace(`/admin/invoices/${result.id}`);
    }
    return result.number;
  }

  function handleSave() {
    startSaving(async () => {
      await save();
    });
  }

  /** Nomor invoice dibuat saat menyimpan, jadi draf baru/berubah disimpan dulu sebelum dicetak. */
  function handlePrint() {
    startSaving(async () => {
      if (!id || dirty) {
        const number = await save();
        if (!number) return;
      }
      toast.info(text.printHint);
      // Beri React satu frame untuk memperbarui dokumen cetak (nomor terbaru).
      requestAnimationFrame(() => window.print());
    });
  }

  async function runStatus(
    action: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
  ) {
    const result = await action();
    if (!result.ok) {
      toast.error(result.error ?? text.toast.failed);
      return false;
    }
    toast.success(success);
    router.refresh();
    return true;
  }

  function handleMarkSent() {
    if (!id) return;
    startSaving(async () => {
      const result = await markSent(id);
      if (!result.ok) {
        toast.error(text.toast.failed);
        return;
      }
      update({ status: "sent" });
      setSaved((current) => JSON.stringify({ ...JSON.parse(current), status: "sent" }));
      router.refresh();
      toast.success(text.toast.sent, {
        action: {
          label: text.undo,
          onClick: async () => {
            const undo = await markDraft(id);
            if (undo.ok) {
              update({ status: "draft" });
              setSaved((current) => JSON.stringify({ ...JSON.parse(current), status: "draft" }));
              router.refresh();
            }
          },
        },
      });
    });
  }

  const doc = <InvoiceDocument invoice={draft} company={company} />;
  const title = draft.number ? text.editTitle(draft.number) : text.newTitle;

  return (
    <>
      <PageHeader
        title={title}
        back={{ href: "/admin/invoices", label: text.back }}
        actions={<StatusBadge kind="invoice" status={draft.status} />}
      />

      {locked && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink/80"
        >
          {draft.status === "paid"
            ? text.readOnly.paid(draft.paidAt ? formatDate(draft.paidAt) : "")
            : text.readOnly.void}
        </p>
      )}

      {/* Tab hanya di HP/tablet; desktop menampilkan form dan pratinjau berdampingan. */}
      <div
        role="tablist"
        aria-label={title}
        className="mb-4 grid grid-cols-2 rounded-lg bg-sand p-1 lg:hidden"
      >
        {(["form", "preview"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "h-10 rounded-md font-heading text-sm font-semibold text-ink/75",
              tab === value && "bg-paper text-ink shadow-soft",
            )}
          >
            {text.tabs[value]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <fieldset
          disabled={locked}
          className={cn("grid content-start gap-5", tab !== "form" && "hidden lg:grid")}
        >
          <FormSection title={text.sections.billTo}>
            {clients.length > 0 && (
              <Field id="inv-client" label={text.pickClient}>
                <select
                  id="inv-client"
                  value={draft.clientId ?? ""}
                  onChange={(event) => pickClient(event.target.value)}
                  className="h-9 rounded-md border border-input bg-paper px-3 text-sm shadow-xs"
                >
                  <option value="">{text.pickClientNone}</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="inv-name" label={`${text.fields.name} *`} error={errors.name}>
                <Input
                  id="inv-name"
                  value={draft.billTo.name}
                  onChange={(event) => updateBillTo({ name: event.target.value })}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "inv-name-error" : undefined}
                />
              </Field>
              <Field id="inv-company" label={text.fields.company}>
                <Input
                  id="inv-company"
                  value={draft.billTo.company}
                  onChange={(event) => updateBillTo({ company: event.target.value })}
                />
              </Field>
            </div>
            <Field id="inv-contact" label={text.fields.contact}>
              <Input
                id="inv-contact"
                value={draft.billTo.contact}
                onChange={(event) => updateBillTo({ contact: event.target.value })}
              />
            </Field>
            <Field id="inv-address" label={text.fields.address}>
              <Textarea
                id="inv-address"
                rows={2}
                value={draft.billTo.address}
                onChange={(event) => updateBillTo({ address: event.target.value })}
              />
            </Field>
          </FormSection>

          <FormSection title={text.sections.items}>
            <InvoiceItemsField
              items={draft.items}
              disabled={locked}
              error={errors.items}
              onChange={updateItem}
              onAdd={addItem}
              onRemove={removeItem}
            />
            <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2 sm:items-end">
              <Field id="inv-discount" label={text.fields.discount}>
                <Input
                  id="inv-discount"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatThousands(draft.discount)}
                  onChange={(event) => update({ discount: parseRupiah(event.target.value) })}
                  className="text-right tabular-nums"
                />
              </Field>
              <label className="flex h-9 items-center gap-3 text-sm font-medium">
                <Switch
                  checked={draft.taxRate === 11}
                  onCheckedChange={(checked) => update({ taxRate: checked ? 11 : 0 })}
                />
                {text.fields.tax}
              </label>
            </div>
            <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 rounded-xl bg-canvas/70 p-4 text-sm tabular-nums">
              <dt className="text-ink/75">{invoiceText.document.subtotal}</dt>
              <dd className="text-right">{formatRupiah(totals.subtotal)}</dd>
              {totals.discount > 0 && (
                <>
                  <dt className="text-ink/75">{invoiceText.document.discount}</dt>
                  <dd className="text-right">− {formatRupiah(totals.discount)}</dd>
                </>
              )}
              {draft.taxRate > 0 && (
                <>
                  <dt className="text-ink/75">{invoiceText.document.tax(draft.taxRate)}</dt>
                  <dd className="text-right">{formatRupiah(totals.tax)}</dd>
                </>
              )}
              <dt className="mt-1 border-t border-line pt-2 font-heading font-semibold">Total</dt>
              <dd className="mt-1 border-t border-line pt-2 text-right font-heading text-base font-bold text-primary">
                {formatRupiah(totals.total)}
              </dd>
            </dl>
          </FormSection>

          <FormSection title={text.sections.dates}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="inv-issue" label={text.fields.issueDate}>
                <Input
                  id="inv-issue"
                  type="date"
                  value={draft.issueDate}
                  onChange={(event) => update({ issueDate: event.target.value })}
                />
              </Field>
              <Field id="inv-due" label={text.fields.dueDate} error={errors.dueDate}>
                <Input
                  id="inv-due"
                  type="date"
                  value={draft.dueDate}
                  min={draft.issueDate}
                  onChange={(event) => {
                    update({ dueDate: event.target.value });
                    setErrors((current) => ({ ...current, dueDate: undefined }));
                  }}
                  aria-invalid={Boolean(errors.dueDate)}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              {[7, 14, 30].map((days) => (
                <Button
                  key={days}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => update({ dueDate: addDays(draft.issueDate, days) })}
                >
                  Jatuh tempo +{days} hari
                </Button>
              ))}
            </div>
          </FormSection>

          <FormSection title={text.sections.payment}>
            <Field id="inv-methods" label={text.fields.paymentMethods}>
              <Input
                id="inv-methods"
                value={draft.paymentMethods}
                onChange={(event) => update({ paymentMethods: event.target.value })}
              />
            </Field>
            <Field id="inv-details" label={text.fields.paymentDetails}>
              <Textarea
                id="inv-details"
                rows={2}
                value={draft.paymentDetails}
                onChange={(event) => update({ paymentDetails: event.target.value })}
              />
            </Field>
          </FormSection>

          <FormSection title={text.sections.signer}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="inv-signer" label={text.fields.signerName}>
                <Input
                  id="inv-signer"
                  value={draft.signerName}
                  onChange={(event) => update({ signerName: event.target.value })}
                />
              </Field>
              <Field id="inv-role" label={text.fields.signerRole}>
                <Input
                  id="inv-role"
                  value={draft.signerRole}
                  onChange={(event) => update({ signerRole: event.target.value })}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title={text.sections.notes}>
            <Field id="inv-notes" label={text.fields.notes}>
              <Textarea
                id="inv-notes"
                rows={3}
                value={draft.notes}
                onChange={(event) => update({ notes: event.target.value })}
              />
            </Field>
          </FormSection>
        </fieldset>

        <div className={cn("lg:block", tab !== "preview" && "hidden")}>
          <div className="lg:sticky lg:top-8">
            <ScaledPage label={`${text.tabs.preview} ${title}`}>{doc}</ScaledPage>
          </div>
        </div>
      </div>

      {/* Bar aksi menempel di bawah: selalu terjangkau, di HP maupun desktop. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 px-4 py-3 md:px-8">
          <p className="mr-auto hidden text-sm text-ink/75 sm:block" aria-live="polite">
            {dirty && !locked ? text.unsaved : `Total ${formatRupiah(totals.total)}`}
          </p>

          {id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Aksi lain">
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => router.push(`/admin/invoices/new?from=${id}`)}>
                  <Copy aria-hidden />
                  {text.duplicate}
                </DropdownMenuItem>
                {draft.status === "draft" && (
                  <DropdownMenuItem onSelect={handleMarkSent} disabled={dirty}>
                    <Send aria-hidden />
                    {text.markSent}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {id && draft.status === "draft" && (
            <ConfirmDialog
              trigger={
                <Button
                  variant="ghost"
                  className="text-danger hover:bg-danger-soft hover:text-danger"
                  aria-label={text.deleteDraft}
                >
                  <Trash2 aria-hidden />
                  <span className="hidden sm:inline">{text.deleteDraft}</span>
                </Button>
              }
              title={text.confirm.deleteTitle}
              description={text.confirm.deleteDescription}
              confirmLabel={text.deleteDraft}
              onConfirm={async () => {
                const result = await deleteDraft(id);
                if (!result.ok) {
                  toast.error(text.toast.failed);
                  return;
                }
                setSaved(JSON.stringify(draft));
                toast.success(text.toast.deleted);
                router.replace("/admin/invoices");
              }}
            />
          )}

          {id && (draft.status === "sent" || draft.status === "paid") && (
            <ConfirmDialog
              trigger={
                <Button
                  variant="ghost"
                  className="text-danger hover:bg-danger-soft hover:text-danger"
                  aria-label={text.void}
                >
                  <Ban aria-hidden />
                  <span className="hidden sm:inline">{text.void}</span>
                </Button>
              }
              title={text.confirm.voidTitle}
              description={text.confirm.voidDescription}
              confirmLabel={text.void}
              onConfirm={async () => {
                if (await runStatus(() => voidInvoice(id), text.toast.voided))
                  update({ status: "void" });
              }}
            />
          )}

          {id && (draft.status === "draft" || draft.status === "sent") && (
            <ConfirmDialog
              tone="primary"
              trigger={
                <Button variant="outline" disabled={dirty} aria-label={text.markPaid}>
                  <CheckCircle2 aria-hidden />
                  <span className="hidden sm:inline">{text.markPaid}</span>
                </Button>
              }
              title={text.confirm.paidTitle}
              description={text.confirm.paidDescription}
              confirmLabel={text.markPaid}
              onConfirm={async () => {
                if (await runStatus(() => markPaid(id, paidAt), text.toast.paid)) {
                  update({ status: "paid", paidAt });
                }
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="paid-at">{text.confirm.paidDate}</Label>
                <Input
                  id="paid-at"
                  type="date"
                  value={paidAt}
                  max={todayJakarta()}
                  onChange={(event) => setPaidAt(event.target.value)}
                />
              </div>
            </ConfirmDialog>
          )}

          <Button variant="outline" onClick={handlePrint} disabled={saving}>
            <Printer aria-hidden />
            <span className="hidden sm:inline">{text.print}</span>
            <span className="sm:hidden">PDF</span>
          </Button>

          {!locked && (
            <Button onClick={handleSave} disabled={saving || (!dirty && Boolean(id))}>
              {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
              {saving ? (
                text.saving
              ) : (
                <>
                  <span className="sm:hidden">Simpan</span>
                  <span className="hidden sm:inline">{id ? text.saveChanges : text.save}</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Salinan untuk dicetak: langsung di bawah <body>, disembunyikan di layar. */}
      {mounted && createPortal(<div className="print-root">{doc}</div>, document.body)}
    </>
  );
}
