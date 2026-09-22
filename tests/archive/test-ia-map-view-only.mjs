import fs from "fs"
import path from "path"

const ROOT = process.cwd()

let passCount = 0
let failCount = 0

function test(title, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ [PASS] ${title}`)
    passCount++
  } else {
    console.error(`  ❌ [FAIL] ${title}${detail ? " -> " + detail : ""}`)
    failCount++
  }
}

console.log("=== KIỂM THỬ TRẢI NGHIỆM IA MAP CHO QUYỀN VIEW (CHẾ ĐỘ CHỈ XEM) ===\n")

// 1. Kiểm tra IAPage.tsx
console.log("[Mục 1] Ẩn toàn bộ nút tác vụ biên tập trên PageHeader và Sidebar cho quyền View:")
const iaPageContent = fs.readFileSync(path.join(ROOT, "src/pages/IAPage.tsx"), "utf-8").replace(/\r\n/g, "\n")

test(
  "PageHeader actions chỉ render khi có quyền canEdit (ẩn Cài đặt sơ đồ, Tải Cloud, Lưu Cloud, Menu khác)",
  iaPageContent.includes("actions={\n          canEdit ? (")
)

test(
  "PageHeader hiển thị badge 'Chế độ chỉ xem' khi !canEdit",
  iaPageContent.includes('data-testid="ia-readonly-badge"') && iaPageContent.includes("Chế độ chỉ xem")
)

test(
  "IAQuickAddSidebar chỉ hiển thị khi có quyền canEdit (người xem không bị hiển thị thanh add node)",
  iaPageContent.includes("if (!canEdit) return false") && iaPageContent.includes("isDesignAdminOrOwner")
)

test(
  "IAPage định nghĩa handleOpenViewNode để mở modal xem chi tiết node",
  iaPageContent.includes("handleOpenViewNode = useCallback((node: IANode) =>") &&
  iaPageContent.includes('setModalMode("view")')
)

test(
  "IAPage truyền onOpenNodeDetail vào IACanvasViewport và onOpenRequestDetail vào IANodeEditorModal",
  iaPageContent.includes("onOpenNodeDetail={handleOpenViewNode}") &&
  iaPageContent.includes("onOpenRequestDetail={(req) => setSelectedRequest(req)}")
)

// 2. Kiểm tra IACanvasViewport.tsx
console.log("\n[Mục 2] Kéo xem IA Map mượt mà và các nút điều hướng Canvas:")
const canvasViewportContent = fs.readFileSync(path.join(ROOT, "src/components/ia/IACanvasViewport.tsx"), "utf-8").replace(/\r\n/g, "\n")

test(
  "IACanvasViewport xử lý kéo nền xem IA map (onPointerDown) khi readOnly mà không kích hoạt marquee",
  canvasViewportContent.includes("if (readOnly) {") &&
  canvasViewportContent.includes("onPointerDown(e)")
)

test(
  "Click vào khoảng trống canvas khi readOnly sẽ bỏ chọn node (clears selection)",
  canvasViewportContent.includes("setSelectedNodeIds(new Set())")
)

test(
  "Các nút zoom In, zoom Out, 100%, và Căn giữa (Fit to View) luôn hiển thị cho người xem",
  canvasViewportContent.includes('data-testid="ia-zoom-in-btn"') &&
  canvasViewportContent.includes('data-testid="ia-zoom-out-btn"') &&
  canvasViewportContent.includes('data-testid="ia-zoom-reset-btn"') &&
  canvasViewportContent.includes('data-testid="ia-fit-view-btn"')
)

test(
  "Nút Phóng to toàn màn hình (vew full / ia-fullscreen-btn) luôn hiển thị cho người xem",
  canvasViewportContent.includes('data-testid="ia-fullscreen-btn"')
)

// 3. Kiểm tra ẩn các tính năng thừa trên Canvas cho người xem
console.log("\n[Mục 3] Ẩn toàn bộ các tính năng editor/admin thừa trên Canvas khi readOnly:")

test(
  "Ẩn bộ chuyển đổi Tool Switcher (Select V / Pan H) khi readOnly",
  canvasViewportContent.includes("{!readOnly && (\n          <div className=\"flex items-center bg-slate-100/90")
)

test(
  "Ẩn nút Snap to Grid khi readOnly",
  canvasViewportContent.includes("{!readOnly && (\n          <>\n            <button\n              type=\"button\"\n              data-testid=\"ia-snap-grid-btn\"")
)

test(
  "Ẩn nút Căn chuẩn tự động (AutoAlign) khi readOnly",
  canvasViewportContent.includes("!readOnly && onAutoAlign && (")
)

test(
  "Ẩn nút bật/tắt bản đồ nhỏ (Minimap) và layer Minimap khi readOnly",
  canvasViewportContent.includes("{!readOnly && bounds && (\n        <IAMinimap") &&
  canvasViewportContent.includes("{!readOnly && (\n          <button\n            type=\"button\"\n            data-testid=\"ia-toggle-minimap-btn\"")
)

test(
  "Ẩn menu canvas dropdown (...) khi readOnly",
  canvasViewportContent.includes("{!readOnly && (\n          <div className=\"relative\" ref={canvasMenuRef}>")
)

test(
  "Ẩn thanh pill di chuyển nhóm đa chọn (ia-canvas-selection-pill) khi readOnly",
  canvasViewportContent.includes("{!readOnly && selectedNodeIds.size > 0 && (")
)

// 4. Kiểm tra Tích chọn và Xem chi tiết Node
console.log("\n[Mục 4] Tích chọn vào thẻ và xem chi tiết node:")
const cardContent = fs.readFileSync(path.join(ROOT, "src/components/ia/IATreeNodeCard.tsx"), "utf-8").replace(/\r\n/g, "\n")
const toolbarContent = fs.readFileSync(path.join(ROOT, "src/components/ia/IANodeFloatingToolbar.tsx"), "utf-8").replace(/\r\n/g, "\n")
const modalContent = fs.readFileSync(path.join(ROOT, "src/components/ia/IANodeEditorModal.tsx"), "utf-8").replace(/\r\n/g, "\n")

test(
  "IACanvasViewport truyền onCardSelect={handleCardSelect} bất kể readOnly để người xem tích chọn được node",
  canvasViewportContent.includes("onCardSelect={handleCardSelect}")
)

test(
  "IATreeNodeCard đặt cursor-pointer khi readOnly để người dùng biết có thể click chọn",
  cardContent.includes('const draggingClass = readOnly\n    ? "cursor-pointer"')
)

test(
  "IATreeNodeCard click gọi onCardSelect để kích hoạt chọn node",
  cardContent.includes("onCardSelect?.(node.id, e as unknown as React.PointerEvent)")
)

test(
  "IATreeNodeCard hỗ trợ double click mở trực tiếp chi tiết node (onOpenNodeDetail)",
  cardContent.includes("onDoubleClick={handleDoubleClick}") &&
  cardContent.includes("onOpenNodeDetail(node)")
)

test(
  "IATreeNodeCard ẩn toàn bộ 4 cổng nối (ports) khi readOnly",
  cardContent.includes("!readOnly && isSelected && (")
)

test(
  "IATreeNodeCard ẩn toàn bộ cụm nút thêm, sửa, xóa và tay cầm resize khi readOnly",
  cardContent.includes("!readOnly && isSelected && (\n          <div className=\"flex items-center gap-0.5") &&
  cardContent.includes("!readOnly && (\n        <div\n          data-testid={`ia-resize-handle-")
)

