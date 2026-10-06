import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  BookMarked,
  Check,
  Copy,
  Download,
  Library,
  LoaderCircle,
  MessageSquareText,
  Quote,
  ScrollText,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { NaqlWordmark } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DiffView, ScoreRing } from "@/components/naql/diff-view";
import { PageReader } from "@/components/naql/page-reader";
import { askFromSources, generateManhaj, ocrImage } from "@/lib/naql/ai";
import { APPROVED_SOURCES } from "@/lib/naql/approved-sources";
import {
  formatCitation,
  formatInlineQuote,
  kindLabel,
  sourceMetaLine,
} from "@/lib/naql/citation";
import { DEMO_QUOTES } from "@/lib/naql/corpus";
import { localAsk } from "@/lib/naql/local-ask";
import {
  curatedManhaj,
  manhajSeedChunks,
  reportToPlainText,
} from "@/lib/naql/manhaj";
import { retrieveChunks, statusLabel, verifyQuote } from "@/lib/naql/match";
import { looksLikePersonalFatwa } from "@/lib/naql/normalize";
import { extractPdfFile, fileToDataUrl, sourceFromOcr } from "@/lib/naql/pdf";
import {
  allSources,
  findSourcePage,
  selectedSources,
  useNaqlStore,
} from "@/lib/naql/store";
import type {
  AskResult,
  ManhajReport,
  Source,
  VerifyResult,
} from "@/lib/naql/types";
import { cn } from "@/lib/utils";

type Tool = "verify" | "manhaj" | "ask" | "library";

const TOOLS: Array<{ id: Tool; label: string; icon: typeof Quote }> = [
  { id: "verify", label: "تحقق النقل", icon: Quote },
  { id: "manhaj", label: "منهج المفسر", icon: ScrollText },
  { id: "ask", label: "اسأل المصدر", icon: MessageSquareText },
  { id: "library", label: "المكتبة", icon: Library },
];

type ReaderState = { sourceId: string; page: number; highlight?: string };

