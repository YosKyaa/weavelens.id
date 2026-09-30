import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/** Kartu putih berjudul untuk mengelompokkan isian form panjang. */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn("rounded-2xl border border-line bg-paper p-5 md:p-6", className)}>
      <h2 className="text-lg">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink/70">{description}</p>}
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}
