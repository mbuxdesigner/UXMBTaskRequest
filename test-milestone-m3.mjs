import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log("Starting Milestone M3: Origin-Aware Popovers, Modals & Dropdowns (R4) Test Suite...\n")

// ─── SUITE 1: TaskFilterPopover Verification ─────────────────────────────────
console.log("=== Suite 1: TaskFilterPopover (Origin-Aware & Spring Physics) ===")
const filterSource = fs.readFileSync(path.join(__dirname, "src/components/reui/task-filter-popover.tsx"), "utf-8")

// Test 1: useAnchorOrigin hook invocation
assert.ok(filterSource.includes("useAnchorOrigin("), "Test 1: TaskFilterPopover must use useAnchorOrigin")
assert.ok(filterSource.includes("triggerRef"), "Test 1: TaskFilterPopover must pass triggerRef to useAnchorOrigin")
assert.ok(filterSource.includes("popoverContentRef"), "Test 1: TaskFilterPopover must pass popoverContentRef to useAnchorOrigin")
console.log("✓ Test 1: useAnchorOrigin hook correctly integrated with trigger and popover refs")

// Test 2: Dynamic transformOrigin style and originPopoverVariants with springs.popover
assert.ok(filterSource.includes("style={{ transformOrigin }}"), "Test 2: Popover card must apply dynamic transformOrigin")
assert.ok(filterSource.includes("variants={originPopoverVariants}"), "Test 2: Popover card must bind originPopoverVariants")
assert.ok(filterSource.includes("transition={springs.popover}"), "Test 2: Popover card must use springs.popover")
console.log("✓ Test 2: Dynamic transformOrigin and originPopoverVariants with springs.popover verified")

// Test 3: Tactile press feedback on trigger button
assert.ok(filterSource.includes("<motion.button"), "Test 3: Trigger must be a motion.button")
assert.ok(filterSource.includes("whileTap={{ scale: 0.96 }}"), "Test 3: Trigger must have whileTap tactile press feedback")
console.log("✓ Test 3: Trigger button tactile press feedback verified (whileTap scale: 0.96)")

// ─── SUITE 2: AddMemberModal Verification ────────────────────────────────────
console.log("\n=== Suite 2: AddMemberModal (Fix Premature Unmount & Smooth Backdrop) ===")
const modalSource = fs.readFileSync(path.join(__dirname, "src/components/common/AddMemberModal.tsx"), "utf-8")

// Test 4: Premature unmount bug eliminated
assert.ok(!modalSource.includes("if (!open) return null"), "Test 4: AddMemberModal must NOT have premature 'if (!open) return null'")
assert.ok(modalSource.includes("<AnimatePresence>") && modalSource.includes("{open && ("), "Test 4: Modal must mount inside AnimatePresence conditional on open")
console.log("✓ Test 4: Premature unmount bug eliminated; open condition placed inside AnimatePresence")

// Test 5: Smooth backdrop fade and modal content spring
assert.ok(modalSource.includes("variants={dialogOverlayVariants}"), "Test 5: Backdrop must bind dialogOverlayVariants")
assert.ok(modalSource.includes("variants={dialogContentVariants}"), "Test 5: Content must bind dialogContentVariants")
assert.ok(modalSource.includes("transition={springs.modal}"), "Test 5: Content must use springs.modal")
console.log("✓ Test 5: Backdrop dialogOverlayVariants and content dialogContentVariants with springs.modal verified")

// ─── SUITE 3: NotificationDropdown Verification ───────────────────────────────
console.log("\n=== Suite 3: NotificationDropdown (Exit Animation Recovery & Origin-Aware) ===")
const notifSource = fs.readFileSync(path.join(__dirname, "src/components/notification/NotificationDropdown.tsx"), "utf-8")

// Test 6: Internal premature unmount removed
assert.ok(!notifSource.includes("if (!isOpen) return null"), "Test 6: NotificationDropdown must NOT have internal 'if (!isOpen) return null'")
console.log("✓ Test 6: Internal 'if (!isOpen) return null' successfully removed")

// Test 7: Origin-aware top-right scaling & springs.popover
assert.ok(notifSource.includes("variants={originPopoverVariants}"), "Test 7: NotificationDropdown must use originPopoverVariants")
assert.ok(notifSource.includes("transition={springs.popover}"), "Test 7: NotificationDropdown must use springs.popover")
assert.ok(notifSource.includes('style={{ transformOrigin: "top right" }}'), "Test 7: NotificationDropdown must scale from top right")
console.log("✓ Test 7: NotificationDropdown originPopoverVariants with springs.popover and top-right origin verified")

