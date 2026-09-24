from django.db import IntegrityError
from django.utils import timezone

from .models import Event, EventRegistration


class EventService:
    @staticmethod
    def register(*, event, user):
        if event.registration_status != Event.RegistrationStatus.OPEN:
            raise ValueError('Registration is closed for this event.')
        if (event.end_date or event.start_date) < timezone.now():
            raise ValueError('This event has already ended.')
        if event.registration_deadline and event.registration_deadline < timezone.now():
            raise ValueError('Registration is closed for this event.')
        if EventRegistration.objects.filter(event=event, user=user).exists():
            raise ValueError('You are already registered for this event.')
        if event.maximum_participants is not None and event.registrations.count() >= event.maximum_participants:
            raise ValueError('This event has reached capacity.')
        try:
            return EventRegistration.objects.create(event=event, user=user)
        except IntegrityError as error:
            raise ValueError('You are already registered for this event.') from error
