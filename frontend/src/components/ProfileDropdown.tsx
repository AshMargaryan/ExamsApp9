import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/cn";
import { Avatar } from "./ui/Avatar";
import { Dropdown } from "./ui/Dropdown";
import { LogoutConfirmModal } from "./LogoutConfirmModal";

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
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors duration-[var(--motion-fast)] hover:bg-surface-muted"
          >
            <Avatar src={avatar} name={name} size="sm" />
            <span className="hidden max-w-[8rem] truncate text-sm font-medium text-text sm:inline">{name}</span>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className={cn(
                "h-4 w-4 text-text-muted transition-transform duration-[var(--motion-fast)]",
                triggerProps["aria-expanded"] && "rotate-180",
              )}
              aria-hidden="true"
            >
              <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        items={[
          { key: "profile", label: "Իմ պրոֆիլը", icon: "👤", onSelect: () => navigate("/profile") },
          { key: "subscription", label: "Բաժանորդագրություն", icon: "💎", onSelect: () => navigate("/subscription") },
          { key: "settings", label: "Կարգավորումներ", icon: "⚙️", onSelect: () => navigate("/settings") },
          { key: "help", label: "Օգնության կենտրոն", icon: "❓", onSelect: () => navigate("/help") },
          { key: "logout", label: "Ելք", icon: "🚪", tone: "danger", onSelect: () => setLogoutOpen(true) },
        ]}
      />
      <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  );
}
