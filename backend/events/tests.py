from datetime import timedelta

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User

from .models import Event
from .serializers import EventSerializer


class EventAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='event-user@example.com',
            password='Strong-Password-482!',
            full_name='Event User',
        )
        self.client.force_authenticate(user=self.user)

    def create_event(self, **overrides):
        values = {
            'title': 'Private planning event',
            'description': 'Draft event details',
            'location': 'Bengaluru',
            'start_date': timezone.now() + timedelta(days=2),
            'end_date': timezone.now() + timedelta(days=3),
            'organizer': 'Kanteerava',
            'registration_status': Event.RegistrationStatus.OPEN,
            'is_published': False,
        }
        values.update(overrides)
        return Event.objects.create(**values)

    def test_unpublished_event_cannot_be_registered_or_cancelled_by_normal_user(self):
        event = self.create_event()
        register_path = f'/api/events/{event.pk}/register/'

        self.assertEqual(self.client.post(register_path, {}, format='json').status_code, 404)
        self.assertEqual(self.client.delete(register_path).status_code, 404)
        self.assertEqual(event.registrations.count(), 0)

    def test_registration_deadline_is_enforced(self):
        event = self.create_event(
            is_published=True,
            registration_deadline=timezone.now() - timedelta(minutes=1),
        )

        response = self.client.post(f'/api/events/{event.pk}/register/', {}, format='json')

        self.assertEqual(response.status_code, 409, response.data)
        self.assertIn('closed', response.data['message'].lower())
        self.assertEqual(event.registrations.count(), 0)

    def test_malformed_event_and_gallery_ids_return_not_found(self):
        public_client = APIClient()
        for path in [
            '/api/events/not-an-id/',
            '/api/announcements/not-an-id/',
            '/api/gallery/albums/not-an-id/',
            '/api/gallery/albums/not-an-id/photos/',
        ]:
            with self.subTest(path=path):
                response = public_client.get(path)
                self.assertEqual(response.status_code, 404, response.data)

    def test_pdf_upload_rejects_spoofed_content(self):
        payload = {
            'title': 'Event with circular',
            'description': 'Description',
            'location': 'Bengaluru',
            'start_date': timezone.now() + timedelta(days=2),
            'organizer': 'Kanteerava',
            'circular': SimpleUploadedFile('circular.pdf', b'not really a pdf', content_type='application/pdf'),
        }
        serializer = EventSerializer(data=payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn('circular', serializer.errors)
