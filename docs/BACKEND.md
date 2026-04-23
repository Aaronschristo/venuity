# Backend Documentation: Python & Flask

The Venuity backend handles data storage, security, and complex calculations (like analytics). While initially designed for Django, the current implementation uses a lightweight **Flask** server for high performance and easy deployment.

---

## 1. Database Schema (SQLite)
We use three main models to manage the PlayArea operations:

### A. Customer (`Customer`)
Stores individual user information and their current wallet balance.
- **`id`**: Unique ID (UUID). This is what's encoded in the QR code.
- **`name`**: Full name of the customer.
- **`balance`**: Current amount of money in their digital wallet.
- **`created_at`**: Date the account was created.

### B. Transaction (`Transaction`)
Records every financial or entry event in the system.
- **`customer`**: Link to the Customer who made the transaction.
- **`amount`**: The value of the transaction.
- **`type`**: Either `recharge` (adding money) or `checkin` (entry fee deducted).
- **`created_at`**: Timestamp of the event.

### C. Setting (`Setting`)
Stores global configuration values.
- **`key`**: The name of the setting (e.g., `business_name`).
- **`value`**: The value of that setting.

---

## 2. API Endpoints
The frontend communicates with these URL "routes" to fetch or send data.

### Customers
- **`GET /api/customers`**: Lists all customers (supports search and pagination).
- **`POST /api/checkin`**: Validates a customer's presence and logs an entry.
- **`POST /api/recharge`**: Adds a specified amount to a customer's balance.
- **`POST /api/customers/assign`**: Assigns a QR ID to an existing customer.

### Analytics
- **`GET /api/analytics`**: Returns data formatted for Chart.js.
    - *Params:* `interval` (hourly/daily), `metric` (revenue/checkins), `date` (YYYY-MM-DD).

### Settings
- **`GET /api/settings`**: Retrieves current business configuration.
- **`POST /api/settings`**: Updates business name, fee, and currency.

---

## 3. Core Logic: The "Check-in" Process
When a QR code is scanned and sent to the backend:
1. The system looks up the `Customer` by their UUID.
2. It verifies if the customer exists (returning an error if not).
3. It checks if the customer has sufficient balance for the entry fee.
4. It creates a new `Transaction` record with type `checkin`.
5. It deducts the `checkin_fee` from the customer's balance and returns the result.

---

## 4. Hosting & Deployment
The production backend is currently hosted on **PythonAnywhere** at:
`https://aaronschristo.pythonanywhere.com`
