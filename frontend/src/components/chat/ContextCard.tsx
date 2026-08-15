import { useState } from "react";
import { Link } from "react-router-dom";
import { Award, ClipboardCheck, Swords } from "lucide-react";
import * as challengesApi from "../../api/challenges";
import type {
  AchievementContext, ChallengeContext, ContextType, MockExamResultContext, ProfileContext,
} from "../../api/chat";
import { useAuth } from "../../auth/AuthContext";
import { RARITY_COLORS, RARITY_LABELS } from "../../lib/achievementRarity";

const SUBJECT_LABELS: Record<string, string> = {
  math: "Մաթեմատիկա",
  physics: "Ֆիզիկա",
  biology: "Կենսաբանություն",
  chemistry: "Քիմիա",
  english: "Անգլերեն",
};

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-64 max-w-full overflow-hidden rounded-xl border border-border bg-surface text-text">
      {children}
    </div>
  );
}

function CardButton({ children, onClick, to }: { children: React.ReactNode; onClick?: () => void; to?: string }) {
  const className = "flex-1 px-3 py-2 text-center text-xs font-medium text-primary transition-colors hover:bg-surface-muted";
  if (to) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function MockExamResultCard({ data, own }: { data: MockExamResultContext; own: boolean }) {
  return (
    <CardShell>
      <div className="p-3">
        <p className="flex items-center gap-1 text-xs font-medium text-text-muted">
          <ClipboardCheck size={13} strokeWidth={1.75} /> {SUBJECT_LABELS[data.subject] ?? data.subject}
        </p>
        <p className="mt-1 truncate text-sm font-semibold">{data.exam_title}</p>
        <div className="mt-3 flex items-center gap-4">
          <div>
            <p className="text-2xl font-bold text-primary">{data.scaled_score ?? "—"}</p>
            <p className="text-xs text-text-muted">/ 20</p>
          </div>
          <div className="text-xs text-text-muted">
            <p>
              {data.raw_score} / {data.question_count} ճիշտ
            </p>
            {data.percent_answered !== null && <p>{data.percent_answered}% պատասխանված</p>}
          </div>
        </div>
      </div>
      {own && (
        <div className="flex border-t border-border">
          <CardButton to={`/mock-exams/attempt/${data.attempt_id}/results`}>Դիտել թեստը</CardButton>
        </div>
      )}
    </CardShell>
  );
}

function AchievementCard({ data, senderId }: { data: AchievementContext; senderId: number | null }) {
  return (
    <CardShell>
      <div className="p-3 text-center">
        <p className="flex justify-center text-3xl">{data.icon || <Award size={30} strokeWidth={1.75} />}</p>
        <p className="mt-1 text-sm font-semibold">{data.name}</p>
        {data.description && <p className="mt-1 text-xs text-text-muted">{data.description}</p>}
        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
          <span className="font-medium" style={{ color: RARITY_COLORS[data.rarity] }}>
            {RARITY_LABELS[data.rarity]}
          </span>
          {data.xp_reward > 0 && <span className="text-text-muted">+{data.xp_reward} XP</span>}
        </div>
      </div>
      {senderId !== null && (
        <div className="flex border-t border-border">
          <CardButton to={`/profile/${senderId}`}>Դիտել պրոֆիլը</CardButton>
        </div>
      )}
    </CardShell>
  );
}

function ProfileCard({ data }: { data: ProfileContext }) {
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username;
  return (
    <CardShell>
      <div className="flex items-center gap-3 p-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-lg font-semibold text-text-muted">
          {data.avatar ? (
            <img src={data.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-text-muted">
            Մակարդակ {data.level} · {data.total_xp} XP
          </p>
        </div>
      </div>
      <div className="flex border-t border-border">
        <CardButton to={`/profile/${data.user_id}`}>Դիտել պրոֆիլը</CardButton>
      </div>
    </CardShell>
  );
}

const CHALLENGE_STATUS_LABELS: Record<ChallengeContext["status"], string> = {
  pending: "Սպասվում է պատասխան",
  accepted: "Ընդունված",
  declined: "Մերժված",
  cancelled: "Չեղարկված",
  expired: "Ժամկետանց",
};

function ChallengeCard({ data }: { data: ChallengeContext }) {
  const { user } = useAuth();
  const [status, setStatus] = useState(data.status);
  const [roomCode, setRoomCode] = useState(data.room_code);
  const [busy, setBusy] = useState(false);

  const isReceiver = user?.id === data.receiver_id;
  const canRespond = isReceiver && status === "pending";

  async function respond(action: "accept" | "decline") {
    setBusy(true);
    try {
      const updated = await challengesApi.respondToChallenge(data.invite_id, action);
      setStatus(updated.status);
      setRoomCode(updated.room_code);
    } finally {
      setBusy(false);
    }
  }

  return (
    <CardShell>
      <div className="p-3 text-center">
        <p className="flex justify-center text-2xl">
          <Swords size={22} strokeWidth={1.75} />
        </p>
        <p className="mt-1 text-sm font-semibold">
          {data.sender_name} vs {data.receiver_name}
        </p>
        <p className="text-xs text-text-muted">{data.subject_name} · 10 հարց</p>
        <p className="mt-2 text-xs font-medium text-primary">{CHALLENGE_STATUS_LABELS[status]}</p>
      </div>
      {canRespond && (
        <div className="flex border-t border-border">
          <button
            type="button"
            onClick={() => respond("accept")}
            disabled={busy}
            className="flex-1 px-3 py-2 text-center text-xs font-medium text-primary transition-colors hover:bg-surface-muted disabled:opacity-60"
          >
            Ընդունել
          </button>
          <button
            type="button"
            onClick={() => respond("decline")}
            disabled={busy}
            className="flex-1 border-l border-border px-3 py-2 text-center text-xs font-medium text-text-muted transition-colors hover:bg-surface-muted disabled:opacity-60"
          >
            Մերժել
          </button>
        </div>
      )}
      {status === "accepted" && roomCode && (
        <div className="flex border-t border-border">
          <CardButton to={`/games/${roomCode}`}>Բացել խաղը</CardButton>
        </div>
      )}
    </CardShell>
  );
}

export function ContextCard({
  contextType, contextData, senderId, own,
}: {
  contextType: ContextType;
  contextData: unknown;
  senderId: number | null;
  own: boolean;
}) {
  if (contextType === "mock_exam_result") {
    return <MockExamResultCard data={contextData as MockExamResultContext} own={own} />;
  }
  if (contextType === "achievement") {
    return <AchievementCard data={contextData as AchievementContext} senderId={senderId} />;
  }
  if (contextType === "profile") {
    return <ProfileCard data={contextData as ProfileContext} />;
  }
  if (contextType === "challenge") {
    return <ChallengeCard data={contextData as ChallengeContext} />;
  }
  return null;
}
