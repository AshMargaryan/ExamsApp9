from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import School, University

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
    username = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="Այս օգտանունն արդեն զբաղված է։",
            )
        ]
    )
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="Այս էլ. հասցեով հաշիվ արդեն գոյություն ունի։",
            )
        ]
    )
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

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "password", "confirm_password",
            "first_name", "last_name",
            "age", "grade", "sex", "school", "university",
        ]
        extra_kwargs = {
            "age": {"required": False},
            "grade": {"required": False},
            "sex": {"required": False},
            "school": {"required": False},
            "university": {"required": False},
        }

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
            "id", "username", "email", "date_joined", "is_email_verified",
            "first_name", "last_name", "age", "grade", "sex",
            "school", "university", "school_id", "university_id",
        ]
        read_only_fields = ["id", "date_joined", "is_email_verified"]

    def validate_grade(self, value):
        if value is not None and not (1 <= value <= 12):
            raise serializers.ValidationError("Դասարանը պետք է լինի 1-ից 12 միջակայքում։")
        return value
