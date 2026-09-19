"""Focused checks for the private, approval-only membership document."""

import base64
import re
from datetime import date
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from PIL import Image

from .document import build_official_pdf
from .models import Membership
from .uploads import normalize_image_upload
from .services import MembershipService
from .views import MembershipPdfView
from rest_framework.test import APIRequestFactory, force_authenticate
from accounts.models import User


def signature_bytes():
    output = BytesIO()
    Image.new('RGBA', (400, 100), (255, 255, 255, 0)).save(output, 'PNG')
    return output.getvalue()


def sample_membership(**overrides):
    values = dict(
        Status=Membership.Status, status=Membership.Status.APPROVED,
        application_id='XVK_SCO_TEST', user=SimpleNamespace(full_name='Example Member', email='example@test.invalid', phone=''),
        parent_or_guardian='Example Guardian', date_of_birth=date(2004, 10, 13),
        address='Chamrajpet, Bengaluru', contact_phone='9000000000', emergency_contact_name='Example Guardian',
        emergency_contact_phone='9000000001', postal_code='560018', school_college='', grade_section='',
        hobbies='', introduced_by='', gender='', emergency_contact_relationship='', preferred_patrol='',
        previous_experience='', joining_date=None, submitted_at=timezone.now(), approved_at=timezone.now(),
        applicant_signature=signature_bytes(), admin_signature=signature_bytes(), guardian_signature=None,
        member_photo=None, get_member_type_display=lambda: 'Scout',
    )
    values.update(overrides)
    return SimpleNamespace(**values)


class MembershipDocumentTests(SimpleTestCase):
    def test_normal_application_is_one_a4_page(self):
        pdf = build_official_pdf(sample_membership())
        self.assertTrue(pdf.startswith(b'%PDF-'))
        self.assertEqual(len(re.findall(rb'/Type\s*/Page\b', pdf)), 1)
        self.assertIn(b'/MediaBox [ 0 0 595.2756 841.8898 ]', pdf)

    def test_long_fields_flow_to_additional_page(self):
        pdf = build_official_pdf(sample_membership(address='A very long residential address, ' * 75, hobbies='Camping, hiking and community service, ' * 65))
        self.assertGreaterEqual(len(re.findall(rb'/Type\s*/Page\b', pdf)), 2)

    def test_both_signatures_are_required(self):
        with self.assertRaisesRegex(ValueError, 'signatures are required'):
            build_official_pdf(sample_membership(admin_signature=None))


class PrivateImageValidationTests(SimpleTestCase):
    def test_signature_is_normalized_to_png(self):
        encoded = base64.b64encode(signature_bytes()).decode('ascii')
        result = normalize_image_upload(f'data:image/png;base64,{encoded}', 'signature.png', kind='signature')
        self.assertTrue(result.startswith(b'\x89PNG'))

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


class ApprovalFlowTests(SimpleTestCase):
    def test_pdf_failure_does_not_save_approval(self):
        member = sample_membership(status=Membership.Status.PENDING, pk='test-id', updated_at=timezone.now(), scout_id='', refresh_from_db=lambda: None)
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


class MembershipWorkflowIntegrationTests(TestCase):
    def test_pending_then_one_private_immutable_approved_pdf(self):
        applicant = User.objects.create_user(email='applicant@test.invalid', password='testpass', full_name='Example Member')
        administrator = User.objects.create_superuser(email='admin@test.invalid', password='testpass', full_name='Administrator')
        outsider = User.objects.create_user(email='outsider@test.invalid', password='testpass', full_name='Outsider')
        signature = f'data:image/png;base64,{base64.b64encode(signature_bytes()).decode("ascii")}'
        member = MembershipService.submit(user=applicant, validated_data={
            'member_type': Membership.MemberType.SCOUT, 'date_of_birth': date(2004, 10, 13),
            'address': 'A long but ordinary Bengaluru address', 'parent_or_guardian': 'Example Guardian',
            'emergency_contact_name': 'Example Guardian', 'emergency_contact_phone': '9000000000',
            'emergency_contact_relationship': 'Parent',
            'applicant_signature_upload': signature, 'applicant_signature_name': 'applicant.png',
        })
        self.assertEqual(member.status, Membership.Status.PENDING)
        self.assertFalse(member.application_pdf)
        self.assertEqual(member.official_form_version, 0)

        member = MembershipService.approve(membership=member, admin=administrator, signature_data=signature, signature_name='admin.png')
        original_pdf = bytes(member.application_pdf)
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
