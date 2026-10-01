"""Targeted tests for conditional membership fields and PDF mapping."""

from datetime import date
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from PIL import Image

from accounts.models import User

from .document import build_official_pdf
from .models import Membership
from .serializers import MembershipSerializer
from .services import MembershipService


def signature_bytes():
    output = BytesIO()
    Image.new('RGBA', (400, 100), (255, 255, 255, 0)).save(output, 'PNG')
    return output.getvalue()


def photo_bytes():
    output = BytesIO()
    Image.new('RGB', (240, 320), 'white').save(output, 'JPEG')
    return output.getvalue()


def document_membership(member_type, **overrides):
    values = {
        'Status': Membership.Status,
        'status': Membership.Status.APPROVED,
        'member_type': member_type,
        'application_id': 'XVK_DOCUMENT_2026_10000',
        'user': SimpleNamespace(full_name='Example Member', email='member@test.invalid', phone=''),
        'applicant_name': 'EXAMPLE MEMBER',
        'parent_or_guardian': 'Example Guardian',
        'date_of_birth': date(1990, 1, 1),
        'address': 'Chamrajpet, Bengaluru',
        'contact_phone': '9000000000',
        'emergency_contact_name': '',
        'emergency_contact_phone': '9000000001',
        'emergency_contact_relationship': 'Legal Guardian',
        'postal_code': '560018',
        'school_college': '',
        'grade_section': '',
        'hobbies': '',
        'introduced_by': '',
        'gender': 'Other',
        'previous_experience': '',
        'joining_date': date(2020, 1, 1),
        'submitted_at': timezone.now(),
        'approved_at': timezone.now(),
        'applicant_signature': signature_bytes(),
        'guardian_signature': None,
        'admin_signature': signature_bytes(),
        'member_photo': photo_bytes(),
        'get_guardian_type_display': lambda: 'Guardian',
        'get_member_type_display': lambda: Membership.MemberType(member_type).label,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


class ConditionalApplicationSerializerTests(SimpleTestCase):
    def valid_payload(self, member_type=Membership.MemberType.SCOUT):
        return {
            'applicant_name': 'EXAMPLE MEMBER',
            'member_type': member_type,
            'date_of_birth': '1990-01-01',
            'address': 'Chamrajpet, Bengaluru',
            'contact_phone': '9000000000',
            'parent_or_guardian': 'Example Guardian',
            'emergency_contact_phone': '9000000001',
            'emergency_contact_relationship': 'Legal Guardian',
            'guardian_type': Membership.GuardianType.GUARDIAN,
            'postal_code': '560018',
            'gender': 'Other',
            'school_college': 'Example College',
            'grade_section': 'Alumni',
            'joining_date': '2020-01-01',
            'applicant_signature_upload': 'applicant-data',
            'applicant_signature_name': 'applicant.png',
            'guardian_signature_upload': 'guardian-data',
            'guardian_signature_name': 'guardian.png',
            'photo_upload': 'photo-data',
            'photo_name': 'photo.jpg',
            'fee_acknowledged': True,
        }

    def test_scout_still_requires_school_grade_and_guardian_signature(self):
        for field in ('school_college', 'grade_section', 'guardian_signature_upload'):
            with self.subTest(field=field):
                payload = self.valid_payload()
                payload[field] = ''
                serializer = MembershipSerializer(data=payload)
                self.assertFalse(serializer.is_valid())
                self.assertIn(field, serializer.errors)

    def test_leader_and_life_member_allow_blank_conditional_fields(self):
        for member_type in (Membership.MemberType.LEADER, Membership.MemberType.ALUMNI):
            for field in ('school_college', 'grade_section', 'guardian_signature_upload'):
                with self.subTest(member_type=member_type, field=field):
                    payload = self.valid_payload(member_type)
                    payload[field] = ''
                    serializer = MembershipSerializer(data=payload)
                    self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_leader_and_life_member_still_require_applicant_signature(self):
        for member_type in (Membership.MemberType.LEADER, Membership.MemberType.ALUMNI):
            with self.subTest(member_type=member_type):
                payload = self.valid_payload(member_type)
                payload['applicant_signature_upload'] = ''
                serializer = MembershipSerializer(data=payload)
                self.assertFalse(serializer.is_valid())
                self.assertIn('applicant_signature_upload', serializer.errors)

    def test_removed_emergency_name_is_optional_but_relationship_is_preserved(self):
        payload = self.valid_payload()
        self.assertNotIn('emergency_contact_name', payload)
        serializer = MembershipSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['emergency_contact_name'], '')
        self.assertEqual(serializer.validated_data['emergency_contact_relationship'], 'Legal Guardian')


