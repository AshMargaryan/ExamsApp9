from rest_framework.permissions import BasePermission


class IsTeacher(BasePermission):
    message = "Այս գործողությունը հասանելի է միայն ուսուցիչներին։"

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "teacher")


class IsStudent(BasePermission):
    message = "Այս գործողությունը հասանելի է միայն աշակերտներին։"

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "student")
