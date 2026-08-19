import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import * as friendsApi from "../../api/friends";
import type { FriendUser } from "../../api/friends";
import { PersonBox } from "../PersonBox";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { SkeletonRows } from "../ui/Skeleton";
import { FriendsModal } from "../friends/FriendsModal";
import { DataCard } from "../ui/DataCard";

const PREVIEW_COUNT = 6;

export function FriendsSection() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const resource = useAsyncResource<FriendUser[]>(useCallback(() => friendsApi.fetchFriends(), []));
  const friends = resource.data;

  function handleModalClose() {
    setModalOpen(false);
    resource.retry();
  }

  return (
    <DataCard
      icon={Users}
      title="Ընկերներ"
      description={friends ? `${friends.length} ընկեր` : undefined}
      action={
        <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
          Կառավարել
        </Button>
      }
    >
      <>
        {resource.isLoading && <SkeletonRows count={2} />}

        {resource.error !== null && !resource.isLoading && (
          <ErrorState size="sm" title="Չհաջողվեց բեռնել ընկերներին։" onRetry={resource.retry} />
        )}

        {friends !== null && friends.length === 0 && (
          <EmptyState
            icon={<Users size={22} strokeWidth={1.75} />}
            title="Ձեր ուսումնական ցանցը դատարկ է"
            hint="Գտեք դասընկերներին և սովորեք միասին։"
            cta={{ label: "Գտնել ընկերներ", onClick: () => setModalOpen(true) }}
          />
        )}

        {friends !== null && friends.length > 0 && (
          <div className="grid grid-cols-3 gap-[var(--space-2)] sm:grid-cols-6">
            {friends.slice(0, PREVIEW_COUNT).map((f) => (
              <PersonBox key={f.id} person={f} onClick={() => navigate(`/profile/${f.id}`)} />
            ))}
          </div>
        )}

        {friends !== null && friends.length > PREVIEW_COUNT && (
          <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)} className="mt-[var(--space-3)] w-full">
            Տեսնել բոլորը ({friends.length}) →
          </Button>
        )}
      </>

      {modalOpen && <FriendsModal onClose={handleModalClose} />}
    </DataCard>
  );
}
