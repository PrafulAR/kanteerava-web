"""Regression tests for account roles across the membership API workflow."""

import base64
from datetime import date
from io import BytesIO
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from accounts.authentication import tokens_for_user
from accounts.models import User

from .models import Membership


def image_data_url(image_format, mode, color):
    output = BytesIO()
    Image.new(mode, (400, 160), color).save(output, image_format)
    encoded = base64.b64encode(output.getvalue()).decode('ascii')
    media_type = 'jpeg' if image_format == 'JPEG' else image_format.lower()
    return f'data:image/{media_type};base64,{encoded}'


class MembershipRoleApiWorkflowTests(TestCase):
    def setUp(self):
        self.signature = image_data_url('PNG', 'RGBA', (255, 255, 255, 0))
        self.photo = image_data_url('JPEG', 'RGB', (30, 60, 90))
        self.reviewer = User.objects.create_superuser(
            email='reviewer@test.invalid',
            password='testpass123',
            full_name='Review Administrator',
        )

    @staticmethod
    def client_for(user):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens_for_user(user)['access']}")
        return client

    def application_payload(self, member_type):
        payload = {
            'applicant_name': 'TEST APPLICANT',
            'member_type': member_type,
            'date_of_birth': date(1990, 1, 1).isoformat(),
            'gender': 'Other',
            'address': 'Chamrajpet, Bengaluru',
            'emergency_contact_name': '',
            'emergency_contact_phone': '9000000001',
            'emergency_contact_relationship': 'Parent',
            'parent_or_guardian': 'Example Guardian',
            'guardian_type': Membership.GuardianType.GUARDIAN,
            'contact_phone': '9000000000',
            'postal_code': '560018',
            'school_college': '' if member_type == Membership.MemberType.LEADER else 'Example College',
            'grade_section': '' if member_type == Membership.MemberType.LEADER else 'Alumni',
            'hobbies': '',
            'introduced_by': '',
            'previous_experience': '',
            'joining_date': timezone.localdate().isoformat(),
            'fee_acknowledged': True,
            'applicant_signature_upload': self.signature,
            'applicant_signature_name': 'applicant.png',
            'photo_upload': self.photo,
            'photo_name': 'member.jpg',
        }
        if member_type != Membership.MemberType.LEADER:
            payload.update({
                'guardian_signature_upload': self.signature,
                'guardian_signature_name': 'guardian.png',
            })
        return payload

    def submit(self, user, member_type):
        response = self.client_for(user).post(
            '/api/memberships/apply/',
            self.application_payload(member_type),
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        return Membership.objects.get(pk=response.data['data']['id'])

    def approve(self, reviewer, membership):
        with patch('memberships.services.build_official_pdf', return_value=b'%PDF-1.4 test'):
            response = self.client_for(reviewer).post(
                f'/api/memberships/{membership.pk}/approve/',
                {
                    'authorized_signature': self.signature,
                    'authorized_signature_name': 'authorized.png',
                },
                format='json',
            )
        self.assertEqual(response.status_code, 200, response.data)
        membership.refresh_from_db()
        return membership

    def assert_admin_workflow_preserves_role(self, member_type, suffix):
        administrator = User.objects.create_user(
            email=f'admin-{suffix}@test.invalid',
            password='testpass123',
            full_name='Admin Member',
            role=User.Role.ADMIN,
            is_staff=True,
        )
        administrator.refresh_from_db()
        self.assertEqual(administrator.role, User.Role.ADMIN)

        membership = self.submit(administrator, member_type)
        administrator.refresh_from_db()
        self.assertEqual(administrator.role, User.Role.ADMIN)

        # This mirrors the real single-admin flow: the applicant approves their
        # own pending membership through the authenticated approval endpoint.
        membership = self.approve(administrator, membership)
        administrator.refresh_from_db()
        self.assertEqual(administrator.role, User.Role.ADMIN)
        self.assertTrue(administrator.is_staff)
        self.assertFalse(administrator.is_superuser)
        self.assertEqual(membership.member_type, member_type)

        authenticated_client = self.client_for(administrator)
        current_user_response = authenticated_client.get('/api/auth/me/')
        self.assertEqual(current_user_response.status_code, 200, current_user_response.data)
        self.assertEqual(current_user_response.data['data']['role'], User.Role.ADMIN)
        self.assertTrue(current_user_response.data['data']['is_admin'])

        own_membership_response = authenticated_client.get('/api/memberships/?mine=1')
        self.assertEqual(own_membership_response.status_code, 200, own_membership_response.data)
        self.assertEqual(len(own_membership_response.data['data']), 1)
        self.assertEqual(own_membership_response.data['data'][0]['id'], str(membership.pk))
        self.assertEqual(own_membership_response.data['data'][0]['member_type'], member_type)
        self.assertEqual(own_membership_response.data['data'][0]['status'], Membership.Status.APPROVED)

        admin_workspace_response = authenticated_client.get('/api/memberships/admin-dashboard/')
        self.assertEqual(admin_workspace_response.status_code, 200, admin_workspace_response.data)

    def test_admin_leader_membership_preserves_admin_role_across_complete_api_workflow(self):
        self.assert_admin_workflow_preserves_role(Membership.MemberType.LEADER, 'leader')

    def test_admin_rover_membership_preserves_admin_role_across_complete_api_workflow(self):
        self.assert_admin_workflow_preserves_role(Membership.MemberType.ROVER, 'rover')

    def test_superuser_admin_flags_survive_complete_api_workflow(self):
        administrator = User.objects.create_superuser(
            email='admin-superuser@test.invalid',
            password='testpass123',
            full_name='Superuser Member',
        )
        self.assertEqual(administrator.role, User.Role.ADMIN)

        membership = self.submit(administrator, Membership.MemberType.ROVER)
        administrator.refresh_from_db()
        self.assertEqual(administrator.role, User.Role.ADMIN)

        membership = self.approve(administrator, membership)
        administrator.refresh_from_db()
        self.assertEqual(administrator.role, User.Role.ADMIN)
        self.assertTrue(administrator.is_staff)
        self.assertTrue(administrator.is_superuser)
        self.assertEqual(membership.member_type, Membership.MemberType.ROVER)

    def test_ordinary_users_still_receive_their_approved_membership_role(self):
        for index, member_type in enumerate((Membership.MemberType.LEADER, Membership.MemberType.ROVER)):
            with self.subTest(member_type=member_type):
                user = User.objects.create_user(
                    email=f'member-{index}@test.invalid',
                    password='testpass123',
                    full_name='Ordinary Member',
                )
                membership = self.submit(user, member_type)
                user.refresh_from_db()
                self.assertEqual(user.role, User.Role.USER)

                membership = self.approve(self.reviewer, membership)
                user.refresh_from_db()
                self.assertEqual(user.role, member_type)
                self.assertFalse(user.is_staff)
                self.assertFalse(user.is_superuser)
                self.assertEqual(membership.member_type, member_type)

                own_response = self.client_for(user).get('/api/memberships/?mine=1')
                self.assertEqual(own_response.status_code, 200, own_response.data)
                self.assertEqual(len(own_response.data['data']), 1)
                self.assertEqual(own_response.data['data'][0]['id'], str(membership.pk))

    def test_admin_deleting_own_membership_leaves_personal_list_empty_not_another_users_membership(self):
        administrator = User.objects.create_user(
            email='admin-delete-own@test.invalid',
            password='testpass123',
            full_name='Admin Member',
            role=User.Role.ADMIN,
            is_staff=True,
        )
        own_membership = self.approve(
            administrator,
            self.submit(administrator, Membership.MemberType.LEADER),
        )
        other_user = User.objects.create_user(
            email='other-scout@test.invalid',
            password='testpass123',
            full_name='Other Scout',
        )
        other_membership = self.approve(
            self.reviewer,
            self.submit(other_user, Membership.MemberType.SCOUT),
        )

        client = self.client_for(administrator)
        delete_response = client.delete(f'/api/memberships/{own_membership.pk}/')
        self.assertEqual(delete_response.status_code, 200, delete_response.data)

        own_response = client.get('/api/memberships/?mine=1')
        self.assertEqual(own_response.status_code, 200, own_response.data)
        self.assertEqual(own_response.data['data'], [])

        global_response = client.get('/api/memberships/')
        self.assertEqual(global_response.status_code, 200, global_response.data)
        self.assertEqual([item['id'] for item in global_response.data['data']], [str(other_membership.pk)])

    def test_admin_deleting_another_users_membership_preserves_personal_membership(self):
        administrator = User.objects.create_user(
            email='admin-delete-other@test.invalid',
            password='testpass123',
            full_name='Admin Member',
            role=User.Role.ADMIN,
            is_staff=True,
        )
        own_membership = self.approve(
            administrator,
            self.submit(administrator, Membership.MemberType.LEADER),
        )
        other_user = User.objects.create_user(
            email='other-rover@test.invalid',
            password='testpass123',
            full_name='Other Rover',
        )
        other_membership = self.approve(
            self.reviewer,
            self.submit(other_user, Membership.MemberType.ROVER),
        )

        client = self.client_for(administrator)
        own_response_before_delete = client.get('/api/memberships/?mine=1')
        self.assertEqual(own_response_before_delete.status_code, 200, own_response_before_delete.data)
        self.assertEqual([item['id'] for item in own_response_before_delete.data['data']], [str(own_membership.pk)])

        global_response_before_delete = client.get('/api/memberships/')
        self.assertEqual(global_response_before_delete.status_code, 200, global_response_before_delete.data)
        self.assertEqual(
            {item['id'] for item in global_response_before_delete.data['data']},
            {str(own_membership.pk), str(other_membership.pk)},
        )

        delete_response = client.delete(f'/api/memberships/{other_membership.pk}/')
        self.assertEqual(delete_response.status_code, 200, delete_response.data)

        own_response = client.get('/api/memberships/?mine=1')
        self.assertEqual(own_response.status_code, 200, own_response.data)
        self.assertEqual(len(own_response.data['data']), 1)
        self.assertEqual(own_response.data['data'][0]['id'], str(own_membership.pk))
        self.assertEqual(own_response.data['data'][0]['member_type'], Membership.MemberType.LEADER)
        self.assertEqual(own_response.data['data'][0]['status'], Membership.Status.APPROVED)
