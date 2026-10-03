"""Focused checks for the private, approval-only membership document."""

import base64
import re
from datetime import date, timedelta
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from PIL import Image

from .document import _membership_applicant_name, build_official_pdf
from .models import Membership, RetiredApplicationNumber
from .serializers import MembershipSerializer
from .uploads import normalize_image_upload
from .services import MembershipService
from .views import MembershipDetailView, MembershipPdfView, MembershipRejectView, MembershipResourcesView
from rest_framework.test import APIRequestFactory, force_authenticate
from accounts.models import User


def signature_bytes():
    output = BytesIO()
    Image.new('RGBA', (400, 100), (255, 255, 255, 0)).save(output, 'PNG')
    return output.getvalue()


def photo_bytes():
    output = BytesIO()
    Image.new('RGB', (240, 320), 'white').save(output, 'JPEG')
    return output.getvalue()


def sample_membership(**overrides):
    values = dict(
        Status=Membership.Status, status=Membership.Status.APPROVED,
        application_id='XVK_SCOUT_2026_12345', user=SimpleNamespace(full_name='Example Member', email='example@test.invalid', phone=''),
        applicant_name='OFFICIAL APPLICANT NAME',
        parent_or_guardian='Example Guardian', date_of_birth=date(2004, 10, 13),
        address='Chamrajpet, Bengaluru', contact_phone='9000000000', emergency_contact_name='Example Guardian',
        guardian_contact_phone='9000000001', emergency_contact_phone='9000000002', postal_code='560018', school_college='', grade_section='',
        hobbies='', introduced_by='', gender='', emergency_contact_relationship='', preferred_patrol='',
        previous_experience='', joining_date=None, submitted_at=timezone.now(), approved_at=timezone.now(),
        applicant_signature=signature_bytes(), admin_signature=signature_bytes(), guardian_signature=signature_bytes(),
        member_photo=None, get_member_type_display=lambda: 'Scout',
    )
    values.update(overrides)
    return SimpleNamespace(**values)


class MembershipDocumentTests(SimpleTestCase):
    def test_pdf_name_comes_from_the_membership_snapshot(self):
        membership = sample_membership(
            applicant_name='PRAFUL A R',
            user=SimpleNamespace(full_name='Account Name', email='example@test.invalid', phone=''),
        )
        self.assertEqual(_membership_applicant_name(membership), 'PRAFUL A R')

    def test_normal_application_is_one_a4_page(self):
        pdf = build_official_pdf(sample_membership())
        self.assertTrue(pdf.startswith(b'%PDF-'))
        self.assertEqual(len(re.findall(rb'/Type\s*/Page\b', pdf)), 1)
        self.assertIn(b'/MediaBox [ 0 0 595.2756 841.8898 ]', pdf)

    def test_long_fields_flow_to_additional_page(self):
        pdf = build_official_pdf(sample_membership(address='A very long residential address, ' * 75, hobbies='Camping, hiking and community service, ' * 65))
        self.assertGreaterEqual(len(re.findall(rb'/Type\s*/Page\b', pdf)), 2)

    def test_all_three_signatures_are_required(self):
        with self.assertRaisesRegex(ValueError, 'signatures are required'):
            build_official_pdf(sample_membership(admin_signature=None))
        with self.assertRaisesRegex(ValueError, 'signatures are required'):
            build_official_pdf(sample_membership(guardian_signature=None))


