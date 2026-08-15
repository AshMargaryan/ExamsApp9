// Backend mock-exam titles follow "Միասնական քննություն — {Subject} (թեստ {N})".
// The product surface must never show the raw database title as the primary
// heading — parse it into a short "{Subject} · Թեստ {N}" + a secondary line.
export interface ParsedExamTitle {
  main: string;
  secondary: string;
}

export function extractExamNumber(title: string): number | null {
  const match = title.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function parseExamTitle(title: string, subjectLabel: string): ParsedExamTitle {
  const number = extractExamNumber(title);
  const [prefix] = title.split(/[—-]/, 1);
  const secondary = prefix.trim() || title;

  return {
    main: number ? `${subjectLabel} · Թեստ ${number}` : subjectLabel,
    secondary,
  };
}
