import { Link } from "react-router-dom";
import { Logo } from "../Logo";

/* The footer carries one more than the nav: the knowledge map is worth
   linking but is not somewhere a first-time reader arrives looking for. */
const PRODUCT_LINKS = [
  { href: "#subjects", label: "Առարկաներ" },
  { href: "#mistakes", label: "Սխալների վերլուծություն" },
  { href: "#study-plan", label: "Ուսումնական պլան" },
  { href: "#progress", label: "Գիտելիքի քարտեզ" },
  { href: "#ai-tutor", label: "AI Tutor" },
  { href: "#faq", label: "Հարցեր" },
];

/*
  A footer link is 19px of text. On a phone that is well under the 44px this
  product holds itself to, and `.tap-target` is the wrong tool here: these
  rows sit 8px apart, so a 44px pseudo-target would overlap its neighbours and
  a tap near the boundary would open the wrong page — worse than a small
  target, not better.

  So the row itself grows, and only where the input is a thumb. From `sm` up
  the footer is a three-column desktop layout driven by a pointer, and 44px
  rows there just read as loose.
*/
const FOOTER_LINK =
  "inline-flex min-h-11 items-center text-sm text-text-muted transition-colors hover:text-text sm:min-h-0";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-surface-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <a href="#top" className="flex items-center gap-2">
              <Logo className="h-7 w-7 text-text" />
              <span className="text-lg font-bold tracking-tight text-text">Gitus</span>
            </a>
            <p className="mt-3 max-w-xs text-sm text-text-muted">
              AI ուսումնական հարթակ հայ դպրոցականների համար։
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-text">Ապրանք</p>
            <ul className="flex flex-col gap-0.5 sm:gap-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={FOOTER_LINK}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-text">Հաշիվ</p>
            <ul className="flex flex-col gap-0.5 sm:gap-2">
              <li>
                <Link to="/help" className={FOOTER_LINK}>
                  Օգնության կենտրոն
                </Link>
              </li>
              <li>
                <Link to="/login" className={FOOTER_LINK}>
                  Մուտք
                </Link>
              </li>
              <li>
                <Link to="/register" className={FOOTER_LINK}>
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
