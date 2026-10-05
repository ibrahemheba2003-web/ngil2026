import { curatedManhaj } from "./manhaj";
import { retrieveChunks, verifyQuote } from "./match";
import { looksLikeHadith, looksLikePersonalFatwa, normalizeArabic } from "./normalize";
import type { AskResult, Citation, Source } from "./types";

function citationsFromChunks(chunks: ReturnType<typeof retrieveChunks>): Citation[] {
  return chunks.map((c) => ({
    sourceId: c.sourceId,
    title: c.title,
    author: c.author,
    edition: c.edition,
    page: c.page,
    volume: c.volume,
    excerpt: c.text.slice(0, 280),
    kind: c.kind,
    url: c.url,
  }));
}

export function localAsk(question: string, sources: Source[]): AskResult {
  const q = question.trim();
  if (!q) {
    return { ok: false, error: "اكتب سؤالاً أولاً." };
  }
  if (looksLikePersonalFatwa(q)) {
    return {
      ok: true,
      level: "D",
      fatwaReferral: true,
      answer:
        "هذا السؤال يتعلق بواقعة شخصية أو حكم يحتاج تقدير عالم مؤهل. «نقل» لا يستقل بالفتوى ولا ينزّل الحكم على حالتك. راجع مفتياً أو جهة علمية معتمدة في بلدك. يمكن قراءة المعلومات العامة المستقرة في المصادر دون اعتبارها فتوى.",
      citations: [],
      notes: ["مستوى د — إحالة إلى مختص"],
    };
  }

  const n = normalizeArabic(q);
  if (looksLikeHadith(q) && (n.includes("اثبت") || n.includes("حديثا") || n.startsWith("اعطني حديث"))) {
    const found = verifyQuote(q, sources.filter((s) => s.kind === "hadith" || s.kind === "tafsir"));
    if (!found.best) {
      return {
        ok: true,
        level: "A",
        insufficient: true,
        answer:
          "لم يُعثر على حديث مطابق في المصادر المحددة (الصحيحين وما أُضيف من الحزمة). لا يُنسب حديث إلى النبي صلى الله عليه وسلم دون مصدر وحكم معتمد، ولا يُختلق متن إذا غاب الدليل.",
        citations: [],
        notes: ["مقاومة الهلوسة — الامتناع عند غياب المرجع"],
      };
    }
  }

  const manhajHint = manhajHintAnswer(n, sources);
  const chunks = retrieveChunks(q, sources, 6);
  if (chunks.length === 0 && !manhajHint) {
    return {
      ok: true,
      insufficient: true,
      level: "B",
      answer:
        "لا توجد مقاطع كافية في المصادر المحددة للإجابة. ارفع الكتاب أو فعّل المصدر من العمود الأيسر ثم أعد السؤال. لن نُكمل من خارج الحزمة.",
      citations: [],
    };
  }

  const parts: string[] = [];
  if (manhajHint) {
    parts.push(manhajHint.body);
  }
  if (chunks.length > 0) {
    parts.push("هذه أقرب الشواهد في المصادر المحددة، مع العزو إلى الصفحة:");
    chunks.forEach((c, i) => {
      const loc = c.volume ? `ج ${c.volume}، ص ${c.page}` : `ص ${c.page}`;
      parts.push(
        `${i + 1}. ${c.author}، ${c.title}، ${c.edition}، ${loc} — «${c.text}»`,
      );
    });
  }
  parts.push(
    "الخلاصة مقيَّدة بهذه المقاطع. إن احتملت المسألة خلافاً فلا قطع. هذا عرض علمي لا فتوى.",
  );

  return {
    ok: true,
    level: manhajHint ? "B" : chunks[0]?.kind === "quran" || chunks[0]?.kind === "hadith" ? "A" : "B",
    answer: parts.join("\n\n"),
    citations: [
      ...(manhajHint?.citations ?? []),
      ...citationsFromChunks(chunks),
    ],
    notes: ["إجابة مسترجعة من المصدر — دون توليد حر"],
  };
}

function manhajHintAnswer(
  n: string,
  sources: Source[],
): { body: string; citations: Citation[] } | null {
  const wantsManhaj =
    n.includes("منهج") || n.includes("اسرائي") || n.includes("ولد") || n.includes("عقيد");
  if (!wantsManhaj) return null;
  const id = n.includes("كثير") ? "ibn-kathir" : n.includes("طبري") ? "tabari" : null;
  if (!id) return null;
  if (!sources.some((s) => s.id === id)) return null;
  const report = curatedManhaj(id);
  if (!report) return null;
  const section =
    report.sections.find((s) => {
      const t = normalizeArabic(s.title);
      if (n.includes("اسرائي")) return t.includes("اسرائي");
      if (n.includes("عقيد")) return t.includes("عقيد");
      if (n.includes("قراء") || n.includes("لغه")) return t.includes("قراء") || t.includes("لغه");
      return t.includes("العام") || t.includes("التفسير");
    }) ?? report.sections[0];
  if (!section) return null;
  return {
    body: `${report.scholarName} (${report.born}، ${report.birthplace} — ${report.died}). ${section.title}: ${section.body}`,
    citations: section.quotes,
  };
}

