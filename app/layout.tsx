import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import AppControls from "@/components/AppControls";
import BottomNav from "@/components/BottomNav";
import SidebarNav from "@/components/SidebarNav";
import ThemeSync from "@/components/ThemeSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RocketPing",
    template: "%s | RocketPing",
  },
  description: "Paneli i monitorimit të rrjetit RocketPing",
  icons: {
    icon: "/branding/rocketping-mark.svg",
    shortcut: "/branding/rocketping-mark.svg",
    apple: "/branding/rocketping-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} min-h-screen text-[color:var(--np-text)]`}>
        <ThemeSync />
        <div className="app-shell min-h-screen px-4 py-4 md:px-6 md:py-6">
          <div className="print-hide mx-auto w-full max-w-[430px] md:max-w-[1100px]">
            <AppControls />
          </div>
          <div className="print-hide mx-auto w-full max-w-[430px] md:hidden" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}>{children}</div>

          <div className="print-hide mx-auto hidden w-full max-w-[1100px] grid-cols-[250px_1fr] gap-6 md:grid">
            <aside className="print-hide">
              <SidebarNav />
            </aside>
            <main className="content-shell min-h-[calc(100vh-3rem)]">{children}</main>
          </div>

          <div className="print-only mx-auto w-full max-w-[1100px]">
            <main className="print-content">{children}</main>
          </div>

          <BottomNav />
        </div>
      </body>
    </html>
  );
}
