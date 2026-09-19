"""Validate private membership images before they reach the database or PDF."""

import base64
import binascii
from io import BytesIO
from pathlib import PurePath

from PIL import Image, ImageOps, UnidentifiedImageError


def normalize_image_upload(data_url, filename, *, kind):
    """Return trusted PNG signature or JPEG photo bytes from a browser data URL."""
    if not data_url:
        raise ValueError(f'{kind.title()} image is required.')
    if not isinstance(data_url, str) or ',' not in data_url:
        raise ValueError(f'Invalid {kind} image.')

    header, encoded = data_url.split(',', 1)
    allowed = {'image/png': '.png', 'image/jpeg': '.jpg'}
    if not header.startswith('data:') or not header.endswith(';base64'):
        raise ValueError(f'Invalid {kind} image format.')
    mime = header[5:-7].lower()
    extension = PurePath(filename or '').suffix.lower()
    if mime not in allowed or extension not in ({'.png'} if mime == 'image/png' else {'.jpg', '.jpeg'}):
        raise ValueError(f'{kind.title()} must be a PNG or JPG image with a matching filename.')

    maximum = 1_000_000 if kind == 'signature' else 5_000_000
    if len(encoded) > (maximum * 4 // 3) + 8:
        raise ValueError(f'{kind.title()} image is too large.')
    try:
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > maximum:
            raise ValueError(f'{kind.title()} image is too large.')
        with Image.open(BytesIO(raw)) as checked:
            checked.verify()
        with Image.open(BytesIO(raw)) as image:
            if image.format not in ('PNG', 'JPEG') or image.get_format_mimetype() != mime:
                raise ValueError(f'Invalid {kind} image content.')
            image = ImageOps.exif_transpose(image)
            width, height = image.size
            if kind == 'signature':
                if not (80 <= width <= 2400 and 30 <= height <= 1200):
                    raise ValueError('Signature dimensions must be between 80×30 and 2400×1200 pixels.')
                if width / height < 1.5:
                    raise ValueError('Signature images must be wider than they are tall. Crop away surrounding photo or paper area.')
                image = image.convert('RGBA')
                output = BytesIO()
                image.save(output, format='PNG', optimize=True)
            else:
                if not (120 <= width <= 5000 and 120 <= height <= 5000):
                    raise ValueError('Photo dimensions must be between 120×120 and 5000×5000 pixels.')
                image = image.convert('RGB')
                output = BytesIO()
                image.save(output, format='JPEG', quality=88, optimize=True)
        return output.getvalue()
    except (binascii.Error, UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ValueError(f'Invalid {kind} image.') from error
