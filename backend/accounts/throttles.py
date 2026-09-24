import hashlib

from rest_framework.throttling import SimpleRateThrottle


class AuthFlowThrottle(SimpleRateThrottle):
    """Rate-limit an opaque identifier independently for each auth endpoint."""

    def get_cache_key(self, request, view):
        identifier = str(
            request.data.get('email')
            or request.data.get('challenge')
            or request.data.get('grant')
            or ''
        ).strip().casefold()
        digest = hashlib.sha256(identifier.encode('utf-8')).hexdigest()[:24]
        return self.cache_format % {'scope': self.scope, 'ident': digest}


class AuthIPThrottle(SimpleRateThrottle):
    """Apply a second limit across authentication flows for one client IP."""

    scope = 'auth_ip'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class RegistrationThrottle(AuthFlowThrottle):
    scope = 'auth_registration'


class LoginThrottle(AuthFlowThrottle):
    scope = 'auth_login'


class OTPVerifyThrottle(AuthFlowThrottle):
    scope = 'auth_otp_verify'


class OTPResendThrottle(AuthFlowThrottle):
    scope = 'auth_otp_resend'


class PasswordResetRequestThrottle(AuthFlowThrottle):
    scope = 'auth_password_reset_request'


class PasswordResetCompleteThrottle(AuthFlowThrottle):
    scope = 'auth_password_reset_complete'


class GoogleAuthThrottle(AuthFlowThrottle):
    scope = 'auth_google'
