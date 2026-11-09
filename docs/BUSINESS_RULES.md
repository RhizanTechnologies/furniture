# Furniture Business ERP — Business Rules & Calculation Formulas

## 1. Stock Configuration Rules

The business supports two mutually exclusive stock configuration models for each branch:

```
[Branch Mode: MAIN_STOCK]   ─── draws from ───►  [Central Main Stock]
[Branch Mode: BRANCH_STOCK] ─── draws from ───►  [Branch Dedicated Stock]
```

### Rule 1.1: Stock Ownership and Assignment
1. When the Owner creates a branch, the `stockMode` must be explicitly designated as either:
   - `MAIN_STOCK`: The branch does not maintain an isolated physical inventory; it shares and consumes directly from the centralized company warehouse.
   - `BRANCH_STOCK`: The branch has its own physical workshop/stock room with dedicated inventory quantities and dedicated stock-in transactions.
2. An Administrator assigned to a `MAIN_STOCK` branch views and consumes raw materials from the centralized stock pool.
3. An Administrator assigned to a `BRANCH_STOCK` branch views and consumes raw materials exclusively from their own branch's stock pool.
4. Stock modes cannot be changed if active material stock or pending un-synced consumption records exist for that branch, to protect audit trails.

### Rule 1.2: Stock Replenishment (Stock-In)
1. For `MAIN_STOCK`, replenishment transactions are designated with `branchId = null` (representing central warehouse ownership).
2. For `BRANCH_STOCK`, replenishment transactions are designated with `branchId = <assignedBranchId>`.
3. Every stock-in transaction must capture:
   - Batch purchase date.
   - Quantity received ($Q_{\text{in}} > 0$).
   - Unit purchase price ($C_{\text{unit}} \ge 0$).
   - Total batch cost ($T_{\text{cost}} = Q_{\text{in}} \times C_{\text{unit}}$).

---

## 2. Order Stages & Workflow Rules

### Rule 2.1: Custom Order Stages Definition
1. Order stages are defined globally by the Business Owner, establishing standard quality and progression standards for all workshops.
2. Each stage has:
   - `name`: Human-readable label (e.g., "Timber Preparation", "Assembly", "Finishing", "Ready for Pickup").
   - `sequenceOrder`: Integer defining the visual and operational pipeline order.
   - `color`: Visual tag representation.
   - `isActive`: Boolean flag indicating if new orders can be assigned to this stage.
3. The Owner can rename, reorder, or deactivate stages at any time.

### Rule 2.2: Stage Safety & Immutability
1. **Deletion Guard:** A stage cannot be deleted from the database if any historical or active order has ever been placed into that stage. Instead, the Owner can mark the stage as `isActive = false`.
2. **Transition Audit:** Every transition of an order from Stage $A$ to Stage $B$ must create a persistent, append-only record in `OrderStageHistory` containing:
   - `orderId`
   - `fromStageId`
   - `toStageId`
   - `changedByUserId`
   - `changedAt` (timestamp)
   - `notes` (optional transition remarks)
3. Stage transitions can skip steps if allowed by workshop workflow (e.g., standard catalog items may not require timber preparation if ready pre-cut components exist).

---

## 3. Financial Calculations & Accounting Formulas

### Rule 3.1: Precision & Currency Standard
1. All monetary quantities must be handled using fixed-point Decimal arithmetic with a minimum precision of `Decimal(14, 2)`.
2. Floating-point binary arithmetic (e.g., JavaScript standard IEEE 754 `Number`) is strictly prohibited for financial and inventory balance calculations.
3. Standard operating currency is Ethiopian Birr (ETB).

### Rule 3.2: Order Financial Balances
For any order $O$:
1. **Agreed Selling Price ($P_{\text{agreed}}$):** The contractual price agreed with the customer.
2. **Prepayment ($P_{\text{pre}}$):** Initial deposit recorded at the time of order creation.
3. **Cumulative Payments Received ($P_{\text{total}}$):**
   $$P_{\text{total}} = P_{\text{pre}} + \sum_{k=1}^{n} P_{k}$$
   Where $P_k$ represents any subsequent progress payment.
4. **Outstanding Balance ($B_{\text{remaining}}$):**
   $$B_{\text{remaining}} = P_{\text{agreed}} - P_{\text{total}}$$
