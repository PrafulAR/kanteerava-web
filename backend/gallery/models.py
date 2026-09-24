from django.db import models
from django_mongodb_backend.fields import ObjectIdAutoField

from events.models import Event


class Album(models.Model):
    class Category(models.TextChoices):
        DOMESTIC = 'DOMESTIC', 'Domestic'
        INTERNATIONAL = 'INTERNATIONAL', 'International'

    id = ObjectIdAutoField(primary_key=True)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.DOMESTIC)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']


class Photo(models.Model):
    id = ObjectIdAutoField(primary_key=True)
    album = models.ForeignKey(Album, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='gallery/%Y/%m/')
    caption = models.CharField(max_length=300, blank=True)
    event = models.ForeignKey(Event, null=True, blank=True, on_delete=models.SET_NULL, related_name='gallery_photos')
    is_published = models.BooleanField(default=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-uploaded_at']
