import { createServerFn } from "@tanstack/react-start";
import { APPROVED_DOMAINS, isApprovedHost } from "./approved-sources";
import type { AskResult, Citation, ContentLevel, ManhajReport, PassageKind } from "./types";

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
1) أجب فقط من المصادر المعتمدة المرفقة أو المسموح بالبحث فيها. إن لم تكفِ فصرّح بعدم كفاية المعلومات ولا تُكمل من حفظك.
2) لا تختلق حديثاً ولا آية ولا عزواً. لا تنسب قولاً إلى كتاب أو موقع إن لم يرد فيه.
3) فرّق بين النص القرآني والحديث وبين كلام المفسر/الشرح.
4) المسائل الخلافية لا تُعرض بصيغة القطع.
5) لا تُفتِ في واقعة شخصية. إن كان السؤال فتوى شخصية: معلومات عامة فقط مع إحالة إلى جهة مؤهلة.
6) مستويات المحتوى: A معلومات أصلية مستقرة، B شرح واستدلال، C خلاف/حساسية، D فتوى شخصية.
7) أظهر المصدر والطبعة ورقم الصفحة في الاستشهاد إن وُجدت.
8) افهم السؤال مهما كانت صيغته (عامية أو فصحى أو مختصرة) واستخرج مقصوده الحقيقي قبل الإجابة.
9) العربية الفصيحة الواضحة، الأصل قبل الفرع.
10) أنت أداة مدعومة بالذكاء الاصطناعي.`;

// ---------- Gemini ----------

function readKey(): string | null {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
}

const MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
].filter((m): m is string => Boolean(m));

type Msg = { role: "system" | "user"; content: string | unknown[] };
type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
type WebSource = { uri: string; title: string };

function toParts(content: string | unknown[]): Part[] {
  if (typeof content === "string") return [{ text: content }];
  const parts: Part[] = [];
  for (const item of content as Record<string, unknown>[]) {
    if (item.type === "text") parts.push({ text: String(item.text ?? "") });
    if (item.type === "image_url") {
      const url = String((item.image_url as { url: string }).url ?? "");
      const m = /^data:([^;]+);base64,(.+)$/.exec(url);
      if (m) parts.push({ inline_data: { mime_type: m[1]!, data: m[2]! } });
    }
  }
  return parts;
}

async function complete(
  messages: Msg[],
  _maxTokens: number,
  opts: { search?: boolean } = {},
): Promise<{ text: string; sources: WebSource[] }> {
  const apiKey = readKey();
  if (!apiKey) throw new Error("unavailable");

  const system = messages.find((m) => m.role === "system");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: "user", parts: toParts(m.content) }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      ...(opts.search ? {} : { responseMimeType: "application/json" }),
    },
  };
  if (system) body.system_instruction = { parts: toParts(system.content) };
  if (opts.search) body.tools = [{ google_search: {} }];

  let lastError = "no model";
  for (const model of MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      lastError = `Gemini ${model} ${res.status}`;
      continue; // جرّب النموذج التالي
    }
    const json = (await res.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
        groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
      }[];
    };
    const cand = json.candidates?.[0];
    const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    const sources: WebSource[] = (cand?.groundingMetadata?.groundingChunks ?? [])
      .map((c) => ({ uri: c.web?.uri ?? "", title: c.web?.title ?? "" }))
      .filter((s) => s.uri);
    if (text.trim()) return { text, sources };
    lastError = `Gemini ${model} empty`;
  }
  throw new Error(lastError);
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const a = cleaned.indexOf("{");
    const b = cleaned.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(cleaned.slice(a, b + 1)) as Record<string, unknown>;
    throw new Error("bad json");
  }
}

function webCitations(sources: WebSource[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const s of sources) {
    if (!isApprovedHost(`${s.title} ${s.uri}`)) continue; // فقط المواقع المعتمدة
    if (seen.has(s.uri)) continue;
    seen.add(s.uri);
    out.push({
      sourceId: `web:${s.title}`,
      title: s.title || "موقع معتمد",
      author: "موقع معتمد من الحزمة العلمية",
      edition: "",
      page: 0,
      excerpt: "",
      kind: "other",
      url: s.uri,
    });
  }
  return out;
}

const DOMAIN_LIST = APPROVED_DOMAINS.join("، ");

// ---------- اسأل المصدر ----------

async function askFromApprovedWeb(question: string): Promise<AskResult> {
  const siteHint = APPROVED_DOMAINS.map((d) => `site:${d}`).join(" OR ");
  const { text, sources } = await complete(
    [
      { role: "system", content: POLICY },
      {
        role: "user",
        content: `السؤال: ${question}

