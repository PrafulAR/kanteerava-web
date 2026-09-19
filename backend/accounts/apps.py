from django.apps import AppConfig
from django_mongodb_backend.fields import ObjectIdAutoField


class AccountsConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'accounts'


class AuthConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'django.contrib.auth'


class ContentTypesConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'django.contrib.contenttypes'