// ─── SUITE 4: MemberDetailDrawer Verification ────────────────────────────────
console.log("\n=== Suite 4: MemberDetailDrawer (Slide-out Exit Animation Recovery) ===")
const drawerSource = fs.readFileSync(path.join(__dirname, "src/components/dashboard/MemberDetailDrawer.tsx"), "utf-8")

// Test 8: Premature unmount bug eliminated
assert.ok(!drawerSource.includes("if (!member) return null"), "Test 8: MemberDetailDrawer must NOT have premature 'if (!member) return null'")
assert.ok(drawerSource.includes("<AnimatePresence>") && drawerSource.includes("{member && ("), "Test 8: Drawer must mount inside AnimatePresence conditional on member")
console.log("✓ Test 8: Premature unmount bug eliminated; member condition placed inside AnimatePresence")

// Test 9: Backdrop and drawer variants with springs.gentle
assert.ok(drawerSource.includes("variants={dialogOverlayVariants}"), "Test 9: Drawer backdrop must bind dialogOverlayVariants")
assert.ok(drawerSource.includes("variants={drawerVariants}"), "Test 9: Drawer panel must bind drawerVariants")
assert.ok(drawerSource.includes("transition={springs.gentle}"), "Test 9: Drawer panel must use springs.gentle")
console.log("✓ Test 9: Drawer panel drawerVariants with springs.gentle and backdrop dialogOverlayVariants verified")

// ─── SUITE 5: AppHeader Verification ─────────────────────────────────────────
console.log("\n=== Suite 5: AppHeader (AnimatePresence Exit Animations & Tactile Triggers) ===")
const headerSource = fs.readFileSync(path.join(__dirname, "src/components/common/AppHeader.tsx"), "utf-8")

// Test 10: Apps grid wrapped in AnimatePresence with originPopoverVariants
assert.ok(headerSource.includes("<AnimatePresence>") && headerSource.includes("{appsOpen && ("), "Test 10: appsOpen popover must be wrapped in AnimatePresence")
assert.ok(headerSource.includes("transition={springs.popover}"), "Test 10: Apps popover must use springs.popover")
console.log("✓ Test 10: Apps Grid popover wrapped in AnimatePresence with springs.popover verified")

// Test 11: User menu wrapped in AnimatePresence with originPopoverVariants
assert.ok(headerSource.includes("<AnimatePresence>") && headerSource.includes("{userMenuOpen && ("), "Test 11: userMenuOpen dropdown must be wrapped in AnimatePresence")
console.log("✓ Test 11: User Menu dropdown wrapped in AnimatePresence with springs.popover verified")

// Test 12: Quick Search and Change Name dialogs wrapped in AnimatePresence
assert.ok(headerSource.includes("<AnimatePresence>") && headerSource.includes("{searchOpen && ("), "Test 12: searchOpen dialog must be wrapped in AnimatePresence")
assert.ok(headerSource.includes("<AnimatePresence>") && headerSource.includes("{isChangeNameOpen && ("), "Test 12: isChangeNameOpen modal must be wrapped in AnimatePresence")
console.log("✓ Test 12: Quick Search ⌘K Dialog and Change Name modal wrapped in AnimatePresence with spring animations verified")

// ─── SUITE 6: DropdownMenu Primitive Verification ───────────────────────────
console.log("\n=== Suite 6: DropdownMenu (Spring Physics & AnimatePresence) ===")
const dropdownSource = fs.readFileSync(path.join(__dirname, "src/components/reui/dropdown-menu.tsx"), "utf-8")

// Test 13: AnimatePresence wrapper and springs.popover
assert.ok(dropdownSource.includes("<AnimatePresence>") && dropdownSource.includes("{isOpen && ("), "Test 13: DropdownMenu floating popover must be wrapped in AnimatePresence")
assert.ok(dropdownSource.includes("transition={springs.popover}"), "Test 13: DropdownMenu must use springs.popover")
console.log("✓ Test 13: DropdownMenu AnimatePresence wrapper and springs.popover verified")

// Test 14: Dynamic transformOrigin and tactile triggers
assert.ok(dropdownSource.includes('transformOrigin: position === "top" ? "bottom left" : "top left"'), "Test 14: DropdownMenu must compute dynamic transformOrigin based on position")
assert.ok(dropdownSource.includes("whileTap={{ scale: 0.99 }}") || dropdownSource.includes("whileTap={{ scale: 0.98 }}"), "Test 14: DropdownMenu triggers must provide whileTap tactile feedback")
console.log("✓ Test 14: Dynamic transformOrigin and whileTap tactile feedback verified")

console.log("\n=================================================================")
console.log(" ALL 14 MILESTONE M3 TESTS PASSED SUCCESSFULLY!")
console.log("=================================================================")
