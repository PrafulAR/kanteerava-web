import secrets

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView
from api.utils import get_object_or_none

from .authentication import VersionedTokenRefreshSerializer, tokens_for_user
from .models import EmailOTPChallenge, User
from .serializers import (
    AdminUserSerializer,
    GoogleCredentialSerializer,
    LoginSerializer,
    OTPCodeSerializer,
    OTPResendSerializer,
    PasswordResetCompleteSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .services import (
    AuthFlowError,
    authenticate_google,
    begin_password_reset,
    begin_registration,
    complete_password_reset,
    mask_email,
    resend_otp,
    verify_password_reset,
    verify_registration,
)
from .throttles import (
    GoogleAuthThrottle,
    AuthIPThrottle,
    LoginThrottle,
    OTPResendThrottle,
    OTPVerifyThrottle,
    PasswordResetCompleteThrottle,
    PasswordResetRequestThrottle,
    RegistrationThrottle,
)


def is_admin(user):
    return user.is_superuser or user.role == 'ADMIN'


def auth_flow_error_response(error):
    response = Response(
        {'success': False, 'message': str(error), 'errors': {}},
        status=error.status_code,
    )
    if error.retry_after:
        response['Retry-After'] = str(error.retry_after)
    return response


class VersionedTokenRefreshView(TokenRefreshView):
    serializer_class = VersionedTokenRefreshSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle, RegistrationThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            challenge = begin_registration(
                full_name=data['full_name'],
                email=data['email'],
                password=data['password'],
            )
        except AuthFlowError as error:
            return auth_flow_error_response(error)
        return Response({
            'success': True,
            'message': 'We sent a verification code to your email address.',
            'data': {
                'challenge': challenge.public_id,
                'masked_email': mask_email(challenge.email),
                'cooldown_seconds': max(0, int((challenge.resend_available_at - challenge.updated_at).total_seconds())),
            },
        }, status=status.HTTP_202_ACCEPTED)


class RegistrationVerifyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle, OTPVerifyThrottle]

    def post(self, request):
        serializer = OTPCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = verify_registration(
                public_id=serializer.validated_data['challenge'],
                code=serializer.validated_data['code'],
            )
        except AuthFlowError as error:
            return auth_flow_error_response(error)
        return Response({
            'success': True,
            'message': 'Your email is verified. You can now sign in.',
            'data': UserSerializer(user).data,
        })


class RegistrationResendView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle, OTPResendThrottle]

    def post(self, request):
        serializer = OTPResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            challenge = resend_otp(
                public_id=serializer.validated_data['challenge'],
                purpose=EmailOTPChallenge.Purpose.REGISTRATION,
            )
        except AuthFlowError as error:
            return auth_flow_error_response(error)
        return Response({
            'success': True,
            'message': 'A new verification code has been sent.',
            'data': {
                'challenge': challenge.public_id,
                'masked_email': mask_email(challenge.email),
                'cooldown_seconds': max(0, int((challenge.resend_available_at - challenge.updated_at).total_seconds())),
            },
        })


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle, LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tokens = tokens_for_user(user)
        return Response({'success': True, 'message': 'Login successful.', 'data': {'user': UserSerializer(user).data, **tokens}})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle, PasswordResetRequestThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        challenge = begin_password_reset(email=email)
        # A random opaque reference keeps the response shape identical when the
        # address does not belong to an account or email delivery is unavailable.
        challenge_id = challenge.public_id if challenge else secrets.token_urlsafe(24)
        return Response({
            'success': True,
            'message': 'If an account exists for that email, a verification code has been sent.',
            'data': {
                'challenge': challenge_id,
                'masked_email': mask_email(email),
                'cooldown_seconds': settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS,
            },
        }, status=status.HTTP_202_ACCEPTED)


class PasswordResetVerifyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle, OTPVerifyThrottle]

    def post(self, request):
        serializer = OTPCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            grant, reset_token = verify_password_reset(
                public_id=serializer.validated_data['challenge'],
                code=serializer.validated_data['code'],
            )
        except AuthFlowError as error:
            return auth_flow_error_response(error)
        return Response({
            'success': True,
            'message': 'Code verified. Choose a new password.',
            'data': {'grant': grant.public_id, 'reset_token': reset_token},
        })


class PasswordResetResendView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle, OTPResendThrottle]

    def post(self, request):
        serializer = OTPResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            challenge = resend_otp(
                public_id=serializer.validated_data['challenge'],
                purpose=EmailOTPChallenge.Purpose.PASSWORD_RESET,
            )
        except AuthFlowError as error:
            return auth_flow_error_response(error)
        return Response({
            'success': True,
            'message': 'A new verification code has been sent.',
            'data': {
                'challenge': challenge.public_id,
                'masked_email': mask_email(challenge.email),
                'cooldown_seconds': max(0, int((challenge.resend_available_at - challenge.updated_at).total_seconds())),
            },
        })


class PasswordResetCompleteView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle, PasswordResetCompleteThrottle]

    def post(self, request):
        serializer = PasswordResetCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            complete_password_reset(
                public_id=data['grant'],
                reset_token=data['reset_token'],
                new_password=data['new_password'],
            )
        except DjangoValidationError as error:
            return Response(
                {'success': False, 'message': 'Choose a stronger password.', 'errors': {'new_password': list(error.messages)}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except AuthFlowError as error:
            return auth_flow_error_response(error)
        return Response({'success': True, 'message': 'Your password has been reset. You can now sign in.', 'data': {}})


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle, GoogleAuthThrottle]

    def post(self, request):
        serializer = GoogleCredentialSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = authenticate_google(credential=serializer.validated_data['credential'])
        except AuthFlowError as error:
            return auth_flow_error_response(error)
        tokens = tokens_for_user(user)
        return Response({
            'success': True,
            'message': 'Google sign-in successful.',
            'data': {'user': UserSerializer(user).data, **tokens},
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_version += 1
        request.user.save(update_fields=['auth_version', 'updated_at'])
        return Response({'success': True, 'message': 'Logout successful.', 'data': {}})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'success': True, 'message': 'Current user loaded.', 'data': UserSerializer(request.user).data})


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        return Response({'success': True, 'message': 'Users loaded.', 'data': AdminUserSerializer(User.objects.all(), many=True).data})

    def post(self, request):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        serializer = AdminUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({'success': True, 'message': 'User created.', 'data': AdminUserSerializer(user).data}, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, user_id):
        return get_object_or_none(User, pk=user_id)

    def dispatch_admin(self, request):
        return is_admin(request.user)

    def get(self, request, user_id):
        if not self.dispatch_admin(request):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object(user_id)
        if user is None:
            return Response({'success': False, 'message': 'User not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'message': 'User loaded.', 'data': AdminUserSerializer(user).data})

    def patch(self, request, user_id):
        if not self.dispatch_admin(request):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object(user_id)
        if user is None:
            return Response({'success': False, 'message': 'User not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminUserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': 'User updated.', 'data': AdminUserSerializer(serializer.save()).data})

    def delete(self, request, user_id):
        if not self.dispatch_admin(request):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object(user_id)
        if user is None:
            return Response({'success': False, 'message': 'User not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        if user.pk == request.user.pk:
            return Response({'success': False, 'message': 'You cannot delete your own account.', 'errors': {}}, status=status.HTTP_409_CONFLICT)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
