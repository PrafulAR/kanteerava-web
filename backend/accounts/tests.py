import re
from datetime import timedelta
from unittest.mock import Mock, patch

import requests
from bson import ObjectId
from django.core.cache import cache
from django.conf import settings
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from .authentication import tokens_for_user
from .models import EmailOTPChallenge, GoogleIdentity, PasswordResetGrant, User
from .throttles import AuthIPThrottle, RegistrationThrottle
from .transactional_email import TransactionalEmailError, send_transactional_email


@override_settings(
    BREVO_API_KEY='test-placeholder-key',
    BREVO_FROM_EMAIL='verified-sender@example.com',
    BREVO_FROM_NAME='XV Kanteerava',
    BREVO_API_TIMEOUT_SECONDS=10,
    AUTH_OTP_EXPIRY_MINUTES=10,
    AUTH_OTP_RESEND_COOLDOWN_SECONDS=45,
    AUTH_OTP_MAX_ATTEMPTS=5,
    AUTH_OTP_MAX_SENDS=5,
    AUTH_PASSWORD_RESET_GRANT_MINUTES=10,
    GOOGLE_OAUTH_CLIENT_ID='test-client.apps.googleusercontent.com',
)
class AuthenticationFlowTests(TestCase):
    password = 'Strong-Password-482!'

    def setUp(self):
        self.client = APIClient()
        self.sent_emails = []

        def capture_email(**message):
            self.sent_emails.append(message)
            return 'test-message-id'

        self.email_sender = patch(
            'accounts.services.send_transactional_email',
            side_effect=capture_email,
        ).start()
        self.addCleanup(patch.stopall)

    def otp_from_latest_email(self):
        match = re.search(r'\b(\d{6})\b', self.sent_emails[-1]['text_body'])
        if not match:
            raise AssertionError('OTP was not present in the test email.')
        return match.group(1)

    def register(self, email='new.member@example.com'):
        return self.client.post('/api/auth/register/', {
            'full_name': 'New Member',
            'email': email,
            'password': self.password,
            'confirm_password': self.password,
            'phone': '',
        }, format='json')

    def test_confirm_password_is_enforced_before_account_creation(self):
        response = self.client.post('/api/auth/register/', {
            'full_name': 'New Member',
            'email': 'mismatch@example.com',
            'password': self.password,
            'confirm_password': 'Different-Password-739!',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='mismatch@example.com').exists())

    def test_registration_is_inactive_until_single_use_otp_is_verified(self):
        response = self.register()
        self.assertEqual(response.status_code, 202, response.data)
        user = User.objects.get(email='new.member@example.com')
        self.assertFalse(user.is_active)
        self.assertFalse(user.email_verified)
        self.assertNotEqual(user.password, self.password)

        challenge = EmailOTPChallenge.objects.get(public_id=response.data['data']['challenge'])
        code = self.otp_from_latest_email()
        self.assertNotEqual(challenge.code_digest, code)
        self.assertNotIn(code, challenge.code_digest)
        self.assertNotIn(code, str(response.data))
        self.assertNotIn(settings.BREVO_API_KEY, str(response.data))

        login_response = self.client.post('/api/auth/login/', {'email': user.email, 'password': self.password}, format='json')
        self.assertEqual(login_response.status_code, 400)

        verification = self.client.post('/api/auth/registration/verify/', {
            'challenge': challenge.public_id,
            'code': code,
        }, format='json')
        self.assertEqual(verification.status_code, 200, verification.data)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.email_verified)

        replay = self.client.post('/api/auth/registration/verify/', {
            'challenge': challenge.public_id,
            'code': code,
        }, format='json')
        self.assertEqual(replay.status_code, 400)

    def test_otp_is_purpose_bound_and_expiry_is_enforced(self):
        response = self.register('purpose@example.com')
        challenge_id = response.data['data']['challenge']
        code = self.otp_from_latest_email()
        wrong_purpose = self.client.post('/api/auth/password-reset/verify/', {
            'challenge': challenge_id,
            'code': code,
        }, format='json')
        self.assertEqual(wrong_purpose.status_code, 400)

        EmailOTPChallenge.objects.filter(public_id=challenge_id).update(expires_at=timezone.now() - timedelta(seconds=1))
        expired = self.client.post('/api/auth/registration/verify/', {
            'challenge': challenge_id,
            'code': code,
        }, format='json')
        self.assertEqual(expired.status_code, 400)
        self.assertIn('expired', expired.data['message'].lower())

    def test_wrong_otp_attempts_are_limited(self):
        response = self.register('attempts@example.com')
        challenge_id = response.data['data']['challenge']
        for _ in range(5):
            attempt = self.client.post('/api/auth/registration/verify/', {
                'challenge': challenge_id,
                'code': '000000',
            }, format='json')
            self.assertEqual(attempt.status_code, 400)
        blocked = self.client.post('/api/auth/registration/verify/', {
            'challenge': challenge_id,
            'code': self.otp_from_latest_email(),
        }, format='json')
        self.assertEqual(blocked.status_code, 429)

    def test_resend_enforces_cooldown_and_replaces_the_old_code(self):
        response = self.register('resend@example.com')
        challenge_id = response.data['data']['challenge']
        old_code = self.otp_from_latest_email()
        cooldown = self.client.post('/api/auth/registration/resend/', {'challenge': challenge_id}, format='json')
        self.assertEqual(cooldown.status_code, 429)
        self.assertIn('Retry-After', cooldown)

        EmailOTPChallenge.objects.filter(public_id=challenge_id).update(resend_available_at=timezone.now() - timedelta(seconds=1))
        resent = self.client.post('/api/auth/registration/resend/', {'challenge': challenge_id}, format='json')
        self.assertEqual(resent.status_code, 200, resent.data)
        new_code = self.otp_from_latest_email()
        self.assertNotEqual(old_code, new_code)
        old_verification = self.client.post('/api/auth/registration/verify/', {'challenge': challenge_id, 'code': old_code}, format='json')
        self.assertEqual(old_verification.status_code, 400)
        new_verification = self.client.post('/api/auth/registration/verify/', {'challenge': challenge_id, 'code': new_code}, format='json')
        self.assertEqual(new_verification.status_code, 200, new_verification.data)

    def test_maximum_otp_send_limit_is_enforced(self):
        response = self.register('send-limit@example.com')
        challenge_id = response.data['data']['challenge']
        for _ in range(4):
            EmailOTPChallenge.objects.filter(public_id=challenge_id).update(
                resend_available_at=timezone.now() - timedelta(seconds=1),
            )
            resent = self.client.post('/api/auth/registration/resend/', {'challenge': challenge_id}, format='json')
            self.assertEqual(resent.status_code, 200, resent.data)
        EmailOTPChallenge.objects.filter(public_id=challenge_id).update(
            resend_available_at=timezone.now() - timedelta(seconds=1),
        )
        blocked = self.client.post('/api/auth/registration/resend/', {'challenge': challenge_id}, format='json')
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(len(self.sent_emails), 5)

    def test_registration_provider_failure_fails_closed(self):
        self.email_sender.side_effect = TransactionalEmailError('provider unavailable')
        response = self.register('delivery-failure@example.com')
        self.assertEqual(response.status_code, 503)
        self.assertFalse(User.objects.filter(email='delivery-failure@example.com').exists())
        self.assertFalse(EmailOTPChallenge.objects.filter(email='delivery-failure@example.com').exists())
        self.assertNotIn('provider unavailable', str(response.data))

    def test_password_reset_request_does_not_disclose_account_existence(self):
        User.objects.create_user(email='known@example.com', password=self.password, full_name='Known')
        known = self.client.post('/api/auth/password-reset/request/', {'email': 'known@example.com'}, format='json')
        unknown = self.client.post('/api/auth/password-reset/request/', {'email': 'unknown@example.com'}, format='json')
        self.assertEqual(known.status_code, 202)
        self.assertEqual(unknown.status_code, 202)
        self.assertEqual(known.data['message'], unknown.data['message'])
        self.assertIn('challenge', known.data['data'])
        self.assertIn('challenge', unknown.data['data'])

    def test_password_reset_provider_failure_is_neutral_and_cannot_authorize_reset(self):
        user = User.objects.create_user(email='reset-delivery@example.com', password=self.password, full_name='Reset Delivery')
        self.email_sender.side_effect = TransactionalEmailError('provider authentication failed')
        response = self.client.post('/api/auth/password-reset/request/', {'email': user.email}, format='json')
        self.assertEqual(response.status_code, 202)
        self.assertEqual(
            response.data['message'],
            'If an account exists for that email, a verification code has been sent.',
        )
        self.assertFalse(EmailOTPChallenge.objects.filter(user=user).exists())
        attempted = self.client.post('/api/auth/password-reset/verify/', {
            'challenge': response.data['data']['challenge'],
            'code': '123456',
        }, format='json')
        self.assertEqual(attempted.status_code, 400)
        self.assertFalse(PasswordResetGrant.objects.filter(user=user).exists())

    def test_password_reset_grant_is_single_use_and_revokes_existing_tokens(self):
        user = User.objects.create_user(email='reset@example.com', password=self.password, full_name='Reset Member')
        old_tokens = tokens_for_user(user)
        requested = self.client.post('/api/auth/password-reset/request/', {'email': user.email}, format='json')
        code = self.otp_from_latest_email()
        verified = self.client.post('/api/auth/password-reset/verify/', {
            'challenge': requested.data['data']['challenge'],
            'code': code,
        }, format='json')
        self.assertEqual(verified.status_code, 200, verified.data)
        payload = {
            **verified.data['data'],
            'new_password': 'A-New-Secure-Password-953!',
            'confirm_new_password': 'A-New-Secure-Password-953!',
        }
        completed = self.client.post('/api/auth/password-reset/complete/', payload, format='json')
        self.assertEqual(completed.status_code, 200, completed.data)
        user.refresh_from_db()
        self.assertTrue(user.check_password(payload['new_password']))
        self.assertFalse(user.check_password(self.password))
        self.assertEqual(user.auth_version, 1)

        replay = self.client.post('/api/auth/password-reset/complete/', payload, format='json')
        self.assertEqual(replay.status_code, 400)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {old_tokens['access']}")
        revoked = self.client.get('/api/auth/me/')
        self.assertEqual(revoked.status_code, 401)
        refresh_revoked = self.client.post('/api/auth/token/refresh/', {'refresh': old_tokens['refresh']}, format='json')
        self.assertEqual(refresh_revoked.status_code, 401)
        self.client.credentials()
        old_login = self.client.post('/api/auth/login/', {'email': user.email, 'password': self.password}, format='json')
        new_login = self.client.post('/api/auth/login/', {'email': user.email, 'password': payload['new_password']}, format='json')
        self.assertEqual(old_login.status_code, 400)
        self.assertEqual(new_login.status_code, 200)

    def test_logout_revokes_access_and_refresh_tokens(self):
        user = User.objects.create_user(
            email='logout@example.com', password=self.password, full_name='Logout Member',
        )
        tokens = tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        logged_out = self.client.post('/api/auth/logout/', {}, format='json')

        self.assertEqual(logged_out.status_code, 200, logged_out.data)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.client.credentials()
        refreshed = self.client.post('/api/auth/token/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(refreshed.status_code, 401)

    def test_reset_grant_does_not_store_the_plain_token(self):
        user = User.objects.create_user(email='digest@example.com', password=self.password, full_name='Digest')
        requested = self.client.post('/api/auth/password-reset/request/', {'email': user.email}, format='json')
        verified = self.client.post('/api/auth/password-reset/verify/', {
            'challenge': requested.data['data']['challenge'],
            'code': self.otp_from_latest_email(),
        }, format='json')
        grant = PasswordResetGrant.objects.get(public_id=verified.data['data']['grant'])
        self.assertNotEqual(grant.token_digest, verified.data['data']['reset_token'])
        self.assertNotIn(verified.data['data']['reset_token'], grant.token_digest)

    def test_password_reset_otp_and_grant_are_purpose_bound_expiring_and_single_use(self):
        user = User.objects.create_user(email='reset-security@example.com', password=self.password, full_name='Reset Security')
        requested = self.client.post('/api/auth/password-reset/request/', {'email': user.email}, format='json')
        code = self.otp_from_latest_email()
        wrong_purpose = self.client.post('/api/auth/registration/verify/', {
            'challenge': requested.data['data']['challenge'],
            'code': code,
        }, format='json')
        self.assertEqual(wrong_purpose.status_code, 400)
        verified = self.client.post('/api/auth/password-reset/verify/', {
            'challenge': requested.data['data']['challenge'],
            'code': code,
        }, format='json')
        self.assertEqual(verified.status_code, 200, verified.data)
        replay = self.client.post('/api/auth/password-reset/verify/', {
            'challenge': requested.data['data']['challenge'],
            'code': code,
        }, format='json')
        self.assertEqual(replay.status_code, 400)
        PasswordResetGrant.objects.filter(public_id=verified.data['data']['grant']).update(
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        expired = self.client.post('/api/auth/password-reset/complete/', {
            **verified.data['data'],
            'new_password': 'Another-Secure-Password-925!',
            'confirm_new_password': 'Another-Secure-Password-925!',
        }, format='json')
        self.assertEqual(expired.status_code, 400)

    def test_endpoint_and_ip_throttles_reject_repeated_requests(self):
        cache.clear()
        factory = APIRequestFactory()
        requests = [
            APIView().initialize_request(factory.post('/api/auth/register/', {'email': 'limited@example.com'}, format='json'))
            for _ in range(3)
        ]
        identifier_throttle = RegistrationThrottle()
        identifier_throttle.rate = '2/hour'
        identifier_throttle.num_requests, identifier_throttle.duration = identifier_throttle.parse_rate(identifier_throttle.rate)
        self.assertTrue(identifier_throttle.allow_request(requests[0], None))
        self.assertTrue(identifier_throttle.allow_request(requests[1], None))
        self.assertFalse(identifier_throttle.allow_request(requests[2], None))

        cache.clear()
        ip_throttle = AuthIPThrottle()
        ip_throttle.rate = '2/hour'
        ip_throttle.num_requests, ip_throttle.duration = ip_throttle.parse_rate(ip_throttle.rate)
        self.assertTrue(ip_throttle.allow_request(requests[0], None))
        self.assertTrue(ip_throttle.allow_request(requests[1], None))
        self.assertFalse(ip_throttle.allow_request(requests[2], None))

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_verified_google_identity_links_to_one_existing_account(self, verifier):
        user = User.objects.create_user(email='linked@example.com', password=self.password, full_name='Existing')
        verifier.return_value = {
            'iss': 'https://accounts.google.com',
            'sub': 'google-subject-123',
            'email': 'linked@example.com',
            'email_verified': True,
            'name': 'Ignored Google Name',
        }
        response = self.client.post('/api/auth/google/', {'credential': 'x' * 150}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(verifier.call_args.kwargs['clock_skew_in_seconds'], 60)
        self.assertEqual(response.data['data']['user']['id'], str(user.pk))
        self.assertEqual(User.objects.filter(email='linked@example.com').count(), 1)
        self.assertTrue(GoogleIdentity.objects.filter(subject='google-subject-123', user=user).exists())

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_account_creation_does_not_grant_admin_or_membership(self, verifier):
        verifier.return_value = {
            'iss': 'accounts.google.com',
            'sub': 'google-subject-new',
            'email': 'google.new@example.com',
            'email_verified': True,
            'name': 'Google Member',
        }
        response = self.client.post('/api/auth/google/', {'credential': 'y' * 150}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        user = User.objects.get(email='google.new@example.com')
        self.assertEqual(user.role, User.Role.USER)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.has_usable_password())

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_login_recovers_from_an_orphaned_identity_link(self, verifier):
        GoogleIdentity.objects.create(
            subject='returning-google-subject',
            user_id=ObjectId(),
        )
        self.assertTrue(GoogleIdentity.objects.filter(subject='returning-google-subject').exists())
        verifier.return_value = {
            'iss': 'https://accounts.google.com',
            'sub': 'returning-google-subject',
            'email': 'returning.google@example.com',
            'email_verified': True,
            'name': 'Returning Google User',
        }

        response = self.client.post('/api/auth/google/', {'credential': 'r' * 150}, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        replacement = User.objects.get(email='returning.google@example.com')
        self.assertTrue(replacement.is_active)
        self.assertTrue(GoogleIdentity.objects.filter(
            subject='returning-google-subject',
            user=replacement,
        ).exists())
        self.assertEqual(GoogleIdentity.objects.filter(subject='returning-google-subject').count(), 1)

    @patch('google.oauth2.id_token.verify_oauth2_token', side_effect=ValueError('invalid token'))
    def test_invalid_google_credential_is_rejected(self, _verifier):
        response = self.client.post('/api/auth/google/', {'credential': 'z' * 150}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='attacker@example.com').exists())


class AuthorizationBoundaryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='ordinary@example.com',
            password='Strong-Password-482!',
            full_name='Ordinary User',
        )
        self.client.force_authenticate(user=self.user)

    def test_ordinary_user_cannot_call_admin_mutations(self):
        requests = [
            ('post', '/api/users/'),
            ('get', '/api/memberships/admin-dashboard/'),
            ('post', '/api/events/'),
            ('post', '/api/gallery/albums/'),
            ('post', '/api/achievements/'),
            ('post', '/api/announcements/'),
            ('post', '/api/leaders/'),
            ('post', '/api/memberships/not-an-id/approve/'),
            ('post', '/api/memberships/not-an-id/reject/'),
            ('delete', '/api/memberships/not-an-id/'),
        ]
        for method, path in requests:
            with self.subTest(method=method, path=path):
                response = getattr(self.client, method)(path, {}, format='json')
                self.assertEqual(response.status_code, 403, response.data)

    def test_invalid_admin_resource_ids_return_not_found_without_tracebacks(self):
        self.user.role = User.Role.ADMIN
        self.user.save(update_fields=['role', 'updated_at'])
        for method, path in [
            ('get', '/api/users/not-an-id/'),
            ('get', '/api/memberships/directory/scout/not-an-id/'),
            ('patch', '/api/achievements/not-an-id/'),
            ('get', '/api/leaders/not-an-id/'),
        ]:
            with self.subTest(method=method, path=path):
                response = getattr(self.client, method)(path, {}, format='json')
                self.assertEqual(response.status_code, 404, response.data)


@override_settings(
    BREVO_API_KEY='test-placeholder-key',
    BREVO_FROM_EMAIL='verified-sender@example.com',
    BREVO_FROM_NAME='XV Kanteerava',
    BREVO_API_TIMEOUT_SECONDS=7,
)
class TransactionalEmailProviderTests(SimpleTestCase):
    @patch('accounts.transactional_email.requests.post')
    def test_brevo_https_request_contains_only_delivery_data(self, post):
        response = Mock(status_code=201)
        response.json.return_value = {'messageId': '<test-message-id>'}
        post.return_value = response

        result = send_transactional_email(
            recipient_email='recipient@example.com',
            subject='Verify your account',
            text_body='Transactional content',
        )

        self.assertEqual(result, '<test-message-id>')
        args, kwargs = post.call_args
        self.assertEqual(args[0], 'https://api.brevo.com/v3/smtp/email')
        self.assertEqual(kwargs['timeout'], 7)
        self.assertEqual(kwargs['headers']['api-key'], 'test-placeholder-key')
        self.assertEqual(kwargs['json'], {
            'sender': {'name': 'XV Kanteerava', 'email': 'verified-sender@example.com'},
            'to': [{'email': 'recipient@example.com'}],
            'subject': 'Verify your account',
            'textContent': 'Transactional content',
        })

    @override_settings(BREVO_API_KEY='')
    @patch('accounts.transactional_email.requests.post')
    def test_missing_api_key_fails_before_any_network_request(self, post):
        with self.assertRaises(TransactionalEmailError):
            send_transactional_email(
                recipient_email='recipient@example.com',
                subject='Verify your account',
                text_body='Transactional content',
            )
        post.assert_not_called()

    @patch('accounts.transactional_email.requests.post', side_effect=requests.Timeout('sensitive provider detail'))
    def test_provider_timeout_is_sanitized(self, _post):
        with self.assertRaisesRegex(TransactionalEmailError, 'timed out') as raised:
            send_transactional_email(
                recipient_email='recipient@example.com',
                subject='Verify your account',
                text_body='Transactional content',
            )
        self.assertNotIn('sensitive provider detail', str(raised.exception))

    @patch('accounts.transactional_email.requests.post')
    def test_provider_auth_rate_quota_and_service_failures_are_sanitized(self, post):
        for status_code in (401, 403, 402, 429, 500, 503):
            with self.subTest(status_code=status_code):
                response = Mock(status_code=status_code)
                response.text = 'raw provider response containing internal details'
                post.return_value = response
                with self.assertRaises(TransactionalEmailError) as raised:
                    send_transactional_email(
                        recipient_email='recipient@example.com',
                        subject='Verify your account',
                        text_body='Transactional content',
                    )
                self.assertNotIn('raw provider response', str(raised.exception))

    @patch('accounts.transactional_email.requests.post')
    def test_malformed_success_response_fails_closed(self, post):
        response = Mock(status_code=201)
        response.json.return_value = {'unexpected': True}
        post.return_value = response
        with self.assertRaises(TransactionalEmailError):
            send_transactional_email(
                recipient_email='recipient@example.com',
                subject='Verify your account',
                text_body='Transactional content',
            )
