const TASHKEEL =
  /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

export function stripTashkeel(input: string): string {
  return input.replace(TASHKEEL, "");
}

export function normalizeArabic(input: string): string {
  return stripTashkeel(input)
    .replace(/\u0623|\u0625|\u0622|\u0671/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064A")
    .replace(/[^\u0621-\u064Aa-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeRaw(input: string): string[] {
  return input
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

export function looksLikeHadith(text: string): boolean {
  const n = normalizeArabic(text);
  return (
    n.includes("قال رسول") ||
    n.includes("قال النبي") ||
    n.includes("صلى الله عليه") ||
    n.includes("عليه السلام") ||
    n.startsWith("عن ") ||
    n.includes("في الصحيح") ||
    n.includes("رواه ")
  );
}

export function looksLikePersonalFatwa(text: string): boolean {
  const n = normalizeArabic(text);
  const cues = [
    "يجوز لي",
    "هل يجوز لي",
    "فتوي",
    "انا في دوله",
    "زوجتي",
    "زوجي",
    "طلاقي",
    "عقد نكاحي",
    "في بلدي",
    "حالتي",
    "انا حامل",
    "راتبي",
  ];
  return cues.some((c) => n.includes(c));
}

const PARTICLES = new Set([
  "في",
  "من",
  "على",
  "الي",
  "ان",
  "لا",
  "ما",
  "هذا",
  "هذه",
  "التي",
  "الذي",
  "كان",
  "قال",
  "قد",
  "ثم",
  "عن",
  "او",
  "بل",
  "هو",
  "هي",
  "لم",
  "لن",
  "كل",
  "بعض",
]);

export function arabicFluencyScore(text: string): number {
  const words = normalizeArabic(text).split(" ").filter(Boolean);
  if (words.length === 0) return 0;
  return words.filter((w) => PARTICLES.has(w)).length;
}

export function repairRtlLine(line: string): string {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 3) return line;
  const reversedWords = words.slice().reverse().join(" ");
  const reversedChars = [...line].reverse().join("");
  const original = arabicFluencyScore(line);
  const byWord = arabicFluencyScore(reversedWords);
  const byChar = arabicFluencyScore(reversedChars);
  if (byWord > original && byWord >= byChar) return reversedWords;
  if (byChar > original && byChar > byWord) return reversedChars;
  return line;
}

export function repairExtractedText(text: string): string {
  return text
    .split("\n")
    .map((line) => repairRtlLine(line))
    .join("\n");
}
