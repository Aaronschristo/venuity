"""
Service layer for the customers app.

The service layer is where ALL business logic lives.
Views are kept thin — they parse input, call a service function, return output.

Why a service layer?
    - Business logic is testable without an HTTP request context.
    - Multiple views (API, admin commands, management scripts) can share logic.
    - Atomic database operations are handled here, not scattered across views.

Raising Exceptions:
    Services raise standard Python/Django exceptions.
    Views catch them and translate to HTTP responses.
    This keeps the service layer HTTP-agnostic.
"""

import logging
import uuid
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.core.files.storage import default_storage
from django.conf import settings

import qrcode
from PIL import Image

from .models import Customer
from apps.transactions.models import Transaction

logger = logging.getLogger(__name__)


class CustomerValidationError(ValueError):
    """Raised when customer input is invalid."""
    pass


class CustomerNotFoundError(LookupError):
    """Raised when a customer cannot be found."""
    pass


class InsufficientBalanceError(ValueError):
    """Raised when a check-in is attempted with insufficient balance."""
    pass


# ---------------------------------------------------------------------------
# Customer CRUD
# ---------------------------------------------------------------------------

def get_customer_by_qr_id(qr_id: str) -> Customer:
    """
    Look up a customer by their QR code ID.

    Args:
        qr_id: The UUID string encoded in the physical QR code.

    Returns:
        Customer instance.

    Raises:
        CustomerNotFoundError: If no customer is associated with this QR ID.
        CustomerValidationError: If the qr_id is not a valid UUID.
    """
    try:
        parsed_qr_id = uuid.UUID(str(qr_id))
    except ValueError:
        raise CustomerValidationError(f'Invalid QR ID format: {qr_id!r}')

    try:
        return Customer.objects.get(qr_id=parsed_qr_id)
    except Customer.DoesNotExist:
        raise CustomerNotFoundError(f'No customer found with QR ID: {qr_id}')


def get_customer_by_public_id(public_id: str) -> Customer:
    """
    Look up a customer by their API-facing public UUID.

    Args:
        public_id: The UUID string used in API responses.

    Returns:
        Customer instance.

    Raises:
        CustomerNotFoundError: If not found.
        CustomerValidationError: If the public_id is not a valid UUID.
    """
    try:
        parsed_id = uuid.UUID(str(public_id))
    except ValueError:
        raise CustomerValidationError(f'Invalid customer ID format: {public_id!r}')

    try:
        return Customer.objects.get(public_id=parsed_id)
    except Customer.DoesNotExist:
        raise CustomerNotFoundError(f'Customer not found: {public_id}')


@transaction.atomic
def create_customer(*, name: str, initial_balance: Decimal = Decimal('0.00'), qr_id: str = None) -> Customer:
    """
    Create a new customer and generate their QR code image.

    This operation is atomic: if the QR image fails to save, the
    customer record is rolled back too.

    Args:
        name:            The customer's display name.
        initial_balance: Starting balance (default 0.00).
        qr_id:           Optional UUID for the QR code. If None, a new UUID
                         is generated. Pass an existing UUID to link a
                         pre-printed QR sticker to this customer.

    Returns:
        The newly created Customer instance.

    Raises:
        CustomerValidationError: If the qr_id is not a valid UUID, or the
                                 name is empty, or initial_balance is negative.
    """
    name = name.strip()
    if not name:
        raise CustomerValidationError('Customer name cannot be empty.')

    try:
        balance = Decimal(str(initial_balance))
    except InvalidOperation:
        raise CustomerValidationError(f'Invalid initial balance: {initial_balance!r}')

    if balance < 0:
        raise CustomerValidationError('Initial balance cannot be negative.')

    # Resolve the QR UUID
    if qr_id:
        try:
            parsed_qr_id = uuid.UUID(str(qr_id))
        except ValueError:
            raise CustomerValidationError(f'Invalid QR ID format: {qr_id!r}')
    else:
        parsed_qr_id = uuid.uuid4()

    customer = Customer.objects.create(
        name=name,
        balance=balance,
        qr_id=parsed_qr_id,
    )

    # If an initial balance was loaded, record it as a recharge transaction
    if balance > 0:
        Transaction.objects.create(
            customer=customer,
            amount=balance,
            transaction_type=Transaction.TransactionType.RECHARGE,
            notes='Initial balance loaded at registration.',
        )

    # Generate and persist the QR code image
    _generate_qr_code(str(parsed_qr_id))

    logger.info('Customer created: %s (public_id=%s)', name, customer.public_id)
    return customer


@transaction.atomic
def delete_customer(public_id: str) -> None:
    """
    Permanently delete a customer and all their transaction history.

    This is a hard delete — there is no soft-delete / archive.
    Admin permission is required at the view level before calling this.

    Args:
        public_id: The customer's API-facing UUID.

    Raises:
        CustomerNotFoundError: If the customer does not exist.
    """
    customer = get_customer_by_public_id(public_id)
    logger.warning('Customer deleted: %s (public_id=%s)', customer.name, public_id)
    customer.delete()


