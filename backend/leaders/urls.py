from django.urls import path

from .views import LeaderDetailView, LeaderListView

urlpatterns = [
    path('', LeaderListView.as_view(), name='leader-list'),
    path('<str:leader_id>/', LeaderDetailView.as_view(), name='leader-detail'),
]