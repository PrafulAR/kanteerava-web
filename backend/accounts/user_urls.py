from django.urls import path

from .views import AdminUserDetailView, AdminUserListView

urlpatterns = [
    path('', AdminUserListView.as_view(), name='admin-users'),
    path('<str:user_id>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
]