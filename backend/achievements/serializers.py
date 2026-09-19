from rest_framework import serializers

from .models import Achievement


class AchievementSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)

    class Meta:
        model = Achievement
        fields = ['id', 'title', 'description', 'achievement_date', 'category', 'recipient', 'image', 'is_published', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_image(self, image):
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Image files must be 5 MB or smaller.')
        if getattr(image, 'content_type', '') not in {'image/jpeg', 'image/png', 'image/webp'}:
            raise serializers.ValidationError('Upload a JPEG, PNG, or WebP image.')
        return image


class PublicAchievementSerializer(AchievementSerializer):
    class Meta(AchievementSerializer.Meta):
        fields = ['id', 'title', 'description', 'achievement_date', 'category', 'recipient', 'image']
