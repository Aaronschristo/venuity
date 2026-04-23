"""
Reusable permission classes for the Venuity backend.

Django's built-in permissions are granular (add/change/delete/view per model)
but they don't map cleanly to business roles like "Staff" vs "Admin".

This module defines higher-level role-based permissions that wrap the built-in
system. When more complex roles are introduced (e.g., venue manager, cashier),
add new permission classes here.

Design Rule:
    - Views should specify ONE of these classes in permission_classes.
    - Never mix IsStaff + IsAdminUser in the same list; that creates ambiguity.
    - For public endpoints, use: permission_classes = [AllowAny]
"""

from rest_framework.permissions import BasePermission, IsAuthenticated


class IsAdminUser(BasePermission):
    """
    Allows access only to superusers (full admin rights).

    Use for: Settings management, user management, export, delete operations.
    """

    message = 'You do not have permission to perform this action. Admin access required.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )


class IsStaffUser(BasePermission):
    """
    Allows access to staff users AND superusers.

    Use for: Day-to-day operations — check-in, recharge, view customers.
    Staff is_staff=True means they are an operator (e.g., front desk).
    """

    message = 'You do not have permission to perform this action. Staff access required.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission: the requesting user owns the object, or is an admin.

    To use this, the target model must have a `user` FK to the User model,
    or override `has_object_permission` in your view.
    """

    message = 'You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        return getattr(obj, 'user', None) == request.user
