import { reveal } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  id: string;
  heading: string;
  sub?: string;
  align?: "start" | "center";
  /** Garis horizontal yang memanjang di kanan heading. */
  rule?: boolean;
  className?: string;
};

export function SectionHeading({
  id,
  heading,
  sub,
  align = "start",
  rule = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      {...reveal()}
      className={cn(
        "mb-10 md:mb-14",
        !rule && "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <div className={cn(rule && "flex items-center gap-6")}>
        <h2
          id={id}
          className={cn("text-3xl leading-tight md:text-4xl", rule && "lg:whitespace-nowrap")}
        >
          {heading}
        </h2>
        {rule && <span aria-hidden className="draw-x hidden h-px flex-1 bg-sand-deep lg:block" />}
      </div>
      {sub && <p className="mt-4 max-w-2xl text-lg text-ink/80">{sub}</p>}
    </div>
  );
}
