import { useState } from "react";
import { Link } from "react-router-dom";
import * as profileApi from "../../api/profile";
import type { PrivacySettings } from "../../api/profile";
import { useToast } from "../../context/ToastContext";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { Card } from "../ui/Card";
import { ErrorState } from "../ui/ErrorState";
import { Skeleton } from "../ui/Skeleton";
import { Switch } from "../ui/Switch";

/*
  Nine toggles that used to live in a hand-rolled overlay opened from a menu
  on the profile page. Four things were wrong with that, and only one of them
  was visual:

  1. It was not a dialog. A `<div className="fixed inset-0">` with an onClick
     — no role, no focus trap, no Escape, no focus return. Keyboard users
     could tab straight through it into the page behind.
  2. A failed save was silent *and* the UI kept the optimistic value, so the
     switch said "hidden" while the server still said "visible". A privacy
     control that lies about its state is the worst kind to get wrong.
  3. One in-flight save disabled all nine, so flipping three settings in a row
     meant waiting between each.
  4. `fetchPrivacySettings().then(setSettings)` with no catch left a permanent
     "Բեռնվում է..." on any failure.

  As a settings section it needs no overlay at all, which removes (1) for
  free. The remaining three are fixed here: each row owns its own pending
  state, and a rejected save rolls its own switch back and says so.
*/

type Row = { key: keyof PrivacySettings; label: string; hint: string };

/** Grouped because the last item is not the same kind of thing as the other
 *  eight: those choose what a visitor sees on your profile, this one decides
 *  whether you appear in a public list at all. Under one flat heading it read
 *  as a ninth profile field. */
const PROFILE_ROWS: Row[] = [
  { key: "show_school", label: "Դպրոց", hint: "Ձեր դպրոցի անունը" },
  { key: "show_age", label: "Տարիք", hint: "Ձեր տարիքը" },
  { key: "show_university", label: "Ցանկալի բուհ", hint: "Բուհը, որին պատրաստվում եք" },
  { key: "show_stats", label: "Ուսումնական վիճակագրություն", hint: "Լուծված խնդիրներ, ճշգրտություն, ժամանակ" },
  { key: "show_ranking", label: "Դասակարգման մեդալներ", hint: "Ամսվա արդյունքներով ստացած մեդալները" },
  { key: "show_achievements", label: "Նվաճումներ", hint: "Ձեռք բերած կրծքանշանները" },
  { key: "show_friends", label: "Ընկերներ", hint: "Ձեր ընկերների ցանկը" },
  { key: "show_activity", label: "Ակտիվություն", hint: "Օրերի քարտեզը՝ երբ եք պարապել" },
];

const LEADERBOARD_ROW: Row = {
  key: "show_on_leaderboard",
  label: "Երևալ դասակարգման ցուցակում",
  hint: "Անջատելու դեպքում ձեր անունը չի հայտնվի ամսվա վարկանիշային աղյուսակներում։ XP-ն շարունակում է հաշվարկվել։",
};

function ToggleRow({
  row,
  checked,
  pending,
  onChange,
}: {
  row: Row;
  checked: boolean;
  pending: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <li className="flex items-start justify-between gap-[var(--space-4)] py-[var(--space-3)]">
      <div className="min-w-0">
        <p className="text-[length:var(--text-sm)] font-medium text-text">{row.label}</p>
        <p className="mt-0.5 max-w-[var(--measure-base)] text-[length:var(--text-xs)] leading-[var(--leading-body)] text-text-muted">
          {row.hint}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-[var(--space-2)]">
        {/* Text, not only the switch position: "visible / hidden" is the fact
            the student is checking, and it should not require reading a knob's
            location to know it. */}
        <span className="text-[length:var(--text-xs)] text-text-muted">{checked ? "Երևում է" : "Թաքցված է"}</span>
        <Switch checked={checked} onChange={onChange} disabled={pending} label={row.label} />
      </div>
    </li>
  );
}

export function PrivacySection() {
  const { showError } = useToast();
  const resource = useAsyncResource(() => profileApi.fetchPrivacySettings(), []);
  const [pendingKey, setPendingKey] = useState<keyof PrivacySettings | null>(null);

  const settings = resource.data;

  async function toggle(key: keyof PrivacySettings, next: boolean) {
    if (!settings) return;
    const optimistic = { ...settings, [key]: next };
    resource.setData(optimistic);
    setPendingKey(key);
    try {
      const saved = await profileApi.updatePrivacySettings({ [key]: next });
      resource.setData(saved);
    } catch {
      // Roll back to the value the server still holds, and say so — the
      // alternative is a switch that claims a privacy setting was applied
      // when it was not.
      resource.setData(settings);
      showError("Չհաջողվեց պահպանել կարգավորումը։ Փորձեք նորից։");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <Card>
      <h3 className="text-[length:var(--text-lg)] font-semibold leading-[var(--leading-heading)] text-text">
        Ձեր հանրային պրոֆիլը
      </h3>
      <p className="mt-[var(--space-1)] max-w-[var(--measure-base)] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
        Ընտրեք, թե ինչ են տեսնում այլ աշակերտները, երբ բացում են ձեր պրոֆիլը։ Ձեր ուսուցիչը և ծնողը միշտ տեսնում են
        ձեր առաջընթացը։
      </p>

      {resource.error !== null && !resource.isLoading ? (
        <ErrorState
          title="Չհաջողվեց բեռնել գաղտնիության կարգավորումները։"
          onRetry={resource.retry}
          className="mt-[var(--space-4)]"
        />
      ) : resource.isLoading || !settings ? (
        <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-4)]" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : (
        <>
          <ul className="mt-[var(--space-2)] divide-y divide-border">
            {PROFILE_ROWS.map((row) => (
              <ToggleRow
                key={row.key}
                row={row}
                checked={settings[row.key]}
                pending={pendingKey === row.key}
                onChange={(next) => toggle(row.key, next)}
              />
            ))}
          </ul>

          <div className="mt-[var(--space-5)] rounded-[var(--radius-md)] border border-border bg-bg p-[var(--space-4)]">
            <ul>
              <ToggleRow
                row={LEADERBOARD_ROW}
                checked={settings[LEADERBOARD_ROW.key]}
                pending={pendingKey === LEADERBOARD_ROW.key}
                onChange={(next) => toggle(LEADERBOARD_ROW.key, next)}
              />
            </ul>
          </div>

          <p className="mt-[var(--space-4)] text-[length:var(--text-sm)] text-text-muted">
            Տեսնել, թե ինչպես է երևում ձեր պրոֆիլը՝{" "}
            <Link to="/profile" className="font-medium text-primary underline underline-offset-2">
              պրոֆիլի էջում
            </Link>
            ։
          </p>
        </>
      )}
    </Card>
  );
}