class ConditionalApplicationServiceTests(TestCase):
    def service_payload(self, member_type):
        return {
            'applicant_name': 'EXAMPLE MEMBER',
            'member_type': member_type,
            'date_of_birth': date(1990, 1, 1),
            'address': 'Chamrajpet, Bengaluru',
            'contact_phone': '9000000000',
            'parent_or_guardian': 'Example Guardian',
            'emergency_contact_phone': '9000000001',
            'emergency_contact_relationship': 'Legal Guardian',
            'guardian_type': Membership.GuardianType.GUARDIAN,
            'postal_code': '560018',
            'gender': 'Other',
            'school_college': 'Example College',
            'grade_section': 'Alumni',
            'joining_date': date(2020, 1, 1),
            'applicant_signature_upload': 'applicant-data',
            'applicant_signature_name': 'applicant.png',
            'guardian_signature_upload': 'guardian-data',
            'guardian_signature_name': 'guardian.png',
            'photo_upload': 'photo-data',
            'photo_name': 'photo.jpg',
            'fee_acknowledged': True,
        }

    @staticmethod
    def normalized_image(_data, _name, *, kind):
        return signature_bytes() if kind == 'signature' else photo_bytes()

    def test_service_rejects_missing_conditional_fields_for_scout(self):
        user = User.objects.create_user(
            email='scout-rules@test.invalid', password='testpass123', full_name='Scout Applicant',
        )
        for field in ('school_college', 'grade_section', 'guardian_signature_upload'):
            with self.subTest(field=field), patch(
                'memberships.services.normalize_image_upload', side_effect=self.normalized_image,
            ):
                payload = self.service_payload(Membership.MemberType.SCOUT)
                payload[field] = ''
                with self.assertRaises(ValueError):
                    MembershipService.submit(user=user, validated_data=payload)
        self.assertEqual(Membership.objects.count(), 0)

    def test_service_accepts_leader_and_life_member_without_conditional_fields(self):
        for index, member_type in enumerate((Membership.MemberType.LEADER, Membership.MemberType.ALUMNI)):
            with self.subTest(member_type=member_type), patch(
                'memberships.services.normalize_image_upload', side_effect=self.normalized_image,
            ):
                user = User.objects.create_user(
                    email=f'special-{index}@test.invalid', password='testpass123', full_name='Special Applicant',
                )
                payload = self.service_payload(member_type)
                payload['school_college'] = ''
                payload['grade_section'] = ''
                payload['guardian_signature_upload'] = ''
                payload['guardian_signature_name'] = ''
                membership = MembershipService.submit(user=user, validated_data=payload)
                self.assertEqual(membership.school_college, '')
                self.assertEqual(membership.grade_section, '')
                self.assertIsNone(membership.guardian_signature)
                self.assertEqual(membership.emergency_contact_relationship, 'Legal Guardian')

    def test_service_rejects_special_sections_without_applicant_signature(self):
        for index, member_type in enumerate((Membership.MemberType.LEADER, Membership.MemberType.ALUMNI)):
            with self.subTest(member_type=member_type), patch(
                'memberships.services.normalize_image_upload', side_effect=self.normalized_image,
            ):
                user = User.objects.create_user(
                    email=f'unsigned-{index}@test.invalid', password='testpass123', full_name='Unsigned Applicant',
                )
                payload = self.service_payload(member_type)
                payload['applicant_signature_upload'] = ''
                payload['guardian_signature_upload'] = ''
                with self.assertRaisesRegex(ValueError, 'Applicant Signature is required'):
                    MembershipService.submit(user=user, validated_data=payload)


