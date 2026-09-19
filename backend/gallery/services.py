from .models import Album


class GalleryService:
    @staticmethod
    def delete_album(*, album: Album):
        for photo in album.photos.all():
            if photo.image:
                photo.image.delete(save=False)
        album.delete()

    @staticmethod
    def delete_photo(*, photo):
        if photo.image:
            photo.image.delete(save=False)
        photo.delete()
