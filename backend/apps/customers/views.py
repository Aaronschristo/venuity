"""
Views for the customers app.

Design principles:
    - Views are thin: parse input → call service → return response.
    - All business logic is in services.py.
    - Permission classes from common/permissions.py are used (not ad-hoc checks).
    - All responses use serializers — no hand-crafted dicts in views.

Endpoints:
    GET    /api/v1/customers/              — List customers (paginated, searchable)
    POST   /api/v1/customers/              — Create a new customer
    GET    /api/v1/customers/<public_id>/  — Retrieve a single customer
    DELETE /api/v1/customers/<public_id>/  — Delete a customer (admin only)
    POST   /api/v1/customers/checkin/      — Process a check-in
    POST   /api/v1/customers/recharge/     — Add credit to a customer
    GET    /api/v1/customers/<public_id>/qr/ — Serve the QR code image
"""

import logging
from decimal import Decimal

from django.http import FileResponse, Http404
from django.conf import settings
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsStaffUser, IsAdminUser
from .models import Customer
from .serializers import (
    CustomerSerializer,
    CustomerCreateSerializer,
    RechargeSerializer,
    CheckinSerializer,
)
from . import services
from apps.settings_app.services import get_checkin_fee

logger = logging.getLogger(__name__)


class CustomerListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/customers/ — Paginated list of customers (supports ?search= and ?ordering=)
    POST /api/v1/customers/ — Create a new customer
    """

    permission_classes = [IsStaffUser]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CustomerCreateSerializer
        return CustomerSerializer

    def get_queryset(self):
        qs = Customer.objects.all()
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = CustomerCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            customer = services.create_customer(
                name=data['name'],
                initial_balance=data['initial_balance'],
                qr_id=data.get('qr_id'),
            )
        except services.CustomerValidationError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            CustomerSerializer(customer).data,
            status=status.HTTP_201_CREATED,
        )


class CustomerDetailView(generics.RetrieveDestroyAPIView):
    """
    GET    /api/v1/customers/<public_id>/ — Retrieve customer details
    DELETE /api/v1/customers/<public_id>/ — Delete customer (admin only)
    """

    serializer_class = CustomerSerializer
    lookup_field = 'public_id'

    def get_permissions(self):
        if self.request.method == 'DELETE':
            return [IsAdminUser()]
        return [IsStaffUser()]

    def get_queryset(self):
        return Customer.objects.all()

    def destroy(self, request, *args, **kwargs):
        public_id = kwargs.get('public_id')
        try:
            services.delete_customer(str(public_id))
        except services.CustomerNotFoundError:
            return Response({'error': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerRechargeView(APIView):
    """
    POST /api/v1/customers/recharge/

    Adds credit to a customer's balance and records a transaction.
    Body: { "customer_id": "<uuid>", "amount": 100.00 }
    """

    permission_classes = [IsStaffUser]

    def post(self, request):
        serializer = RechargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            customer = services.recharge_customer(
                public_id=str(data['customer_id']),
                amount=data['amount'],
            )
        except services.CustomerNotFoundError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except services.CustomerValidationError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'customer': CustomerSerializer(customer).data,
        })


class CustomerCheckinView(APIView):
    """
    POST /api/v1/customers/checkin/

    Processes a check-in for a customer. The check-in fee is read from
    the application settings (so it can be changed without a redeploy).

    Body: { "qr_id": "<uuid>" }  OR  { "customer_id": "<uuid>" }
    """

    permission_classes = [IsStaffUser]

    def post(self, request):
        serializer = CheckinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        fee = get_checkin_fee()

        try:
            customer = services.checkin_customer(
                public_id=str(data['customer_id']) if data.get('customer_id') else None,
                qr_id=str(data['qr_id']) if data.get('qr_id') else None,
                fee=fee,
            )
        except services.CustomerNotFoundError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except services.InsufficientBalanceError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_402_PAYMENT_REQUIRED)
        except services.CustomerValidationError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'customer': CustomerSerializer(customer).data,
            'fee_charged': str(fee),
        })


class CustomerQRCodeView(APIView):
    """
    GET /api/v1/customers/<public_id>/qr/

    Serves the customer's QR code image as a PNG file.
    The image is identified by the customer's qr_id (not public_id).
    """

    permission_classes = [IsStaffUser]

    def get(self, request, public_id):
        try:
            customer = services.get_customer_by_public_id(str(public_id))
        except (services.CustomerNotFoundError, services.CustomerValidationError):
            raise Http404('Customer not found.')

        qr_path = settings.QR_CODE_DIR / f'{customer.qr_id}.png'

        if not qr_path.exists():
            # Regenerate if the file was lost
            services._generate_qr_code(str(customer.qr_id))

        if not qr_path.exists():
            return Response(
                {'error': 'QR code image not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return FileResponse(open(qr_path, 'rb'), content_type='image/png')
