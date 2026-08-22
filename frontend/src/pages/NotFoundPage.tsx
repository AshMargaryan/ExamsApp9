import { Compass, House, ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { LinkButton } from "../components/ui/LinkButton";
import { PageHeader } from "../components/ui/PageHeader";

/*
  The page for a URL that does not exist.

  There was no catch-all route at all, so react-router matched nothing and
  rendered nothing: a stale bookmark, a mistyped path, or a link to a route
  that has since moved produced a completely blank white document — no
  header, no navigation, no message, no way back except the browser's own
  back button. That is the worst possible answer to a wrong URL, and it is
  invisible in every happy-path check.

  This lives inside ProtectedRoute so the student keeps the app chrome
  around them: the sidebar and header are the actual recovery path, and the
  page only has to explain what happened and offer the two or three
  destinations that are worth naming. A signed-out visitor still gets sent
  to /login by ProtectedRoute, which is the right answer for them.

  The attempted path is echoed back because "this page does not exist" is
  much easier to act on when you can see *which* address was tried — it is
  the difference between "the app is broken" and "I copied half a link".
*/
export function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Only offer "back" when there is somewhere to go back to. Landing here
  // directly from a bookmark leaves no history entry, and a back button that
  // does nothing is worse than no back button.
  const canGoBack = window.history.length > 1;

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        eyebrow="404"
        title="Այս էջը գոյություն չունի"
        description="Հասցեն սխալ է, կամ էջը տեղափոխվել է։ Ուսումնական տվյալներդ տեղում են։"
      />

      {/* An inline chip, not a bordered full-width row: the first version of
          this was a full-width box with a magnifier in it, which reads as a
          search field the student can type into. The address is a fact being
          quoted back, so it is set as one. */}
      <p className="mb-[var(--space-6)] text-[length:var(--text-sm)] text-text-muted">
        Փորձված հասցեն՝{" "}
        <code className="break-all rounded-[var(--radius-sm)] bg-surface-muted px-[var(--space-2)] py-[2px] text-[length:var(--text-xs)] text-text">
          {location.pathname}
        </code>
      </p>

      <div className="flex flex-wrap gap-[var(--space-3)]">
        <LinkButton to="/" variant="primary" iconLeft={<House size={16} strokeWidth={1.75} aria-hidden />}>
          Գլխավոր էջ
        </LinkButton>
        <LinkButton to="/practice" iconLeft={<Compass size={16} strokeWidth={1.75} aria-hidden />}>
          Առարկաներ
        </LinkButton>
        {canGoBack && (
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            iconLeft={<ArrowLeft size={16} strokeWidth={1.75} aria-hidden />}
          >
            Վերադառնալ
          </Button>
        )}
      </div>
    </div>
  );
}
