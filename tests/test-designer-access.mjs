import assert from 'node:assert';
import { canUserAccessRequest, filterRequestsByRole } from '../src/lib/accessControl.ts';

const mockTaskBcons = {
  request_id: 'UXMB-20260908-003',
  title: 'XÂY DỰNG THẺ "VAY NHÀ DỰ ÁN - BCONS" TRONG TAB "VAY NHANH" CỦA APP MBBANK',
  assigned_designer: 'Trang',
  ux_owner: 'Trang',
  status: 'Đang thực hiện',
  viewers: []
};

const mockTaskNam = {
  request_id: 'UXMB-20260908-001',
  title: 'Luồng mở thẻ tín dụng',
  assigned_designer: 'Lê Hoàng Nam',
  ux_owner: 'Nam',
  status: 'Đang thực hiện',
  viewers: []
};

const mockTaskMultiDesigner = {
  request_id: 'UXMB-20260908-002',
  title: 'Thiết kế Onboarding Core',
  assigned_designer: 'Trang, Lê Hoàng Nam',
  ux_owner: 'Cường',
  status: 'Đang thực hiện',
  viewers: []
};

const mockTaskUnassigned = {
  request_id: 'UXMB-20260908-099',
  title: 'Chưa phân công ai',
  assigned_designer: 'Chưa phân công',
  ux_owner: 'Chưa gán',
  status: 'Đang phân loại',
  viewers: []
};

const sessionTrang1 = {
  sessionToken: 'tok1',
  personalEmail: 'trangbt9@mbbank.com.vn',
  teamsEmail: 'trangbt9@mbbank.com.vn',
  displayName: 'Trang',
  role: 'Designer',
  expiresAt: Date.now() + 10000,
  sessionPolicy: 'sliding_24h',
  loginAt: Date.now(),
  lastActiveAt: Date.now()
};

const sessionTrang2 = {
  sessionToken: 'tok2',
  personalEmail: 'trangbt9@mbbank.com.vn',
  teamsEmail: 'trangbt9@mbbank.com.vn',
  displayName: 'Trangbt9',
  role: 'Designer',
  expiresAt: Date.now() + 10000,
  sessionPolicy: 'sliding_24h',
  loginAt: Date.now(),
  lastActiveAt: Date.now()
};

const sessionTrang3 = {
  sessionToken: 'tok3',
  personalEmail: 'trangbt9@mbbank.com.vn',
  teamsEmail: 'trangbt9@mbbank.com.vn',
  displayName: 'Bùi Thu Trang',
  role: 'Designer',
  expiresAt: Date.now() + 10000,
  sessionPolicy: 'sliding_24h',
  loginAt: Date.now(),
  lastActiveAt: Date.now()
};

const sessionNam = {
  sessionToken: 'tok4',
  personalEmail: 'namlp2@mbbank.com.vn',
  teamsEmail: 'namlp2@mbbank.com.vn',
  displayName: 'Lê Hoàng Nam',
  role: 'Designer',
  expiresAt: Date.now() + 10000,
  sessionPolicy: 'sliding_24h',
  loginAt: Date.now(),
  lastActiveAt: Date.now()
};

console.log('Testing canUserAccessRequest...');

// Test 1: Trang with displayName 'Trang' accessing BCONS task
assert.strictEqual(canUserAccessRequest(mockTaskBcons, sessionTrang1), true, 'Trang (name Trang) should access BCONS task');
console.log('✓ Test 1 Passed: Trang (Trang) can access BCONS task');

// Test 2: Trang with displayName 'Trangbt9' accessing BCONS task
assert.strictEqual(canUserAccessRequest(mockTaskBcons, sessionTrang2), true, 'Trang (name Trangbt9) should access BCONS task');
console.log('✓ Test 2 Passed: Trang (Trangbt9) can access BCONS task');

// Test 3: Trang with displayName 'Bùi Thu Trang' accessing BCONS task
assert.strictEqual(canUserAccessRequest(mockTaskBcons, sessionTrang3), true, 'Trang (name Bùi Thu Trang) should access BCONS task');
console.log('✓ Test 3 Passed: Trang (Bùi Thu Trang) can access BCONS task');

// Test 4: Trang accessing Nam task -> should be false
assert.strictEqual(canUserAccessRequest(mockTaskNam, sessionTrang1), false, 'Trang should NOT access Nam task');
console.log('✓ Test 4 Passed: Trang cannot access Nam task');

// Test 5: Nam accessing BCONS task -> should be false
assert.strictEqual(canUserAccessRequest(mockTaskBcons, sessionNam), false, 'Nam should NOT access Trang task');
console.log('✓ Test 5 Passed: Nam cannot access Trang task');

// Test 6: Nam accessing Nam task -> should be true
assert.strictEqual(canUserAccessRequest(mockTaskNam, sessionNam), true, 'Nam should access Nam task');
console.log('✓ Test 6 Passed: Nam can access Nam task');

// Test 7: Multi-designer task ("Trang, Lê Hoàng Nam") -> accessible to both Trang and Nam
assert.strictEqual(canUserAccessRequest(mockTaskMultiDesigner, sessionTrang1), true, 'Trang should access multi-designer task');
assert.strictEqual(canUserAccessRequest(mockTaskMultiDesigner, sessionNam), true, 'Nam should access multi-designer task');
console.log('✓ Test 7 Passed: Multi-designer task accessible to both Trang and Nam');

// Test 8: Unassigned task -> should be false for Designer
assert.strictEqual(canUserAccessRequest(mockTaskUnassigned, sessionTrang1), false, 'Unassigned task should not be accessible to Designer');
console.log('✓ Test 8 Passed: Unassigned task not accessible to Designer');

// Test 9: filterRequestsByRole returns BCONS task & multi-designer task for Trang
const filtered = filterRequestsByRole([mockTaskBcons, mockTaskNam, mockTaskMultiDesigner, mockTaskUnassigned], sessionTrang1);
assert.strictEqual(filtered.length, 2, 'Trang should see exactly 2 tasks');
assert.deepStrictEqual(filtered.map(t => t.request_id), ['UXMB-20260908-003', 'UXMB-20260908-002']);
console.log('✓ Test 9 Passed: filterRequestsByRole correctly returns BCONS and multi-designer tasks for Trang');

console.log('\nALL 9 ACCESS CONTROL TESTS PASSED PERFECTLY!');
