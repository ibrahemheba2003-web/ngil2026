import type {
  DiffChunk,
  PassageKind,
  QuoteHit,
  Source,
  VerifyResult,
} from "./types";
import {
  looksLikeHadith,
  normalizeArabic,
  tokenizeRaw,
} from "./normalize";

type Token = { raw: string; norm: string };

function toTokens(text: string): Token[] {
  return tokenizeRaw(text).map((raw) => ({
    raw,
    norm: normalizeArabic(raw),
  }));
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a.filter(Boolean));
  const B = new Set(b.filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
}

function sequenceRatio(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? (dp[i - 1]![j - 1] ?? 0) + 1
          : Math.max(dp[i - 1]![j] ?? 0, dp[i]![j - 1] ?? 0);
    }
  }
  const lcs = dp[m]![n] ?? 0;
  return (2 * lcs) / (m + n);
}

function wordDiff(quote: Token[], source: Token[]): DiffChunk[] {
  const a = quote.map((t) => t.norm);
  const b = source.map((t) => t.norm);
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? (dp[i - 1]![j - 1] ?? 0) + 1
          : Math.max(dp[i - 1]![j] ?? 0, dp[i]![j - 1] ?? 0);
    }
  }
  const chunks: DiffChunk[] = [];
  let i = m;
  let j = n;
  const rev: DiffChunk[] = [];
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      rev.push({
        op: "equal",
        quote: quote[i - 1]!.raw,
        source: source[j - 1]!.raw,
      });
      i -= 1;
      j -= 1;
    } else if ((dp[i - 1]![j] ?? 0) >= (dp[i]![j - 1] ?? 0)) {
      rev.push({ op: "insert", quote: quote[i - 1]!.raw, source: "" });
      i -= 1;
    } else {
      rev.push({ op: "delete", quote: "", source: source[j - 1]!.raw });
      j -= 1;
    }
  }
  while (i > 0) {
    rev.push({ op: "insert", quote: quote[i - 1]!.raw, source: "" });
    i -= 1;
  }
  while (j > 0) {
    rev.push({ op: "delete", quote: "", source: source[j - 1]!.raw });
    j -= 1;
  }
  for (let k = rev.length - 1; k >= 0; k--) chunks.push(rev[k]!);
  return mergeReplace(chunks);
}

function mergeReplace(chunks: DiffChunk[]): DiffChunk[] {
  const out: DiffChunk[] = [];
  for (const chunk of chunks) {
    const prev = out[out.length - 1];
    if (
      prev &&
      ((prev.op === "insert" && chunk.op === "delete") ||
        (prev.op === "delete" && chunk.op === "insert"))
    ) {
      out.pop();
      out.push({
        op: "replace",
        quote: prev.op === "insert" ? prev.quote : chunk.quote,
        source: prev.op === "delete" ? prev.source : chunk.source,
      });
      continue;
    }
    out.push(chunk);
  }
  return out;
}

function statusFromScore(score: number, quoteLen: number): QuoteHit["status"] {
  if (score >= 0.97) return "exact";
  if (score >= 0.84) return "near";
  if (score >= (quoteLen <= 6 ? 0.72 : 0.55)) return "partial";
  return "missing";
}

function estimateLine(index: number): number {
  return Math.floor(index / 11) + 1;
}

function rareTerms(norms: string[]): string[] {
  return [...new Set(norms.filter((w) => w.length >= 4))].slice(0, 12);
}

function scoreWindow(needle: string[], window: string[]): number {
  const jac = jaccard(needle, window);
  const seq = sequenceRatio(needle, window);
  return jac * 0.42 + seq * 0.58;
}

function bestWindow(
  hay: Token[],
  needle: Token[],
): { start: number; end: number; score: number } | null {
  const n = needle.map((t) => t.norm).filter(Boolean);
  const h = hay.map((t) => t.norm);
  if (n.length === 0 || h.length === 0) return null;

  const joinedH = h.join(" ");
  const joinedN = n.join(" ");
  const exactAt = joinedH.indexOf(joinedN);
  if (exactAt >= 0) {
    let consumed = 0;
    let start = 0;
    for (let i = 0; i < h.length; i++) {
      if (consumed === exactAt) {
        start = i;
        break;
      }
      consumed += (h[i]?.length ?? 0) + 1;
    }
    return { start, end: start + n.length, score: 1 };
  }

  const minW = Math.max(1, n.length - 3);
  const maxW = Math.min(h.length, n.length + 4);
  let best = { start: 0, end: 0, score: 0 };
  const step = n.length > 18 ? 2 : 1;
  for (let i = 0; i < h.length; i += step) {
    for (let w = minW; w <= maxW && i + w <= h.length; w++) {
      const score = scoreWindow(n, h.slice(i, i + w));
      if (score > best.score) best = { start: i, end: i + w, score };
    }
  }
  return best.score > 0 ? best : null;
}

