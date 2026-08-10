import { Link } from "react-router-dom";

const PRODUCT_LINKS = [
  { href: "#product", label: "Ապրանք" },
  { href: "#ai-tutor", label: "AI Tutor" },
  { href: "#tests", label: "Թեստեր" },
  { href: "#study-plan", label: "Ուսումնական պլան" },
  { href: "#rankings", label: "Դասակարգում" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <a href="#top" className="flex items-center gap-2">
              <img src="/favicon.svg" alt="" className="h-7 w-7" aria-hidden />
              <span className="text-lg font-bold tracking-tight text-text">Gitus</span>
            </a>
            <p className="mt-3 max-w-xs text-sm text-text-muted">
              AI ուսումնական հարթակ հայ դպրոցականների համար։
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-text">Ապրանք</p>
            <ul className="flex flex-col gap-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-text-muted transition-colors hover:text-text">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-text">Հաշիվ</p>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="/help" className="text-sm text-text-muted transition-colors hover:text-text">
                  Օգնության կենտրոն
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm text-text-muted transition-colors hover:text-text">
                  Մուտք
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm text-text-muted transition-colors hover:text-text">
                  Գրանցվել
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-text-muted">
          © {new Date().getFullYear()} Gitus
        </div>
      </div>
    </footer>
  );
}
