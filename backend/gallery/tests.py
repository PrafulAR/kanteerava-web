from django.test import SimpleTestCase

from .models import Album
from .serializers import AlbumSerializer


class AlbumCategoryTests(SimpleTestCase):
    def test_existing_album_shape_defaults_to_domestic(self):
        album = Album(title='Legacy album')
        self.assertEqual(album.category, Album.Category.DOMESTIC)

    def test_admin_can_select_international_category(self):
        serializer = AlbumSerializer(data={'title': 'International camp', 'category': 'INTERNATIONAL'})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['category'], Album.Category.INTERNATIONAL)

    def test_unknown_album_category_is_rejected(self):
        serializer = AlbumSerializer(data={'title': 'Invalid album', 'category': 'ALL'})
        self.assertFalse(serializer.is_valid())
        self.assertIn('category', serializer.errors)
