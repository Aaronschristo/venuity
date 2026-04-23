"""
Custom exception handler for Django REST Framework.

Ensures ALL error responses — including Django's built-in 404/500 errors
and DRF validation errors — return a consistent JSON shape:

    {
        "error": "Human-readable message",
        "code": "machine_readable_code",   # optional
        "detail": {...}                    # optional, validation errors
    }

This contract makes frontend error handling trivial.
"""

import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Override DRF's default exception handler.

    Transforms all exceptions into a consistent error envelope.
    Unexpected errors are logged with full traceback for debugging.
    """
    # Let DRF handle the response first so we get its HTTP status code.
    response = exception_handler(exc, context)

    if response is not None:
        # DRF handled it (4xx) — reshape into our envelope.
        original_data = response.data

        if isinstance(original_data, dict) and 'detail' in original_data:
            # Standard DRF detail error (auth, not found, etc.)
            error_message = str(original_data['detail'])
            code = getattr(original_data['detail'], 'code', 'error')
            response.data = {'error': error_message, 'code': code}

        elif isinstance(original_data, dict):
            # Validation errors — preserve field-level detail
            response.data = {
                'error': 'Validation failed.',
                'code': 'validation_error',
                'detail': original_data,
            }

        else:
            # List-style errors
            response.data = {'error': str(original_data), 'code': 'error'}

    else:
        # Unhandled exception (500) — log and return generic message.
        logger.exception(
            'Unhandled server error in view %s',
            context.get('view', 'unknown'),
            exc_info=exc,
        )
        response = Response(
            {'error': 'An internal server error occurred.', 'code': 'server_error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response
