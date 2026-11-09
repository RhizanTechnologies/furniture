# Furniture Business ERP — Master Project Instructions & Implementation Prompts

# PART A — MASTER PROJECT INSTRUCTIONS

## 1. Your role

Act as a senior software architect, senior full-stack engineer, database designer, PWA specialist and UI/UX designer.

You are responsible for designing and implementing a production-quality Furniture Business Management ERP.

This is a real business application. Prioritize correctness, maintainability, usability, security and consistency over writing code quickly.

## 2. Understand the project before implementation

The application manages a furniture business with:

- One business owner.
- Multiple branches.
- One administrator assigned to each branch.
- Main-stock or branch-based stock configuration selected by the owner during branch creation.
- Furniture products and a showroom.
- Customers registered when they visit the business.
- Orders associated with customers and branches.
- Customizable order stages defined by the owner and managed by branch administrators.
- Order selling prices, prepayments, outstanding balances and deadlines.
- Raw materials, stock quantities, unit costs and material consumption.
- Business expenses.
- Revenue, costs, stock valuation and profitability.
- Product-level analytics and periodic reports.

The application must be a mobile-first Progressive Web App that works both online and offline.

Do not add unrelated functionality.

## 3. Strict scope rules

These instructions are mandatory.

1. Do not invent business requirements.
2. Do not introduce modules that the business did not request.
3. Do not create unnecessary user roles.
4. Do not introduce features simply because they are common in ERP applications.
5. Do not assume an unspecified business rule.
6. When a requirement is ambiguous, document it and ask for clarification before implementing the affected behavior.
7. Do not silently change existing business rules when implementing a new module.
8. Do not create duplicate implementations of existing functionality.
9. Do not use mock data as a substitute for actual functionality.
10. Do not claim a feature is complete without testing it.

Examples of features that must not be invented include payroll, employee attendance, supplier management, marketing campaigns, loyalty programs, delivery tracking and accounting integrations.

If a technical requirement is necessary for implementing an explicitly requested feature, explain its purpose and keep it within that feature's scope.

## 4. Technical architecture

Use a modular monolith.

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- Dexie.js
- IndexedDB
- React Hook Form
- Zod
- vite-plugin-pwa / Workbox
- Lucide icons

### Backend

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- REST API
- Swagger / OpenAPI
- Class-validator and class-transformer
- Proper authentication and authorization guards

### Infrastructure

- Docker
- Environment-based configuration
- S3-compatible object storage for uploaded images
- Automated tests
- Production build and deployment configuration

Use stable, maintained releases and compatible versions. Verify current official documentation before selecting APIs or implementation patterns. Do not install unnecessary libraries.

## 5. Architecture principles

Organize the application into clear business modules.

Frontend modules should be separated by business domain, with their own components, hooks, API functions, schemas and types.

Backend modules should follow NestJS modular architecture:

- Controllers: HTTP interface.
- Services: business logic.
- DTOs: request validation.
- Prisma: database access.
- Guards: access control.
- Domain-specific modules: independent business responsibilities.

Controllers must not contain complex business logic.

Business calculations must not be duplicated across frontend components and backend services.

The backend is the authority for financial and inventory calculations.

Use database transactions for operations involving multiple related financial, order or stock records.

Use database foreign keys and constraints wherever applicable.

Do not use floating-point arithmetic for financial values. Use appropriate decimal representations and preserve currency precision.

Maintain clear relationships between owner, branches, users, products, customers, orders, stock and financial records.

## 6. UI/UX requirements

This is a mobile-first ERP, not a desktop dashboard squeezed into a phone screen.

Design the interface around actual daily business operations.

Visual direction:

- Premium, modern furniture-business aesthetic.
- Warm neutral backgrounds.
- Deep charcoal text.
- Restrained wood-inspired accent colors.
- Clear typography and hierarchy.
- Consistent spacing.
- High-quality tables, cards, forms and dialogs.
- Accessible contrast.
- Consistent icons.
- Minimal unnecessary decoration.

Choose and document a consistent typography system, color tokens, spacing scale, radii and component conventions.

