from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import AdminUserSerializer, LoginSerializer, RegisterSerializer, UserSerializer


def is_admin(user):
    return user.is_superuser or user.role == 'ADMIN'


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({'success': True, 'message': 'Account created successfully.', 'data': UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({'success': True, 'message': 'Login successful.', 'data': {'user': UserSerializer(user).data, 'access': str(refresh.access_token), 'refresh': str(refresh)}})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'success': True, 'message': 'Logout successful.', 'data': {}})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'success': True, 'message': 'Current user loaded.', 'data': UserSerializer(request.user).data})


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        return Response({'success': True, 'message': 'Users loaded.', 'data': AdminUserSerializer(User.objects.all(), many=True).data})

    def post(self, request):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        serializer = AdminUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({'success': True, 'message': 'User created.', 'data': AdminUserSerializer(user).data}, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, user_id):
        return User.objects.get(pk=user_id)

    def dispatch_admin(self, request):
        return is_admin(request.user)

    def get(self, request, user_id):
        if not self.dispatch_admin(request):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        try:
            user = self.get_object(user_id)
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'User not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'message': 'User loaded.', 'data': AdminUserSerializer(user).data})

    def patch(self, request, user_id):
        if not self.dispatch_admin(request):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        try:
            user = self.get_object(user_id)
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'User not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminUserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response({'success': True, 'message': 'User updated.', 'data': AdminUserSerializer(serializer.save()).data})

    def delete(self, request, user_id):
        if not self.dispatch_admin(request):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        try:
            user = self.get_object(user_id)
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'User not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        if user.pk == request.user.pk:
            return Response({'success': False, 'message': 'You cannot delete your own account.', 'errors': {}}, status=status.HTTP_409_CONFLICT)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)