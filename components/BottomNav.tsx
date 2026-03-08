"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Home, Settings, Share2, Smartphone, Terminal, Zap } from "lucide-react";
import useI18n from "@/lib/useI18n";

export default function BottomNav() {
  const pathname = usePathname();
  const t = useI18n();

  const tabs = [
    { href: "/", label: t.navHome, icon: Home },
    { href: "/devices", label: t.navDevices, icon: Smartphone },
    { href: "/activity", label: t.navActivity, icon: Activity },
    { href: "/topology", label: t.navTopology, icon: Share2 },
    { href: "/speed", label: t.navSpeed, icon: Zap },
    { href: "/terminal", label: t.navTerminal, icon: Terminal },
    { href: "/settings", label: t.navSettings, icon: Settings },
  ];

  return (
    <nav className="print-hide fixed inset-x-0 bottom-0 z-50 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-[430px] border-t border-[color:var(--np-border)] bg-[color:var(--np-surface)] px-2 py-2 shadow-[0_-10px_24px_rgba(1,7,15,0.5)]">
        <div className="grid grid-cols-7">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-1 py-1">
                <Icon size={24} className={active ? "text-[color:var(--np-primary)]" : "text-[color:var(--np-muted)]"} strokeWidth={2.2} />
                <span className={active ? "text-[13px] font-medium text-[color:var(--np-primary-soft)]" : "text-[13px] text-[color:var(--np-muted)]"}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