Use shadcn/ui as the component foundation and customize it consistently.

Mobile requirements:

- Responsive navigation.
- Touch-friendly controls.
- No horizontal overflow.
- Readable tables adapted to mobile layouts.
- Forms that are easy to complete on small screens.
- Clear loading, empty, error and success states.
- Appropriate mobile dialogs and sheets.

Do not make every page look like the same generic dashboard template.

Each page should be designed according to its actual business purpose.

## 7. Data integrity and security

Implement:

- Authentication.
- Owner and branch administrator authorization.
- Branch-level data access restrictions.
- Backend validation.
- Secure image uploads.
- Safe database transactions.
- Duplicate-request protection.
- Consistent error responses.
- Environment secret management.

A branch administrator must not gain access to another branch's restricted operations by manipulating API requests.

Frontend visibility is not an authorization mechanism.

Never trust financial amounts, stock quantities, branch IDs or user permissions supplied by the client without server-side validation.

## 8. Development discipline

Before modifying files:

- Inspect the existing project.
- Understand its structure.
- Read the relevant documentation.
- Identify dependencies and existing conventions.
- Reuse working implementations.

Never rewrite the entire project unnecessarily.

Never replace an existing architecture without explaining why.

Write readable, maintainable code.

Avoid unnecessary abstractions and premature optimization.

Every implementation phase must include:

- Files created or modified.
- Architectural decisions.
- Database changes.
- API changes.
- Tests performed.
- Known limitations.
- Commands needed to run and verify the work.

Do not proceed to another phase automatically.

---

# PART B — THE TEN IMPLEMENTATION PROMPTS

# PROMPT 1 — PROJECT UNDERSTANDING AND TECHNICAL BLUEPRINT

Before writing application code, thoroughly analyze and understand the entire business.

Your first responsibility is to create a technical blueprint.

Do not implement application functionality in this phase.

### 1. Analyze the business

Understand the relationship between:

- Business owner.
- Branches.
- Branch administrators.
- Stock configuration.
- Furniture products.
- Showroom.
- Customers.
- Orders.
- Custom order stages.
- Payments.
- Deadlines.
- Raw materials.
- Material consumption.
- Expenses.
- Revenue.
- Stock valuation.
- Analytics and reports.

### 2. Define the domain model

Identify the entities, their responsibilities, relationships, ownership and lifecycle.

Explain:

- Which entities belong to the overall business.
- Which entities belong to a branch.
- Which entities can be shared.
- Which records require historical preservation.
- Which operations require database transactions.
- Which data must be available offline.

Produce an entity relationship diagram using Mermaid.

### 3. Define business workflows

Document the actual workflows.

For example:

Customer registration → Order creation → Prepayment recording → Order stage progression → Material consumption where applicable → Payment completion.

Do not assume that every order follows the same production process.

The owner must be able to define the stage names.

### 4. Define financial calculations

Document the formulas and dependencies for:

- Order value.
- Payments received.
- Outstanding balance.
- Material costs.
- Stock value.
- Revenue.
- Gross profit.
- Operating expenses.
- Net profit.

Identify which accounting rules need owner confirmation.

Do not silently define revenue recognition or inventory valuation policies.

### 5. Define stock behavior

Document both requested configurations:

- Main-stock configuration.
- Branch-based stock configuration.

Identify the implications of each configuration without inventing additional stock workflows.

### 6. Define architecture

Produce:

- System architecture diagram.
- Frontend architecture.
- Backend architecture.
- Database architecture.
- API organization.
- Offline architecture.
- Image-upload architecture.
- Authentication and authorization architecture.

### 7. Identify uncertainties

Create a section named BUSINESS DECISIONS REQUIRED.

List unresolved business rules and ask only necessary questions.

Do not block unrelated architectural work because one business decision remains unanswered.

### Deliverables

Create:

- `docs/PROJECT_OVERVIEW.md`
- `docs/BUSINESS_REQUIREMENTS.md`
- `docs/BUSINESS_RULES.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/DATABASE_DESIGN.md`
- `docs/API_DESIGN.md`
- `docs/OFFLINE_ARCHITECTURE.md`
- `docs/BUSINESS_DECISIONS.md`

