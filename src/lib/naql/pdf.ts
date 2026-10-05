import type { Source, SourcePage } from "./types";
import { repairExtractedText } from "./normalize";

const MAX_PAGES = 80;

type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
};

function groupLines(items: PdfTextItem[]): string {
  const rows: Array<{ y: number; parts: Array<{ x: number; str: string }> }> = [];
  for (const item of items) {
    const str = item.str ?? "";
    if (!str.trim()) continue;
    const x = item.transform?.[4] ?? 0;
    const y = Math.round(item.transform?.[5] ?? 0);
    const row = rows.find((r) => Math.abs(r.y - y) <= 3);
    if (row) row.parts.push({ x, str });
    else rows.push({ y, parts: [{ x, str }] });
  }
  rows.sort((a, b) => b.y - a.y);
  const lines = rows.map((row) => {
    const ltr = row.parts
      .slice()
      .sort((a, b) => a.x - b.x)
      .map((p) => p.str)
      .join(" ");
    const rtl = row.parts
      .slice()
      .sort((a, b) => b.x - a.x)
      .map((p) => p.str)
      .join(" ");
    return repairExtractedText(rtl).length >= repairExtractedText(ltr).length
      ? rtl
      : ltr;
  });
  return repairExtractedText(lines.join("\n"));
}

export async function extractPdfFile(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<Source> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const total = Math.min(doc.numPages, MAX_PAGES);
  const pages: SourcePage[] = [];
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as PdfTextItem[];
    const text = groupLines(items).trim();
    pages.push({
      page: i,
      text: text || "",
      kind: "other",
    });
    onProgress?.(i / total);
  }
  const filled = pages.filter((p) => p.text.replace(/\s/g, "").length > 12).length;
  return {
    id: `upload-${Date.now()}`,
    title: file.name.replace(/\.pdf$/i, ""),
    shortTitle: file.name.replace(/\.pdf$/i, ""),
    author: "مصدر مرفوع من الباحث",
    edition: "نسخة الباحث المرفوعة",
    publisher: "محلي",
    kind: "upload",
    trusted: false,
    origin: "upload",
    pages,
    centuryNote:
      filled === 0
        ? "لم يُستخرج نص كافٍ — قد يكون المصحف صورة تحتاج استخراجاً ضوئياً"
        : `استُخرج النص من ${filled} صفحة نصّية`,
  };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function sourceFromOcr(fileName: string, text: string): Source {
  const cleaned = repairExtractedText(text);
  return {
    id: `upload-${Date.now()}`,
    title: fileName.replace(/\.(png|jpe?g|webp)$/i, ""),
    shortTitle: fileName,
    author: "صورة مرفوعة من الباحث",
    edition: "استخراج ضوئي من صورة الباحث",
    publisher: "محلي",
    kind: "upload",
    trusted: false,
    origin: "upload",
    pages: [{ page: 1, text: cleaned, kind: "other" }],
  };
}
