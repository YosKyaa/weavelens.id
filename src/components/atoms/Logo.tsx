import Image from "next/image";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  priority?: boolean;
};

export function Logo({ className, priority = false }: LogoProps) {
  return (
    <Image
      src="/brand/logo.svg"
      alt={site.a11y.logoAlt}
      width={1192}
      height={296}
      priority={priority}
      unoptimized
      className={cn("h-9 w-auto", className)}
    />
  );
}
