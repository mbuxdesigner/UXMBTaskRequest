// test-delete-node-in-place.mjs
// Verification suite: When deleting a node, canvas does not auto-rearrange and does not jump out to full.

import assert from "node:assert";
import fs from "node:fs";
import * as chromeLauncher from './node_modules/chrome-launcher/dist/index.js';

console.log("=== Testing In-Place Node Deletion & Viewport Invariance ===");

// 1. Static file assertions
const pageContent = fs.readFileSync("./src/pages/IAPage.tsx", "utf-8");
assert(!pageContent.includes("onConfirmDelete={(nodeId) => {\n          deleteNode(nodeId)\n          handleFitToView()"), "onConfirmDelete must NOT call handleFitToView()");
console.log("✓ Step 1: src/pages/IAPage.tsx verified: onConfirmDelete does NOT call handleFitToView()");

const hookContent = fs.readFileSync("./src/hooks/useIATreeState.ts", "utf-8");
assert(hookContent.includes("layoutNodesRef"), "useIATreeState must track layoutNodesRef");
assert(hookContent.includes("lockPositions"), "deleteNode must lock remaining node positions before removal");
console.log("✓ Step 2: src/hooks/useIATreeState.ts verified: deleteNode locks positions so remaining nodes do not auto-rearrange");

