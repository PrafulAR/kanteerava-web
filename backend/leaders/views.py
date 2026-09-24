from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from memberships.views import is_admin
from api.utils import get_object_or_none

from .models import Leader
from .serializers import LeaderSerializer, PublicLeaderSerializer


class LeaderListView(APIView):
    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsAuthenticated()]

    def get(self, request):
        queryset = Leader.objects.filter(is_published=True) if not request.user.is_authenticated else Leader.objects.all() if is_admin(request.user) else Leader.objects.filter(is_published=True)
        return Response({'success': True, 'message': 'Leaders loaded.', 'data': PublicLeaderSerializer(queryset, many=True).data})

    def post(self, request):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        serializer = LeaderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': 'Leader created.', 'data': LeaderSerializer(serializer.save()).data}, status=status.HTTP_201_CREATED)


class LeaderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, leader_id):
        return get_object_or_none(Leader, pk=leader_id)

    def dispatch_admin(self, request):
        return is_admin(request.user)

    def get(self, request, leader_id):
        leader = self.get_object(leader_id)
        if leader is None:
            return Response({'success': False, 'message': 'Leader not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        if not leader.is_published and not self.dispatch_admin(request):
            return Response({'success': False, 'message': 'Leader not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'message': 'Leader loaded.', 'data': PublicLeaderSerializer(leader).data})

    def patch(self, request, leader_id):
        if not self.dispatch_admin(request):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        leader = self.get_object(leader_id)
        if leader is None:
            return Response({'success': False, 'message': 'Leader not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = LeaderSerializer(leader, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': 'Leader updated.', 'data': LeaderSerializer(serializer.save()).data})

    def delete(self, request, leader_id):
        if not self.dispatch_admin(request):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        leader = self.get_object(leader_id)
        if leader is None:
            return Response({'success': False, 'message': 'Leader not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        leader.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