ابحث على الويب في المواقع المعتمدة فقط، واستعمل في البحث هذه الصيغة: ${siteHint}
المواقع المعتمدة: ${DOMAIN_LIST}
تجاهل أي موقع خارج هذه القائمة تماماً. إن لم تجد جواباً صريحاً في المواقع المعتمدة فاجعل insufficient=true ولا تُجب من حفظك.
اكتب الجواب مختصراً وواضحاً، وفرّق بين النص (آية/حديث) وبين كلام العلماء، واذكر اسم الموقع الذي أخذت منه.
أرجع JSON فقط، بلا أي نص خارجه، بالمفاتيح:
{"answer": string, "level": "A"|"B"|"C"|"D", "insufficient": boolean, "fatwaReferral": boolean, "notes": string[]}`,
      },
    ],
    1600,
    { search: true },
  );
  const json = parseJson(text);
  const citations = webCitations(sources);
  const insufficient = Boolean(json.insufficient) || citations.length === 0;
  if (insufficient) {
    return {
      ok: true,
      level: ((json.level as ContentLevel) || "B") as ContentLevel,
      insufficient: true,
      answer:
        "لم أجد جواباً كافياً في المصادر المعتمدة لهذا السؤال، ولن أُكمل من خارجها. جرّب إعادة صياغة السؤال، أو ارفع الكتاب المعتمد، أو راجع مختصاً.",
      citations: [],
      notes: ["الامتناع عند غياب المرجع"],
    };
  }
  return {
    ok: true,
    answer: String(json.answer ?? ""),
    level: ((json.level as ContentLevel) || "B") as ContentLevel,
    insufficient: false,
    fatwaReferral: Boolean(json.fatwaReferral),
    notes: [
      ...(Array.isArray(json.notes) ? (json.notes as string[]) : []),
      "الإجابة من مواقع المرجعية العلمية المعتمدة",
    ],
    citations,
  };
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

    // 1) الأولوية للمصادر المرفوعة/المختارة داخل المنصة
    if (data.chunks.length > 0) {
      const packed = data.chunks
        .map(
          (c, i) =>
            `[#${i + 1} | ${c.title} | ${c.author} | ${c.edition} | ص ${c.page}${c.volume ? ` ج${c.volume}` : ""} | نوع:${c.kind}]\n${c.text}`,
        )
        .join("\n\n");
      try {
        const { text } = await complete(
          [
            { role: "system", content: POLICY },
            {
              role: "user",
              content: `السؤال:\n${data.question}\n\nالمقاطع المعتمدة فقط:\n${packed}\n\nأجب من المقاطع فقط. إن لم تكفِ لجواب السؤال فعلاً فاجعل insufficient=true.\nأرجع JSON بالمفاتيح: answer, level (A|B|C|D), insufficient (boolean), fatwaReferral (boolean), notes (string[]), citations: [{sourceId,title,author,edition,page,volume,excerpt,kind,url}]`,
            },
          ],
          1400,
        );
        const json = parseJson(text);
        const insufficient = Boolean(json.insufficient);
        if (!insufficient && String(json.answer ?? "").trim()) {
          return {
            ok: true,
            answer: String(json.answer),
            level: (json.level as ContentLevel) || "B",
            insufficient: false,
            fatwaReferral: Boolean(json.fatwaReferral),
            notes: Array.isArray(json.notes) ? (json.notes as string[]) : [],
            citations: Array.isArray(json.citations) ? (json.citations as AskResult["citations"]) : [],
          };
        }
      } catch {
        // ننتقل للبحث في المواقع المعتمدة
      }
    }

    // 2) المقاطع لا تكفي: نبحث في مواقع المرجعية المعتمدة فقط
    try {
      return await askFromApprovedWeb(data.question);
    } catch {
      return {
        ok: false,
        error: "تعذّر توليد الإجابة الآن. يمكنك الاعتماد على نتائج المطابقة النصية.",
      };
    }
  });

