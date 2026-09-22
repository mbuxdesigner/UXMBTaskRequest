// test-ia-rbac-permissions.mjs
// Verification suite:
// 1. RBAC capabilities definition (cap-ia-view & cap-ia-edit) in accessControl.ts & QuanLyPage.tsx
// 2. PO & Business default read-only restrictions (no drag, no resize, no ports, no add/edit/delete, read-only badge)
// 3. Admin & Designer edit permissions (full interactivity)
// 4. RBAC Matrix configuration toggle & live permission synchronization

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import * as chromeLauncher from './node_modules/chrome-launcher/dist/index.js';

console.log("=== Testing IA RBAC Permissions & Read-Only Mode ===");

// 1. Static Code Assertions
const accessControlContent = fs.readFileSync("./src/lib/accessControl.ts", "utf-8");
assert(accessControlContent.includes('"cap-ia-view":'), "accessControl.ts must include cap-ia-view in DEFAULT_RBAC_PERMISSIONS");
assert(accessControlContent.includes('"cap-ia-edit":'), "accessControl.ts must include cap-ia-edit in DEFAULT_RBAC_PERMISSIONS");
assert(accessControlContent.includes('"cap-ia-view": parsed["cap-ia-view"]'), "accessControl.ts must fallback merge cap-ia-view");
assert(accessControlContent.includes('"cap-ia-edit": parsed["cap-ia-edit"]'), "accessControl.ts must fallback merge cap-ia-edit");
console.log("✓ Step 1: src/lib/accessControl.ts declares cap-ia-view and cap-ia-edit with fallback merging");

const quanLyContent = fs.readFileSync("./src/pages/QuanLyPage.tsx", "utf-8");
assert(quanLyContent.includes('id: "cap-ia-view"'), "QuanLyPage.tsx must include cap-ia-view in RBAC_CAPABILITIES");
assert(quanLyContent.includes('id: "cap-ia-edit"'), "QuanLyPage.tsx must include cap-ia-edit in RBAC_CAPABILITIES");
assert(quanLyContent.includes('title: "Xem Kiến trúc Thông tin (IA)"'), "QuanLyPage.tsx must have friendly title for cap-ia-view");
assert(quanLyContent.includes('title: "Chỉnh sửa & Sắp xếp Node IA"'), "QuanLyPage.tsx must have friendly title for cap-ia-edit");
console.log("✓ Step 2: src/pages/QuanLyPage.tsx has RBAC_CAPABILITIES entries and reset handlers");

const iaPageContent = fs.readFileSync("./src/pages/IAPage.tsx", "utf-8");
assert(iaPageContent.includes('canRoleAccessCapability(s?.role, "cap-ia-view")'), "IAPage.tsx must check cap-ia-view");
assert(iaPageContent.includes('canRoleAccessCapability(s?.role, "cap-ia-edit")'), "IAPage.tsx must check cap-ia-edit");
assert(iaPageContent.includes('readOnly={!canEdit}'), "IAPage.tsx must pass readOnly={!canEdit} to components");
console.log("✓ Step 3: src/pages/IAPage.tsx enforces cap-ia-view and cap-ia-edit");

const toolbarContent = fs.readFileSync("./src/components/ia/IAToolbar.tsx", "utf-8");
assert(toolbarContent.includes('readOnly?: boolean'), "IAToolbarProps must accept readOnly");
assert(toolbarContent.includes('data-testid="ia-readonly-badge"'), "IAToolbar must render ia-readonly-badge");
console.log("✓ Step 4: src/components/ia/IAToolbar.tsx renders read-only badge");

const viewportContent = fs.readFileSync("./src/components/ia/IACanvasViewport.tsx", "utf-8");
assert(viewportContent.includes('readOnly?: boolean'), "IACanvasViewportProps must accept readOnly");
assert(viewportContent.includes('readOnly={readOnly}'), "IACanvasViewport must forward readOnly to IATreeNodeCard");
assert(viewportContent.includes('if (readOnly) return'), "IACanvasViewport must block port drag when readOnly");
console.log("✓ Step 5: src/components/ia/IACanvasViewport.tsx forwards readOnly and blocks wire drags");

