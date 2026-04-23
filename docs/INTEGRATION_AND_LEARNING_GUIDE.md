# Venuity: Frontend & Backend Integration & Learning Guide

Welcome to the Venuity integration guide! This document is designed specifically for you to learn the core concepts of React, Django, and REST APIs, while simultaneously understanding exactly how the new Django backend was integrated with the React frontend.

By reading this guide, you will understand *what* each technology does, *why* it was used, and *how* to connect them together.

---

## 1. Core Concepts: The Big Picture

Before diving into code, let's understand the architecture of modern web applications. 

Venuity is split into two completely separate parts that talk to each other over the network:
1. **The Backend (Django):** The "brain" and the "database". It stores customer data, calculates balances, and enforces rules (e.g., "you can't recharge a negative amount").
2. **The Frontend (React + Tauri):** The "face". It displays buttons, tables, and charts to the user. It has no direct access to the database.
3. **The Communication (REST API):** The "bridge". Since the frontend can't read the backend's database directly, it sends HTTP requests (like sending a letter) to the backend, asking for data or requesting an action.

### What is a REST API?
An API (Application Programming Interface) is a set of rules that allows two programs to talk to each other. A **REST API** uses standard HTTP web addresses (URLs) to represent data.

Imagine a restaurant:
- **Frontend:** You (the customer) looking at the menu.
- **API (REST):** The waiter. You tell the waiter what you want.
- **Backend:** The kitchen. The kitchen cooks the food and gives it to the waiter to bring back to you.

In Venuity:
- **GET `/api/v1/customers/`** -> Waiter, please bring me a list of all customers.
- **POST `/api/v1/customers/recharge/`** -> Waiter, please tell the kitchen to add ₹500 to customer X's account.

Data is sent back and forth in **JSON** (JavaScript Object Notation) format, which looks like this:
```json
{
  "name": "John Doe",
  "balance": "500.00"
}
```

---

## 2. The Backend: Django & Django REST Framework

**Django** is a Python framework used to build secure, robust backends quickly. We used **Django REST Framework (DRF)** to easily create the REST API bridge.

### Key Concepts in Django
*   **Models (`models.py`):** These define your database tables. Instead of writing raw SQL code, you write Python classes. Django translates these into database tables automatically.
    *   *Example in Venuity:* The `Customer` model has `name`, `balance`, and `qr_id` fields.
*   **Services (`services.py`):** This is where the "business logic" lives. If you need to deduct money for a check-in, the math and rules happen here.
*   **Serializers (`serializers.py`):** These act as translators. They convert complex Django Models (Python objects) into JSON strings that the React frontend can understand, and vice versa.
*   **Views (`views.py`):** The receptionists. They receive the incoming HTTP request from the frontend, pass data to the serializer, ask the service to do the work, and return an HTTP response (like `200 OK` or `400 Bad Request`).

---

## 3. The Frontend: React

**React** is a JavaScript library for building user interfaces. Instead of writing one massive HTML file, you build small, reusable pieces of UI called **Components**.

### Key Concepts in React
*   **Components:** JavaScript functions that return HTML-like code called **JSX**. 
    *   *Example in Venuity:* `Settings.jsx`, `Dashboard.jsx`.
*   **State (`useState`):** The memory of a component. If a component's state changes, React automatically re-draws (re-renders) the component on the screen to show the new data.
    *   *Example:* Remembering what the user typed into a search box.
*   **Effects (`useEffect`):** Side effects that happen outside the normal rendering process. Most commonly used to fetch data from the API when the page first loads.
*   **Context (`useContext`):** Global memory. Instead of passing data down through 10 different components, Context allows you to store data globally so any component can access it.
    *   *Example in Venuity:* `SettingsContext` holds the business name and currency symbol so every page can use them without fetching from the backend repeatedly.

---

## 4. How to Integrate: Step-by-Step

Here is exactly what we did to integrate the new Django backend into the existing React frontend. This is your playbook for how the two systems connect.

### Step 1: Updating the API Client (`api.js`)
The frontend needs a central place to define *how* it talks to the backend. We updated `frontend/src/lib/api.js`.

**What you need to learn here:**
Whenever the frontend wants data, it uses the browser's native `fetch()` function. We wrap this in our own `apiFetch` function so we don't have to rewrite headers and authentication logic every time.

