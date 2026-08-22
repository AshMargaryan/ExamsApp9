import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as profileApi from "../../api/profile";
import type { Profile } from "../../api/profile";
import { Logo } from "../Logo";
import { NotificationBell } from "../notifications/NotificationBell";
import { ProfileDropdown } from "../ProfileDropdown";
import { StreakXpChip } from "../StreakXpChip";

/*
  The native shell's top bar. Deliberately thinner and emptier than the web
  HeaderStrip: navigation lives in the bottom tab bar now, so this only carries
  identity (logo), the streak/XP the product wants always visible, and the two
  controls that have nowhere else to go — notifications and the account menu.
*/
export function MobileTopBar() {
  const [profile, setProfile] = useState<Profile | null>(null);

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
    <header
      className="fixed inset-x-0 top-0 z-[70] flex items-center justify-between border-b border-border bg-surface/90 px-3 backdrop-blur-md"
      style={{ paddingTop: "var(--safe-top)", height: "calc(var(--safe-top) + var(--mobile-topbar-h))" }}
    >
      <Link to="/" aria-label="Գլխավոր" className="flex items-center gap-2">
        <Logo className="h-6 w-6 text-text" />
        <span className="text-[17px] font-bold tracking-tight text-text">Gitus</span>
      </Link>

      <div className="flex items-center gap-1.5">
        {profile?.role === "student" && (
          <StreakXpChip
            streak={profile.streak?.current_streak ?? 0}
            level={profile.level}
            xpIntoLevel={profile.xp_into_level}
            xpForNextLevel={profile.xp_for_next_level}
          />
        )}
        <NotificationBell />
        {profile && <ProfileDropdown avatar={profile.avatar} name={name} />}
      </div>
    </header>
  );
}