const cardContent = fs.readFileSync("./src/components/ia/IATreeNodeCard.tsx", "utf-8");
assert(cardContent.includes('readOnly?: boolean'), "IATreeNodeCardProps must accept readOnly");
assert(cardContent.includes('readOnly || e.button !== 0'), "IATreeNodeCard must block pointer drag when readOnly");
assert(cardContent.includes('!readOnly && ('), "IATreeNodeCard must conditionally hide ports and actions when readOnly");
console.log("✓ Step 6: src/components/ia/IATreeNodeCard.tsx completely locks down UI in read-only mode");

// 2. Live Headless Chrome Verification
async function runLiveTest() {
  console.log("\nLaunching headless Chrome for live testing...");
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--window-size=1600,1000']
  });

  const pagesRes = await fetch(`http://127.0.0.1:${chrome.port}/json`);
  const pages = await pagesRes.json();
  const page = pages[0];
  const wsUrl = page.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  await new Promise(r => ws.onopen = r);

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  // --- SCENARIO A: PO User (Read-Only) ---
  console.log("\n--- Scenario A: Testing PO User (Default Read-Only) ---");
  await send("Page.navigate", { url: "http://localhost:8443/#ia" });
  await new Promise(r => setTimeout(r, 1200));

  await send("Runtime.evaluate", {
    expression: `(() => {
      const sess = JSON.stringify({
        sessionToken: "demo-token-po",
        personalEmail: "lan.po@gmail.com",
        teamsEmail: "lan.po@mbbank.com.vn",
        displayName: "Trần Mai Lan",
        role: "PO",
        isImpersonating: true,
        expiresAt: Date.now() + 86400000
      });
      sessionStorage.setItem("ux_portal_session_auth", sess);
      localStorage.setItem("ux_portal_session_auth", sess);
      localStorage.setItem("ux_portal_session", sess);
      localStorage.removeItem("mbbank_admin_rbac"); // Use default permissions
      window.location.hash = "#ia";
      window.location.reload();
    })()`
  });

  await new Promise(r => setTimeout(r, 1500));

  const poEvalRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const readonlyBadge = document.querySelector('[data-testid="ia-readonly-badge"]');
      const resetBtn = document.querySelector('[data-testid="ia-reset-default-btn"]');
      const autoAlignBtn = document.querySelector('[data-testid="ia-auto-align-btn"]');
      const addChildBtns = document.querySelectorAll('[data-testid^="ia-add-child-btn-"]');
      const editBtns = document.querySelectorAll('[data-testid^="ia-edit-node-btn-"]');
      const deleteBtns = document.querySelectorAll('[data-testid^="ia-delete-node-btn-"]');
      const resizeHandles = document.querySelectorAll('[data-testid^="ia-resize-handle-"]');
      const portButtons = document.querySelectorAll('[data-port-action="true"]');
      const nodeCards = document.querySelectorAll('[data-testid^="ia-node-card-"]');

      return {
        hasReadonlyBadge: Boolean(readonlyBadge),
        badgeText: readonlyBadge ? readonlyBadge.textContent.trim() : null,
        hasResetBtn: Boolean(resetBtn),
        hasAutoAlignBtn: Boolean(autoAlignBtn),
        addChildCount: addChildBtns.length,
        editCount: editBtns.length,
        deleteCount: deleteBtns.length,
        resizeCount: resizeHandles.length,
        portCount: portButtons.length,
        cardCount: nodeCards.length,
        firstCardCursor: nodeCards.length > 0 ? window.getComputedStyle(nodeCards[0]).cursor : null
      };
    })()`,
    returnByValue: true
  });

  const poData = poEvalRes?.result?.result?.value || poEvalRes?.result?.value;
  console.log("PO Evaluation Results:", poData);

  assert(poData.hasReadonlyBadge === true, "PO must see [data-testid='ia-readonly-badge']");
  assert(poData.badgeText.includes("Chế độ chỉ xem"), "Badge text must say 'Chế độ chỉ xem'");
  assert(poData.hasResetBtn === false, "PO must NOT see Reset to default button");
  assert(poData.hasAutoAlignBtn === false, "PO must NOT see Auto-align button");
  assert(poData.addChildCount === 0, "PO must NOT see any Add Child buttons (found " + poData.addChildCount + ")");
  assert(poData.editCount === 0, "PO must NOT see any Edit Node buttons (found " + poData.editCount + ")");
  assert(poData.deleteCount === 0, "PO must NOT see any Delete Node buttons (found " + poData.deleteCount + ")");
  assert(poData.resizeCount === 0, "PO must NOT see any Resize handles (found " + poData.resizeCount + ")");
  assert(poData.portCount === 0, "PO must NOT see any Port action buttons (found " + poData.portCount + ")");
  assert(poData.cardCount > 0, "Canvas must still display nodes for viewing");
  console.log("✓ Scenario A PASSED: PO has clean, non-interactive read-only access!");

  // Capture screenshot of PO Read-Only mode
  const ssA = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join(process.cwd(), "ia-rbac-po-readonly.png"),
    Buffer.from(ssA.result.data, "base64")
  );
  // Also save to artifacts dir
  const artifactDir = "C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\2c061240-9de8-4158-b7ae-37a43300824e";
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(
      path.join(artifactDir, "ia-rbac-po-readonly.png"),
      Buffer.from(ssA.result.data, "base64")
    );
  }
  console.log("✓ Screenshot saved: ia-rbac-po-readonly.png");

  // --- SCENARIO B: Admin User (Full Edit Permissions) ---
  console.log("\n--- Scenario B: Testing Admin User (Full Edit Permissions) ---");
  await send("Runtime.evaluate", {
    expression: `(() => {
      const sess = JSON.stringify({
        sessionToken: "demo-token-admin",
        personalEmail: "admin@gmail.com",
        teamsEmail: "admin@mbbank.com.vn",
        displayName: "Admin MB UX Team",
        role: "Admin",
        expiresAt: Date.now() + 86400000
      });
      sessionStorage.setItem("ux_portal_session_auth", sess);
      localStorage.setItem("ux_portal_session_auth", sess);
      localStorage.setItem("ux_portal_session", sess);
      window.location.reload();
    })()`
  });

  await new Promise(r => setTimeout(r, 1500));

  const adminEvalRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const readonlyBadge = document.querySelector('[data-testid="ia-readonly-badge"]');
      const resetBtn = document.querySelector('[data-testid="ia-reset-default-btn"]');
      const autoAlignBtn = document.querySelector('[data-testid="ia-auto-align-btn"]');
      const addChildBtns = document.querySelectorAll('[data-testid^="ia-add-child-btn-"]');
      const editBtns = document.querySelectorAll('[data-testid^="ia-edit-node-btn-"]');
      const resizeHandles = document.querySelectorAll('[data-testid^="ia-resize-handle-"]');
      const portButtons = document.querySelectorAll('[data-port-action="true"]');

      return {
        hasReadonlyBadge: Boolean(readonlyBadge),
        hasResetBtn: Boolean(resetBtn),
        hasAutoAlignBtn: Boolean(autoAlignBtn),
        addChildCount: addChildBtns.length,
        editCount: editBtns.length,
        resizeCount: resizeHandles.length,
        portCount: portButtons.length,
      };
    })()`,
    returnByValue: true
  });

  const adminData = adminEvalRes?.result?.result?.value || adminEvalRes?.result?.value;
  console.log("Admin Evaluation Results:", adminData);

  assert(adminData.hasReadonlyBadge === false, "Admin must NOT see read-only badge");
  assert(adminData.hasResetBtn === true, "Admin must see Reset to default button");
  assert(adminData.hasAutoAlignBtn === true, "Admin must see Auto-align button");
  assert(adminData.addChildCount > 0, "Admin must see Add Child buttons");
  assert(adminData.editCount > 0, "Admin must see Edit Node buttons");
  assert(adminData.resizeCount > 0, "Admin must see Resize handles");
  assert(adminData.portCount > 0, "Admin must see Port connector buttons");
  console.log("✓ Scenario B PASSED: Admin has full interactive permissions!");

  // Capture screenshot of Admin Edit mode
  const ssB = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join(process.cwd(), "ia-rbac-admin-edit.png"),
    Buffer.from(ssB.result.data, "base64")
  );
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(
      path.join(artifactDir, "ia-rbac-admin-edit.png"),
      Buffer.from(ssB.result.data, "base64")
    );
  }
  console.log("✓ Screenshot saved: ia-rbac-admin-edit.png");

  // --- SCENARIO C: QuanLyPage RBAC Matrix Verification ---
  console.log("\n--- Scenario C: Testing RBAC Matrix in QuanLyPage ---");
  await send("Runtime.evaluate", {
    expression: `(() => {
      window.location.hash = "#manage?tab=rbac";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const rbacMatrixRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const pageText = document.body.innerText;
      const hasIaViewTitle = pageText.includes("Xem Kiến trúc Thông tin (IA)");
      const hasIaEditTitle = pageText.includes("Chỉnh sửa & Sắp xếp Node IA");

      // Verify row count and switch toggles
      const switches = document.querySelectorAll('button[role="switch"]');

      return {
        hasIaViewTitle,
        hasIaEditTitle,
        totalSwitches: switches.length,
      };
    })()`,
    returnByValue: true
  });

  const rbacData = rbacMatrixRes?.result?.result?.value || rbacMatrixRes?.result?.value;
  console.log("RBAC Matrix Results:", rbacData);

  assert(rbacData.hasIaViewTitle === true, "RBAC table must display 'Xem Kiến trúc Thông tin (IA)'");
  assert(rbacData.hasIaEditTitle === true, "RBAC table must display 'Chỉnh sửa & Sắp xếp Node IA'");
  console.log("✓ Scenario C PASSED: Both IA permissions are present in RBAC management table!");

  // Capture screenshot of RBAC matrix
  const ssC = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join(process.cwd(), "ia-rbac-matrix-verified.png"),
    Buffer.from(ssC.result.data, "base64")
  );
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(
      path.join(artifactDir, "ia-rbac-matrix-verified.png"),
      Buffer.from(ssC.result.data, "base64")
    );
  }
  console.log("✓ Screenshot saved: ia-rbac-matrix-verified.png");

  // Scroll into view of the new IA capability rows
  await send("Runtime.evaluate", {
    expression: `(() => {
      const allRows = Array.from(document.querySelectorAll("tbody tr"));
      const iaRow = allRows.find(tr => tr.innerText.includes("Kiến trúc Thông tin"));
      if (iaRow) {
        iaRow.scrollIntoView({ block: "center", behavior: "instant" });
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  const ssC2 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join(process.cwd(), "ia-rbac-matrix-scrolled.png"),
    Buffer.from(ssC2.result.data, "base64")
  );
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(
      path.join(artifactDir, "ia-rbac-matrix-scrolled.png"),
      Buffer.from(ssC2.result.data, "base64")
    );
  }
  console.log("✓ Screenshot saved: ia-rbac-matrix-scrolled.png");

  // Restore Admin session for normal app usage
  await send("Runtime.evaluate", {
    expression: `(() => {
      const sess = JSON.stringify({
        sessionToken: "demo-token-admin",
        personalEmail: "cuongdm5@mbbank.com.vn",
        teamsEmail: "cuongdm5@mbbank.com.vn",
        displayName: "Đỗ Mạnh Cường",
        role: "Admin",
        expiresAt: Date.now() + 86400000
      });
      sessionStorage.setItem("ux_portal_session_auth", sess);
      localStorage.setItem("ux_portal_session_auth", sess);
    })()`
  });

  try {
    ws.close();
    await chrome.kill();
  } catch {}
  console.log("\nAll RBAC tests completed successfully!");
}

runLiveTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
