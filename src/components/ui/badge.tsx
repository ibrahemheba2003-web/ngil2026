import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "mist",
  children,
}: {
  className?: string;
  tone?: "mist" | "ok" | "warn" | "danger" | "accent" | "navy";
  children: ReactNode;
}) {
  const tones = {
    mist: "bg-navy/6 text-navy",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    accent: "bg-accent/12 text-accent",
    navy: "bg-navy text-paper-2",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
