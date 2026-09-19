from rest_framework import serializers

from events.models import Event

from .models import Album, Photo


class EventRelatedField(serializers.PrimaryKeyRelatedField):
    def to_representation(self, value):
        return str(value.pk)


class PhotoSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    album = serializers.CharField(source='album.pk', read_only=True)
    event = EventRelatedField(queryset=Event.objects.all(), allow_null=True, required=False)
    event_id = serializers.CharField(source='event.pk', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = Photo
        fields = ['id', 'album', 'image', 'caption', 'event', 'event_id', 'event_title', 'is_published', 'uploaded_at', 'updated_at']
        read_only_fields = ['id', 'album', 'event_id', 'event_title', 'uploaded_at', 'updated_at']

    def validate_image(self, image):
        if image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Image files must be 5 MB or smaller.')
        if getattr(image, 'content_type', '') not in {'image/jpeg', 'image/png', 'image/webp'}:
            raise serializers.ValidationError('Upload a JPEG, PNG, or WebP image.')
        return image


class PublicPhotoSerializer(PhotoSerializer):
    class Meta(PhotoSerializer.Meta):
        fields = ['id', 'image', 'caption', 'event_id', 'event_title', 'uploaded_at']


class AlbumSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    photo_count = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = ['id', 'title', 'description', 'is_published', 'photo_count', 'cover_image', 'created_at', 'updated_at']
        read_only_fields = ['id', 'photo_count', 'cover_image', 'created_at', 'updated_at']

    def get_photo_count(self, obj):
        request = self.context.get('request')
        admin = request and request.user.is_authenticated and (request.user.is_superuser or request.user.role == 'ADMIN')
        return obj.photos.count() if admin else obj.photos.filter(is_published=True).count()

    def get_cover_image(self, obj):
        photo = obj.photos.filter(is_published=True).first()
        if not photo:
            return None
        request = self.context.get('request')
        url = photo.image.url
        return request.build_absolute_uri(url) if request else url


class PublicAlbumSerializer(AlbumSerializer):
    class Meta(AlbumSerializer.Meta):
        fields = ['id', 'title', 'description', 'photo_count', 'cover_image', 'created_at']
