from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from memberships.views import is_admin
from .models import Achievement
from .serializers import AchievementSerializer, PublicAchievementSerializer


class AchievementListView(APIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsAuthenticated()]

    def get(self, request):
        admin = request.user.is_authenticated and is_admin(request.user)
        items = Achievement.objects.all() if admin else Achievement.objects.filter(is_published=True)
        serializer = AchievementSerializer if admin else PublicAchievementSerializer
        return Response({'success': True, 'message': 'Achievements loaded.', 'data': serializer(items, many=True).data})

    def post(self, request):
        if not is_admin(request.user): return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        serializer = AchievementSerializer(data=request.data); serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': 'Achievement created.', 'data': AchievementSerializer(serializer.save()).data}, status=status.HTTP_201_CREATED)


class AchievementDetailView(APIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def get_object(self, achievement_id): return Achievement.objects.get(pk=achievement_id)

    def patch(self, request, achievement_id):
        if not is_admin(request.user): return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        try: item = self.get_object(achievement_id)
        except Achievement.DoesNotExist: return Response({'success': False, 'message': 'Achievement not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = AchievementSerializer(item, data=request.data, partial=True); serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': 'Achievement updated.', 'data': AchievementSerializer(serializer.save()).data})

    def delete(self, request, achievement_id):
        if not is_admin(request.user): return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        try: self.get_object(achievement_id).delete()
        except Achievement.DoesNotExist: return Response({'success': False, 'message': 'Achievement not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
