import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import * as friendsApi from "../../api/friends";
import type { FriendUser } from "../../api/friends";
import { PersonBox } from "../PersonBox";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FriendsModal } from "../friends/FriendsModal";

const PREVIEW_COUNT = 6;

export function FriendsSection() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendUser[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    friendsApi.fetchFriends().then(setFriends);
  }, []);

  function handleModalClose() {
    setModalOpen(false);
    friendsApi.fetchFriends().then(setFriends);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
      >
        <div className="flex items-center gap-2 text-white">
          <Users size={20} strokeWidth={1.75} />
          <div>
            <p className="text-sm font-bold leading-tight">Ուսումնական ցանց</p>
            <p className="text-xs leading-tight text-white/75">{friends ? `${friends.length} ընկեր` : "..."}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/25"
        >
          Կառավարել
        </button>
      </div>

      <div className="p-4">
        {friends === null && <p className="text-sm text-text-muted">Բեռնվում է...</p>}

        {friends !== null && friends.length === 0 && (
          <EmptyState
            icon={<Users size={22} strokeWidth={1.75} />}
            title="Ձեր ուսումնական ցանցը դատարկ է"
            hint="Գտեք դասընկերներին և սովորեք միասին։"
            cta={{ label: "Գտնել ընկերներ", onClick: () => setModalOpen(true) }}
          />
        )}

        {friends !== null && friends.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {friends.slice(0, PREVIEW_COUNT).map((f) => (
              <PersonBox key={f.id} person={f} onClick={() => navigate(`/profile/${f.id}`)} />
            ))}
          </div>
        )}

        {friends !== null && friends.length > PREVIEW_COUNT && (
          <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)} className="mt-3 w-full">
            Տեսնել բոլորը ({friends.length}) →
          </Button>
        )}
      </div>

      {modalOpen && <FriendsModal onClose={handleModalClose} />}
    </div>
  );
}
