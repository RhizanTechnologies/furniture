# Furniture Business ERP — Business Requirements Document (BRD)

## 1. Domain Requirements Breakdown

### 1.1 Branch & Administration Management (BR-BAM)
- **BR-BAM-01: Multi-Branch Support:** The system must support creating, updating, and deactivating business branches (showrooms/workshops).
- **BR-BAM-02: Branch Stock Configuration:** When creating a branch, the Owner must designate its stock configuration mode:
  - `MAIN_STOCK`: The branch accesses and draws materials from the central business inventory.
  - `BRANCH_STOCK`: The branch maintains an independent, isolated inventory pool for raw materials.
- **BR-BAM-03: Single Administrator Assignment:** Exactly one Branch Administrator must be assigned to each active branch. An administrator cannot manage multiple branches concurrently.
- **BR-BAM-04: Strict Branch Boundary Isolation:** A Branch Administrator must only read, create, or update data (customers, orders, inventory, expenses) belonging to their assigned branch.
- **BR-BAM-05: Owner Enterprise Visibility:** The Owner must have unrestricted read and management access across all branches, including comparative metrics.

---

### 1.2 Furniture Catalog & Showroom (BR-PCS)
- **BR-PCS-01: Product Catalog Management:** The Owner must be able to create, edit, categorize, and archive furniture product definitions (e.g., Dining Tables, Chesterfield Sofas, Executive Desks, Wardrobes).
- **BR-PCS-02: Product Attributes:** Each product must record:
  - Name, SKU/Code, Category, Description.
  - Standard dimensions (Width x Depth x Height).
  - Base selling price guidelines.
  - Estimated lead production days.
  - Status (Active, Discontinued).
- **BR-PCS-03: Showroom Display:** Branch Administrators and the Owner must have a dedicated Showroom View optimized for tablet/mobile presentation to walk-in clients, displaying high-resolution gallery images and specifications.
- **BR-PCS-04: Image Asset Management:** 
  - Multiple image uploads per product with defined primary/thumbnail image.
  - Validation of MIME types (JPEG, PNG, WebP) and maximum file size (5MB).
  - Storage in S3-compatible object storage with image metadata in PostgreSQL.
  - Support for offline local image preview and queued background upload.

---

### 1.3 Customer Registration (BR-CRM)
- **BR-CRM-01: Walk-In Customer Intake:** Branch Administrators must register customers as they visit the showroom/workshop with minimal mandatory fields to ensure fast on-device entry (Full Name, Primary Phone Number, Optional Email, Optional Physical Address/City).
- **BR-CRM-02: Deduplication Safeguards:** The system must validate phone numbers to detect and prevent unintentional duplicate customer profiles.
- **BR-CRM-03: Customer History:** Viewing a customer profile must display their complete chronological order history, total spent, and outstanding receivables.

---

### 1.4 Order Lifecycle & Custom Stages (BR-ORD)
- **BR-ORD-01: Order Creation:** Orders must be registered under an existing customer and linked to the creating branch.
- **BR-ORD-02: Order Details:**
  - One or more furniture products (catalog items or custom-dimension variants).
  - Special custom instructions/specifications.
  - Agreed Total Selling Price (authoritative amount agreed with client).
  - Initial Prepayment amount.
  - Computed Remaining Balance (Total Selling Price minus Prepayment).
  - Target Promised Delivery Deadline.
- **BR-ORD-03: Owner-Configured Dynamic Stages:** The Owner defines the ordered sequence of production stages (e.g., `Deposit Paid` → `Wood Milling` → `Assembly` → `Polishing/Painting` → `Upholstery` → `Ready for Delivery` → `Delivered`).
- **BR-ORD-04: Stage Progression:** Branch Administrators advance orders through these stages.
- **BR-ORD-05: Stage Immutability & Audit History:** Every stage transition must be recorded in an immutable history log with timestamp, operator ID, previous stage, new stage, and optional transition notes.
- **BR-ORD-06: Stage Protection:** Stages currently associated with active orders cannot be hard-deleted by the Owner.