class PrivateImageValidationTests(SimpleTestCase):
    @staticmethod
    def data_url(content, mime):
        encoded = base64.b64encode(content).decode('ascii')
        return f'data:{mime};base64,{encoded}'

    @staticmethod
    def image_bytes(image_format, size=(240, 320)):
        output = BytesIO()
        image = Image.new('RGB', size, 'navy')
        if image_format == 'MPO':
            second = Image.new('RGB', size, 'orange')
            image.save(output, format='MPO', save_all=True, append_images=[second])
        else:
            image.save(output, format=image_format)
        return output.getvalue()

    def assert_normalized_jpeg(self, result, expected_size=(240, 320)):
        with Image.open(BytesIO(result)) as normalized:
            self.assertEqual(normalized.format, 'JPEG')
            self.assertEqual(normalized.mode, 'RGB')
            self.assertEqual(normalized.size, expected_size)

    def test_applicant_guardian_and_drawn_signatures_still_normalize_to_png(self):
        encoded = base64.b64encode(signature_bytes()).decode('ascii')
        for filename in ('applicant.png', 'guardian.png', 'drawn-signature.png'):
            with self.subTest(filename=filename):
                result = normalize_image_upload(
                    f'data:image/png;base64,{encoded}',
                    filename,
                    kind='signature',
                )
                self.assertTrue(result.startswith(b'\x89PNG'))

    def test_jpeg_member_photo_is_accepted_and_normalized(self):
        result = normalize_image_upload(
            self.data_url(photo_bytes(), 'image/jpeg'),
            'android-photo.jpg',
            kind='photo',
        )
        self.assert_normalized_jpeg(result)

    def test_png_member_photo_is_normalized_to_jpeg(self):
        result = normalize_image_upload(
            self.data_url(self.image_bytes('PNG'), 'image/png'),
            'desktop-photo.png',
            kind='photo',
        )
        self.assert_normalized_jpeg(result)

    def test_heif_member_photo_is_normalized_to_jpeg(self):
        content = self.image_bytes('HEIF')
        for mime, filename in (
            ('image/heic', 'iphone-photo.heic'),
            ('image/heif', 'iphone-photo.heif'),
        ):
            with self.subTest(mime=mime, filename=filename):
                result = normalize_image_upload(
                    self.data_url(content, mime),
                    filename,
                    kind='photo',
                )
                self.assert_normalized_jpeg(result)

    def test_mpo_member_photo_is_normalized_to_jpeg(self):
        result = normalize_image_upload(
            self.data_url(self.image_bytes('MPO'), 'image/jpeg'),
            'iphone-photo.jpg',
            kind='photo',
        )
        self.assert_normalized_jpeg(result)

    def test_decoded_content_is_authoritative_when_iphone_metadata_differs(self):
        result = normalize_image_upload(
            self.data_url(photo_bytes(), 'image/heic'),
            'iphone-photo.heic',
            kind='photo',
        )
        self.assert_normalized_jpeg(result)

    def test_member_photo_exif_orientation_is_applied(self):
        output = BytesIO()
        exif = Image.Exif()
        exif[274] = 6
        Image.new('RGB', (240, 320), 'white').save(output, 'JPEG', exif=exif)
        result = normalize_image_upload(
            self.data_url(output.getvalue(), 'image/jpeg'),
            'rotated-photo.jpg',
            kind='photo',
        )
        self.assert_normalized_jpeg(result, expected_size=(320, 240))

    def test_corrupt_and_renamed_non_image_photos_are_rejected(self):
        samples = (
            (b'not-an-image', 'image/jpeg', 'photo.jpg'),
            (b'broken-heif', 'image/heic', 'photo.heic'),
        )
        for content, mime, filename in samples:
            with self.subTest(filename=filename), self.assertRaisesRegex(ValueError, 'Invalid photo image'):
                normalize_image_upload(
                    self.data_url(content, mime),
                    filename,
                    kind='photo',
                )

    def test_photo_over_five_megabytes_is_rejected_before_image_decode(self):
        oversized = b'0' * 5_000_001
        with self.assertRaisesRegex(ValueError, 'Photo image is too large'):
            normalize_image_upload(
                self.data_url(oversized, 'image/jpeg'),
                'oversized.jpg',
                kind='photo',
            )

    def test_too_small_and_too_large_photos_are_rejected(self):
        for size in ((119, 120), (5001, 120)):
            with self.subTest(size=size), self.assertRaisesRegex(ValueError, 'Photo dimensions'):
                normalize_image_upload(
                    self.data_url(self.image_bytes('PNG', size), 'image/png'),
                    'photo.png',
                    kind='photo',
                )

    def test_heif_is_not_accepted_for_signatures(self):
        with self.assertRaisesRegex(ValueError, 'Signature must be a PNG or JPG'):
            normalize_image_upload(
                self.data_url(self.image_bytes('HEIF'), 'image/heic'),
                'signature.heic',
                kind='signature',
            )

    def test_rejects_mismatched_extension(self):
        encoded = base64.b64encode(signature_bytes()).decode('ascii')
        with self.assertRaises(ValueError):
            normalize_image_upload(f'data:image/png;base64,{encoded}', 'signature.exe', kind='signature')

    def test_rejects_portrait_photo_as_signature(self):
        output = BytesIO()
        Image.new('RGB', (600, 800), 'white').save(output, 'JPEG')
        encoded = base64.b64encode(output.getvalue()).decode('ascii')
        with self.assertRaisesRegex(ValueError, 'wider than they are tall'):
            normalize_image_upload(f'data:image/jpeg;base64,{encoded}', 'portrait.jpg', kind='signature')


