#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DEFAULT_API_URL = 'http://127.0.0.1:5000/api';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function nowIso() {
  return new Date().toISOString();
}

function fail(message, details) {
  console.error(`\n[FAIL] ${message}`);
  if (details) {
    console.error(typeof details === 'string' ? details : JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

function info(message) {
  console.log(`[INFO] ${message}`);
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function pickResponseData(response) {
  if (!response || typeof response !== 'object') return response;
  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }
  return response;
}

function firstArrayItem(value) {
  if (Array.isArray(value) && value.length > 0) return value[0];
  return null;
}

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value._id || value.id || value.value || null;
  }
  return null;
}

function normalizeEntity(payload, keys) {
  if (!payload || typeof payload !== 'object') return null;
  for (const key of keys) {
    const candidate = payload[key];
    if (candidate && typeof candidate === 'object') {
      return candidate;
    }
  }
  return payload;
}

async function request(client, config) {
  try {
    const response = await client.request(config);
    return pickResponseData(response);
  } catch (error) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    fail(
      `Request failed: ${config.method || 'GET'} ${config.url} (${status || 'no-status'})`,
      data || error.message
    );
  }
}

async function getDropdownId(client, endpoint, explicitId) {
  if (explicitId) return explicitId;
  const result = await request(client, {
    method: 'GET',
    url: `/v1/dropdowns/${endpoint}`,
    params: { limit: 5 },
  });
  const row = firstArrayItem(result?.data || result?.results || result);
  const id = normalizeId(row?.value || row?.data || row?._id || row?.id);
  if (!id) fail(`Unable to resolve dropdown id for "${endpoint}"`);
  return id;
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), '.env.e2e'));
  loadEnvFile(path.resolve(process.cwd(), '.env'));

  const apiUrl =
    process.env.E2E_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    DEFAULT_API_URL;
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  const uniqueShopId = process.env.E2E_SHOP_ID;
  const branchIdInput = process.env.E2E_BRANCH_ID || '';
  const categoryIdInput = process.env.E2E_CATEGORY_ID || '';
  const unitIdInput = process.env.E2E_UNIT_ID || '';

  if (!email || !password || !uniqueShopId) {
    fail(
      'Missing required env vars. Required: E2E_EMAIL, E2E_PASSWORD, E2E_SHOP_ID. Optional: E2E_API_URL, E2E_BRANCH_ID, E2E_CATEGORY_ID, E2E_UNIT_ID'
    );
  }

  info(`Using API: ${apiUrl}`);
  info(`Run started: ${nowIso()}`);

  const baseClient = axios.create({
    baseURL: apiUrl.replace(/\/+$/, ''),
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  info('Step 1/8: Login');
  const loginResult = await request(baseClient, {
    method: 'POST',
    url: '/v1/auth/login',
    data: { email, password, uniqueShopId },
  });

  const token = loginResult?.token;
  if (!token) fail('Login succeeded but token not present in response', loginResult);
  pass('Login successful');

  const authClient = axios.create({
    baseURL: apiUrl.replace(/\/+$/, ''),
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  info('Step 2/8: Resolve master ids (branch/category/unit)');
  const branchId = await getDropdownId(authClient, 'branches', branchIdInput);
  const categoryId = await getDropdownId(authClient, 'categories', categoryIdInput);
  const unitId = await getDropdownId(authClient, 'units', unitIdInput);
  pass(`Resolved ids branch=${branchId}, category=${categoryId}, unit=${unitId}`);

  const stamp = Date.now();
  const productName = `E2E Product ${stamp}`;
  const sku = `E2E-SKU-${stamp}`;
  const customerName = `E2E Customer ${stamp}`;
  const phone = `9${String(stamp).slice(-9)}`;
  const itemQty = 2;
  const itemRate = 120;
  const expectedInvoiceTotal = itemQty * itemRate;
  const paymentAmount = expectedInvoiceTotal;

  info('Step 3/8: Create product');
  const productCreate = await request(authClient, {
    method: 'POST',
    url: '/v1/products',
    data: {
      name: productName,
      sku,
      categoryId,
      unitId,
      sellingPrice: itemRate,
      purchasePrice: 80,
      inventory: [{ branchId, quantity: 25, reorderLevel: 5 }],
      taxRate: 0,
    },
  });

  const productEntity = normalizeEntity(productCreate?.data || productCreate, ['product']);
  const productId = normalizeId(productEntity?._id || productEntity?.id);
  if (!productId) fail('Product created but id missing', productCreate);
  pass(`Product created: ${productId}`);

  info('Step 4/8: Verify product search');
  const productSearch = await request(authClient, {
    method: 'GET',
    url: '/v1/products/search',
    params: { q: sku },
  });
  const productSearchRows = productSearch?.data?.products || productSearch?.data || [];
  if (!Array.isArray(productSearchRows) || productSearchRows.length === 0) {
    fail('Product search returned empty results', productSearch);
  }
  pass('Product search verified');

  info('Step 5/8: Create customer');
  const customerCreate = await request(authClient, {
    method: 'POST',
    url: '/v1/customers',
    data: {
      name: customerName,
      phone,
      email: `e2e.${stamp}@example.com`,
      type: 'individual',
    },
  });
  const customerEntity = normalizeEntity(customerCreate?.data || customerCreate, ['customer']);
  const customerId = normalizeId(customerEntity?._id || customerEntity?.id);
  if (!customerId) fail('Customer created but id missing', customerCreate);
  pass(`Customer created: ${customerId}`);

  info('Step 6/8: Create invoice');
  const invoiceCreate = await request(authClient, {
    method: 'POST',
    url: '/v1/invoices',
    data: {
      customerId,
      paymentMethod: 'cash',
      status: 'issued',
      items: [
        {
          productId,
          quantity: itemQty,
          price: itemRate,
          taxRate: 0,
          discount: 0,
          unit: 'pcs',
        },
      ],
    },
  });
  const invoiceEntity = normalizeEntity(invoiceCreate?.data || invoiceCreate, ['invoice']);
  const invoiceId = normalizeId(invoiceEntity?._id || invoiceEntity?.id);
  if (!invoiceId) fail('Invoice created but id missing', invoiceCreate);
  pass(`Invoice created: ${invoiceId}`);

  info('Step 7/8: Create payment');
  const paymentCreate = await request(authClient, {
    method: 'POST',
    url: '/v1/payments',
    data: {
      type: 'inflow',
      amount: paymentAmount,
      customerId,
      invoiceId,
      paymentMethod: 'cash',
      referenceNumber: `E2E-PAY-${stamp}`,
      remarks: 'E2E smoke payment',
    },
  });
  const paymentEntity = normalizeEntity(paymentCreate?.data || paymentCreate, ['payment']);
  const paymentId = normalizeId(paymentEntity?._id || paymentEntity?.id);
  if (!paymentId) fail('Payment created but id missing', paymentCreate);
  pass(`Payment created: ${paymentId}`);

  info('Step 8/8: Validate invoice/customer/payment state');
  const [invoiceGet, paymentGet, customerGet] = await Promise.all([
    request(authClient, { method: 'GET', url: `/v1/invoices/${invoiceId}` }),
    request(authClient, { method: 'GET', url: `/v1/payments/${paymentId}` }),
    request(authClient, { method: 'GET', url: `/v1/customers/${customerId}` }),
  ]);

  const invoiceDoc = normalizeEntity(invoiceGet?.data || invoiceGet, ['invoice']);
  const paymentDoc = normalizeEntity(paymentGet?.data || paymentGet, ['payment']);
  const customerDoc = normalizeEntity(customerGet?.data || customerGet, ['customer']);

  const grandTotal = Number(invoiceDoc?.grandTotal || 0);
  const paidAmount = Number(invoiceDoc?.paidAmount || 0);
  const balanceAmount = Number(invoiceDoc?.balanceAmount || 0);

  if (grandTotal <= 0) fail('Invoice grandTotal is invalid', invoiceDoc);
  if (Math.abs(grandTotal - expectedInvoiceTotal) > 0.01) {
    fail(`Invoice total mismatch. Expected ${expectedInvoiceTotal} but got ${grandTotal}`, invoiceDoc);
  }
  if (Math.abs(paidAmount - paymentAmount) > 0.01) {
    fail(`Invoice paidAmount mismatch. Expected ${paymentAmount} but got ${paidAmount}`, invoiceDoc);
  }
  if (balanceAmount > 0.01) {
    fail(`Invoice should be fully paid, balance is ${balanceAmount}`, invoiceDoc);
  }

  const paymentAmountSaved = Number(paymentDoc?.amount || 0);
  if (Math.abs(paymentAmountSaved - paymentAmount) > 0.01) {
    fail(`Saved payment amount mismatch. Expected ${paymentAmount} but got ${paymentAmountSaved}`, paymentDoc);
  }

  if (!customerDoc || normalizeId(customerDoc?._id || customerDoc?.id) !== customerId) {
    fail('Customer fetch failed or mismatched id', customerGet);
  }

  pass('Final state validated');
  console.log('\n=== E2E SMOKE COMPLETED ===');
  console.log(
    JSON.stringify(
      {
        apiUrl,
        timestamp: nowIso(),
        ids: {
          branchId,
          categoryId,
          unitId,
          productId,
          customerId,
          invoiceId,
          paymentId,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => fail('Unhandled error in smoke test runner', error?.stack || error?.message));
