from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh['auth_version'] = user.auth_version
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


class VersionedJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if int(validated_token.get('auth_version', 0)) != user.auth_version:
            raise AuthenticationFailed('This session is no longer valid.', code='session_revoked')
        return user


class VersionedTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = RefreshToken(attrs['refresh'])
        user_id = refresh.get(api_settings.USER_ID_CLAIM)
        try:
            user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except User.DoesNotExist as error:
            raise AuthenticationFailed('This session is no longer valid.', code='session_revoked') from error
        if not user.is_active or int(refresh.get('auth_version', 0)) != user.auth_version:
            raise AuthenticationFailed('This session is no longer valid.', code='session_revoked')
        return super().validate(attrs)