function pageKind(source: Source, pageKind?: PassageKind): PassageKind {
  if (pageKind) return pageKind;
  if (source.kind === "quran") return "quran";
  if (source.kind === "hadith") return "hadith";
  return "other";
}

export function retrieveChunks(
  query: string,
  sources: Source[],
  limit = 8,
): import("./types").RetrievedChunk[] {
  const q = toTokens(query);
  const qn = q.map((t) => t.norm);
  const terms = rareTerms(qn);
  const scored: Array<import("./types").RetrievedChunk & { score: number }> =
    [];

  for (const source of sources) {
    for (const page of source.pages) {
      const tokens = toTokens(page.text);
      const norms = tokens.map((t) => t.norm);
      const coverage =
        terms.length === 0
          ? 0
          : terms.filter((t) => norms.includes(t)).length / terms.length;
      const window = bestWindow(tokens, q);
      const score = Math.max(coverage, window?.score ?? 0);
      if (score < 0.12) continue;
      const start = window?.start ?? 0;
      const end = window?.end ?? Math.min(tokens.length, start + 80);
      const slice = tokens.slice(Math.max(0, start - 12), end + 18);
      scored.push({
        sourceId: source.id,
        title: source.title,
        author: source.author,
        edition: source.edition,
        url: source.url,
        page: page.page,
        volume: page.volume,
        text: slice.map((t) => t.raw).join(" "),
        kind: pageKind(source, page.kind),
        sourceKind: source.kind,
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ score: _s, ...rest }) => rest);
}

export function verifyQuote(
  quote: string,
  sources: Source[],
): VerifyResult {
  const started = performance.now();
  const trimmed = quote.replace(/\s+/g, " ").trim();
  const needle = toTokens(trimmed);
  const hits: QuoteHit[] = [];
  let searchedPages = 0;
  const terms = rareTerms(needle.map((t) => t.norm));

  for (const source of sources) {
    for (const page of source.pages) {
      searchedPages += 1;
      const tokens = toTokens(page.text);
      if (tokens.length === 0) continue;
      if (terms.length >= 3) {
        const pageSet = new Set(tokens.map((t) => t.norm));
        const hitCount = terms.filter((t) => pageSet.has(t)).length;
        if (hitCount / terms.length < 0.28) continue;
      }
      const window = bestWindow(tokens, needle);
      if (!window) continue;
      const sourceSlice = tokens.slice(window.start, window.end);
      const score = window.score;
      const status = statusFromScore(score, needle.length);
      if (status === "missing") continue;
      const before = tokens
        .slice(Math.max(0, window.start - 10), window.start)
        .map((t) => t.raw)
        .join(" ");
      const after = tokens
        .slice(window.end, window.end + 10)
        .map((t) => t.raw)
        .join(" ");
      hits.push({
        sourceId: source.id,
        sourceTitle: source.title,
        author: source.author,
        edition: source.edition,
        url: source.url,
        volume: page.volume,
        page: page.page,
        line: estimateLine(window.start),
        score,
        status,
        originalText: sourceSlice.map((t) => t.raw).join(" "),
        quoteText: trimmed,
        contextBefore: before,
        contextAfter: after,
        diffs: wordDiff(needle, sourceSlice),
        passageKind: pageKind(source, page.kind),
        sourceKind: source.kind,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  const unique: QuoteHit[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    const key = `${hit.sourceId}:${hit.page}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(hit);
    if (unique.length >= 6) break;
  }

  const best = unique[0] ?? null;
  let hadithWarning: string | undefined;
  if (!best && looksLikeHadith(trimmed)) {
    hadithWarning =
      "لم يُعثر على حديث مطابق في المصادر المحددة. لا يُنسب حديث إلى النبي صلى الله عليه وسلم دون مصدر وحكم معتمد.";
  }

  return {
    quote: trimmed,
    hits: unique,
    best,
    searchedPages,
    elapsedMs: Math.round(performance.now() - started),
    hadithWarning,
  };
}

export function scoreLabel(score: number): string {
  return `${Math.round(score * 100)}٪`;
}

export function statusLabel(status: QuoteHit["status"]): string {
  switch (status) {
    case "exact":
      return "مطابق للأصل";
    case "near":
      return "اختلاف يسير";
    case "partial":
      return "قريب مع تحرير";
    default:
      return "غير موجود";
  }
}
