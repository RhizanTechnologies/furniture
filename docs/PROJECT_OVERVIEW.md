# Furniture Business ERP — Project Overview

## 1. Executive Summary

The **Furniture Business ERP** is a production-quality, mobile-first Progressive Web Application (PWA) with offline capabilities, purpose-built for managing a modern furniture manufacturing and retail business. 

The application operates as a modular monolith with a React frontend and a NestJS/PostgreSQL backend. It provides end-to-end management spanning multi-branch administration, showroom and custom furniture catalogs, customer walk-in intake, custom stage-driven order progression, raw material inventory and batch-costed consumption, multi-phase order payments, operating expenses, financial health analytics, and executive business intelligence.

---

## 2. Business Context & Problem Statement

Furniture businesses combine retail showroom sales with on-demand manufacturing workflows. Operations frequently take place in environments with unreliable network connectivity (e.g., workshop floors, remote branch showrooms, transit).

Key operational challenges addressed:
1. **Multi-Branch Visibility & Flexible Stock Models:** The business owner needs complete oversight across multiple branches, supporting both centralized warehouse inventory ("Main Stock") and localized branch inventories ("Branch-based Stock").
2. **Dynamic Order Lifecycles:** Unlike standard retail checkout, custom furniture orders follow multi-stage production paths (e.g., Woodcutting, Joinery, Upholstery, Finishing, Quality Check, Delivery). The business owner must control stage configurations while branch administrators manage daily order transitions.
3. **Accurate Product Costing & Material Tracking:** Tracking unit purchase costs of raw materials (timber, foam, fabric, hardware) across purchase batches, and capturing exact material consumption per order to determine true gross profit.
4. **Financial Control & Split Payments:** Managing prepayments, progress disbursements, remaining balances, operating overhead, and receivables without numerical inaccuracies or double-counting.
5. **Offline Reliability:** Branch administrators and workshop staff must be able to register customers, log orders, attach offline photos, and record payments uninterrupted when internet connection drops, with reliable synchronization upon reconnection.

---

## 3. System Actors and Role Responsibilities

The system defines strictly **two authenticated user roles**, preventing unnecessary role proliferation:

| Actor | Scope & Permissions | Core Responsibilities |
| :--- | :--- | :--- |
| **Business Owner** | Global / Enterprise-wide | - Creates and manages all branches.<br>- Configures branch stock mode (`MAIN_STOCK` vs `BRANCH_STOCK`).<br>- Assigns exactly one Branch Administrator per branch.<br>- Configures global customizable order stages.<br>- Manages overall furniture product catalog & showroom.<br>- Accesses enterprise-wide analytics, cross-branch comparisons, and consolidated financials. |
| **Branch Administrator** | Branch-Scoped | - Exactly one administrator assigned per branch.<br>- Registers walk-in customers.<br>- Creates and manages orders for their assigned branch.<br>- Moves orders through owner-configured stages.<br>- Records material stock-in and production consumption (based on stock mode).<br>- Collects prepayments and progress payments.<br>- Records branch-specific expenses.<br>- Views branch-level operational data. |

> [!IMPORTANT]
> A Branch Administrator is strictly isolated to their assigned branch. Backend authorization guards reject any operation targeting or reading another branch's orders, finances, or stock records.

---

## 4. In-Scope Modules

The system is organized into clean, focused business domains:

1. **Authentication & Branch Management:** Cookie-based session auth, role-based authorization, branch CRUD, stock mode assignment, and administrator binding.
2. **Product Catalog & Showroom:** Furniture specifications, dimensions, materials, and high-performance image uploads with S3-compatible storage and local offline caching.
3. **Customer Intake:** Streamlined mobile registration for walk-in showroom visitors.
4. **Order Management & Custom Stages:** Order logging, items, customer association, target delivery deadlines, agreed prices, prepayments, outstanding balance calculation, and dynamic owner-defined stage transitions.
5. **Raw Material Inventory & Costing:** Stock-in records, historical purchase batch prices, stock replenishment, raw material consumption tracking per order, and real-time stock valuation.
6. **Financial Management:** Payment receipts, prepayment accounting, accounts receivable tracking, branch operating expenses, gross profit, and net profit calculations.
7. **Business Analytics & Reporting:** Executive owner dashboard, product revenue vs. profit analysis, sales trends, branch performance comparison, and periodic reports.
8. **Offline-First Synchronization Engine:** IndexedDB storage (Dexie.js), outbox pattern, optimistic UI updates, conflict detection, offline photo capture, and idempotent background sync.

---

## 5. Explicit Out-of-Scope Boundaries (Strict Anti-Creep)

In strict adherence to the project scope rules, the following features are **explicitly excluded**:
- ❌ No employee payroll, time cards, or staff salary tracking.
- ❌ No staff attendance or shift scheduling.
- ❌ No third-party supplier management portals or automated vendor purchase order workflows.
- ❌ No marketing campaigns, bulk SMS, or newsletter blasts.
- ❌ No customer loyalty programs, coupon codes, or reward point engines.
- ❌ No GPS-based delivery tracking, courier integrations, or fleet telematics.
- ❌ No external accounting integrations (e.g., QuickBooks, Xero). All financial calculations are self-contained.
- ❌ No customer self-service e-commerce portal (the application is an internal business operations ERP).

---

## 6. Technology Stack Summary

| Layer | Technologies Selected | Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18+, TypeScript, Vite | Fast compilation, modern tooling, full type safety. |
| **UI & Styling** | Tailwind CSS, shadcn/ui, Lucide Icons | Mobile-first responsiveness, accessible components, refined wood-inspired aesthetic. |
| **State & Data Fetching** | TanStack Query v5, React Hook Form, Zod | Robust server state caching, optimistic updates, declarative validation schemas. |
| **Offline Storage & PWA** | Dexie.js (IndexedDB), vite-plugin-pwa (Workbox) | Structured client persistence, outbox pattern, reliable asset and app-shell caching. |
| **Backend Framework** | NestJS, TypeScript | Structured modular monolith architecture, dependency injection, strict validation pipes. |
| **Database & ORM** | PostgreSQL 16+, Prisma ORM | Relational data integrity, ACID transactions for financial/stock records, schema migrations. |
| **Validation & Docs** | `class-validator`, `class-transformer`, Swagger / OpenAPI | Strong request validation, self-documenting REST APIs. |
| **Object Storage** | S3-compatible storage (e.g., MinIO / AWS S3) | Decoupled image binaries from DB, pre-signed upload URLs, thumbnails/optimization. |
| **DevOps & Environment** | Docker, Docker Compose, pnpm workspaces | Reproducible containerized local/production environments, monorepo management. |
