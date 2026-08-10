import { useNavigate } from "react-router-dom";
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
    <div className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
      <div>
        <p className="text-text">
          ⚔️ <span className="font-medium">{invite.sender.first_name || invite.sender.username}</span>-ից
          մարտահրավեր
        </p>
        <p className="text-xs text-text-muted">
          {invite.subject_name}
          {invite.topic_name ? ` · ${invite.topic_name}` : ""}
        </p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={handleAccept} className="text-sm text-primary hover:underline">
          Ընդունել
        </button>
        <button type="button" onClick={handleDecline} className="text-sm text-text-muted hover:underline">
          Մերժել
        </button>
      </div>
    </div>
  );
}