At the end, explain the proposed architecture and wait for approval before proceeding.

---

# PROMPT 2 — PROJECT FOUNDATION AND DEVELOPMENT ENVIRONMENT

Implement the technical foundation based on the approved blueprint.

Do not implement the actual business modules yet.

### 1. Project structure

Create a maintainable TypeScript monorepo.

Recommended structure:

- `apps/web`: React frontend.
- `apps/api`: NestJS backend.
- `packages/shared`: Shared types and contracts where appropriate.
- `docs`: Project documentation.

Use pnpm workspaces.

Do not introduce unnecessary packages or complicated monorepo tooling.

### 2. Frontend foundation

Configure:

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- shadcn/ui.
- React Router.
- TanStack Query.
- React Hook Form.
- Zod.
- Lucide icons.

Create reusable application foundations:

- Application layout.
- Navigation foundation.
- Page layout.
- Reusable form components.
- Data table foundation.
- Dialog and sheet conventions.
- Loading states.
- Empty states.
- Error states.
- Toast notifications.

Establish a coherent responsive design system.

### 3. Backend foundation

Configure:

- NestJS.
- PostgreSQL.
- Prisma.
- Environment configuration.
- Global validation.
- Global exception handling.
- API versioning.
- Swagger.
- Logging.
- Health endpoint.

Establish a consistent API response and error-handling strategy.

### 4. Database foundation

Configure Prisma and database migrations.

Use appropriate:

- Primary keys.
- Foreign keys.
- Unique constraints.
- Indexes.
- Decimal fields.
- Timestamps.

Do not create speculative business entities.

### 5. Development environment

Create:

- Docker configuration.
- Development environment examples.
- Database startup commands.
- Migration commands.
- Seed execution commands.
- Test commands.

Ensure a new developer can start the project using documented commands.

### 6. Testing foundation

Configure frontend and backend testing environments.

Add initial tests proving the foundation works.

### Deliverables

A working frontend, backend and database connection, with clear instructions for running everything.

Commit only after verification.

---

# PROMPT 3 — AUTHENTICATION, OWNER, BRANCHES AND ACCESS CONTROL

Implement the business ownership and branch-management foundation.

### 1. Authentication

Implement secure authentication appropriate for a PWA.

Handle:

- Login.
- Logout.
- Session restoration.
- Protected routes.
- Unauthorized access.
- Token/session expiration.

Use secure cookie-based authentication where compatible with the deployment architecture. Configure CSRF protection where required.

Do not store sensitive authentication credentials in IndexedDB or localStorage.

### 2. Owner

The business owner has access to the overall business.

The owner must be able to:

- View business-wide information.
- Create branches.
- Configure the stock mode for a branch.
- Assign one administrator to each branch.
- View branch information.

### 3. Branch management

Implement branch creation, editing and management.

The stock configuration must support the approved main-stock and branch-stock models.

Do not create additional stock-transfer or replenishment workflows unless explicitly approved.

### 4. Branch administrator

Implement one assigned administrator per branch.

The administrator must operate within their assigned branch.

Enforce these restrictions in the backend.

### 5. Authorization

Create centralized authorization rules.

Every branch-specific API must validate the authenticated user's actual branch access.

Do not trust branch IDs received from the frontend.

### 6. UI

Create:

- Owner dashboard foundation.
- Branch listing.
- Branch creation form.
- Branch editing form.
- Administrator assignment interface.
- Branch administrator interface.

Keep mobile and desktop layouts consistent.

### 7. Testing

Test:

- Owner permissions.
- Branch administrator permissions.
- Cross-branch access rejection.
- Branch creation.
- Administrator assignment.
- Stock configuration persistence.

Do not proceed until authorization is verified.

---

# PROMPT 4 — PRODUCT CATALOG, SHOWROOM AND IMAGE MANAGEMENT

Implement the furniture product catalog and showroom.

### 1. Furniture catalog

Create the initial furniture catalog using an explicitly approved seed dataset.

The catalog must be extendable.

The owner must be able to add new products later.

