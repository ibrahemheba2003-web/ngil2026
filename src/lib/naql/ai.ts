import { createServerFn } from "@tanstack/react-start";
import type { AskResult, ContentLevel, ManhajReport, PassageKind } from "./types";

type ChunkIn = {
  sourceId: string;
  title: string;
  author: string;
  edition: string;
  url?: string;
  page: number;
  volume?: number;
  text: string;
  kind: PassageKind;
  sourceKind: string;
};

const POLICY = `أنت محرك «نقل» للتحقق العلمي من المحتوى الإسلامي. لست مفتياً ولا عالماً بشرياً.
قواعد ملزمة:
1) أجب فقط من المقاطع المرفقة. إن لم تكفِ فصرّح بعدم كفاية المعلومات ولا تُكمل من حفظك.
2) لا تختلق حديثاً ولا آية ولا عزواً. لا تنسب قولاً إلى كتاب إن لم يرد في المقاطع.
3) فرّق بين النص القرآني والحديث وبين كلام المفسر/الشرح.
4) المسائل الخلافية لا تُعرض بصيغة القطع.
5) لا تُفتِ في واقعة شخصية. إن كان السؤال فتوى شخصية: معلومات عامة فقط مع إحالة إلى جهة مؤهلة.
6) مستويات المحتوى: أ معلومات أصلية مستقرة، ب شرح واستدلال، ج خلاف/حساسية، د فتوى شخصية.
7) أظهر المصدر والطبعة ورقم الصفحة في الاستشهاد.
8) العربية الفصيحة الواضحة، الأصل قبل الفرع.
9) أنت أداة مدعومة بالذكاء الاصطناعي.`;

function readKey(): string | null {
  return process.env.XAI_API_KEY ?? null;
}

async function complete(messages: unknown[], maxTokens: number): Promise<string> {
  const apiKey = readKey();
  if (!apiKey) throw new Error("unavailable");
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages,
    }),
  });
  if (!res.ok) {
    throw new Error(`xAI API error ${res.status}`);
  }
  const body = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return body.choices[0]?.message.content ?? "";
}

function parseJson(text: string): Record<string, unknown> {
  const trimmed = text.trim().replace(/^```json\s*|\s*```$/g, "");
  return JSON.parse(trimmed) as Record<string, unknown>;
}

export const askFromSources = createServerFn({ method: "POST" })
  .validator((input: { question: string; chunks: ChunkIn[]; fatwa: boolean }) => input)
  .handler(async ({ data }): Promise<AskResult> => {
    if (!readKey()) {
      return { ok: false, error: "خدمة الذكاء غير متاحة حالياً. استخدم التحقق النصي من المصدر." };
    }
    if (data.fatwa) {
      return {
        ok: true,
        level: "D",
        fatwaReferral: true,
        insufficient: false,
        answer:
          "هذا السؤال يتعلق بواقعة شخصية أو حكم يحتاج تقدير عالم مؤهل. «نقل» لا يستقل بالفتوى. يمكن عرض المعلومات العامة المستقرة من المصادر، دون تنزيل الحكم على حالتك. راجع مفتياً أو جهة علمية معتمدة في بلدك.",
        citations: [],
        notes: ["مستوى د: إحالة إلى مختص"],
      };
    }
    if (data.chunks.length === 0) {
      return {
        ok: true,
        insufficient: true,
        level: "B",
        answer:
          "لا توجد مقاطع كافية في المصادر المحددة للإجابة. ارفع المصدر أو اختر كتاباً من المكتبة ثم أعد السؤال.",
        citations: [],
      };
    }
    const packed = data.chunks
      .map(
        (c, i) =>
          `[#${i + 1} | ${c.title} | ${c.author} | ${c.edition} | ص ${c.page}${c.volume ? ` ج${c.volume}` : ""} | نوع:${c.kind}]\n${c.text}`,
      )
      .join("\n\n");
    try {
      const raw = await complete(
        [
          { role: "system", content: POLICY },
          {
            role: "user",
            content: `السؤال:\n${data.question}\n\nالمقاطع المعتمدة فقط:\n${packed}\n\nأرجع JSON بالمفاتيح: answer, level (A|B|C|D), insufficient (boolean), fatwaReferral (boolean), notes (string[]), citations: [{sourceId,title,author,edition,page,volume,excerpt,kind,url}]`,
          },
        ],
        1400,
      );
      const json = parseJson(raw);
      return {
        ok: true,
        answer: String(json.answer ?? ""),
        level: (json.level as ContentLevel) || "B",
        insufficient: Boolean(json.insufficient),
        fatwaReferral: Boolean(json.fatwaReferral),
        notes: Array.isArray(json.notes) ? (json.notes as string[]) : [],
        citations: Array.isArray(json.citations)
          ? (json.citations as AskResult["citations"])
          : [],
      };
    } catch {
      return { ok: false, error: "تعذّر توليد الإجابة من المقاطع. يمكنك الاعتماد على نتائج المطابقة النصية." };
    }
  });

