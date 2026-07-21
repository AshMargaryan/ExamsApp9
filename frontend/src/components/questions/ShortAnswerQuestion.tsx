import { MathText } from "../MathText";

interface Props {
  value: string;
  onChange: (value: string) => void;
  revealed: boolean;
  correctAnswerText?: string;
}

export function ShortAnswerQuestion({ value, onChange, revealed, correctAnswerText }: Props) {
  const isCorrect =
    revealed && value.trim().toLowerCase() === (correctAnswerText ?? "").trim().toLowerCase();

  let borderClass = "border-border focus:border-primary";
  if (revealed) {
    borderClass = isCorrect ? "border-correct" : "border-incorrect";
  }

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={revealed}
        placeholder="Ձեր պատասխանը..."
        className={`w-full rounded-md border bg-surface px-4 py-2 text-lg text-text outline-none ${borderClass}`}
      />
      {revealed && (
        <p className={`mt-1 text-base ${isCorrect ? "text-correct" : "text-incorrect"}`}>
          Ճիշտ պատասխան՝ <MathText text={correctAnswerText ?? ""} />
        </p>
      )}
    </div>
  );
}