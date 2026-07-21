import { Link, useLocation, useParams } from "react-router-dom";

interface IntroState {
  name: string;
  introText: string;
}

export function IntroPage() {
  const { kind } = useParams<{ kind: string }>();
  const location = useLocation();
  const state = location.state as IntroState | null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/practice" className="text-sm text-primary hover:underline">
        ← Վերադառնալ ցանկին
      </Link>

      <h1 className="mt-2 mb-4 text-3xl font-semibold text-text">
        {state?.name ?? (kind === "domain" ? "Ոլորտ" : "Թեմա")}
      </h1>

      <p className="text-lg leading-relaxed text-text-muted whitespace-pre-line">
        {state?.introText || "Ներածական տեքստը կավելացվի ավելի ուշ։"}
      </p>
    </div>
  );
}