Do not hardcode product lists inside frontend components.

Store product information in the database.

Only introduce product attributes that have been approved in the requirements.

### 2. Product management

Implement:

- Product listing.
- Product details.
- Product creation.
- Product editing.
- Product image management.
- Product activation or availability only if required by the approved specification.

Ensure the catalog supports the actual furniture products the business sells.

### 3. Showroom

Implement a showroom representation connected to the product catalog.

A showroom must display the relevant furniture products.

Do not invent showroom reservation, rental or sales workflows.

### 4. Image-upload architecture

Image uploading must be implemented properly, not as a simple file input.

Frontend requirements:

- Drag-and-drop where appropriate.
- Mobile camera/gallery file selection.
- Image preview.
- File validation before upload.
- Upload progress.
- Remove and replace image.
- Clear upload errors.
- Retry failed uploads.
- Proper image loading and fallback states.

Backend requirements:

- Multipart upload or secure direct-to-object-storage uploads.
- File-size limits.
- Allowed image formats.
- MIME-type and file-signature validation.
- Secure generated filenames.
- Image processing and appropriate resizing.
- Storage outside the application database.
- Database metadata linking images to their products.
- Secure access to uploaded images.

Do not trust the filename or MIME type supplied by the browser.

Do not store image Base64 strings inside PostgreSQL or localStorage.

Use object storage and persist image metadata in PostgreSQL.

### 5. Form handling standards

All product forms must use:

- React Hook Form.
- Zod validation.
- shadcn/ui form fields.
- Clear field-level errors.
- Appropriate default values.
- Proper submission states.
- Server-error mapping.
- Duplicate-submission protection.

Ensure that an image upload failure does not silently result in an incorrectly saved product.

Define the correct upload lifecycle and cleanup behavior for failed or abandoned uploads.

### 6. Testing

Test product creation, editing, image upload, image replacement, invalid file rejection and mobile layouts.

---

# PROMPT 5 — CUSTOMERS, ORDERS AND CUSTOMIZABLE ORDER STAGES

Implement the customer and order-management system.

### 1. Customer management

Customers are registered as they arrive at the furniture business.

Implement:

- Customer creation.
- Customer listing.
- Customer details.
- Customer editing.
- Customer association with orders.

Avoid duplicate customers where the available business data allows reliable detection.

Do not invent a CRM system.

### 2. Order management

An order must be associated with:

- A customer.
- A branch.
- Relevant furniture products.
- Agreed selling amount.
- Prepayment.
- Remaining balance.
- Deadline.
- Current order stage.

Use the approved database model.

### 3. Custom order stages

The business owner defines the available stage names.

Branch administrators manage order progression using those configured stages.

Implement:

- Stage creation.
- Stage editing.
- Stage ordering.
- Stage availability.
- Assigning an order to a stage.
- Moving an order between stages.
- Viewing the current stage.

Preserve order history where required by the approved blueprint.

Do not hardcode stages such as Pending, Processing, Completed or Delivered.

The owner must control the stage names.

Define safe behavior when an owner edits or disables a stage that is already being used by existing orders.

### 4. Order details

Create a useful order-details interface showing:

- Customer.
- Products.
- Agreed price.
- Prepayment.
- Outstanding balance.
- Deadline.
- Current stage.
- Relevant order history.

Keep the interface easy to use on mobile.

### 5. Business validation

Prevent invalid order amounts, invalid dates and invalid associations.

Ensure order calculations come from authoritative backend logic.

Do not allow branch administrators to modify unrelated branches' orders.

### 6. Testing

Test customer creation, order creation, order updates, custom stage configuration, stage transitions and branch authorization.

---

# PROMPT 6 — INVENTORY, RAW MATERIALS AND PRODUCT COSTING

Implement the inventory and raw-material management system.

This module is financially important. Do not simplify it into basic quantity tracking.

### 1. Stock architecture

Implement the approved stock configuration.

Support the business's selected main-stock or branch-stock arrangement.

Ensure that stock ownership and branch access follow the approved rules.

### 2. Raw materials

Implement raw-material records with the necessary information:

