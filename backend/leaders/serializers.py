from rest_framework import serializers

from .models import Leader


class LeaderSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)

    class Meta:
        model = Leader
        fields = ['id', 'name', 'position', 'profile_photo', 'description', 'biography', 'achievements', 'joining_date', 'contact_email', 'is_published', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PublicLeaderSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)

    class Meta:
        model = Leader
        fields = ['id', 'name', 'position', 'profile_photo', 'description', 'biography', 'achievements', 'joining_date']