export const generateManhaj = createServerFn({ method: "POST" })
  .validator(
    (input: {
      sourceTitle: string;
      author: string;
      edition: string;
      sourceId: string;
      focus?: string;
      chunks: ChunkIn[];
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; report?: ManhajReport }> => {
    if (!readKey()) {
      return { ok: false, error: "خدمة الذكاء غير متاحة. استخدم التقرير الجاهز للمصادر المعتمدة أو راجع الأصل يدوياً." };
    }
    if (data.chunks.length === 0) {
      return { ok: false, error: "لا توجد نصوص كافية في هذا المصدر لاستخراج المنهج." };
    }
    const packed = data.chunks
      .map(
        (c) =>
          `[ص ${c.page}${c.volume ? ` ج${c.volume}` : ""} | ${c.kind}]\n${c.text}`,
      )
      .join("\n\n");
    try {
      const raw = await complete(
        [
          { role: "system", content: POLICY },
          {
            role: "user",
            content: `استخرج من المقاطع فقط تقرير منهج مفسر مناسب لتكليف جامعي في مناهج المفسرين.
المصدر: ${data.sourceTitle}
المؤلف: ${data.author}
الطبعة: ${data.edition}
${data.focus ? `تركيز الطالب: ${data.focus}` : ""}

المقاطع:
${packed}

أرجع JSON:
{
  scholarName, nasab, born, died, birthplace, residence, teachers, students, works,
  sections: [{ title, body, quotes: [{ excerpt, page, volume, kind }] }]
}
العناوين المطلوبة إن وُجدت مادتها: المنهج العام، العقيدة، الإسرائيليات، اللغة والقراءات، الأحكام. إن غاب الباب فصرّح أن المادة غير كافية في المقاطع. لا تخترع تاريخ وفاة أو مولداً إن لم يرد.`,
          },
        ],
        2200,
      );
      const json = parseJson(raw);
      const sections = Array.isArray(json.sections) ? json.sections : [];
      const report: ManhajReport = {
        sourceId: data.sourceId,
        scholarName: String(json.scholarName ?? data.author),
        nasab: String(json.nasab ?? data.author),
        born: String(json.born ?? "غير مصرَّح به في المقاطع"),
        died: String(json.died ?? "غير مصرَّح به في المقاطع"),
        birthplace: String(json.birthplace ?? "غير مصرَّح به في المقاطع"),
        residence: String(json.residence ?? "غير مصرَّح به في المقاطع"),
        teachers: String(json.teachers ?? "غير مصرَّح به في المقاطع"),
        students: String(json.students ?? "غير مصرَّح به في المقاطع"),
        works: String(json.works ?? data.sourceTitle),
        generatedBy: "model",
        disclaimer:
          "مستخرج من المصدر الذي اخترته عبر أداة ذكاء اصطناعي مقيَّدة بالمقاطع. راجع الأصل قبل التسليم.",
        sections: sections.map((s: Record<string, unknown>) => ({
          title: String(s.title ?? ""),
          body: String(s.body ?? ""),
          quotes: Array.isArray(s.quotes)
            ? (s.quotes as Record<string, unknown>[]).map((q) => ({
                sourceId: data.sourceId,
                title: data.sourceTitle,
                author: data.author,
                edition: data.edition,
                page: Number(q.page ?? 0) || 0,
                volume: q.volume ? Number(q.volume) : undefined,
                excerpt: String(q.excerpt ?? ""),
                kind: (q.kind as PassageKind) || "commentary",
              }))
            : [],
        })),
      };
      return { ok: true, report };
    } catch {
      return { ok: false, error: "تعذّر استخراج المنهج من المقاطع المرفقة." };
    }
  });

export const ocrImage = createServerFn({ method: "POST" })
  .validator((input: { imageDataUrl: string; mime: string }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; text?: string; error?: string }> => {
    if (!readKey()) {
      return { ok: false, error: "استخراج الصور يحتاج خدمة الذكاء، وهي غير متاحة الآن." };
    }
    try {
      const raw = await complete(
        [
          {
            role: "system",
            content:
              "استخرج النص العربي كما هو بالترتيب المنطقي (من اليمين لليسار). لا تترجم ولا تشرح. أرجع JSON { text } فقط.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "استخرج النص من هذه الصفحة.",
              },
              {
                type: "image_url",
                image_url: { url: data.imageDataUrl },
              },
            ],
          },
        ],
        1800,
      );
      const json = parseJson(raw);
      return { ok: true, text: String(json.text ?? "") };
    } catch {
      return { ok: false, error: "تعذّر قراءة الصورة. جرّب صورة أوضح أو ملف PDF نصّي." };
    }
  });
