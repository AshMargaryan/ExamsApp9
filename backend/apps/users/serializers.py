from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AccountRole, School, University
from .utils import suggest_usernames

User = get_user_model()


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


class UserSerializer(serializers.ModelSerializer):
    school = SchoolSerializer(read_only=True)
    university = UniversitySerializer(read_only=True)
    school_id = serializers.PrimaryKeyRelatedField(
        source="school", queryset=School.objects.all(), write_only=True, required=False, allow_null=True
    )
    university_id = serializers.PrimaryKeyRelatedField(
        source="university", queryset=University.objects.all(), write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "date_joined", "is_email_verified", "role",
            "first_name", "last_name", "age", "grade", "sex",
            "school", "university", "school_id", "university_id",
        ]
        read_only_fields = ["id", "date_joined", "is_email_verified", "role"]

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Այս էլ. հասցեով հաշիվ արդեն գոյություն ունի։")
        return value

    def validate_grade(self, value):
        if value is not None and not (1 <= value <= 12):
            raise serializers.ValidationError("Դասարանը պետք է լինի 1-ից 12 միջակայքում։")
        return value
