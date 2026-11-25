/**
 * Membuat contoh baris portal (event, paket, frame) memakai kode portal yang sama dengan menu Photobooth,
 * untuk test kontrak di repo tablet (photoboothWL: app/src/test/resources/portal/portal_rows.json,
 * PortalRowsContractTest). Jalankan setelah mengubah src/lib/booth/profile.ts atau frames.ts:
 *
 *   npx tsx scripts/booth-contract-fixture.ts > ../PHOTOBOOTH/app/src/test/resources/portal/portal_rows.json
 *
 * lalu `.\gradlew testDebugUnitTest` di repo tablet. Gagal = tablet dan portal tidak lagi sepakat.
 */
import { defaultQr, LAYOUTS, printFor, validate, type Slot } from "../src/lib/booth/frames";
import { DEFAULT_PROFILE, writeProfile } from "../src/lib/booth/profile";

const now = "2026-11-26T00:00:00Z";

// Profil bawaan portal: harus sama persis dengan EventProfile() bawaan tablet.
const defaults = writeProfile({}, DEFAULT_PROFILE);

// Profil seperti disimpan saveBoothEvent, di atas profil lama yang punya kunci buatan tablet.
const profile = writeProfile(
  { flow: { screen_timeout_seconds: 90 }, output: { printer_id: "ipp://192.168.1.20:631/ipp/print" } },
  {
    ...DEFAULT_PROFILE,
    payMode: "qris",
    extraCopyPrice: 10_000,
    extraCopiesMax: 2,
    layoutsOffered: ["strip", "4r"],
    filtersAllowed: ["original", "mono"],
    defaultFilter: "mono",
    activeFrames: { strip: "wisuda-strip", "4r": "wisuda-4r" },
    askEmail: false,
  },
);

const event = { id: "wisuda-jgu-a1b2c3", name: "Wisuda JGU", active: true, profile, updated_at: now };

const pkg = {
  id: "p-2-strip-a1b2c3",
  event_id: event.id,
  name: "2 strip",
  price: 25_000,
  output: "both",
  print_copies: 2,
  layouts: ["strip", "4r"],
  active: true,
  sort: 0,
  updated_at: now,
};

const spec = LAYOUTS.strip;
const slots: Slot[] = [120, 520, 920].map((y) => ({ x: 60, y, w: 480, h: 360, fit: "cover", radius: 16 }));
const qr = defaultQr("strip");
const issues = validate("strip", spec.w, spec.h, slots, "wisuda-strip", qr);
if (issues.some((issue) => issue.blocking)) throw new Error(`Frame contoh ditolak portal: ${JSON.stringify(issues)}`);

const frame = {
  id: "wisuda-strip",
  name: "Wisuda strip",
  layout: "strip",
  version: 2,
  canvas_w: spec.w,
  canvas_h: spec.h,
  slots,
  print: printFor("strip"),
  png_path: "wisuda-strip/v2/frame.png",
  qr,
  active_from: null,
  active_to: "2026-12-31",
  deleted_at: null,
  client_id: null,
  created_at: now,
  updated_at: now,
};

console.log(JSON.stringify({ defaults, event, package: pkg, frame }, null, 2));
