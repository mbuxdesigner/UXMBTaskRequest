import assert from "node:assert"
import fs from "node:fs"
import path from "node:path"

console.log("================================================================================")
console.log("TEST SUITE: IA MAP LV5 EXTENSION & SQUAD BADGE DISPLAY VERIFICATION")
console.log("================================================================================")

const srcDir = path.resolve("src")

// 1. Check types/ia.ts
const iaTypesContent = fs.readFileSync(path.join(srcDir, "types", "ia.ts"), "utf-8")
assert(iaTypesContent.includes("export type IATier = 1 | 2 | 3 | 4 | 5"), "IATier must support 1 | 2 | 3 | 4 | 5")
assert(iaTypesContent.includes("5: {"), "IA_TIER_CONFIG must define tier 5")
assert(iaTypesContent.includes('badgeText: "Lv5"'), "Tier 5 badgeText must be Lv5")
assert(iaTypesContent.includes('themeColor: "#8b5cf6"'), "Tier 5 themeColor must be #8b5cf6")
console.log("✓ Test 1: types/ia.ts correctly defines IATier 1..5 and IA_TIER_CONFIG[5]")

// 2. Check IATreeNodeCard.tsx
const cardContent = fs.readFileSync(path.join(srcDir, "components", "ia", "IATreeNodeCard.tsx"), "utf-8")
assert(cardContent.includes('node.squad?.trim()'), "IATreeNodeCard must check node.squad?.trim()")
assert(cardContent.includes('` - "${node.squad.trim()}"`'), "IATreeNodeCard must format squad as ` - \"${node.squad.trim()}\"`")
assert(cardContent.includes("node.tier < 5"), "IATreeNodeCard connector ports must be allowed for node.tier < 5")
assert(cardContent.includes("Cấp 5: Thành phần & Chi tiết tương tác"), "IATreeNodeCard tooltip must describe Level 5")
assert(cardContent.includes("accentHex: \"#8b5cf6\""), "IATreeNodeCard tier 5 theme style must use #8b5cf6")
console.log("✓ Test 2: IATreeNodeCard.tsx renders squad name next to Lv (e.g. Lv2 - \"tên squad\") and ports up to Lv4")

// 3. Check useIATreeState.ts
const hookContent = fs.readFileSync(path.join(srcDir, "hooks", "useIATreeState.ts"), "utf-8")
assert(hookContent.includes("curr.tier >= 5"), "useIATreeState must check curr.tier >= 5 for capping")
assert(hookContent.includes("Cấp 5 (Lv5) là tầng thành phần/chi tiết cuối cùng"), "useIATreeState must display Lv5 toast warning")
assert(hookContent.includes("INDENT_LV5 = 36"), "useIATreeState layout engine must define INDENT_LV5")
assert(hookContent.includes("parent.node.tier === 4 && child.node.tier === 5"), "useIATreeState connectors must handle LV4 -> LV5")
console.log("✓ Test 3: useIATreeState.ts caps at Lv5, handles Lv5 layout indentation and connectors")

// 4. Check IASlideOverSheet.tsx
const sheetContent = fs.readFileSync(path.join(srcDir, "components", "ia", "IASlideOverSheet.tsx"), "utf-8")
assert(sheetContent.includes('{ id: "5", label: "Lv5" }'), "IASlideOverSheet must include Lv5 tab")
assert(sheetContent.includes("tier-5-element"), "IASlideOverSheet must include tier-5-element template")
assert(sheetContent.includes("settingsLv5Width"), "IASlideOverSheet must manage settingsLv5Width state")
assert(sheetContent.includes("Chiều rộng Cấp 5 (Thành phần)"), "IASlideOverSheet must render Cấp 5 width slider")
console.log("✓ Test 4: IASlideOverSheet.tsx supports Lv5 tab, Lv5 template and Lv5 width slider")

// 5. Check IASettingsModal.tsx
const modalContent = fs.readFileSync(path.join(srcDir, "components", "ia", "IASettingsModal.tsx"), "utf-8")
assert(modalContent.includes("lv5Width"), "IASettingsModal must manage lv5Width state")
assert(modalContent.includes("5: { width: 240, height: 110 }"), "IASettingsModal DEFAULT_TIER_DIMENSIONS must have tier 5")
assert(modalContent.includes("Chiều ngang các thành phần/chi tiết trong màn hình"), "IASettingsModal must render Lv5 form row")
console.log("✓ Test 5: IASettingsModal.tsx supports Lv5 dimensions and input")

// 6. Check IAQuickAddSidebar.tsx
const quickAddContent = fs.readFileSync(path.join(srcDir, "components", "ia", "IAQuickAddSidebar.tsx"), "utf-8")
assert(quickAddContent.includes("tier-5-element"), "IAQuickAddSidebar must have tier-5-element in QUICK_ADD_ITEMS")
console.log("✓ Test 6: IAQuickAddSidebar.tsx supports adding Tier 5 element")

// 7. Check IANodeFloatingToolbar.tsx & IAJsonImportModal.tsx
const floatContent = fs.readFileSync(path.join(srcDir, "components", "ia", "IANodeFloatingToolbar.tsx"), "utf-8")
assert(floatContent.includes("node.tier < 5"), "IANodeFloatingToolbar must allow adding child when node.tier < 5")

const jsonContent = fs.readFileSync(path.join(srcDir, "components", "ia", "IAJsonImportModal.tsx"), "utf-8")
assert(jsonContent.includes("tier < 5"), "IAJsonImportModal must normalize tree up to tier < 5")

console.log("✓ Test 7: IANodeFloatingToolbar and IAJsonImportModal updated for Lv5")

console.log("================================================================================")
console.log("🎉 ALL TESTS FOR LV5 & SQUAD BADGE PASSED (100%)")
console.log("================================================================================")
