from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from memberships.views import is_admin

from .models import Event
from .serializers import EventRegistrationSerializer, EventSerializer, PublicEventSerializer
from .services import EventService


class EventListView(APIView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsAuthenticated()]

    def get(self, request):
        events = Event.objects.filter(is_published=True)
        if request.user.is_authenticated and is_admin(request.user):
            events = Event.objects.all()
        serializer = EventSerializer if request.user.is_authenticated and is_admin(request.user) else PublicEventSerializer
        return Response({'success': True, 'message': 'Events loaded.', 'data': serializer(events, many=True).data})

    def post(self, request):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        serializer = EventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': 'Event created.', 'data': EventSerializer(serializer.save()).data}, status=status.HTTP_201_CREATED)


class EventDetailView(APIView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsAuthenticated()]

    def get_object(self, event_id):
        return Event.objects.get(pk=event_id)

    def get(self, request, event_id):
        try:
            event = self.get_object(event_id)
        except Event.DoesNotExist:
            return Response({'success': False, 'message': 'Event not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        if not event.is_published and not is_admin(request.user):
            return Response({'success': False, 'message': 'Event not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = EventSerializer if request.user.is_authenticated and is_admin(request.user) else PublicEventSerializer
        return Response({'success': True, 'message': 'Event loaded.', 'data': serializer(event).data})

    def patch(self, request, event_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        try:
            event = self.get_object(event_id)
        except Event.DoesNotExist:
            return Response({'success': False, 'message': 'Event not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = EventSerializer(event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': 'Event updated.', 'data': EventSerializer(serializer.save()).data})

    def delete(self, request, event_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        try:
            event = self.get_object(event_id)
        except Event.DoesNotExist:
            return Response({'success': False, 'message': 'Event not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, event_id):
        try:
            event = Event.objects.get(pk=event_id)
            registration = EventService.register(event=event, user=request.user)
        except Event.DoesNotExist:
            return Response({'success': False, 'message': 'Event not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as error:
            return Response({'success': False, 'message': str(error), 'errors': {}}, status=status.HTTP_409_CONFLICT)
        return Response({'success': True, 'message': 'Event registration successful.', 'data': EventRegistrationSerializer(registration).data}, status=status.HTTP_201_CREATED)

    def delete(self, request, event_id):
        deleted, _ = Event.objects.get(pk=event_id).registrations.filter(user=request.user).delete()
        if not deleted:
            return Response({'success': False, 'message': 'Registration not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
