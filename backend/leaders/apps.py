from django.apps import AppConfig


class LeadersConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'leaders'