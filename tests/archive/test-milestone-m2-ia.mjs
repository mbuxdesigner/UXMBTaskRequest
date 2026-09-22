import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log("================================================================================")
console.log("VERIFYING MILESTONE 2: IA INTERACTIVE CANVAS & MANAGEMENT")
console.log("================================================================================\n")

// 1. Verify File Existence
const requiredFiles = [
  "src/hooks/useCanvasTransform.ts",
  "src/hooks/useIATreeState.ts",
  "src/components/ia/IACanvasViewport.tsx",
  "src/components/ia/IABezierConnectors.tsx",
  "src/components/ia/IATreeNodeCard.tsx",
  "src/components/ia/IAToolbar.tsx",
  "src/components/ia/IANodeEditorModal.tsx",
  "src/pages/IAPage.tsx",
]

for (const relPath of requiredFiles) {
  const fullPath = path.join(__dirname, relPath)
  assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`)
  console.log(`  ✓ File exists: ${relPath}`)
}

// 2. Transpile and Test Pure Math in useCanvasTransform.ts via CommonJS
const transformPath = path.join(__dirname, "src/hooks/useCanvasTransform.ts")
const transformSrc = fs.readFileSync(transformPath, "utf-8")
const transformJs = ts.transpileModule(transformSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

const transformExports = {}
const mockRequire = (pkg) => {
  if (pkg === "react") {
    return {
      useState: (init) => [typeof init === "function" ? init() : init, () => {}],
      useCallback: (fn) => fn,
      useRef: (init) => ({ current: init }),
      useEffect: () => {},
      useMemo: (fn) => fn(),
    }
  }
  return {}
}
new Function("exports", "require", transformJs)(transformExports, mockRequire)

assert.ok(typeof transformExports.zoomAtPoint === "function", "zoomAtPoint must be exported")
assert.ok(typeof transformExports.computeFitToView === "function", "computeFitToView must be exported")
assert.equal(transformExports.MIN_ZOOM, 0.25, "MIN_ZOOM must be 0.25")
assert.equal(transformExports.MAX_ZOOM, 2.0, "MAX_ZOOM must be 2.0")

// Test zoomAtPoint invariance
const initial = { x: 100, y: 50, scale: 1.0 }
const cursor = { x: 400, y: 300 }
const zoomedIn = transformExports.zoomAtPoint(initial, cursor, 1.15)
// Cursor invariance: (C - X_new)/S_new must equal (C - X_old)/S_old
const beforeX = (cursor.x - initial.x) / initial.scale
const afterX = (cursor.x - zoomedIn.x) / zoomedIn.scale
assert.ok(Math.abs(beforeX - afterX) < 0.001, "Cursor X must be invariant after zoom")
console.log("  ✓ zoomAtPoint satisfies cursor invariance contract")

// Test zoom clamping
const maxClamped = transformExports.zoomAtPoint({ x: 0, y: 0, scale: 1.9 }, { x: 0, y: 0 }, 1.5)
assert.equal(maxClamped.scale, 2.0, "Zoom above max must clamp to 2.0")

const minClamped = transformExports.zoomAtPoint({ x: 0, y: 0, scale: 0.3 }, { x: 0, y: 0 }, 0.5)
assert.equal(minClamped.scale, 0.25, "Zoom below min must clamp to 0.25")
console.log("  ✓ zoomAtPoint scale boundary clamping verified (0.25 to 2.0)")

// Test computeFitToView
const bounds = { minX: 40, minY: 40, maxX: 1200, maxY: 800 }
const viewport = { width: 1440, height: 900 }
const fit = transformExports.computeFitToView(viewport, bounds, 60)
assert.ok(fit.scale >= 0.25 && fit.scale <= 1.25, "Fit-to-view scale must be in [0.25, 1.25]")
assert.ok(isFinite(fit.x) && isFinite(fit.y), "Fit-to-view pan must be finite")
console.log("  ✓ computeFitToView bounding-box calculation verified")

// 3. Verify AST of React Components
function verifyExport(filePath, exportName) {
  const src = fs.readFileSync(filePath, "utf-8")
  const sourceFile = ts.createSourceFile(path.basename(filePath), src, ts.ScriptTarget.Latest, true)
  let found = false
  ts.forEachChild(sourceFile, (node) => {
    if (exportName === "default") {
      if (
        ts.isExportAssignment(node) ||
        (node.modifiers && node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword))
      ) {
        found = true
      }
    } else if (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) {
      if (node.modifiers && node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isFunctionDeclaration(node) && node.name?.text === exportName) found = true
        if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (decl.name.getText(sourceFile) === exportName) found = true
          }
        }
      }
    }
  })
  assert.ok(found, `Expected export ${exportName} in ${filePath}`)
}

verifyExport(path.join(__dirname, "src/components/ia/IACanvasViewport.tsx"), "default")
console.log("  ✓ IACanvasViewport default export verified")

verifyExport(path.join(__dirname, "src/components/ia/IABezierConnectors.tsx"), "IABezierConnectors")
console.log("  ✓ IABezierConnectors export verified")

verifyExport(path.join(__dirname, "src/components/ia/IATreeNodeCard.tsx"), "IATreeNodeCard")
console.log("  ✓ IATreeNodeCard export verified")

verifyExport(path.join(__dirname, "src/components/ia/IAToolbar.tsx"), "default")
console.log("  ✓ IAToolbar default export verified")

verifyExport(path.join(__dirname, "src/components/ia/IANodeEditorModal.tsx"), "default")
console.log("  ✓ IANodeEditorModal default export verified")

verifyExport(path.join(__dirname, "src/pages/IAPage.tsx"), "default")
console.log("  ✓ IAPage default export verified")

console.log("\n================================================================================")
console.log("ALL MILESTONE 2 VERIFICATION CHECKS PASSED SUCCESSFULLY!")
console.log("================================================================================\n")