// ---------- منهج المفسر ----------

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
    const packed = data.chunks
      .map((c) => `[ص ${c.page}${c.volume ? ` ج${c.volume}` : ""} | ${c.kind}]\n${c.text}`)
      .join("\n\n");
    try {
      const { text, sources } = await complete(
        [
          { role: "system", content: POLICY },
          {
            role: "user",
            content: `أعدّ تقرير منهج مفسر مناسباً لتكليف جامعي في مناهج المفسرين.
الكتاب: ${data.sourceTitle}
المؤلف: ${data.author}
الطبعة: ${data.edition}
${data.focus ? `تركيز الطالب: ${data.focus}` : ""}

المقاطع المرفقة من الكتاب (إن وُجدت، وهي المصدر الأول):
${packed || "لا توجد مقاطع."}

للمعلومات التي لا تكفي فيها المقاطع (الاسم والنسب والمولد والوفاة والشيوخ والتلاميذ والمؤلفات والمنهج)، ابحث في المواقع المعتمدة فقط: ${DOMAIN_LIST}
لا تخترع تاريخاً ولا اسماً. ما لم تجده في المقاطع ولا في المواقع المعتمدة اكتب فيه "غير مصرَّح به في المصادر المعتمدة".
الاقتباسات (quotes) لا تُكتب إلا من المقاطع المرفقة وبأرقام صفحاتها.

أرجع JSON فقط، بلا أي نص خارجه:
{
  "scholarName": string, "nasab": string, "born": string, "died": string, "birthplace": string,
  "residence": string, "teachers": string, "students": string, "works": string,
  "sections": [{ "title": string, "body": string, "quotes": [{ "excerpt": string, "page": number, "volume": number, "kind": string }] }]
}
العناوين المطلوبة إن وُجدت مادتها: المنهج العام، العقيدة، الإسرائيليات، اللغة والقراءات، الأحكام. إن غاب الباب فصرّح بذلك داخل body.`,
          },
        ],
        3000,
        { search: true },
      );
      const json = parseJson(text);
      const used = webCitations(sources);
      const sections = Array.isArray(json.sections) ? json.sections : [];
      const NA = "غير مصرَّح به في المصادر المعتمدة";
      const report: ManhajReport = {
        sourceId: data.sourceId,
        scholarName: String(json.scholarName ?? data.author),
        nasab: String(json.nasab ?? data.author),
        born: String(json.born ?? NA),
        died: String(json.died ?? NA),
        birthplace: String(json.birthplace ?? NA),
        residence: String(json.residence ?? NA),
        teachers: String(json.teachers ?? NA),
        students: String(json.students ?? NA),
        works: String(json.works ?? data.sourceTitle),
        generatedBy: "model",
        disclaimer:
          "أُعدّ هذا التقرير بأداة ذكاء اصطناعي مقيَّدة بالمقاطع المرفقة ومواقع المرجعية العلمية المعتمدة." +
          (used.length ? ` المواقع المستخدمة: ${used.map((u) => u.title).join("، ")}.` : "") +
          " راجع الأصل قبل التسليم.",
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
      return { ok: false, error: "تعذّر استخراج المنهج الآن. أعد المحاولة بعد لحظات." };
    }
  });

// ---------- قراءة صورة (OCR) ----------

export const ocrImage = createServerFn({ method: "POST" })
  .validator((input: { imageDataUrl: string; mime: string }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; text?: string; error?: string }> => {
    if (!readKey()) {
      return { ok: false, error: "استخراج الصور يحتاج خدمة الذكاء، وهي غير متاحة الآن." };
    }
    try {
      const { text } = await complete(
        [
          {
            role: "system",
            content:
              'استخرج النص العربي كما هو بالترتيب المنطقي (من اليمين لليسار). لا تترجم ولا تشرح. أرجع JSON { "text": string } فقط.',
          },
          {
            role: "user",
            content: [
              { type: "text", text: "استخرج النص من هذه الصفحة." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        1800,
      );
      const json = parseJson(text);
      return { ok: true, text: String(json.text ?? "") };
    } catch {
      return { ok: false, error: "تعذّر قراءة الصورة. جرّب صورة أوضح أو ملف PDF نصّي." };
    }
  });
