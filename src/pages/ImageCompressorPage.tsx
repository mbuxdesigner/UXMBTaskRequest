import { useState, useRef, useEffect, useCallback } from "react"
import JSZip from "jszip"
import { Frame, FrameHeader, FrameTitle, FrameDescription, FrameActions } from "@/components/reui/frame"
import { IconTile } from "@/components/reui/icon-tile"
import { IconStackLarge } from "@/components/reui/c-icon-stack-2"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, type DropdownOption } from "@/components/reui/dropdown-menu"
import { EmptyState } from "@/components/reui/empty-state"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Dialog, DialogBody } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import PageHeader from "@/components/common/PageHeader"
import { cn } from "@/lib/utils"
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
  Plus,
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
    <main id="main-content" tabIndex={-1} className="w-full space-y-6 animate-in fade-in-50 duration-200 pb-8 outline-none">
      {/* 1. Page Header Chuẩn ReUI */}
      <PageHeader
        breadcrumb={{
          parent: "MBBank UX Platform",
          current: "Nén & Tối ưu ảnh",
        }}
        title="Nén & Tối ưu ảnh"
        subtitle="Công cụ tối ưu dung lượng WebP / JPG / PNG siêu tốc ngay trên trình duyệt, không gửi dữ liệu ra ngoài."
        actions={
          originalImages.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              aria-label={`Xóa tất cả ${originalImages.length} ảnh`}
              className="gap-1.5 font-medium text-rose-600 border-slate-200 hover:bg-rose-50/50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả ({originalImages.length})</span>
            </Button>
          ) : undefined
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        aria-label="Tải ảnh lên để nén"
        onChange={(e) => handleAddFiles(e.target.files)}
      />

      {/* 2. Khung Tải Lên (ReUI c-file-upload-10 khi chưa có ảnh & c-file-upload-3 khi đã có ảnh) */}
      {originalImages.length === 0 ? (
        /* PATTERN c-file-upload-10: Khung lớn chuẩn tỷ lệ màn hình (Aspect 21:9) */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-full transition-all duration-200 relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 text-center cursor-pointer min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] aspect-[21/9] bg-white hover:bg-slate-50/50 border-slate-200/90 hover:border-slate-300 shadow-2xs group select-none",
            isDraggingOver && "border-[#1B3A6B] bg-slate-50 ring-4 ring-[#1B3A6B]/10"
          )}
        >
          {/* ReUI c-icon-stack-2 Large Illustration */}
          <div className="mb-4 pointer-events-none flex items-center justify-center">
            <IconStackLarge />
          </div>

          <div className="space-y-1.5 max-w-lg mx-auto pointer-events-none">
            <p className="text-base sm:text-lg font-medium text-slate-900 tracking-tight">
              Drag and drop an image, or{" "}
              <span className="text-[#1057FB] underline underline-offset-4 font-semibold hover:text-[#1B3A6B] transition-colors">
                Browse
              </span>
            </p>
            <p className="text-xs text-slate-500 font-normal">
              Hỗ trợ PNG, JPG, JPEG, WebP • Dán trực tiếp (Ctrl + V) từ Clipboard • Không giới hạn số lượng ảnh
            </p>
          </div>

          {/* Guidelines Bullets 2 Cột (Chuẩn ReUI Cover Upload Guidelines) */}
          <div className="mt-8 pt-6 border-t border-slate-100 w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-left text-xs text-slate-500 pointer-events-none">
            <div className="space-y-1.5">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span>High resolution images (png, jpg, webp)</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span>Tự động nhận diện thẻ <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[11px]">.priority</code></span>
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span>Nén ảnh hàng loạt & tải ZIP nhanh</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span>100% Offline, bảo mật an toàn MB</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* PATTERN c-file-upload-3: Khung nhỏ gọn khi đã có ảnh với dải thumbnails xem trước */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border border-dashed rounded-2xl p-3 sm:p-3.5 flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white transition-all shadow-2xs",
            isDraggingOver
              ? "border-[#1B3A6B] bg-slate-50 ring-4 ring-[#1B3A6B]/10"
              : "border-slate-200/90 hover:border-slate-300"
          )}
        >
          {/* Nút Thêm Ảnh */}
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            className={cn(
              "h-10 px-3.5 text-xs font-semibold gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shrink-0 cursor-pointer shadow-2xs",
              isDraggingOver && "animate-bounce"
            )}
          >
            <Plus className="w-4 h-4" />
            <span>Thêm ảnh</span>
          </Button>

          {/* Dải ảnh Thumbnail xem trước */}
          <div className="flex-1 flex items-center gap-2.5 overflow-x-auto py-2.5 px-2 scrollbar-thin min-w-0">
            {originalImages.map((img) => (
              <div key={img.id} className="group/item relative shrink-0">
                <img
                  src={img.previewUrl}
                  alt={img.name}
                  className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl border border-slate-200/90 object-cover shadow-2xs transition-transform group-hover/item:scale-105"
                  title={`${img.name} (${formatBytes(img.size)})`}
                />
                {img.isPriority && (
                  <span
                    className="absolute bottom-1 left-1 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-xs z-10"
                    title="Thẻ .priority"
                  >
                    ★
                  </span>
                )}
                {/* Nút Xóa nhanh từng ảnh */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveOriginal(img.id)
                  }}
                  className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full bg-slate-900/90 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-sm cursor-pointer z-20 hover:scale-110"
                  title={`Xóa ${img.name}`}
                >
                  <X className="w-2.5 h-2.5 stroke-[2.5]" />
                </button>
              </div>
            ))}
          </div>

          {/* Thông tin số lượng & Nút Xóa */}
          <div className="text-xs text-slate-500 font-medium shrink-0 pl-3 border-l border-slate-100 flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5">
              <span className="font-semibold text-slate-900">{originalImages.length}</span>
              <span>ảnh đã nạp</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-400">Kéo thả thêm hoặc dán Ctrl+V</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleClearAll}
              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-2.5 rounded-lg text-xs gap-1.5 cursor-pointer font-medium border border-transparent hover:border-rose-200 transition-all"
              title="Xóa tất cả ảnh đã nạp"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tất cả</span>
            </Button>
          </div>
        </div>
      )}



      {/* Khi đã có ảnh: Giao diện 2 cột chuẩn ReUI Receipt 5 (Ảnh đã nén 1 bên - Setting 1 bên) */}
      {originalImages.length > 0 && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* CỘT TRÁI: THIẾT LẬP (SETTING) & SUMMARY PHONG CÁCH RECEIPT-5 */}
            <div className="w-full lg:w-[380px] xl:w-[400px] shrink-0 p-6 bg-slate-50/50 flex flex-col justify-between">
              <div className="space-y-5">
                {/* Header card: Icon + Status badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-[#1B3A6B]">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Thiết lập xuất file</h2>
                      <p className="text-[11px] text-slate-500 font-normal">Cấu hình nén thời gian thực</p>
                    </div>
                  </div>
                  <Badge
                    variant={convertedImages.length > 0 ? "success" : "secondary"}
                    size="sm"
                    className="font-medium"
                  >
                    {convertedImages.length > 0 ? "Đã nén tối ưu" : "Chờ nén"}
                  </Badge>
                </div>

                {/* Hero Savings / Size Metric Display */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    {convertedImages.length > 0 ? "Mức độ giảm tải" : "Tổng dung lượng gốc"}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-slate-900">
                      {convertedImages.length > 0 ? `-${totalReductionPercent}%` : formatBytes(totalOriginalSize)}
                    </span>
                    {convertedImages.length > 0 && (
                      <span className="text-xs font-semibold text-emerald-600">
                        (-{formatBytes(totalSavedBytes)})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-normal pt-0.5">
                    {convertedImages.length > 0 ? (
                      <span>
                        Từ <strong className="text-slate-700 font-medium">{formatBytes(totalOriginalSize)}</strong> còn <strong className="text-emerald-700 font-medium">{formatBytes(totalConvertedSize)}</strong>
                      </span>
                    ) : (
                      <span>Đã nạp {originalImages.length} tệp ảnh sẵn sàng xử lý</span>
                    )}
                  </div>
                </div>

                {/* Phân cách */}
                <div className="border-t border-slate-200/80" />

                {/* Cấu hình Định dạng ảnh */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Định dạng chuyển đổi</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { format: "image/webp", label: "WebP", desc: "Tối ưu nhất" },
                      { format: "image/png", label: "PNG", desc: "Trong suốt" },
                      { format: "image/jpeg", label: "JPG", desc: "Nền trắng" },
                    ].map((item) => {
                      const active = outputFormat === item.format
                      return (
                        <button
                          key={item.format}
                          type="button"
                          onClick={() => setOutputFormat(item.format)}
                          className={cn(
                            "py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer",
                            active
                              ? "border-[#1B3A6B] bg-[#1B3A6B]/10 text-[#1B3A6B] ring-1 ring-[#1B3A6B]/30 shadow-2xs font-semibold"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium"
                          )}
                        >
                          <div className="text-xs">{item.label}</div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5 font-normal">{item.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Cấu hình Chất lượng nén */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Chất lượng nén</span>
                    </label>
                    <Badge variant="secondary" size="xs" className="font-mono font-semibold text-slate-800">
                      {quality}%
                    </Badge>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-[#1B3A6B] cursor-pointer h-1.5 bg-slate-200 rounded-full"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    {[
                      { val: 30, label: "30%" },
                      { val: 75, label: "75%" },
                      { val: 90, label: "90% (Khuyên dùng)" },
                      { val: 100, label: "100%" },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setQuality(preset.val)}
                        className={cn(
                          "transition-colors cursor-pointer hover:text-slate-900 text-xs",
                          quality === preset.val ? "text-[#1B3A6B] font-semibold" : "text-slate-500 font-normal"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phân cách */}
                <div className="border-t border-slate-200/80" />

                {/* Receipt Specs Breakdown */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-500">Tệp .priority</span>
                    <span className="font-medium text-slate-900">
                      {priorityAssetCount > 0 ? (
                        <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono text-[11px]">
                          {priorityAssetCount} tệp → priority/
                        </span>
                      ) : (
                        "Tự động gom nhóm"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-500">Thuật toán xử lý</span>
                    <span className="font-medium text-slate-900">Canvas 100% Offline</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-500">Bảo mật dữ liệu</span>
                    <span className="font-medium text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Nội bộ MB Bank
                    </span>
                  </div>
                </div>
              </div>

              {/* Nút Thực thi chính cột Settings */}
              <div className="pt-6 mt-6 border-t border-slate-200/80">
                <Button
                  variant="default"
                  size="default"
                  onClick={handleConvertAll}
                  disabled={isProcessing}
                  className="w-full justify-center gap-2 font-medium shadow-2xs h-10 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang nén {originalImages.length} ảnh...</span>
                    </>
                  ) : convertedImages.length > 0 ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Nén lại ({originalImages.length} ảnh)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Bắt đầu nén ({originalImages.length} ảnh)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* CỘT PHẢI: ẢNH ĐÃ NÉN (RECEIPT-5 ITEMS & BREAKDOWN) */}
            <div className="flex-1 p-6 flex flex-col justify-between space-y-6 bg-white">
              <div className="space-y-4">
                {/* Header cột phải: Title, Filter Pills, View Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {convertedImages.length > 0 ? "Danh sách ảnh đã nén" : "Danh sách ảnh chờ nén"}
                    </h3>
                    <Badge variant="secondary" size="xs" className="font-mono font-medium">
                      {convertedImages.length > 0 ? displayedConvertedImages.length : originalImages.length}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {convertedImages.length > 0 && (
                      <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setActiveFilter("all")}
                          className={cn(
                            "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                            activeFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          Tất cả ({convertedImages.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveFilter("priority")}
                          className={cn(
                            "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                            activeFilter === "priority" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          Priority ({convertedImages.filter((c) => c.isPriority).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveFilter("base")}
                          className={cn(
                            "px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer",
                            activeFilter === "base" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          Base ({convertedImages.filter((c) => !c.isPriority).length})
                        </button>
                      </div>
                    )}

                    <div className="flex items-center rounded-xl bg-slate-100 p-0.5">
                      <button
                        type="button"
                        onClick={() => setViewMode("table")}
                        className={cn(
                          "p-1.5 rounded-lg transition-all cursor-pointer",
                          viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                        )}
                        title="Xem dạng danh sách (Receipt Items)"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("grid")}
                        className={cn(
                          "p-1.5 rounded-lg transition-all cursor-pointer",
                          viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                        )}
                        title="Xem dạng lưới (Cards)"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* DANH SÁCH ẢNH */}
                {convertedImages.length === 0 ? (
                  /* Trạng thái chờ nén */
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#1B3A6B]" />
                        <span>Đã nạp {originalImages.length} ảnh. Bấm "Bắt đầu nén" ở cột thiết lập bên trái để tối ưu.</span>
                      </div>
                      <Button
                        variant="default"
                        size="xs"
                        onClick={handleConvertAll}
                        className="font-medium cursor-pointer"
                      >
                        Nén ngay
                      </Button>
                    </div>

                    {viewMode === "table" ? (
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden max-h-[460px] overflow-y-auto">
                        {originalImages.map((img) => (
                          <div key={img.id} className="flex items-center justify-between p-3 hover:bg-slate-50/60 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-lg bg-slate-100 overflow-hidden border border-slate-200/80 p-0.5 flex items-center justify-center shrink-0">
                                <img src={img.previewUrl} alt={img.name} className="max-h-full max-w-full object-contain rounded" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-900 truncate" title={img.name}>{img.name}</span>
                                  {img.isPriority && (
                                    <Badge variant="warning" size="xs">.priority</Badge>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-slate-500">{formatBytes(img.size)}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveOriginal(img.id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Xóa ảnh này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
                        {originalImages.map((img) => (
                          <div
                            key={img.id}
                            className="rounded-xl border border-slate-200/80 overflow-hidden bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col group"
                          >
                            <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center p-3 border-b border-slate-100">
                              <img
                                src={img.previewUrl}
                                alt={img.name}
                                className="max-h-full max-w-full object-contain rounded-md"
                              />
                              {img.isPriority && (
                                <Badge variant="warning" size="xs" className="absolute top-2.5 left-2.5 shadow-2xs font-medium">
                                  .priority
                                </Badge>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveOriginal(img.id)}
                                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-white/90 text-slate-500 hover:text-rose-600 hover:bg-white flex items-center justify-center shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Xóa ảnh này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="p-3 space-y-1">
                              <p className="text-xs font-semibold text-slate-900 truncate" title={img.name}>
                                {img.name}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500">
                                {formatBytes(img.size)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : viewMode === "table" ? (
                  /* Itemized Rows chuẩn Receipt 5 */
                  <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                    {displayedConvertedImages.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-3 px-2 hover:bg-slate-50/70 rounded-xl transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-200/80 p-0.5 flex items-center justify-center shrink-0">
                            <img
                              src={item.blobUrl || item.dataUrl}
                              alt={item.name}
                              className="max-h-full max-w-full object-contain rounded-lg"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900 truncate" title={item.name}>
                                {item.name}
                              </span>
                              {item.isPriority ? (
                                <Badge variant="warning" size="xs">priority/</Badge>
                              ) : (
                                <Badge variant="secondary" size="xs">base/</Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-mono truncate">
                              <span className="text-slate-400 truncate">Gốc: {item.originalName}</span>
                              <span>•</span>
                              <span className="text-slate-400 line-through">{formatBytes(item.originalSize)}</span>
                              <span>→</span>
                              <span className="text-emerald-700 font-semibold">{formatBytes(item.convertedSize)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Badges & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={item.reductionPercent > 0 ? "success" : "secondary"}
                            size="xs"
                            className="font-semibold"
                          >
                            {item.reductionPercent > 0 ? `-${item.reductionPercent}%` : "0%"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => openCompareModal(item)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 cursor-pointer"
                            title="So sánh Before/After"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleDownloadSingle(item)}
                            className="h-8 px-2.5 text-xs font-medium text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                            title="Tải ảnh này"
                          >
                            <Download className="w-3 h-3 mr-1 text-slate-500" />
                            <span>Tải</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleRemoveOriginal(item.originalId)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Xóa tệp này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Grid Card View */
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                    {displayedConvertedImages.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200/80 overflow-hidden bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col group"
                      >
                        <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center p-3 border-b border-slate-100">
                          <img
                            src={item.blobUrl || item.dataUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain rounded-md"
                          />

                          {item.isPriority && (
                            <Badge variant="warning" size="xs" className="absolute top-2.5 left-2.5 shadow-2xs font-medium">
                              priority/
                            </Badge>
                          )}

                          <Badge
                            variant={item.reductionPercent > 0 ? "success" : "secondary"}
                            size="xs"
                            className="absolute top-2.5 right-2.5 shadow-2xs font-medium"
                          >
                            {item.reductionPercent > 0 ? `-${item.reductionPercent}%` : "0%"}
                          </Badge>

                          {/* Quick action buttons overlay */}
                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                            <button
                              type="button"
                              onClick={() => openCompareModal(item)}
                              className="w-8 h-8 rounded-lg bg-white text-slate-800 flex items-center justify-center hover:bg-slate-100 shadow-2xs transition-transform hover:scale-105 cursor-pointer"
                              title="Xem so sánh Before/After"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadSingle(item)}
                              className="w-8 h-8 rounded-lg bg-[#1B3A6B] text-white flex items-center justify-center hover:bg-[#152e54] shadow-2xs transition-transform hover:scale-105 cursor-pointer"
                              title="Tải ảnh này"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-900 truncate" title={item.name}>
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate" title={item.originalName}>
                              Gốc: {item.originalName}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-mono">
                            <span className="text-slate-400 line-through text-[11px]">
                              {formatBytes(item.originalSize)}
                            </span>
                            <span className="text-emerald-700 font-semibold text-xs">
                              {formatBytes(item.convertedSize)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleDownloadSingle(item)}
                              className="flex-1 justify-center gap-1 font-medium text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                            >
                              <Download className="w-3 h-3 text-slate-500" />
                              <span>Tải tệp</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleRemoveOriginal(item.originalId)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Xóa tệp này"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RECEIPT-5 STATEMENT BREAKDOWN TABLE / SUMMARY */}
              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Tổng dung lượng ban đầu</span>
                  <span className="font-mono text-slate-700 font-medium">{formatBytes(totalOriginalSize)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Dung lượng sau khi nén</span>
                  <span className="font-mono text-slate-700 font-medium">
                    {convertedImages.length > 0 ? formatBytes(totalConvertedSize) : "--"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-emerald-700 font-medium">
                  <span>Mức dung lượng tiết kiệm</span>
                  <span className="font-mono font-semibold">
                    {convertedImages.length > 0 ? `-${formatBytes(totalSavedBytes)} (-${totalReductionPercent}%)` : "--"}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm font-semibold text-slate-900">
                  <span>Tổng kích thước tải về (ZIP)</span>
                  <span className="font-mono text-[#1B3A6B]">
                    {convertedImages.length > 0 ? formatBytes(totalConvertedSize) : formatBytes(totalOriginalSize)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DƯỚI BOX: THANH HÀNH ĐỘNG PHỤ CHUẨN RECEIPT-5 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="w-full sm:w-auto text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Xóa toàn bộ danh sách ({originalImages.length})</span>
            </Button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleConvertAll}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isProcessing && "animate-spin")} />
                <span>Nén lại</span>
              </Button>
              {convertedImages.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="flex-1 sm:flex-initial font-medium cursor-pointer"
                >
                  <FolderArchive className="w-3.5 h-3.5 mr-1.5" />
                  <span>
                    {isZipping ? "Đang nén ZIP..." : `Tải toàn bộ file ZIP (${convertedImages.length} ảnh)`}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Zoom & Comparison Modal */}
      {previewItem && (
        <Dialog open={Boolean(previewItem)} onClose={() => setPreviewItem(null)} size="2xl">
          <DialogBody className="p-0 bg-white rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-700">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 truncate max-w-md">
                    So sánh: {previewItem.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Gốc: {formatBytes(previewItem.originalSize)} ➔ Sau nén: {formatBytes(previewItem.convertedSize)} (Tiết kiệm -{previewItem.reduction}%)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                  className="w-7 h-7 p-0"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs font-mono font-medium text-slate-600 w-10 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setZoomLevel((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                  className="w-7 h-7 p-0"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setZoomLevel(1)
                    setPanPosition({ x: 0, y: 0 })
                  }}
                  className="text-xs font-medium px-2 h-7"
                >
                  Reset
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-auto flex-1 bg-slate-100/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                {/* Original Image */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span>Ảnh gốc (Original)</span>
                    <Badge variant="secondary" size="xs">
                      {formatBytes(previewItem.originalSize)}
                    </Badge>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 aspect-square flex items-center justify-center overflow-hidden">
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
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span className="text-emerald-700 font-semibold">Ảnh sau nén (Compressed)</span>
                    <Badge variant="success" size="xs">
                      {formatBytes(previewItem.convertedSize)} (-{previewItem.reduction}%)
                    </Badge>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 aspect-square flex items-center justify-center overflow-hidden">
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
