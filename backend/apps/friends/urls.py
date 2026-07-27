from django.urls import path

from .views import (
    CancelFriendRequestView,
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
    path("<int:user_id>/", RemoveFriendView.as_view(), name="friend_remove"),
    path("", FriendListView.as_view(), name="friend_list"),
]
