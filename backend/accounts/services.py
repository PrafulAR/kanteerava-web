import hashlib
import hmac
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError
from django.utils import timezone
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from .models import EmailOTPChallenge, GoogleIdentity, PasswordResetGrant, User
from .transactional_email import TransactionalEmailError, send_transactional_email


logger = logging.getLogger(__name__)


class AuthFlowError(Exception):
    def __init__(self, message, *, status_code=400, retry_after=None):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after


def normalize_email(email):
    return User.objects.normalize_email(str(email or '')).strip().casefold()


def mask_email(email):
    local, separator, domain = email.partition('@')
    if not separator:
        return 'your email address'
    visible = local[:1] if local else '*'
    return f'{visible}{"*" * max(4, len(local) - 1)}@{domain}'


def _secret_digest(value, *, public_id, purpose):
    payload = f'{public_id}:{purpose}:{value}'.encode('utf-8')
    return hmac.new(settings.SECRET_KEY.encode('utf-8'), payload, hashlib.sha256).hexdigest()


def _new_otp():
    return f'{secrets.randbelow(900000) + 100000:06d}'


def _send_otp_email(*, email, code, purpose):
    if purpose == EmailOTPChallenge.Purpose.REGISTRATION:
        subject = 'Verify your XV Kanteerava account'
        heading = 'Verify your email'
        context = 'This verification code completes your Kanteerava account registration.'
    else:
        subject = 'Reset your XV Kanteerava password'
        heading = 'Password reset verification'
        context = 'This verification code confirms a request to change your Kanteerava account password.'
    body = (
        f'XV KANTEERAVA\n\n{heading}\n\n{context}\n\n'
        f'Your verification code is:\n\n{code}\n\n'
        f'This code expires in {settings.AUTH_OTP_EXPIRY_MINUTES} minutes.\n\n'
        'If you did not request this, you can ignore this email.\n\n'
        'Scouting...Our Lifeline.'
    )
    send_transactional_email(recipient_email=email, subject=subject, text_body=body)


def _issue_challenge(*, user, email, purpose, deliver=True):
    now = timezone.now()
    EmailOTPChallenge.objects.filter(
        email=email, purpose=purpose, consumed_at__isnull=True,
    ).update(consumed_at=now, updated_at=now)
    public_id = secrets.token_urlsafe(24)
    code = _new_otp()
    challenge = EmailOTPChallenge.objects.create(
        public_id=public_id,
        user=user,
        email=email,
        purpose=purpose,
        code_digest=_secret_digest(code, public_id=public_id, purpose=purpose),
        expires_at=now + timedelta(minutes=settings.AUTH_OTP_EXPIRY_MINUTES),
        resend_available_at=now + timedelta(seconds=settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS),
        max_attempts=settings.AUTH_OTP_MAX_ATTEMPTS,
    )
    if deliver:
        try:
            _send_otp_email(email=email, code=code, purpose=purpose)
        except TransactionalEmailError:
            challenge.delete()
            logger.warning('OTP delivery failed purpose=%s category=provider', purpose)
            raise AuthFlowError('The verification email could not be sent. Please try again later.', status_code=503)
        except Exception as error:
            challenge.delete()
            logger.error('OTP delivery failed purpose=%s category=unexpected type=%s', purpose, type(error).__name__)
            raise AuthFlowError('The verification email could not be sent. Please try again later.', status_code=503)
    logger.info('OTP challenge issued purpose=%s', purpose)
    return challenge


