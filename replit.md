# Billing Accounting Application

## Overview
A full-stack accounting application for comprehensive financial management, including invoices, customers, products, vendors, and expenses. It aims to provide an enterprise-grade solution for businesses with a modern tech stack and modular architecture for scalability and maintainability.

## User Preferences
I want iterative development. Ask before making major changes. I prefer detailed explanations. Do not make changes to the folder `Z`. Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
- **Framework**: React 19 with TypeScript, Vite 7
- **UI Components**: Radix UI components with Tailwind CSS for modern design.
- **Routing**: Wouter with lazy loading.
- **State Management**: Zustand for global state, TanStack Query for server state.
- **Forms**: React Hook Form with Zod validation.

### Technical Implementations
- **Backend Server**: Express 4
- **Database**: PostgreSQL with Drizzle ORM (`pg` driver).
- **API Versioning**: All API routes are prefixed with `/api/v1`.
- **Authentication**: JWT-based authentication (planned).
- **Validation**: Zod schemas for both frontend and backend.
- **Deployment**: Designed for stateless web application deployment.

### Feature Specifications
- **Core Modules**: Dashboard, Invoice, Customer, Product & Services, Estimates, Vendor, Expense, Purchase Order, Bill, Payment, Time Tracking, Banking, Filing & Compliance, Accountant Collaboration, Document Management, Reports, and Settings.
- **Frontend Structure**: Enterprise modular structure (`client/src/modules/`) with dedicated components, pages, hooks, API, types, and services per feature.
- **Backend Structure**: Clean Architecture / Modular Monolith (`server/src/modules/`) with distinct controllers, services, models, routes, validators, and repositories per module. Centralized middleware for authentication, error handling, logging, and validation.
- **Vendor Credit Flow**: Manages vendor credits through creation (OPEN), adjustment (PARTIALLY_APPLIED/APPLIED), and refund (REFUNDED) states, impacting vendor balances, bills, and bank accounts with corresponding accounting entries.
- **Purchase Order & Bill Workflows**: Supports creation of bills from purchase orders and vendor credits from bills, pre-populating data and managing status updates.
- **Sales Entry Point Flow**: Centralized transaction bootstrap hooks for customer auto-population, tax calculation (CGST/SGST/IGST), and immutable customer snapshotting across various sales-related create pages (Invoice, Quote, Sales Order, Delivery Challan, Credit Note, Payments Received).
- **Two-Way Vendor-Admin Workflow**: Implements a full two-way workflow for Purchase Orders, Bills, and Payments, allowing both vendors and admins to perform actions (e.g., Vendor Accept/Reject PO, Admin Approve/Reject Bills, Vendor Confirm/Dispute Payments). Consistent UI across portals with dedicated vendor and admin pages. Admin routes do not require authentication, while vendor routes use Bearer token auth with `requireRole("vendor")`.

### System Design Choices
- **Development Mode**: Express server with Vite middleware for HMR.
- **Production Mode**: Express serves pre-built static files from `dist/public`.
- **API Pattern**: Modules expose functionalities via versioned API endpoints, `/{module}/{resource}`.
- **Module Architecture**: Frontend modules export pages, types, API functions, services, and hooks. Backend modules follow Clean Architecture with distinct layers.

## External Dependencies
- **Database**: PostgreSQL (via Neon)
- **ORM**: Drizzle ORM
- **Frontend Libraries**: React, Vite, Radix UI, Tailwind CSS, Wouter, Zustand, TanStack Query, React Hook Form, Zod.
- **Backend Libraries**: Express, Zod.