from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import generate_verification_code, send_password_reset_email, send_verification_email
from .models import School, University, User
from .serializers import (
    RegisterSerializer, SchoolSerializer, UniversitySerializer, UserSerializer,
)

password_reset_token = PasswordResetTokenGenerator()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        user.set_email_verification_code(generate_verification_code())
        user.save(update_fields=["email_verification_code", "email_verification_expires_at"])
        send_verification_email(user)


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


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
