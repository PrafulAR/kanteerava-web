from django.conf import settings
from django.core.management.base import BaseCommand
from pymongo import MongoClient


class Command(BaseCommand):
    help = 'Backfill security defaults on legacy account documents.'

    def handle(self, *args, **options):
        database_settings = settings.DATABASES['default']
        client = MongoClient(database_settings['HOST'])
        try:
            users = client[database_settings['NAME']]['accounts_user']
            verified = users.update_many(
                {'email_verified': {'$exists': False}},
                {'$set': {'email_verified': True}},
            )
            versions = users.update_many(
                {'auth_version': {'$exists': False}},
                {'$set': {'auth_version': 0}},
            )
        finally:
            client.close()

        self.stdout.write(self.style.SUCCESS(
            'Legacy authentication defaults ready '
            f'(verified defaults: {verified.modified_count}, session defaults: {versions.modified_count}).'
        ))
