import { z } from "zod";
import { PAYMENT_METHODS, type PaymentMethodValue } from "@/lib/payment";

const methodValues = PAYMENT_METHODS.map((method) => method.value) as [
  PaymentMethodValue,
  ...PaymentMethodValue[],
];
const field = (max: number) => z.string().trim().max(max);

/** Validasi daftar metode pembayaran dari form (Pengaturan & invoice). Server-only via actions. */
export const paymentAccountsSchema = z
  .array(
    z.object({
      method: z.enum(methodValues),
      number: field(40),
      holder: field(80),
      bankName: field(60).optional(),
    }),
  )
  .max(6, "Maksimal 6 metode pembayaran.");
