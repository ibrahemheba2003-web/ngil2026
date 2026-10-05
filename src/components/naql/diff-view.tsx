import type { DiffChunk, QuoteHit } from "@/lib/naql/types";
import { passageKindLabel } from "@/lib/naql/citation";
import { cn } from "@/lib/utils";

function Chunk({ chunk }: { chunk: DiffChunk }) {
  if (chunk.op === "equal") {
    return <span>{chunk.quote} </span>;
  }
  if (chunk.op === "insert") {
    return (
      <span className="rounded-sm bg-danger-soft text-danger px-0.5">
        {chunk.quote}{" "}
      </span>
    );
  }
  if (chunk.op === "delete") {
    return (
      <span className="rounded-sm bg-warn-soft text-warn line-through px-0.5">
        {chunk.source}{" "}
      </span>
    );
  }
  return (
    <span className="inline-flex gap-1">
      <span className="rounded-sm bg-danger-soft text-danger px-0.5">
        {chunk.quote}
      </span>
      <span className="rounded-sm bg-ok-soft text-ok px-0.5">{chunk.source}</span>
      {" "}
    </span>
  );
}

export function DiffView({ hit }: { hit: QuoteHit }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs text-mist">
        <span className="rounded-full bg-navy/6 px-2.5 py-0.5 text-navy">
          {passageKindLabel(hit.passageKind)}
        </span>
        <span>
          يُفصل النص الشرعي عن الشرح — هذا المقطع: {passageKindLabel(hit.passageKind)}
        </span>
      </div>
      <div className="rounded-lg bg-paper p-4">
        <p className="mb-2 text-xs font-medium text-mist">النص في المصدر</p>
        <p className="font-quote text-xl leading-loose text-ink">
          {hit.contextBefore ? (
            <span className="text-mist">{hit.contextBefore} </span>
          ) : null}
          <span className="rounded-sm bg-ok-soft px-1">{hit.originalText}</span>
          {hit.contextAfter ? (
            <span className="text-mist"> {hit.contextAfter}</span>
          ) : null}
        </p>
      </div>
      <div className="rounded-lg border border-line bg-paper-2 p-4">
        <p className="mb-2 text-xs font-medium text-mist">
          مقارنة المنقول بالأصل — زيادة بالأحمر، نقص بالذهبي المشطوب، تصحيح بالأخضر
        </p>
        <p className="font-quote text-lg leading-loose text-ink">
          {hit.diffs.map((chunk, i) => (
            <Chunk key={`${chunk.op}-${i}`} chunk={chunk} />
          ))}
        </p>
      </div>
    </div>
  );
}

export function ScoreRing({ score, className }: { score: number; className?: string }) {
  const pct = Math.round(score * 100);
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const tone =
    pct >= 97 ? "text-ok" : pct >= 84 ? "text-accent" : pct >= 55 ? "text-warn" : "text-danger";
  return (
    <div className={cn("relative size-20", className)}>
      <svg viewBox="0 0 72 72" className="-rotate-90 size-20">
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-line"
          strokeWidth="6"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="currentColor"
          className={tone}
          strokeWidth="6"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-medium tabular-nums text-ink">
        {pct}٪
      </span>
    </div>
  );
}
