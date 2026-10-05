import { X } from "lucide-react";
import { kindLabel, passageKindLabel, sourceMetaLine } from "@/lib/naql/citation";
import type { Source, SourcePage } from "@/lib/naql/types";
import { Button } from "@/components/ui/button";

export function PageReader({
  source,
  page,
  highlight,
  onClose,
  onPrev,
  onNext,
}: {
  source: Source;
  page: SourcePage;
  highlight?: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const text = page.text;
  const marked = highlight ? wrapHighlight(text, highlight) : escapeHtml(text);

  return (
    <div className="fixed inset-0 z-40 grid place-items-end sm:place-items-center bg-navy-deep/50 p-0 sm:p-6">
      <div
        role="dialog"
        aria-labelledby="page-reader-title"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-t-xl sm:rounded-xl bg-paper-2 shadow-[0_0_0_1px_rgba(11,31,51,0.08)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div>
            <p className="text-xs text-mist">{kindLabel(source.kind)} · {source.edition}</p>
            <h2 id="page-reader-title" className="text-lg font-medium text-navy">
              {source.shortTitle}
            </h2>
            <p className="text-sm text-mist">{sourceMetaLine(source)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق">
            <X />
          </Button>
        </header>
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 text-sm">
          <span className="text-ink">
            {page.volume ? `ج ${page.volume} · ` : ""}ص {page.page}
            {page.kind ? ` · ${passageKindLabel(page.kind)}` : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onPrev} disabled={!onPrev}>
              الصفحة السابقة
            </Button>
            <Button variant="outline" size="sm" onClick={onNext} disabled={!onNext}>
              الصفحة التالية
            </Button>
          </div>
        </div>
        <div className="overflow-y-auto p-5">
          <p
            className="font-quote text-xl leading-loose text-ink"
            dangerouslySetInnerHTML={{ __html: marked }}
          />
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

function wrapHighlight(text: string, needle: string): string {
  const safe = escapeHtml(text);
  const n = needle.trim();
  if (!n) return safe;
  const idx = text.indexOf(n);
  if (idx >= 0) {
    return (
      escapeHtml(text.slice(0, idx)) +
      `<mark class="rounded-sm bg-ok-soft px-1">${escapeHtml(n)}</mark>` +
      escapeHtml(text.slice(idx + n.length))
    );
  }
  return safe;
}