**The Changes we made:**
1.  **Updated the URL Base:** Changed the target from the old Flask server port to Django's port `http://127.0.0.1:8000`.
2.  **Updated Endpoint Paths:** Django uses `/api/v1/` prefixes. We updated all fetch calls (e.g., `/api/v1/customers/`).
3.  **Added JWT Authentication:** Django uses JSON Web Tokens (JWT) for security. When a user logs in, Django gives them a "Token". The frontend must attach this token to the `Authorization` header of *every* subsequent request. If the token is missing, Django rejects the request with a `401 Unauthorized` error.

### Step 2: Handling Paginated Responses
When you ask Django for a list of customers, it doesn't send all 10,000 at once (which would crash the browser). It sends them in "pages" (e.g., 10 at a time).

**What you need to learn here:**
The shape of the data changed. Instead of returning an array `[ {customer1}, {customer2} ]`, Django returns a "paginated envelope" object:
```json
{
  "count": 100,
  "next": "http://127.0.0.1:8000/api/v1/customers/?page=2",
  "previous": null,
  "results": [ {customer1}, {customer2} ]
}
```

**The Changes we made:**
In files like `Customers.jsx` and `Dashboard.jsx`, we changed the logic to look inside the `results` array.
```javascript
// OLD WAY
const data = await fetchCustomers();
setCustomers(data);

// NEW WAY
const { body } = await fetchCustomers(pageNumber, 10);
const items = body.results; // Extract the actual array from the envelope
setCustomers(items);
```

### Step 3: Making Settings Dynamic (`SettingsContext.jsx`)
In the old app, settings like "Check-in Fee" were hardcoded. The new Django backend stores settings in the database dynamically.

**What you need to learn here:**
React Context (`SettingsContext.jsx`) is perfect for this. When the app starts, the Context fetches all settings from the API *once* and provides them to the entire app.

**The Changes we made:**
1.  **Backend (`services.py`):** We updated `get_all_settings()` to return a dictionary of *all* settings in the database, even custom ones added by the Admin.
2.  **Frontend (`SettingsContext.jsx`):** Fetches the settings on app load and caches them in `localStorage` so the UI doesn't flicker when refreshed.
3.  **Frontend (`Settings.jsx`):** We wrote dynamic rendering logic. It loops through all keys received from the backend. If it recognizes the key (like `business_name`), it shows a nice label. If it doesn't recognize it (a custom setting added via Django Admin), it generates a generic text box automatically!

### Step 4: Updating Data Identifiers (`public_id` vs `id` vs `qr_id`)
Security best practice: Never expose internal database IDs (like `1`, `2`, `3`) to the frontend, as hackers can guess them.

**What you need to learn here:**
Django uses an internal integer `id` for database relationships, but generates a random UUID string (e.g., `f47ac10b-58cc-4372-a567-0e02b2c3d479`) called `public_id` for the frontend to use.

**The Changes we made:**
1.  Across all React pages (`Customers.jsx`, `Recharge.jsx`), we changed references from `customer.id` to `customer.public_id`.
2.  **QR Codes:** QR codes physically hold a different UUID called `qr_id`. When the scanner reads a QR code, it gives the frontend a `qr_id`. We updated the backend to accept *either* a `public_id` (from manual typing) or a `qr_id` (from scanning) for check-ins and recharges.

---

## Conclusion & Next Steps for You

You have a professional, scalable architecture now.
1. **The Django Backend** strictly handles data integrity, mathematical logic, and security.
2. **The React Frontend** strictly handles user experience, dynamic UI updates, and presentation.

### How you should test this right now:
1.  **Start the Backend:** Open a terminal in the `backend` folder and run `python manage.py runserver`.
2.  **Start the Frontend:** Open a terminal in the `frontend` folder and run `npm run dev`.
3.  **Open the App:** Navigate to `http://localhost:1420` (or `http://localhost:5173`).
4.  **Login:** Use the default admin credentials (`admin` / `admin`).

As you click around the app (Recharge, Customers, Settings), open your browser's Developer Tools (F12) and look at the **Network** tab. You will actually see the REST API in action—you'll see the frontend sending JSON requests to Django and Django replying with JSON data!