---

### 1.5 Inventory, Stock-In & Material Consumption (BR-INV)
- **BR-INV-01: Raw Material Catalog:** Maintain raw material definitions including Material Name, Material Code, Unit of Measurement (e.g., Meter, Square Meter, Board Foot, Kg, Piece), and Category (Timber, Fabric, Hardware, Foam, Paint/Finishing).
- **BR-INV-02: Stock-In Recording:** When replenishing stock, record:
  - Material ID.
  - Quantity received.
  - Batch unit cost.
  - Total purchase outlay.
  - Target stock location (Central Main Stock or specific Branch Stock).
  - Supplier invoice/receipt reference date.
- **BR-INV-03: Material Consumption Tracking:** Record raw materials consumed during the production of an order:
  - Associated Order ID.
  - Raw Material ID.
  - Quantity consumed.
  - Allocated unit cost based on the approved inventory valuation method.
  - Total material cost contribution to the order.
- **BR-INV-04: Negative Stock Prevention:** Consumption operations must validate that available stock is sufficient before committing, preventing negative inventory balances.
- **BR-INV-05: Stock Valuation:** Calculate aggregate inventory value at any point in time:
  $$\text{Inventory Valuation} = \sum (\text{Remaining Quantity}_i \times \text{Valuation Unit Cost}_i)$$

---

### 1.6 Financials & Operating Expenses (BR-FIN)
- **BR-FIN-01: Order Payments:** Record payments against orders (initial prepayment and subsequent progress payments).
- **BR-FIN-02: Balance Calculation:** The backend must authoritatively compute:
  $$\text{Outstanding Balance} = \text{Agreed Selling Price} - \sum \text{Payments Received}$$
- **BR-FIN-03: Operating Expense Tracking:** Branch Administrators and the Owner can record business operating expenses:
  - Branch association (or Global/Central business expense if recorded by Owner).
  - Expense Category (Rent, Utilities, Consumable Supplies, Workshop Maintenance, Miscellaneous).
  - Amount, Date, Description, and Receipt Reference.
- **BR-FIN-04: Decimal Precision:** All monetary amounts must be calculated and stored using high-precision Decimal types (2 decimal places minimum) to prevent floating-point calculation errors. Default currency is Ethiopian Birr (ETB).

---

### 1.7 Business Analytics & Reporting (BR-ANL)
- **BR-ANL-01: Owner Executive Dashboard:**
  - Consolidated revenue, cash collected, outstanding receivables.
  - Total operating expenses, material costs, and net business profit.
  - Stock valuation across main stock and individual branches.
  - Comparative branch revenue and order completion rates.
- **BR-ANL-02: Product Performance & Profitability:**
  - Revenue by product vs. Gross profit by product.
  - High-margin vs. low-margin product analysis.
  - Sales volume by furniture category.
- **BR-ANL-03: Periodic Date Range Filtering:**
  - Daily summary, weekly report, monthly report, and custom calendar ranges.
  - Authoritative database-level aggregation (no massive client-side data crunching).

---

### 1.8 Mobile-First PWA & Offline Engine (BR-PWA)
- **BR-PWA-01: Offline Availability:** Critical branch operations (Customer registration, Order logging, Offline photo capture, Payment logging, Stock consumption) must function when disconnected from the internet.
- **BR-PWA-02: Client Storage:** IndexedDB (via Dexie.js) stores locally cached reference data, pending mutations, and offline image Blobs.
- **BR-PWA-03: Idempotent Synchronization:** An Outbox sync engine dispatches pending mutations upon reconnect using UUID-based idempotency keys to guarantee at-most-once processing.
- **BR-PWA-04: Transparent Connectivity States:** The UI must display persistent, non-intrusive status indicators: Online/Offline, Unsynced Operations count, and Unconfirmed local transaction badges.
