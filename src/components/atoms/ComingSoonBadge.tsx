import { Badge } from "@/components/ui/badge";
import { comingSoonLabel } from "@/content/services";
import { cn } from "@/lib/utils";

type ComingSoonBadgeProps = {
  className?: string;
};

export function ComingSoonBadge({ className }: ComingSoonBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-sm border-sand-deep bg-sand px-2.5 py-1 font-heading text-xs font-semibold text-ink",
        className,
      )}
    >
      {comingSoonLabel}
    </Badge>
  );
}
