import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  /** Kalimat yang memberi arah, bukan sekadar "tidak ada data". */
  message: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line px-6 py-10 text-center",
        className,
      )}
    >
      <p className="max-w-[48ch] text-ink/75">{message}</p>
      {action}
    </div>
  );
}
