"""
Tests for the customers app.

Tests are organized by feature, not by file.
Each test class is self-contained and uses fixtures via pytest-django.

Run with: pytest backend/apps/customers/tests/
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from apps.customers.models import Customer
from apps.transactions.models import Transaction

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        username='staff_operator',
        password='testpass123',
        is_staff=True,
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        username='admin_user',
        password='testpass123',
    )


@pytest.fixture
def customer(db):
    return Customer.objects.create(name='Alice Wonderland', balance=Decimal('200.00'))


# ---------------------------------------------------------------------------
# Customer CRUD
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCustomerCreation:
    def test_create_customer_success(self, api_client, staff_user):
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-list-create')
        response = api_client.post(url, {'name': 'Bob Test', 'initial_balance': '50.00'}, format='json')

        assert response.status_code == 201
        assert response.data['name'] == 'Bob Test'
        assert Decimal(response.data['balance']) == Decimal('50.00')
        assert 'public_id' in response.data
        assert 'qr_id' in response.data

        # Check a recharge transaction was created for the initial balance
        customer = Customer.objects.get(public_id=response.data['public_id'])
        assert Transaction.objects.filter(customer=customer).count() == 1

    def test_create_customer_empty_name_fails(self, api_client, staff_user):
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-list-create')
        response = api_client.post(url, {'name': '  ', 'initial_balance': '0'}, format='json')
        assert response.status_code == 400

    def test_create_customer_negative_balance_fails(self, api_client, staff_user):
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-list-create')
        response = api_client.post(url, {'name': 'Test', 'initial_balance': '-10'}, format='json')
        assert response.status_code == 400

    def test_unauthenticated_cannot_create(self, api_client):
        url = reverse('customer-list-create')
        response = api_client.post(url, {'name': 'Test', 'initial_balance': '0'}, format='json')
        assert response.status_code == 401


@pytest.mark.django_db
class TestCustomerList:
    def test_list_returns_paginated(self, api_client, staff_user):
        api_client.force_authenticate(user=staff_user)
        Customer.objects.bulk_create([
            Customer(name=f'Customer {i}') for i in range(15)
        ])
        url = reverse('customer-list-create')
        response = api_client.get(url)
        assert response.status_code == 200
        assert 'results' in response.data
        assert len(response.data['results']) == 10  # Default page size

    def test_search_by_name(self, api_client, staff_user, customer):
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-list-create')
        response = api_client.get(url, {'search': 'alice'})
        assert response.status_code == 200
        names = [c['name'] for c in response.data['results']]
        assert 'Alice Wonderland' in names


# ---------------------------------------------------------------------------
# Recharge
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestRecharge:
    def test_recharge_success(self, api_client, staff_user, customer):
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-recharge')
        initial_balance = customer.balance
        response = api_client.post(url, {
            'customer_id': str(customer.public_id),
            'amount': '100.00',
        }, format='json')

        assert response.status_code == 200
        assert response.data['success'] is True

        customer.refresh_from_db()
        assert customer.balance == initial_balance + Decimal('100.00')
        assert Transaction.objects.filter(
            customer=customer,
            transaction_type=Transaction.TransactionType.RECHARGE,
        ).count() == 1

    def test_recharge_zero_amount_fails(self, api_client, staff_user, customer):
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-recharge')
        response = api_client.post(url, {
            'customer_id': str(customer.public_id),
            'amount': '0.00',
        }, format='json')
        assert response.status_code == 400

    def test_recharge_nonexistent_customer(self, api_client, staff_user):
        import uuid
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-recharge')
        response = api_client.post(url, {
            'customer_id': str(uuid.uuid4()),
            'amount': '50.00',
        }, format='json')
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Check-in
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCheckin:
    def test_checkin_by_qr_id(self, api_client, staff_user, customer):
        from apps.settings_app.models import ApplicationSetting
        ApplicationSetting.objects.update_or_create(
            key='checkin_fee', defaults={'value': '50.00'}
        )
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-checkin')
        response = api_client.post(url, {'qr_id': str(customer.qr_id)}, format='json')

        assert response.status_code == 200
        assert response.data['success'] is True

        customer.refresh_from_db()
        assert customer.balance == Decimal('150.00')  # 200 - 50

    def test_checkin_insufficient_balance(self, api_client, staff_user):
        from apps.settings_app.models import ApplicationSetting
        ApplicationSetting.objects.update_or_create(
            key='checkin_fee', defaults={'value': '500.00'}
        )
        poor_customer = Customer.objects.create(name='Poor Customer', balance=Decimal('10.00'))
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-checkin')
        response = api_client.post(url, {'qr_id': str(poor_customer.qr_id)}, format='json')
        assert response.status_code == 402


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestCustomerDelete:
    def test_admin_can_delete(self, api_client, admin_user, customer):
        api_client.force_authenticate(user=admin_user)
        url = reverse('customer-detail', kwargs={'public_id': customer.public_id})
        response = api_client.delete(url)
        assert response.status_code == 204
        assert not Customer.objects.filter(public_id=customer.public_id).exists()

    def test_staff_cannot_delete(self, api_client, staff_user, customer):
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-detail', kwargs={'public_id': customer.public_id})
        response = api_client.delete(url)
        assert response.status_code == 403
