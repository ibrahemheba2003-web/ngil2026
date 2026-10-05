import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  FileSearch,
  GraduationCap,
  Quote,
  ScrollText,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NaqlWordmark } from "@/components/logo";

export const Route = createFileRoute("/")({ component: Home });

const steps = [
  {
    n: "١",
    title: "المصدر الذي تثق به",
    body: "ارفع كتابك أو اختر مصدراً معتمداً من المكتبة: تفسير، حديث، مصحف، أصول.",
  },
  {
    n: "٢",
    title: "الصق الاقتباس أو السؤال",
    body: "تحقق من النقل، أو استخرج منهج المفسر، أو اسأل الكتاب كما تسأل دفترك.",
  },
  {
    n: "٣",
    title: "الصفحة والاختلاف والأصل",
    body: "يظهر النص الأصلي، رقم الصفحة، موضع الشاهد، والزيادة أو النقص أو التحريف.",
  },
];

const features = [
  {
    icon: Quote,
    title: "خدمة الاقتباسات",
    body: "للطالب وللدكتور المصحّح: مطابقة حرفية مع نسبة ودلالة الاختلاف.",
  },
  {
    icon: GraduationCap,
    title: "مناهج المفسرين",
    body: "مولده، عقيدته، الإسرائيليات، اللغة والأحكام — مع شواهد مرقّمة من الكتاب.",
  },
  {
    icon: FileSearch,
    title: "سؤال مقيَّد بالمصدر",
    body: "لا توليد من فراغ. الإجابة استرجاع من المقاطع ثم صياغة، مع الإسناد.",
  },
  {
    icon: ShieldCheck,
    title: "ضبط علمي",
    body: "مستويات أ–د، فصل القرآن والحديث عن الشرح، ورفض اختلاق الحديث والفتوى.",
  },
];

const sources = [
  "مجمع الملك فهد",
  "الدرر السنية",
  "المكتبة الشاملة",
  "تفسير الطبري",
  "تفسير ابن كثير",
  "الصحيحان",
];

