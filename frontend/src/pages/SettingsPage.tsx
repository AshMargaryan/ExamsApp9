import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { ColorMixPicker, type ColorMix } from "../components/ColorMixPicker";
import { clearGradient, getStoredGradient, saveGradient } from "../lib/buttonGradient";
import { clearBackground, getStoredBackground, saveBackground } from "../lib/backgroundGradient";

const BUTTON_DEFAULTS: ColorMix = { colors: ["#2563eb", "#1d4ed8"], angle: 90 };
const BACKGROUND_DEFAULTS: ColorMix = { colors: ["#2563EB", "#7F24B0", "#FF5C8D"], angle: 226 };

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
