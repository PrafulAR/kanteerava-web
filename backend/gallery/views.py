from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from memberships.views import is_admin
from api.utils import get_object_or_none

from .models import Album, Photo
from .serializers import AlbumSerializer, PhotoSerializer, PublicAlbumSerializer, PublicPhotoSerializer
from .services import GalleryService


def response_data(serializer_class, instance, request, many=False):
    return serializer_class(instance, many=many, context={'request': request}).data


class AlbumListView(APIView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsAuthenticated()]

    def get(self, request):
        admin = request.user.is_authenticated and is_admin(request.user)
        albums = Album.objects.all() if admin else Album.objects.filter(is_published=True)
        serializer = AlbumSerializer if admin else PublicAlbumSerializer
        return Response({'success': True, 'message': 'Gallery albums loaded.', 'data': response_data(serializer, albums, request, many=True)})

    def post(self, request):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        serializer = AlbumSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        album = serializer.save()
        return Response({'success': True, 'message': 'Gallery album created.', 'data': response_data(AlbumSerializer, album, request)}, status=status.HTTP_201_CREATED)


class AlbumDetailView(APIView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsAuthenticated()]

    def get_object(self, album_id):
        return get_object_or_none(Album, pk=album_id)

    def get(self, request, album_id):
        album = self.get_object(album_id)
        if album is None:
            return Response({'success': False, 'message': 'Gallery album not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        admin = request.user.is_authenticated and is_admin(request.user)
        if not album.is_published and not admin:
            return Response({'success': False, 'message': 'Gallery album not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = AlbumSerializer if admin else PublicAlbumSerializer
        return Response({'success': True, 'message': 'Gallery album loaded.', 'data': response_data(serializer, album, request)})

    def patch(self, request, album_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        album = self.get_object(album_id)
        if album is None:
            return Response({'success': False, 'message': 'Gallery album not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = AlbumSerializer(album, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': 'Gallery album updated.', 'data': response_data(AlbumSerializer, serializer.save(), request)})

    def delete(self, request, album_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        album = self.get_object(album_id)
        if album is None:
            return Response({'success': False, 'message': 'Gallery album not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        GalleryService.delete_album(album=album)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PhotoListView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsAuthenticated()]

    def get_album(self, album_id):
        return get_object_or_none(Album, pk=album_id)

    def get(self, request, album_id):
        album = self.get_album(album_id)
        if album is None:
            return Response({'success': False, 'message': 'Gallery album not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        admin = request.user.is_authenticated and is_admin(request.user)
        if not album.is_published and not admin:
            return Response({'success': False, 'message': 'Gallery album not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        photos = album.photos.all() if admin else album.photos.filter(is_published=True)
        serializer = PhotoSerializer if admin else PublicPhotoSerializer
        return Response({'success': True, 'message': 'Gallery photos loaded.', 'data': response_data(serializer, photos, request, many=True)})

    def post(self, request, album_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        album = self.get_album(album_id)
        if album is None:
            return Response({'success': False, 'message': 'Gallery album not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = PhotoSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        photo = serializer.save(album=album, is_published=True)
        return Response({'success': True, 'message': 'Gallery photo uploaded.', 'data': response_data(PhotoSerializer, photo, request)}, status=status.HTTP_201_CREATED)


class PhotoDetailView(APIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def get_object(self, photo_id):
        return get_object_or_none(Photo, pk=photo_id)

    def patch(self, request, photo_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        photo = self.get_object(photo_id)
        if photo is None:
            return Response({'success': False, 'message': 'Gallery photo not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = PhotoSerializer(photo, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': 'Gallery photo updated.', 'data': response_data(PhotoSerializer, serializer.save(), request)})

    def delete(self, request, photo_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        photo = self.get_object(photo_id)
        if photo is None:
            return Response({'success': False, 'message': 'Gallery photo not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        GalleryService.delete_photo(photo=photo)
        return Response(status=status.HTTP_204_NO_CONTENT)