function Home() {
  return (
    <div className="paper-field min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper-2/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <NaqlWordmark />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <a href="#how">كيف يعمل</a>
            </Button>
            <Button asChild>
              <Link to="/workspace">ادخل المنصة</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="hero-panel constellation text-paper-2">
          <div
            aria-hidden
            className="pointer-events-none absolute -start-16 top-10 size-64 rotate-12 rounded-lg bg-accent/15"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -end-10 -bottom-16 size-72 -rotate-6 rounded-xl bg-navy"
          />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="stagger-in space-y-6">
              <p className="text-sm text-paper-2/70">
                تحدي الذكاء الاصطناعي في خدمة المحتوى الإسلامي · مسار أدوات المعرفة
              </p>
              <h1 className="font-quote text-5xl leading-tight sm:text-6xl">نَقْل</h1>
              <p className="max-w-xl text-lg text-paper-2/85">
                محقق النقل العلمي. يعود الطالب لبحثه واثقاً، لا خائفاً من كلمة
                «خطأ». الأداة تحترم النص الشرعي، وتخدم الباحث، ولا تتجاوزه.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="inverse" size="lg" asChild>
                  <Link to="/workspace">ابدأ التحقق</Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-paper-2/25 bg-transparent text-paper-2 hover:bg-paper-2/10"
                  asChild
                >
                  <Link to="/workspace" search={{ tool: "manhaj" }}>
                    استخراج منهج الطبري
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-6 pt-2 text-sm text-paper-2/70">
                <span className="inline-flex items-center gap-2">
                  <Timer className="size-4" />
                  التحقق في أقل من دقيقة
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  مطابقة مقيَّدة بالمصدر لا بالتخمين
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-paper-2/10 bg-navy/60 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
              <p className="mb-3 text-xs text-paper-2/60">نموذج نتيجة التحقق</p>
              <p className="font-quote text-xl leading-loose">
                «ولد بآمل طبرستان سنة أربع وعشرين ومائتين»
              </p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm">تفسير الطبري · ج1 ص 1 · سطر 2</p>
                  <p className="text-xs text-paper-2/60">
                    محمد بن جرير الطبري · شاكر · مطابق للأصل
                  </p>
                </div>
                <span className="text-3xl font-medium tabular-nums text-accent-2">
                  100٪
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16" id="how">
        <h2 className="mb-8 text-2xl font-medium text-navy">كيف يعمل</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.n}
              className="rounded-xl bg-paper-2 p-5 shadow-[0_0_0_1px_rgba(11,31,51,0.06)]"
            >
              <span className="font-quote text-3xl text-accent">{step.n}</span>
              <h3 className="mt-3 text-lg font-medium text-navy">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-mist">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-paper-2/70">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:grid-cols-2">
          {features.map((f) => (
            <article key={f.title} className="flex gap-4 rounded-lg p-2">
              <span className="grid size-11 shrink-0 place-items-center rounded-md bg-navy text-paper-2">
                <f.icon className="size-5" />
              </span>
              <div>
                <h3 className="font-medium text-navy">{f.title}</h3>
                <p className="mt-1 text-sm leading-7 text-mist">{f.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-medium text-navy">لمن صُممت المنصة</h2>
            <p className="mt-3 leading-8 text-mist">
              طلاب العلم في مناهج التفسير، والباحثون، والكتّاب، والدكاترة
              المصحّحون. التكليف الذي كان يأخذ ساعات في قراءة ألفي صفحة من
              الطبري — المولد، والعقيدة، والإسرائيليات، والشواهد — يُختصر إلى
              تقرير موثّق يمكن الرجوع منه إلى الصفحة.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink">
              <li className="flex gap-2">
                <BookOpen className="mt-0.5 size-4 text-accent" />
                رفع PDF نصّي أو صورة صفحة، مع إصلاح اتجاه العربية.
              </li>
              <li className="flex gap-2">
                <ScrollText className="mt-0.5 size-4 text-accent" />
                المصدر الذي ترفعه هو الذي يظهر في قائمة الاقتباس.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-4 text-accent" />
                المرجع يُحفظ: الكتاب، الطبعة، الموقع، ورقم الصفحة.
              </li>
            </ul>
          </div>
          <div className="rounded-xl bg-navy p-6 text-paper-2">
            <h3 className="text-lg font-medium">مستويات المحتوى</h3>
            <dl className="mt-4 space-y-3 text-sm leading-7">
              <div>
                <dt className="text-accent-2">أ — معلومات أصلية مستقرة</dt>
                <dd className="text-paper-2/75">قرآن، أحاديث الصحيحين، أركان، سيرة أساسية.</dd>
              </div>
              <div>
                <dt className="text-accent-2">ب — شرح واستدلال</dt>
                <dd className="text-paper-2/75">منهج، مقارنة، شبهة عامة — مع المرجع ودون قطع.</dd>
              </div>
              <div>
                <dt className="text-accent-2">ج — خلاف أو حساسية</dt>
                <dd className="text-paper-2/75">بيان الخلاف أو الإحالة، لا ترجيح آلي مستقل.</dd>
              </div>
              <div>
                <dt className="text-accent-2">د — فتوى شخصية</dt>
                <dd className="text-paper-2/75">لا حكم مستقل. معلومة عامة وإحالة إلى مؤهَّل.</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper-2">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-xs text-mist">مراجع معتمدة يُحال إليها</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sources.map((s) => (
              <span
                key={s}
                className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-navy"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-xs leading-6 text-mist">
            «نقل» أداة مدعومة بالذكاء الاصطناعي لمساعدة الباحث، وليست مفتياً ولا
            بديلاً عن المختص. لا تُجمع بيانات شخصية إلا بقدر التشغيل المحلي
            في جهازك. مؤسسة باذل الأهلية · مسار تمكين المعرّفين بالإسلام.
          </p>
          <Button asChild>
            <Link to="/workspace">جرّب المنصة الآن</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
