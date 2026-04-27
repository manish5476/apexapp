# Apex App End-to-End QA Test Cases

## Scope
This suite is designed to test complete core business flow in `apexapp`:
- Authentication and session
- Product lifecycle
- Customer lifecycle
- Invoice and payment lifecycle
- Ledger and transaction verification
- Navigation forward/back flow
- Analytics basic validation

Run this suite on:
1. Android (preferred)
2. iOS (if available)
3. Web (optional sanity)

---

## Environment Setup
1. Login with a user that has full permissions.
2. Ensure backend API and socket are reachable.
3. Ensure at least one branch exists.
4. Clear local app cache/session before first run.

---

## Test Data Template
Use these values (or equivalents):
- Product Name: `QA Product A`
- Product SKU: `QA-SKU-1001`
- Product Price: `1000`
- Customer Name: `QA Customer One`
- Customer Phone: `9999990001`
- Invoice Qty: `2`
- Invoice Rate: `1000`
- Payment Amount: `2000`

---

## Test Suite A: Authentication and Session

### TC-A1 Login Success
Steps:
1. Open app.
2. Login with valid credentials.
Expected:
1. User lands on dashboard.
2. No crash.
3. Drawer opens and shows authorized modules.

### TC-A2 Logout
Steps:
1. Logout from profile/organization.
Expected:
1. Redirected to login.
2. Protected routes not accessible without re-login.

### TC-A3 Session Restore
Steps:
1. Login.
2. Kill app.
3. Reopen app.
Expected:
1. Session restores correctly.
2. User remains authenticated (unless token expired).

---

## Test Suite B: Product Lifecycle

### TC-B1 Create Product
Steps:
1. Go to `Products`.
2. Tap `Create`.
3. Fill required fields and save.
Expected:
1. Product created successfully.
2. Product visible in list.

### TC-B2 Product Detail and Edit
Steps:
1. Open created product detail.
2. Edit price/stock fields.
3. Save.
Expected:
1. Changes persist.
2. Updated values visible in detail and list.

### TC-B3 Product Search
Steps:
1. Search by SKU/name.
Expected:
1. Correct matching results shown.

---

## Test Suite C: Customer Lifecycle and Navigation

### TC-C1 Create Customer
Steps:
1. Go to `Customers`.
2. Tap `Create Customer`.
3. Save required fields.
Expected:
1. Customer appears in customer list.

### TC-C2 Customer List -> Detail Navigation
Steps:
1. Tap customer from list.
Expected:
1. Opens correct customer detail.
2. Header and tabs load.

### TC-C3 Customer Detail -> Edit -> Back
Steps:
1. From detail tap edit.
2. Save changes.
3. Use back navigation.
Expected:
1. Returns to customer detail.
2. Back again returns to customer list.

### TC-C4 Customer Detail -> Invoice/Payment Links
Steps:
1. In customer detail, open invoice item.
2. Back.
3. Open payment item.
4. Back.
Expected:
1. Each route opens correct detail page.
2. Back returns to customer detail consistently.

### TC-C5 Safe Back Fallback
Steps:
1. Open customer detail directly via deep-link/reload (no prior stack).
2. Press back.
Expected:
1. App routes to customer list safely.

---

## Test Suite D: Invoice and Payment Lifecycle

### TC-D1 Create Invoice from Customer
Steps:
1. From customer detail tap `New Invoice`.
2. Add created product with quantity/rate.
3. Save invoice.
Expected:
1. Invoice generated.
2. Status visible in invoice list/detail.

### TC-D2 Invoice Detail Verification
Steps:
1. Open invoice detail.
Expected:
1. Product lines, totals, customer mapping, branch are correct.

### TC-D3 Receive Payment
Steps:
1. Go to payments.
2. Create payment for created invoice/customer.
3. Save.
Expected:
1. Payment saved.
2. Invoice balance updates.
3. Customer outstanding updates.

### TC-D4 Payment Detail and Back Flow
Steps:
1. Open payment detail.
2. Back navigation.
Expected:
1. Returns to expected previous screen (customer detail or payment list).

---

## Test Suite E: Ledger and Financial Consistency

