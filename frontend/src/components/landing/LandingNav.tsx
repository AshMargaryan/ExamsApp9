import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { Logo } from "../Logo";

/*
  The desktop bar switches in at lg, and the gap is 5 rather than 7.

  History, because both numbers have been wrong before. With **seven** links
  this bar could not hold 1024px: measured there the row ran
  logo→114px→nav→811px→actions with no slack at all, so "AI Tutor" and
  "Ուսումնական պլան" wrapped to two lines, the wordmark collided with the
  first link, and "Սկսել անվճար" broke across three. It was moved to xl. On
  gutter: at max-w-6xl the seven labels needed 589px, the wordmark 82 and the
  action cluster 249, which with gap-7's 168px of gutter came to exactly 1088
  — the content width to the pixel, so the row wrapped rather than overflowed.

  The page restructure took the nav to **five** links, so the constraint was
  re-measured rather than assumed. At 1024px: wordmark 83 + nav 492 (labels
  90/75/140/54/55 with gap-5) + actions 258 = 833 against 960px of content
  width — **127px of slack**, and the nav row measures 20px tall, i.e. one
  line. So lg is safe again, and a tablet gets the real navigation and the
  sign-up CTA instead of a hamburger.

  gap-7 would also fit (+32px, leaving ~95px), but there is no reason to spend
  slack on gutter. `whitespace-nowrap` on the links makes any future overrun
  show up as overflow rather than as silent two-line labels — which is how
  the original bug hid.

  If a link is ever added or a label reworded, re-measure. The margin is real
  now but it is five labels wide, not infinite.
*/
/*
  Five links, one per movement the reader might want to jump to. The page has
  seven movements; trust and the closing CTA are not destinations anyone
  navigates *to*, so putting them here would cost width to no purpose.
*/
const NAV_LINKS = [
  /* The subject universe is the largest and most distinctive thing on the
     page, and until recently it was the only section reachable by neither the
     nav nor the footer — 39% of the page's height with no way to jump to it. */
  { href: "#subjects", label: "Առարկաներ" },
  { href: "#mistakes", label: "Սխալները" },
  { href: "#study-plan", label: "Ուսումնական պլան" },
  { href: "#ai-tutor", label: "AI Tutor" },
  { href: "#faq", label: "Հարցեր" },
];

/*
  The bar is transparent until the reader scrolls, and the top of this page is
  ALWAYS the night ground — the hero and the subject universe are theme-invariant grounds
  (see theme.css `--color-night*`). So while it is transparent the bar cannot
  use theme ink.

  This was a real, measured failure, not a precaution: in **light** mode the
  wordmark rendered `--color-text` (#1a1714) on #05050a and the links
  `--color-text-muted` (#6b635a) at ~2.6:1 — the navigation was effectively
  invisible on the first screen of the page, for every visitor whose OS
  prefers light. The sign-up button was the same story from the other
  direction: a #2d3f8f fill on near-black is a 2.0:1 boundary, under the 3:1
  floor for a UI component's edge.

  Once `scrolled` is true the bar paints `bg-surface/85`, which is a theme
  surface, and theme ink is correct again. So the whole swap keys off exactly
  that one boolean.
*/
function navInk(scrolled: boolean) {
  return {
    mark: scrolled ? "text-text" : "text-night-ink",
    link: scrolled
      ? "text-text-muted hover:text-text"
      : "text-night-ink-muted hover:text-night-ink",
    iconButton: scrolled
      ? "border-border bg-surface text-text-muted hover:border-primary hover:text-text"
      : "border-night-line bg-night-fill text-night-ink-muted hover:text-night-ink",
    cta: scrolled
      ? "bg-primary text-primary-contrast hover:bg-primary-hover"
      : "bg-night-ink text-night hover:opacity-90",
  };
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  /* An open mobile menu drops an opaque `bg-surface` panel under the bar, so
     the bar has to become opaque with it — otherwise the top strip stays
     transparent night while the panel below it is a light card, and the
     wordmark and the panel's own links end up in two different palettes on
     one control. */
  const opaque = scrolled || menuOpen;
  const ink = navInk(opaque);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        opaque ? "border-b border-border bg-surface/85 shadow-sm backdrop-blur" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2">
          <Logo className={`h-7 w-7 ${ink.mark}`} />
          <span className={`text-lg font-bold tracking-tight ${ink.mark}`}>Gitus</span>
        </a>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Հիմնական նավիգացիա">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={`text-sm font-medium whitespace-nowrap transition-colors ${ink.link}`}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Անցնել լուսավոր ռեժիմի" : "Անցնել մուգ ռեժիմի"}
            title={theme === "dark" ? "Անցնել լուսավոր ռեժիմի" : "Անցնել մուգ ռեժիմի"}
            className={`flex h-[34px] w-[34px] items-center justify-center rounded-[var(--radius-md)] border transition-colors ${ink.iconButton}`}
          >
            {theme === "dark" ? <Sun size={16} strokeWidth={1.75} aria-hidden /> : <Moon size={16} strokeWidth={1.75} aria-hidden />}
          </button>
          <Link to="/login" className={`text-sm font-medium whitespace-nowrap transition-colors ${ink.link}`}>
            Մուտք
          </Link>
          <Link
            to="/register"
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${ink.cta}`}
          >
            Սկսել անվճար →
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Անցնել լուսավոր ռեժիմի" : "Անցնել մուգ ռեժիմի"}
            title={theme === "dark" ? "Անցնել լուսավոր ռեժիմի" : "Անցնել մուգ ռեժիմի"}
            className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border transition-colors ${ink.iconButton}`}
          >
            {theme === "dark" ? <Sun size={18} strokeWidth={1.75} aria-hidden /> : <Moon size={18} strokeWidth={1.75} aria-hidden />}
          </button>

          <button
            type="button"
            aria-label={menuOpen ? "Փակել ընտրացանկը" : "Բացել ընտրացանկը"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-md border transition-colors ${ink.iconButton}`}
          >
            <span className={`h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${menuOpen ? "translate-y-[6.5px] rotate-45" : ""}`} />
            <span className={`h-0.5 w-5 rounded-full bg-current transition-opacity duration-150 ${menuOpen ? "opacity-0" : "opacity-100"}`} />
            <span className={`h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${menuOpen ? "-translate-y-[6.5px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-surface px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Բջջային նավիգացիա">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2.5 text-base font-medium text-text hover:bg-surface-muted"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <Link
              to="/login"
              className="rounded-md border border-border px-4 py-2.5 text-center text-sm font-medium text-text"
            >
              Մուտք
            </Link>
            <Link
              to="/register"
              className="bg-primary rounded-md px-4 py-2.5 text-center text-sm font-semibold text-primary-contrast"
            >
              Սկսել անվճար →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
