import { useState, useRef, useEffect, useCallback } from "react"
import JSZip from "jszip"
import { Frame, FrameHeader, FrameTitle, FrameDescription, FrameActions } from "@/components/reui/frame"
import { IconTile, IconStack } from "@/components/reui/icon-tile"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, type DropdownOption } from "@/components/reui/dropdown-menu"
import { EmptyState } from "@/components/reui/empty-state"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Dialog, DialogBody } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import {
  FileImage,
  UploadCloud,
  Download,
  Trash2,
  Sparkles,
  Layers,
  Sliders,
  FolderArchive,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  CheckCircle2,
  LayoutGrid,
  List,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingDown,
  HardDrive,
  FileCheck2,
  RefreshCw,
} from "lucide-react"

export interface OriginalImageItem {
  id: string
  file: File
  name: string
  cleanName: string
  size: number
  previewUrl: string
  isPriority: boolean
}

export interface ConvertedImageItem {
  id: string
  originalId: string
  originalName: string
  name: string
  originalSize: number
  convertedSize: number
  originalUrl: string
  dataUrl: string
  blobUrl: string
  isPriority: boolean
  reductionPercent: number
  mimeType: string
  width: number
  height: number
}

const OUTPUT_FORMAT_OPTIONS: DropdownOption[] = [
  {
    value: "image/webp",
    label: "WebP (Khuyên dùng cho Web & App MB)",
    badge: (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
        Nén tối ưu
      </span>
    ),
  },
  {
    value: "image/png",
    label: "PNG (Không nén giảm chi tiết / Giữ nền trong suốt)",
    badge: (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
        Lossless
      </span>
    ),
  },
  {
    value: "image/jpeg",
    label: "JPEG / JPG (Tự động lót nền trắng #FFF)",
    badge: (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
        Phổ thông
      </span>
    ),
  },
]