class MembershipApplicationValidationTests(SimpleTestCase):
    def valid_payload(self):
        return {
            'applicant_name': 'OFFICIAL APPLICANT NAME',
            'member_type': Membership.MemberType.SCOUT,
            'date_of_birth': '2004-10-13',
            'address': 'Chamrajpet, Bengaluru',
            'contact_phone': '9000000002',
            'parent_or_guardian': 'Example Guardian',
            'guardian_contact_phone': '9000000001',
            'emergency_contact_name': 'Emergency Person',
            'emergency_contact_phone': '9000000003',
            'emergency_contact_relationship': 'Sibling',
            'guardian_type': Membership.GuardianType.FATHER,
            'postal_code': '560018',
            'gender': 'Male',
            'school_college': 'Example School',
            'grade_section': '10 A',
            'joining_date': '2026-09-21',
            'applicant_signature_upload': 'applicant-data',
            'applicant_signature_name': 'applicant.png',
            'guardian_signature_upload': 'guardian-data',
            'guardian_signature_name': 'guardian.png',
            'photo_upload': 'photo-data',
            'photo_name': 'photo.jpg',
            'fee_acknowledged': True,
        }

    def test_visible_required_fields_are_enforced_by_api_serializer(self):
        for field in ('applicant_name', 'parent_or_guardian', 'guardian_type', 'guardian_contact_phone', 'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone', 'contact_phone', 'postal_code', 'gender', 'school_college', 'grade_section', 'joining_date', 'applicant_signature_upload', 'guardian_signature_upload', 'photo_upload'):
            payload = self.valid_payload()
            payload[field] = ''
            serializer = MembershipSerializer(data=payload)
            self.assertFalse(serializer.is_valid(), field)
            self.assertIn(field, serializer.errors)

    def test_indian_and_international_postal_codes_are_accepted(self):
        for postal_code in ('560018', 'SW1A 1AA', '10001-1234'):
            payload = self.valid_payload()
            payload['postal_code'] = postal_code
            serializer = MembershipSerializer(data=payload)
            self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_invalid_postal_codes_are_rejected(self):
        for postal_code in ('12', '-560018', 'SW1A_1AA', 'A' * 13):
            payload = self.valid_payload()
            payload['postal_code'] = postal_code
            serializer = MembershipSerializer(data=payload)
            self.assertFalse(serializer.is_valid(), postal_code)
            self.assertIn('postal_code', serializer.errors)

    def test_preferred_patrol_is_not_part_of_active_application_api(self):
        self.assertNotIn('preferred_patrol', MembershipSerializer().fields)

    def test_future_joining_date_is_rejected(self):
        payload = self.valid_payload()
        payload['joining_date'] = (timezone.localdate() + timedelta(days=1)).isoformat()
        serializer = MembershipSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn('joining_date', serializer.errors)

    def test_future_birth_date_and_invalid_phone_numbers_are_rejected(self):
        payload = self.valid_payload()
        payload['date_of_birth'] = (timezone.localdate() + timedelta(days=1)).isoformat()
        serializer = MembershipSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn('date_of_birth', serializer.errors)

        for field in ('contact_phone', 'guardian_contact_phone', 'emergency_contact_phone'):
            payload = self.valid_payload()
            payload[field] = 'not-a-phone'
            serializer = MembershipSerializer(data=payload)
            self.assertFalse(serializer.is_valid())
            self.assertIn(field, serializer.errors)

    def test_short_application_number_retries_collisions(self):
        with patch('memberships.services.secrets.randbelow', side_effect=[0, 1]), \
             patch('memberships.services.Membership.objects.filter') as filter_mock, \
             patch('memberships.services.RetiredApplicationNumber.objects.filter') as retired_filter_mock:
            filter_mock.return_value.exists.side_effect = [True, False]
            retired_filter_mock.return_value.exists.return_value = False
            self.assertEqual(MembershipService.new_application_id(Membership.MemberType.SCOUT, 2026), 'XVK_SCOUT_2026_10001')
            self.assertEqual(filter_mock.call_count, 2)

    def test_application_number_uses_the_official_section_names(self):
        expected_sections = {
            Membership.MemberType.CUB: 'CUB',
            Membership.MemberType.BULBUL: 'BULBUL',
            Membership.MemberType.SCOUT: 'SCOUT',
            Membership.MemberType.GUIDE: 'GUIDE',
            Membership.MemberType.ROVER: 'ROVER',
            Membership.MemberType.RANGER: 'RANGER',
            Membership.MemberType.ALUMNI: 'LIFEMEMBER',
        }
        with patch('memberships.services.secrets.randbelow', return_value=3821), \
             patch('memberships.services.Membership.objects.filter') as filter_mock, \
             patch('memberships.services.RetiredApplicationNumber.objects.filter') as retired_filter_mock:
            filter_mock.return_value.exists.return_value = False
            retired_filter_mock.return_value.exists.return_value = False
            for member_type, section_name in expected_sections.items():
                self.assertEqual(
                    MembershipService.new_application_id(member_type, 2026),
                    f'XVK_{section_name}_2026_13821',
                )

    def test_client_cannot_supply_the_authoritative_application_number(self):
        payload = self.valid_payload()
        payload['application_id'] = 'XVK_SCOUT_1999_10000'
        serializer = MembershipSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn('application_id', serializer.validated_data)

    def test_fee_acknowledgement_is_required(self):
        for value in (False, None):
            payload = self.valid_payload()
            if value is None:
                payload.pop('fee_acknowledged')
            else:
                payload['fee_acknowledged'] = value
            serializer = MembershipSerializer(data=payload)
            self.assertFalse(serializer.is_valid())
            self.assertIn('fee_acknowledged', serializer.errors)

    def test_fee_acknowledgement_true_is_accepted(self):
        serializer = MembershipSerializer(data=self.valid_payload())
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_model_declares_one_active_membership_per_user_constraint(self):
        constraint_names = {constraint.name for constraint in Membership._meta.constraints}
        self.assertIn('unique_active_membership_per_user', constraint_names)


