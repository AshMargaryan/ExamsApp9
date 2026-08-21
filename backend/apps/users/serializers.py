from django.contrib.auth import get_user_model
from django.core import signing
from django.utils import timezone
from rest_framework import serializers

from .models import AccountRole, School, University
from .oauth import read_registration_ticket
from .utils import suggest_usernames

User = get_user_model()

# Maps a registration ticket's `provider` value to the User field that stores
# that provider's account id. Extend this when adding a new provider.
PROVIDER_ID_FIELDS = {"google": "google_id", "apple": "apple_id"}


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ["id", "name", "marz"]


class UniversitySerializer(serializers.ModelSerializer):
    class Meta:
        model = University
        fields = ["id", "name"]


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={"min_length": "Գաղտնաբառը պետք է լինի առնվազն 8 նիշ։"},
    )
    confirm_password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={"min_length": "Գաղտնաբառը պետք է լինի առնվազն 8 նիշ։"},
    )
    first_name = serializers.CharField(required=True, allow_blank=False)
    last_name = serializers.CharField(required=True, allow_blank=False)
    role = serializers.ChoiceField(
        choices=AccountRole.choices,
        required=True,
        error_messages={"required": "Խնդրում ենք ընտրել դեր՝ աշակերտ, ուսուցիչ կամ ծնող։"},
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "password", "confirm_password",
            "first_name", "last_name", "role",
            "age", "grade", "sex", "school", "university",
        ]
        extra_kwargs = {
            "role": {"required": True},
            "age": {"required": False},
            "grade": {"required": False},
            "sex": {"required": False},
            "school": {"required": False},
            "university": {"required": False},
        }

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError({
                "message": "Այս օգտանունն արդեն զբաղված է։",
                "suggestions": suggest_usernames(value),
            })
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Այս էլ. հասցեով հաշիվ արդեն գոյություն ունի։")
        return value

    def validate_grade(self, value):
        if value is not None and not (1 <= value <= 12):
            raise serializers.ValidationError("Դասարանը պետք է լինի 1-ից 12 միջակայքում։")
        return value

    def validate_password(self, value):
        if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
            raise serializers.ValidationError(
                "Գաղտնաբառը պետք է պարունակի առնվազն մեկ տառ և մեկ թիվ։"
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Գաղտնաբառերը չեն համընկնում։"})
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class OAuthCompleteRegisterSerializer(serializers.ModelSerializer):
    """Creates the User for a brand-new Google/Apple sign-in, once the user has
    filled in the fields OAuth doesn't supply (username, role, ...). No User
    row exists until this succeeds — see apps/users/oauth.py for the ticket
    that carries the verified provider identity up to this point."""

    ticket = serializers.CharField(write_only=True)
    username = serializers.CharField()
    first_name = serializers.CharField(required=True, allow_blank=False)
    last_name = serializers.CharField(required=True, allow_blank=False)
    role = serializers.ChoiceField(
        choices=AccountRole.choices,
        required=True,
        error_messages={"required": "Խնդրում ենք ընտրել դեր՝ աշակերտ, ուսուցիչ կամ ծնող։"},
    )

    class Meta:
        model = User
        fields = [
            "id", "ticket", "username", "first_name", "last_name", "role",
            "age", "grade", "sex", "school", "university",
        ]
        extra_kwargs = {
            "role": {"required": True},
            "age": {"required": False},
            "grade": {"required": False},
            "sex": {"required": False},
            "school": {"required": False},
            "university": {"required": False},
        }

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError({
                "message": "Այս օգտանունն արդեն զբաղված է։",
                "suggestions": suggest_usernames(value),
            })
        return value

    def validate_grade(self, value):
        if value is not None and not (1 <= value <= 12):
            raise serializers.ValidationError("Դասարանը պետք է լինի 1-ից 12 միջակայքում։")
        return value

    def validate_ticket(self, value):
        try:
            data = read_registration_ticket(value)
        except signing.SignatureExpired:
            raise serializers.ValidationError(
                "Գրանցման նիստն ավարտվել է։ Խնդրում ենք կրկին փորձել մուտք գործել։"
            )
        except signing.BadSignature:
            raise serializers.ValidationError(
                "Անվավեր հարցում։ Խնդրում ենք կրկին փորձել մուտք գործել։"
            )
        provider_field = PROVIDER_ID_FIELDS.get(data.get("provider"))
        if provider_field is None:
            raise serializers.ValidationError("Անհայտ մատակարար։")
        self._oauth_data = data
        self._provider_field = provider_field
        return value

    def create(self, validated_data):
        validated_data.pop("ticket")
        data = self._oauth_data
        provider_field = self._provider_field

        existing = User.objects.filter(**{provider_field: data["sub"]}).first()
        if existing is not None:
            return existing

        if User.objects.filter(email__iexact=data["email"]).exists():
            raise serializers.ValidationError({
                "ticket": "Այս էլ. հասցեով հաշիվ արդեն գոյություն ունի։ Խնդրում ենք մուտք գործել գաղտնաբառով։"
            })

        user = User(email=data["email"], **{provider_field: data["sub"]}, **validated_data)
        user.is_email_verified = True
        user.set_unusable_password()
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    school = SchoolSerializer(read_only=True)
    university = UniversitySerializer(read_only=True)
    school_id = serializers.PrimaryKeyRelatedField(
        source="school", queryset=School.objects.all(), write_only=True, required=False, allow_null=True
    )
    university_id = serializers.PrimaryKeyRelatedField(
        source="university", queryset=University.objects.all(), write_only=True, required=False, allow_null=True
    )
    # Google/Apple-only accounts have no usable password (see OAuth register
    # flow's set_unusable_password()) — the frontend uses this to switch the
    # settings form between "change password" (needs current_password) and
    # "set a password" (doesn't, since there isn't one to verify yet).
    has_usable_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "date_joined", "is_email_verified", "role",
            "first_name", "last_name", "age", "grade", "sex",
            "school", "university", "school_id", "university_id", "has_usable_password",
        ]
        read_only_fields = ["id", "date_joined", "is_email_verified", "role"]

    def get_has_usable_password(self, obj) -> bool:
        return obj.has_usable_password()

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Այս էլ. հասցեով հաշիվ արդեն գոյություն ունի։")
        return value

    def validate_grade(self, value):
        if value is not None and not (1 <= value <= 12):
            raise serializers.ValidationError("Դասարանը պետք է լինի 1-ից 12 միջակայքում։")
        return value

    def validate_username(self, value):
        user = self.instance
        if user is not None and value != user.username and not user.can_change_username():
            days_left = user.days_until_username_change()
            raise serializers.ValidationError(
                f"Օգտանունը կրկին կարող ես փոխել {days_left} օրից։"
            )
        return value

    def update(self, instance, validated_data):
        if "username" in validated_data and validated_data["username"] != instance.username:
            validated_data["username_changed_at"] = timezone.now()
        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    # Blank/omitted for an OAuth-only account that has no password yet to
    # verify — ChangePasswordView only enforces it when has_usable_password().
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={"min_length": "Գաղտնաբառը պետք է լինի առնվազն 8 նիշ։"},
    )
    confirm_new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
            raise serializers.ValidationError(
                "Գաղտնաբառը պետք է պարունակի առնվազն մեկ տառ և մեկ թիվ։"
            )
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError({"confirm_new_password": "Գաղտնաբառերը չեն համընկնում։"})
        return attrs


class UserSessionSerializer(serializers.Serializer):
    """Read-only device/session info for the account-management UI. Never
    includes the session_id UUID embedded in JWTs, or any token — `id` (the
    row's own primary key) is the public identifier used to target a revoke."""

    id = serializers.IntegerField()
    platform = serializers.CharField()
    browser = serializers.CharField()
    created_at = serializers.DateTimeField()
    last_activity_at = serializers.DateTimeField()
    is_current = serializers.SerializerMethodField()

    def get_is_current(self, obj):
        current_session_id = self.context.get("current_session_id")
        return current_session_id is not None and str(obj.session_id) == str(current_session_id)
