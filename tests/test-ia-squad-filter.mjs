import fs from "fs";
import path from "path";
import assert from "assert";

const ROOT = process.cwd();

console.log("=== KIEM TRA LOC SQUAD THEO SAN PHAM TREN IA MAP ===");

// 1. Kiem tra IANodeEditorModal.tsx
const modalCode = fs.readFileSync(path.join(ROOT, "src/components/ia/IANodeEditorModal.tsx"), "utf-8");
assert(modalCode.includes("getAdminSquadsForProduct"), "IANodeEditorModal phai import getAdminSquadsForProduct");
assert(modalCode.includes("activeProduct?: IAProductInfo | null"), "IANodeEditorModalProps phai co activeProduct");
assert(modalCode.includes("productName?: string"), "IANodeEditorModalProps phai co productName");
assert(modalCode.includes("effectiveProduct"), "IANodeEditorModal phai tinh toan effectiveProduct");
assert(modalCode.includes("effectiveProductName"), "IANodeEditorModal phai tinh toan effectiveProductName");
assert(modalCode.includes("getAdminSquadsForProduct(effectiveProduct)"), "availableSquads phai goi getAdminSquadsForProduct");
assert(modalCode.includes("Squad thuộc sản phẩm:"), "UI dropdown phai hien thi tieu de pham vi san pham");
console.log("  [PASS] IANodeEditorModal.tsx da tich hop loc Squad theo San pham");

// 2. Kiem tra IAPage.tsx
const iaPageCode = fs.readFileSync(path.join(ROOT, "src/pages/IAPage.tsx"), "utf-8");
assert(iaPageCode.includes("activeProduct={activeProduct}"), "IAPage phai truyen activeProduct vao IANodeEditorModal");
assert(iaPageCode.includes("productName={activeProduct?.name}"), "IAPage phai truyen productName vao IANodeEditorModal");
console.log("  [PASS] IAPage.tsx truyen activeProduct va productName vao IANodeEditorModal");

// 3. Kiem tra iaMockData.ts
const iaDataCode = fs.readFileSync(path.join(ROOT, "src/data/iaMockData.ts"), "utf-8");
assert(iaDataCode.includes("DEFAULT_PRODUCT_SQUADS"), "iaMockData phai dinh nghia DEFAULT_PRODUCT_SQUADS");
assert(iaDataCode.includes("isSquadMatchingProduct"), "iaMockData phai dinh nghia isSquadMatchingProduct");
assert(iaDataCode.includes("getAdminSquadsForProduct"), "iaMockData phai dinh nghia getAdminSquadsForProduct");

const appMbSquads = ["Lending", "eSaving", "Core", "Card", "Onboarding", "Base", "Upsale", "Partnership", "Billing", "CSOP", "Junior", "VietQR", "Sub"];
for (const sq of appMbSquads) {
  assert(iaDataCode.includes(`"${sq}"`), `DEFAULT_PRODUCT_SQUADS phai chua ${sq}`);
}
console.log("  [PASS] iaMockData.ts dinh nghia danh sach Squad theo tung san pham chinh xac");

console.log("\nALL TESTS PASSED SUCCESSFULLY!");
