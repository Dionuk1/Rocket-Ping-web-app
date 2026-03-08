"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

type Ripple = {
  id: number;
  x: number;
  y: number;
  size: number;
};

type AnimatedButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "ghost";
};

export default function AnimatedButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  className = "",
  variant = "primary",
}: AnimatedButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextRippleId = useRef(0);
  const isDisabled = disabled || loading;

  useEffect(() => {
    const timer = setInterval(() => {
      setRipples((current) => (current.length > 8 ? current.slice(-4) : current));
    }, 800);
    return () => clearInterval(timer);
  }, []);

  const addRipple = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    const id = nextRippleId.current++;

    setRipples((current) => [...current, { id, x, y, size }]);
    window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
    }, 520);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) {
      return;
    }
    addRipple(event);
    onClick?.();
  };

  const variantClasses =
    variant === "primary"
      ? "bg-[color:var(--np-primary)] text-[color:var(--np-text)]"
      : "bg-[color:var(--np-surface)] text-[color:var(--np-text)] border border-[color:var(--np-border)]";

  const disabledClasses = isDisabled ? "opacity-60 cursor-not-allowed" : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`relative overflow-hidden transition-transform duration-100 active:scale-[0.97] hover:brightness-110 ${variantClasses} ${disabledClasses} ${className}`}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-white/25 animate-[ping_520ms_ease-out]"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
      {loading && (
        <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
        </span>
      )}
      <span className={`relative z-10 flex items-center justify-center gap-2 ${loading ? "opacity-0" : "opacity-100"}`}>
        {children}
      </span>
    </button>
  );
}
