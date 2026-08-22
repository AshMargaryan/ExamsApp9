import type { ComponentType } from "react";
import {
  AtSign,
  Flame,
  Hourglass,
  Link2,
  Mail,
  Swords,
  Trophy,
  TrendingDown,
  UserPlus,
  Users,
  Gamepad2,
} from "lucide-react";
import type { StudentNotificationType } from "../../api/notifications";

/*
  What each notification type looks like, and how urgent it is.

  Two things this file exists to fix.

  **The emoji were rendered twice.** The backend already embeds an emoji at
  the start of most notification messages ("🔥 Դու բարձրացել ես…",
  "⚠️ Քեզ առաջ են անցել…", "⚔️ dano-ը մարտահրավեր…"), and the frontend kept
  its own `Record<StudentNotificationType, string>` of emoji which it
  *prepended to the same line*. Three of the four notifications on the
  seeded account rendered their emoji twice, side by side. `stripLeadingEmoji`
  removes the one in the copy so the lucide icon is the only one — a display
  concern, handled in display code, and harmless if the backend ever stops
  embedding them.

  **Tone was not carried at all.** "You moved up to #1" and "you were
  overtaken" arrived in identical grey. The tone here is what lets the panel
  say which is good news without relying on the emoji to do it.
*/

export type NotificationTone = "neutral" | "positive" | "warning";

export const NOTIFICATION_META: Record<
  StudentNotificationType,
  { Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; tone: NotificationTone }
> = {
  rank_up: { Icon: Flame, tone: "positive" },
  overtaken: { Icon: TrendingDown, tone: "warning" },
  season_ending: { Icon: Hourglass, tone: "warning" },
  season_result: { Icon: Trophy, tone: "positive" },
  challenge_received: { Icon: Swords, tone: "neutral" },
  challenge_result: { Icon: Gamepad2, tone: "neutral" },
  friend_added: { Icon: UserPlus, tone: "positive" },
  parent_link_accepted: { Icon: Link2, tone: "neutral" },
  message_request: { Icon: Mail, tone: "neutral" },
  mention: { Icon: AtSign, tone: "neutral" },
  group_invite: { Icon: Users, tone: "neutral" },
};

export const TONE_CLASS: Record<NotificationTone, string> = {
  neutral: "bg-surface-muted text-text-muted",
  positive: "bg-correct-bg text-correct",
  warning: "bg-warning-bg text-warning",
};

/*
  Strip a leading emoji (plus any variation selector, ZWJ sequence and the
  space after it) from a notification message.

  Deliberately anchored to the start and applied once: an emoji *inside* a
  message is the author's, and stays.
*/
const LEADING_EMOJI =
  /^(?:[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]+)\s*/u;

export function stripLeadingEmoji(message: string): string {
  return message.replace(LEADING_EMOJI, "").trimStart();
}
