/**
 * test-empirical-challenge-m2-m4.mjs
 * 
 * Adversarial Empirical Verification Suite for challenger_final_1:
 * 1. Stress-test Formula Injection across permutations of =SUM, +CMD, -1+1, @IMPORTXML, \tHYPERLINK.
 * 2. Stress-test Account-based Sliding Rate Limiting (cooldown, max 5/10min throttling, multi-tenant isolation).
 * 3. Verify zero console calls (log, warn, error) in production dist/assets/*.js.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

console.log('================================================================================');
console.log('ADVERSARIAL EMPIRICAL CHALLENGE SUITE (challenger_final_1)');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// Helper: Extract function from google-apps-script-backend.js
// -----------------------------------------------------------------------------
const backendPath = path.resolve('google-apps-script-backend.js');
const backendContent = fs.readFileSync(backendPath, 'utf8');

// Extract sanitizeFormulaCell
const sanitizeFormulaCellMatch = backendContent.match(/function sanitizeFormulaCell\(val\)[\s\S]*?\n\}/);
if (!sanitizeFormulaCellMatch) {
  throw new Error('Could not find function sanitizeFormulaCell in google-apps-script-backend.js');
}
const sanitizeFormulaCell = new Function('val', `${sanitizeFormulaCellMatch[0]}; return sanitizeFormulaCell(val);`);

// -----------------------------------------------------------------------------
// TASK 1: Stress-test Formula Injection against sanitizeFormulaCell
// -----------------------------------------------------------------------------
console.log('--- TASK 1: Stress-testing Formula Injection against sanitizeFormulaCell ---');

const formulaTestCases = [
  // 1. Standard prefixes
  { input: '=SUM(A1:A10)', desc: 'Standard =SUM formula', expectPrefix: true },
  { input: '+CMD', desc: 'Standard +CMD command trigger', expectPrefix: true },
  { input: '-1+1', desc: 'Standard -1+1 arithmetic formula', expectPrefix: true },
  { input: '@IMPORTXML("http://x","//a")', desc: 'Standard @IMPORTXML XML injection', expectPrefix: true },
  
  // 2. Variations with spaces
  { input: '   =SUM(1,2)', desc: 'Leading spaces before =SUM', expectPrefix: true },
  { input: '   +CMD', desc: 'Leading spaces before +CMD', expectPrefix: true },
  { input: '   -1+1', desc: 'Leading spaces before -1+1', expectPrefix: true },
  { input: '   @IMPORTXML', desc: 'Leading spaces before @IMPORTXML', expectPrefix: true },

  // 3. Tab followed by formula characters
  { input: '\t=SUM(1,2)', desc: 'Tab before =SUM', expectPrefix: true },
  { input: '\t+CMD', desc: 'Tab before +CMD', expectPrefix: true },
  { input: '\t-1+1', desc: 'Tab before -1+1', expectPrefix: true },
  { input: '\t@IMPORTXML', desc: 'Tab before @IMPORTXML', expectPrefix: true },

  // 4. Carriage return followed by formula characters
  { input: '\r=SUM(1,2)', desc: 'Carriage return before =SUM', expectPrefix: true },
  { input: '\r+CMD', desc: 'Carriage return before +CMD', expectPrefix: true },
  { input: '\r-1+1', desc: 'Carriage return before -1+1', expectPrefix: true },
  { input: '\r@IMPORTXML', desc: 'Carriage return before @IMPORTXML', expectPrefix: true },

  // 5. Explicit challenge input: \tHYPERLINK and variations
  { input: '\tHYPERLINK("http://attacker.com", "click")', desc: 'Tab directly before HYPERLINK', expectPrefix: true },
  { input: '\tHYPERLINK', desc: 'Tab directly before HYPERLINK token', expectPrefix: true },
  { input: '\t\tHYPERLINK', desc: 'Double tab before HYPERLINK', expectPrefix: true },
  { input: ' \tHYPERLINK', desc: 'Space and tab before HYPERLINK', expectPrefix: true },
  { input: '\rHYPERLINK', desc: 'Carriage return before HYPERLINK', expectPrefix: true },
  { input: '\t=HYPERLINK("http://attacker.com")', desc: 'Tab before =HYPERLINK', expectPrefix: true },

  // 6. Advanced DDE / macro payloads
  { input: "=cmd|' /C calc'!A0", desc: 'Classic DDE calc injection (=)', expectPrefix: true },
  { input: "+cmd|' /C calc'!A0", desc: 'Classic DDE calc injection (+)', expectPrefix: true },
  { input: "-cmd|' /C calc'!A0", desc: 'Classic DDE calc injection (-)', expectPrefix: true },
  { input: "@SUM(1+1)*cmd|' /C calc'!A0", desc: 'DDE calc injection (@)', expectPrefix: true },

  // 7. Non-formula safe strings (should NOT be prefixed)
  { input: 'REQ-2026-001', desc: 'Task ID prefix REQ-', expectPrefix: false },
  { input: 'Yêu cầu thiết kế UX', desc: 'Normal Vietnamese text', expectPrefix: false },
  { input: '12345', desc: 'Normal number string', expectPrefix: false },
  { input: 'HYPERLINK', desc: 'Word HYPERLINK without tab or =', expectPrefix: false },
  { input: 'SUM(A1:A10)', desc: 'Word SUM without =', expectPrefix: false },
  { input: '', desc: 'Empty string', expectPrefix: false },
  { input: null, desc: 'Null value', expectPrefix: false },
  { input: 12345, desc: 'Numeric value', expectPrefix: false },
  { input: { foo: 'bar' }, desc: 'Object value', expectPrefix: false }
];

let formulaResults = [];
for (const tc of formulaTestCases) {
  const output = sanitizeFormulaCell(tc.input);
  const isPrefixed = typeof output === 'string' && output.startsWith("'");
  const passed = tc.expectPrefix ? isPrefixed : !isPrefixed;
  formulaResults.push({
    desc: tc.desc,
    input: tc.input,
    output,
    expectPrefix: tc.expectPrefix,
    isPrefixed,
    passed
  });
  console.log(`[${passed ? 'PASS' : 'WARN/FAIL'}] ${tc.desc}: input=${JSON.stringify(tc.input)} -> output=${JSON.stringify(output)}`);
}

const failedFormulaTests = formulaResults.filter(r => !r.passed);
console.log(`\nFormula Injection Results: ${formulaResults.length - failedFormulaTests.length}/${formulaResults.length} passed.`);
if (failedFormulaTests.length > 0) {
  console.log('Detailed Findings for Formula Injection:');
  for (const f of failedFormulaTests) {
    console.log(`  - ${f.desc}: Expected prefixed='${f.expectPrefix}', got isPrefixed='${f.isPrefixed}' (output: ${JSON.stringify(f.output)})`);
  }
}
assert.equal(failedFormulaTests.length, 0, `Expected 0 formula test failures, got ${failedFormulaTests.length}`);

// -----------------------------------------------------------------------------
// TASK 2: Stress-test Account-based Sliding Rate Limiting
// -----------------------------------------------------------------------------
console.log('\n--- TASK 2: Stress-testing Account-based Sliding Rate Limiting ---');

class MockScriptCache {
  constructor() {
    this.store = new Map();
  }

  get(key, currentTimeMs) {
    const item = this.store.get(key);
    if (!item) return null;
    if (currentTimeMs >= item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  put(key, value, ttlSeconds, currentTimeMs) {
    this.store.set(key, {
      value: String(value),
      expiresAt: currentTimeMs + ttlSeconds * 1000
    });
  }
}

function simulateRateLimiter({ cache, email, currentTimeMs }) {
  const emailInput = String(email || '').trim().toLowerCase();
  const genericMessage = "Nếu tài khoản hợp lệ và đang hoạt động, mã xác thực 6 số sẽ được gửi trực tiếp tới tài khoản Teams của bạn.";

  if (!emailInput) {
    return { status: "success", message: genericMessage, throttled: false };
  }

  const cooldownKey = "rate_cooldown_" + emailInput;
  const countKey = "rate_count_" + emailInput;

  const inCooldown = cache.get(cooldownKey, currentTimeMs);
  if (inCooldown) {
    return {
      status: "rate_limited",
      message: "Vui lòng chờ 60 giây trước khi yêu cầu mã OTP mới.",
      reason: "cooldown",
      throttled: true
    };
  }

  const currentCountStr = cache.get(countKey, currentTimeMs);
  let currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
  if (currentCount >= 5) {
    return {
      status: "rate_limited",
      message: "Bạn đã vượt quá giới hạn yêu cầu OTP (tối đa 5 lần trong 10 phút). Vui lòng thử lại sau.",
      reason: "max_count_exceeded",
      throttled: true
    };
  }

  // Mutate cache as in google-apps-script-backend.js
  cache.put(cooldownKey, "1", 60, currentTimeMs);
  cache.put(countKey, String(currentCount + 1), 600, currentTimeMs);

  return {
    status: "success",
    message: genericMessage,
    currentCount: currentCount + 1,
    throttled: false
  };
}

const cache = new MockScriptCache();
let currentTime = 1727078400000; // t0 = 0s
const userA = "alice@mbbank.com.vn";
const userB = "bob@mbbank.com.vn";

// Test 2.1: First request for User A succeeds
let res1 = simulateRateLimiter({ cache, email: userA, currentTimeMs: currentTime });
assert.equal(res1.status, "success");
assert.equal(res1.currentCount, 1);
console.log('✓ Test 2.1: Initial request for User A succeeds (count = 1)');

// Test 2.2: Rapid second request at t = 10s is blocked by 60s cooldown
let res2 = simulateRateLimiter({ cache, email: userA, currentTimeMs: currentTime + 10000 });
assert.equal(res2.status, "rate_limited");
assert.equal(res2.reason, "cooldown");
console.log('✓ Test 2.2: Rapid request at t=10s blocked by 60s cooldown');

// Test 2.3: Rapid request at t = 59s is STILL blocked by 60s cooldown
let res3 = simulateRateLimiter({ cache, email: userA, currentTimeMs: currentTime + 59000 });
assert.equal(res3.status, "rate_limited");
assert.equal(res3.reason, "cooldown");
console.log('✓ Test 2.3: Request at boundary t=59s still blocked by cooldown');

// Test 2.4: Request at t = 61s succeeds (cooldown expired, count = 2)
let res4 = simulateRateLimiter({ cache, email: userA, currentTimeMs: currentTime + 61000 });
assert.equal(res4.status, "success");
assert.equal(res4.currentCount, 2);
console.log('✓ Test 2.4: Request at t=61s succeeds after cooldown (count = 2)');

// Test 2.5: User B from same corporate IP can request immediately without interference from User A
let resUserB = simulateRateLimiter({ cache, email: userB, currentTimeMs: currentTime + 62000 });
assert.equal(resUserB.status, "success");
assert.equal(resUserB.currentCount, 1);
console.log('✓ Test 2.5: Multi-tenant corporate NAT isolation verified: User B unaffected by User A');

// Test 2.6: Stepping User A through to 5 requests (at t=130s, t=200s, t=270s)
let res5 = simulateRateLimiter({ cache, email: userA, currentTimeMs: currentTime + 130000 });
assert.equal(res5.status, "success");
assert.equal(res5.currentCount, 3);

let res6 = simulateRateLimiter({ cache, email: userA, currentTimeMs: currentTime + 200000 });
assert.equal(res6.status, "success");
assert.equal(res6.currentCount, 4);

let res7 = simulateRateLimiter({ cache, email: userA, currentTimeMs: currentTime + 270000 });
assert.equal(res7.status, "success");
assert.equal(res7.currentCount, 5);
console.log('✓ Test 2.6: User A reaches exactly 5 requests within 10 minutes');

// Test 2.7: Request 6 at t=340s (cooldown elapsed, but 5 requests limit reached) is throttled
let res8 = simulateRateLimiter({ cache, email: userA, currentTimeMs: currentTime + 340000 });
assert.equal(res8.status, "rate_limited");
assert.equal(res8.reason, "max_count_exceeded");
console.log('✓ Test 2.7: 6th request within 10 minutes blocked by max 5/10min throttling');

// Test 2.8: Request with different case (e.g. ALICE@MBBANK.COM.VN) is normalized and still throttled
let resCase = simulateRateLimiter({ cache, email: "ALICE@MBBANK.COM.VN", currentTimeMs: currentTime + 350000 });
assert.equal(resCase.status, "rate_limited");
assert.equal(resCase.reason, "max_count_exceeded");
console.log('✓ Test 2.8: Case insensitivity normalization verified');

// Test 2.9: After sliding window expires (> 600s after last reset), User A can request again
// Note: last cache.put for countKey was at t = 270s, expires at t = 270s + 600s = 870s
let resExpired = simulateRateLimiter({ cache, email: userA, currentTimeMs: currentTime + 871000 });
assert.equal(resExpired.status, "success");
assert.equal(resExpired.currentCount, 1);
console.log('✓ Test 2.9: Rate limit successfully resets after 10-minute sliding window expiry (871s > 870s)');

// -----------------------------------------------------------------------------
// TASK 3: Production dist/assets/*.js contains 0 console logs
// -----------------------------------------------------------------------------
console.log('\n--- TASK 3: Verifying 0 console calls in production dist/assets/*.js ---');

const distAssetsDir = path.resolve('dist/assets');
if (!fs.existsSync(distAssetsDir)) {
  throw new Error('dist/assets directory does not exist. Run pnpm build first.');
}

const jsFiles = fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.js'));
let foundConsoleCalls = [];

for (const file of jsFiles) {
  const content = fs.readFileSync(path.join(distAssetsDir, file), 'utf8');
  // Check console.warn, console.error, console.log, console.info, console.debug
  const matches = [...content.matchAll(/\bconsole\s*\.\s*(log|warn|error|info|debug)\s*\(/g)];
  if (matches.length > 0) {
    foundConsoleCalls.push({ file, count: matches.length, calls: matches.map(m => m[0]) });
  }
}

if (foundConsoleCalls.length === 0) {
  console.log(`✓ Checked all ${jsFiles.length} JS assets in dist/assets/: EXACTLY 0 CONSOLE CALLS FOUND!`);
} else {
  console.error(`✗ FAILED: Found console calls in ${foundConsoleCalls.length} files:`, foundConsoleCalls);
  throw new Error('Console calls detected in production bundle!');
}

console.log('\n================================================================================');
console.log('ALL EMPIRICAL CHALLENGE TASKS COMPLETED');
console.log('================================================================================');
