/**
 * Phân cấp 4 tầng của Kiến trúc Thông tin (Information Architecture)
 * - Tier 1: Sản phẩm số tổng thể (Product Root)
 * - Tier 2: Phân hệ / Module nghiệp vụ (Domain / Module)
 * - Tier 3: Luồng tính năng người dùng (Feature Journey)
 * - Tier 4: Màn hình & Điểm chạm tương tác (Screens & Touchpoints)
 */
export type IATier = 1 | 2 | 3 | 4

/**
 * Các loại điểm chạm người dùng ở Tầng 4 (Screens & Touchpoints)
 */
export type IATouchpointType =
  | "screen"
  | "modal"
  | "bottom_sheet"
  | "push_notification"
  | "webview"
  | "action_sheet"

/**
 * Vị trí 4 đầu nối (Connector Ports / Anchor Handles) trên thẻ Node
 */
export type IAPortPosition = "top" | "bottom" | "left" | "right"

/**
 * Trạng thái đang kéo dây nối mũi tên từ một Cổng (Port Dragging Wire)
 */
export interface IAPortDragState {
  sourceNodeId: string
  sourcePort: IAPortPosition
  startCanvasX: number
  startCanvasY: number
  currentCanvasX: number
  currentCanvasY: number
  hoveredTargetNodeId?: string | null
}

/**
 * Interface đại diện cho một Node trên cây Kiến trúc Thông tin
 */
export interface IANode {
  id: string
  tier: IATier
  name: string
  code?: string
  description?: string
  parentId?: string | null
  children?: IANode[]
  customX?: number        // Tọa độ X do người dùng kéo thả sắp xếp trên Canvas
  customY?: number        // Tọa độ Y do người dùng kéo thả sắp xếp trên Canvas
  customWidth?: number    // Chiều rộng do người dùng kéo dãn tùy chỉnh trên Canvas
  customHeight?: number   // Chiều cao do người dùng kéo dãn tùy chỉnh trên Canvas
  customTrunkOffset?: number // Khoảng cách trục thân bus line kéo thả dạng FigJam (pixel)
  squad?: string          // Squad phụ trách (Lending & Vay vốn, Cards, ...)
  taskIds?: string[]      // Danh sách các mã task liên kết với tính năng này
  hasActiveTask?: boolean // Trạng thái có task đang làm hay không
  requestId?: string      // Tương thích ngược với mã 1 task đơn lẻ
  figmaUrl?: string
  touchpointType?: IATouchpointType
  status?: string
  progress?: number
  assignedDesigner?: string
  colorTheme?: string
  isCriticalPath?: boolean
  siblingRoots?: IANode[] // Danh sách các node Cấp 1 song song khác cùng thuộc sản phẩm
  customTag?: string
  displaySettings?: IANodeDisplaySettings // Cài đặt hiển thị On/Off chi tiết của từng node
  collapsed?: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * Cài đặt hiển thị (Display / Visibility Settings) chi tiết cho từng thẻ Node
 */
export interface IANodeDisplaySettings {
  allowDirectTasks?: boolean   // Cho phép tìm kiếm & gán bài toán trực tiếp vào node này
  showProgress?: boolean       // Bật/tắt thanh tiến độ & checklist
  rollupProgress?: boolean     // Tự động thu thập tiến độ từ tất cả các node con cháu
  showSquad?: boolean          // Bật/tắt hiển thị nhãn Squad
  showDesigner?: boolean       // Bật/tắt hiển thị avatar và tên người phụ trách
  showStatus?: boolean         // Bật/tắt đèn báo trạng thái chân thẻ ("Đang có task làm", ...)
  showBranchCount?: boolean    // Bật/tắt nút đếm nhánh con
}

/**
 * Cấu hình hiển thị mặc định theo từng Cấp độ (Tier Defaults)
 */
export function getTierDefaultDisplaySettings(tier: IATier): Required<IANodeDisplaySettings> {
  switch (tier) {
    case 1:
      return {
        allowDirectTasks: false,
        showProgress: true,
        rollupProgress: true,
        showSquad: false,
        showDesigner: false,
        showStatus: true,
        showBranchCount: true,
      }
    case 2:
      return {
        allowDirectTasks: false,
        showProgress: true,
        rollupProgress: true,
        showSquad: true,
        showDesigner: false,
        showStatus: true,
        showBranchCount: true,
      }
    case 3:
      return {
        allowDirectTasks: true,
        showProgress: true,
        rollupProgress: true,
        showSquad: true,
        showDesigner: true,
        showStatus: true,
        showBranchCount: true,
      }
    case 4:
      return {
        allowDirectTasks: true,
        showProgress: true,
        rollupProgress: false,
        showSquad: true,
        showDesigner: true,
        showStatus: true,
        showBranchCount: false,
      }
  }
}

/**
 * Cấu hình kích thước mặc định (độ dài/chiều cao) của từng cấp và khoảng cách
 */
export interface IATierDimensionSettings {
  1: { width: number; height: number }
  2: { width: number; height: number }
  3: { width: number; height: number }
  4: { width: number; height: number }
  columnGap: number
  verticalGapJourney: number
  verticalGapScreen: number
}

/**
 * Cấu trúc thông tin một Sản phẩm số trên cây IA
 */
export interface IAProductInfo {
  id: string
  name: string
  code: string
  description: string
  color: string
  iconName: string
}

/**
 * Schema lưu trữ toàn bộ cây IA vào LocalStorage (Requirement R4)
 */
export interface IALocalStorageData {
  version: number
  lastUpdated: string
  trees: Record<string, IANode>
  customPositions?: Record<string, Record<string, { x: number; y: number }>>
}

/**
 * Trạng thái biến đổi tọa độ của Canvas (Pan & Zoom)
 */
export interface CanvasTransform {
  x: number
  y: number
  scale: number
}

