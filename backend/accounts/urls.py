from django.urls import path

from .views import (
    GoogleAuthView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetCompleteView,
    PasswordResetRequestView,
    PasswordResetResendView,
    PasswordResetVerifyView,
    RegisterView,
    RegistrationResendView,
    RegistrationVerifyView,
    VersionedTokenRefreshView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('registration/verify/', RegistrationVerifyView.as_view(), name='registration-verify'),
    path('registration/resend/', RegistrationResendView.as_view(), name='registration-resend'),
    path('login/', LoginView.as_view(), name='login'),
    path('google/', GoogleAuthView.as_view(), name='google-auth'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/verify/', PasswordResetVerifyView.as_view(), name='password-reset-verify'),
    path('password-reset/resend/', PasswordResetResendView.as_view(), name='password-reset-resend'),
    path('password-reset/complete/', PasswordResetCompleteView.as_view(), name='password-reset-complete'),
    path('token/refresh/', VersionedTokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
]
