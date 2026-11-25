# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: aegis-e2e.spec.ts >> Aegis Platform E2E & Stress Test Suite >> Test 7: Modular Feature Flags & Safe Pick-Up Gate Lock
- Location: tests\aegis-e2e.spec.ts:427:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 500
```

# Test source

```ts
  345 | 
  346 |     // 5b. Navigate to Safe Pick-Up tab and Generate Safe Pick-Up Pass
  347 |     const pickupTab = page.locator('button:has-text("Safe Pick-Up")').first();
  348 |     await expect(pickupTab).toBeVisible({ timeout: 10000 });
  349 |     await pickupTab.click();
  350 | 
  351 |     const generateBtn = page.getByRole('button', { name: /Activate Today’s Parent Pass|Activate Today's Parent Pass|Generate Safe Pick-Up/i }).first();
  352 |     if (await generateBtn.isVisible()) {
  353 |       await generateBtn.click();
  354 |     }
  355 | 
  356 |     // Wait for the 6-digit OTP code to display
  357 |     const otpElement = page.locator('text=Parent Handover 6-Digit Code').locator('..').locator('div.text-3xl, div.text-4xl, span.font-mono').first();
  358 |     await expect(otpElement).toBeVisible({ timeout: 10000 });
  359 |     const otpCode = (await otpElement.innerText()).replace(/\D/g, '').trim();
  360 |     expect(otpCode.length).toBe(6);
  361 | 
  362 |     // Wait 500ms to ensure the async mutateTenantData background save has finished
  363 |     await page.waitForTimeout(1000);
  364 | 
  365 |     // 5c. Log in as Gate Security on /gate
  366 |     await page.goto('/login');
  367 |     await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
  368 |     await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
  369 |     await page.locator('input[placeholder*="admin@school.ng"]').fill('test_gate_999');
  370 |     await page.locator('input[placeholder="Enter account password"]').fill(TEST_PASSWORD);
  371 |     await page.getByRole('button', { name: 'Sign In as Staff / Admin' }).click();
  372 |     await page.waitForURL('**/gate', { timeout: 15000 });
  373 | 
  374 |     // 5d. Verify the OTP at gate checkpoint
  375 |     const otpInput = page.locator('input[placeholder="• • • • • •"]');
  376 |     await otpInput.fill(otpCode);
  377 |     // Since filling 6 digits automatically triggers handleVerifyPass, or clicking Verify Pass Code
  378 |     const verifyBtn = page.getByRole('button', { name: /Verify Pass Code/i });
  379 |     if (await verifyBtn.isVisible()) {
  380 |       await verifyBtn.click();
  381 |     }
  382 | 
  383 |     // Verify student verification card appears
  384 |     await expect(page.locator('text=Chidera Test Pupil')).toBeVisible({ timeout: 10000 });
  385 |     await expect(page.locator('text=AUTHORIZED FOR EXIT')).toBeVisible({ timeout: 10000 });
  386 | 
  387 |     // Confirm gate release
  388 |     const releaseBtn = page.getByRole('button', { name: /Confirm Gate Release/i, exact: false }).first();
  389 |     if (await releaseBtn.isVisible()) {
  390 |       await releaseBtn.click();
  391 |       await expect(page.locator('text=Gate Exit Confirmed')).toBeVisible({ timeout: 10000 });
  392 |     }
  393 | 
  394 |     // 5e. Attempting to verify the exact same OTP again must show ALREADY_RELEASED or ALREADY_USED
  395 |     await otpInput.fill(otpCode);
  396 |     if (await verifyBtn.isVisible()) {
  397 |       await verifyBtn.click();
  398 |     }
  399 |     await expect(page.locator('text=STUDENT ALREADY RELEASED')).toBeVisible({ timeout: 10000 });
  400 |   });
  401 | 
  402 |   // --------------------------------------------------------------------------
  403 |   // TEST 6 — Mobile Viewport (375x812) Overflow & Navigation Check
  404 |   // --------------------------------------------------------------------------
  405 |   test('Test 6: Mobile Viewport (375x812) Overflow & Navigation Check', async ({ page }) => {
  406 |     // Set iPhone X / standard mobile viewport
  407 |     await page.setViewportSize({ width: 375, height: 812 });
  408 | 
  409 |     const routes = ['/admin', '/academic', '/student', '/gate'];
  410 | 
  411 |     for (const route of routes) {
  412 |       await page.goto(route);
  413 |       await page.waitForLoadState('domcontentloaded');
  414 | 
  415 |       // Assert zero horizontal scrolling on root document element
  416 |       const hasHorizontalScroll = await page.evaluate(() => {
  417 |         return document.documentElement.scrollWidth > window.innerWidth;
  418 |       });
  419 | 
  420 |       expect(hasHorizontalScroll, `Route ${route} has horizontal overflow on 375px mobile!`).toBe(false);
  421 |     }
  422 |   });
  423 | 
  424 |   // --------------------------------------------------------------------------
  425 |   // TEST 7 — Modular Feature Flags & Safe Pick-Up Gate Lock
  426 |   // --------------------------------------------------------------------------
  427 |   test('Test 7: Modular Feature Flags & Safe Pick-Up Gate Lock', async ({ page }) => {
  428 |     const founderPassword = process.env.FOUNDER_PASSWORD || 'jesusislord';
  429 | 
  430 |     // 7a. Toggle safe_pickup_gate OFF via Founder Modules API
  431 |     const disableRes = await page.request.patch(`/api/founder/schools/${TEST_SCHOOL_ID}/modules`, {
  432 |       data: {
  433 |         founderPassword,
  434 |         enabled_modules: {
  435 |           auto_grading_results: true,
  436 |           nursery_commentary: true,
  437 |           fee_tracking: true,
  438 |           staff_qr_attendance: true,
  439 |           safe_pickup_gate: false,
  440 |         },
  441 |         plan_tier: 'OPERATIONS',
  442 |         termly_fee_ngn: 55000,
  443 |       },
  444 |     });
> 445 |     expect(disableRes.status()).toBe(200);
      |                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  446 | 
  447 |     // 7b. Verify /api/tenant/data blocks pickup_passes writes with 403
  448 |     const blockedPassRes = await page.request.post('/api/tenant/data', {
  449 |       headers: { 'x-school-id': TEST_SCHOOL_ID },
  450 |       data: {
  451 |         action: 'insert',
  452 |         table: 'pickup_passes',
  453 |         targetSchoolId: TEST_SCHOOL_ID,
  454 |         payload: {
  455 |           student_id: '99999999-3333-0000-0000-000000000001',
  456 |           pass_type: 'DAILY_PARENT',
  457 |           otp_code: '123456',
  458 |           qr_token: 'test-blocked-token',
  459 |           status: 'ACTIVE',
  460 |           expires_at: new Date(Date.now() + 3600000).toISOString(),
  461 |         },
  462 |       },
  463 |     });
  464 |     expect(blockedPassRes.status()).toBe(403);
  465 |     const blockedJson = await blockedPassRes.json();
  466 |     expect(blockedJson.message).toContain('Module not enabled');
  467 | 
  468 |     // 7c. Verify /gate shows upgrade lock banner
  469 |     await page.goto('/login');
  470 |     await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
  471 |     await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
  472 |     await page.locator('input[placeholder*="admin@school.ng"]').fill('test_gate_999');
  473 |     await page.locator('input[placeholder="Enter account password"]').fill(TEST_PASSWORD);
  474 |     await page.getByRole('button', { name: 'Sign In as Staff / Admin' }).click();
  475 |     await page.waitForURL(/\/gate/, { timeout: 15000 });
  476 |     await expect(page.getByTestId('module-locked-banner')).toBeVisible({ timeout: 10000 });
  477 | 
  478 |     // 7d. Verify /student Safe Pick-Up tab shows upgrade lock banner
  479 |     await page.goto('/login');
  480 |     await page.getByRole('button', { name: 'Parent / Student', exact: true }).click();
  481 |     await page.locator('input[placeholder="e.g. AEGIS-XXXX"]').fill(TEST_INVITE_CODE);
  482 |     await page.locator('input[placeholder*="AEGIS-2026-001"]').fill('AEGIS-999-001');
  483 |     await page.locator('input[placeholder*="PIN"]').fill('1234');
  484 |     await page.getByRole('button', { name: 'Sign In as Parent / Student' }).click();
  485 |     await page.waitForURL(/\/student/, { timeout: 15000 });
  486 |     await page.getByRole('button', { name: /Safe Pick-Up/i }).click();
  487 |     await expect(page.getByTestId('module-locked-banner')).toBeVisible({ timeout: 10000 });
  488 | 
  489 |     // 7e. Restore safe_pickup_gate ON
  490 |     const restoreRes = await page.request.patch(`/api/founder/schools/${TEST_SCHOOL_ID}/modules`, {
  491 |       data: {
  492 |         founderPassword,
  493 |         enabled_modules: {
  494 |           auto_grading_results: true,
  495 |           nursery_commentary: true,
  496 |           fee_tracking: true,
  497 |           staff_qr_attendance: true,
  498 |           safe_pickup_gate: true,
  499 |         },
  500 |         plan_tier: 'SHIELD',
  501 |         termly_fee_ngn: 75000,
  502 |       },
  503 |     });
  504 |     expect(restoreRes.status()).toBe(200);
  505 |   });
  506 | });
  507 | 
```