# ---------------------------------------------------------------------------
# Business Operations
# ---------------------------------------------------------------------------

@transaction.atomic
def recharge_customer(*, public_id: str, amount: Decimal) -> Customer:
    """
    Add credit to a customer's balance.

    Args:
        public_id: The customer's public UUID.
        amount:    Amount to add (must be positive).

    Returns:
        Updated Customer instance.

    Raises:
        CustomerNotFoundError:    If the customer does not exist.
        CustomerValidationError:  If the amount is invalid or non-positive.
    """
    try:
        amount = Decimal(str(amount))
    except InvalidOperation:
        raise CustomerValidationError(f'Invalid recharge amount: {amount!r}')

    if amount <= 0:
        raise CustomerValidationError('Recharge amount must be greater than zero.')

    # select_for_update prevents race conditions on concurrent recharges.
    customer = Customer.objects.select_for_update().get(
        public_id=uuid.UUID(str(public_id))
    ) if _is_valid_uuid(public_id) else None

    if customer is None:
        raise CustomerNotFoundError(f'Customer not found: {public_id}')

    customer.balance += amount
    customer.save(update_fields=['balance'])

    Transaction.objects.create(
        customer=customer,
        amount=amount,
        transaction_type=Transaction.TransactionType.RECHARGE,
    )

    logger.info(
        'Recharge: %s added to %s (public_id=%s). New balance: %s',
        amount, customer.name, public_id, customer.balance,
    )
    return customer


@transaction.atomic
def checkin_customer(*, public_id: str = None, qr_id: str = None, fee: Decimal) -> Customer:
    """
    Process a customer check-in by deducting the fee from their balance.

    Either public_id or qr_id must be provided (qr_id is typical for scanner flow).

    Args:
        public_id: The customer's public UUID (optional).
        qr_id:     The UUID from the scanned QR code (optional).
        fee:       The check-in fee to deduct.

    Returns:
        Updated Customer instance.

    Raises:
        CustomerNotFoundError:    If the customer does not exist.
        CustomerValidationError:  If neither identifier is provided, or fee is invalid.
        InsufficientBalanceError: If the customer's balance is too low.
    """
    if not public_id and not qr_id:
        raise CustomerValidationError('Either public_id or qr_id must be provided.')

    try:
        fee = Decimal(str(fee))
    except InvalidOperation:
        raise CustomerValidationError(f'Invalid check-in fee: {fee!r}')

    if fee < 0:
        raise CustomerValidationError('Check-in fee cannot be negative.')

    # Fetch with a row lock to prevent concurrent balance deductions
    if qr_id:
        customer = Customer.objects.select_for_update().filter(
            qr_id=uuid.UUID(str(qr_id))
        ).first()
    else:
        customer = Customer.objects.select_for_update().filter(
            public_id=uuid.UUID(str(public_id))
        ).first()

    if customer is None:
        identifier = qr_id or public_id
        raise CustomerNotFoundError(f'Customer not found for identifier: {identifier}')

    if fee > 0 and customer.balance < fee:
        raise InsufficientBalanceError(
            f'Insufficient balance. Required: {fee}, Available: {customer.balance}'
        )

    customer.balance -= fee
    customer.save(update_fields=['balance'])

    Transaction.objects.create(
        customer=customer,
        amount=fee,
        transaction_type=Transaction.TransactionType.CHECKIN,
    )

    logger.info(
        'Check-in: %s (public_id=%s). Fee: %s, New balance: %s',
        customer.name, customer.public_id, fee, customer.balance,
    )
    return customer


# ---------------------------------------------------------------------------
# QR Code Generation
# ---------------------------------------------------------------------------

def _generate_qr_code(qr_id: str) -> str:
    """
    Generate a QR code image for the given ID and save it to media storage.

    The QR image filename matches the qr_id UUID, so it can be served
    at /media/qrcodes/<qr_id>.png without database lookups.

    Args:
        qr_id: UUID string to encode in the QR.

    Returns:
        The relative path to the saved image.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_id)
    qr.make(fit=True)

    img: Image.Image = qr.make_image(fill_color='black', back_color='white')

    # Ensure the qrcodes directory exists
    qr_dir = settings.QR_CODE_DIR
    qr_dir.mkdir(parents=True, exist_ok=True)

    file_path = qr_dir / f'{qr_id}.png'
    img.save(str(file_path))

    return f'qrcodes/{qr_id}.png'


def get_qr_code_path(qr_id: str) -> str:
    """Return the media-relative path for a given QR ID."""
    return f'qrcodes/{qr_id}.png'


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_valid_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError):
        return False
