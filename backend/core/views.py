from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Customer, Transaction, Setting
from .serializers import CustomerSerializer, TransactionSerializer, SettingSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def checkin(self, request):
        customer_id = request.data.get('customer_id')
        if not customer_id:
            return Response({'error': 'customer_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            customer = Customer.objects.get(id=customer_id)
            # In a real app, you might deduct balance here
            Transaction.objects.create(customer=customer, amount=0, type='checkin')
            return Response({'success': True, 'message': f'Checked in {customer.name}'})
        except Customer.DoesNotExist:
            return Response({'error': 'User Not Found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def recharge(self, request):
        customer_id = request.data.get('customer_id')
        amount = request.data.get('amount')
        
        if not customer_id or amount is None:
            return Response({'error': 'customer_id and amount are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            amount = float(amount)
            customer = Customer.objects.get(id=customer_id)
            customer.balance += amount
            customer.save()
            Transaction.objects.create(customer=customer, amount=amount, type='recharge')
            return Response({'success': True, 'message': f'Recharged {amount} for {customer.name}', 'new_balance': customer.balance})
        except Customer.DoesNotExist:
            return Response({'error': 'User Not Found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total_customers = Customer.objects.count()
        total_revenue = Transaction.objects.filter(type='recharge').aggregate(models.Sum('amount'))['amount__sum'] or 0
        return Response({
            'total_customers': total_customers,
            'total_revenue': total_revenue
        })

class SettingViewSet(viewsets.ModelViewSet):
    queryset = Setting.objects.all()
    serializer_class = SettingSerializer
    permission_classes = [permissions.IsAdminUser] # Only admins can change settings

from rest_framework.views import APIView
from django.http import HttpResponse
import pandas as pd
from reportlab.pdfgen import canvas
from io import BytesIO

class ExportAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, format_type):
        transactions = Transaction.objects.all().values(
            'customer__name', 'amount', 'type', 'created_at'
        )
        df = pd.DataFrame(list(transactions))
        
        if df.empty:
             return Response({'error': 'No data to export'}, status=404)

        if format_type == 'excel':
            response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="export.xlsx"'
            df.to_excel(response, index=False)
            return response
            
        elif format_type == 'pdf':
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="export.pdf"'
            
            buffer = BytesIO()
            p = canvas.Canvas(buffer)
            p.drawString(100, 800, "Venuity Transaction Export")
            
            y = 750
            for index, row in df.iterrows():
                text = f"{row['created_at'].strftime('%Y-%m-%d')} | {row['customer__name']} | {row['type']} | {row['amount']}"
                p.drawString(50, y, text)
                y -= 20
                if y < 50:
                    p.showPage()
                    y = 800
                    
            p.save()
            pdf = buffer.getvalue()
            buffer.close()
            response.write(pdf)
            return response
            
        return Response({'error': 'Invalid format. Use excel or pdf.'}, status=400)

class AnalyticsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        interval = request.query_params.get('interval', 'hourly')
        metric = request.query_params.get('metric', 'revenue')
        date_str = request.query_params.get('date')
        
        if not date_str:
            target_date = timezone.now().date()
        else:
            target_date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()

        labels = []
        data = []

        if interval == 'hourly':
            # Simplified hourly stats for the target date
            for hour in range(9, 21): # 9 AM to 8 PM
                labels.append(f"{hour}:00")
                qs = Transaction.objects.filter(
                    created_at__date=target_date,
                    created_at__hour=hour
                )
                if metric == 'revenue':
                    val = qs.filter(type='recharge').aggregate(models.Sum('amount'))['amount__sum'] or 0
                else:
                    val = qs.filter(type='checkin').count()
                data.append(val)
        else:
            # Daily stats for the week of target date
            start_date = target_date - timezone.timedelta(days=target_date.weekday())
            for i in range(7):
                day = start_date + timezone.timedelta(days=i)
                labels.append(day.strftime('%a'))
                qs = Transaction.objects.filter(created_at__date=day)
                if metric == 'revenue':
                    val = qs.filter(type='recharge').aggregate(models.Sum('amount'))['amount__sum'] or 0
                else:
                    val = qs.filter(type='checkin').count()
                data.append(val)

        return Response({
            'labels': labels,
            'data': data,
            'display_date': target_date.strftime('%B %d, %Y')
        })