export function WorkspaceApp({ initialTool = "verify" }: { initialTool?: Tool }) {
  const search = useSearch({ from: "/workspace" });
  const navigate = useNavigate({ from: "/workspace" });
  const tool: Tool = search.tool ?? initialTool;
  const uploads = useNaqlStore((s) => s.uploads);
  const selectedIds = useNaqlStore((s) => s.selectedIds);
  const toggle = useNaqlStore((s) => s.toggleSelected);
  const sources = allSources(uploads);
  const active = selectedSources({ uploads, selectedIds });
  const [reader, setReader] = useState<ReaderState | null>(null);

  function setTool(next: Tool) {
    void navigate({ search: { tool: next } });
  }

  const openPage = sources.length
    ? (sourceId: string, page: number, highlight?: string) =>
        setReader({ sourceId, page, highlight })
    : undefined;

  const reading = reader
    ? findSourcePage(sources, reader.sourceId, reader.page)
    : null;

  return (
    <div className="paper-field min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-paper-2/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="shrink-0">
            <NaqlWordmark />
          </Link>
          <p className="hidden text-xs text-mist md:block">
            أداة ذكاء اصطناعي مقيَّدة بالمصدر — ليست فتوى
          </p>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {TOOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTool(item.id)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm transition-colors duration-150",
                tool === item.id
                  ? "bg-navy text-paper-2"
                  : "text-mist hover:bg-navy/6 hover:text-ink",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {sources.map((source) => {
            const on = selectedIds.includes(source.id);
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => toggle(source.id)}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-3 text-xs",
                  on
                    ? "border-accent bg-paper-2 text-navy"
                    : "border-line text-mist",
                )}
              >
                {source.shortTitle}
              </button>
            );
          })}
        </div>
        <section className="min-w-0">
          {tool === "verify" ? (
            <VerifyPanel sources={active} onOpenPage={openPage} />
          ) : null}
          {tool === "manhaj" ? <ManhajPanel sources={sources} /> : null}
          {tool === "ask" ? (
            <AskPanel sources={active} onOpenPage={openPage} />
          ) : null}
          {tool === "library" ? <LibraryPanel onOpenPage={openPage} /> : null}
        </section>
        <aside className="hidden lg:block">
          <SourceRail sources={sources} selectedIds={selectedIds} />
        </aside>
      </main>

      {reading && reader ? (
        <PageReader
          source={reading.source}
          page={reading.page}
          highlight={reader.highlight}
          onClose={() => setReader(null)}
          onPrev={
            reading.source.pages.some((p) => p.page === reader.page - 1)
              ? () => setReader({ ...reader, page: reader.page - 1, highlight: undefined })
              : undefined
          }
          onNext={
            reading.source.pages.some((p) => p.page === reader.page + 1)
              ? () => setReader({ ...reader, page: reader.page + 1, highlight: undefined })
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function SourceRail({
  sources,
  selectedIds,
}: {
  sources: Source[];
  selectedIds: string[];
}) {
  const toggle = useNaqlStore((s) => s.toggleSelected);
  const selectAll = useNaqlStore((s) => s.selectAll);
  return (
    <div className="sticky top-28 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-navy">المصادر المعتمدة للبحث</h2>
        <button type="button" className="text-xs text-accent" onClick={selectAll}>
          الكل
        </button>
      </div>
      <ul className="space-y-2">
        {sources.map((source) => {
          const on = selectedIds.includes(source.id);
          return (
            <li key={source.id}>
              <button
                type="button"
                onClick={() => toggle(source.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-start transition-colors duration-150",
                  on
                    ? "border-accent/40 bg-paper-2"
                    : "border-transparent bg-navy/4 opacity-70",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm border",
                    on ? "border-accent bg-accent text-paper-2" : "border-line",
                  )}
                >
                  {on ? <Check className="size-3" /> : null}
                </span>
                <span>
                  <span className="block text-sm text-ink">{source.shortTitle}</span>
                  <span className="block text-xs text-mist">
                    {source.author} · {source.pages.length} ص
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <details className="rounded-lg border border-line bg-paper-2 px-3 py-2.5">
        <summary className="cursor-pointer text-sm text-navy">
          مواقع المرجعية المعتمدة ({APPROVED_SOURCES.length})
        </summary>
        <p className="mt-2 text-xs leading-6 text-mist">
          عند عدم كفاية المصادر المرفوعة، يبحث «نقل» في هذه المواقع فقط:
        </p>
        <ul className="mt-2 space-y-1">
          {APPROVED_SOURCES.map((a) => (
            <li key={a.domain} className="text-xs text-ink">
              {a.name} <span className="text-mist">· {a.domain}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function VerifyPanel({
  sources,
  onOpenPage,
}: {
  sources: Source[];
  onOpenPage?: (sourceId: string, page: number, highlight?: string) => void;
}) {
  const [quote, setQuote] = useState(DEMO_QUOTES[0]?.quote ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const didAuto = useRef(false);

  function run(next = quote) {
    if (!next.trim()) {
      toast.error("الصق اقتباساً للتحقق منه");
      return;
    }
    if (sources.length === 0) {
      toast.error("اختر مصدراً واحداً على الأقل من المكتبة");
      return;
    }
    setBusy(true);
    const out = verifyQuote(next, sources);
    setResult(out);
    setBusy(false);
  }

  useEffect(() => {
    if (didAuto.current) return;
    if (!sources.length || !DEMO_QUOTES[0]) return;
    didAuto.current = true;
    setResult(verifyQuote(DEMO_QUOTES[0].quote, sources));
  }, [sources]);

  const best = result?.best ?? null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-medium text-navy">تحقق النقل العلمي</h1>
        <p className="mt-1 text-sm leading-7 text-mist">
          الصق العبارة كما نقلتها. نبحث في المصدر الذي اخترته — لا في ذاكرة النموذج —
          ونظهر الأصل والصفحة والاختلاف.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {DEMO_QUOTES.map((demo) => (
          <button
            key={demo.id}
            type="button"
            onClick={() => {
              setQuote(demo.quote);
              run(demo.quote);
            }}
            className="h-9 rounded-full border border-line bg-paper-2 px-3 text-xs text-navy hover:border-accent/40"
          >
            {demo.label}
          </button>
        ))}
      </div>
      <textarea
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
        }}
        rows={5}
        className="w-full rounded-lg border border-line bg-paper-2 p-4 font-quote text-lg leading-loose text-ink outline-none focus:ring-2 focus:ring-accent/40"
        placeholder="الصق الاقتباس هنا…"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => run()} disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Quote />}
          تحقق الآن
        </Button>
        <span className="text-xs text-mist">
          البحث في {sources.reduce((n, s) => n + s.pages.length, 0)} صفحة محددة
        </span>
      </div>

      {result && !best ? (
        <div className="rounded-xl border border-danger/20 bg-danger-soft p-5">
          <h2 className="font-medium text-danger">لم يُعثر على مطابق في المصادر المحددة</h2>
          <p className="mt-2 text-sm leading-7 text-ink">
            {result.hadithWarning ??
              "لا يُنسب هذا النص إلى المصدر ما دام لم يظهر فيه. إن كان حديثاً فلا يُختلق متنٌ ولا سند."}
          </p>
          <p className="mt-2 text-xs text-mist">
            فُحص {result.searchedPages} صفحة في {result.elapsedMs} ملي ثانية.
          </p>
        </div>
      ) : null}

      {best ? (
        <article className="rounded-xl bg-paper-2 p-5 shadow-[0_0_0_1px_rgba(11,31,51,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    best.status === "exact"
                      ? "ok"
                      : best.status === "near"
                        ? "accent"
                        : "warn"
                  }
                >
                  {statusLabel(best.status)}
                </Badge>
                <Badge>{best.sourceTitle}</Badge>
              </div>
              <h2 className="mt-3 text-lg font-medium text-navy">{best.author}</h2>
              <p className="text-sm text-mist">
                {best.edition}
                {best.volume ? ` · ج ${best.volume}` : ""} · ص {best.page} · سطر{" "}
                {best.line}
              </p>
              {best.url ? (
                <a
                  href={best.url}
                  className="mt-1 inline-block text-xs text-accent"
                  target="_blank"
                  rel="noreferrer"
                >
                  المرجع على الشبكة
                </a>
              ) : null}
            </div>
            <ScoreRing score={best.score} />
          </div>
          <div className="mt-5">
            <DiffView hit={best} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(formatInlineQuote(best));
                toast.success("نُسخ الاقتباس الموثّق");
              }}
            >
              <Copy />
              نسخ التوثيق
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(formatCitation(best));
                toast.success("نُسخت بيانات المصدر");
              }}
            >
              <BookMarked />
              نسخ الحاشية
            </Button>
            {onOpenPage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenPage(best.sourceId, best.page, best.originalText)}
              >
                عرض صفحة المصدر
              </Button>
            ) : null}
          </div>
          {result && result.hits.length > 1 ? (
            <div className="mt-6 border-t border-line pt-4">
              <p className="mb-2 text-xs text-mist">مواضع أخرى</p>
              <ul className="space-y-2">
                {result.hits.slice(1).map((hit) => (
                  <li key={`${hit.sourceId}-${hit.page}`}>
                    <button
                      type="button"
                      className="text-sm text-ink hover:text-accent"
                      onClick={() => onOpenPage?.(hit.sourceId, hit.page, hit.originalText)}
                    >
                      {hit.sourceTitle} · ص {hit.page} · {statusLabel(hit.status)} ·{" "}
                      {Math.round(hit.score * 100)}٪
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}

function ManhajPanel({ sources }: { sources: Source[] }) {
  const tafsir = sources.filter(
    (s) => s.kind === "tafsir" || s.kind === "usul" || s.kind === "upload",
  );
  const [sourceId, setSourceId] = useState(tafsir[0]?.id ?? "tabari");
  const [focus, setFocus] = useState("الإسرائيليات والعقيدة");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ManhajReport | null>(
    curatedManhaj("tabari"),
  );
  const source = sources.find((s) => s.id === sourceId) ?? sources[0];

  async function extract() {
    if (!source) return;
    const ready = curatedManhaj(source.id);
    if (ready && !focus.includes("فقط من المقاطع")) {
      setReport(ready);
      toast.success("تقرير معتمد من مادة المصدر");
      return;
    }
    setBusy(true);
    const chunks = manhajSeedChunks(source, focus);
    const out = await generateManhaj({
      data: {
        sourceId: source.id,
        sourceTitle: source.title,
        author: source.author,
        edition: source.edition,
        focus,
        chunks,
      },
    });
    setBusy(false);
    if (!out.ok || !out.report) {
      toast.error(out.error ?? "تعذّر الاستخراج");
      setReport(ready ?? null);
      return;
    }
    setReport(out.report);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-medium text-navy">منهج المفسر</h1>
        <p className="mt-1 text-sm leading-7 text-mist">
          تقرير جاهز لتكليف مناهج المفسرين: الترجمة، العقيدة، الإسرائيليات،
          اللغة، والأحكام — مع اقتباسات مرقّمة يمكن التحقق منها في تبويب النقل.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-mist">الكتاب</span>
          <select
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value);
              const ready = curatedManhaj(e.target.value);
              setReport(ready ?? null);
            }}
            className="h-11 w-full rounded-md border border-line bg-paper-2 px-3 text-ink outline-none focus:ring-2 focus:ring-accent/40"
          >
            {tafsir.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortTitle} — {s.author}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mist">تركيز التكليف</span>
          <input
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className="h-11 w-full rounded-md border border-line bg-paper-2 px-3 text-ink outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
      </div>
      <Button onClick={() => void extract()} disabled={busy}>
        {busy ? <LoaderCircle className="animate-spin" /> : <ScrollText />}
        استخراج المنهج
      </Button>
      {report ? <ManhajView report={report} /> : null}
    </div>
  );
}

function ManhajView({ report }: { report: ManhajReport }) {
  const facts = [
    ["الاسم والنسب", report.nasab],
    ["المولد", `${report.born} — ${report.birthplace}`],
    ["الوفاة", report.died],
    ["الاستقرار", report.residence],
    ["الشيوخ", report.teachers],
    ["التلاميذ", report.students],
    ["المؤلفات", report.works],
  ];
  return (
    <article className="space-y-5 rounded-xl bg-paper-2 p-5 shadow-[0_0_0_1px_rgba(11,31,51,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge tone="navy">
            {report.generatedBy === "curated" ? "مادة معتمدة" : "مستخرج من المقاطع"}
          </Badge>
          <h2 className="mt-2 font-quote text-2xl text-navy">{report.scholarName}</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(reportToPlainText(report));
              toast.success("نُسخ التقرير");
            }}
          >
            <Copy />
            نسخ
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const blob = new Blob([reportToPlainText(report)], {
                type: "text/plain;charset=utf-8",
              });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `manhaj-${report.sourceId}.txt`;
              a.click();
            }}
          >
            <Download />
            تنزيل
          </Button>
        </div>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-paper p-3">
            <dt className="text-xs text-mist">{k}</dt>
            <dd className="mt-1 text-sm leading-7 text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {report.sections.map((section) => (
        <section key={section.title} className="border-t border-line pt-4">
          <h3 className="text-lg font-medium text-navy">{section.title}</h3>
          <p className="mt-2 leading-8 text-ink">{section.body}</p>
          {section.quotes.map((q, i) => (
            <blockquote
              key={`${q.page}-${i}`}
              className="mt-3 rounded-md border-s-2 border-accent bg-paper p-3"
            >
              <p className="font-quote text-lg leading-loose text-ink">«{q.excerpt}»</p>
              <footer className="mt-1 text-xs text-mist">
                {q.title} · {q.volume ? `ج ${q.volume} · ` : ""}ص {q.page} · {q.edition}
              </footer>
            </blockquote>
          ))}
        </section>
      ))}
      <p className="text-xs leading-6 text-mist">{report.disclaimer}</p>
    </article>
  );
}

