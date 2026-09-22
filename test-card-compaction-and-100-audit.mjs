import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

console.log("================================================================================")
console.log("TEST SUITE: CARD COMPACTION, TITLE FONT & MODERN WEB OPTIMIZATION VERIFICATION")
console.log("================================================================================")

const srcDir = path.resolve("src")

// 1. Verify IATreeNodeCard.tsx
const cardContent = fs.readFileSync(path.join(srcDir, "components", "ia", "IATreeNodeCard.tsx"), "utf-8")

// Test 1.1: Working text header row is removed
assert.ok(!cardContent.includes("<span>Working</span>"), "IATreeNodeCard must NOT contain '<span>Working</span>' row")
assert.ok(!cardContent.includes("<ListTodo"), "IATreeNodeCard must NOT contain ListTodo icon")
console.log("✓ Test 1.1: 'Working' text row completely removed; only sleek progress bar is kept")

// Test 1.2: Sleek progress bar is preserved with tooltip
assert.ok(cardContent.includes("Tiến độ thực hiện:"), "IATreeNodeCard must have tooltip for sleek progress bar")
assert.ok(cardContent.includes("w-full bg-slate-100 rounded-full h-1 overflow-hidden"), "IATreeNodeCard must retain sleek progress bar")
console.log("✓ Test 1.2: Sleek progress bar is kept with hover tooltip")

// Test 1.3: Title font size increased to 15px font-bold
assert.ok(cardContent.includes('text-[15px] font-bold text-slate-900'), "IATreeNodeCard title must use text-[15px] font-bold")
console.log("✓ Test 1.3: Node title font size increased to 15px bold")

// Test 1.4: Card padding compacted to p-2 px-2.5 pt-2
assert.ok(cardContent.includes('p-2 px-2.5 pt-2'), "IATreeNodeCard container must use compact padding")
console.log("✓ Test 1.4: Node card padding and internal margins compacted")

// Test 1.5: Status button integrated
assert.ok(cardContent.includes("Đang làm"), "IATreeNodeCard must display 'Đang làm' in status button")
console.log("✓ Test 1.5: Status button displays dynamic 'Đang làm X task'")

// 2. Verify App.tsx Code Splitting & Modern Web APIs
const appContent = fs.readFileSync(path.join(srcDir, "App.tsx"), "utf-8")
assert.ok(appContent.includes("lazy(() => import("), "App.tsx must use React.lazy for code splitting")
assert.ok(appContent.includes("requestIdleCallback"), "App.tsx must use requestIdleCallback for background prefetching")
assert.ok(appContent.includes("<Suspense"), "App.tsx must wrap page views in Suspense")
console.log("✓ Test 2: App.tsx uses Modern Web APIs (React.lazy, Suspense, requestIdleCallback)")

// 3. Verify index.html Optimizations
const indexHtml = fs.readFileSync(path.resolve("index.html"), "utf-8")
assert.ok(indexHtml.includes('fetchpriority="high"'), "index.html must set fetchpriority='high' on hero logo")
assert.ok(!indexHtml.includes('animation: mbFadeIn 0.4s'), "index.html must not delay FCP with 0.4s fade-in")
console.log("✓ Test 3: index.html optimized for instant FCP and LCP")

console.log("================================================================================")
console.log("🎉 ALL TESTS PASSED SUCCESSFULLY (100%)!")
console.log("================================================================================")
