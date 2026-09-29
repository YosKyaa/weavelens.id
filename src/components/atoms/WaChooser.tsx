"use client";

import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type WaChooserOption = {
  id: string;
  label: string;
  sub: string;
  href: string;
};

type WaChooserProps = {
  section: string;
  title: string;
  description: string;
  options: WaChooserOption[];
  newTabHint: string;
  triggerClassName: string;
  triggerContent: ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
};

/** Popover pilihan admin. Link-nya dibuat di server oleh WaLink. */
export function WaChooser({
  section,
  title,
  description,
  options,
  newTabHint,
  triggerClassName,
  triggerContent,
  side = "bottom",
  align = "start",
}: WaChooserProps) {
  return (
    <Popover>
      <PopoverTrigger className={triggerClassName}>{triggerContent}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={10}
        className="glass w-[min(20rem,calc(100vw-2rem))] rounded-xl p-2"
      >
        <div className="px-3 pt-2 pb-3">
          <p className="font-heading text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm text-ink/80">{description}</p>
        </div>
        <ul className="space-y-1">
          {options.map((option) => (
            <li key={option.id}>
              <a
                href={option.href}
                target="_blank"
                rel="noopener noreferrer"
                data-cta={section}
                data-admin={option.id}
                className="flex min-h-14 flex-col justify-center rounded-lg px-3 py-2 transition-colors hover:bg-sand focus-visible:bg-sand"
              >
                <span className="font-heading text-sm font-semibold text-primary">
                  {option.label}
                </span>
                <span className="text-sm text-ink/80">{option.sub}</span>
                <span className="sr-only"> {newTabHint}</span>
              </a>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
