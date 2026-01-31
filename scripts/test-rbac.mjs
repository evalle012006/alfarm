#!/usr/bin/env node
/**
 * AlFarm Resort - RBAC and API Test Script
 * 
 * Tests authentication, authorization, and API endpoints.
 * 
 * Prerequisites:
 * - Docker stack running (docker compose up -d)
 * - Test users seeded in database
 * 
 * Usage:
 *   node scripts/test-rbac.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

function recordTest(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  if (passed === true) {
    results.passed++;
    log('green', `✓ PASS: ${name}`);
  } else if (passed === false) {
    results.failed++;
    log('red', `✗ FAIL: ${name}${details ? ` - ${details}` : ''}`);
  } else {
    results.skipped++;
    log('yellow', `○ SKIP: ${name}${details ? ` - ${details}` : ''}`);
  }
}

// Extract cookie from Set-Cookie header
function extractCookie(setCookieHeader, cookieName) {
  if (!setCookieHeader) return null;
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const cookie of cookies) {
    if (cookie.startsWith(`${cookieName}=`)) {
      return cookie.split(';')[0];
    }
  }
  return null;
}

// Make HTTP request
async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }
  
  if (options.cookie) {
    fetchOptions.headers['Cookie'] = options.cookie;
  }
  
  try {
    const response = await fetch(url, fetchOptions);
    const setCookie = response.headers.get('set-cookie');
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { status: response.status, data, setCookie, ok: response.ok };
  } catch (error) {
    return { status: 0, error: error.message, ok: false };
  }
}

// ============================================================================
// Test Sections
// ============================================================================

async function testServerHealth() {
  log('blue', '\n=== Server Health Check ===');
  
  const res = await request('GET', '/');
  recordTest('Server responds', res.status === 200 || res.status === 304);
}

async function testAuthEndpoints(credentials) {
  log('blue', '\n=== Authentication Tests ===');
  
  // Test missing credentials
  const noCredsRes = await request('POST', '/api/auth/login', { body: {} });
  recordTest('Login without credentials returns 401', noCredsRes.status === 401);
  
  // Test invalid credentials
  const invalidRes = await request('POST', '/api/auth/login', {
    body: { email: 'invalid@test.com', password: 'wrongpassword' }
  });
  recordTest('Login with invalid credentials returns 401', invalidRes.status === 401);
  
  // Test super_admin login
  if (credentials.superAdmin) {
    const superAdminRes = await request('POST', '/api/auth/login', {
      body: { email: credentials.superAdmin.email, password: credentials.superAdmin.password }
    });
    
    const hasCookie = superAdminRes.setCookie && superAdminRes.setCookie.includes('admin_token=');
    recordTest('Super admin login returns Set-Cookie with admin_token', hasCookie);
    recordTest('Super admin login returns 200', superAdminRes.status === 200);
    
    if (hasCookie) {
      credentials.superAdmin.cookie = extractCookie(superAdminRes.setCookie, 'admin_token');
    }
  } else {
    recordTest('Super admin login', null, 'No credentials provided');
  }
  
  // Test cashier login
  if (credentials.cashier) {
    const cashierRes = await request('POST', '/api/auth/login', {
      body: { email: credentials.cashier.email, password: credentials.cashier.password }
    });
    
    const hasCookie = cashierRes.setCookie && cashierRes.setCookie.includes('admin_token=');
    recordTest('Cashier login returns Set-Cookie with admin_token', hasCookie);
    recordTest('Cashier login returns 200', cashierRes.status === 200);
    
    if (hasCookie) {
      credentials.cashier.cookie = extractCookie(cashierRes.setCookie, 'admin_token');
    }
  } else {
    recordTest('Cashier login', null, 'No credentials provided');
  }
  
  return credentials;
}

async function testAdminMe(credentials) {
  log('blue', '\n=== Admin /me Endpoint Tests ===');
  
  // Test without cookie
  const noCookieRes = await request('GET', '/api/admin/me');
  recordTest('GET /api/admin/me without cookie returns 401', noCookieRes.status === 401);
  
  // Test with super_admin cookie
  if (credentials.superAdmin?.cookie) {
    const superAdminRes = await request('GET', '/api/admin/me', {
      cookie: credentials.superAdmin.cookie
    });
    recordTest('GET /api/admin/me with super_admin cookie returns 200', superAdminRes.status === 200);
    recordTest('Response includes permissions', 
      superAdminRes.data?.permissions === '*' || Array.isArray(superAdminRes.data?.permissions));
  } else {
    recordTest('GET /api/admin/me with super_admin', null, 'No cookie available');
  }
  
  // Test with cashier cookie
  if (credentials.cashier?.cookie) {
    const cashierRes = await request('GET', '/api/admin/me', {
      cookie: credentials.cashier.cookie
    });
    recordTest('GET /api/admin/me with cashier cookie returns 200', cashierRes.status === 200);
  } else {
    recordTest('GET /api/admin/me with cashier', null, 'No cookie available');
  }
}

async function testBookingPermissions(credentials) {
  log('blue', '\n=== Booking RBAC Tests ===');
  
  // Test GET /api/admin/bookings (both roles should have access)
  if (credentials.cashier?.cookie) {
    const cashierGetRes = await request('GET', '/api/admin/bookings', {
      cookie: credentials.cashier.cookie
    });
    recordTest('Cashier GET /api/admin/bookings returns 200', cashierGetRes.status === 200);
  }
  
  if (credentials.superAdmin?.cookie) {
    const superAdminGetRes = await request('GET', '/api/admin/bookings', {
      cookie: credentials.superAdmin.cookie
    });
    recordTest('Super admin GET /api/admin/bookings returns 200', superAdminGetRes.status === 200);
  }
  
  // Create a test booking to test permissions on
  let testBookingId = null;
  
  if (credentials.cashier?.cookie) {
    // Cashier should be able to create bookings
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const bookingDate = tomorrow.toISOString().split('T')[0];
    
    const createRes = await request('POST', '/api/admin/bookings', {
      cookie: credentials.cashier.cookie,
      body: {
        guestFirstName: 'Test',
        guestLastName: 'User',
        guestEmail: 'test@example.com',
        guestPhone: '1234567890',
        bookingDate: bookingDate,
        bookingType: 'day',
        totalAmount: 100,
        items: [{ productId: 1, quantity: 1 }]
      }
    });
    
    recordTest('Cashier POST /api/admin/bookings returns 200/201', 
      createRes.status === 200 || createRes.status === 201);
    
    if (createRes.data?.booking?.id) {
      testBookingId = createRes.data.booking.id;
    }
  }
  
  // Test DELETE permission (cashier should be denied, super_admin should succeed)
  if (testBookingId) {
    if (credentials.cashier?.cookie) {
      const cashierDeleteRes = await request('DELETE', `/api/admin/bookings/${testBookingId}`, {
        cookie: credentials.cashier.cookie
      });
      recordTest('Cashier DELETE /api/admin/bookings/[id] returns 403 FORBIDDEN', 
        cashierDeleteRes.status === 403);
      
      if (cashierDeleteRes.status === 403) {
        recordTest('403 response has error code FORBIDDEN', 
          cashierDeleteRes.data?.error?.code === 'FORBIDDEN');
      }
    }
    
    if (credentials.superAdmin?.cookie) {
      const superAdminDeleteRes = await request('DELETE', `/api/admin/bookings/${testBookingId}`, {
        cookie: credentials.superAdmin.cookie
      });
      recordTest('Super admin DELETE /api/admin/bookings/[id] returns 200', 
        superAdminDeleteRes.status === 200);
    }
  } else {
    recordTest('Booking DELETE permission tests', null, 'No test booking created');
  }
}

async function testStaffPermissions(credentials) {
  log('blue', '\n=== Staff Management RBAC Tests ===');
  
  // Cashier should NOT have staff:read permission
  if (credentials.cashier?.cookie) {
    const cashierStaffRes = await request('GET', '/api/admin/staff', {
      cookie: credentials.cashier.cookie
    });
    recordTest('Cashier GET /api/admin/staff returns 403', cashierStaffRes.status === 403);
  }
  
  // Super admin should have staff:read permission
  if (credentials.superAdmin?.cookie) {
    const superAdminStaffRes = await request('GET', '/api/admin/staff', {
      cookie: credentials.superAdmin.cookie
    });
    recordTest('Super admin GET /api/admin/staff returns 200', superAdminStaffRes.status === 200);
  }
}

async function testAuditPermissions(credentials) {
  log('blue', '\n=== Audit Log RBAC Tests ===');
  
  // Cashier should NOT have audit:read permission
  if (credentials.cashier?.cookie) {
    const cashierAuditRes = await request('GET', '/api/admin/audit', {
      cookie: credentials.cashier.cookie
    });
    recordTest('Cashier GET /api/admin/audit returns 403', cashierAuditRes.status === 403);
  }
  
  // Super admin should have audit:read permission
  if (credentials.superAdmin?.cookie) {
    const superAdminAuditRes = await request('GET', '/api/admin/audit', {
      cookie: credentials.superAdmin.cookie
    });
    recordTest('Super admin GET /api/admin/audit returns 200', superAdminAuditRes.status === 200);
  }
}

async function testAuditLogging(credentials) {
  log('blue', '\n=== Audit Logging Verification ===');
  
  if (!credentials.superAdmin?.cookie) {
    recordTest('Audit logging tests', null, 'No super_admin cookie available');
    return;
  }
  
  // Get current audit log count
  const beforeRes = await request('GET', '/api/admin/audit?limit=1', {
    cookie: credentials.superAdmin.cookie
  });
  
  const beforeCount = beforeRes.data?.pagination?.total || 0;
  
  // Perform an audited action (create a staff user, then disable them)
  const testEmail = `test-audit-${Date.now()}@example.com`;
  
  const createStaffRes = await request('POST', '/api/admin/staff', {
    cookie: credentials.superAdmin.cookie,
    body: {
      email: testEmail,
      password: 'TestPassword123!',
      firstName: 'Audit',
      lastName: 'Test',
      role: 'cashier'
    }
  });
  
  if (createStaffRes.status === 201 || createStaffRes.status === 200) {
    recordTest('Created test staff user for audit verification', true);
    
    // Check audit log was created
    const afterRes = await request('GET', `/api/admin/audit?action=staff.create&limit=5`, {
      cookie: credentials.superAdmin.cookie
    });
    
    const hasAuditEntry = afterRes.data?.logs?.some(log => 
      log.action === 'staff.create'
    );
    
    recordTest('Audit log entry created for staff.create action', hasAuditEntry);
  } else {
    recordTest('Created test staff user for audit verification', false, 
      `Status: ${createStaffRes.status}`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          AlFarm Resort - RBAC & API Test Suite             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${BASE_URL}`);
  
  // Test credentials - these need to exist in the database
  // The schema.sql seeds an admin user, but we need to know the password
  const credentials = {
    superAdmin: {
      email: process.env.SUPER_ADMIN_EMAIL || 'admin@alfarm.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'admin123',
      cookie: null
    },
    cashier: {
      email: process.env.CASHIER_EMAIL || null,
      password: process.env.CASHIER_PASSWORD || null,
      cookie: null
    }
  };
  
  // If no cashier credentials, skip those tests
  if (!credentials.cashier.email) {
    credentials.cashier = null;
    log('yellow', '\nNote: No CASHIER_EMAIL/CASHIER_PASSWORD provided. Cashier tests will be skipped.');
    log('yellow', 'To run full tests, set environment variables or create a cashier user.');
  }
  
  try {
    await testServerHealth();
    await testAuthEndpoints(credentials);
    await testAdminMe(credentials);
    await testBookingPermissions(credentials);
    await testStaffPermissions(credentials);
    await testAuditPermissions(credentials);
    await testAuditLogging(credentials);
  } catch (error) {
    log('red', `\nFatal error: ${error.message}`);
    console.error(error);
  }
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  log('green', `Passed:  ${results.passed}`);
  log('red', `Failed:  ${results.failed}`);
  log('yellow', `Skipped: ${results.skipped}`);
  console.log(`Total:   ${results.passed + results.failed + results.skipped}`);
  
  // Exit with error code if any tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
