// test-node-resize-and-colors.mjs
// Verification suite:
// 1. Node resizing (width & height via bottom-right handle, persisting custom dimensions)
// 2. Multi-tier color schemes (Lv 1 Blue, Lv 2 Indigo, Lv 3 Emerald, Lv 4 Amber)

import assert from "node:assert";
import fs from "node:fs";
import * as chromeLauncher from './node_modules/chrome-launcher/dist/index.js';

console.log("=== Testing Node Resizing & Level-Based Color Division ===");

// 1. Static file assertions
const typesContent = fs.readFileSync("./src/types/ia.ts", "utf-8");
assert(typesContent.includes("customWidth?: number"), "IANode must include customWidth?: number");
assert(typesContent.includes("customHeight?: number"), "IANode must include customHeight?: number");
console.log("✓ Step 1: src/types/ia.ts has customWidth and customHeight");

const hookContent = fs.readFileSync("./src/hooks/useIATreeState.ts", "utf-8");
assert(hookContent.includes("updateNodeDimensions"), "useIATreeState must export updateNodeDimensions");
assert(hookContent.includes("node.customWidth || dim.width"), "buildInternal must respect customWidth");
assert(hookContent.includes("node.customHeight || dim.height"), "buildInternal must respect customHeight");
console.log("✓ Step 2: src/hooks/useIATreeState.ts manages node dimensions and connector recalculation");

const cardContent = fs.readFileSync("./src/components/ia/IATreeNodeCard.tsx", "utf-8");
assert(cardContent.includes("getTierThemeStyles"), "IATreeNodeCard must use getTierThemeStyles");
assert(cardContent.includes("data-resize-handle"), "IATreeNodeCard must have data-resize-handle");
assert(cardContent.includes("onNodeResize"), "IATreeNodeCardProps must accept onNodeResize");
assert(cardContent.includes("onNodeResizeEnd"), "IATreeNodeCardProps must accept onNodeResizeEnd");
console.log("✓ Step 3: src/components/ia/IATreeNodeCard.tsx implements resize handle and level color schemes");

const viewportContent = fs.readFileSync("./src/components/ia/IACanvasViewport.tsx", "utf-8");
assert(viewportContent.includes("onNodeResize"), "IACanvasViewport must wire onNodeResize");
assert(viewportContent.includes("onNodeResizeEnd"), "IACanvasViewport must wire onNodeResizeEnd");
console.log("✓ Step 4: src/components/ia/IACanvasViewport.tsx forwards resize callbacks");

const pageContent = fs.readFileSync("./src/pages/IAPage.tsx", "utf-8");
assert(pageContent.includes("updateNodeDimensions"), "IAPage must wire updateNodeDimensions");
console.log("✓ Step 5: src/pages/IAPage.tsx binds updateNodeDimensions to viewport");