function AskPanel({
  sources,
  onOpenPage,
}: {
  sources: Source[];
  onOpenPage?: (sourceId: string, page: number, highlight?: string) => void;
}) {
  const [question, setQuestion] = useState("ما منهج الطبري في الإسرائيليات؟");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<AskResult | null>(null);

  const examples = [
    "ما منهج الطبري في الإسرائيليات؟",
    "لماذا تختلف أقوال المفسرين؟",
    "أين ورد إياك نعبد وإياك نستعين؟",
    "هل يجوز لي في زواجي أن أفعل كذا وأنا في دولة أخرى؟",
  ];

  async function ask(next = question) {
    if (!next.trim()) return;
    setBusy(true);
    const grounded = localAsk(next, sources);
    setAnswer(grounded);
    const fatwa = looksLikePersonalFatwa(next) || Boolean(grounded.fatwaReferral);
    if (fatwa) {
      setBusy(false);
      return;
    }
    const chunks = retrieveChunks(next, sources, 8);
    try {
      const out = await askFromSources({
        data: { question: next, chunks, fatwa: false },
      });
      if (out.ok && out.answer) {
        setAnswer({
          ...out,
          citations:
            out.citations && out.citations.length > 0
              ? out.citations
              : grounded.citations,
        });
      }
    } catch {
      toast("اعتمدنا الشواهد المسترجعة من المصدر دون توليد حر.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-medium text-navy">اسأل المصدر</h1>
        <p className="mt-1 text-sm leading-7 text-mist">
          كدفتر ملاحظات مربوط بكتبك: الإجابة من المقاطع المسترجعة فقط. إن غاب
          الدليل صرّحنا بالعجز ولم نُكمل من الحفظ.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            className="h-9 rounded-full border border-line bg-paper-2 px-3 text-xs text-navy"
            onClick={() => {
              setQuestion(ex);
              void ask(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-line bg-paper-2 p-4 text-base leading-8 text-ink outline-none focus:ring-2 focus:ring-accent/40"
      />
      <Button onClick={() => void ask()} disabled={busy}>
        {busy ? <LoaderCircle className="animate-spin" /> : <MessageSquareText />}
        اسأل من المصادر المحددة
      </Button>
      {answer?.ok && answer.answer ? (
        <article className="rounded-xl bg-paper-2 p-5 shadow-[0_0_0_1px_rgba(11,31,51,0.06)]">
          <div className="flex flex-wrap gap-2">
            {answer.level ? <Badge tone="accent">مستوى {answer.level}</Badge> : null}
            {answer.fatwaReferral ? <Badge tone="warn">إحالة لا فتوى</Badge> : null}
            {answer.insufficient ? <Badge tone="danger">المادة غير كافية</Badge> : null}
          </div>
          <div className="mt-4 space-y-3 text-ink">
            {answer.answer.split("\n\n").map((para, i) => (
              <p key={i} className="leading-8 whitespace-pre-wrap">
                {para}
              </p>
            ))}
          </div>
          {answer.citations && answer.citations.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {answer.citations.map((c, i) => (
                <li key={`${c.sourceId}-${c.page}-${i}`}>
                  {c.sourceId.startsWith("web:") && c.url ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-start text-sm text-mist hover:text-accent"
                    >
                      مصدر معتمد · {c.title}
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="text-start text-sm text-mist hover:text-accent"
                      onClick={() => onOpenPage?.(c.sourceId, c.page, c.excerpt)}
                    >
                      {c.author} · {c.title} · ص {c.page}
                      {c.excerpt ? ` — «${c.excerpt.slice(0, 90)}…»` : ""}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}

function LibraryPanel({
  onOpenPage,
}: {
  onOpenPage?: (sourceId: string, page: number) => void;
}) {
  const uploads = useNaqlStore((s) => s.uploads);
  const addUpload = useNaqlStore((s) => s.addUpload);
  const removeUpload = useNaqlStore((s) => s.removeUpload);
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const sources = useMemo(() => allSources(uploads), [uploads]);

  async function onFiles(files: FileList | null) {
    if (!files?.[0]) return;
    const file = files[0];
    try {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setProgress(0);
        const source = await extractPdfFile(file, setProgress);
        addUpload(source);
        toast.success(`أُضيف «${source.title}» إلى قائمتك`);
      } else if (file.type.startsWith("image/")) {
        setProgress(0.2);
        const dataUrl = await fileToDataUrl(file);
        const out = await ocrImage({
          data: { imageDataUrl: dataUrl, mime: file.type },
        });
        if (!out.ok || !out.text) {
          toast.error(out.error ?? "تعذّر استخراج النص");
        } else {
          addUpload(sourceFromOcr(file.name, out.text));
          toast.success("استُخرج نص الصورة وأُضيف إلى المكتبة");
        }
      } else {
        toast.error("ارفع ملف PDF أو صورة صفحة");
      }
    } catch {
      toast.error("تعذّر قراءة الملف. جرّب PDFاً نصّياً أوضح.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-medium text-navy">المكتبة</h1>
        <p className="mt-1 text-sm leading-7 text-mist">
          المصدر الذي ترفعه هو الذي يظهر في قائمة الاقتباس. المصادر المضمّنة
          معتمدة وفق حزمة التحدي، ومرفوعاتك تبقى في جهازك.
        </p>
      </header>
      <div className="rounded-xl border border-dashed border-accent/40 bg-paper-2 p-6 text-center">
        <Upload className="mx-auto size-8 text-accent" />
        <p className="mt-2 text-sm text-ink">PDF نصّي أو صورة صفحة (استخراج ضوئي)</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <Button
          className="mt-4"
          variant="accent"
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null}
        >
          {progress !== null ? (
            <>
              <LoaderCircle className="animate-spin" />
              استخراج {Math.round((progress ?? 0) * 100)}٪
            </>
          ) : (
            <>رفع المصدر</>
          )}
        </Button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {sources.map((source) => (
          <li
            key={source.id}
            className="rounded-xl bg-paper-2 p-4 shadow-[0_0_0_1px_rgba(11,31,51,0.06)]"
          >
            <div className="flex items-start justify-between gap-2">
              <Badge tone={source.trusted ? "ok" : "mist"}>
                {source.trusted ? "معتمد" : "مرفوعك"}
              </Badge>
              {source.origin === "upload" ? (
                <button
                  type="button"
                  className="grid size-10 place-items-center text-mist hover:text-danger"
                  onClick={() => removeUpload(source.id)}
                  aria-label="حذف"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
            <h3 className="mt-2 font-medium text-navy">{source.shortTitle}</h3>
            <p className="text-sm text-mist">{sourceMetaLine(source)}</p>
            <p className="mt-2 text-xs text-mist">
              {kindLabel(source.kind)} · {source.pages.length} صفحة
              {source.url ? ` · ${source.url.replace("https://", "")}` : ""}
            </p>
            {source.centuryNote ? (
              <p className="mt-2 text-xs leading-6 text-ink/80">{source.centuryNote}</p>
            ) : null}
            {source.pages[0] && onOpenPage ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => onOpenPage(source.id, source.pages[0]!.page)}
              >
                فتح الكتاب
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