- Material name.
- Measurement unit.
- Available quantity.
- Unit cost.
- Stock value.

Support stock being filled or replenished with recorded quantities and costs.

### 3. Stock-in records

When new material is added, record:

- Material.
- Quantity received.
- Unit cost.
- Total stock-in value.
- Date.
- Relevant stock location.

Historical purchase costs must be preserved.

### 4. Material consumption

Record the amount of each raw material consumed for furniture production.

For example:

Material: Wood.

Unit: Meter.

Cost: 200 ETB per meter.

Consumed: 4 meters.

Material cost contribution: 800 ETB.

Do not assume every furniture product has identical material consumption.

Support the approved method of defining or recording material consumption per product.

### 5. Cost calculations

Calculate material cost using recorded consumption and applicable historical unit costs.

Avoid recalculating historical furniture costs using today's material prices.

Make the costing method explicit and consistent.

If multiple stock-in prices exist, use the inventory valuation method approved in the business rules. Do not choose an accounting method silently.

### 6. Stock valuation

Calculate the value of remaining raw materials using the approved costing method.

Display:

- Available quantities.
- Unit costs.
- Stock values.
- Material-level totals.
- Overall stock value.

Do not count consumed materials as remaining inventory.

### 7. Inventory integrity

Use transactions for stock-affecting operations.

Prevent duplicate consumption.

Prevent invalid negative quantities unless an explicit business rule allows them.

Preserve historical records.

### 8. Testing

Test stock-in, consumption, unit conversion where applicable, historical cost preservation, stock valuation and invalid stock operations.

---

# PROMPT 7 — PAYMENTS, EXPENSES AND FINANCIAL MANAGEMENT

Implement the financial functionality using the approved financial rules.

### 1. Order payments

Implement payment recording for orders.

Each payment must be associated with its relevant order.

Support:

- Agreed order value.
- Prepayment.
- Additional payments.
- Total payments received.
- Outstanding balance.

Do not treat the prepayment as the entire order revenue.

### 2. Financial integrity

Calculate balances on the backend.

Do not rely on client-submitted totals.

Use decimal-safe calculations.

Prevent duplicate payment submissions through idempotency protection.

Preserve payment history.

### 3. Expenses

Implement business-expense recording.

Expenses must be associated with the relevant business and branch according to the approved financial model.

Record the necessary expense information:

- Description.
- Amount.
- Date.
- Relevant branch.
- Expense classification only if approved.

Expenses must affect the applicable financial reports.

### 4. Financial calculations

Implement the approved formulas for:

- Total order value.
- Total money collected.
- Outstanding customer balances.
- Material costs.
- Expenses.
- Revenue.
- Gross profit.
- Net profit.

Keep revenue, cash received and outstanding receivables separate.

Avoid double-counting prepayments.

Do not calculate profit by subtracting all received payments from expenses without considering the agreed accounting rules.

### 5. Financial UI

Create:

- Payment recording forms.
- Payment history.
- Outstanding balance displays.
- Expense creation forms.
- Expense listings.
- Financial summaries.

Ensure that the UI distinguishes between confirmed and pending offline financial operations.

### 6. Testing

Test partial payments, multiple payments, outstanding balances, expenses, financial totals and duplicate requests.

---

# PROMPT 8 — ANALYTICS AND BUSINESS REPORTING

Implement the analytics requested by the business owner.

Reports must be based on actual database records.

Do not generate artificial statistics.

### 1. Owner-level analytics

Provide business-wide reporting.

The owner must be able to understand the overall performance and compare branches where the underlying data supports comparison.

### 2. Product performance

Analyze:

- Most popular products by recorded orders or sales.
- Products generating the highest revenue.
- Products generating the highest profit.
- Products with lower performance.
- Product sales trends.

Keep revenue and profitability separate.

Do not assume that a product with the highest sales value is necessarily the most profitable.

### 3. Customer preference

Only report customer preference metrics that can be supported by actual collected information.

Do not invent customer ratings, reviews or satisfaction scores.

### 4. Periodic reporting

Support:

- Daily summaries where needed.
- Weekly reports.
- Monthly reports.
- Custom date ranges.

