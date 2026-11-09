# Furniture Business ERP — Business Decisions & Architectural Clarifications

## BUSINESS DECISIONS REQUIRED

The following business rules require confirmation from the Business Owner. To prevent development stalls, each item includes a **Recommended Technical Default** that aligns with industry accounting and ERP standards. We proceed with the recommended defaults unless instructed otherwise.

---

### Decision 1: Inventory Valuation Method (Cost of Goods Sold)
- **Context:** When raw materials (e.g. timber, fabric) are purchased in batches at fluctuating prices, what method should determine the unit cost allocated when an order consumes materials?
- **Options:**
  1. **(Recommended) Moving Weighted Average Cost (WAC):** Recalculates unit cost dynamically whenever new stock arrives. Smooths price spikes, standard in manufacturing ERPs.
  2. **First-In, First-Out (FIFO):** Consumes materials from the oldest batch until exhausted, then moves to the next batch. Requires batch-level tracking.
- **Architectural Impact:** The database schema supports batch tracking via `MaterialStockIn`, and defaults to Weighted Average Cost for material consumption unless FIFO batch selection is requested.

---

### Decision 2: Revenue Recognition Policy
- **Context:** How should order revenue be recognized in financial profitability reports?
- **Options:**
  1. **(Recommended) Point of Delivery / Completion (Accrual Basis):** Agreed order revenue ($P_{\text{agreed}}$) and gross margin are recognized only when an order reaches the final completion/delivered stage. Prepayments are treated as unearned customer deposits (cash liability) until fulfillment.
  2. **Cash Received Basis:** Revenue is recognized whenever money is collected (prepayments and progress payments).
- **Architectural Impact:** The reporting engine separates "Cash Collected" from "Earned Revenue", allowing the Owner to view both cash flow and earned income without ambiguity.

---

### Decision 3: Customer Phone Number Uniqueness
- **Context:** Can two different walk-in customers share the same telephone number (e.g. family members, spouses, business partners)?
- **Options:**
  1. **(Recommended) Phone Number is Unique Identifier:** A phone number uniquely identifies a customer profile. If entered again, the system prompts the administrator to link the new order to the existing customer profile.
  2. **Soft Warning / Allow Duplicate Phone:** Allows multiple customer profiles with the same phone number if confirmed by the administrator.
- **Architectural Impact:** A phone index is created; deduplication warning logic is surfaced during intake.

---

### Decision 4: Material Consumption from Main Stock
- **Context:** For branches configured with `stockMode = MAIN_STOCK`, can the Branch Administrator log material consumption directly against the central warehouse, or must the Owner/Central warehouse first transfer material to the branch?
- **Options:**
  1. **(Recommended) Direct Main-Stock Consumption:** Since `MAIN_STOCK` branches share the central inventory pool, branch administrators directly record consumption against the central stock without separate stock-transfer paperwork.
  2. **Stock Allocation Workflow:** Central stock must be formally allocated before a branch can consume it.
- **Architectural Impact:** In alignment with Prompt 1 and 3 strict instructions ("Do not create additional stock-transfer or replenishment workflows unless explicitly approved"), Option 1 is adopted.

---

### Decision 5: Editing or Deactivating Active Order Stages
- **Context:** What occurs if the Owner disables or renames an Order Stage that currently has active, in-progress orders?
- **Options:**
  1. **(Recommended) Disallow Deletion, Allow Inactive Flag:** Prevent deleting any stage that has ever been used. Inactive stages cannot be assigned to new or advancing orders, but orders currently in that stage remain valid until moved forward.
  2. **Mandatory Order Migration:** If a stage is deactivated, the Owner must reassign all orders currently in that stage to an alternative active stage.
- **Architectural Impact:** Supported cleanly via `isActive` boolean and relational integrity constraints on foreign keys.

---

### Decision 6: Standard Currency & Number Formatting
- **Context:** Currency and decimal notation standard.
- **Confirmation:** Default currency is Ethiopian Birr (`ETB`), formatted with 2 decimal places (e.g., `12,500.00 ETB`). High-precision calculations use fixed-point `Decimal` in both database and calculations.
