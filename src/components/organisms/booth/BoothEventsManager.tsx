"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteBoothPackage,
  saveBoothEvent,
  saveBoothPackage,
  type PackageInput,
} from "@/app/(portal)/admin/booth/actions";
import { EmptyState } from "@/components/atoms/EmptyState";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LAYOUTS, LAYOUT_KEYS, type Layout } from "@/lib/booth/frames";
import {
  DEFAULT_PROFILE,
  FILTERS,
  formatRupiah,
  OUTPUTS,
  PAY_MODES,
  type OutputKind,
  type ProfileForm,
} from "@/lib/booth/profile";
import { CheckList, NumberField, SelectField, SwitchRow } from "./BoothFields";

export type BoothEventView = { id: string; name: string; active: boolean; profile: ProfileForm };
export type BoothPackageView = {
  id: string;
  eventId: string;
  name: string;
  price: number;
  output: OutputKind;
  printCopies: number;
  layouts: Layout[];
  active: boolean;
  sort: number;
};
export type BoothFrameOption = { id: string; name: string; layout: Layout };

const layoutOptions = LAYOUT_KEYS.map((key) => ({ value: key, label: LAYOUTS[key].label.split(" (")[0] }));
const payLabel = (mode: string) => PAY_MODES.find((item) => item.value === mode)?.label ?? mode;
const outputLabel = (output: string) => OUTPUTS.find((item) => item.value === output)?.label ?? output;

type EventDialog = { mode: "new" } | { mode: "edit"; event: BoothEventView } | null;
type PackageDialog = { eventId: string; pkg: BoothPackageView | null } | null;

/** Event (profil booth) dan paketnya. Tablet mengambilnya lewat Admin > Profil > Sinkronkan profil. */
export function BoothEventsManager(props: {
  events: BoothEventView[];
  packages: BoothPackageView[];
  frames: BoothFrameOption[];
}) {
  const [eventDialog, setEventDialog] = useState<EventDialog>(null);
  const [packageDialog, setPackageDialog] = useState<PackageDialog>(null);

  return (
    <div className="grid gap-6">
      <div>
        <Button onClick={() => setEventDialog({ mode: "new" })}>
          <Plus aria-hidden />
          Buat event
        </Button>
      </div>
      {props.events.length === 0 ? (
        <EmptyState message="Belum ada event. Buat event untuk setiap acara (mis. Wisuda JGU 2026), lalu sinkronkan dari tablet." />
      ) : (
        props.events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            packages={props.packages.filter((pkg) => pkg.eventId === event.id)}
            frames={props.frames}
            onEdit={() => setEventDialog({ mode: "edit", event })}
            onPackage={(pkg) => setPackageDialog({ eventId: event.id, pkg })}
          />
        ))
      )}
      {eventDialog && (
        <EventForm
          key={eventDialog.mode === "edit" ? eventDialog.event.id : "new"}
          initial={eventDialog.mode === "edit" ? eventDialog.event : null}
          frames={props.frames}
          onClose={() => setEventDialog(null)}
        />
      )}
      {packageDialog && (
        <PackageForm
          key={packageDialog.pkg?.id ?? "new"}
          eventId={packageDialog.eventId}
          initial={packageDialog.pkg}
          nextSort={props.packages.filter((pkg) => pkg.eventId === packageDialog.eventId).length}
          onClose={() => setPackageDialog(null)}
        />
      )}
    </div>
  );
}

