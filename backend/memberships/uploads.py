"""Validate and normalize private membership images before storage or PDF use."""

import base64
import binascii
from io import BytesIO
from pathlib import PurePath

from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener


# Register HEIC/HEIF decoding with Pillow. The upload is still validated from
# decoded content below; this only adds the decoder used for member photos.
register_heif_opener(thumbnails=False)


PHOTO_MIMES = {
    '',
    'application/octet-stream',
    'image/heic',
    'image/heif',
    'image/jpeg',
    'image/jpg',
    'image/png',
}
PHOTO_EXTENSIONS = {'.heic', '.heif', '.jpeg', '.jpg', '.png'}
PHOTO_FORMATS = {'HEIF', 'JPEG', 'MPO', 'PNG'}
SIGNATURE_TYPES = {
    'image/jpeg': {'.jpeg', '.jpg'},
    'image/png': {'.png'},
}
SIGNATURE_FORMATS = {'JPEG', 'PNG'}


class _ImageValidationError(ValueError):
    """Expected validation failure safe to return to an API client."""


def _validate_dimensions(image, *, kind):
    width, height = image.size
    if kind == 'signature':
        if not (80 <= width <= 2400 and 30 <= height <= 1200):
            raise _ImageValidationError(
                'Signature dimensions must be between '
                '80×30 and 2400×1200 pixels.'
            )
        if width / height < 1.5:
            raise _ImageValidationError(
                'Signature images must be wider than they are tall. '
                'Crop away surrounding photo or paper area.'
            )
        return

    if not (120 <= width <= 5000 and 120 <= height <= 5000):
        raise _ImageValidationError(
            'Photo dimensions must be between 120×120 and 5000×5000 pixels.'
        )


def normalize_image_upload(data_url, filename, *, kind):
    """Return trusted PNG signature or JPEG member-photo bytes."""
    if kind not in {'photo', 'signature'}:
        raise _ImageValidationError('Unsupported membership image type.')
    if not data_url:
        raise _ImageValidationError(f'{kind.title()} image is required.')
    if not isinstance(data_url, str) or ',' not in data_url:
        raise _ImageValidationError(f'Invalid {kind} image.')

    header, encoded = data_url.split(',', 1)
    if not header.startswith('data:') or not header.endswith(';base64'):
        raise _ImageValidationError(f'Invalid {kind} image format.')

    mime = header[5:-7].casefold()
    extension = PurePath(filename or '').suffix.casefold()
    if kind == 'signature':
        if mime not in SIGNATURE_TYPES or extension not in SIGNATURE_TYPES[mime]:
            raise _ImageValidationError(
                'Signature must be a PNG or JPG image with a matching filename.'
            )
    elif mime not in PHOTO_MIMES or extension not in PHOTO_EXTENSIONS:
        raise _ImageValidationError('Photo must be a PNG, JPG, HEIC or HEIF image.')

    maximum = 1_000_000 if kind == 'signature' else 5_000_000
    if len(encoded) > (maximum * 4 // 3) + 8:
        raise _ImageValidationError(f'{kind.title()} image is too large.')

    try:
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > maximum:
            raise _ImageValidationError(f'{kind.title()} image is too large.')

        allowed_formats = SIGNATURE_FORMATS if kind == 'signature' else PHOTO_FORMATS
        with Image.open(BytesIO(raw)) as checked:
            if checked.format not in allowed_formats:
                raise _ImageValidationError(f'Invalid {kind} image content.')
            if kind == 'signature' and checked.get_format_mimetype() != mime:
                raise _ImageValidationError(f'Invalid {kind} image content.')
            # Reject excessive dimensions before fully decoding the pixels.
            if checked.width > 5000 or checked.height > 5000:
                _validate_dimensions(checked, kind=kind)
            checked.verify()

        with Image.open(BytesIO(raw)) as source:
            if source.format not in allowed_formats:
                raise _ImageValidationError(f'Invalid {kind} image content.')
            source.seek(0)
            image = ImageOps.exif_transpose(source)
            _validate_dimensions(image, kind=kind)

            output = BytesIO()
            if kind == 'signature':
                image.convert('RGBA').save(output, format='PNG', optimize=True)
            else:
                image.convert('RGB').save(
                    output,
                    format='JPEG',
                    quality=88,
                    optimize=True,
                )
            return output.getvalue()
    except _ImageValidationError:
        raise
    except (
        binascii.Error,
        EOFError,
        Image.DecompressionBombError,
        OSError,
        RuntimeError,
        SyntaxError,
        UnidentifiedImageError,
        ValueError,
    ) as error:
        raise _ImageValidationError(f'Invalid {kind} image.') from error
