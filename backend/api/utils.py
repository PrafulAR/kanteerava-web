from django.core.exceptions import ValidationError


def get_object_or_none(model, **lookup):
    """Return None for missing objects and malformed external identifiers."""
    try:
        return model.objects.get(**lookup)
    except (model.DoesNotExist, ValidationError, TypeError, ValueError):
        return None
