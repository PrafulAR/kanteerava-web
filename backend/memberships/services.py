import logging
import secrets

from django.db import IntegrityError
from django.utils import timezone

from .document import build_official_pdf
from .models import Membership, RetiredApplicationNumber
from .uploads import normalize_image_upload


logger = logging.getLogger(__name__)


class MembershipService:
    APPLICATION_SECTION_NAMES = {
        Membership.MemberType.CUB: 'CUB',
        Membership.MemberType.BULBUL: 'BULBUL',
        Membership.MemberType.SCOUT: 'SCOUT',
        Membership.MemberType.GUIDE: 'GUIDE',
        Membership.MemberType.ROVER: 'ROVER',
        Membership.MemberType.RANGER: 'RANGER',
        Membership.MemberType.ALUMNI: 'LIFEMEMBER',
        Membership.MemberType.LEADER: 'LEADER',
    }
    REQUIRED_APPLICATION_FIELDS = {
        'member_type': 'Wing / Section',
        'applicant_name': 'Name of Applicant (In Block letters)',
        'date_of_birth': 'Date of Birth',
        'address': 'Residential Address',
        'contact_phone': 'Contact Number(s)',
        'parent_or_guardian': 'Father’s / Guardian’s Name',
        'guardian_type': 'Parent/Guardian Type',
        'emergency_contact_name': 'Father/Mother/Guardian',
        'emergency_contact_phone': 'Father/Mother/Guardian Contact Number',
        'emergency_contact_relationship': 'Relationship',
        'postal_code': 'Pin Code',
        'gender': 'Gender',
        'school_college': 'Name of School/College',
        'grade_section': 'Grade & Section',
        'joining_date': 'Joining Date',
    }

    @classmethod
    def new_application_id(cls, member_type, year=None):
        """Allocate a short reference while the ObjectId remains the internal key."""
        application_year = year or timezone.localdate().year
        section_name = cls.APPLICATION_SECTION_NAMES.get(member_type)
        if not section_name:
            raise ValueError('A valid Wing / Section is required to allocate an application number.')
        for _ in range(100):
            reference = f'XVK_{section_name}_{application_year}_{secrets.randbelow(90000) + 10000}'
            if not Membership.objects.filter(application_id=reference).exists() and not RetiredApplicationNumber.objects.filter(application_id=reference).exists():
                return reference
        raise ValueError('Unable to allocate a unique application number. Please try again.')

    @staticmethod
    def _extract_private_images(values, *, require_signatures=False):
        values = dict(values)
        signature_data = values.pop('applicant_signature_upload', '')
        signature_name = values.pop('applicant_signature_name', '')
        guardian_signature_data = values.pop('guardian_signature_upload', '')
        guardian_signature_name = values.pop('guardian_signature_name', '')
        photo_data = values.pop('photo_upload', '')
        photo_name = values.pop('photo_name', '')
        private = {}
        if signature_data:
            private['applicant_signature'] = normalize_image_upload(signature_data, signature_name, kind='signature')
        elif require_signatures:
            raise ValueError('Applicant Signature is required before submitting the application.')
        if guardian_signature_data:
            private['guardian_signature'] = normalize_image_upload(guardian_signature_data, guardian_signature_name, kind='signature')
        elif require_signatures:
            raise ValueError('Parent / Guardian Signature is required before submitting the application.')
        if photo_data:
            private['member_photo'] = normalize_image_upload(photo_data, photo_name, kind='photo')
        elif require_signatures:
            raise ValueError('Member Photo is required before submitting the application.')
        return values, private

    @staticmethod
    def submit(*, user, validated_data):
        active_application = Membership.objects.filter(
            user=user,
            status__in=[Membership.Status.PENDING, Membership.Status.APPROVED],
        ).first()
        if active_application:
            raise ValueError('You already have an active membership application.')
        if not str(user.email or '').strip():
            raise ValueError('E-mail Id is required on the account.')
        if validated_data.get('fee_acknowledged') is not True:
            raise ValueError('Please acknowledge the membership fee declaration before submitting your application.')
        for field, label in MembershipService.REQUIRED_APPLICATION_FIELDS.items():
            value = validated_data.get(field)
            if value is None or (isinstance(value, str) and not value.strip()):
                raise ValueError(f'{label} is required.')
        if validated_data['joining_date'] > timezone.localdate():
            raise ValueError('Joining Date cannot be in the future.')
        values, private = MembershipService._extract_private_images(validated_data, require_signatures=True)
        for _ in range(100):
            try:
                return Membership.objects.create(
                    application_id=MembershipService.new_application_id(values['member_type']),
                    user=user,
                    status=Membership.Status.PENDING,
                    **values,
                    **private,
                )
            except IntegrityError:
                if Membership.objects.filter(
                    user=user,
                    status__in=[Membership.Status.PENDING, Membership.Status.APPROVED],
                ).exists():
                    raise ValueError('You already have an active membership application.')
                continue
        raise ValueError('Unable to allocate a unique application number. Please try again.')

    @staticmethod
    def approve(*, membership, admin, signature_data, signature_name):
        if membership.status != Membership.Status.PENDING:
            raise ValueError('Only pending applications can be approved.')
        if not membership.applicant_signature:
            raise ValueError('The applicant must provide a signature before approval.')
        if not membership.guardian_signature:
            raise ValueError('The parent or guardian must provide a signature before approval.')
        authorized_signature = normalize_image_upload(signature_data, signature_name, kind='signature')

        approved_on = timezone.now()
        membership.status = Membership.Status.APPROVED
        membership.approved_at = approved_on
        membership.approved_by = admin
        membership.admin_signature = authorized_signature
        membership.scout_id = membership.scout_id or membership.application_id
        pdf = build_official_pdf(membership)

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
                logger.exception('Approved membership %s, but account role sync failed', membership.pk)
        return membership

    @staticmethod
    def reject(*, membership, admin, reason=''):
        if membership.status != Membership.Status.PENDING:
            raise ValueError('Only pending applications can be rejected.')
        changed = Membership.objects.filter(
            pk=membership.pk, status=Membership.Status.PENDING, updated_at=membership.updated_at,
        ).update(
            status=Membership.Status.REJECTED,
            rejection_reason=reason,
            approved_by=admin,
            application_pdf=None,
            updated_at=timezone.now(),
        )
        if changed != 1:
            raise ValueError('The application changed during rejection. Reload and try again.')
        membership.refresh_from_db()
        return membership

    @staticmethod
    def update_application(*, membership, validated_data):
        if membership.status != Membership.Status.PENDING:
            raise ValueError('Only pending applications can be corrected.')
        values, private = MembershipService._extract_private_images(validated_data)
        for field, value in {**values, **private}.items():
            setattr(membership, field, value)
        membership.application_pdf = None
        membership.save()
        return membership

    @staticmethod
    def delete_membership(*, membership):
        """Delete membership-owned data while preserving the authentication account."""
        user = membership.user
        old_role = user.role
        replacement = Membership.objects.filter(
            user=user, status=Membership.Status.APPROVED,
        ).exclude(pk=membership.pk).first()
        membership_roles = set(Membership.MemberType.values)
        next_role = replacement.member_type if replacement else type(user).Role.USER
        change_role = (
            not user.is_superuser
            and old_role != type(user).Role.ADMIN
            and old_role in membership_roles
            and old_role != next_role
        )

        retired_reference, reservation_created = RetiredApplicationNumber.objects.get_or_create(
            application_id=membership.application_id,
        )
        try:
            if change_role:
                user.role = next_role
                user.save(update_fields=['role', 'updated_at'])
            membership.delete()
        except Exception:
            if change_role:
                user.role = old_role
                user.save(update_fields=['role', 'updated_at'])
            if reservation_created:
                retired_reference.delete()
            raise
