from django.conf import settings
from django.db import models
from django.db.models import Q
from django_mongodb_backend.fields import ObjectIdAutoField


class Membership(models.Model):
    class GuardianType(models.TextChoices):
        FATHER = 'FATHER', 'Father'
        MOTHER = 'MOTHER', 'Mother'
        GUARDIAN = 'GUARDIAN', 'Guardian'

    class MemberType(models.TextChoices):
        SCOUT = 'SCOUT', 'Scout'
        GUIDE = 'GUIDE', 'Guide'
        CUB = 'CUB', 'Cub'
        BULBUL = 'BULBUL', 'Bulbul'
        ROVER = 'ROVER', 'Rover'
        RANGER = 'RANGER', 'Ranger'
        ALUMNI = 'ALUMNI', 'Life Member'
        LEADER = 'LEADER', 'Leader'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    id = ObjectIdAutoField(primary_key=True)
    application_id = models.CharField(max_length=40, unique=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberships')
    applicant_name = models.CharField(max_length=150, blank=True, default='')
    member_type = models.CharField(max_length=10, choices=MemberType.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    scout_id = models.CharField(max_length=50, blank=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=30, blank=True)
    address = models.TextField()
    emergency_contact_name = models.CharField(max_length=150)
    emergency_contact_phone = models.CharField(max_length=30)
    emergency_contact_relationship = models.CharField(max_length=80)
    parent_or_guardian = models.CharField(max_length=150, blank=True)
    guardian_type = models.CharField(max_length=10, choices=GuardianType.choices, blank=True, default='')
    contact_phone = models.CharField(max_length=30, blank=True)
    postal_code = models.CharField(max_length=12, blank=True)
    school_college = models.CharField(max_length=200, blank=True)
    grade_section = models.CharField(max_length=100, blank=True)
    hobbies = models.TextField(blank=True)
    introduced_by = models.CharField(max_length=200, blank=True)
    preferred_patrol = models.CharField(max_length=100, blank=True)
    previous_experience = models.TextField(blank=True)
    applicant_signature = models.BinaryField(null=True, blank=True)
    guardian_signature = models.BinaryField(null=True, blank=True)
    admin_signature = models.BinaryField(null=True, blank=True)
    member_photo = models.BinaryField(null=True, blank=True)
    joining_date = models.DateField(null=True, blank=True)
    fee_acknowledged = models.BooleanField(default=False)
    rejection_reason = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='approved_memberships')
    application_pdf = models.BinaryField(null=True, blank=True)
    official_form_version = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=Q(status__in=['PENDING', 'APPROVED']),
                name='unique_active_membership_per_user',
            ),
        ]


class RetiredApplicationNumber(models.Model):
    """Non-PII tombstone that prevents a deleted official number being reused."""

    id = ObjectIdAutoField(primary_key=True)
    application_id = models.CharField(max_length=40, unique=True)
    retired_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-retired_at']