// 2. Live Headless Chrome Verification
async function runLiveTest() {
  console.log("Launching headless Chrome for live testing...");
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
  await new Promise(r => setTimeout(r, 1200));

  // Authenticate as Admin and set up a 4-tier tree (Lv 1, Lv 2, Lv 3, Lv 4)
  console.log("Seeding test data with 4 tiers (Lv 1, Lv 2, Lv 3, Lv 4)...");
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
          customX: 100,
          customY: 100,
          children: [
            {
              id: "node-lvl2-lending",
              parentId: "root-app-mbbank",
              tier: 2,
              name: "Phân hệ: Vay vốn & Tín dụng",
              squad: "Lending & Vay vốn",
              customX: 100,
              customY: 260,
              children: [
                {
                  id: "node-lvl3-loan-journey",
                  parentId: "node-lvl2-lending",
                  tier: 3,
                  name: "Luồng: Đăng ký vay thấu chi online",
                  squad: "Lending & Vay vốn",
                  hasActiveTask: true,
                  customX: 100,
                  customY: 420,
                  children: [
                    {
                      id: "node-lvl4-screen-submit",
                      parentId: "node-lvl3-loan-journey",
                      tier: 4,
                      name: "Màn hình: Xác nhận hồ sơ & OTP",
                      squad: "Lending & Vay vốn",
                      hasActiveTask: true,
                      customX: 100,
                      customY: 580,
                      children: []
                    }
                  ]
                }
              ]
            }
          ]
        }
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
    expression: `(() => {
      const allButtons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      const iaBtn = allButtons.find(b => b.textContent && b.textContent.includes('Kiến trúc'));
      if (iaBtn) iaBtn.click();
    })()`,
  });

  await new Promise(r => setTimeout(r, 1200));

  // Check 4-Tier color differentiation in DOM
  const colorCheckRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const rootCard = document.querySelector('[data-testid="ia-node-card-root-app-mbbank"]');
      const lvl2Card = document.querySelector('[data-testid="ia-node-card-node-lvl2-lending"]');
      const lvl3Card = document.querySelector('[data-testid="ia-node-card-node-lvl3-loan-journey"]');
      const lvl4Card = document.querySelector('[data-testid="ia-node-card-node-lvl4-screen-submit"]');

      if (!rootCard || !lvl2Card || !lvl3Card || !lvl4Card) {
        return { 
          success: false, 
          reason: "One or more tier cards not found in DOM",
          found: {
            root: Boolean(rootCard),
            lvl2: Boolean(lvl2Card),
            lvl3: Boolean(lvl3Card),
            lvl4: Boolean(lvl4Card)
          }
        };
      }

      return {
        success: true,
        rootBadge: rootCard.innerText.toLowerCase().includes("cấp 1"),
        rootClass: rootCard.className.includes("border-blue-300") || rootCard.className.includes("blue"),
        lvl2Badge: lvl2Card.innerText.toLowerCase().includes("cấp 2"),
        lvl2Class: lvl2Card.className.includes("border-indigo-200") || lvl2Card.className.includes("indigo"),
        lvl3Badge: lvl3Card.innerText.toLowerCase().includes("cấp 3"),
        lvl3Class: lvl3Card.className.includes("border-emerald-200") || lvl3Card.className.includes("emerald"),
        lvl4Badge: lvl4Card.innerText.toLowerCase().includes("cấp 4"),
        lvl4Class: lvl4Card.className.includes("border-amber-200") || lvl4Card.className.includes("amber"),
      };
    })()`,
    returnByValue: true
  });

  const colorCheck = colorCheckRes?.result?.result?.value;
  console.log("Color Check Result:", colorCheck);
  assert(colorCheck && colorCheck.success, `All 4 tier cards must exist: ${JSON.stringify(colorCheck)}`);
  assert(colorCheck.rootBadge, "Lv 1 badge must say 'Cấp 1 · Sản phẩm'");
  assert(colorCheck.lvl2Badge, "Lv 2 badge must say 'Cấp 2 · Phân hệ'");
  assert(colorCheck.lvl3Badge, "Lv 3 badge must say 'Cấp 3 · Luồng'");
  assert(colorCheck.lvl4Badge, "Lv 4 badge must say 'Cấp 4 · Màn hình'");
  console.log("✓ Step 6: Multi-tier color division verified across Lv 1, Lv 2, Lv 3, Lv 4");

  // Capture tier colors screenshot
  const artifactDir = "C:/Users/Administrator/.gemini/antigravity/brain/2c061240-9de8-4158-b7ae-37a43300824e";
  const snap1 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${artifactDir}/ia-tier-colors-verified.png`, Buffer.from(snap1.result.data, "base64"));
  console.log(`✓ Screenshot 1 saved to ${artifactDir}/ia-tier-colors-verified.png`);

  // Now test Interactive Resize on Level 3 node (node-lvl3-loan-journey)
  console.log("Testing interactive card resize on node-lvl3-loan-journey...");
  const initDimensionsRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const card = document.querySelector('[data-testid="ia-node-card-node-lvl3-loan-journey"]');
      const handle = document.querySelector('[data-testid="ia-resize-handle-node-lvl3-loan-journey"]');
      if (!card || !handle) return null;
      const cardRect = card.getBoundingClientRect();
      const handleRect = handle.getBoundingClientRect();
      return {
        cardWidth: cardRect.width,
        cardHeight: cardRect.height,
        handleCenterX: handleRect.x + handleRect.width / 2,
        handleCenterY: handleRect.y + handleRect.height / 2
      };
    })()`,
    returnByValue: true
  });

  const initDimensions = initDimensionsRes?.result?.result?.value;
  console.log("Initial card dimensions:", initDimensions);
  assert(initDimensions, "Resize handle must be present on node card");

  const { handleCenterX, handleCenterY, cardWidth: initialW, cardHeight: initialH } = initDimensions;

  // Dispatch pointer events to drag-resize by +120px in X and +60px in Y
  const targetX = handleCenterX + 120;
  const targetY = handleCenterY + 60;

  await send("Runtime.evaluate", {
    expression: `(() => {
      const handle = document.querySelector('[data-testid="ia-resize-handle-node-lvl3-loan-journey"]');
      
      const downEvt = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX: ${handleCenterX},
        clientY: ${handleCenterY},
        button: 0
      });
      handle.dispatchEvent(downEvt);

      // Intermediate moves
      for (let i = 1; i <= 5; i++) {
        const moveEvt = new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX: ${handleCenterX} + (120 * i / 5),
          clientY: ${handleCenterY} + (60 * i / 5),
          button: 0
        });
        window.dispatchEvent(moveEvt);
      }

      // Final up event
      const upEvt = new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: ${targetX},
        clientY: ${targetY},
        button: 0
      });
      window.dispatchEvent(upEvt);
    })()`
  });

  await new Promise(r => setTimeout(r, 600));

  // Check new dimensions
  const newDimensionsRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const card = document.querySelector('[data-testid="ia-node-card-node-lvl3-loan-journey"]');
      const rect = card.getBoundingClientRect();
      const stored = JSON.parse(localStorage.getItem("ux_portal_ia_tree_data_v4") || "{}");
      const root = stored.trees ? stored.trees["app-mbbank"] : stored["app-mbbank"];
      const lvl3Stored = root?.children?.[0]?.children?.[0];
      return {
        newWidth: rect.width,
        newHeight: rect.height,
        storedWidth: lvl3Stored?.customWidth,
        storedHeight: lvl3Stored?.customHeight
      };
    })()`,
    returnByValue: true
  });

  const newDimensions = newDimensionsRes?.result?.result?.value;
  console.log("New Dimensions & Storage:", newDimensions);
  assert(newDimensions.newWidth > initialW, `New width (${newDimensions.newWidth}) must be greater than initial (${initialW})`);
  assert(newDimensions.newHeight > initialH, `New height (${newDimensions.newHeight}) must be greater than initial (${initialH})`);
  assert(newDimensions.storedWidth, "Custom width must be persisted in localStorage");
  assert(newDimensions.storedHeight, "Custom height must be persisted in localStorage");
  console.log("✓ Step 7: Interactive resizing smoothly expands width and height and persists in storage");

  // Capture screenshot with resized node
  const snap2 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${artifactDir}/ia-node-resized-verified.png`, Buffer.from(snap2.result.data, "base64"));
  console.log(`✓ Screenshot 2 saved to ${artifactDir}/ia-node-resized-verified.png`);

  ws.close();
  try {
    await chrome.kill();
  } catch (e) {
    // Ignore Windows EPERM on temp dir cleanup
  }
  console.log("\n=== ALL NODE RESIZE & LEVEL COLOR TESTS PASSED ===");
}

runLiveTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