def begin_registration(*, full_name, email, password):
    normalized_email = normalize_email(email)
    existing = User.objects.filter(email__iexact=normalized_email).first()
    created = False
    if existing and (existing.is_active or existing.email_verified):
        raise AuthFlowError('An account already exists for this email. Please sign in or reset your password.', status_code=409)
    if existing:
        active_challenge = EmailOTPChallenge.objects.filter(
            user=existing,
            purpose=EmailOTPChallenge.Purpose.REGISTRATION,
            consumed_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).first()
        if active_challenge:
            return active_challenge
        existing.full_name = full_name
        existing.set_password(password)
        existing.save(update_fields=['full_name', 'password', 'updated_at'])
        user = existing
    else:
        try:
            user = User.objects.create_user(
                email=normalized_email,
                password=password,
                full_name=full_name,
                is_active=False,
                email_verified=False,
            )
        except IntegrityError as error:
            # The database uniqueness constraint is the final guard when two
            # registrations for the same normalized email race each other.
            raise AuthFlowError(
                'An account already exists for this email. Please sign in or reset your password.',
                status_code=409,
            ) from error
        created = True
    try:
        return _issue_challenge(
            user=user,
            email=normalized_email,
            purpose=EmailOTPChallenge.Purpose.REGISTRATION,
        )
    except Exception:
        if created:
            user.delete()
        raise


def resend_otp(*, public_id, purpose):
    try:
        challenge = EmailOTPChallenge.objects.get(public_id=public_id, purpose=purpose)
    except EmailOTPChallenge.DoesNotExist as error:
        raise AuthFlowError('Invalid or expired verification request.') from error
    now = timezone.now()
    if challenge.consumed_at:
        raise AuthFlowError('Invalid or expired verification request.')
    if challenge.send_count >= settings.AUTH_OTP_MAX_SENDS:
        raise AuthFlowError('The resend limit has been reached. Please start again later.', status_code=429)
    if challenge.resend_available_at > now:
        retry_after = max(1, int((challenge.resend_available_at - now).total_seconds()))
        raise AuthFlowError(f'Resend code in {retry_after}s.', status_code=429, retry_after=retry_after)

    code = _new_otp()
    previous = {
        'code_digest': challenge.code_digest,
        'expires_at': challenge.expires_at,
        'resend_available_at': challenge.resend_available_at,
        'attempts': challenge.attempts,
        'send_count': challenge.send_count,
    }
    new_digest = _secret_digest(code, public_id=challenge.public_id, purpose=challenge.purpose)
    changed = EmailOTPChallenge.objects.filter(
        pk=challenge.pk,
        consumed_at__isnull=True,
        send_count=challenge.send_count,
    ).update(
        code_digest=new_digest,
        expires_at=now + timedelta(minutes=settings.AUTH_OTP_EXPIRY_MINUTES),
        resend_available_at=now + timedelta(seconds=settings.AUTH_OTP_RESEND_COOLDOWN_SECONDS),
        attempts=0,
        send_count=challenge.send_count + 1,
        updated_at=now,
    )
    if changed != 1:
        raise AuthFlowError('The verification request changed. Please try again.')
    if challenge.user is not None:
        try:
            _send_otp_email(email=challenge.email, code=code, purpose=challenge.purpose)
        except TransactionalEmailError:
            EmailOTPChallenge.objects.filter(pk=challenge.pk, code_digest=new_digest).update(**previous, updated_at=timezone.now())
            logger.warning('OTP resend delivery failed purpose=%s category=provider', purpose)
            raise AuthFlowError('The verification email could not be sent. Please try again later.', status_code=503)
        except Exception as error:
            EmailOTPChallenge.objects.filter(pk=challenge.pk, code_digest=new_digest).update(**previous, updated_at=timezone.now())
            logger.error('OTP resend delivery failed purpose=%s category=unexpected type=%s', purpose, type(error).__name__)
            raise AuthFlowError('The verification email could not be sent. Please try again later.', status_code=503)
    challenge.refresh_from_db()
    logger.info('OTP challenge resent purpose=%s', purpose)
    return challenge


