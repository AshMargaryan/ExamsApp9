import { useNavigate } from "react-router-dom";
import { Swords } from "lucide-react";
import * as challengesApi from "../../api/challenges";
import type { ChallengeInvite } from "../../api/challenges";

export function ChallengeInviteCard({ invite, onRespond }: { invite: ChallengeInvite; onRespond: () => void }) {
  const navigate = useNavigate();

  async function handleAccept() {
    const updated = await challengesApi.respondToChallenge(invite.id, "accept");
    onRespond();
    if (updated.room_code) navigate(`/games/${updated.room_code}`);
  }

  async function handleDecline() {
    await challengesApi.respondToChallenge(invite.id, "decline");
    onRespond();
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-muted">
      <div className="flex items-center gap-2">
        <Swords size={16} strokeWidth={1.75} className="shrink-0 text-text-muted" />
        <div>
          <p className="text-text">
            <span className="font-medium">{invite.sender.first_name || invite.sender.username}</span>-ից մարտահրավեր
          </p>
          <p className="text-xs text-text-muted">
            {invite.subject_name}
            {invite.topic_name ? ` · ${invite.topic_name}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleAccept}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105"
          style={{ backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
        >
          Ընդունել
        </button>
        <button
          type="button"
          onClick={handleDecline}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-surface-muted"
        >
          Մերժել
        </button>
      </div>
    </div>
  );
}
