import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as profileApi from "../api/profile";
import type { Profile } from "../api/profile";
import { useTheme } from "../hooks/useTheme";
import { Logo } from "./Logo";
import { NotificationBell } from "./notifications/NotificationBell";
import { AssignmentDrawer } from "./teaching/AssignmentDrawer";
import { ProfileDropdown } from "./ProfileDropdown";
import { StreakXpChip } from "./StreakXpChip";

/** Persistent top strip added inside AppChrome — coexists with AppSidebar's left drawer
 * rather than replacing it (see Phase 1 plan's header/nav decision). Owns the one profile
 * fetch both the streak/XP chip and the profile-avatar dropdown need. */
export function HeaderStrip() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let active = true;
    profileApi
      .fetchProfile()
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const name = profile ? profile.first_name || profile.username : "";

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-surface/90 pl-32 pr-2 backdrop-blur-sm sm:pl-36 sm:pr-5 lg:pl-[calc(var(--rail-w)+1.25rem)]">
      {/* The left padding clears two pre-existing fixed overlays this strip sits behind: the
       * hamburger (left-4, 44px) and ReloadButton (left-20, 44px, ending at 124px) — both
       * still fixed rather than moved inside the header, to keep that phase's blast radius
       * small. pl-32 (128px) is the tightest value that still clears them, and is used only
       * at the narrowest widths where every pixel is contested; sm and up keep pl-36.
       *
       * z-50 (not z-30): a `position: fixed` element with a z-index establishes its own
       * stacking context, so ProfileDropdown's z-50 menu (a descendant) was being capped at
       * this header's z-index when compared against siblings like NotificationBell's z-40
       * toggle — raising the header itself above every other persistent overlay's z-40 fixes
       * that regardless of what any single descendant sets. */}

      {/* Hidden below sm. At 375px the overlays reserve 128px, the right-hand cluster needs
       * 222px and the gutter 8px — 358px of a 375px viewport — so the logo could not fit
       * without pushing the account menu off-screen, which is what used to happen (it was
       * clipped by ~19px on every page). Home stays reachable on mobile through the drawer's
       * "Գլխավոր" item, which the hamburger to the left of this opens. */}
      <Link
        to="/"
        className="hidden items-center gap-2 transition-[filter] duration-[var(--motion-fast)] hover:brightness-110 sm:flex"
      >
        <Logo className="h-7 w-7 text-text" />
        <span className="hidden text-lg font-bold tracking-tight text-text sm:inline">Gitus</span>
      </Link>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {profile?.role === "student" && (
          <>
            <AssignmentDrawer />
            <StreakXpChip
              streak={profile.streak?.current_streak ?? 0}
              level={profile.level}
              xpIntoLevel={profile.xp_into_level}
              xpForNextLevel={profile.xp_for_next_level}
            />
          </>
        )}
        {/* Lives here (not as its own fixed top-right element) so it can't end up
         * stacked underneath this header — see NotificationBell.tsx's former
         * `fixed right-4 top-4 z-40` wrapper, which sat exactly behind this
         * header's own z-50 right-side icons and was fully unclickable. */}
        <NotificationBell />
        {profile && (
          <>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Փոխել տեսքի ռեժիմը"
              title="Փոխել տեսքի ռեժիմը"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-border bg-surface text-base transition-colors hover:border-primary"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <ProfileDropdown avatar={profile.avatar} name={name} />
          </>
        )}
      </div>
    </header>
  );
}
