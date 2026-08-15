/**
 * Lightweight bilingual (Armenian + English) date/time keyword parser for
 * the Quick Add bar. Deliberately not an NLP/AI parser — it recognizes a
 * handful of common phrases and always leaves the result editable before
 * saving, so a missed or wrong parse costs nothing.
 */
export interface QuickAddParseResult {
  title: string;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM (24h)
}

const WEEKDAYS_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAYS_HY = ["կիրակի", "երկուշաբթի", "երեքշաբթի", "չորեքշաբթի", "հինգշաբթի", "ուրբաթ", "շաբաթ"];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function stripMatch(text: string, match: RegExpMatchArray): string {
  const index = match.index ?? 0;
  return (text.slice(0, index) + text.slice(index + match[0].length)).replace(/\s{2,}/g, " ").trim();
}

function nextWeekday(from: Date, targetDow: number): Date {
  const d = new Date(from);
  const diff = (targetDow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function to24h(hourStr: string, minStr: string | undefined, ampm: string | undefined): string {
  let hour = parseInt(hourStr, 10);
  const minute = minStr ? parseInt(minStr, 10) : 0;
  if (ampm) {
    const isPm = ampm.toLowerCase() === "pm";
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
  }
  return `${pad(hour)}:${pad(minute)}`;
}

function extractDate(text: string, now: Date): { text: string; date: Date | null } {
  let m: RegExpMatchArray | null;

  if ((m = text.match(/\b(tomorrow|վաղը)\b/i))) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return { text: stripMatch(text, m), date: d };
  }
  if ((m = text.match(/\b(today|այսօր)\b/i))) {
    return { text: stripMatch(text, m), date: new Date(now) };
  }
  if ((m = text.match(/\bin\s+(\d+)\s+days?\b/i)) || (m = text.match(/(\d+)\s*օրից\b/i))) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(m[1], 10));
    return { text: stripMatch(text, m), date: d };
  }

  for (let i = 0; i < WEEKDAYS_EN.length; i++) {
    const re = new RegExp(`\\b(?:on\\s+)?${WEEKDAYS_EN[i]}\\b`, "i");
    if ((m = text.match(re))) {
      return { text: stripMatch(text, m), date: nextWeekday(now, i) };
    }
  }
  for (let i = 0; i < WEEKDAYS_HY.length; i++) {
    const re = new RegExp(`${WEEKDAYS_HY[i]}(?:ը)?`, "i");
    if ((m = text.match(re))) {
      return { text: stripMatch(text, m), date: nextWeekday(now, i) };
    }
  }

  return { text, date: null };
}

function extractTime(text: string): { text: string; time: string | null } {
  let m: RegExpMatchArray | null;

  if ((m = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i))) {
    return { text: stripMatch(text, m), time: to24h(m[1], m[2], m[3]) };
  }
  if ((m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i))) {
    return { text: stripMatch(text, m), time: to24h(m[1], m[2], m[3]) };
  }
  if ((m = text.match(/ժամը\s*(\d{1,2})(?::(\d{2}))?(?:-ին)?/i))) {
    return { text: stripMatch(text, m), time: to24h(m[1], m[2], undefined) };
  }

  return { text, time: null };
}

export function parseQuickAdd(input: string, now: Date = new Date()): QuickAddParseResult {
  const original = input.trim();
  const afterDate = extractDate(original, now);
  const afterTime = extractTime(afterDate.text);

  const title = afterTime.text.replace(/^[\s,-]+|[\s,-]+$/g, "") || original;

  return {
    title,
    date: afterDate.date ? toDateString(afterDate.date) : null,
    time: afterTime.time,
  };
}
