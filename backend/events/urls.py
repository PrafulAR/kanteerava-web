from django.urls import path

from .views import EventDetailView, EventListView, EventRegisterView

urlpatterns = [
    path('', EventListView.as_view(), name='event-list'),
    path('<str:event_id>/', EventDetailView.as_view(), name='event-detail'),
    path('<str:event_id>/register/', EventRegisterView.as_view(), name='event-register'),
]