def _verify_otp(*, public_id, code, purpose):
    try:
        challenge = EmailOTPChallenge.objects.get(public_id=public_id, purpose=purpose)
    except EmailOTPChallenge.DoesNotExist as error:
        raise AuthFlowError('Invalid or expired verification code.') from error
    now = timezone.now()
    if challenge.consumed_at:
        raise AuthFlowError('Invalid or expired verification code.')
    if challenge.expires_at <= now:
        raise AuthFlowError('This verification code has expired. Request a new code.')
    if challenge.attempts >= challenge.max_attempts:
        raise AuthFlowError('Too many verification attempts. Request a new code.', status_code=429)
    candidate = _secret_digest(str(code), public_id=challenge.public_id, purpose=challenge.purpose)
    if not hmac.compare_digest(candidate, challenge.code_digest):
        changed = EmailOTPChallenge.objects.filter(
            pk=challenge.pk,
            consumed_at__isnull=True,
            attempts=challenge.attempts,
        ).update(attempts=challenge.attempts + 1, updated_at=now)
        if changed != 1:
            raise AuthFlowError('Invalid or expired verification code.')
        raise AuthFlowError('Invalid or expired verification code.')
    return challenge


def verify_registration(*, public_id, code):
    challenge = _verify_otp(
        public_id=public_id,
        code=code,
        purpose=EmailOTPChallenge.Purpose.REGISTRATION,
    )
    if not challenge.user:
        raise AuthFlowError('Invalid or expired verification code.')
    now = timezone.now()
    changed = EmailOTPChallenge.objects.filter(
        pk=challenge.pk,
        consumed_at__isnull=True,
        attempts=challenge.attempts,
    ).update(consumed_at=now, updated_at=now)
    if changed != 1:
        raise AuthFlowError('Invalid or expired verification code.')
    user = challenge.user
    try:
        user.email_verified = True
        user.is_active = True
        user.save(update_fields=['email_verified', 'is_active', 'updated_at'])
    except Exception:
        EmailOTPChallenge.objects.filter(pk=challenge.pk, consumed_at=now).update(consumed_at=None, updated_at=timezone.now())
        raise
    logger.info('Registration email verification completed')
    return user


def begin_password_reset(*, email):
    normalized_email = normalize_email(email)
    user = User.objects.filter(email__iexact=normalized_email, is_active=True).first()
    try:
        return _issue_challenge(
            user=user,
            email=normalized_email,
            purpose=EmailOTPChallenge.Purpose.PASSWORD_RESET,
            deliver=user is not None,
        )
    except AuthFlowError:
        # Preserve a neutral response and never expose mailbox/account state.
        logger.warning('Password reset delivery was unavailable')
        return None


def verify_password_reset(*, public_id, code):
    challenge = _verify_otp(
        public_id=public_id,
        code=code,
        purpose=EmailOTPChallenge.Purpose.PASSWORD_RESET,
    )
    if not challenge.user:
        raise AuthFlowError('Invalid or expired verification code.')
    now = timezone.now()
    changed = EmailOTPChallenge.objects.filter(
        pk=challenge.pk,
        consumed_at__isnull=True,
        attempts=challenge.attempts,
    ).update(consumed_at=now, updated_at=now)
    if changed != 1:
        raise AuthFlowError('Invalid or expired verification code.')
    reset_token = secrets.token_urlsafe(32)
    grant_public_id = secrets.token_urlsafe(24)
    try:
        grant = PasswordResetGrant.objects.create(
            public_id=grant_public_id,
            user=challenge.user,
            token_digest=_secret_digest(reset_token, public_id=grant_public_id, purpose='PASSWORD_RESET_GRANT'),
            expires_at=now + timedelta(minutes=settings.AUTH_PASSWORD_RESET_GRANT_MINUTES),
        )
    except Exception:
        EmailOTPChallenge.objects.filter(pk=challenge.pk, consumed_at=now).update(consumed_at=None, updated_at=timezone.now())
        raise
    logger.info('Password reset OTP verification completed')
    return grant, reset_token