function EventCard(props: {
  event: BoothEventView;
  packages: BoothPackageView[];
  frames: BoothFrameOption[];
  onEdit: () => void;
  onPackage: (pkg: BoothPackageView | null) => void;
}) {
  const { event, packages } = props;
  const router = useRouter();
  const frameName = (id: string | undefined) => props.frames.find((frame) => frame.id === id)?.name;
  const activeFrames = LAYOUT_KEYS.flatMap((layout) => {
    const name = frameName(event.profile.activeFrames[layout]);
    return name ? [`${LAYOUTS[layout].label.split(" (")[0]}: ${name}`] : [];
  });

  async function remove(pkg: BoothPackageView) {
    const result = await deleteBoothPackage(pkg.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Paket ${pkg.name} dihapus. Tablet ikut menghapusnya saat sinkron.`);
    router.refresh();
  }

  return (
    <article className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg">
            {event.name}
            {!event.active && <span className="ml-2 text-sm font-normal text-ink/70">(nonaktif)</span>}
          </h2>
          <p className="mt-1 text-sm text-ink/75">
            {payLabel(event.profile.payMode)}
            {event.profile.extraCopyPrice > 0 &&
              ` · salinan tambahan ${formatRupiah(event.profile.extraCopyPrice)}`}
            {` · id ${event.id}`}
          </p>
          {activeFrames.length > 0 && (
            <p className="mt-1 text-sm text-ink/70">Frame: {activeFrames.join(", ")}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={props.onEdit}>
            <Pencil aria-hidden />
            Pengaturan
          </Button>
          <Button size="sm" onClick={() => props.onPackage(null)}>
            <Plus aria-hidden />
            Paket
          </Button>
        </div>
      </div>
      {packages.length === 0 ? (
        <p className="mt-4 text-sm text-ink/70">
          Belum ada paket. Tanpa paket, tablet memakai paket contoh bawaannya.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {packages.map((pkg) => (
            <li key={pkg.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-heading font-semibold">
                  {pkg.name}
                  {!pkg.active && <span className="ml-2 text-sm font-normal text-ink/70">(nonaktif)</span>}
                </p>
                <p className="text-sm text-ink/75">
                  {formatRupiah(pkg.price)} · {outputLabel(pkg.output)}
                  {pkg.output !== "digital" && ` · ${pkg.printCopies}× cetak`} ·{" "}
                  {pkg.layouts.map((layout) => LAYOUTS[layout].label.split(" (")[0]).join(", ")}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => props.onPackage(pkg)}>
                  <Pencil aria-hidden />
                  Ubah
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" aria-label={`Hapus paket ${pkg.name}`}>
                      <Trash2 aria-hidden />
                    </Button>
                  }
                  title={`Hapus paket ${pkg.name}?`}
                  description="Paket hilang dari tablet saat Sinkronkan profil berikutnya. Transaksi lama tetap tercatat."
                  confirmLabel="Hapus paket"
                  onConfirm={() => remove(pkg)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function EventForm(props: {
  initial: BoothEventView | null;
  frames: BoothFrameOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(props.initial?.name ?? "");
  const [active, setActive] = useState(props.initial?.active ?? true);
  const [profile, setProfile] = useState<ProfileForm>(props.initial?.profile ?? DEFAULT_PROFILE);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof ProfileForm>(key: K) => (value: ProfileForm[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  function submit() {
    startTransition(async () => {
      const result = await saveBoothEvent(props.initial?.id ?? null, { name, active, profile });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Event tersimpan. Di tablet: Admin > Profil > Sinkronkan profil.");
      props.onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>{props.initial ? `Pengaturan ${props.initial.name}` : "Event baru"}</DialogTitle>
        <DialogDescription>
          Berlaku di tablet setelah Sinkronkan profil lalu profil ini dipilih. Printer tetap diatur di tablet.
        </DialogDescription>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field id="event-name" label="Nama event" required error={error}>
            <Input
              id="event-name"
              value={name}
              placeholder="Wisuda JGU 2026"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <SwitchRow
            id="event-active"
            label="Aktif"
            hint="Event nonaktif tidak dikirim ke tablet."
            checked={active}
            onChange={setActive}
          />

          <section className="grid gap-3">
            <h3 className="text-base">Pembayaran</h3>
            <SelectField
              id="event-pay"
              label="Mode bayar"
              value={profile.payMode}
              options={PAY_MODES}
              hint={PAY_MODES.find((item) => item.value === profile.payMode)?.hint}
              onChange={set("payMode")}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                id="event-extra-price"
                label="Harga salinan tambahan"
                value={profile.extraCopyPrice}
                min={0}
                step={1000}
                hint="0 = tidak ditawarkan"
                onChange={set("extraCopyPrice")}
              />
              <NumberField
                id="event-extra-max"
                label="Maks. salinan per sesi"
                value={profile.extraCopiesMax}
                min={0}
                max={10}
                onChange={set("extraCopiesMax")}
              />
              <NumberField
                id="event-qr-expiry"
                label="QR berlaku (detik)"
                value={profile.qrExpirySeconds}
                min={60}
                max={900}
                onChange={set("qrExpirySeconds")}
              />
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-base">Alur foto</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                id="event-countdown"
                label="Hitung mundur (detik)"
                value={profile.countdownSeconds}
                min={1}
                max={10}
                onChange={set("countdownSeconds")}
              />
              <NumberField
                id="event-preview"
                label="Pratinjau (detik)"
                value={profile.previewSeconds}
                min={2}
                max={15}
                onChange={set("previewSeconds")}
              />
              <NumberField
                id="event-retakes"
                label="Ulang foto per sesi"
                value={profile.retakesPerSession}
                min={0}
                max={10}
                onChange={set("retakesPerSession")}
              />
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-base">Tampilan</h3>
            <CheckList
              legend="Layout yang ditawarkan"
              options={layoutOptions}
              value={profile.layoutsOffered}
              onChange={set("layoutsOffered")}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.layoutsOffered.map((layout) => {
                const options = props.frames.filter((frame) => frame.layout === layout);
                return (
                  <SelectField
                    key={layout}
                    id={`event-frame-${layout}`}
                    label={`Frame ${LAYOUTS[layout].label.split(" (")[0]}`}
                    value={profile.activeFrames[layout] ?? ""}
                    options={[
                      { value: "", label: "Pilih di tablet" },
                      ...options.map((frame) => ({ value: frame.id, label: frame.name })),
                    ]}
                    onChange={(id) =>
                      set("activeFrames")(
                        Object.fromEntries(
                          Object.entries({ ...profile.activeFrames, [layout]: id }).filter(([, value]) => value),
                        ),
                      )
                    }
                  />
                );
              })}
            </div>
            <CheckList
              legend="Filter yang ditawarkan"
              options={FILTERS}
              value={profile.filtersAllowed}
              onChange={set("filtersAllowed")}
            />
            <SelectField
              id="event-default-filter"
              label="Filter bawaan"
              value={profile.defaultFilter}
              options={FILTERS.filter((filter) => profile.filtersAllowed.includes(filter.value))}
              onChange={set("defaultFilter")}
            />
          </section>

          <section className="grid gap-3">
            <h3 className="text-base">Hasil</h3>
            <SwitchRow
              id="event-auto-print"
              label="Cetak otomatis"
              checked={profile.autoPrint}
              onChange={set("autoPrint")}
            />
            <SwitchRow
              id="event-ask-email"
              label="Tawarkan kirim ke email"
              checked={profile.askEmail}
              onChange={set("askEmail")}
            />
            <NumberField
              id="event-copies"
              label="Salinan cetak bawaan"
              value={profile.defaultCopies}
              min={1}
              max={5}
              onChange={set("defaultCopies")}
            />
          </section>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={props.onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 aria-hidden className="animate-spin" />}
              Simpan event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PackageForm(props: {
  eventId: string;
  initial: BoothPackageView | null;
  nextSort: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState<PackageInput>(
    props.initial
      ? { ...props.initial }
      : {
          eventId: props.eventId,
          name: "",
          price: 25_000,
          output: "print",
          printCopies: 1,
          layouts: ["strip"],
          active: true,
          sort: props.nextSort,
        },
  );
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof PackageInput>(key: K) => (next: PackageInput[K]) =>
    setValue((current) => ({ ...current, [key]: next }));

  function submit() {
    startTransition(async () => {
      const result = await saveBoothPackage(props.initial?.id ?? null, value);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Paket tersimpan.");
      props.onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogTitle>{props.initial ? `Ubah ${props.initial.name}` : "Paket baru"}</DialogTitle>
        <DialogDescription>
          Tablet menampilkan paling banyak 3 paket aktif. Harga paket ini juga dipakai server saat membuat QRIS.
        </DialogDescription>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field id="package-name" label="Nama paket" required error={error}>
            <Input
              id="package-name"
              value={value.name}
              placeholder="2 strip cetak"
              onChange={(event) => set("name")(event.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              id="package-price"
              label="Harga (Rp)"
              value={value.price}
              min={0}
              step={1000}
              hint="0 = gratis"
              onChange={set("price")}
            />
            <SelectField
              id="package-output"
              label="Hasil"
              value={value.output as OutputKind}
              options={OUTPUTS}
              onChange={set("output")}
            />
            {value.output !== "digital" && (
              <NumberField
                id="package-copies"
                label="Jumlah cetak"
                value={value.printCopies}
                min={1}
                max={10}
                onChange={set("printCopies")}
              />
            )}
            <NumberField
              id="package-sort"
              label="Urutan"
              value={value.sort}
              min={0}
              max={99}
              onChange={set("sort")}
            />
          </div>
          <CheckList
            legend="Layout"
            options={layoutOptions}
            value={value.layouts as Layout[]}
            onChange={set("layouts")}
          />
          <SwitchRow id="package-active" label="Aktif" checked={value.active} onChange={set("active")} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={props.onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 aria-hidden className="animate-spin" />}
              Simpan paket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
