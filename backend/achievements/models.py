from django.db import models
from django_mongodb_backend.fields import ObjectIdAutoField


class Achievement(models.Model):
    id = ObjectIdAutoField(primary_key=True)
    title = models.CharField(max_length=180)
    description = models.TextField()
    achievement_date = models.DateField()
    category = models.CharField(max_length=100, blank=True)
    recipient = models.CharField(max_length=160, blank=True)
    image = models.ImageField(upload_to='achievements/%Y/%m/', blank=True, null=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-achievement_date', '-created_at']
