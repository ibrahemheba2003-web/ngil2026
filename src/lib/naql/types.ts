export type SourceKind =
  | "quran"
  | "hadith"
  | "tafsir"
  | "usul"
  | "fiqh"
  | "sira"
  | "lugha"
  | "upload";

export type PassageKind =
  | "quran"
  | "hadith"
  | "commentary"
  | "bio"
  | "muqaddimah"
  | "other";

export type ContentLevel = "A" | "B" | "C" | "D";

export type MatchStatus = "exact" | "near" | "partial" | "missing";

export type DiffOp = "equal" | "insert" | "delete" | "replace";

export type DiffChunk = {
  op: DiffOp;
  quote: string;
  source: string;
};

export type SourcePage = {
  page: number;
  volume?: number;
  lineHint?: number;
  text: string;
  kind?: PassageKind;
};

export type Source = {
  id: string;
  title: string;
  shortTitle: string;
  author: string;
  deathYear?: string;
  edition: string;
  publisher: string;
  year?: string;
  url?: string;
  kind: SourceKind;
  trusted: boolean;
  origin: "builtin" | "upload";
  centuryNote?: string;
  pages: SourcePage[];
};

export type QuoteHit = {
  sourceId: string;
  sourceTitle: string;
  author: string;
  edition: string;
  url?: string;
  volume?: number;
  page: number;
  line: number;
  score: number;
  status: MatchStatus;
  originalText: string;
  quoteText: string;
  contextBefore: string;
  contextAfter: string;
  diffs: DiffChunk[];
  passageKind: PassageKind;
  sourceKind: SourceKind;
};

export type VerifyResult = {
  quote: string;
  hits: QuoteHit[];
  best: QuoteHit | null;
  searchedPages: number;
  elapsedMs: number;
  hadithWarning?: string;
};

export type Citation = {
  sourceId: string;
  title: string;
  author: string;
  edition: string;
  page: number;
  volume?: number;
  excerpt: string;
  kind: PassageKind;
  url?: string;
};

export type AskResult = {
  ok: boolean;
  error?: string;
  answer?: string;
  level?: ContentLevel;
  citations?: Citation[];
  fatwaReferral?: boolean;
  insufficient?: boolean;
  notes?: string[];
};

export type ManhajSection = {
  title: string;
  body: string;
  quotes: Citation[];
};

export type ManhajReport = {
  sourceId: string;
  scholarName: string;
  nasab: string;
  born: string;
  died: string;
  birthplace: string;
  residence: string;
  teachers: string;
  students: string;
  works: string;
  sections: ManhajSection[];
  generatedBy: "curated" | "model";
  disclaimer: string;
};

export type RetrievedChunk = {
  sourceId: string;
  title: string;
  author: string;
  edition: string;
  url?: string;
  page: number;
  volume?: number;
  text: string;
  kind: PassageKind;
  sourceKind: SourceKind;
};
