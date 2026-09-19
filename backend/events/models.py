from django.conf import settings
from django.db import models
from django_mongodb_backend.fields import ObjectIdAutoField


class Event(models.Model):
    class Category(models.TextChoices):
        WEEKLY_MEETING = 'WEEKLY_MEETING', 'Weekly Meeting'
        CAMP = 'CAMP', 'Camp'
        TREKKING = 'TREKKING', 'Trekking'
        HIKING_ADVENTURE = 'HIKING_ADVENTURE', 'Hiking / Adventure'
        COMMUNITY_SERVICE = 'COMMUNITY_SERVICE', 'Community Service'
        TRAINING = 'TRAINING', 'Training'
        CELEBRATION = 'CELEBRATION', 'Celebration'
        RALLY = 'RALLY', 'Rally'
        COMPETITION = 'COMPETITION', 'Competition'
        STATE_NATIONAL = 'STATE_NATIONAL', 'State / National Event'
        INTERNATIONAL = 'INTERNATIONAL', 'International Event'
        OTHER = 'OTHER', 'Other'

    class RegistrationStatus(models.TextChoices):
        CLOSED = 'CLOSED', 'Closed'
        OPEN = 'OPEN', 'Open'

    id = ObjectIdAutoField(primary_key=True)
    title = models.CharField(max_length=180)
    category = models.CharField(max_length=30, choices=Category.choices, default=Category.OTHER)
    short_summary = models.CharField(max_length=320, blank=True)
    description = models.TextField()
    location = models.CharField(max_length=180)
    address = models.TextField(blank=True)
    maps_link = models.URLField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    eligible_wings = models.JSONField(default=list, blank=True)
    organizer = models.CharField(max_length=150)
    maximum_participants = models.PositiveIntegerField(null=True, blank=True)
    registration_status = models.CharField(max_length=10, choices=RegistrationStatus.choices, default=RegistrationStatus.CLOSED)
    event_image = models.URLField(blank=True)
    poster = models.ImageField(upload_to='events/posters/%Y/%m/', blank=True)
    circular = models.FileField(upload_to='events/circulars/%Y/%m/', blank=True)
    instructions = models.TextField(blank=True)
    registration_link = models.URLField(blank=True)
    registration_deadline = models.DateTimeField(null=True, blank=True)
    registration_details = models.TextField(blank=True)
    contact_person = models.CharField(max_length=150, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_instructions = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_date']


class EventRegistration(models.Model):
    id = ObjectIdAutoField(primary_key=True)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='registrations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='event_registrations')
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['event', 'user'], name='unique_event_registration')]
