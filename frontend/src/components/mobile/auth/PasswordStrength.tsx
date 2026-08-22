import { Check, X } from "lucide-react";

/*
  The backend rejects passwords under 8 characters or missing a letter or a
  digit. The web form states those rules in grey text and only enforces them on
  submit; here each rule ticks green as it's met, so nobody types a password
  twice and then gets told it was never going to be accepted.
*/

export interface PasswordRule {
  label: string;
  met: boolean;
}

export function passwordRules(password: string): PasswordRule[] {
  return [
    { label: "Առնվազն 8 նիշ", met: password.length >= 8 },
    { label: "Պարունակում է տառ", met: /[a-zA-Z]/.test(password) },
    { label: "Պարունակում է թիվ", met: /[0-9]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return passwordRules(password).every((rule) => rule.met);
}

const BAR_COLORS = ["bg-incorrect", "bg-incorrect", "bg-medium", "bg-correct"];

export function PasswordStrength({ password }: { password: string }) {
  const rules = passwordRules(password);
  const met = rules.filter((r) => r.met).length;
  // A fourth notch for length beyond the minimum, so a password that merely
  // clears the rules doesn't read as "as strong as it gets".
  const score = met === rules.length && password.length >= 12 ? 4 : met;

  return (
    <div className="mb-5 -mt-1">
      <div className="mb-3 flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              password.length > 0 && i < score ? BAR_COLORS[score - 1] : "bg-border"
            }`}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={`flex items-center gap-2 text-[13px] transition-colors ${
              rule.met ? "text-correct" : "text-text-muted"
            }`}
          >
            {rule.met ? (
              <Check size={14} strokeWidth={2.5} className="flex-none" />
            ) : (
              <X size={14} strokeWidth={2} className="flex-none opacity-50" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
