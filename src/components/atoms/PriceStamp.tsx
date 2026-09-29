import { pricePrefix } from "@/content/pricing";
import { cn } from "@/lib/utils";

type PriceStampProps = {
  amount: string;
  tone?: "ink" | "paper";
  className?: string;
};

/** Stempel harga bulat "Mulai dari ..." yang mengambang di pojok foto atau kartu. */
export function PriceStamp({ amount, tone = "paper", className }: PriceStampProps) {
  return (
    <p
      className={cn(
        "float flex size-28 flex-col items-center justify-center rounded-full text-center leading-tight shadow-lift",
        tone === "ink" && "bg-ink text-paper",
        tone === "paper" && "border border-sand-deep bg-paper text-ink",
        className,
      )}
    >
      <span className="text-xs">{pricePrefix}</span>
      <span className="font-heading text-xl font-bold">{amount}</span>
    </p>
  );
}
