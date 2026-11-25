import { test, expect } from '@playwright/test';
import {
  seedTestSchool,
  cleanupTestSchool,
  TEST_SCHOOL_ID,
  TEST_INVITE_CODE,
  TEST_PASSWORD,
  TEST_STUDENT_EY_ID,
  TEST_STUDENT_JSS_ID,
} from './helpers/seedTestSchool';

test.describe('Aegis Platform E2E & Stress Test Suite', () => {
  test.beforeAll(async () => {
    // Seed isolated test school and tenant rows in Supabase
    await seedTestSchool();
  });

  test.afterAll(async () => {
    // Clean up test school rows completely to prevent database pollution
    await cleanupTestSchool();
  });

  // Attach listener to catch uncaught page errors or unexpected 500 API responses
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => {
      // Ignore benign React hydration warnings in test environment
      if (err.message && (err.message.includes('Minified React error #418') || err.message.includes('Hydration failed'))) {
        return;
      }
      console.error('Playwright uncaught pageerror:', err);
      throw err;
    });

    page.on('response', (res) => {
      if (res.status() >= 500) {
        console.error(`Playwright unexpected 500 response from ${res.url()}`);
      }
    });
  });

  // --------------------------------------------------------------------------
  // TEST 1 — Multi-Role Login & Tenant Isolation
  // --------------------------------------------------------------------------
  test('Test 1: Multi-Role Login & Tenant Isolation', async ({ page }) => {
    // 1a. Test invalid school invite code is rejected
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Switch to Staff tab
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill('INVALID-CODE-000');
    await page.locator('input[placeholder*="admin@school.ng"]').fill('test_admin_999');
    await page.locator('input[placeholder="Enter account password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In as Staff / Admin' }).click();

    await expect(page.locator('text=Invalid School Invite Code')).toBeVisible({ timeout: 10000 });

    // 1b. Test valid Admin login
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
    await page.getByRole('button', { name: 'Sign In as Staff / Admin' }).click();

    // Verify redirected to admin hub
    await page.waitForURL(/(\/admin|\/admin-hub)/, { timeout: 15000 });
    await expect(page.locator('text=Playwright Stress Test Academy')).toBeVisible();

    // 1c. Test Gate Security login
    await page.goto('/login');
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
    await page.locator('input[placeholder*="admin@school.ng"]').fill('test_gate_999');
    await page.locator('input[placeholder="Enter account password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In as Staff / Admin' }).click();

    // Verify redirected to /gate
    await page.waitForURL('**/gate', { timeout: 15000 });
    await expect(page.locator('text=Gate Dismissal Checkpoint')).toBeVisible();

    // 1d. Test Student login
    await page.goto('/login');
    await page.getByRole('button', { name: 'Student / Parent', exact: true }).click();
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
    await page.locator('input[placeholder="e.g. STU-2026-841"]').fill('TEST-EY-001');
    await page.locator('input[placeholder="••••"]').fill('1234');
    await page.getByRole('button', { name: 'Sign In as Student / Parent' }).click();

    // Verify redirected to student hub
    await page.waitForURL(/(\/student|\/student-hub)/, { timeout: 15000 });
    await expect(page.locator('text=Chidera Test Pupil').first()).toBeVisible();
  });

  // --------------------------------------------------------------------------
  // TEST 2 — Admin Mutations & Reload Persistence
  // --------------------------------------------------------------------------
  test('Test 2: Admin Mutations & Reload Persistence', async ({ page }) => {
    // Log in as Admin
    await page.goto('/login');
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
    await page.locator('input[placeholder*="admin@school.ng"]').fill('test_admin_999');
    await page.locator('input[placeholder="Enter account password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In as Staff / Admin' }).click();
    await page.waitForURL(/(\/admin|\/admin-hub)/, { timeout: 15000 });

    // Open Teacher Registry Tab
    const staffTab = page.locator('button:has-text("Teacher Registry")').first();
    if (await staffTab.isVisible()) {
      await staffTab.click();
    }

    // Verify existing staff list rendered
    await expect(page.locator('table').getByText('Test Teacher').first()).toBeVisible({ timeout: 15000 });

    // Direct API mutation test for bank details and geofence to verify database round-trip
    const updateRes = await page.request.post('/api/tenant/data', {
      headers: {
        'x-school-id': TEST_SCHOOL_ID,
      },
      data: {
        action: 'update',
        table: 'schools',
        targetSchoolId: TEST_SCHOOL_ID,
        payload: {
          bank_name: 'Zenith Bank International',
          account_number: '9876543210',
          account_name: 'Playwright Test Academy Ltd',
          latitude: 6.5250,
          longitude: 3.3800,
          geofence_radius_meters: 200,
        },
        filter: { id: TEST_SCHOOL_ID },
      },
    });

    const updateJson = await updateRes.json();
    expect(updateJson.success).toBe(true);

    // Verify GET /api/tenant/data returns updated school data
    const fetchRes = await page.request.get(`/api/tenant/data?schoolId=${TEST_SCHOOL_ID}`);
    const fetchJson = await fetchRes.json();
    expect(fetchJson.data.school.bank_name).toBe('Zenith Bank International');
    expect(fetchJson.data.school.account_number).toBe('9876543210');
    expect(Number(fetchJson.data.school.latitude)).toBe(6.5250);
    expect(Number(fetchJson.data.school.geofence_radius_meters)).toBe(200);
  });

  // --------------------------------------------------------------------------
  // TEST 3 — Academic Scoring & Nursery Commentary Persistence
  // --------------------------------------------------------------------------
  test('Test 3: Academic Scoring & Nursery Commentary Persistence', async ({ page }) => {
    // 3a. Direct API save of Nursery Commentary to simulate early years observation
    const eyCommentaryPayload = {
      ratings: {
        language_phonics: 'Mastered',
        early_numeracy: 'Mastered',
        motor_skills: 'Mastered',
        social_emotional: 'Mastered',
        hygiene_health: 'Mastered',
      },
      narrative_observation: 'Chidera has demonstrated exceptional mastery across all early years learning domains.',
      teacher_name: 'Test Teacher',
      updated_at: new Date().toISOString(),
    };

    const saveEyRes = await page.request.post('/api/tenant/data', {
      headers: {
        'x-school-id': TEST_SCHOOL_ID,
      },
      data: {
        action: 'upsert',
        table: 'term_results',
        targetSchoolId: TEST_SCHOOL_ID,
        payload: {
          student_id: TEST_STUDENT_EY_ID,
          class_id: '99999999-0000-0000-0000-000000000001',
          subject_id: 'sub-eng',
          school_id: TEST_SCHOOL_ID,
          term: '1st Term',
          session: '2025/2026',
          ca1: 0,
          ca2: 0,
          exam: 0,
          grade: 'A',
          remarks: `EY_DATA:${JSON.stringify(eyCommentaryPayload)}`,
        },
        onConflict: 'student_id,subject_id,term,session',
      },
    });

    const saveEyJson = await saveEyRes.json();
    expect(saveEyJson.success).toBe(true);

    // 3b. Direct API save of numeric JSS 1 scores
    const saveJssRes = await page.request.post('/api/tenant/data', {
      headers: {
        'x-school-id': TEST_SCHOOL_ID,
      },
      data: {
        action: 'upsert',
        table: 'term_results',
        targetSchoolId: TEST_SCHOOL_ID,
        payload: {
          student_id: TEST_STUDENT_JSS_ID,
          class_id: '99999999-0000-0000-0000-000000000002',
          subject_id: 'sub-eng',
          school_id: TEST_SCHOOL_ID,
          term: '1st Term',
          session: '2025/2026',
          ca1: 18,
          ca2: 17,
          exam: 52,
          total_score: 87,
          grade: 'A',
          remarks: 'Excellent (A1)',
        },
        onConflict: 'student_id,subject_id,term,session',
      },
    });

    const saveJssJson = await saveJssRes.json();
    expect(saveJssJson.success).toBe(true);

    // 3c. Log in as Teacher and navigate to /academic
    await page.goto('/login');
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
    await page.locator('input[placeholder*="admin@school.ng"]').fill('test_teacher_999');
    await page.locator('input[placeholder="Enter account password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In as Staff / Admin' }).click();
    await page.waitForURL(/(\/academic|\/academic-hub)/, { timeout: 15000 });

    // 3d. Assert Nursery 1 pupil has Mastered ratings loaded
    await expect(page.locator('text=Chidera Test Pupil')).toBeVisible({ timeout: 10000 });
    const masteredButtons = page.locator('button:has-text("Mastered").bg-emerald-600');
    await expect(masteredButtons).toHaveCount(5, { timeout: 10000 });

    // Assert narrative observation textarea contains remark
    await expect(page.locator('textarea')).toHaveValue(/exceptional mastery across all early years/);

    // 3e. Log out and log back in to verify persistence
    await page.goto('/login');
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
    await page.locator('input[placeholder*="admin@school.ng"]').fill('test_teacher_999');
    await page.locator('input[placeholder="Enter account password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In as Staff / Admin' }).click();
    await page.waitForURL(/(\/academic|\/academic-hub)/, { timeout: 15000 });

    // Re-verify after second login
    await expect(page.locator('text=Chidera Test Pupil')).toBeVisible();
    await expect(page.locator('button:has-text("Mastered").bg-emerald-600')).toHaveCount(5);
  });

  // --------------------------------------------------------------------------
  // TEST 4 — Geofence Spoof & Off-Campus Rejection
  // --------------------------------------------------------------------------
  test('Test 4: Geofence Spoof & Off-Campus Rejection', async ({ context, page }) => {
    // 4a. Server-side API rejection test: Clock-in from 5km away
    const offCampusApiRes = await page.request.post('/api/tenant/data', {
      headers: {
        'x-school-id': TEST_SCHOOL_ID,
      },
      data: {
        action: 'insert',
        table: 'staff_attendance',
        targetSchoolId: TEST_SCHOOL_ID,
        payload: {
          teacher_id: '99999999-2222-0000-0000-000000000001',
          teacher_name: 'Test Teacher',
          check_in_time: new Date().toISOString(),
          status: 'PRESENT',
          latitude: 6.5700,
          longitude: 3.3792,
        },
      },
    });

    // Must be rejected with HTTP 403 Forbidden
    expect(offCampusApiRes.status()).toBe(403);
    const offCampusJson = await offCampusApiRes.json();
    expect(offCampusJson.success).toBe(false);
    expect(offCampusJson.message).toContain('Outside Campus Geofence');

    // 4b. Client-side browser test with Playwright setGeolocation
    // Set geolocation 5km away
    await context.setGeolocation({ latitude: 6.5700, longitude: 3.3792 });
    await context.grantPermissions(['geolocation']);

    // Log in as teacher
    await page.goto('/login');
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
    await page.locator('input[placeholder*="admin@school.ng"]').fill('test_teacher_999');
    await page.locator('input[placeholder="Enter account password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In as Staff / Admin' }).click();
    await page.waitForURL(/(\/academic|\/academic-hub)/, { timeout: 15000 });

    // Click "Clock In via Gate QR"
    const clockInBtn = page.getByRole('button', { name: /Clock In via Gate QR/i });
    await clockInBtn.click();

    // Verify client immediately shows geofence error and DOES NOT open camera scanner
    await expect(page.locator('text=Outside Campus Geofence')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Scan Gate Attendance QR')).not.toBeVisible();

    // 4c. Set geolocation ON-CAMPUS (within 150m)
    await context.setGeolocation({ latitude: 6.5250, longitude: 3.3800 });

    // Server-side API acceptance test when on-campus
    const onCampusApiRes = await page.request.post('/api/tenant/data', {
      headers: {
        'x-school-id': TEST_SCHOOL_ID,
      },
      data: {
        action: 'insert',
        table: 'staff_attendance',
        targetSchoolId: TEST_SCHOOL_ID,
        payload: {
          teacher_id: '99999999-2222-0000-0000-000000000001',
          teacher_name: 'Test Teacher',
          check_in_time: new Date().toISOString(),
          status: 'PRESENT',
          latitude: 6.5250,
          longitude: 3.3800,
        },
      },
    });

    expect(onCampusApiRes.status()).toBe(200);
    const onCampusJson = await onCampusApiRes.json();
    expect(onCampusJson.success).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 5 — Full Safe Pick-Up Loop (/student -> /gate)
  // --------------------------------------------------------------------------
  test('Test 5: Full Safe Pick-Up Loop (/student -> /gate)', async ({ page }) => {
    // 5a. Log in as student
    await page.goto('/login');
    await page.getByRole('button', { name: 'Student / Parent', exact: true }).click();
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
    await page.locator('input[placeholder="e.g. STU-2026-841"]').fill('TEST-EY-001');
    await page.locator('input[placeholder="••••"]').fill('1234');
    await page.getByRole('button', { name: 'Sign In as Student / Parent' }).click();
    await page.waitForURL(/(\/student|\/student-hub)/, { timeout: 15000 });

    // 5b. Navigate to Safe Pick-Up tab and Generate Safe Pick-Up Pass
    const pickupTab = page.locator('button:has-text("Safe Pick-Up")').first();
    await expect(pickupTab).toBeVisible({ timeout: 10000 });
    await pickupTab.click();

    const generateBtn = page.getByRole('button', { name: /Activate Today’s Parent Pass|Activate Today's Parent Pass|Generate Safe Pick-Up/i }).first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    }

    // Wait for the 6-digit OTP code to display
    const otpElement = page.locator('text=Parent Handover 6-Digit Code').locator('..').locator('div.text-3xl, div.text-4xl, span.font-mono').first();
    await expect(otpElement).toBeVisible({ timeout: 10000 });
    const otpCode = (await otpElement.innerText()).replace(/\D/g, '').trim();
    expect(otpCode.length).toBe(6);

    // Wait 500ms to ensure the async mutateTenantData background save has finished
    await page.waitForTimeout(1000);

    // 5c. Log in as Gate Security on /gate
    await page.goto('/login');
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
    await page.locator('input[placeholder*="admin@school.ng"]').fill('test_gate_999');
    await page.locator('input[placeholder="Enter account password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In as Staff / Admin' }).click();
    await page.waitForURL('**/gate', { timeout: 15000 });

    // 5d. Verify the OTP at gate checkpoint
    const otpInput = page.locator('input[placeholder="• • • • • •"]');
    await otpInput.fill(otpCode);
    // Since filling 6 digits automatically triggers handleVerifyPass, or clicking Verify Pass Code
    const verifyBtn = page.getByRole('button', { name: /Verify Pass Code/i });
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
    }

    // Verify student verification card appears
    await expect(page.locator('text=Chidera Test Pupil')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=AUTHORIZED FOR EXIT')).toBeVisible({ timeout: 10000 });

    // Confirm gate release
    const releaseBtn = page.getByRole('button', { name: /Confirm Gate Release/i, exact: false }).first();
    if (await releaseBtn.isVisible()) {
      await releaseBtn.click();
      await expect(page.locator('text=Gate Exit Confirmed')).toBeVisible({ timeout: 10000 });
    }

    // 5e. Attempting to verify the exact same OTP again must show ALREADY_RELEASED or ALREADY_USED
    await otpInput.fill(otpCode);
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
    }
    await expect(page.locator('text=STUDENT ALREADY RELEASED')).toBeVisible({ timeout: 10000 });
  });

  // --------------------------------------------------------------------------
  // TEST 6 — Mobile Viewport (375x812) Overflow & Navigation Check
  // --------------------------------------------------------------------------
  test('Test 6: Mobile Viewport (375x812) Overflow & Navigation Check', async ({ page }) => {
    // Set iPhone X / standard mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    const routes = ['/admin', '/academic', '/student', '/gate'];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      // Assert zero horizontal scrolling on root document element
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalScroll, `Route ${route} has horizontal overflow on 375px mobile!`).toBe(false);
    }
  });

  // --------------------------------------------------------------------------
  // TEST 7 — Modular Feature Flags & Safe Pick-Up Gate Lock
  // --------------------------------------------------------------------------
  test('Test 7: Modular Feature Flags & Safe Pick-Up Gate Lock', async ({ page }) => {
    const founderPassword = process.env.FOUNDER_PASSWORD || 'jesusislord';

    // 7a. Toggle safe_pickup_gate OFF via Founder Modules API
    const disableRes = await page.request.patch(`/api/founder/schools/${TEST_SCHOOL_ID}/modules`, {
      data: {
        founderPassword,
        enabled_modules: {
          auto_grading_results: true,
          nursery_commentary: true,
          fee_tracking: true,
          staff_qr_attendance: true,
          safe_pickup_gate: false,
        },
        plan_tier: 'OPERATIONS',
        termly_fee_ngn: 55000,
      },
    });
    expect(disableRes.status()).toBe(200);

    // 7b. Verify /api/tenant/data blocks pickup_passes writes with 403
    const blockedPassRes = await page.request.post('/api/tenant/data', {
      headers: { 'x-school-id': TEST_SCHOOL_ID },
      data: {
        action: 'insert',
        table: 'pickup_passes',
        targetSchoolId: TEST_SCHOOL_ID,
        payload: {
          student_id: '99999999-3333-0000-0000-000000000001',
          pass_type: 'DAILY_PARENT',
          otp_code: '123456',
          qr_token: 'test-blocked-token',
          status: 'ACTIVE',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    });
    expect(blockedPassRes.status()).toBe(403);
    const blockedJson = await blockedPassRes.json();
    expect(blockedJson.message).toContain('Module not enabled');

    // 7c. Verify /gate shows upgrade lock banner
    await page.goto('/login');
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
    await page.locator('input[placeholder*="admin@school.ng"]').fill('test_gate_999');
    await page.locator('input[placeholder="Enter account password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In as Staff / Admin' }).click();
    await page.waitForURL(/\/gate/, { timeout: 15000 });
    await expect(page.getByTestId('module-locked-banner')).toBeVisible({ timeout: 10000 });

    // 7d. Verify /student Safe Pick-Up tab shows upgrade lock banner
    await page.goto('/login');
    await page.getByRole('button', { name: 'Student / Parent', exact: true }).click();
    await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
    await page.locator('input[placeholder="e.g. STU-2026-841"]').fill('TEST-EY-001');
    await page.locator('input[placeholder="••••"]').fill('1234');
    await page.getByRole('button', { name: 'Sign In as Student / Parent' }).click();
    await page.waitForURL(/(\/student|\/student-hub)/, { timeout: 15000 });
    await page.locator('button:has-text("Safe Pick-Up")').first().click();
    await expect(page.getByTestId('module-locked-banner')).toBeVisible({ timeout: 10000 });

    // 7e. Restore safe_pickup_gate ON
    const restoreRes = await page.request.patch(`/api/founder/schools/${TEST_SCHOOL_ID}/modules`, {
      data: {
        founderPassword,
        enabled_modules: {
          auto_grading_results: true,
          nursery_commentary: true,
          fee_tracking: true,
          staff_qr_attendance: true,
          safe_pickup_gate: true,
        },
        plan_tier: 'SHIELD',
        termly_fee_ngn: 75000,
      },
    });
    expect(restoreRes.status()).toBe(200);
  });
});
