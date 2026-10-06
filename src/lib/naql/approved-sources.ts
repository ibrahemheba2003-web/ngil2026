// المصادر المعتمدة من «المرجعية والحزمة العلمية والبيانات» (تحدي باذل 2026)
// تُستخدم في: 1) تقييد البحث الموسّع بهذه المواقع فقط 2) عرضها في الواجهة

export type ApprovedSource = {
  name: string;
  domain: string;
  scope: string;
};

export const APPROVED_SOURCES: ApprovedSource[] = [
  { name: "المستودع الدعوي الرقمي", domain: "dawa.center", scope: "دعوة، شبهات، أسئلة وأجوبة عن الإسلام" },
  { name: "الجمهرة — مفردات المحتوى الإسلامي", domain: "islamic-content.com", scope: "مصطلحات وموضوعات دعوية" },
  { name: "موسوعة القرآن الكريم", domain: "quranenc.com", scope: "القرآن وترجمات معانيه" },
  { name: "موسوعة الأحاديث النبوية", domain: "hadeethenc.com", scope: "أحاديث صحيحة بشروحها" },
  { name: "موقع بيان الإسلام", domain: "byenah.com", scope: "التعريف بالإسلام" },
  { name: "موقع دار الإسلام", domain: "islamhouse.com", scope: "كتب ومقالات وفتاوى" },
  { name: "موسوعة المحتوى الإسلامي باللغات", domain: "islamenc.com", scope: "بطاقات ومصطلحات متعددة اللغات" },
  { name: "موسوعة المصطلحات الإسلامية", domain: "terminologyenc.com", scope: "المصطلحات الشرعية" },
  { name: "رسالة الحرمين", domain: "risala.prh.gov.sa", scope: "إرشاد شرعي من الرئاسة الدينية للحرمين" },
  { name: "الدرر السنية", domain: "dorar.net", scope: "الحديث والتفسير والعقيدة والفقه والسيرة" },
  { name: "المكتبة الشاملة", domain: "shamela.ws", scope: "كتب التراث" },
  { name: "موسوعة القرآن (قرآن بيديا)", domain: "quranpedia.net", scope: "نص القرآن وتفاسيره" },
  { name: "مركز تفسير", domain: "tafsir.net", scope: "دراسات التفسير وعلوم القرآن" },
  { name: "التفسير الموضوعي", domain: "modoee.com", scope: "التفسير الموضوعي لسور القرآن" },
  { name: "وحي", domain: "wahy.net", scope: "تفسير ودراسات قرآنية" },
  { name: "المكتبة الصوتية للقرآن", domain: "mp3quran.net", scope: "تلاوات قرآنية" },
  { name: "الموسوعة الفقهية الكويتية", domain: "bohoth.awqaf.gov.kw", scope: "الفقه على المذاهب الأربعة" },
  { name: "الإسلام سؤال وجواب", domain: "islamqa.info", scope: "فتاوى مؤصلة بأدلتها" },
  { name: "موقع الشيخ ابن باز", domain: "binbaz.org.sa", scope: "فتاوى ومؤلفات" },
  { name: "موقع الشيخ ابن عثيمين", domain: "binothaimeen.net", scope: "فتاوى وشروح" },
  { name: "مجمع الملك سلمان للغة العربية", domain: "ksaa.gov.sa", scope: "معاجم ومصطلحات عربية" },
  { name: "مجمع الملك فهد لطباعة المصحف", domain: "qurancomplex.gov.sa", scope: "المصحف والترجمات والتفاسير" },
];

export const APPROVED_DOMAINS: string[] = APPROVED_SOURCES.map((s) => s.domain);

export function isApprovedHost(value: string): boolean {
  const v = value.toLowerCase();
  return APPROVED_DOMAINS.some((d) => v.includes(d));
}
