import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";

const GRADIENT = "var(--gradient-primary, linear-gradient(to right, #1d4ed8, #2563eb))";

const FREE_FEATURES = ["Սահմանափակ քանակի վարժություններ", "Հիմնական առաջընթացի հետևում", "Մեկ առարկա միաժամանակ"];

const PREMIUM_FEATURES = [
  "Անսահմանափակ պրակտիկա բոլոր առարկաներից",
  "Ամբողջական փորձնական քննություններ",
  "AI օգնական մանրամասն բացատրություններով",
  "Բառաքարտեր և ամբողջական վերլուծություն",
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-5 w-5 shrink-0 text-primary">
      <path
        d="M4 10.5l3.5 3.5L16 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SubscriptionPage() {
  const { showSuccess } = useToast();

  return (
    <div className="min-h-screen bg-bg px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold text-text">Ընտրեք ձեր պլանը</h1>
        <p className="mt-3 text-lg text-text-muted">Սկսեք անվճար, հետո՝ ամբողջական հասանելիություն։</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Free plan */}
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-8">
          <h2 className="text-xl font-semibold text-text">Անվճար</h2>
          <p className="mt-4 flex items-baseline gap-1.5">
            <span className="text-4xl font-bold text-text">0 ֏</span>
            <span className="text-text-muted">/ամիս</span>
          </p>

          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-text">
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Link
            to="/"
            className="mt-8 rounded-xl px-5 py-3 text-center font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundImage: GRADIENT }}
          >
            Սկսել անվճար
          </Link>
        </div>

        {/* Premium plan */}
        <div className="relative flex flex-col rounded-2xl border border-border bg-surface p-8">
          <span
            className="absolute -top-3 right-6 rounded-full px-4 py-1 text-sm font-medium italic text-white"
            style={{ backgroundImage: GRADIENT }}
          >
            Ակցիա
          </span>

          <h2 className="text-xl font-semibold text-text">Պրեմիում</h2>
          <p className="mt-4 flex flex-wrap items-baseline gap-1.5">
            <span className="text-4xl font-bold text-text">3,900 ֏</span>
            <span className="text-text-muted">/ամիս</span>
            <span className="text-lg text-incorrect line-through">8,900 ֏</span>
          </p>
          <p className="mt-2 text-sm text-text-muted">
            Անկախ գրանցման ամսաթվից՝ լինի դա սեպտեմբերի 12-ը, թե նոյեմբերի 29-ը, գինը կազմում է 3,900 ֏/ամիս
            մինչև դեկտեմբերի 1-ը։ Դեկտեմբերի 1-ից գինը դառնում է 8,900 ֏/ամիս։
          </p>

          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-text">
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => showSuccess("Պրեմիում բաժանորդագրությունը շուտով հասանելի կլինի։")}
            className="mt-8 rounded-xl px-5 py-3 text-center font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundImage: GRADIENT }}
          >
            Ընտրել Պրեմիում
          </button>
        </div>
      </div>
    </div>
  );
}
