import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from .models import Customer, Transaction

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user():
    return User.objects.create_superuser('admin', 'admin@example.com', 'password')

@pytest.fixture
def staff_user():
    return User.objects.create_user('staff', 'staff@example.com', 'password', is_staff=True)

@pytest.fixture
def customer():
    return Customer.objects.create(name="Test User", balance=10.0)

@pytest.mark.django_db
class TestCustomerAPI:
    def test_recharge_success(self, api_client, staff_user, customer):
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-recharge')
        data = {'customer_id': str(customer.id), 'amount': 50.0}
        
        response = api_client.post(url, data, format='json')
        assert response.status_code == 200
        assert response.data['success'] is True
        
        customer.refresh_from_db()
        assert customer.balance == 60.0
        assert Transaction.objects.count() == 1
        assert Transaction.objects.first().type == 'recharge'

    def test_recharge_user_not_found(self, api_client, staff_user):
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-recharge')
        import uuid
        data = {'customer_id': str(uuid.uuid4()), 'amount': 50.0}
        
        response = api_client.post(url, data, format='json')
        assert response.status_code == 404
        assert response.data['error'] == 'User Not Found'

    def test_checkin_success(self, api_client, staff_user, customer):
        api_client.force_authenticate(user=staff_user)
        url = reverse('customer-checkin')
        data = {'customer_id': str(customer.id)}
        
        response = api_client.post(url, data, format='json')
        assert response.status_code == 200
        assert response.data['success'] is True
        
        assert Transaction.objects.count() == 1
        assert Transaction.objects.first().type == 'checkin'

    def test_unauthenticated_access(self, api_client, customer):
        url = reverse('customer-list')
        response = api_client.get(url)
        assert response.status_code == 401