class ApprovalFlowTests(SimpleTestCase):
    def test_pdf_failure_does_not_save_approval(self):
        member = sample_membership(member_type=Membership.MemberType.SCOUT, status=Membership.Status.PENDING, pk='test-id', updated_at=timezone.now(), scout_id='', refresh_from_db=lambda: None)
        admin = SimpleNamespace(role='ADMIN')
        with patch('memberships.services.normalize_image_upload', return_value=signature_bytes()), \
             patch('memberships.services.build_official_pdf', side_effect=RuntimeError('render failed')), \
             patch('memberships.services.Membership.objects.filter') as filter_mock:
            with self.assertRaisesRegex(RuntimeError, 'render failed'):
                MembershipService.approve(membership=member, admin=admin, signature_data='data', signature_name='signature.png')
            filter_mock.assert_not_called()

    def test_pdf_access_is_restricted_to_owner_and_admin(self):
        owner = SimpleNamespace(id='owner', is_authenticated=True, is_superuser=False, role='SCOUT')
        stranger = SimpleNamespace(id='stranger', is_authenticated=True, is_superuser=False, role='SCOUT')
        admin = SimpleNamespace(id='admin', is_authenticated=True, is_superuser=False, role='ADMIN')
        member = sample_membership(user=owner, application_pdf=b'%PDF-1.4', official_form_version=1)
        factory = APIRequestFactory()

        def response_for(user):
            request = factory.get('/memberships/test-id/pdf/')
            force_authenticate(request, user=user)
            return MembershipPdfView.as_view()(request, membership_id='test-id')

        with patch('memberships.views.Membership.objects.get', return_value=member):
            self.assertEqual(response_for(stranger).status_code, 403)
            self.assertEqual(response_for(owner).status_code, 200)
            self.assertEqual(response_for(admin).status_code, 200)
            member.status = Membership.Status.PENDING
            self.assertEqual(response_for(owner).status_code, 404)

    def test_concurrent_rejection_fails_without_overwriting_changed_application(self):
        member = sample_membership(
            status=Membership.Status.PENDING,
            pk='test-id',
            updated_at=timezone.now(),
        )
        admin = SimpleNamespace(role='ADMIN')
        with patch('memberships.services.Membership.objects.filter') as filter_mock:
            filter_mock.return_value.update.return_value = 0
            with self.assertRaisesRegex(ValueError, 'changed during rejection'):
                MembershipService.reject(membership=member, admin=admin, reason='Not eligible')