5. **Payment Constraints:**
   - $P_{\text{pre}} \ge 0$
   - $P_k > 0$ for all subsequent payments
   - $P_{\text{total}} \le P_{\text{agreed}}$ (overpayment is rejected unless an explicit price change is approved)
   - An order is deemed **Fully Paid** when $B_{\text{remaining}} = 0.00$.

### Rule 3.3: Raw Material Costing & Valuation (Valuation Method)
To calculate order profitability and inventory valuation, material consumption must be attributed with historical purchase costs:
1. **Weighted Average Cost (WAC) Method (Baseline Recommended Policy):**
   When new stock is added:
   $$\text{WAC}_{\text{new}} = \frac{(\text{Current Qty} \times \text{Current WAC}) + (\text{Incoming Qty} \times \text{Incoming Unit Cost})}{\text{Current Qty} + \text{Incoming Qty}}$$
2. **Recorded Material Consumption Cost:**
   When an order consumes quantity $Q_{\text{consumed}}$ of material $M$:
   $$\text{Cost}_{\text{consumed}} = Q_{\text{consumed}} \times \text{Unit Cost at Time of Consumption}$$
   > [!IMPORTANT]
   > The allocated unit cost is frozen at the moment consumption is recorded. If material prices rise in the future, past order cost calculations remain immutable.
3. **Total Order Material Cost:**
   $$\text{Cost}_{\text{order\_materials}} = \sum_{m \in \text{Consumed}} (Q_m \times C_m)$$

### Rule 3.4: Profitability & Financial Health Formulas
1. **Order Gross Profit:**
   $$\text{Gross Profit}_{\text{order}} = P_{\text{agreed}} - \text{Cost}_{\text{order\_materials}}$$
2. **Gross Margin Percentage:**
   $$\text{Gross Margin} \% = \left(\frac{\text{Gross Profit}_{\text{order}}}{P_{\text{agreed}}}\right) \times 100$$
3. **Operating Expenses ($E_{\text{period}}$):**
   Sum of all recorded branch overheads and owner-level expenses over the specified period:
   $$E_{\text{period}} = \sum_{e \in \text{Expenses}} \text{Amount}_e$$
4. **Net Business Profit:**
   $$\text{Net Profit}_{\text{period}} = \sum \text{Gross Profit}_{\text{completed\_orders}} - E_{\text{period}}$$
5. **Revenue Recognition Policy:**
   - **Accrual Basis (Standard):** Full order revenue ($P_{\text{agreed}}$) is recognized when the order reaches the final "Delivered / Completed" stage.
   - **Cash Basis (Cash Flow Perspective):** Cash inflows represent actual payments collected ($P_{\text{total}}$) within the period.
   *Both metrics are presented distinctly in the owner dashboard to avoid confusion between cash flow and earned revenue.*

---

## 4. Customer Deduplication & Integrity

1. **Primary Identifier:** Mobile Phone Number.
2. **Normalization:** All phone numbers must be sanitized and formatted to an E.164-compatible or national standard format before uniqueness validation.
3. **Duplicate Detection:** During customer intake, if a entered phone number matches an existing customer in the branch or global registry:
   - The UI presents an immediate match dialog showing the existing customer's name and recent order count.
   - The administrator can select the existing profile or confirm creating a secondary contact if verified distinct.

---

## 5. Offline Data Rules

1. **Client ID Generation:** Every offline entity creation (Customer, Order, Payment, Expense, Stock Consumption) must generate a client-side UUID v4 (`clientMutationId`) prior to saving into IndexedDB.
2. **Optimistic Display:** The UI immediately reflects changes locally with an explicit badge: `[Local - Pending Sync]`.
3. **Idempotent Application:** The backend maintains an `IdempotencyLog` indexed by `clientMutationId`. If a network glitch causes repeated submission of the same outbox event, the backend detects the duplicate and returns the original confirmed record without re-executing stock deductions or payment entries.
4. **Negative Stock Rejection on Sync:** If an offline stock consumption transaction arrives at the server, but concurrent online transactions have depleted the stock, the sync engine flags a `SYNC_CONFLICT_INSUFFICIENT_STOCK` error and prompts the administrator for manual reconciliation.
