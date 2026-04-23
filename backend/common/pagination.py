"""
Standardized pagination for all list endpoints.

Uses cursor-based pagination would be ideal for large datasets,
but offset pagination is used here for simplicity and compatibility
with the existing frontend (offset/limit pattern).
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsPagination(PageNumberPagination):
    """
    Default paginator.

    Clients can control page size via ?page_size=N (up to MAX_PAGE_SIZE).
    The response envelope includes pagination metadata.

    Query params:
        page      — page number (1-indexed)
        page_size — results per page (default: 10, max: 100)
    """

    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })

    def get_paginated_response_schema(self, schema):
        """Used by drf-spectacular for schema generation."""
        return {
            'type': 'object',
            'properties': {
                'count': {'type': 'integer'},
                'total_pages': {'type': 'integer'},
                'next': {'type': 'string', 'nullable': True},
                'previous': {'type': 'string', 'nullable': True},
                'results': schema,
            },
        }


class LargeResultsPagination(StandardResultsPagination):
    """For endpoints where the client needs larger page sizes (e.g., exports)."""

    page_size = 50
    max_page_size = 500
