from pathlib import Path

from rest_framework import serializers


def validate_pdf_upload(document, *, size_limit=10 * 1024 * 1024):
    if document.size > size_limit:
        raise serializers.ValidationError('PDF files must be 10 MB or smaller.')
    if getattr(document, 'content_type', '') != 'application/pdf' or Path(document.name).suffix.casefold() != '.pdf':
        raise serializers.ValidationError('Upload a PDF document.')
    position = document.tell()
    header = document.read(5)
    document.seek(position)
    if header != b'%PDF-':
        raise serializers.ValidationError('The uploaded file is not a valid PDF document.')
    return document
