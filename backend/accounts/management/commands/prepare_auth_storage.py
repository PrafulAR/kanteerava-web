from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from pymongo import ASCENDING, MongoClient
from pymongo.errors import DuplicateKeyError, OperationFailure


class Command(BaseCommand):
    help = 'Backfill legacy security defaults and create authentication and membership integrity indexes.'

    def handle(self, *args, **options):
        database_settings = settings.DATABASES['default']
        client = MongoClient(database_settings['HOST'])
        database = client[database_settings['NAME']]
        users = database['accounts_user']
        memberships = database['memberships_membership']

        verified = users.update_many(
            {'email_verified': {'$exists': False}},
            {'$set': {'email_verified': True}},
        )
        versions = users.update_many(
            {'auth_version': {'$exists': False}},
            {'$set': {'auth_version': 0}},
        )
        try:
            users.create_index([('email', ASCENDING)], unique=True, name='accounts_user_email_unique')
            database['accounts_emailotpchallenge'].create_index(
                [('public_id', ASCENDING)], unique=True, name='auth_otp_public_id_unique',
            )
            database['accounts_passwordresetgrant'].create_index(
                [('public_id', ASCENDING)], unique=True, name='auth_reset_grant_public_id_unique',
            )
            database['accounts_googleidentity'].create_index(
                [('subject', ASCENDING)], unique=True, name='auth_google_subject_unique',
            )
            database['accounts_googleidentity'].create_index(
                [('user_id', ASCENDING)], unique=True, name='auth_google_user_unique',
            )
            memberships.create_index(
                [('user_id', ASCENDING)],
                unique=True,
                name='unique_active_membership_per_user',
                partialFilterExpression={'status': {'$in': ['PENDING', 'APPROVED']}},
            )
        except (DuplicateKeyError, OperationFailure) as error:
            raise CommandError(
                'Security indexes could not be created. Resolve duplicate account, identity, or active membership records first.'
            ) from error
        finally:
            client.close()

        self.stdout.write(self.style.SUCCESS(
            'Authentication and membership storage ready '
            f'(verified defaults: {verified.modified_count}, session defaults: {versions.modified_count}).'
        ))
