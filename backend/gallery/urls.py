from django.urls import path

from .views import AlbumDetailView, AlbumListView, PhotoDetailView, PhotoListView

urlpatterns = [
    path('albums/', AlbumListView.as_view(), name='gallery-album-list'),
    path('albums/<str:album_id>/', AlbumDetailView.as_view(), name='gallery-album-detail'),
    path('albums/<str:album_id>/photos/', PhotoListView.as_view(), name='gallery-photo-list'),
    path('photos/<str:photo_id>/', PhotoDetailView.as_view(), name='gallery-photo-detail'),
]
