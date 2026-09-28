import re

from django.utils import timezone
from rest_framework import serializers

from .models import Membership


class MembershipSerializer(serializers.ModelSerializer):
    GENDER_VALUES = {'Male', 'Female', 'Other', 'Prefer not to say'}
    RELATIONSHIP_VALUES = {'Parent', 'Legal Guardian', 'Grandparent', 'Sibling', 'Relative', 'Other'}
    TEXT_LIMITS = {
        'address': 1000,
        'hobbies': 1000,
        'previous_experience': 2000,
        'rejection_reason': 1000,
    }
    id = serializers.CharField(source='pk', read_only=True)
    pdf_available = serializers.SerializerMethodField()
    applicant_signature_available = serializers.SerializerMethodField()
    guardian_signature_available = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    member_id = serializers.SerializerMethodField()
    applicant_signature_upload = serializers.CharField(write_only=True, required=False, allow_blank=True)
    applicant_signature_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    guardian_signature_upload = serializers.CharField(write_only=True, required=False, allow_blank=True)
    guardian_signature_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    photo_upload = serializers.CharField(write_only=True, required=False, allow_blank=True)
    photo_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    fee_acknowledged = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = Membership
        fields = ['id', 'application_id', 'member_id', 'pdf_available', 'applicant_signature_available', 'guardian_signature_available', 'user_name', 'user_email', 'user_phone', 'applicant_name', 'member_type', 'status', 'scout_id', 'date_of_birth', 'gender', 'address', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship', 'parent_or_guardian', 'guardian_type', 'contact_phone', 'postal_code', 'school_college', 'grade_section', 'hobbies', 'introduced_by', 'previous_experience', 'joining_date', 'rejection_reason', 'submitted_at', 'approved_at', 'fee_acknowledged', 'applicant_signature_upload', 'applicant_signature_name', 'guardian_signature_upload', 'guardian_signature_name', 'photo_upload', 'photo_name']
        read_only_fields = ['id', 'application_id', 'member_id', 'pdf_available', 'applicant_signature_available', 'guardian_signature_available', 'user_name', 'user_email', 'user_phone', 'status', 'scout_id', 'rejection_reason', 'submitted_at', 'approved_at']

    def get_pdf_available(self, obj):
        return obj.status == Membership.Status.APPROVED and obj.official_form_version == 1 and bool(obj.application_pdf)

    def get_applicant_signature_available(self, obj):
        return bool(obj.applicant_signature)

    def get_guardian_signature_available(self, obj):
        return bool(obj.guardian_signature)

    def get_user_name(self, obj):
        return obj.applicant_name or obj.user.full_name

    def get_member_id(self, obj):
        return obj.scout_id or obj.application_id

    def validate(self, attrs):
        if 'applicant_name' in attrs and not str(attrs.get('applicant_name', '')).strip():
            raise serializers.ValidationError({'applicant_name': 'Name of Applicant (In Block letters) is required.'})
        if self.instance is None:
            required_fields = {
                'applicant_name': 'Name of Applicant (In Block letters)',
                'parent_or_guardian': 'Father’s / Mother’s / Guardian’s Name',
                'contact_phone': 'Contact Number(s)',
                'guardian_type': 'Parent/Guardian Type',
                'postal_code': 'PIN / Postal Code',
                'gender': 'Gender',
                'school_college': 'Name of School/College',
                'grade_section': 'Grade & Section',
                'joining_date': 'Joining Date',
            }
            missing = {field: f'{label} is required.' for field, label in required_fields.items() if not str(attrs.get(field, '')).strip()}
            if not attrs.get('applicant_signature_upload'):
                missing['applicant_signature_upload'] = 'Applicant Signature is required.'
            if not attrs.get('guardian_signature_upload'):
                missing['guardian_signature_upload'] = 'Parent / Guardian Signature is required.'
            if not attrs.get('photo_upload'):
                missing['photo_upload'] = 'Member Photo is required.'
            if attrs.get('fee_acknowledged') is not True:
                missing['fee_acknowledged'] = 'Please acknowledge the membership fee declaration before submitting your application.'
            if attrs.get('gender') and attrs['gender'] not in self.GENDER_VALUES:
                missing['gender'] = 'Select a valid Gender.'
            if attrs.get('emergency_contact_relationship') and attrs['emergency_contact_relationship'] not in self.RELATIONSHIP_VALUES:
                missing['emergency_contact_relationship'] = 'Select a valid Relationship.'
            if missing:
                raise serializers.ValidationError(missing)
        else:
            # The acknowledgement is an immutable submission-time record.
            attrs.pop('fee_acknowledged', None)
        if 'postal_code' in attrs and str(attrs['postal_code']).strip():
            postal_code = str(attrs['postal_code']).strip()
            if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9 -]{1,10}[A-Za-z0-9]', postal_code):
                raise serializers.ValidationError({'postal_code': 'Enter a valid PIN / Postal Code using 3 to 12 letters, numbers, spaces or hyphens.'})
            attrs['postal_code'] = postal_code
        for field in ('contact_phone', 'emergency_contact_phone'):
            if field not in attrs:
                continue
            value = str(attrs[field]).strip()
            digits = re.sub(r'\D', '', value)
            if not re.fullmatch(r'[0-9+()\s-]+', value) or not 7 <= len(digits) <= 15:
                raise serializers.ValidationError({field: 'Enter a valid phone number containing 7 to 15 digits.'})
            attrs[field] = value
        for field, maximum in self.TEXT_LIMITS.items():
            if field in attrs and len(str(attrs[field])) > maximum:
                raise serializers.ValidationError({field: f'Ensure this field has no more than {maximum} characters.'})
        if attrs.get('date_of_birth') and attrs['date_of_birth'] > timezone.localdate():
            raise serializers.ValidationError({'date_of_birth': 'Date of Birth cannot be in the future.'})
        if attrs.get('joining_date') and attrs['joining_date'] > timezone.localdate():
            raise serializers.ValidationError({'joining_date': 'Joining Date cannot be in the future.'})
        if attrs.get('joining_date') and attrs.get('date_of_birth') and attrs['joining_date'] < attrs['date_of_birth']:
            raise serializers.ValidationError({'joining_date': 'Joining date cannot be before date of birth.'})
        return attrs
