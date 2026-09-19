from django.urls import path

from .views import AnnouncementDetailView, AnnouncementListView

urlpatterns = [
    path('', AnnouncementListView.as_view(), name='announcement-list'),
    path('<str:announcement_id>/', AnnouncementDetailView.as_view(), name='announcement-detail'),
]