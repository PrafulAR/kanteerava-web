import logging

from django.utils import timezone

from .document import build_official_pdf
from .models import Membership
from .uploads import normalize_image_upload


logger = logging.getLogger(__name__)


class MembershipService:
    APPLICATION_PREFIXES = {
        Membership.MemberType.SCOUT: 'XVK_SCO',
        Membership.MemberType.GUIDE: 'XVK_GUI',
        Membership.MemberType.CUB: 'XVK_CUB',
        Membership.MemberType.BULBUL: 'XVK_BUL',
        Membership.MemberType.ROVER: 'XVK_ROV',
        Membership.MemberType.RANGER: 'XVK_RAN',
        Membership.MemberType.ALUMNI: 'XVK_ALU',
        Membership.MemberType.LEADER: 'XVK_LEA',
    }

    @classmethod
    def application_id_for(cls, membership):
        return f'{cls.APPLICATION_PREFIXES[membership.member_type]}_{str(membership.pk).upper()}'

    @staticmethod
    def _extract_private_images(values, *, require_signature=False):
        values = dict(values)
        signature_data = values.pop('applicant_signature_upload', '')
        signature_name = values.pop('applicant_signature_name', '')
        photo_data = values.pop('photo_upload', '')
        photo_name = values.pop('photo_name', '')
        private = {}
        if signature_data:
            private['applicant_signature'] = normalize_image_upload(signature_data, signature_name, kind='signature')
        elif require_signature:
            raise ValueError('Your signature is required before submitting the application.')
        if photo_data:
            private['member_photo'] = normalize_image_upload(photo_data, photo_name, kind='photo')
        return values, private

    @staticmethod
    def submit(*, user, validated_data):
        active_application = Membership.objects.filter(
            user=user,
            status__in=[Membership.Status.PENDING, Membership.Status.APPROVED],
        ).first()
        if active_application:
            raise ValueError('You already have an active membership application.')
        values, private = MembershipService._extract_private_images(validated_data, require_signature=True)
        membership = Membership.objects.create(user=user, status=Membership.Status.PENDING, **values, **private)
        membership.application_id = MembershipService.application_id_for(membership)
        membership.save(update_fields=['application_id', 'updated_at'])
        return membership

    @staticmethod
    def approve(*, membership, admin, signature_data, signature_name):
        if membership.status != Membership.Status.PENDING:
            raise ValueError('Only pending applications can be approved.')
        if not membership.applicant_signature:
            raise ValueError('The applicant must provide a signature before approval.')
        authorized_signature = normalize_image_upload(signature_data, signature_name, kind='signature')

        # Render a complete approved snapshot before mutating database state.
        approved_on = timezone.now()
        membership.status = Membership.Status.APPROVED
        membership.approved_at = approved_on
        membership.approved_by = admin
        membership.admin_signature = authorized_signature
        membership.scout_id = membership.scout_id or membership.application_id
        pdf = build_official_pdf(membership)

        # An atomic single-document update prevents Approved-without-PDF.
        changed = Membership.objects.filter(
            pk=membership.pk, status=Membership.Status.PENDING, updated_at=membership.updated_at,
        ).update(
            status=Membership.Status.APPROVED,
            approved_at=approved_on,
            approved_by=admin,
            admin_signature=authorized_signature,
            scout_id=membership.scout_id,
            application_pdf=pdf,
            official_form_version=1,
            updated_at=timezone.now(),
        )
        if changed != 1:
            raise ValueError('The application changed during approval. Reload and try again.')
        membership.refresh_from_db()
        if membership.user.role != membership.member_type:
            try:
                membership.user.role = membership.member_type
                membership.user.save(update_fields=['role', 'updated_at'])
            except Exception:
                # The approved document is already stored atomically with status.
                # A separate account-role sync failure must not report PDF failure.
                logger.exception('Approved membership %s, but account role sync failed', membership.pk)
        return membership

    @staticmethod
    def reject(*, membership, admin, reason=''):
        if membership.status != Membership.Status.PENDING:
            raise ValueError('Only pending applications can be rejected.')
        membership.status = Membership.Status.REJECTED
        membership.rejection_reason = reason
        membership.approved_by = admin
        membership.application_pdf = None
        membership.save(update_fields=['status', 'rejection_reason', 'approved_by', 'application_pdf', 'updated_at'])
        return membership

    @staticmethod
    def update_application(*, membership, validated_data):
        if membership.status != Membership.Status.PENDING:
            raise ValueError('Only pending applications can be corrected.')
        values, private = MembershipService._extract_private_images(validated_data)
        previous_member_type = membership.member_type
        for field, value in {**values, **private}.items():
            setattr(membership, field, value)
        if membership.member_type != previous_member_type:
            membership.application_id = MembershipService.application_id_for(membership)
        membership.application_pdf = None
        membership.save()
        return membership