class MembershipWorkflowIntegrationTests(TestCase):
    def test_admin_reject_with_malformed_id_returns_not_found(self):
        administrator = User.objects.create_superuser(
            email='reject-admin@test.invalid', password='testpass123', full_name='Administrator',
        )
        factory = APIRequestFactory()
        request = factory.post('/memberships/not-an-id/reject/', {'rejection_reason': 'Not eligible'}, format='json')
        force_authenticate(request, user=administrator)

        response = MembershipRejectView.as_view()(request, membership_id='not-an-id')

        self.assertEqual(response.status_code, 404)

    def test_pending_then_one_private_immutable_approved_pdf(self):
        applicant = User.objects.create_user(email='applicant@test.invalid', password='testpass', full_name='Example Member')
        administrator = User.objects.create_superuser(email='admin@test.invalid', password='testpass', full_name='Administrator')
        outsider = User.objects.create_user(email='outsider@test.invalid', password='testpass', full_name='Outsider')
        signature = f'data:image/png;base64,{base64.b64encode(signature_bytes()).decode("ascii")}'
        photo = f'data:image/jpeg;base64,{base64.b64encode(photo_bytes()).decode("ascii")}'
        member = MembershipService.submit(user=applicant, validated_data={
            'applicant_name': 'OFFICIAL APPLICANT NAME',
            'member_type': Membership.MemberType.SCOUT, 'date_of_birth': date(2004, 10, 13),
            'address': 'A long but ordinary Bengaluru address', 'parent_or_guardian': 'Example Guardian',
            'contact_phone': '9000000002',
            'guardian_contact_phone': '9000000000',
            'emergency_contact_name': 'Emergency Person', 'emergency_contact_phone': '9000000003',
            'emergency_contact_relationship': 'Sibling',
            'guardian_type': Membership.GuardianType.FATHER,
            'postal_code': '560018', 'gender': 'Male', 'school_college': 'Example School',
            'grade_section': '10 A', 'joining_date': date(2026, 9, 21),
            'applicant_signature_upload': signature, 'applicant_signature_name': 'applicant.png',
            'guardian_signature_upload': signature, 'guardian_signature_name': 'guardian.png',
            'photo_upload': photo, 'photo_name': 'member.jpg',
            'fee_acknowledged': True,
        })
        with self.assertRaisesRegex(ValueError, 'already have an active membership application'):
            MembershipService.submit(user=applicant, validated_data={})
        submission_year = timezone.localdate().year
        self.assertRegex(member.application_id, rf'^XVK_SCOUT_{submission_year}_\d{{5}}$')
        self.assertEqual(member.applicant_name, 'OFFICIAL APPLICANT NAME')
        official_application_id = member.application_id
        self.assertEqual(member.status, Membership.Status.PENDING)
        self.assertFalse(member.application_pdf)
        self.assertEqual(member.official_form_version, 0)

        member = MembershipService.approve(membership=member, admin=administrator, signature_data=signature, signature_name='admin.png')
        original_pdf = bytes(member.application_pdf)
        self.assertEqual(member.application_id, official_application_id)
        self.assertEqual(member.status, Membership.Status.APPROVED)
        self.assertEqual(member.official_form_version, 1)
        self.assertTrue(original_pdf.startswith(b'%PDF-'))

        applicant.full_name = 'Name changed later'
        applicant.save(update_fields=['full_name', 'updated_at'])
        member.refresh_from_db()
        self.assertEqual(bytes(member.application_pdf), original_pdf)

        factory = APIRequestFactory()
        for user, expected_status in [(applicant, 200), (administrator, 200), (outsider, 403)]:
            request = factory.get(f'/memberships/{member.pk}/pdf/')
            force_authenticate(request, user=user)
            response = MembershipPdfView.as_view()(request, membership_id=str(member.pk))
            self.assertEqual(response.status_code, expected_status)
            if expected_status == 200:
                self.assertEqual(response.content, original_pdf)

    def test_admin_deletes_only_membership_and_account_can_reapply(self):
        application_year = timezone.localdate().year
        old_application_id = f'XVK_SCOUT_{application_year}_10000'
        applicant = User.objects.create_user(
            email='reapply@test.invalid', password='testpass123', full_name='Account Name', role=User.Role.SCOUT,
        )
        administrator = User.objects.create_superuser(
            email='delete-admin@test.invalid', password='testpass123', full_name='Administrator',
        )
        membership = Membership.objects.create(
            application_id=old_application_id,
            user=applicant,
            applicant_name='FIRST OFFICIAL NAME',
            member_type=Membership.MemberType.SCOUT,
            status=Membership.Status.APPROVED,
            date_of_birth=date(2004, 10, 13),
            address='Chamrajpet, Bengaluru',
            emergency_contact_name='Example Guardian',
            emergency_contact_phone='9000000001',
            emergency_contact_relationship='Parent',
            parent_or_guardian='Example Guardian',
            guardian_type=Membership.GuardianType.FATHER,
            contact_phone='9000000002',
            postal_code='560018',
            school_college='Example School',
            grade_section='10 A',
            applicant_signature=signature_bytes(),
            guardian_signature=signature_bytes(),
            admin_signature=signature_bytes(),
            member_photo=photo_bytes(),
            application_pdf=b'%PDF-1.4 approved snapshot',
            official_form_version=1,
            approved_at=timezone.now(),
            approved_by=administrator,
            joining_date=timezone.localdate(),
        )
        membership_pk = str(membership.pk)
        factory = APIRequestFactory()

        denied_request = factory.delete(f'/memberships/{membership_pk}/')
        force_authenticate(denied_request, user=applicant)
        denied_response = MembershipDetailView.as_view()(denied_request, membership_id=membership_pk)
        self.assertEqual(denied_response.status_code, 403)
        self.assertTrue(Membership.objects.filter(pk=membership.pk).exists())

        delete_request = factory.delete(f'/memberships/{membership_pk}/')
        force_authenticate(delete_request, user=administrator)
        delete_response = MembershipDetailView.as_view()(delete_request, membership_id=membership_pk)
        self.assertEqual(delete_response.status_code, 200)
        self.assertFalse(Membership.objects.filter(pk=membership.pk).exists())
        self.assertTrue(RetiredApplicationNumber.objects.filter(application_id=old_application_id).exists())

        repeated_request = factory.delete(f'/memberships/{membership_pk}/')
        force_authenticate(repeated_request, user=administrator)
        repeated_response = MembershipDetailView.as_view()(repeated_request, membership_id=membership_pk)
        self.assertEqual(repeated_response.status_code, 404)

        applicant.refresh_from_db()
        self.assertEqual(applicant.role, User.Role.USER)
        self.assertEqual(applicant.full_name, 'Account Name')
        self.assertTrue(applicant.check_password('testpass123'))

        signature = f'data:image/png;base64,{base64.b64encode(signature_bytes()).decode("ascii")}'
        photo = f'data:image/jpeg;base64,{base64.b64encode(photo_bytes()).decode("ascii")}'
        with patch('memberships.services.secrets.randbelow', side_effect=[0, 1]):
            reapplied = MembershipService.submit(user=applicant, validated_data={
                'applicant_name': 'SECOND OFFICIAL NAME',
                'member_type': Membership.MemberType.SCOUT,
                'date_of_birth': date(2004, 10, 13),
                'address': 'Chamrajpet, Bengaluru',
                'contact_phone': '9000000002',
                'parent_or_guardian': 'Example Guardian',
                'guardian_contact_phone': '9000000001',
                'emergency_contact_name': 'Emergency Person',
                'emergency_contact_phone': '9000000003',
                'emergency_contact_relationship': 'Sibling',
                'guardian_type': Membership.GuardianType.FATHER,
                'postal_code': '560018',
                'gender': 'Male',
                'school_college': 'Example School',
                'grade_section': '10 A',
                'joining_date': timezone.localdate(),
                'applicant_signature_upload': signature,
                'applicant_signature_name': 'applicant.png',
                'guardian_signature_upload': signature,
                'guardian_signature_name': 'guardian.png',
                'photo_upload': photo,
                'photo_name': 'member.jpg',
                'fee_acknowledged': True,
            })
        self.assertEqual(reapplied.application_id, f'XVK_SCOUT_{application_year}_10001')
        self.assertEqual(reapplied.applicant_name, 'SECOND OFFICIAL NAME')
        self.assertEqual(reapplied.status, Membership.Status.PENDING)
        applicant.refresh_from_db()
        self.assertEqual(applicant.full_name, 'Account Name')


class ApprovedMemberResourcesTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            email='resources@test.invalid', password='testpass123', full_name='Resource Member',
        )

    def response_for(self, user=None):
        request = self.factory.get('/memberships/resources/')
        if user is not None:
            force_authenticate(request, user=user)
        return MembershipResourcesView.as_view()(request)

    def create_membership(self, status):
        return Membership.objects.create(
            application_id=f'XVK_SCOUT_2026_{Membership.objects.count() + 20000}',
            user=self.user,
            applicant_name='RESOURCE MEMBER',
            member_type=Membership.MemberType.SCOUT,
            status=status,
            date_of_birth=date(2004, 10, 13),
            address='Chamrajpet, Bengaluru',
            emergency_contact_name='Example Guardian',
            emergency_contact_phone='9000000001',
            emergency_contact_relationship='Parent',
            parent_or_guardian='Example Guardian',
            guardian_type=Membership.GuardianType.FATHER,
            contact_phone='9000000002',
            postal_code='560018',
            school_college='Example School',
            grade_section='10 A',
            joining_date=timezone.localdate(),
            fee_acknowledged=True,
        )

    def test_resources_require_authentication(self):
        self.assertEqual(self.response_for().status_code, 401)

    def test_resources_reject_no_pending_and_rejected_memberships(self):
        self.assertEqual(self.response_for(self.user).status_code, 403)
        for membership_status in (Membership.Status.PENDING, Membership.Status.REJECTED):
            Membership.objects.all().delete()
            self.create_membership(membership_status)
            self.assertEqual(self.response_for(self.user).status_code, 403)

    def test_resources_are_available_to_approved_members_only(self):
        self.create_membership(Membership.Status.APPROVED)
        response = self.response_for(self.user)
        self.assertEqual(response.status_code, 200)
        self.assertEqual([resource['id'] for resource in response.data['data']], ['oyms', 'bsg-events'])
        self.assertEqual(response['Cache-Control'], 'private, no-store')
