import { useState } from "react";
import type { AcademicPower, Profile } from "../../api/profile";

export function ShareProfileCard({
  profile,
  academicPower,
  onClose,
}: {
  profile: Profile;
  academicPower: AcademicPower | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username;

  const lines = [
    fullName,
    profile.target_major ? `🎓 ${profile.target_major}` : null,
    profile.streak && profile.streak.current_streak > 0 ? `🔥 ${profile.streak.current_streak}-օրյա շարք` : null,
    `🏆 Մակարդակ ${profile.level}`,
    `📚 ${profile.stats?.questions_solved ?? 0} լուծված հարց`,
    profile.stats ? `🎯 ${profile.stats.accuracy_percentage}% ճշգրտություն` : null,
    academicPower?.available ? `⚡ ${academicPower.power}/1000 ակադեմիական հզորություն` : null,
    "Gitus",
  ].filter(Boolean) as string[];

  async function handleCopy() {
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Կիսվել պրոֆիլով</h2>
          <button type="button" onClick={onClose} aria-label="Փակել" className="text-lg text-text-muted hover:text-text">
            ✕
          </button>
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-bg p-5 text-center">
          <p className="text-lg font-bold text-text">{fullName}</p>
          <div className="mt-3 flex flex-col gap-1 text-sm text-text-muted">
            {lines.slice(1, -1).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold tracking-wide text-primary">GITUS</p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
        >
          {copied ? "Պատճենվեց ✓" : "Պատճենել որպես տեքստ"}
        </button>
      </div>
    </div>
  );
}