def complete_password_reset(*, public_id, reset_token, new_password):
    try:
        grant = PasswordResetGrant.objects.get(public_id=public_id)
    except PasswordResetGrant.DoesNotExist as error:
        raise AuthFlowError('Invalid or expired password reset request.') from error
    now = timezone.now()
    if grant.consumed_at or grant.expires_at <= now:
        raise AuthFlowError('Invalid or expired password reset request.')
    expected = _secret_digest(reset_token, public_id=grant.public_id, purpose='PASSWORD_RESET_GRANT')
    if not hmac.compare_digest(expected, grant.token_digest):
        raise AuthFlowError('Invalid or expired password reset request.')
    validate_password(new_password, user=grant.user)
    changed = PasswordResetGrant.objects.filter(pk=grant.pk, consumed_at__isnull=True).update(consumed_at=now)
    if changed != 1:
        raise AuthFlowError('Invalid or expired password reset request.')
    user = grant.user
    try:
        user.set_password(new_password)
        user.auth_version += 1
        user.save(update_fields=['password', 'auth_version', 'updated_at'])
    except Exception:
        PasswordResetGrant.objects.filter(pk=grant.pk, consumed_at=now).update(consumed_at=None)
        raise
    EmailOTPChallenge.objects.filter(
        user=user,
        purpose=EmailOTPChallenge.Purpose.PASSWORD_RESET,
        consumed_at__isnull=True,
    ).update(consumed_at=now, updated_at=now)
    PasswordResetGrant.objects.filter(user=user, consumed_at__isnull=True).update(consumed_at=now)
    logger.info('Password reset completed')
    return user


def _google_verification_failure_category(error):
    """Reduce Google verifier failures to safe operational categories."""
    message = str(error).casefold()
    if 'audience' in message or 'recipient' in message:
        return 'audience'
    if 'issuer' in message:
        return 'issuer'
    if 'expired' in message:
        return 'expired'
    if 'too early' in message or 'issued at' in message:
        return 'timing'
    if 'signature' in message or 'certificate' in message:
        return 'signature'
    if 'connection' in message or 'timeout' in message or 'transport' in message:
        return 'transport'
    return 'invalid_token'


def authenticate_google(*, credential):
    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    if not client_id:
        raise AuthFlowError('Google sign-in is not configured.', status_code=503)
    try:
        claims = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
            clock_skew_in_seconds=60,
        )
    except Exception as error:
        logger.warning(
            'Google credential verification failed category=%s type=%s',
            _google_verification_failure_category(error),
            type(error).__name__,
        )
        raise AuthFlowError('Google sign-in could not be verified.') from error
    if claims.get('iss') not in {'accounts.google.com', 'https://accounts.google.com'}:
        raise AuthFlowError('Google sign-in could not be verified.')
    if not claims.get('email_verified') or not claims.get('sub') or not claims.get('email'):
        raise AuthFlowError('Google sign-in requires a verified email address.')

    subject = str(claims['sub'])
    identity = GoogleIdentity.objects.filter(subject=subject).first()
    if identity:
        linked_user = User.objects.filter(pk=identity.user_id).first()
        if linked_user is None:
            # MongoDB does not enforce relational cascades, so an Admin account
            # deletion can leave an identity link whose user no longer exists.
            identity.delete()
        elif not linked_user.is_active:
            raise AuthFlowError('This account is not available.', status_code=403)
        else:
            return linked_user

    email = normalize_email(claims['email'])
    user = User.objects.filter(email__iexact=email).first()
    if user:
        existing_identity = GoogleIdentity.objects.filter(user=user).first()
        if existing_identity and existing_identity.subject != subject:
            raise AuthFlowError('This account is already linked to another Google identity.', status_code=409)
        if not user.is_active and not user.email_verified:
            user.is_active = True
            user.email_verified = True
            user.save(update_fields=['is_active', 'email_verified', 'updated_at'])
        elif not user.is_active:
            raise AuthFlowError('This account is not available.', status_code=403)
    else:
        try:
            user = User.objects.create_user(
                email=email,
                password=None,
                full_name=str(claims.get('name') or email.split('@', 1)[0])[:150],
                email_verified=True,
                is_active=True,
            )
        except IntegrityError:
            user = User.objects.get(email__iexact=email)
    try:
        GoogleIdentity.objects.create(subject=subject, user=user)
    except IntegrityError:
        identity = GoogleIdentity.objects.filter(subject=subject).first()
        if not identity or str(identity.user_id) != str(user.pk):
            raise AuthFlowError('Google sign-in could not be linked safely.', status_code=409)
    logger.info('Google authentication completed')
    return user
