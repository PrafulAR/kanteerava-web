from rest_framework import status
from django.utils import timezone
from django.http import HttpResponse
import logging
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from events.models import Event
from api.utils import get_object_or_none

from .models import Membership
from .serializers import MembershipSerializer
from .services import MembershipService

logger = logging.getLogger(__name__)

APPROVED_MEMBER_RESOURCES = [
    {
        'id': 'oyms',
        'title': 'OYMS',
        'description': 'Access the Bharat Scouts and Guides online membership system.',
        'url': 'https://uat.bsgindia.org/step',
        'action_label': 'Open OYMS',
    },
    {
        'id': 'bsg-events',
        'title': 'BSG Events',
        'description': 'Explore Scout and Guide events and opportunities.',
        'url': 'https://bsgevents.in/',
        'action_label': 'View BSG Events',
    },
]


def is_admin(user):
    return user.is_superuser or user.role == 'ADMIN'


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        return Response({'success': True, 'message': 'Admin dashboard loaded.', 'data': {
            'total_members': Membership.objects.filter(status=Membership.Status.APPROVED).count(),
            'total_scouts': Membership.objects.filter(member_type=Membership.MemberType.SCOUT, status=Membership.Status.APPROVED).count(),
            'total_guides': Membership.objects.filter(member_type=Membership.MemberType.GUIDE, status=Membership.Status.APPROVED).count(),
            'total_cubs': Membership.objects.filter(member_type=Membership.MemberType.CUB, status=Membership.Status.APPROVED).count(),
            'total_bulbuls': Membership.objects.filter(member_type=Membership.MemberType.BULBUL, status=Membership.Status.APPROVED).count(),
            'total_rovers': Membership.objects.filter(member_type=Membership.MemberType.ROVER, status=Membership.Status.APPROVED).count(),
            'total_rangers': Membership.objects.filter(member_type=Membership.MemberType.RANGER, status=Membership.Status.APPROVED).count(),
            'total_alumni': Membership.objects.filter(member_type=Membership.MemberType.ALUMNI, status=Membership.Status.APPROVED).count(),
            'total_leaders': Membership.objects.filter(member_type=Membership.MemberType.LEADER, status=Membership.Status.APPROVED).count(),
            'pending_applications': Membership.objects.filter(status=Membership.Status.PENDING).count(),
            'upcoming_events': Event.objects.filter(end_date__gte=timezone.now(), is_published=True).count(),
        }})


class MemberDirectoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        counts = {
            member_type: Membership.objects.filter(member_type=member_type, status=Membership.Status.APPROVED).count()
            for member_type, _ in Membership.MemberType.choices
        }
        return Response({'success': True, 'message': 'Member directory loaded.', 'data': {'counts': counts}})


class WingMemberListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, member_type):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        wing = member_type.upper()
        if wing not in Membership.MemberType.values:
            return Response({'success': False, 'message': 'Invalid member wing.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        members = list(Membership.objects.filter(member_type=wing, status=Membership.Status.APPROVED))
        search = request.query_params.get('search', '').strip().casefold()
        if search:
            members = [member for member in members if search in ' '.join([
                member.applicant_name or member.user.full_name or '',
                member.scout_id or member.application_id or '',
                member.user.email or '',
                member.user.phone or '',
            ]).casefold()]
        return Response({'success': True, 'message': 'Wing members loaded.', 'data': MembershipSerializer(members, many=True).data})


class DirectoryMemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, member_type, membership_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        wing = member_type.upper()
        if wing not in Membership.MemberType.values:
            return Response({'success': False, 'message': 'Invalid member wing.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        member = get_object_or_none(Membership, pk=membership_id, member_type=wing, status=Membership.Status.APPROVED)
        if member is None:
            return Response({'success': False, 'message': 'Active member not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'message': 'Member details loaded.', 'data': MembershipSerializer(member).data})


class MembershipApplyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MembershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            membership = MembershipService.submit(user=request.user, validated_data=serializer.validated_data)
        except ValueError as error:
            return Response({'success': False, 'message': str(error), 'errors': {}}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': True, 'message': 'Membership application submitted.', 'data': MembershipSerializer(membership).data}, status=status.HTTP_201_CREATED)


class MembershipListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.query_params.get('mine') == '1':
            memberships = Membership.objects.filter(user=request.user)
        elif is_admin(request.user):
            # The regular MongoDB ORM query inserts an identity $addFields
            # stage before $sort, which prevents MongoDB from using the
            # submitted_at index. Keep $sort first for the unbounded admin
            # list so the descending index supplies the requested ordering.
            memberships = Membership.objects.raw_aggregate([
                {'$sort': {'submitted_at': -1}},
            ])
        else:
            memberships = Membership.objects.filter(user=request.user)
        return Response({'success': True, 'message': 'Memberships loaded.', 'data': MembershipSerializer(memberships, many=True).data})


class MembershipResourcesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_approved_member = Membership.objects.filter(
            user=request.user,
            status=Membership.Status.APPROVED,
        ).exists()
        if not is_approved_member:
            return Response(
                {'success': False, 'message': 'Approved membership is required to access these resources.', 'errors': {}},
                status=status.HTTP_403_FORBIDDEN,
            )
        response = Response({'success': True, 'message': 'Member resources loaded.', 'data': APPROVED_MEMBER_RESOURCES})
        response['Cache-Control'] = 'private, no-store'
        return response


class MembershipDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, membership_id):
        membership = get_object_or_none(Membership, pk=membership_id)
        if membership is None:
            return Response({'success': False, 'message': 'Membership not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        if not is_admin(request.user) and membership.user != request.user:
            return Response({'success': False, 'message': 'You do not have permission to view this membership.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        return Response({'success': True, 'message': 'Membership loaded.', 'data': MembershipSerializer(membership).data})

    def patch(self, request, membership_id):
        membership = get_object_or_none(Membership, pk=membership_id)
        if membership is None:
            return Response({'success': False, 'message': 'Membership not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        if not is_admin(request.user):
            allowed = {'applicant_signature_upload', 'applicant_signature_name', 'guardian_signature_upload', 'guardian_signature_name', 'photo_upload', 'photo_name'}
            if membership.user != request.user or set(request.data) - allowed:
                return Response({'success': False, 'message': 'You can update only your own pending signature or photo.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        elif {'applicant_signature_upload', 'applicant_signature_name', 'guardian_signature_upload', 'guardian_signature_name'} & set(request.data):
            return Response({'success': False, 'message': 'Only the applicant can provide applicant or parent/guardian signatures.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        serializer = MembershipSerializer(membership, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            updated = MembershipService.update_application(membership=membership, validated_data=serializer.validated_data)
        except ValueError as error:
            return Response({'success': False, 'message': str(error), 'errors': {}}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': True, 'message': 'Application details updated.', 'data': MembershipSerializer(updated).data})

    def delete(self, request, membership_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        membership = get_object_or_none(Membership, pk=membership_id)
        if membership is None:
            return Response({'success': False, 'message': 'Membership not found or already deleted.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        try:
            MembershipService.delete_membership(membership=membership)
        except Exception:
            logger.exception('Could not permanently delete membership %s', membership_id)
            return Response({'success': False, 'message': 'Membership deletion could not be completed safely.', 'errors': {}}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'success': True, 'message': 'Membership permanently deleted. The website account remains active.', 'data': {}}, status=status.HTTP_200_OK)


class MembershipPdfView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, membership_id):
        membership = get_object_or_none(Membership, pk=membership_id)
        if membership is None:
            return Response({'success': False, 'message': 'Membership not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        if not is_admin(request.user) and membership.user != request.user:
            return Response({'success': False, 'message': 'You do not have permission to download this application.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        if membership.status != Membership.Status.APPROVED or membership.official_form_version != 1 or not membership.application_pdf:
            return Response({'success': False, 'message': 'The official form is available only after approval.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        response = HttpResponse(bytes(membership.application_pdf), content_type='application/pdf')
        disposition = 'attachment' if request.query_params.get('download') == '1' else 'inline'
        response['Content-Disposition'] = f'{disposition}; filename="{membership.application_id}.pdf"'
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response


class MembershipApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, membership_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        membership = get_object_or_none(Membership, pk=membership_id)
        if membership is None:
            return Response({'success': False, 'message': 'Membership not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        try:
            membership = MembershipService.approve(
                membership=membership, admin=request.user,
                signature_data=request.data.get('authorized_signature', ''),
                signature_name=request.data.get('authorized_signature_name', ''),
            )
        except ValueError as error:
            return Response({'success': False, 'message': str(error), 'errors': {}}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception('Could not complete membership approval for %s', membership_id)
            return Response({'success': False, 'message': 'Could not create and save the official form. Approval was not completed.', 'errors': {}}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'success': True, 'message': 'Membership approved.', 'data': MembershipSerializer(membership).data})


class MembershipRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, membership_id):
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin permission required.', 'errors': {}}, status=status.HTTP_403_FORBIDDEN)
        membership = get_object_or_none(Membership, pk=membership_id)
        if membership is None:
            return Response({'success': False, 'message': 'Membership not found.', 'errors': {}}, status=status.HTTP_404_NOT_FOUND)
        try:
            MembershipService.reject(membership=membership, admin=request.user, reason=request.data.get('rejection_reason', ''))
        except ValueError as error:
            return Response({'success': False, 'message': str(error), 'errors': {}}, status=status.HTTP_409_CONFLICT)
        return Response({'success': True, 'message': 'Membership rejected.', 'data': MembershipSerializer(membership).data})
