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
  customTag?: string      // Nhãn phân loại tùy biến người dùng tự nhập
  requestId?: string
  figmaUrl?: string
  touchpointType?: IATouchpointType
  status?: string
  progress?: number
  assignedDesigner?: string
  colorTheme?: string
  isCriticalPath?: boolean
  collapsed?: boolean
  createdAt?: string
  updatedAt?: string
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

