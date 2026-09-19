from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.utils import timezone

from memberships.views import is_admin

from .models import Announcement
from .serializers import AnnouncementSerializer, PublicAnnouncementSerializer


class AnnouncementListView(APIView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsAuthenticated()]

    def get(self, request):
        queryset = Announcement.objects.all()
        if not request.user.is_authenticated or not is_admin(request.user):
            queryset = queryset.filter(is_published=True, publish_date__lte=timezone.now()).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now()))
        queryset = queryset.order_by('-is_pinned', '-publish_date')
        serializer = AnnouncementSerializer if request.user.is_authenticated and is_admin(request.user) else PublicAnnouncementSerializer
        return Response({'success': True, 'message': 'Announcements loaded.', 'data': serializer(queryset, many=True).data})

    def post(self, request):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        serializer = AnnouncementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save(author=request.user)
        return Response({'success': True, 'message': 'Announcement created.', 'data': AnnouncementSerializer(announcement).data}, status=status.HTTP_201_CREATED)


class AnnouncementDetailView(APIView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsAuthenticated()]

    def get_object(self, announcement_id):
        return Announcement.objects.get(pk=announcement_id)

    def get(self, request, announcement_id):
        try:
            announcement = self.get_object(announcement_id)
        except Announcement.DoesNotExist:
            return Response({'success': False, 'message': 'Announcement not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        public_request = not request.user.is_authenticated or not is_admin(request.user)
        expired = announcement.expires_at and announcement.expires_at <= timezone.now()
        if public_request and (not announcement.is_published or announcement.publish_date > timezone.now() or expired):
            return Response({'success': False, 'message': 'Announcement not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = AnnouncementSerializer if request.user.is_authenticated and is_admin(request.user) else PublicAnnouncementSerializer
        return Response({'success': True, 'message': 'Announcement loaded.', 'data': serializer(announcement).data})

    def patch(self, request, announcement_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        try:
            announcement = self.get_object(announcement_id)
        except Announcement.DoesNotExist:
            return Response({'success': False, 'message': 'Announcement not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = AnnouncementSerializer(announcement, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': 'Announcement updated.', 'data': AnnouncementSerializer(serializer.save()).data})

    def delete(self, request, announcement_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        try:
            announcement = self.get_object(announcement_id)
        except Announcement.DoesNotExist:
            return Response({'success': False, 'message': 'Announcement not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        announcement.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
