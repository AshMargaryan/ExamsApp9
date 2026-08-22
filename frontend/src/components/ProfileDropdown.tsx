import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { cn } from "../lib/cn";
import { accountNavLinks } from "./nav/navItems";
import { Avatar } from "./ui/Avatar";
import { Dropdown } from "./ui/Dropdown";
import { LogoutConfirmModal } from "./LogoutConfirmModal";

const MENU_ICON_SIZE = 17;
const MENU_ICON_STROKE = 1.75;

interface ProfileDropdownProps {
  avatar: string | null;
  name: string;
}

export function ProfileDropdown({ avatar, name }: ProfileDropdownProps) {
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <>
      <Dropdown
        align="end"
        renderTrigger={({ onClick, ...triggerProps }) => (
          <button
            type="button"
            onClick={onClick}
            {...triggerProps}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors duration-[var(--motion-fast)] hover:bg-surface-muted sm:pr-2.5"
          >
            <Avatar src={avatar} name={name} size="sm" />
            <span className="hidden max-w-[8rem] truncate text-sm font-medium text-text sm:inline">{name}</span>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className={cn(
                "hidden h-4 w-4 text-text-muted transition-transform duration-[var(--motion-fast)] sm:block",
                triggerProps["aria-expanded"] && "rotate-180",
              )}
              aria-hidden="true"
            >
              <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        items={[
          ...accountNavLinks.map((link) => ({
            key: link.to.slice(1),
            label: link.label,
            icon: link.icon,
            onSelect: () => navigate(link.to),
          })),
          {
            key: "logout",
            label: "Ելք",
            icon: <LogOut size={MENU_ICON_SIZE} strokeWidth={MENU_ICON_STROKE} />,
            tone: "danger",
            onSelect: () => setLogoutOpen(true),
          },
        ]}
      />
      <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  );
}
