"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Logo } from "@/components/atoms/Logo";
import { PortalSidebar, type PortalNavGroup } from "@/components/organisms/PortalSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type PortalMobileNavProps = {
  groups: PortalNavGroup[];
  label: string;
  openLabel: string;
  /** Bagian bawah menu (akun, keluar), dirender di server. */
  footer: ReactNode;
};

/** Menu geser dari kiri untuk layar di bawah lg. Tertutup otomatis setelah memilih halaman. */
export function PortalMobileNav({ groups, label, openLabel, footer }: PortalMobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label={openLabel}>
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col gap-0 bg-paper p-0">
        <SheetTitle className="sr-only">{label}</SheetTitle>
        <div className="border-b border-line px-5 py-4">
          <Logo className="h-7" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <PortalSidebar groups={groups} label={label} onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t border-line p-3">{footer}</div>
      </SheetContent>
    </Sheet>
  );
}
