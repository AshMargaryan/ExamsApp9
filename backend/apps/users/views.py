from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core import signing
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .emails import generate_verification_code, send_password_reset_email, send_verification_email
from .models import School, University, User, UserSession
from .oauth import make_registration_ticket, verify_apple_id_token, verify_google_id_token
from .serializers import (
    ChangePasswordSerializer, OAuthCompleteRegisterSerializer, RegisterSerializer, SchoolSerializer,
    UniversitySerializer, UserSerializer, UserSessionSerializer,
)
from .sessions import (
    DeviceLimitReached, create_session, get_device_limit,
    make_management_ticket, read_management_ticket,
)
from .utils import issue_tokens_for_user

password_reset_token = PasswordResetTokenGenerator()


def _issue_tokens_or_device_limit_response(user, request, success_status=status.HTTP_200_OK):
    """Shared by every login path (password, Google, Apple, OAuth completion):
    creates a device session if under the cap and returns tokens, or a 403
    with a management_ticket the frontend can use to list/revoke an existing
    session — see apps/users/sessions.py. Returns (response, granted) so
    callers with side effects that should only happen on an actual successful
    login (e.g. auto-linking a Google/Apple id) can gate on `granted`."""
    try:
        session = create_session(user, request)
    except DeviceLimitReached:
        return Response({
            "detail": (
                f"Հասել եք սարքերի առավելագույն թվին ({get_device_limit(user)})։ "
                "Անջատեք մեկ այլ սարք՝ շարունակելու համար։"
            ),
            "code": "device_limit_reached",
            "management_ticket": make_management_ticket(user.id),
        }, status=status.HTTP_403_FORBIDDEN), False
    return Response(issue_tokens_for_user(user, session), status=success_status), True


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        user.set_email_verification_code(generate_verification_code())
        user.save(update_fields=["email_verification_code", "email_verification_expires_at"])
        send_verification_email(user)


