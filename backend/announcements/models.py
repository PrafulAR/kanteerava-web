from django.conf import settings
from django.db import models
from django.utils import timezone
from django_mongodb_backend.fields import ObjectIdAutoField


class Announcement(models.Model):
    class ContentType(models.TextChoices):
        NOTICE = 'NOTICE', 'Notice / Update'
        STORY = 'STORY', 'Story / Report'

    class Category(models.TextChoices):
        ANNOUNCEMENT = 'ANNOUNCEMENT', 'Announcement'
        IMPORTANT_NOTICE = 'IMPORTANT_NOTICE', 'Important Notice'
        GROUP_UPDATE = 'GROUP_UPDATE', 'Group Update'
        REGISTRATION = 'REGISTRATION', 'Registration'
        MEETING_UPDATE = 'MEETING_UPDATE', 'Meeting Update'
        DEADLINE = 'DEADLINE', 'Deadline'
        SELECTION = 'SELECTION', 'Selection / Eligibility'
        CAMP_REPORT = 'CAMP_REPORT', 'Camp Report'
        TREK_REPORT = 'TREK_REPORT', 'Trek Report'
        SERVICE_STORY = 'SERVICE_STORY', 'Service Story'
        MEMBER_STORY = 'MEMBER_STORY', 'Member Story'
        GROUP_STORY = 'GROUP_STORY', 'Group Story'

    class Priority(models.TextChoices):
        NORMAL = 'NORMAL', 'Normal'
        IMPORTANT = 'IMPORTANT', 'Important'
        URGENT = 'URGENT', 'Urgent'

    id = ObjectIdAutoField(primary_key=True)
    title = models.CharField(max_length=180)
    content_type = models.CharField(max_length=10, choices=ContentType.choices, default=ContentType.NOTICE)
    category = models.CharField(max_length=30, choices=Category.choices, default=Category.ANNOUNCEMENT)
    summary = models.CharField(max_length=320, blank=True)
    content = models.TextField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='announcements')
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    publish_date = models.DateTimeField(default=timezone.now)
    cover_image = models.ImageField(upload_to='newsroom/covers/%Y/%m/', blank=True)
    attachment = models.FileField(upload_to='newsroom/attachments/%Y/%m/', blank=True)
    target_wings = models.JSONField(default=list, blank=True)
    is_pinned = models.BooleanField(default=False)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