Ensure date filters are accurate and consistent.

### 5. Financial reporting

Provide the approved financial summaries:

- Revenue.
- Payments received.
- Outstanding balances.
- Material costs.
- Expenses.
- Profit.

### 6. Stock reporting

Provide stock quantities and stock valuation using the approved inventory model.

### 7. UI

Use meaningful visualizations.

Charts must have:

- Clear titles.
- Correct units.
- Useful labels.
- Appropriate date ranges.
- Empty states.
- Responsive layouts.

Avoid unnecessary charts.

Do not display fabricated percentage changes or growth metrics.

### 8. Performance

Use appropriate database aggregation and indexes.

Do not fetch every database record into the frontend to calculate business-wide analytics.

Test calculations against known sample datasets.

---

# PROMPT 9 — OFFLINE-FIRST PWA AND SYNCHRONIZATION ENGINE

Implement the complete offline-first experience.

Do not treat this as merely adding a service worker.

The application must support useful business operations without an active internet connection.

### 1. PWA foundation

Implement:

- Web app manifest.
- Installability.
- Service worker.
- Application-shell caching.
- Offline fallback.
- Versioned asset caching.
- Safe application updates.

Do not cache private API responses indiscriminately.

### 2. Local data storage

Use IndexedDB through Dexie.js.

Store the necessary:

- Cached business records.
- Cached product data.
- Cached customer data.
- Cached order data.
- Pending mutations.
- Pending image blobs.
- Synchronization metadata.

Keep sensitive authentication information out of IndexedDB.

### 3. Offline form submissions

Every approved offline-capable form must:

1. Validate the form.
2. Generate a stable client-side operation ID.
3. Save the operation locally.
4. Update the local UI.
5. Mark the record as pending synchronization.
6. Preserve the submitted data across page reloads.
7. Synchronize when connectivity becomes available.
8. Reconcile with the server response.

Do not lose a user's form submission because the network fails after they press Save.

### 4. Synchronization engine

Implement a persistent outbox.

Each operation must have the necessary information for safe synchronization:

- Unique operation ID.
- Entity reference.
- Operation type.
- Payload.
- Creation timestamp.
- Synchronization status.
- Retry information.

Support:

- Pending operations.
- Processing operations.
- Successfully synchronized operations.
- Failed operations.
- Retryable failures.
- Permanent validation failures.
- Conflict resolution.

Use idempotency keys on the backend.

Never assume that a failed network request means the server did not process the operation.

### 5. Conflict handling

Implement explicit conflict strategies.

Use server-side validation and record versions.

Do not blindly overwrite financial, inventory or order data.

For operations that cannot be safely resolved automatically, show the user a meaningful conflict state.

Never silently discard pending operations.

### 6. Image uploads while offline

Product images must also support the offline workflow.

When a user adds an image offline:

- Validate the file locally.
- Keep the image Blob in IndexedDB.
- Preserve the relationship between the pending product and image.
- Display a local preview.
- Mark the image as pending upload.
- Queue the image for synchronization.
- Upload it when connectivity returns.
- Update the product's image metadata after server confirmation.
- Retry recoverable failures.
- Handle permanent upload failures visibly.

Do not store Base64 images in localStorage.

Do not lose image data when the page reloads.

### 7. Synchronization scheduling

Use multiple synchronization triggers:

- Application startup.
- Network reconnection.
- User activity when online.
- Appropriate periodic foreground checks.
- Background Sync when supported.

Do not depend exclusively on Background Sync.

### 8. User interface

Display clear connectivity and synchronization states.

Users should understand:

- Whether they are online or offline.
- Whether their records are saved locally.
- How many operations are pending.
- Whether an upload is pending.
- Whether synchronization has failed.
- Whether a record is confirmed by the server.

Do not falsely display a locally saved financial transaction as a server-confirmed transaction.

### 9. Testing

Simulate:

- Initial offline usage.
- Creating customers offline.
- Creating orders offline.
- Editing records offline.
- Adding images offline.
- Reloading the app while offline.
- Reconnecting.
- Duplicate synchronization attempts.
- Network interruption during synchronization.
- Conflicting changes.
- Server validation errors.

