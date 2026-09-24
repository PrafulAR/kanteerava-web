import logging

import requests
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email


logger = logging.getLogger(__name__)

BREVO_TRANSACTIONAL_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email'


class TransactionalEmailError(Exception):
    """Sanitized provider failure safe to handle in authentication code."""


def _valid_email(value):
    try:
        validate_email(value)
    except ValidationError as error:
        raise TransactionalEmailError('Transactional email configuration is invalid.') from error
    return value


def send_transactional_email(*, recipient_email, subject, text_body):
    """Deliver a minimal transactional message through Brevo's HTTPS API.

    This boundary deliberately knows nothing about OTP persistence or account
    state. Callers remain responsible for all authentication decisions.
    """
    api_key = str(settings.BREVO_API_KEY or '').strip()
    sender_email = str(settings.BREVO_FROM_EMAIL or '').strip()
    sender_name = str(settings.BREVO_FROM_NAME or '').strip()
    if not api_key or not sender_email or not sender_name:
        logger.warning('Transactional email rejected category=configuration')
        raise TransactionalEmailError('Transactional email is not configured.')

    _valid_email(sender_email)
    _valid_email(recipient_email)
    payload = {
        'sender': {'name': sender_name, 'email': sender_email},
        'to': [{'email': recipient_email}],
        'subject': subject,
        'textContent': text_body,
    }
    headers = {
        'accept': 'application/json',
        'api-key': api_key,
        'content-type': 'application/json',
    }
    try:
        response = requests.post(
            BREVO_TRANSACTIONAL_EMAIL_URL,
            headers=headers,
            json=payload,
            timeout=settings.BREVO_API_TIMEOUT_SECONDS,
        )
    except requests.Timeout as error:
        logger.warning('Transactional email failed provider=brevo category=timeout')
        raise TransactionalEmailError('Transactional email provider timed out.') from error
    except requests.RequestException as error:
        logger.warning('Transactional email failed provider=brevo category=network')
        raise TransactionalEmailError('Transactional email provider is unavailable.') from error

    if response.status_code != 201:
        if response.status_code in {401, 403}:
            category = 'authentication'
        elif response.status_code == 429:
            category = 'rate_limit'
        elif response.status_code in {402, 451}:
            category = 'quota_or_policy'
        elif response.status_code == 400:
            category = 'request_validation'
        elif response.status_code >= 500:
            category = 'provider_unavailable'
        else:
            category = 'unexpected_status'
        logger.warning(
            'Transactional email rejected provider=brevo category=%s status=%s',
            category,
            response.status_code,
        )
        raise TransactionalEmailError('Transactional email provider rejected the request.')

    try:
        provider_data = response.json()
    except ValueError as error:
        logger.warning('Transactional email failed provider=brevo category=malformed_response status=201')
        raise TransactionalEmailError('Transactional email provider returned an invalid response.') from error
    if not isinstance(provider_data, dict) or not provider_data.get('messageId'):
        logger.warning('Transactional email failed provider=brevo category=malformed_response status=201')
        raise TransactionalEmailError('Transactional email provider returned an invalid response.')

    logger.info('Transactional email accepted provider=brevo status=201')
    return str(provider_data['messageId'])
