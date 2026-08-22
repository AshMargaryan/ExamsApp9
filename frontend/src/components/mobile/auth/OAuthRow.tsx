import type { User } from "../../../api/auth";
import { OAuthButtons } from "../../auth/OAuthButtons";

/*
  Google and Apple both render nothing when their client id is unset, which on
  a screen that unconditionally draws the "կամ" rule leaves an orphan divider
  over empty space. `hasOAuthProvider` lets a screen skip the whole section
  instead of framing a hole.
*/
export const hasOAuthProvider = Boolean(
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    (import.meta.env.VITE_APPLE_CLIENT_ID && import.meta.env.VITE_APPLE_REDIRECT_URI),
);

export function OAuthRow({ getRedirectPath }: { getRedirectPath: (user: User) => string }) {
  return <OAuthButtons getRedirectPath={getRedirectPath} />;
}