class ConditionalMembershipPdfTests(SimpleTestCase):
    def test_leader_and_life_member_pdfs_allow_blank_conditional_fields(self):
        for member_type in (Membership.MemberType.LEADER, Membership.MemberType.ALUMNI):
            with self.subTest(member_type=member_type):
                pdf = build_official_pdf(document_membership(member_type))
                self.assertTrue(pdf.startswith(b'%PDF-'))

    def test_normal_section_pdf_still_requires_guardian_signature(self):
        with self.assertRaisesRegex(ValueError, 'signatures are required'):
            build_official_pdf(document_membership(Membership.MemberType.SCOUT))

    def test_guardian_pdf_row_uses_type_name_and_phone_not_relationship(self):
        for relationship in ('Parent', 'Other'):
            with self.subTest(relationship=relationship), patch(
                'memberships.document.BaseDocTemplate.build', autospec=True,
            ) as build_mock:
                membership = document_membership(
                    Membership.MemberType.SCOUT,
                    guardian_signature=signature_bytes(),
                    get_guardian_type_display=lambda: 'Father',
                    parent_or_guardian='Venkatesh Bhat',
                    emergency_contact_phone='+91 8217337806',
                    emergency_contact_name='Old redundant value',
                    emergency_contact_relationship=relationship,
                )
                build_official_pdf(membership)
                fields = {field.label: field.value for field in build_mock.call_args.args[1]}
                self.assertEqual(
                    fields['Relationship / Name / Phone No.'],
                    'Father / Venkatesh Bhat / +91 8217337806',
                )

    def test_legacy_pdf_falls_back_to_existing_emergency_name(self):
        with patch('memberships.document.BaseDocTemplate.build', autospec=True) as build_mock:
            membership = document_membership(
                Membership.MemberType.SCOUT,
                guardian_signature=signature_bytes(),
                parent_or_guardian='',
                emergency_contact_name='Legacy Guardian Value',
                emergency_contact_relationship='',
            )
            build_official_pdf(membership)
            fields = {field.label: field.value for field in build_mock.call_args.args[1]}
            self.assertEqual(
                fields['Relationship / Name / Phone No.'],
                'Guardian / Legacy Guardian Value / 9000000001',
            )


class ConditionalApprovalTests(SimpleTestCase):
    def test_leader_and_life_member_can_be_approved_without_guardian_signature(self):
        for member_type in (Membership.MemberType.LEADER, Membership.MemberType.ALUMNI):
            with self.subTest(member_type=member_type), patch(
                'memberships.services.normalize_image_upload', return_value=signature_bytes(),
            ), patch('memberships.services.build_official_pdf', return_value=b'%PDF-1.4'), patch(
                'memberships.services.Membership.objects.filter',
            ) as filter_mock:
                filter_mock.return_value.update.return_value = 1
                user = SimpleNamespace(role=member_type)
                membership = SimpleNamespace(
                    pk='membership-id',
                    status=Membership.Status.PENDING,
                    member_type=member_type,
                    applicant_signature=signature_bytes(),
                    guardian_signature=None,
                    updated_at=timezone.now(),
                    approved_at=None,
                    approved_by=None,
                    admin_signature=None,
                    scout_id='',
                    application_id='XVK_SPECIAL_2026_10000',
                    application_pdf=None,
                    official_form_version=0,
                    user=user,
                    refresh_from_db=lambda: None,
                )
                approved = MembershipService.approve(
                    membership=membership,
                    admin=SimpleNamespace(),
                    signature_data='authorized-data',
                    signature_name='authorized.png',
                )
                self.assertEqual(approved.status, Membership.Status.APPROVED)

    def test_scout_cannot_be_approved_without_guardian_signature(self):
        membership = SimpleNamespace(
            status=Membership.Status.PENDING,
            member_type=Membership.MemberType.SCOUT,
            applicant_signature=signature_bytes(),
            guardian_signature=None,
        )
        with self.assertRaisesRegex(ValueError, 'parent or guardian must provide'):
            MembershipService.approve(
                membership=membership,
                admin=SimpleNamespace(),
                signature_data='authorized-data',
                signature_name='authorized.png',
            )