### TC-E1 Customer Ledger Consistency
Steps:
1. Open customer detail -> ledger tab.
Expected:
1. Invoice entries and payment entries appear.
2. Running/closing balance is mathematically correct.

### TC-E2 Global Ledger Consistency
Steps:
1. Go to `Ledger` module.
2. Filter by customer.
Expected:
1. Matches customer ledger totals.

---

## Test Suite F: Drawer and Route Integrity

### TC-F1 Drawer Menu Visibility by Permission
Steps:
1. Login with full-permission user.
2. Validate all expected menu items.
3. Login with limited-permission user.
Expected:
1. Unauthorized menu items hidden.
2. No `Layout children must be of type Screen` warnings in logs.

### TC-F2 Hidden Detail Routes
Steps:
1. Navigate to details (`customer/[id]`, `invoice/[id]`, `payment/[id]`).
Expected:
1. Detail routes work.
2. They do not appear as top-level drawer items.

---

## Test Suite G: Socket and Reconnect Stability

### TC-G1 Initial Socket Connect
Steps:
1. Login and wait.
Expected:
1. Socket status becomes connected.
2. No repeated hard error spam.

### TC-G2 Network Drop and Recovery
Steps:
1. Disable network for 20 seconds.
2. Re-enable network.
Expected:
1. Socket enters reconnecting and recovers.
2. App remains usable.

### TC-G3 App Background/Foreground
Steps:
1. Put app in background for 30+ seconds.
2. Return to foreground.
Expected:
1. Socket reconnect logic works.
2. No crash.

---

## Test Suite H: Analytics Basic Regression

### TC-H1 Analytics Hub Loads
Steps:
1. Open Analytics Hub.
Expected:
1. Screen list loads.
2. Search and category filters work.

### TC-H2 Analytics Screen Filter Apply
Steps:
1. Open any analytics screen.
2. Set date range and branch.
3. Apply filters.
Expected:
1. API request succeeds.
2. Result metrics refresh.

### TC-H3 Date Validation
Steps:
1. Enter invalid date format.
2. Try apply.
Expected:
1. Validation error shown.
2. Request blocked until corrected.

---

## Test Suite I: Delete and Error Handling

### TC-I1 Delete Customer with Dependencies
Steps:
1. Try deleting customer linked to invoice/payment.
Expected:
1. Backend validation/error handled gracefully.
2. No app crash.

### TC-I2 API Error Handling
Steps:
1. Temporarily point API URL to invalid host (or disable backend).
2. Perform list/create actions.
Expected:
1. User-friendly error shown.
2. No endless loading.

---

## Exit Criteria (Release Gate)
Mark release-ready only if:
1. All critical tests pass: A1, B1, C2, C4, C5, D1, D3, E1, F1, G2.
2. No navigation dead-ends.
3. No repeated layout warning spam.
4. No fatal socket error loop.
5. Data consistency verified across customer/invoice/payment/ledger.

---

## Optional Automation Suggestion
If you want next step automation, we can convert critical cases into:
1. Detox end-to-end tests for navigation and forms.
2. API contract tests for analytics filters.
3. Smoke CI run for login -> product -> customer -> invoice -> payment.

---

## Automated Smoke Test (Actual Code)

File:
- `scripts/e2e-crm-smoke.js`

Run:
1. Option A (recommended): create `.env.e2e` in app root (you can copy `.env.e2e.example`).
2. Option B: set env vars in terminal session.
3. Required env keys:
   - `E2E_API_URL` (optional, defaults to `EXPO_PUBLIC_API_URL` or `http://127.0.0.1:5000/api`)
   - `E2E_EMAIL` (required)
   - `E2E_PASSWORD` (required)
   - `E2E_SHOP_ID` (required)
   - `E2E_BRANCH_ID` (optional)
   - `E2E_CATEGORY_ID` (optional)
   - `E2E_UNIT_ID` (optional)
4. Execute:
   - `npm run test:e2e:smoke`

What it validates:
1. Login token generation.
2. Master mapping resolution (`branches`, `categories`, `units`) using your backend dropdown endpoints.
3. Product creation and product search.
4. Customer creation and customer fetch.
5. Invoice creation from created product/customer.
6. Payment creation mapped to created invoice/customer.
7. Invoice totals, paid amount, and balance consistency.