function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes || bytes <= 0) return "0 B"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function dataURLtoBlob(dataUrl: string): Blob | null {
  try {
    const arr = dataUrl.split(",")
    if (arr.length < 2) return null
    const mimeMatch = arr[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : "image/png"
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  } catch {
    return null
  }
}

export default function ImageCompressorPage() {
  // Cấu hình chuyển đổi
  const [outputFormat, setOutputFormat] = useState<string>("image/webp")
  const [quality, setQuality] = useState<number>(90)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [activeFilter, setActiveFilter] = useState<"all" | "priority" | "base">("all")

  // Danh sách tệp
  const [originalImages, setOriginalImages] = useState<OriginalImageItem[]>([])
  const [convertedImages, setConvertedImages] = useState<ConvertedImageItem[]>([])
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [isZipping, setIsZipping] = useState<boolean>(false)
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false)

  // Zoom & Comparison Modal
  const [previewItem, setPreviewItem] = useState<{
    originalUrl: string
    convertedUrl: string
    title: string
    originalSize: number
    convertedSize: number
    reduction: number
  } | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dọn dẹp URL khi unmount
  useEffect(() => {
    return () => {
      originalImages.forEach((img) => {
        try {
          URL.revokeObjectURL(img.previewUrl)
        } catch {}
      })
      convertedImages.forEach((img) => {
        try {
          if (img.blobUrl) URL.revokeObjectURL(img.blobUrl)
        } catch {}
      })
    }
  }, [originalImages, convertedImages])

  // Xử lý nạp ảnh từ input / kéo thả
  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const newFiles = Array.from(files)
    const validItems: OriginalImageItem[] = []
    let invalidCount = 0

    newFiles.forEach((file) => {
      if (file.type.match(/image\/(png|jpeg|jpg|webp)/i) || file.name.match(/\.(png|jpe?g|webp)$/i)) {
        const isPriority = file.name.toLowerCase().includes(".priority")
        const nameWithoutExt = file.name.replace(/\.(png|jpe?g|webp)$/i, "")
        const cleanName = nameWithoutExt.replace(/\.priority$/i, "")

        validItems.push({
          id: `orig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          name: file.name,
          cleanName,
          size: file.size,
          previewUrl: URL.createObjectURL(file),
          isPriority,
        })
      } else {
        invalidCount++
      }
    })

    if (invalidCount > 0) {
      toast.warning(`Đã bỏ qua ${invalidCount} tệp không phải định dạng ảnh hỗ trợ (PNG, JPG, WebP).`)
    }

    if (validItems.length > 0) {
      setOriginalImages((prev) => [...prev, ...validItems])
      toast.success(`Đã thêm ${validItems.length} ảnh vào danh sách!`)
    }
  }

  // Hỗ trợ paste trực tiếp từ clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const pastedFiles: File[] = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile()
          if (file) pastedFiles.push(file)
        }
      }

      if (pastedFiles.length > 0) {
        const dt = new DataTransfer()
        pastedFiles.forEach((f) => dt.items.add(f))
        handleAddFiles(dt.files)
        toast.info(`Đã dán ${pastedFiles.length} ảnh từ Clipboard!`)
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [])

  // Xóa ảnh gốc
  const handleRemoveOriginal = (id: string) => {
    setOriginalImages((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) {
        try {
          URL.revokeObjectURL(target.previewUrl)
        } catch {}
      }
      return prev.filter((item) => item.id !== id)
    })
    setConvertedImages((prev) => prev.filter((item) => item.originalId !== id))
  }

  // Xóa tất cả
  const handleClearAll = () => {
    originalImages.forEach((img) => {
      try {
        URL.revokeObjectURL(img.previewUrl)
      } catch {}
    })
    convertedImages.forEach((img) => {
      try {
        if (img.blobUrl) URL.revokeObjectURL(img.blobUrl)
      } catch {}
    })
    setOriginalImages([])
    setConvertedImages([])
    toast.info("Đã xóa toàn bộ danh sách ảnh.")
  }

  // Thực hiện nén & chuyển đổi ảnh
  const handleConvertAll = async () => {
    if (originalImages.length === 0) {
      toast.info("Vui lòng tải lên ít nhất một ảnh để chuyển đổi.")
      return
    }

    setIsProcessing(true)
    const toastId = toast.loading(`Đang xử lý ${originalImages.length} ảnh (${quality}%)...`)

    // Giải phóng blob url cũ
    convertedImages.forEach((img) => {
      try {
        if (img.blobUrl) URL.revokeObjectURL(img.blobUrl)
      } catch {}
    })
    setConvertedImages([])

    const processItem = (item: OriginalImageItem): Promise<ConvertedImageItem> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement("canvas")
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext("2d")
            if (!ctx) {
              reject(new Error("Canvas context error"))
              return
            }

            // Nếu chuyển sang JPEG, lót nền trắng #FFFFFF chống đen nền ảnh trong suốt
            if (outputFormat === "image/jpeg") {
              ctx.fillStyle = "#FFFFFF"
              ctx.fillRect(0, 0, canvas.width, canvas.height)
            }
            ctx.drawImage(img, 0, 0)

            try {
              const qualityRatio = quality / 100
              const dataUrl = canvas.toDataURL(outputFormat, qualityRatio)

              if (!dataUrl || dataUrl === "data:,") {
                throw new Error("Không trích xuất được dữ liệu ảnh từ canvas")
              }

              let newExt = ".webp"
              if (outputFormat === "image/png") newExt = ".png"
              if (outputFormat === "image/jpeg") newExt = ".jpg"

              const newFileName = `${item.cleanName}${newExt}`

              // Tính kích thước xấp xỉ từ base64
              const base64Content = dataUrl.split(",")[1]
              const approxSize = Math.round((base64Content.length * 3) / 4)

              const blob = dataURLtoBlob(dataUrl)
              const blobUrl = blob ? URL.createObjectURL(blob) : dataUrl

              const reduction = Math.round(((item.size - approxSize) / item.size) * 100)

              resolve({
                id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                originalId: item.id,
                originalName: item.name,
                name: newFileName,
                originalSize: item.size,
                convertedSize: approxSize,
                originalUrl: item.previewUrl,
                dataUrl,
                blobUrl,
                isPriority: item.isPriority,
                reductionPercent: reduction,
                mimeType: outputFormat,
                width: img.naturalWidth,
                height: img.naturalHeight,
              })
            } catch (canvasErr) {
              reject(canvasErr)
            }
          }
          img.onerror = () => reject(new Error(`Không thể nạp ảnh ${item.name}`))
          img.src = e.target?.result as string
        }
        reader.onerror = () => reject(new Error(`Lỗi đọc file ${item.name}`))
        reader.readAsDataURL(item.file)
      })
    }

    try {
      const results = await Promise.allSettled(originalImages.map((img) => processItem(img)))
      const successes: ConvertedImageItem[] = []
      let failureCount = 0

      results.forEach((res) => {
        if (res.status === "fulfilled") {
          successes.push(res.value)
        } else {
          failureCount++
        }
      })

      setConvertedImages(successes)

      const priorityCount = successes.filter((s) => s.isPriority).length
      const baseCount = successes.length - priorityCount

      if (failureCount === 0) {
        toast.success(
          `Đã nén xong ${successes.length} ảnh!`,
          `Gồm ${priorityCount} asset .priority và ${baseCount} asset tiêu chuẩn.`,
          { id: toastId }
        )
      } else {
        toast.warning(
          `Hoàn tất ${successes.length} ảnh, có ${failureCount} lỗi.`,
          undefined,
          { id: toastId }
        )
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Lỗi chuyển đổi: ${err.message}`, undefined, { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }

  // Tải về 1 ảnh riêng lẻ
  const handleDownloadSingle = (item: ConvertedImageItem) => {
    const a = document.createElement("a")
    a.href = item.blobUrl || item.dataUrl
    a.download = item.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success(`Đã tải xuống: ${item.name}`)
  }

  // Tải về tất cả dưới dạng ZIP có phân folder priority/ và base/
  const handleDownloadZip = async () => {
    if (convertedImages.length === 0) return
    setIsZipping(true)
    const toastId = toast.loading("Đang đóng gói file ZIP theo cấu trúc priority/ và base/...")

    try {
      const zip = new JSZip()

      convertedImages.forEach((item) => {
        const base64Data = item.dataUrl.split(",")[1]
        if (base64Data) {
          // Phân nhóm theo quy ước chuẩn của MB Bank: priority/ hoặc base/
          const folder = item.isPriority ? "priority/" : "base/"
          zip.file(`${folder}${item.name}`, base64Data, { base64: true })
        }
      })

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      })

      const downloadUrl = URL.createObjectURL(zipBlob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `MB_UX_Assets_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000)

      toast.success("Đã tải xuống file ZIP đóng gói hoàn chỉnh!", undefined, { id: toastId })
    } catch (zipErr: any) {
      console.error(zipErr)
      toast.error(`Lỗi tạo file ZIP: ${zipErr.message}`, undefined, { id: toastId })
    } finally {
      setIsZipping(false)
    }
  }

  // Drag-and-drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(true)
  }

  const handleDragLeave = () => {
    setIsDraggingOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
    if (e.dataTransfer.files) {
      handleAddFiles(e.dataTransfer.files)
    }
  }

  // Zoom modal controls
  const openCompareModal = (item: ConvertedImageItem) => {
    setPreviewItem({
      originalUrl: item.originalUrl,
      convertedUrl: item.blobUrl || item.dataUrl,
      title: item.name,
      originalSize: item.originalSize,
      convertedSize: item.convertedSize,
      reduction: item.reductionPercent,
    })
    setZoomLevel(1)
    setPanPosition({ x: 0, y: 0 })
  }

  // Tính toán số liệu thống kê
  const totalOriginalSize = originalImages.reduce((sum, i) => sum + i.size, 0)
  const totalConvertedSize = convertedImages.reduce((sum, i) => sum + i.convertedSize, 0)
  const totalSavedBytes = Math.max(0, totalOriginalSize - totalConvertedSize)
  const totalReductionPercent =
    totalOriginalSize > 0 && convertedImages.length > 0
      ? Math.round(((totalOriginalSize - totalConvertedSize) / totalOriginalSize) * 100)
      : 0

  const priorityAssetCount = originalImages.filter((i) => i.isPriority).length
  const baseAssetCount = originalImages.length - priorityAssetCount

  // Filtered converted images
  const displayedConvertedImages = convertedImages.filter((item) => {
    if (activeFilter === "priority") return item.isPriority
    if (activeFilter === "base") return !item.isPriority
    return true
  })

  return (
    <main className="w-full max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-h-screen animate-in fade-in-50 duration-200 pb-20">
      {/* 1. Header Frame */}
      <Frame variant="glass" padding="lg" className="border-slate-200/90 shadow-xs relative overflow-hidden bg-gradient-to-r from-white via-white to-blue-50/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <IconTile variant="gradient" size="xl" className="shadow-lg shadow-blue-600/20 ring-4 ring-blue-50">
              <Sparkles className="w-8 h-8 text-white" />
            </IconTile>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Chuyển đổi & Nén ảnh Đa năng
                </h1>
                <Badge variant="navy" size="default" className="font-bold text-xs uppercase tracking-wider">
                  MB UX Tool v2.1
                </Badge>
                <Badge variant="emerald" size="default" className="gap-1.5 font-semibold text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Xử lý 100% Offline • Bảo mật MB</span>
                </Badge>
              </div>
              <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                Tự động tối ưu dung lượng WebP / JPG / PNG siêu tốc ngay trên trình duyệt, không gửi file ra ngoài.
                Hỗ trợ phân nhóm thông minh quy chuẩn <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-mono font-bold text-xs">.priority</code> cho Asset App MBBank.
              </p>
            </div>
          </div>

          <FrameActions className="self-start lg:self-center gap-2.5">
            {originalImages.length > 0 && (
              <Button
                variant="outline"
                size="default"
                onClick={handleClearAll}
                className="gap-2 rounded-xl text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa trắng ({originalImages.length})</span>
              </Button>
            )}

            <Button
              variant="default"
              size="default"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 rounded-xl text-xs font-bold bg-[#1057FB] hover:bg-blue-700 text-white shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Chọn tệp ảnh</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => handleAddFiles(e.target.files)}
            />
          </FrameActions>
        </div>
      </Frame>

      {/* 2. Real-time KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Frame variant="default" padding="default" className="space-y-2 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tổng số tệp ảnh</span>
            <IconTile variant="blue" size="sm">
              <FileImage className="w-4 h-4" />
            </IconTile>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {originalImages.length}
            </span>
            <span className="text-xs font-bold text-slate-400">tệp</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {priorityAssetCount > 0 ? (
              <span className="text-amber-700 font-bold">{priorityAssetCount} tệp .priority</span>
            ) : (
              "Chưa phát hiện tệp .priority"
            )}
          </div>
        </Frame>

        {/* Metric 2 */}
        <Frame variant="default" padding="default" className="space-y-2 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Dung lượng gốc ban đầu</span>
            <IconTile variant="amber" size="sm">
              <HardDrive className="w-4 h-4" />
            </IconTile>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {formatBytes(totalOriginalSize)}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {originalImages.length > 0 ? `Trung bình ${formatBytes(totalOriginalSize / originalImages.length)} / ảnh` : "Chưa có dữ liệu"}
          </div>
        </Frame>

        {/* Metric 3 */}
        <Frame variant="default" padding="default" className="space-y-2 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Dung lượng sau khi nén</span>
            <IconTile variant="emerald" size="sm">
              <FileCheck2 className="w-4 h-4" />
            </IconTile>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">
              {convertedImages.length > 0 ? formatBytes(totalConvertedSize) : "--"}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {convertedImages.length > 0 ? `Đã nén ${convertedImages.length} / ${originalImages.length} ảnh` : "Đang chờ chuyển đổi"}
          </div>
        </Frame>

        {/* Metric 4 */}
        <Frame variant="default" padding="default" className="space-y-2 hover:border-emerald-300 transition-all bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hiệu quả tiết kiệm</span>
            <IconTile variant="emerald" size="sm">
              <TrendingDown className="w-4 h-4" />
            </IconTile>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              {convertedImages.length > 0 ? `-${totalReductionPercent}%` : "0%"}
            </span>
            {convertedImages.length > 0 && (
              <span className="text-xs font-bold text-emerald-700">
                (Giảm {formatBytes(totalSavedBytes)})
              </span>
            )}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            {convertedImages.length > 0 ? "Giúp App tải nhanh hơn gấp 3 lần" : "Chưa thực hiện nén"}
          </div>
        </Frame>
      </div>

      {/* 3. Settings & Controls Frame */}
      <Frame variant="default" padding="lg" className="space-y-6">
        <FrameHeader className="border-b border-slate-100 pb-3 mb-0">
          <div>
            <FrameTitle className="text-base text-slate-900">
              <Sliders className="w-4 h-4 text-[#1057FB]" />
              <span>Thiết lập chất lượng & Định dạng đầu ra</span>
            </FrameTitle>
            <FrameDescription>
              Tùy chỉnh độ nén phù hợp với mục đích sử dụng trên Mobile App hoặc Web Portal.
            </FrameDescription>
          </div>
        </FrameHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Output Format Column (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1057FB]" />
              <span>Định dạng hình ảnh đích:</span>
            </label>

            <DropdownMenu
              options={OUTPUT_FORMAT_OPTIONS}
              value={outputFormat}
              onChange={setOutputFormat}
              className="w-full"
            />

            {/* Quick selection pill buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOutputFormat("image/webp")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  outputFormat === "image/webp"
                    ? "border-[#1057FB] bg-blue-50/80 text-[#1057FB] font-bold ring-2 ring-blue-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium"
                }`}
              >
                <div className="text-xs font-bold">WebP</div>
                <div className="text-[10px] text-slate-500 truncate">Nhẹ nhất cho App</div>
              </button>

              <button
                type="button"
                onClick={() => setOutputFormat("image/png")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  outputFormat === "image/png"
                    ? "border-[#1057FB] bg-blue-50/80 text-[#1057FB] font-bold ring-2 ring-blue-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium"
                }`}
              >
                <div className="text-xs font-bold">PNG</div>
                <div className="text-[10px] text-slate-500 truncate">Giữ trong suốt</div>
              </button>

              <button
                type="button"
                onClick={() => setOutputFormat("image/jpeg")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  outputFormat === "image/jpeg"
                    ? "border-[#1057FB] bg-blue-50/80 text-[#1057FB] font-bold ring-2 ring-blue-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium"
                }`}
              >
                <div className="text-xs font-bold">JPEG</div>
                <div className="text-[10px] text-slate-500 truncate">Nền trắng #FFF</div>
              </button>
            </div>
          </div>

          {/* Quality Slider Column (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Chất lượng nén ảnh:</span>
              </label>
              <Badge variant="navy" size="default" className="font-extrabold text-xs px-2.5 py-0.5">
                {quality}%
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-[#1057FB] cursor-pointer h-2 bg-slate-200 rounded-lg"
              />

              {/* Slider checkpoints */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <button
                  type="button"
                  onClick={() => setQuality(30)}
                  className={`hover:text-blue-600 transition-colors ${quality === 30 ? "text-[#1057FB] font-bold" : ""}`}
                >
                  Siêu nhẹ (30%)
                </button>
                <button
                  type="button"
                  onClick={() => setQuality(75)}
                  className={`hover:text-blue-600 transition-colors ${quality === 75 ? "text-[#1057FB] font-bold" : ""}`}
                >
                  Chuẩn Web (75%)
                </button>
                <button
                  type="button"
                  onClick={() => setQuality(90)}
                  className={`hover:text-blue-600 transition-colors ${quality === 90 ? "text-[#1057FB] font-bold" : ""}`}
                >
                  Khuyên dùng (90%)
                </button>
                <button
                  type="button"
                  onClick={() => setQuality(100)}
                  className={`hover:text-blue-600 transition-colors ${quality === 100 ? "text-[#1057FB] font-bold" : ""}`}
                >
                  Tối đa (100%)
                </button>
              </div>
            </div>

            {/* Quy chuẩn MB Bank Note */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-900">
              <span className="font-bold shrink-0">💡 Quy chuẩn MB:</span>
              <span>
                Các tệp chứa hậu tố <code className="font-bold text-[#1057FB]">.priority</code> (ví dụ: <code className="font-mono">banner_home.priority.png</code>) sẽ được tự động tách vào thư mục <code className="font-mono font-bold">priority/</code> khi xuất ZIP cho đội Dev Mobile.
              </span>
            </div>
          </div>
        </div>
      </Frame>

      {/* 4. Dropzone & Action Bar */}
      <Frame
        variant="dashed"
        padding="lg"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer transition-all duration-200 text-center space-y-4 ${
          isDraggingOver
            ? "border-[#1057FB] bg-blue-50/70 scale-[1.005] ring-4 ring-blue-100"
            : "hover:bg-slate-50/70 hover:border-slate-300"
        }`}
      >
        <div className="flex justify-center">
          <IconStack className="bg-blue-50 border-blue-200 text-[#1057FB]">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </IconStack>
        </div>

        <div className="space-y-1">
          <p className="text-base font-bold text-slate-900">
            Nhấp vào đây để chọn tệp, hoặc kéo và thả hình ảnh vào khu vực này
          </p>
          <p className="text-xs text-slate-500">
            Hỗ trợ PNG, JPG, JPEG, WebP • Hỗ trợ dán (Ctrl + V) từ Clipboard • Không giới hạn số lượng ảnh
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant="navy" size="xs">
            PNG
          </Badge>
          <Badge variant="navy" size="xs">
            JPG
          </Badge>
          <Badge variant="navy" size="xs">
            WebP
          </Badge>
          <Badge variant="amber" size="xs">
            .priority Auto-Tag
          </Badge>
        </div>
      </Frame>

      {/* 5. Primary Action Toolbar */}
      {originalImages.length > 0 && (
        <Frame variant="glass" padding="default" className="sticky top-4 z-20 border-slate-200/90 shadow-md backdrop-blur-md bg-white/95">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="default"
                size="default"
                onClick={handleConvertAll}
                disabled={isProcessing}
                className="gap-2 rounded-xl font-bold text-xs h-10 px-5 bg-[#1057FB] hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang nén {originalImages.length} ảnh...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Chuyển đổi & Nén {originalImages.length} ảnh</span>
                  </>
                )}
              </Button>

              {convertedImages.length > 0 && (
                <Button
                  variant="teal"
                  size="default"
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="gap-2 rounded-xl font-bold text-xs h-10 px-5 shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>
                    {isZipping ? "Đang đóng gói ZIP..." : `Tải xuống tất cả (ZIP - ${convertedImages.length} ảnh)`}
                  </span>
                </Button>
              )}
            </div>

            {/* View Mode & Filter Controls */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              {/* Category Filter */}
              {convertedImages.length > 0 && (
                <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveFilter("all")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      activeFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tất cả ({convertedImages.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("priority")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      activeFilter === "priority" ? "bg-white text-amber-800 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Priority ({convertedImages.filter((c) => c.isPriority).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("base")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      activeFilter === "base" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Base ({convertedImages.filter((c) => !c.isPriority).length})
                  </button>
                </div>
              )}

              {/* Grid / Table switch */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Xem dạng lưới (Cards)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Xem dạng bảng (Table)"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </Frame>
      )}

      {/* 6. Results Section */}
      {originalImages.length === 0 ? (
        <EmptyState
          icon={FileImage}
          title="Chưa có hình ảnh nào được tải lên"
          description="Kéo thả hoặc nhấp nút 'Chọn tệp ảnh' phía trên để bắt đầu chuyển đổi và nén tối ưu."
          action={
            <Button
              variant="outline"
              size="default"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 rounded-xl text-xs font-bold"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Nạp ảnh ngay</span>
            </Button>
          }
        />
      ) : convertedImages.length === 0 ? (
        // Hiển thị danh sách ảnh gốc đã nạp, chờ bấm nén
        <Frame variant="default" padding="lg" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Danh sách {originalImages.length} ảnh đã nạp (Chờ xử lý)
              </h3>
              <p className="text-xs text-slate-500">
                Bấm nút "Chuyển đổi & Nén ảnh" phía trên để tạo bản nén tối ưu.
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleConvertAll}
              className="gap-1.5 rounded-xl text-xs font-bold bg-[#1057FB] text-white"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bắt đầu nén ngay</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {originalImages.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50 hover:border-blue-400 hover:shadow-md transition-all flex flex-col"
              >
                <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                  {img.isPriority && (
                    <Badge variant="amber" size="xs" className="absolute top-2 left-2 shadow-xs">
                      .priority
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveOriginal(img.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 shadow-sm"
                    title="Xóa ảnh này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-2.5 space-y-1 flex-1 flex flex-col justify-between">
                  <p className="text-xs font-bold text-slate-800 truncate" title={img.name}>
                    {img.name}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 font-semibold">
                    {formatBytes(img.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Frame>
      ) : (
        // Hiển thị kết quả sau khi nén
        <Frame variant="default" padding="lg" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Kết quả nén ({displayedConvertedImages.length} tệp)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Toàn bộ ảnh đã được nén tối ưu. Bạn có thể xem phóng to so sánh Before/After hoặc tải lẻ từng tệp.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadZip}
              className="gap-1.5 rounded-xl text-xs font-bold text-[#0D9B97] border-[#0D9B97]/30 hover:bg-teal-50"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Tải gói ZIP hoàn chỉnh</span>
            </Button>
          </div>

          {viewMode === "grid" ? (
            // GRID VIEW
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedConvertedImages.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 overflow-hidden bg-white hover:border-[#1057FB] hover:shadow-md transition-all flex flex-col group"
                >
                  <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center p-3 border-b border-slate-100">
                    <img
                      src={item.blobUrl || item.dataUrl}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />

                    {/* Priority badge */}
                    {item.isPriority && (
                      <Badge variant="amber" size="xs" className="absolute top-2.5 left-2.5 shadow-xs font-bold">
                        priority/
                      </Badge>
                    )}

                    {/* Reduction badge */}
                    <Badge
                      variant={item.reductionPercent > 0 ? "emerald" : "navy"}
                      size="xs"
                      className="absolute top-2.5 right-2.5 shadow-xs font-extrabold"
                    >
                      {item.reductionPercent > 0 ? `-${item.reductionPercent}%` : "0%"}
                    </Badge>

                    {/* Quick action buttons overlay */}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                      <button
                        type="button"
                        onClick={() => openCompareModal(item)}
                        className="w-9 h-9 rounded-xl bg-white text-slate-800 flex items-center justify-center hover:bg-slate-100 shadow-md transition-transform hover:scale-105"
                        title="Xem so sánh phóng to"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(item)}
                        className="w-9 h-9 rounded-xl bg-[#1057FB] text-white flex items-center justify-center hover:bg-blue-700 shadow-md transition-transform hover:scale-105"
                        title="Tải ảnh này về"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate" title={item.originalName}>
                        Gốc: {item.originalName}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <div className="font-mono text-slate-400 line-through text-[11px]">
                        {formatBytes(item.originalSize)}
                      </div>
                      <div className="font-mono text-emerald-700 font-bold text-xs">
                        {formatBytes(item.convertedSize)}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadSingle(item)}
                      className="w-full gap-1.5 rounded-xl text-xs font-bold h-8 border-slate-200 hover:border-[#1057FB] hover:text-[#1057FB]"
                    >
                      <Download className="w-3 h-3" />
                      <span>Tải ảnh</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // TABLE VIEW
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="w-14">Xem</TableHead>
                    <TableHead>Tên tệp xuất</TableHead>
                    <TableHead>Tên tệp gốc</TableHead>
                    <TableHead className="text-right">Dung lượng gốc</TableHead>
                    <TableHead className="text-right">Sau nén</TableHead>
                    <TableHead className="text-center">Giảm tải</TableHead>
                    <TableHead className="text-center">Thư mục ZIP</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedConvertedImages.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/60">
                      <TableCell>
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 p-0.5 flex items-center justify-center">
                          <img
                            src={item.blobUrl || item.dataUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-xs text-slate-900 font-mono">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {item.originalName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-400 line-through">
                        {formatBytes(item.originalSize)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-700">
                        {formatBytes(item.convertedSize)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={item.reductionPercent > 0 ? "emerald" : "navy"}
                          size="xs"
                          className="font-extrabold"
                        >
                          -{item.reductionPercent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.isPriority ? (
                          <Badge variant="amber" size="xs">
                            priority/
                          </Badge>
                        ) : (
                          <Badge variant="navy" size="xs">
                            base/
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCompareModal(item)}
                          className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-slate-900"
                          title="So sánh Before/After"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadSingle(item)}
                          className="h-8 px-2.5 rounded-lg text-xs font-bold text-[#1057FB] border-blue-200 hover:bg-blue-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Frame>
      )}

      {/* 7. Zoom & Comparison Modal */}
      {previewItem && (
        <Dialog open={Boolean(previewItem)} onClose={() => setPreviewItem(null)} size="2xl">
          <DialogBody className="p-0 bg-white rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <IconTile variant="teal" size="sm">
                  <Eye className="w-4 h-4" />
                </IconTile>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">
                    So sánh chi tiết: {previewItem.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gốc: {formatBytes(previewItem.originalSize)} ➔ Sau nén: {formatBytes(previewItem.convertedSize)} (Tiết kiệm -{previewItem.reduction}%)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                  className="w-8 h-8 p-0 rounded-lg"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs font-mono font-bold text-slate-600 w-12 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                  className="w-8 h-8 p-0 rounded-lg"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setZoomLevel(1)
                    setPanPosition({ x: 0, y: 0 })
                  }}
                  className="text-xs font-semibold rounded-lg px-2 h-8"
                >
                  Reset
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-auto flex-1 bg-slate-100/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Original Image */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Ảnh gốc (Original)</span>
                    <Badge variant="navy" size="xs">
                      {formatBytes(previewItem.originalSize)}
                    </Badge>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 aspect-square flex items-center justify-center overflow-hidden">
                    <img
                      src={previewItem.originalUrl}
                      alt="Original"
                      style={{ transform: `scale(${zoomLevel})` }}
                      className="max-h-full max-w-full object-contain transition-transform"
                    />
                  </div>
                </div>

                {/* Compressed Image */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="text-emerald-700 font-bold">Ảnh sau nén (Compressed)</span>
                    <Badge variant="emerald" size="xs">
                      {formatBytes(previewItem.convertedSize)} (-{previewItem.reduction}%)
                    </Badge>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-white p-3 aspect-square flex items-center justify-center overflow-hidden">
                    <img
                      src={previewItem.convertedUrl}
                      alt="Compressed"
                      style={{ transform: `scale(${zoomLevel})` }}
                      className="max-h-full max-w-full object-contain transition-transform"
                    />
                  </div>
                </div>
              </div>
            </div>
          </DialogBody>
        </Dialog>
      )}
    </main>
  )
}
