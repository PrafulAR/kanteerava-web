from django.core.management.base import BaseCommand, CommandError

from accounts.models import User


class Command(BaseCommand):
    help = 'Grant Admin access to an existing user account.'

    def add_arguments(self, parser):
        parser.add_argument('email', help='Email address of the existing account to promote.')

    def handle(self, *args, **options):
        email = User.objects.normalize_email(options['email'])
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist as error:
            raise CommandError('No user exists with that email address.') from error

        user.role = User.Role.ADMIN
        user.is_staff = True
        user.save(update_fields=['role', 'is_staff', 'updated_at'])
        self.stdout.write(self.style.SUCCESS(f'{user.email} can now sign in to the Admin workspace.'))
