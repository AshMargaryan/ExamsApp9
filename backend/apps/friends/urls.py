from django.urls import path

from .views import (
    BlockedUsersListView,
    BlockUserView,
    CancelFriendRequestView,
    FriendDashboardView,
    FriendListView,
    FriendRequestListView,
    RemoveFriendView,
    RespondFriendRequestView,
    SendFriendRequestView,
    UserSearchView,
)

urlpatterns = [
    path("search/", UserSearchView.as_view(), name="friend_search"),
    path("requests/", FriendRequestListView.as_view(), name="friend_request_list"),
    path("requests/send/", SendFriendRequestView.as_view(), name="friend_request_send"),
    path("requests/<int:pk>/respond/", RespondFriendRequestView.as_view(), name="friend_request_respond"),
    path("requests/<int:pk>/", CancelFriendRequestView.as_view(), name="friend_request_cancel"),
    path("blocked/", BlockedUsersListView.as_view(), name="blocked_users_list"),
    path("block/", BlockUserView.as_view(), name="block_user"),
    path("block/<int:user_id>/", BlockUserView.as_view(), name="unblock_user"),
    path("<int:user_id>/dashboard/", FriendDashboardView.as_view(), name="friend_dashboard"),
    path("<int:user_id>/", RemoveFriendView.as_view(), name="friend_remove"),
    path("", FriendListView.as_view(), name="friend_list"),
]