The system must recover without losing data or creating duplicate financial and inventory operations.

---

# PROMPT 10 — INTEGRATION, QUALITY ASSURANCE AND PRODUCTION READINESS

Perform a complete review of the application.

Do not introduce additional features.

Your responsibility is to ensure that the implemented requirements work together correctly.

### 1. End-to-end business workflows

Test the complete business journey:

1. Owner logs in.
2. Owner creates branches.
3. Owner configures stock arrangements.
4. Owner assigns branch administrators.
5. Products are added to the catalog.
6. Product images are uploaded.
7. Customers are registered.
8. Orders are created.
9. Prepayments are recorded.
10. Order stages are managed by branch administrators.
11. Raw materials are recorded.
12. Material consumption is recorded.
13. Product costs are calculated.
14. Payments and expenses are recorded.
15. Stock valuation is calculated.
16. Owner reviews financial summaries.
17. Owner reviews product analytics and reports.

Use actual application workflows rather than testing isolated functions only.

### 2. Responsive UI testing

Test:

- Small mobile screens.
- Medium mobile screens.
- Tablets.
- Desktop screens.

Inspect:

- Navigation.
- Tables.
- Forms.
- Dialogs.
- Product images.
- Charts.
- Order details.
- Financial summaries.

Fix layout inconsistencies and usability issues.

### 3. Offline testing

Verify all offline-capable operations and image uploads.

Test persistence across application reloads.

Verify that the synchronization engine does not duplicate or silently lose operations.

### 4. Security testing

Test:

- Authentication.
- Authorization.
- Branch isolation.
- Invalid requests.
- File-upload validation.
- Sensitive data exposure.
- Duplicate requests.

### 5. Performance

Review:

- Database queries.
- Unnecessary frontend rerenders.
- Bundle size.
- Image sizes.
- API response times.
- Pagination.
- Database indexes.

Avoid premature optimization, but fix real bottlenecks.

### 6. Code quality

Review:

- Duplicated business logic.
- Unnecessary abstractions.
- Unused dependencies.
- Incorrect TypeScript types.
- Inconsistent error handling.
- Missing validation.
- Missing tests.
- Architectural violations.

### 7. Production readiness

Prepare:

- Production environment configuration.
- Database migration procedure.
- Object storage configuration.
- Secure deployment configuration.
- Build commands.
- Backup considerations.
- Operational documentation.

### 8. Final documentation

Update:

- Project architecture.
- Database documentation.
- API documentation.
- Business rules.
- Setup instructions.
- Deployment instructions.
- Offline synchronization documentation.

### Final deliverable

Provide a final report describing:

- Implemented requirements.
- Verified workflows.
- Test results.
- Remaining limitations.
- Outstanding business decisions.
- Deployment instructions.

Do not claim production readiness if important tests have not passed.

---

# PART C — RULES FOR WORKING WITH EACH PHASE

These rules apply throughout the project.

## Before coding

1. Read the master instructions.
2. Read the approved project documentation.
3. Inspect the existing implementation.
4. Understand the current database and APIs.
5. Identify dependencies.
6. Plan the changes.

## During coding

1. Implement only the current phase.
2. Follow existing architecture.
3. Reuse shared components.
4. Keep business logic in the backend.
5. Validate inputs on both client and server.
6. Write tests alongside implementation.
7. Do not introduce unrelated features.

## After coding

1. Run formatting.
2. Run type checking.
3. Run linting.
4. Run relevant tests.
5. Run the production build.
6. Review database migrations.
7. Review the final changes.
8. Update documentation.
9. Report the actual implementation status.

## Commit policy

Never create a commit claiming success before verification.

Each phase should result in a focused, reviewable Git commit.

If a phase depends on an unresolved business decision, implement only the independent parts and clearly document what remains blocked.

## Most important instruction

**Build the system the business actually needs, not the system you imagine the business might need.**

Correctness, clarity, simplicity and maintainability are more important than the number of features or lines of code.

Do not move to the next phase until the current phase has been reviewed and approved.
