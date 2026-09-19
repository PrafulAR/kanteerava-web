from django.db import models
from django_mongodb_backend.fields import ObjectIdAutoField


class Leader(models.Model):
    id = ObjectIdAutoField(primary_key=True)
    name = models.CharField(max_length=150)
    position = models.CharField(max_length=120)
    profile_photo = models.URLField(blank=True)
    description = models.TextField()
    biography = models.TextField(blank=True)
    achievements = models.TextField(blank=True)
    joining_date = models.DateField(null=True, blank=True)
    contact_email = models.EmailField(blank=True)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']