from django.urls import path

from .views import AdminDashboardView, DirectoryMemberDetailView, MemberDirectoryView, MembershipApplyView, MembershipDetailView, MembershipListView, MembershipRejectView, MembershipApproveView, MembershipPdfView, WingMemberListView

urlpatterns = [
    path('admin-dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('directory/', MemberDirectoryView.as_view(), name='member-directory'),
    path('directory/<str:member_type>/', WingMemberListView.as_view(), name='wing-member-list'),
    path('directory/<str:member_type>/<str:membership_id>/', DirectoryMemberDetailView.as_view(), name='directory-member-detail'),
    path('', MembershipListView.as_view(), name='membership-list'),
    path('apply/', MembershipApplyView.as_view(), name='membership-apply'),
    path('<str:membership_id>/', MembershipDetailView.as_view(), name='membership-detail'),
    path('<str:membership_id>/approve/', MembershipApproveView.as_view(), name='membership-approve'),
    path('<str:membership_id>/reject/', MembershipRejectView.as_view(), name='membership-reject'),
    path('<str:membership_id>/pdf/', MembershipPdfView.as_view(), name='membership-pdf'),
]
