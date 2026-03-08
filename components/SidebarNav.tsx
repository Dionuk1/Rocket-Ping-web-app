"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Home, Settings, Share2, Smartphone, Terminal, Zap } from "lucide-react";
import useI18n from "@/lib/useI18n";

export default function SidebarNav() {
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
    <nav className="print-hide sticky top-6 rounded-3xl border border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4 backdrop-blur-xl">
      <div className="mb-6 px-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--np-muted)]">NETPULSE</p>
        <h2 className="mt-1 text-xl font-semibold text-[color:var(--np-text)]">{t.navigation}</h2>
      </div>

      <div className="space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                active
                  ? "flex items-center gap-3 rounded-2xl bg-[color:var(--np-primary)]/20 px-3 py-2.5 text-[color:var(--np-text)]"
                  : "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[color:var(--np-muted)] hover:bg-[color:var(--np-surface)] hover:text-[color:var(--np-text)]"
              }
            >
              <Icon size={18} className={active ? "text-[color:var(--np-primary-soft)]" : "text-[color:var(--np-muted)]"} />
              <span className="text-sm font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
