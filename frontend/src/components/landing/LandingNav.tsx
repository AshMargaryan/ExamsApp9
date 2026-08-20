import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { Logo } from "../Logo";

const NAV_LINKS = [
  { href: "#product", label: "Ապրանք" },
  { href: "#ai-tutor", label: "AI Tutor" },
  { href: "#tests", label: "Թեստեր" },
  { href: "#study-plan", label: "Ուսումնական պլան" },
  { href: "#rankings", label: "Դասակարգում" },
  { href: "#faq", label: "Օգնություն" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
        scrolled ? "border-b border-border bg-surface/85 shadow-sm backdrop-blur" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2">
          <Logo className="h-7 w-7 text-text" />
          <span className="text-lg font-bold tracking-tight text-text">Gitus</span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Հիմնական նավիգացիա">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-text-muted transition-colors hover:text-text">
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
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface text-text-muted transition-colors hover:border-primary hover:text-text"
          >
            {theme === "dark" ? <Sun size={16} strokeWidth={1.75} aria-hidden /> : <Moon size={16} strokeWidth={1.75} aria-hidden />}
          </button>
          <Link to="/login" className="text-sm font-medium text-text-muted transition-colors hover:text-text">
            Մուտք
          </Link>
          <Link
            to="/register"
            className="bg-primary rounded-md px-4 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
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
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface text-text-muted"
          >
            {theme === "dark" ? <Sun size={18} strokeWidth={1.75} aria-hidden /> : <Moon size={18} strokeWidth={1.75} aria-hidden />}
          </button>

          <button
            type="button"
            aria-label={menuOpen ? "Փակել ընտրացանկը" : "Բացել ընտրացանկը"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-md border border-border bg-surface"
          >
            <span className={`h-0.5 w-5 rounded-full bg-text transition-transform duration-300 ${menuOpen ? "translate-y-[6.5px] rotate-45" : ""}`} />
            <span className={`h-0.5 w-5 rounded-full bg-text transition-opacity duration-150 ${menuOpen ? "opacity-0" : "opacity-100"}`} />
            <span className={`h-0.5 w-5 rounded-full bg-text transition-transform duration-300 ${menuOpen ? "-translate-y-[6.5px] -rotate-45" : ""}`} />
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
