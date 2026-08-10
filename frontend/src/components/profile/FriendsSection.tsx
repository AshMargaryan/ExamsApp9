import { useEffect, useState } from "react";
import * as friendsApi from "../../api/friends";
import type { FriendUser } from "../../api/friends";
import { PersonBox } from "../PersonBox";
import { EmptyState } from "../ui/EmptyState";
import { SectionHeader } from "../ui/SectionHeader";
import { FriendsModal } from "../friends/FriendsModal";
import { PublicProfileModal } from "./PublicProfileModal";

const PREVIEW_COUNT = 6;

export function FriendsSection() {
  const [friends, setFriends] = useState<FriendUser[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  useEffect(() => {
    friendsApi.fetchFriends().then(setFriends);
  }, []);

  function handleModalClose() {
    setModalOpen(false);
    friendsApi.fetchFriends().then(setFriends);
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <SectionHeader
        title={`👥 Ուսումնական ցանց ${friends ? `(${friends.length})` : ""}`}
        action={
          <button type="button" onClick={() => setModalOpen(true)} className="text-sm text-primary hover:underline">
            Կառավարել →
          </button>
        }
      />

      {friends === null && <p className="text-sm text-text-muted">Բեռնվում է...</p>}

      {friends !== null && friends.length === 0 && (
        <EmptyState
          icon="👥"
          title="Ձեր ուսումնական ցանցը դատարկ է"
          hint="Գտեք դասընկերներին և սովորեք միասին։"
          cta={{ label: "Գտնել ընկերներ", onClick: () => setModalOpen(true) }}
        />
      )}

      {friends !== null && friends.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {friends.slice(0, PREVIEW_COUNT).map((f) => (
            <PersonBox key={f.id} person={f} onClick={() => setViewingUserId(f.id)} />
          ))}
        </div>
      )}

      {modalOpen && <FriendsModal onClose={handleModalClose} />}
      {viewingUserId !== null && <PublicProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />}
    </div>
  );
}