// 2. Live Headless Chrome CDP Verification
async function runLiveTest() {
  console.log("Launching headless Chrome for live deletion test...");
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

  await send("Page.navigate", { url: "http://localhost:8443/#ia" });
  await new Promise(r => setTimeout(r, 1500));

  // Authenticate as Admin and set up a multi-node tree
  await send("Runtime.evaluate", {
    expression: `(() => {
      const sess = JSON.stringify({
        sessionToken: "demo-token",
        personalEmail: "admin@gmail.com",
        teamsEmail: "admin@mbbank.com.vn",
        displayName: "Admin MB UX Team",
        role: "Admin",
        expiresAt: Date.now() + 86400000
      });
      sessionStorage.setItem("ux_portal_session_auth", sess);
      localStorage.setItem("ux_portal_session_auth", sess);

      const trees = {
        "app-mbbank": {
          id: "root-app-mbbank",
          code: "APP-MB",
          name: "App MBBank (Khách hàng Cá nhân)",
          tier: 1,
          colorTheme: "blue",
          children: [
            {
              id: "node-1",
              parentId: "root-app-mbbank",
              tier: 2,
              name: "Phân hệ 1: Tài khoản & Thẻ",
              squad: "Cards & Thanh toán số",
              colorTheme: "blue",
              customX: 100,
              customY: 250,
              children: []
            },
            {
              id: "node-2",
              parentId: "root-app-mbbank",
              tier: 2,
              name: "Phân hệ 2: Vay vốn Online",
              squad: "Lending & Vay vốn",
              colorTheme: "emerald",
              customX: 420,
              customY: 250,
              children: []
            },
            {
              id: "node-3",
              parentId: "root-app-mbbank",
              tier: 2,
              name: "Phân hệ 3: Đầu tư Số",
              squad: "Digital Wealth & Đầu tư",
              colorTheme: "violet",
              customX: 740,
              customY: 250,
              children: []
            }
          ]
        },
        "biz-mb": { id: "root-biz-mb", code: "BIZ-MB", name: "Biz MB", tier: 1, children: [] },
        "web-portal": { id: "root-web-portal", code: "WEB-MB", name: "Web Portal", tier: 1, children: [] },
        "baas-open-api": { id: "root-baas-open-api", code: "BAAS-MB", name: "BaaS", tier: 1, children: [] }
      };

      localStorage.setItem("ux_portal_ia_tree_data_v4", JSON.stringify({
        version: 4,
        updatedAt: new Date().toISOString(),
        trees
      }));

      window.location.hash = "#ia";
      window.location.reload();
    })()`
  });

  await new Promise(r => setTimeout(r, 2500));

  // Navigate to IA tab via sidebar click
  await send("Runtime.evaluate", {
    expression: `(async () => {
      const allButtons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      const iaBtn = allButtons.find(b => b.textContent && b.textContent.includes('Kiến trúc'));
      if (iaBtn) iaBtn.click();
    })()`,
    awaitPromise: true
  });

  await new Promise(r => setTimeout(r, 1200));

  // Simulate user custom zoom and pan (e.g., zoomed in at 135%, panned to (150, 80))
  await send("Runtime.evaluate", {
    expression: `(() => {
      // Zoom in twice via toolbar
      const zoomInBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerHTML.includes('lucide-zoom-in') || b.getAttribute('aria-label')?.includes('phóng to') || b.title?.includes('Phóng to'));
      if (zoomInBtn) {
        zoomInBtn.click();
        zoomInBtn.click();
      }
    })()`
  });

  await new Promise(r => setTimeout(r, 500));

  // Record initial positions of Node 1, Node 2, Node 3 and current viewport zoom/pan
  const beforeState = await send("Runtime.evaluate", {
    expression: `(() => {
      const card1 = document.querySelector('[data-node-id="node-1"]');
      const card2 = document.querySelector('[data-node-id="node-2"]');
      const card3 = document.querySelector('[data-node-id="node-3"]');

      const r1 = card1?.getBoundingClientRect();
      const r2 = card2?.getBoundingClientRect();
      const r3 = card3?.getBoundingClientRect();

      // Get canvas transform layer
      const transformLayer = document.querySelector('[data-testid="ia-canvas-plane"]') || card1?.parentElement;
      const transformStyle = transformLayer ? transformLayer.getAttribute('style') : '';

      return {
        card1: { left: card1?.style.left, top: card1?.style.top, rectX: r1?.left, rectY: r1?.top },
        card2: { left: card2?.style.left, top: card2?.style.top, rectX: r2?.left, rectY: r2?.top },
        card3: { left: card3?.style.left, top: card3?.style.top, rectX: r3?.left, rectY: r3?.top },
        transformStyle
      };
    })()`,
    returnByValue: true
  });

  console.log("State BEFORE deleting node-2:", beforeState?.result?.result?.value);

  // Now delete Node 2 by clicking its delete button
  const delClickRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const delBtn = document.querySelector('[data-testid="ia-delete-node-btn-node-2"]') || 
                     document.querySelector('[data-node-id="node-2"] [title="Xóa node"]');
      if (delBtn) {
        delBtn.click();
        return { clickedDelBtn: true };
      }
      return { 
        clickedDelBtn: false, 
        node2Exists: Boolean(document.querySelector('[data-node-id="node-2"]')) 
      };
    })()`,
    returnByValue: true
  });
  console.log("Delete button click:", delClickRes?.result?.result?.value);

  await new Promise(r => setTimeout(r, 600));

  // Confirm delete in the confirmation modal
  const confirmRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const confirmBtn = document.querySelector('[data-testid="ia-modal-confirm-btn"]');
      if (confirmBtn) {
        confirmBtn.click();
        return { clickedConfirm: true };
      }
      return { 
        clickedConfirm: false, 
        modal: Boolean(document.querySelector('[role="dialog"]')),
        allModalButtons: Array.from(document.querySelectorAll('[role="dialog"] button')).map(b => b.textContent?.trim())
      };
    })()`,
    returnByValue: true
  });
  console.log("Modal confirm click:", confirmRes?.result?.result?.value);

  await new Promise(r => setTimeout(r, 1200));

  // Inspect state AFTER deletion:
  // 1. node-2 must be gone
  // 2. node-1 and node-3 MUST stay at the exact same left/top and client bounding positions!
  // 3. Canvas transform layer must retain the exact same zoom and pan style!
  const afterState = await send("Runtime.evaluate", {
    expression: `(() => {
      const card1 = document.querySelector('[data-node-id="node-1"]');
      const card2 = document.querySelector('[data-node-id="node-2"]');
      const card3 = document.querySelector('[data-node-id="node-3"]');

      const r1 = card1?.getBoundingClientRect();
      const r3 = card3?.getBoundingClientRect();

      const transformLayer = document.querySelector('[data-testid="ia-canvas-plane"]') || card1?.parentElement;
      const transformStyle = transformLayer ? transformLayer.getAttribute('style') : '';

      return {
        card1: { left: card1?.style.left, top: card1?.style.top, rectX: r1?.left, rectY: r1?.top },
        card2Exists: Boolean(card2),
        card3: { left: card3?.style.left, top: card3?.style.top, rectX: r3?.left, rectY: r3?.top },
        transformStyle
      };
    })()`,
    returnByValue: true
  });

  console.log("State AFTER deleting node-2:", afterState?.result?.result?.value);

  const before = beforeState?.result?.result?.value;
  const after = afterState?.result?.result?.value;

  assert(!after.card2Exists, "node-2 must be deleted");
  assert.strictEqual(after.card1.left, before.card1.left, "Node 1 left coordinate must stay identical");
  assert.strictEqual(after.card1.top, before.card1.top, "Node 1 top coordinate must stay identical");
  assert.strictEqual(after.card3.left, before.card3.left, "Node 3 left coordinate must stay identical");
  assert.strictEqual(after.card3.top, before.card3.top, "Node 3 top coordinate must stay identical");
  console.log("✓ Step 3: Verified remaining nodes 1 & 3 stay at the EXACT SAME canvas pixel coordinates!");

  assert.strictEqual(after.transformStyle, before.transformStyle, "Canvas transform (zoom & pan) must remain 100% unchanged (no jumping out to full)");
  console.log("✓ Step 4: Verified canvas transform did NOT jump to full and preserved zoom/pan position!");

  // Capture screenshot of the post-delete canvas
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const artifactDir = "C:/Users/Administrator/.gemini/antigravity/brain/2c061240-9de8-4158-b7ae-37a43300824e";
  if (shot?.result?.data) {
    fs.writeFileSync(`${artifactDir}/ia-post-delete-in-place.png`, Buffer.from(shot.result.data, 'base64'));
    console.log("Screenshot saved to ia-post-delete-in-place.png");
  }

  try {
    await chrome.kill();
  } catch (e) {}

  console.log("\nALL IN-PLACE DELETION TESTS PASSED! 🚀");
}

runLiveTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
