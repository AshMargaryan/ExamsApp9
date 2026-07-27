from .models import Friendship


def _ordered_ids(user_a_id: int, user_b_id: int) -> tuple[int, int]:
    return (user_a_id, user_b_id) if user_a_id < user_b_id else (user_b_id, user_a_id)


def are_friends(user_a, user_b) -> bool:
    if user_a.id == user_b.id:
        return False
    id1, id2 = _ordered_ids(user_a.id, user_b.id)
    return Friendship.objects.filter(user1_id=id1, user2_id=id2).exists()


def create_friendship(user_a, user_b) -> Friendship:
    id1, id2 = _ordered_ids(user_a.id, user_b.id)
    friendship, _ = Friendship.objects.get_or_create(user1_id=id1, user2_id=id2)
    return friendship


def remove_friendship(user_a, user_b) -> bool:
    id1, id2 = _ordered_ids(user_a.id, user_b.id)
    deleted, _ = Friendship.objects.filter(user1_id=id1, user2_id=id2).delete()
    return deleted > 0
