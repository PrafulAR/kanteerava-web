from rest_framework import serializers

from .models import Membership


class MembershipSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    pdf_available = serializers.SerializerMethodField()
    applicant_signature_available = serializers.SerializerMethodField()
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    member_id = serializers.SerializerMethodField()
    applicant_signature_upload = serializers.CharField(write_only=True, required=False, allow_blank=True)
    applicant_signature_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    photo_upload = serializers.CharField(write_only=True, required=False, allow_blank=True)
    photo_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Membership
        fields = ['id', 'application_id', 'member_id', 'pdf_available', 'applicant_signature_available', 'user_name', 'user_email', 'user_phone', 'member_type', 'status', 'scout_id', 'date_of_birth', 'gender', 'address', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship', 'parent_or_guardian', 'contact_phone', 'postal_code', 'school_college', 'grade_section', 'hobbies', 'introduced_by', 'preferred_patrol', 'previous_experience', 'joining_date', 'rejection_reason', 'submitted_at', 'approved_at', 'applicant_signature_upload', 'applicant_signature_name', 'photo_upload', 'photo_name']
        read_only_fields = ['id', 'application_id', 'member_id', 'pdf_available', 'applicant_signature_available', 'user_name', 'user_email', 'user_phone', 'status', 'scout_id', 'rejection_reason', 'submitted_at', 'approved_at']

    def get_pdf_available(self, obj):
        return obj.status == Membership.Status.APPROVED and obj.official_form_version == 1 and bool(obj.application_pdf)

    def get_applicant_signature_available(self, obj):
        return bool(obj.applicant_signature)

    def get_member_id(self, obj):
        return obj.scout_id or obj.application_id

    def validate(self, attrs):
        if attrs.get('joining_date') and attrs['joining_date'] < attrs['date_of_birth']:
            raise serializers.ValidationError({'joining_date': 'Joining date cannot be before date of birth.'})
        return attrs
