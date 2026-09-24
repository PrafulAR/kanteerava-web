from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models
from django_mongodb_backend.fields import ObjectIdAutoField


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required.')
        user = self.model(email=self.normalize_email(email).strip().casefold(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', self.model.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser):
    class Role(models.TextChoices):
        USER = 'USER', 'User'
        SCOUT = 'SCOUT', 'Scout'
        GUIDE = 'GUIDE', 'Guide'
        CUB = 'CUB', 'Cub'
        BULBUL = 'BULBUL', 'Bulbul'
        ROVER = 'ROVER', 'Rover'
        RANGER = 'RANGER', 'Ranger'
        ALUMNI = 'ALUMNI', 'Life Member'
        LEADER = 'LEADER', 'Leader'
        ADMIN = 'ADMIN', 'Admin'

    id = ObjectIdAutoField(primary_key=True)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    email_verified = models.BooleanField(default=True)
    auth_version = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser


class EmailOTPChallenge(models.Model):
    class Purpose(models.TextChoices):
        REGISTRATION = 'REGISTRATION_EMAIL_VERIFICATION', 'Registration email verification'
        PASSWORD_RESET = 'PASSWORD_RESET', 'Password reset'

    id = ObjectIdAutoField(primary_key=True)
    public_id = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name='email_otp_challenges')
    email = models.EmailField()
    purpose = models.CharField(max_length=40, choices=Purpose.choices)
    code_digest = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    resend_available_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)
    send_count = models.PositiveSmallIntegerField(default=1)
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']


class PasswordResetGrant(models.Model):
    id = ObjectIdAutoField(primary_key=True)
    public_id = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_grants')
    token_digest = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class GoogleIdentity(models.Model):
    id = ObjectIdAutoField(primary_key=True)
    subject = models.CharField(max_length=255, unique=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='google_identity')
    created_at = models.DateTimeField(auto_now_add=True)
