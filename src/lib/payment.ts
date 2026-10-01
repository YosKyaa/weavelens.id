/**
 * Metode pembayaran untuk invoice: dipilih dari daftar (dropdown), lalu nomor & atas nama diisi.
 * Dipakai Pengaturan (bawaan), editor invoice, dan dokumen PDF.
 */

export type PaymentKind = "bank" | "ewallet" | "qris" | "cash";

export const PAYMENT_METHODS = [
  { value: "bca", label: "BCA", kind: "bank" },
  { value: "mandiri", label: "Mandiri", kind: "bank" },
  { value: "bni", label: "BNI", kind: "bank" },
  { value: "bri", label: "BRI", kind: "bank" },
  { value: "bsi", label: "BSI", kind: "bank" },
  { value: "cimb", label: "CIMB Niaga", kind: "bank" },
  { value: "permata", label: "Permata", kind: "bank" },
  { value: "jago", label: "Bank Jago", kind: "bank" },
  { value: "seabank", label: "SeaBank", kind: "bank" },
  { value: "bank_other", label: "Bank lain", kind: "bank" },
  { value: "qris", label: "QRIS", kind: "qris" },
  { value: "gopay", label: "GoPay", kind: "ewallet" },
  { value: "ovo", label: "OVO", kind: "ewallet" },
  { value: "dana", label: "DANA", kind: "ewallet" },
  { value: "shopeepay", label: "ShopeePay", kind: "ewallet" },
  { value: "cash", label: "Tunai", kind: "cash" },
] as const satisfies readonly { value: string; label: string; kind: PaymentKind }[];

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

export const PAYMENT_GROUPS: { kind: PaymentKind; label: string }[] = [
  { kind: "bank", label: "Transfer bank" },
  { kind: "qris", label: "QRIS" },
  { kind: "ewallet", label: "E-wallet" },
  { kind: "cash", label: "Tunai" },
];

export type PaymentAccount = {
  method: PaymentMethodValue;
  /** Nomor rekening / nomor HP e-wallet. Kosong untuk QRIS & tunai. */
  number: string;
  holder: string;
  /** Nama bank bila memilih "Bank lain". */
  bankName?: string;
};

export function methodInfo(value: string) {
  return PAYMENT_METHODS.find((method) => method.value === value) ?? PAYMENT_METHODS[0];
}

/** Label kolom nomor sesuai jenis metode; `null` = tidak perlu nomor. */
export function numberLabel(value: string): string | null {
  const { kind } = methodInfo(value);
  if (kind === "bank") return "Nomor rekening";
  if (kind === "ewallet") return "Nomor HP";
  return null;
}

export function methodName(account: PaymentAccount): string {
  const info = methodInfo(account.method);
  return info.value === "bank_other" && account.bankName?.trim()
    ? account.bankName.trim()
    : info.label;
}

/** Satu baris untuk dokumen, mis. "BCA 1234567890 a.n. WeaveLens" atau "QRIS". */
export function formatAccount(account: PaymentAccount): string {
  return [
    methodName(account),
    numberLabel(account.method) ? account.number.trim() : "",
    account.holder.trim() ? `a.n. ${account.holder.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Buang baris yang belum lengkap (bank/e-wallet tanpa nomor) supaya tidak tercetak setengah jadi. */
export function completeAccounts(accounts: PaymentAccount[]): PaymentAccount[] {
  return accounts.filter((account) => !numberLabel(account.method) || account.number.trim());
}

/** Ringkasan teks untuk kolom lama (payment_methods/payment_details). */
export function summarizeAccounts(accounts: PaymentAccount[]): {
  methods: string;
  details: string;
} {
  const kinds = [...new Set(accounts.map((account) => methodInfo(account.method).kind))];
  return {
    methods: kinds
      .map((kind) => PAYMENT_GROUPS.find((group) => group.kind === kind)?.label ?? kind)
      .join(" · "),
    details: accounts.map(formatAccount).join("\n"),
  };
}

/** JSON dari database → daftar akun yang valid (entri rusak dibuang). */
export function parseAccounts(value: unknown): PaymentAccount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const method = PAYMENT_METHODS.find((entry) => entry.value === record.method);
    if (!method) return [];
    return [
      {
        method: method.value,
        number: typeof record.number === "string" ? record.number : "",
        holder: typeof record.holder === "string" ? record.holder : "",
        bankName: typeof record.bankName === "string" ? record.bankName : undefined,
      },
    ];
  });
}
