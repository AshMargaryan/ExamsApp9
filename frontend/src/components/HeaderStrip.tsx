import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as profileApi from "../api/profile";
import type { Profile } from "../api/profile";
import { useTheme } from "../hooks/useTheme";
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
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-surface/90 pl-36 pr-3 backdrop-blur-sm sm:pr-5">
      {/* pl-36 clears two pre-existing fixed overlays this strip now sits behind: the
       * hamburger (left-4, 44px) and ReloadButton (left-20, 44px) — both still fixed rather
       * than moved inside the header, to keep this phase's blast radius small.
       * z-50 (not z-30): a `position: fixed` element with a z-index establishes its own
       * stacking context, so ProfileDropdown's z-50 menu (a descendant) was being capped at
       * this header's z-index when compared against siblings like AssignmentSidebar's z-40
       * toggle — raising the header itself above every other persistent overlay's z-40 fixes
       * that regardless of what any single descendant sets. */}
      <Link
        to="/"
        className="flex items-center gap-2 transition-[filter] duration-[var(--motion-fast)] hover:brightness-110"
      >
        <img src="/favicon.svg" alt="" className="h-7 w-7" />
        <span
          className="hidden text-lg font-bold tracking-tight sm:inline"
          style={{
            background: "var(--gradient-hero)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Gitus
        </span>
      </Link>

      {profile && (
        <div className="flex items-center gap-2.5 sm:gap-3">
          {profile.role === "student" && (
            <StreakXpChip
              streak={profile.streak?.current_streak ?? 0}
              level={profile.level}
              xpIntoLevel={profile.xp_into_level}
              xpForNextLevel={profile.xp_for_next_level}
            />
          )}
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
        </div>
      )}
    </header>
  );
}
