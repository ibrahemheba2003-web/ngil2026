import { cn } from "@/lib/utils";

export function NaqlMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("size-9", className)}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="currentColor" className="text-navy" />
      <path
        d="M10 26.5h8.2M10 21h14.5M10 15.5h20"
        stroke="#F3F0E8"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="28.5" cy="26.2" r="5.2" fill="#1B6B8A" />
      <path
        d="M26.3 26.3l1.5 1.5 3.2-3.3"
        fill="none"
        stroke="#F3F0E8"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NaqlWordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <NaqlMark className={inverse ? "text-paper-2" : "text-navy"} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-quote text-2xl",
            inverse ? "text-paper-2" : "text-navy",
          )}
        >
          نَقْل
        </span>
        <span
          className={cn(
            "text-xs tracking-wide",
            inverse ? "text-paper-2/70" : "text-mist",
          )}
        >
          محقق النقل العلمي
        </span>
      </span>
    </span>
  );
}
