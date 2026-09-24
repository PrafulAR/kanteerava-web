from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User
from .services import normalize_email


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone', 'role', 'is_admin', 'email_verified', 'created_at']
        read_only_fields = ['id', 'role', 'is_admin', 'created_at']

    def get_is_admin(self, obj):
        return obj.is_superuser or obj.role == User.Role.ADMIN


class AdminUserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone', 'role', 'is_active', 'password', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_password(self, value):
        try:
            validate_password(value, user=self.instance)
        except DjangoValidationError as error:
            raise serializers.ValidationError(list(error.messages)) from error
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['full_name', 'email', 'password', 'confirm_password', 'phone']
        extra_kwargs = {'email': {'validators': []}}

    def validate(self, attrs):
        attrs['email'] = normalize_email(attrs['email'])
        attrs['full_name'] = attrs['full_name'].strip()
        if not attrs['full_name']:
            raise serializers.ValidationError({'full_name': 'Enter your full name.'})
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        candidate = User(email=normalize_email(attrs['email']), full_name=attrs['full_name'])
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': list(error.messages)}) from error
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = normalize_email(attrs['email'])
        existing = User.objects.filter(email__iexact=email).first()
        user = authenticate(email=existing.email if existing else email, password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        attrs['user'] = user
        return attrs


class OTPCodeSerializer(serializers.Serializer):
    challenge = serializers.CharField(min_length=20, max_length=100)
    code = serializers.RegexField(r'^\d{6}$', error_messages={'invalid': 'Enter the 6-digit verification code.'})


class OTPResendSerializer(serializers.Serializer):
    challenge = serializers.CharField(min_length=20, max_length=100)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetCompleteSerializer(serializers.Serializer):
    grant = serializers.CharField(min_length=20, max_length=100)
    reset_token = serializers.CharField(min_length=32, max_length=200, write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({'confirm_new_password': 'Passwords do not match.'})
        return attrs


class GoogleCredentialSerializer(serializers.Serializer):
    credential = serializers.CharField(min_length=100, max_length=10000, write_only=True)
