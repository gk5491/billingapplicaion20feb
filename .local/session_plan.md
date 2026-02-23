# Objective
Build a complete Vendor Items module, enhance vendor bill creation with stock logic and PO linkage, add bill-to-admin submission workflow, and create a vendor payment receipt section.

# Tasks

### T001: Create Vendor Items Backend (Data + API) ✅ COMPLETED
- Backend CRUD endpoints added to server/routes.ts
- vendorItems.json created
- Bill submit/approve/reject with stock management endpoints added

### T002: Create Vendor Items Frontend Page
- **Blocked By**: [T001] ✅
- **Details**:
  - Create `client/src/pages/vendor-items.tsx` matching the admin Items page layout (`client/src/modules/items/pages/ItemsPage.tsx`)
  - Same UI: list view with table (columns: Name, Type, HSN/SAC, Rate, Available Quantity, Status), search, filters (type, status), pagination
  - Add/Edit item form (dialog) with all fields including `availableQuantity` (required number field)
  - Delete with confirmation dialog
  - Status toggle (Active/Inactive)
  - Data fetching: All API calls to `/api/vendor/items` with Bearer token from `useAuthStore().token` in Authorization header
  - Item fields in form: name, type (goods/service), hsnSac, usageUnit, rate/sellingPrice, purchaseRate/costPrice, description, salesDescription, purchaseDescription, taxPreference, intraStateTax, interStateTax, salesAccount, purchaseAccount, availableQuantity, isActive
  - Add route `/vendor/items` in `client/src/App.tsx` — find the vendor routes section (around line 112-118) and add: `<Route path="/vendor/items" component={VendorItemsPage} />`
  - Add lazy import at top: `const VendorItemsPage = lazy(() => import("@/pages/vendor-items"));`
  - Add "Items" nav item in vendor sidebar in `client/src/components/layout/AppShell.tsx` — find the vendor menu section (look for `user?.role === 'vendor'`) and add `{ name: "Items", path: "/vendor/items", icon: Package }` after Dashboard entry
  - Files: `client/src/pages/vendor-items.tsx`, `client/src/App.tsx`, `client/src/components/layout/AppShell.tsx`
  - Reference: `client/src/modules/items/pages/ItemsPage.tsx` for UI pattern
  - Acceptance: Vendor can CRUD items with available quantity, items are vendor-scoped

### T003: Create Vendor Bill Create Page
- **Blocked By**: [T001] ✅
- **Details**:
  - Create `client/src/pages/vendor-bill-create.tsx` for vendor bill creation
  - UI must match admin `client/src/pages/bill-create.tsx` layout but with these changes:
    - **Organization auto-fill**: Instead of vendor name dropdown, show the admin organization name/address/GST at the top. Fetch from `/api/organizations` (no auth needed). Display company name, address, GSTIN, contact details as read-only fields.
    - **Purchase Order dropdown**: Required field near the top. Fetch POs from `/api/vendor/purchase-orders` (with Bearer token). Only show POs with status "Accepted" or "ISSUED" that haven't been fully billed. When PO selected, auto-populate bill items from PO items.
    - **Item selection**: In the items table, load items from `/api/vendor/items` (Bearer token). When vendor selects an item, auto-fill rate, tax info. Show available quantity as info text next to each row.
    - **Quantity validation**: Bill quantity cannot exceed item's available quantity. Show red error text below quantity input if exceeded.
    - **Bill number**: Fetch next number from `/api/bills/next-number`
    - **Save**: POST to `/api/vendor/bills` with Bearer token. Save as DRAFT status.
  - Add route `/vendor/bills/new` in `client/src/App.tsx` BEFORE the `/vendor/bills` route
  - Add lazy import: `const VendorBillCreatePage = lazy(() => import("@/pages/vendor-bill-create"));`
  - Files: `client/src/pages/vendor-bill-create.tsx`, `client/src/App.tsx`
  - Reference: `client/src/pages/bill-create.tsx` for complete UI layout
  - Acceptance: Vendor can create bill from accepted PO with vendor items and stock validation

### T004: Add Submit/Convert Buttons + Admin Approve/Reject UI
- **Blocked By**: [T003]
- **Details**:
  - In `client/src/pages/vendor-bills.tsx`:
    - Add "Send to Customer (Admin)" button in bill detail view header area, visible when bill status is DRAFT or PENDING
    - On click: call `PATCH /api/vendor/bills/:id/submit` with Bearer token
    - After submit: show "Submitted" badge, hide submit button
    - Add "Edit" button for REJECTED bills that navigates to `/vendor/bills/new?billId={id}` for editing
  - In `client/src/pages/vendor-purchase-orders.tsx`:
    - Add "Convert to Bill" button for accepted POs (status === "Accepted")
    - On click: navigate to `/vendor/bills/new?purchaseOrderId={po.id}`
  - In admin bills page (`client/src/pages/bills.tsx`):
    - For vendor-submitted bills (status === "SUBMITTED"), show Approve/Reject buttons
    - Approve: call `PATCH /api/vendor/bills/:id/approve`
    - Reject: show dialog with mandatory reason field, call `PATCH /api/vendor/bills/:id/reject` with `{ reason }`
    - For vendor-submitted bills, disable editing of items/quantity/amount (read-only)
  - Files: `client/src/pages/vendor-bills.tsx`, `client/src/pages/vendor-purchase-orders.tsx`, `client/src/pages/bills.tsx`
  - Acceptance: Full submit→approve/reject workflow works

### T005: Vendor Payment Receipt Section
- **Blocked By**: [T004]
- **Details**:
  - Update `client/src/pages/vendor-payment-history.tsx` to add receipt functionality:
    - In payment detail view, add dropdown for Payment Status: Not Verified, Verified, PAID
    - Add "Send Receipt" button
    - Receipt preview modal before sending
  - Receipt flow: Vendor selects "Paid" → clicks "Send Receipt" → POST /api/vendor/receipts → admin receives
  - Once sent, admin can only view (not edit)
  - Files: `client/src/pages/vendor-payment-history.tsx`, `server/routes.ts`
  - Acceptance: Vendor can generate, preview, and send payment receipts