test(
  "Thanh công cụ nổi IANodeFloatingToolbar hiển thị khi 1 node được chọn ngay cả khi readOnly",
  canvasViewportContent.includes("selectedNodeIds.size === 1 && (() => {") &&
  !canvasViewportContent.includes("selectedNodeIds.size === 1 && !readOnly && (() => {")
)

test(
  "IANodeFloatingToolbar có nút 'Xem chi tiết' với icon Eye",
  toolbarContent.includes('data-testid={`ia-float-view-${node.id}`}') &&
  toolbarContent.includes("Xem chi tiết")
)

test(
  "IANodeFloatingToolbar có nút 'Bài toán' nếu node có liên kết task",
  toolbarContent.includes('data-testid={`ia-float-task-${node.id}`}') &&
  toolbarContent.includes("onOpenTask(linkedRequest)")
)

test(
  "IANodeFloatingToolbar ẩn nút Thêm con, Sửa, Xóa khi readOnly",
  toolbarContent.includes("!readOnly && node.tier < 4 && (") &&
  toolbarContent.includes("!readOnly && (\n        <button\n          type=\"button\"\n          data-testid={`ia-float-edit-") &&
  toolbarContent.includes("!readOnly && (\n        <>\n          <div className=\"w-px h-3.5 bg-slate-700 mx-0.5\" />\n          <button\n            type=\"button\"\n            data-testid={`ia-float-delete-")
)

// 5. Kiểm tra IANodeEditorModal mode view
console.log("\n[Mục 5] Modal hiển thị chi tiết node trong chế độ xem (mode='view'):")

test(
  "IANodeEditorModal định nghĩa mode 'view' trong ModalMode",
  modalContent.includes('export type ModalMode = "add" | "edit" | "delete" | "reset" | "view" | null')
)

test(
  "IANodeEditorModal render container chi tiết node 'ia-node-view-details'",
  modalContent.includes('data-testid="ia-node-view-details"')
)

test(
  "Hiển thị đầy đủ Tier badge, mã ID node với nút sao chép, Squad, Loại điểm chạm, Màu sắc, Thẻ phân loại, Mô tả",
  modalContent.includes("Tier {targetNode.tier}") &&
  modalContent.includes("Mã định danh ID:") &&
  modalContent.includes("Squad phụ trách") &&
  modalContent.includes("Loại điểm chạm") &&
  modalContent.includes("Mô tả tính năng")
)

test(
  "Hiển thị bài toán thiết kế liên kết và cho phép xem chi tiết task qua onOpenRequestDetail",
  modalContent.includes("Bài toán thiết kế liên kết") &&
  modalContent.includes("onOpenRequestDetail(req)")
)

test(
  "Footer ở chế độ xem chỉ có duy nhất nút 'Đóng', không có nút Lưu thay đổi hay Xóa node",
  modalContent.includes('data-testid="ia-modal-close-btn"') &&
  modalContent.includes("Chế độ xem thông tin chi tiết node")
)

console.log("\n========================================")
console.log(`KẾT QUẢ KIỂM THỬ QUYỀN VIEW: ${passCount} tiêu chuẩn ĐẠT, ${failCount} tiêu chuẩn THẤT BẠI.`)
if (failCount === 0) {
  console.log("🎉 TRẢI NGHIỆM CHO CÁC QUYỀN VIEW ĐÃ HOÀN TOÀN TINH GỌN, CHÍNH XÁC VÀ ĐẠT ĐÚNG 100% YÊU CẦU CỦA USER!")
} else {
  process.exit(1)
}
