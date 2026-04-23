"""
Custom User model for Venuity.

Extends Django's AbstractUser so we can add business-specific fields
without losing any of Django's built-in auth machinery.

Why a custom User model from the start?
    Migrating from Django's default User to a custom one mid-project is
    painful and requires data migrations. Starting with AUTH_USER_MODEL = 'users.User'
    from day one avoids this entirely.

Future role fields (e.g., venue_id, role = MANAGER|CASHIER|VIEWER) should
be added here as the business grows.
"""

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    Venuity's base User model.

    Inherits all standard Django fields:
        username, email, password, first_name, last_name,
        is_active, is_staff, is_superuser, last_login, date_joined.

    Role map (using built-in flags for now):
        is_superuser=True  → Full admin (can manage settings, users, exports)
        is_staff=True      → Operator (can do check-in, recharge, view customers)
        is_staff=False     → Read-only / no access (reserved for future use)

    When complex roles are needed:
        1. Add a `role` CharField with choices here.
        2. Update common/permissions.py to check the new field.
        3. Create a migration.
    """

    # A UUID surrogate key for external-facing IDs.
    # The `id` (Django's BigAutoField) remains the internal primary key.
    # This separation means:
    #   - Internal JOINs use the fast integer PK.
    #   - API responses expose the UUID (no sequential ID enumeration attacks).
    public_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name=_('public ID'),
        help_text=_('UUID exposed in the API. Not the database primary key.'),
    )

    # -------------- Future role scaffold ---------------
    # Uncomment and migrate when multi-role support is needed:
    #
    # class Role(models.TextChoices):
    #     ADMIN   = 'admin',   _('Admin')
    #     MANAGER = 'manager', _('Manager')
    #     CASHIER = 'cashier', _('Cashier')
    #     VIEWER  = 'viewer',  _('Viewer')
    #
    # role = models.CharField(
    #     max_length=20,
    #     choices=Role.choices,
    #     default=Role.CASHIER,
    #     db_index=True,
    # )
    # ---------------------------------------------------

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['username']

    def __str__(self):
        return self.username

    @property
    def is_admin(self):
        """Convenience property for views and templates."""
        return self.is_superuser
