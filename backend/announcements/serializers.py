from rest_framework import serializers

from .models import Announcement
from api.validators import validate_pdf_upload


class AnnouncementSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    author = serializers.CharField(source='author.pk', read_only=True)
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content_type', 'category', 'summary', 'content', 'author', 'author_name', 'priority', 'publish_date', 'cover_image', 'attachment', 'target_wings', 'is_pinned', 'expires_at', 'is_published', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'author_name', 'created_at', 'updated_at']

    def validate_cover_image(self, image):
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Cover images must be 5 MB or smaller.')
        if getattr(image, 'content_type', '') not in {'image/jpeg', 'image/png', 'image/webp'}:
            raise serializers.ValidationError('Upload a JPEG, PNG, or WebP image.')
        return image

    def validate_attachment(self, document):
        return validate_pdf_upload(document)


class PublicAnnouncementSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content_type', 'category', 'summary', 'content', 'author_name', 'priority', 'publish_date', 'cover_image', 'attachment', 'target_wings', 'is_pinned', 'created_at', 'updated_at']
