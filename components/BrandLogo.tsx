"use client";

import Image from "next/image";
import useSettings from "@/lib/useSettings";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export default function BrandLogo({ compact = false, className = "" }: BrandLogoProps) {
  const { settings } = useSettings();

  if (compact) {
    return (
      <Image
        src="/branding/rocketping-mark.svg"
        alt="RocketPing"
        width={36}
        height={36}
        className={className}
        priority
      />
    );
  }

  if (settings.theme === "light") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Image
          src="/branding/rocketping-mark.svg"
          alt="RocketPing"
          width={40}
          height={40}
          className="h-10 w-10 rounded-2xl border border-[color:var(--np-border)] bg-[color:var(--np-surface)] p-1 shadow-[var(--np-shadow-soft)]"
          priority
        />
        <span className="text-2xl font-semibold tracking-[-0.02em] text-[color:var(--np-text)]">
          RocketPing
        </span>
      </div>
    );
  }

  return (
    <Image
      src="/branding/rocketping-wordmark.svg"
      alt="RocketPing"
      width={260}
      height={70}
      className={className}
      priority
    />
  );
}
