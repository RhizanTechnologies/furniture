# Furniture Business ERP — API Design & Interface Specification

## 1. Global API Standards

- **Base URL:** `/api/v1`
- **Content Type:** `application/json` (except image uploads: `multipart/form-data`)
- **Authentication:** HTTP-only secure cookie session (`agy_session`) or Bearer token header.
- **Idempotency Header:** `X-Idempotency-Key: <UUIDv4>` supported on all mutation endpoints (`POST`, `PUT`, `PATCH`).

### 1.1 Standard Response Envelope

All successful responses return data enveloped with metadata:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-09T08:00:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### 1.2 Standard Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Requested consumption quantity (4.500) exceeds current available stock (2.100).",
    "statusCode": 400,
    "timestamp": "2026-11-09T08:00:00.000Z",
    "path": "/api/v1/orders/ord-uuid/consumption"
  }
}
```

---

## 2. API Endpoints by Business Domain

### 2.1 Authentication & Profile (`/auth`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | Authenticates credentials and sets HTTP-only session cookie. |
| `POST` | `/auth/logout` | Authenticated | Clears session cookie and invalidates session. |
| `GET` | `/auth/me` | Authenticated | Returns current authenticated user profile, role, and branch assignment. |

---

### 2.2 Branches & Branch Administration (`/branches`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/branches` | Owner | Lists all branches with stock modes and assigned administrators. |
| `POST` | `/branches` | Owner | Creates a new branch (specifying name, address, code, and `stockMode`). |
| `GET` | `/branches/:id` | Owner / Assigned Admin | Retrieves branch details. |
| `PUT` | `/branches/:id` | Owner | Updates branch details (name, address, status). |
| `POST` | `/branches/:id/admin` | Owner | Assigns or replaces the Branch Administrator for this branch. |

---

### 2.3 Product Catalog & Showroom (`/products`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Owner / Branch Admin | Lists furniture products with filtering by category, search, and status. |
| `POST` | `/products` | Owner | Creates a new furniture product catalog entry. |
| `GET` | `/products/:id` | Owner / Branch Admin | Retrieves detailed product specifications and image gallery. |
| `PUT` | `/products/:id` | Owner | Updates product specifications. |
| `POST` | `/products/:id/images` | Owner | Uploads and associates a product photograph (multipart/form-data). |
| `DELETE` | `/products/:id/images/:imageId` | Owner | Removes an image asset from object storage and database. |

---

### 2.4 Customers (`/customers`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/customers` | Owner / Branch Admin | Lists registered customers (Branch Admin sees branch walk-ins; Owner sees all). |
| `POST` | `/customers` | Owner / Branch Admin | Registers a new walk-in customer (checks duplicate phone). |
| `GET` | `/customers/:id` | Owner / Branch Admin | Retrieves customer profile and complete historical order list. |
| `PUT` | `/customers/:id` | Owner / Branch Admin | Updates customer contact information. |

---

### 2.5 Customizable Order Stages (`/order-stages`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/order-stages` | Owner / Branch Admin | Lists all configured stages in pipeline order. |
| `POST` | `/order-stages` | Owner | Creates a new order progression stage. |
| `PUT` | `/order-stages/:id` | Owner | Updates stage name, color, or status. |
| `POST` | `/order-stages/reorder` | Owner | Reorders sequence of stages in batch. |

---

### 2.6 Orders & Progression (`/orders`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/orders` | Owner / Branch Admin | Lists orders with filters (stage, date range, branch, balance status). |
| `POST` | `/orders` | Owner / Branch Admin | Creates order, items, and records initial prepayment atomically. |
| `GET` | `/orders/:id` | Owner / Branch Admin | Retrieves comprehensive order details, payments, materials, and history. |
| `PUT` | `/orders/:id` | Owner / Branch Admin | Updates order metadata / delivery deadline. |
| `POST` | `/orders/:id/stage` | Owner / Branch Admin | Advances order to target stage and logs transition history. |
| `POST` | `/orders/:id/payments` | Owner / Branch Admin | Records an additional payment toward remaining balance. |
| `POST` | `/orders/:id/consumption` | Owner / Branch Admin | Records raw material consumed for this order and allocates cost. |

---

### 2.7 Raw Materials & Stock Management (`/inventory`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/inventory/materials` | Owner / Branch Admin | Lists raw materials with quantities and current valuation unit costs. |
| `POST` | `/inventory/materials` | Owner | Creates a new raw material catalog record. |
| `POST` | `/inventory/stock-in` | Owner / Branch Admin | Records a stock replenishment batch (quantity + unit cost). |
| `GET` | `/inventory/valuation` | Owner / Branch Admin | Calculates real-time total stock valuation across warehouse and branches. |

---

### 2.8 Operating Expenses (`/expenses`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/expenses` | Owner / Branch Admin | Lists operating expenses with date and category filters. |
| `POST` | `/expenses` | Owner / Branch Admin | Records a new branch or central operating expense. |

---

### 2.9 Analytics & Reporting (`/analytics`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/overview` | Owner | Executive metrics: Revenue, cash collected, unpaid receivables, net profit. |
| `GET` | `/analytics/products` | Owner | Product revenue vs gross profit ranking, margin percentages. |
| `GET` | `/analytics/branches` | Owner | Comparative branch performance (sales volume, orders completed, expenses). |
| `GET` | `/analytics/reports` | Owner / Branch Admin | Periodic aggregated reports (daily, weekly, monthly, or custom range). |

---

### 2.10 Offline Batch Synchronization (`/sync`)

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/sync/batch` | Branch Admin | Submits an array of client outbox operations; executes each with idempotency check. |