class LoginView(APIView):
    """POST /api/auth/login/ — {username, password}. Uses SimpleJWT's own
    serializer purely to validate credentials (same error/message as before
    on bad credentials — the frontend already shows a generic message on any
    failure, so nothing user-visible changes there), then applies the same
    device-session gate every other login path uses."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = TokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response, _ = _issue_tokens_or_device_limit_response(serializer.user, request)
        return response


class SessionAwareTokenRefreshSerializer(TokenRefreshSerializer):
    """Rejects refreshing a token whose session has been revoked, instead of
    silently minting a fresh access token for a device that should be shut
    out. Bumps last_activity_at on success."""

    def validate(self, attrs):
        try:
            incoming = RefreshToken(attrs["refresh"])
        except TokenError as exc:
            raise InvalidToken(str(exc)) from exc

        session_id = incoming.get("session_id")
        session = UserSession.objects.filter(session_id=session_id).first() if session_id else None
        if session is None or not session.is_active:
            raise InvalidToken("Session revoked.")

        data = super().validate(attrs)
        UserSession.objects.filter(pk=session.pk).update(last_activity_at=timezone.now())
        return data


class SessionAwareTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
    serializer_class = SessionAwareTokenRefreshSerializer


def _oauth_login_or_ticket(provider: str, provider_field: str, sub: str, email: str, first_name: str, last_name: str, request):
    """Shared by GoogleAuthView/AppleAuthView: existing linked account ->
    tokens (subject to the same device limit as password login). Existing
    account with a matching verified email -> auto-link + tokens. Otherwise
    -> a signed registration ticket to complete via OAuthCompleteRegisterView."""
    user = User.objects.filter(**{provider_field: sub}).first()
    needs_link = False
    if user is None:
        user = User.objects.filter(email__iexact=email).first()
        needs_link = user is not None

    if user is not None:
        response, granted = _issue_tokens_or_device_limit_response(user, request)
        # Only persist the provider link if the login actually succeeded —
        # a rejected (device-limit) attempt must not silently link the
        # account as a side effect.
        if granted and needs_link:
            setattr(user, provider_field, sub)
            user.save(update_fields=[provider_field])
        return response

    ticket = make_registration_ticket(provider, sub, email, first_name, last_name)
    return Response({
        "is_new": True,
        "ticket": ticket,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
    })


class GoogleAuthView(APIView):
    """POST /api/auth/google/ — {id_token} from Google Identity Services."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = str(request.data.get("id_token", "")).strip()
        if not token:
            return Response({"detail": "id_token-ը պարտադիր է։"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            claims = verify_google_id_token(token)
        except ValueError:
            return Response(
                {"detail": "Google-ով մուտքը ձախողվեց։ Փորձեք կրկին։"}, status=status.HTTP_400_BAD_REQUEST
            )

        if not claims["email_verified"]:
            return Response(
                {"detail": "Google-ի էլ. հասցեն հաստատված չէ։"}, status=status.HTTP_400_BAD_REQUEST
            )

        email = claims["email"].strip().lower()
        return _oauth_login_or_ticket(
            "google", "google_id", claims["sub"], email, claims["first_name"], claims["last_name"], request
        )


class AppleAuthView(APIView):
    """POST /api/auth/apple/ — {id_token, first_name?, last_name?} from Sign
    in with Apple. Apple only ever sends the user's name once, as a separate
    `user` field alongside the token on the very first authorization — the
    frontend is responsible for capturing that and forwarding it here as
    first_name/last_name on that same initial request; on every later
    sign-in these will be absent, which is fine since by then the account
    already exists."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = str(request.data.get("id_token", "")).strip()
        if not token:
            return Response({"detail": "id_token-ը պարտադիր է։"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            claims = verify_apple_id_token(token)
        except ValueError:
            return Response(
                {"detail": "Apple-ով մուտքը ձախողվեց։ Փորձեք կրկին։"}, status=status.HTTP_400_BAD_REQUEST
            )

        if not claims["email_verified"]:
            return Response(
                {"detail": "Apple-ի էլ. հասցեն հաստատված չէ։"}, status=status.HTTP_400_BAD_REQUEST
            )

        email = claims["email"].strip().lower()
        first_name = str(request.data.get("first_name", "")).strip()
        last_name = str(request.data.get("last_name", "")).strip()
        return _oauth_login_or_ticket("apple", "apple_id", claims["sub"], email, first_name, last_name, request)


class OAuthCompleteRegisterView(generics.CreateAPIView):
    """POST /api/auth/oauth/complete/ — creates the User for a brand-new
    Google/Apple sign-in once the profile-completion form is submitted."""

    serializer_class = OAuthCompleteRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response, _ = _issue_tokens_or_device_limit_response(user, request, success_status=status.HTTP_201_CREATED)
        return response


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/ {current_password?, new_password, confirm_new_password}
    — current_password is only required (and checked) when the account
    already has a usable one; a Google/Apple-only account (see
    OAuthCompleteRegisterSerializer.set_unusable_password) can call this the
    same way to set its first password, skipping straight to new_password.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        if user.has_usable_password() and not user.check_password(d["current_password"]):
            return Response(
                {"detail": "Ընթացիկ գաղտնաբառը սխալ է։"}, status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(d["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Գաղտնաբառը հաջողությամբ փոփոխվեց։"})


def _current_session_id(request):
    return request.auth.get("session_id") if request.auth else None


class LogoutView(APIView):
    """POST /api/auth/logout/ — revokes the session tied to the token used to
    call this endpoint, freeing its device slot. First time logout has ever
    done anything server-side (previously purely client-side token clearing)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_id = _current_session_id(request)
        if session_id:
            UserSession.objects.filter(
                session_id=session_id, user=request.user, revoked_at__isnull=True
            ).update(revoked_at=timezone.now())
        return Response({"detail": "Դուրս եք եկել համակարգից։"})


class SessionListView(generics.ListAPIView):
    """GET /api/auth/sessions/ — the authenticated user's own active devices,
    for the account-management page."""

    serializer_class = UserSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return UserSession.objects.filter(user=self.request.user, revoked_at__isnull=True)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["current_session_id"] = _current_session_id(self.request)
        return context


class SessionRevokeView(APIView):
    """POST /api/auth/sessions/<pk>/revoke/ — revoke one of the authenticated
    user's own sessions, freeing its device slot immediately."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        session = UserSession.objects.filter(pk=pk, user=request.user, revoked_at__isnull=True).first()
        if session is None:
            return Response({"detail": "Սեսիան չի գտնվել։"}, status=status.HTTP_404_NOT_FOUND)
        session.revoke()
        return Response({"detail": "Սարքն անջատված է։"})


def _read_ticket_or_error(request):
    """Shared by the two ticket-based (AllowAny) session-management endpoints
    below — returns (user_id, None) or (None, error_response)."""
    ticket = str(request.data.get("ticket", ""))
    try:
        return read_management_ticket(ticket), None
    except signing.BadSignature:
        return None, Response(
            {"detail": "Հղումն անվավեր է կամ ժամկետանց։"}, status=status.HTTP_400_BAD_REQUEST
        )


class SessionManagementListView(APIView):
    """POST /api/auth/sessions/manage/list/ — {ticket}. Lets a user who was
    just rejected for hitting the device limit see their existing sessions
    without a real access token — the ticket is scoped to nothing but this
    and the revoke endpoint below (see apps/users/sessions.py)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_id, error = _read_ticket_or_error(request)
        if error:
            return error
        sessions = UserSession.objects.filter(user_id=user_id, revoked_at__isnull=True)
        return Response(UserSessionSerializer(sessions, many=True).data)


class SessionManagementRevokeView(APIView):
    """POST /api/auth/sessions/manage/revoke/ — {ticket, session_id}."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_id, error = _read_ticket_or_error(request)
        if error:
            return error
        session = UserSession.objects.filter(
            pk=request.data.get("session_id"), user_id=user_id, revoked_at__isnull=True
        ).first()
        if session is None:
            return Response({"detail": "Սեսիան չի գտնվել։"}, status=status.HTTP_404_NOT_FOUND)
        session.revoke()
        return Response({"detail": "Սարքն անջատված է։"})


class SchoolSearchView(generics.ListAPIView):
    serializer_class = SchoolSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        qs = School.objects.all()
        if q:
            qs = qs.filter(name__icontains=q)
        return qs[:20]


class UniversitySearchView(generics.ListAPIView):
    serializer_class = UniversitySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        qs = University.objects.all()
        if q:
            qs = qs.filter(name__icontains=q)
        return qs[:20]


class VerifyEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        code = str(request.data.get("code", "")).strip()
        if user.is_email_verified:
            return Response({"detail": "Էլ. հասցեն արդեն հաստատված է։"}, status=status.HTTP_400_BAD_REQUEST)
        if (
            not code
            or code != user.email_verification_code
            or not user.email_verification_expires_at
            or user.email_verification_expires_at < timezone.now()
        ):
            return Response({"detail": "Կոդը սխալ է կամ ժամկետանց։"}, status=status.HTTP_400_BAD_REQUEST)
        user.is_email_verified = True
        user.email_verification_code = ""
        user.email_verification_expires_at = None
        user.save(update_fields=["is_email_verified", "email_verification_code", "email_verification_expires_at"])
        return Response({"detail": "Էլ. հասցեն հաստատված է։"})


class ResendVerificationCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_email_verified:
            return Response({"detail": "Էլ. հասցեն արդեն հաստատված է։"}, status=status.HTTP_400_BAD_REQUEST)
        user.set_email_verification_code(generate_verification_code())
        user.save(update_fields=["email_verification_code", "email_verification_expires_at"])
        send_verification_email(user)
        return Response({"detail": "Կոդը կրկին ուղարկվեց։"})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            user = None
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = password_reset_token.make_token(user)
            send_password_reset_email(user, uid, token)
        return Response({"detail": "Եթե այս էլ. հասցեով հաշիվ գոյություն ունի, նամակ կուղարկվի։"})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get("uid", "")
        token = request.data.get("token", "")
        new_password = request.data.get("new_password", "")
        confirm_new_password = request.data.get("confirm_new_password", "")

        if not new_password or new_password != confirm_new_password:
            return Response(
                {"detail": "Գաղտնաբառերը չեն համընկնում։"}, status=status.HTTP_400_BAD_REQUEST
            )
        if len(new_password) < 8:
            return Response(
                {"detail": "Գաղտնաբառը պետք է լինի առնվազն 8 նիշ։"}, status=status.HTTP_400_BAD_REQUEST
            )
        if not any(c.isalpha() for c in new_password) or not any(c.isdigit() for c in new_password):
            return Response(
                {"detail": "Գաղտնաբառը պետք է պարունակի առնվազն մեկ տառ և մեկ թիվ։"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None

        if user is None or not password_reset_token.check_token(user, token):
            return Response(
                {"detail": "Հղումն անվավեր է կամ ժամկետանց։"}, status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"detail": "Գաղտնաբառը հաջողությամբ փոփոխվեց։"})
