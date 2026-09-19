from django.urls import path
from .views import AchievementDetailView, AchievementListView

urlpatterns = [path('', AchievementListView.as_view()), path('<str:achievement_id>/', AchievementDetailView.as_view())]
