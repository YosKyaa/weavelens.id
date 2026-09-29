import type { NavItem } from "@/types";

type NavLinkProps = {
  item: NavItem;
};

export function NavLink({ item }: NavLinkProps) {
  return (
    <a
      href={item.href}
      className="relative inline-flex h-11 items-center rounded-sm px-3 font-heading text-sm font-semibold text-ink transition-colors after:absolute after:inset-x-3 after:bottom-2 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 hover:text-primary hover:after:scale-x-100"
    >
      {item.label}
    </a>
  );
}
