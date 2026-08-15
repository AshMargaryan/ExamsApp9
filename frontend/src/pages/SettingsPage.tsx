import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { useAuth } from "../auth/AuthContext";
import { changePassword } from "../api/auth";
import { ColorMixPicker, type ColorMix } from "../components/ColorMixPicker";
import { clearGradient, getStoredGradient, saveGradient } from "../lib/buttonGradient";
import { clearBackground, getStoredBackground, saveBackground } from "../lib/backgroundGradient";

const BUTTON_DEFAULTS: ColorMix = { colors: ["#2563eb", "#1d4ed8"], angle: 90 };
const BACKGROUND_DEFAULTS: ColorMix = { colors: ["#2563EB", "#7F24B0", "#FF5C8D"], angle: 226 };

function ChangePasswordCard() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const hasPassword = user?.has_usable_password ?? true;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showError("Նոր գաղտնաբառը պետք է լինի առնվազն 8 նիշ և պարունակի տառեր ու թվեր։");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showError("Գաղտնաբառերը չեն համընկնում։");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword, confirmNewPassword);
      showSuccess(hasPassword ? "Գաղտնաբառը հաջողությամբ փոփոխվեց։" : "Գաղտնաբառը սահմանվեց։");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      showError(extractErrorMessage(err, "Չհաջողվեց փոխել գաղտնաբառը։"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
      <h2 className="font-medium text-text">{hasPassword ? "Փոխել գաղտնաբառը" : "Սահմանել գաղտնաբառ"}</h2>
      <p className="mt-1 text-sm text-text-muted">
        {hasPassword
          ? "Մուտքագրեք ձեր ընթացիկ գաղտնաբառը և նոր գաղտնաբառը։"
          : "Ձեր հաշիվը մուտք է գործել Google/Apple-ով և դեռ գաղտնաբառ չունի։ Սահմանեք մեկը՝ նաև գաղտնաբառով մուտք գործելու համար։"}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3">
        {hasPassword && (
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Ընթացիկ գաղտնաբառ"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        )}
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Նոր գաղտնաբառ"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          placeholder="Կրկնել նոր գաղտնաբառը"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {submitting ? "Ուղարկվում է…" : hasPassword ? "Փոխել գաղտնաբառը" : "Սահմանել գաղտնաբառ"}
        </button>
      </form>
    </section>
  );
}

export function SettingsPage() {
  const { showSuccess } = useToast();

  const buttonInitial = getStoredGradient() ?? BUTTON_DEFAULTS;
  const backgroundInitial = getStoredBackground() ?? BACKGROUND_DEFAULTS;

  return (
    <div className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold text-text">Կարգավորումներ</h1>
        <p className="mt-2 text-sm text-text-muted">
          Հաշվի մյուս կարգավորումները հասանելի են ձեր{" "}
          <Link to="/profile" className="text-primary hover:underline">
            պրոֆիլի էջում
          </Link>
          ։
        </p>

        <ChangePasswordCard />

        <ColorMixPicker
          title="Կոճակների գույնը"
          description="Ընտրեք 1, 2 կամ 3 գույն (եթե նախընտրում եք մեկ միատեսակ գույն, ընտրեք 1) և միախառնման աստիճանը՝ կայքի բոլոր կոճակների տեսքը փոխելու համար։"
          initial={buttonInitial}
          defaults={BUTTON_DEFAULTS}
          previewLabel="Օրինակ կոճակ"
          onApply={(mix) => {
            saveGradient(mix);
            showSuccess("Կոճակների գույնը թարմացվեց։");
          }}
          onReset={() => {
            clearGradient();
            showSuccess("Կոճակների գույնը վերականգնվեց կանխադրվածին։");
          }}
        />

        <ColorMixPicker
          title="Ֆոնի գույնը"
          description="Ընտրեք 1, 2 կամ 3 գույն և միախառնման աստիճանը՝ էջի ֆոնի տեսքը փոխելու համար։ Կանխադրված ֆոնը մուգ մոխրագույն է։"
          initial={backgroundInitial}
          defaults={BACKGROUND_DEFAULTS}
          previewLabel="Էջի ֆոն"
          previewClassName="flex h-24 items-center justify-center rounded-[var(--radius)] border border-border font-medium text-white"
          onApply={(mix) => {
            saveBackground(mix);
            showSuccess("Ֆոնի գույնը թարմացվեց։");
          }}
          onReset={() => {
            clearBackground();
            showSuccess("Ֆոնի գույնը վերականգնվեց կանխադրվածին։");
          }}
        />
      </div>
    </div>
  );
}
