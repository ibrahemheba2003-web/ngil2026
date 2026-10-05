import type { Citation, QuoteHit, Source } from "./types";

export function formatCitation(hit: {
  author: string;
  sourceTitle: string;
  edition: string;
  volume?: number;
  page: number;
}): string {
  const vol = hit.volume ? `ج${hit.volume}، ` : "";
  return `${hit.author}، ${hit.sourceTitle}. ${hit.edition}. ${vol}ص ${hit.page}.`;
}

export function formatInlineQuote(hit: QuoteHit): string {
  const loc = hit.volume
    ? `ج${hit.volume}/ص ${hit.page}`
    : `ص ${hit.page}`;
  return `قال ${hit.author}: «${hit.originalText}» (${hit.sourceTitle}، ${loc}).`;
}

export function citationFromHit(hit: QuoteHit): Citation {
  return {
    sourceId: hit.sourceId,
    title: hit.sourceTitle,
    author: hit.author,
    edition: hit.edition,
    page: hit.page,
    volume: hit.volume,
    excerpt: hit.originalText,
    kind: hit.passageKind,
    url: hit.url,
  };
}

export function sourceMetaLine(source: Source): string {
  const bits = [source.author];
  if (source.deathYear) bits.push(source.deathYear);
  bits.push(source.edition);
  if (source.year) bits.push(source.year);
  return bits.join(" · ");
}

export function kindLabel(kind: Source["kind"]): string {
  switch (kind) {
    case "quran":
      return "قرآن";
    case "hadith":
      return "حديث";
    case "tafsir":
      return "تفسير";
    case "usul":
      return "أصول التفسير";
    case "fiqh":
      return "فقه";
    case "sira":
      return "سيرة";
    case "lugha":
      return "لغة";
    default:
      return "مرفوع";
  }
}

export function passageKindLabel(kind: Citation["kind"]): string {
  switch (kind) {
    case "quran":
      return "نص قرآني";
    case "hadith":
      return "حديث نبوي";
    case "commentary":
      return "كلام المفسر / شرح";
    case "bio":
      return "ترجمة";
    case "muqaddimah":
      return "مقدمة المؤلف";
    default:
      return "نص المصدر";
  }
}
