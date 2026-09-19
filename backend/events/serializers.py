from rest_framework import serializers

from .models import Event, EventRegistration


class EventSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    registration_count = serializers.IntegerField(source='registrations.count', read_only=True)

    class Meta:
        model = Event
        fields = ['id', 'title', 'category', 'short_summary', 'description', 'location', 'address', 'maps_link', 'start_date', 'end_date', 'eligible_wings', 'organizer', 'maximum_participants', 'registration_status', 'event_image', 'poster', 'circular', 'instructions', 'registration_link', 'registration_deadline', 'registration_details', 'contact_person', 'contact_phone', 'contact_email', 'contact_instructions', 'is_published', 'registration_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'registration_count', 'created_at', 'updated_at']

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if end and start and end < start:
            raise serializers.ValidationError({'end_date': 'End date cannot be before start date.'})
        circular = attrs.get('circular')
        if circular and getattr(circular, 'content_type', '') != 'application/pdf':
            raise serializers.ValidationError({'circular': 'Upload a PDF circular.'})
        if circular and circular.size > 10 * 1024 * 1024:
            raise serializers.ValidationError({'circular': 'Circular PDFs must be 10 MB or smaller.'})
        poster = attrs.get('poster')
        if poster and getattr(poster, 'content_type', '') not in {'image/jpeg', 'image/png', 'image/webp'}:
            raise serializers.ValidationError({'poster': 'Upload a JPEG, PNG, or WebP poster.'})
        if poster and poster.size > 5 * 1024 * 1024:
            raise serializers.ValidationError({'poster': 'Poster images must be 5 MB or smaller.'})
        return attrs


class PublicEventSerializer(EventSerializer):
    class Meta(EventSerializer.Meta):
        fields = ['id', 'title', 'category', 'short_summary', 'description', 'location', 'address', 'maps_link', 'start_date', 'end_date', 'eligible_wings', 'organizer', 'maximum_participants', 'registration_status', 'event_image', 'poster', 'circular', 'instructions', 'registration_link', 'registration_deadline', 'registration_details', 'contact_person', 'contact_phone', 'contact_email', 'contact_instructions', 'registration_count']


class EventRegistrationSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = EventRegistration
        fields = ['id', 'user_name', 'registered_at']
