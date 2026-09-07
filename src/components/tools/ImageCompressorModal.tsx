import { useState, useRef, useEffect, useCallback } from "react"
import JSZip from "jszip"
import { Dialog, DialogBody } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { DropdownMenu, type DropdownOption } from "@/components/reui/dropdown-menu"
import {
  FileImage,
  UploadCloud,
  Download,
  Sliders,
  Trash2,
  CheckCircle2,
  Sparkles,
  X,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FolderArchive,
  Eye,
  RefreshCw,
  Layers,
  AlertCircle,
  FileCheck,
  Check,
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

interface ImageCompressorModalProps {
  open: boolean
  onClose: () => void
}

const OUTPUT_FORMAT_OPTIONS: DropdownOption[] = [
  {
    value: "image/webp",
    label: "WebP (Khuyên dùng cho Web & App)",
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
        Nén tối ưu
      </span>
    ),
  },
  {
    value: "image/png",
    label: "PNG (Không nén giảm chi tiết / Giữ trong suốt)",
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
        Lossless
      </span>
    ),
  },
  {
    value: "image/jpeg",
    label: "JPEG / JPG (Tự động lót nền trắng)",
    badge: (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
        Phổ biến
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

export default function ImageCompressorModal({ open, onClose }: ImageCompressorModalProps) {
  // Cấu hình chuyển đổi
  const [outputFormat, setOutputFormat] = useState<string>("image/webp")
  const [quality, setQuality] = useState<number>(90)

  // Danh sách tệp
  const [originalImages, setOriginalImages] = useState<OriginalImageItem[]>([])
  const [convertedImages, setConvertedImages] = useState<ConvertedImageItem[]>([])
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [isZipping, setIsZipping] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"converted" | "original">("converted")

  // Modal Preview chi tiết (Zoom & Pan)
  const [previewModalImg, setPreviewModalImg] = useState<{ src: string; title: string } | null>(null)
  const [currentZoom, setCurrentZoom] = useState<number>(1)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })
  const modalContainerRef = useRef<HTMLDivElement>(null)
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
      if (file.type.match(/image\/(png|jpeg|jpg|webp)/i)) {
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
      toast.warning(`Đã bỏ qua ${invalidCount} tệp không đúng định dạng ảnh hỗ trợ.`)
    }

    if (validItems.length > 0) {
      setOriginalImages((prev) => [...prev, ...validItems])
      setStatusMessage(`Đã thêm ${validItems.length} ảnh. Bấm "Chuyển đổi & Nén ảnh" để xử lý.`)
    }
  }

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
    setStatusMessage("")
  }

  // Thực hiện nén & chuyển đổi ảnh
  const handleConvertAll = async () => {
    if (originalImages.length === 0) {
      toast.info("Vui lòng tải lên ít nhất một ảnh.")
      return
    }

    setIsProcessing(true)
    setStatusMessage(`Đang chuyển đổi ${originalImages.length} ảnh sang ${outputFormat.split("/")[1].toUpperCase()} (${quality}%)...`)

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

              // Tính kích thước từ base64
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
      setActiveTab("converted")

      const priorityCount = successes.filter((s) => s.isPriority).length
      const baseCount = successes.length - priorityCount

      if (failureCount === 0) {
        setStatusMessage(
          `Hoàn tất: ${successes.length} ảnh đã nén thành công (${priorityCount} priority, ${baseCount} base).`
        )
        toast.success(`Đã chuyển đổi & nén ${successes.length} ảnh thành công!`)
      } else {
        setStatusMessage(
          `Hoàn tất: ${successes.length} thành công, ${failureCount} lỗi.`
        )
        toast.warning(`Hoàn tất ${successes.length} ảnh, có ${failureCount} ảnh lỗi.`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Lỗi chuyển đổi: ${err.message}`)
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
  }

  // Tải về tất cả dưới dạng ZIP có phân folder priority/ và base/
  const handleDownloadZip = async () => {
    if (convertedImages.length === 0) return
    setIsZipping(true)
    setStatusMessage("Đang đóng gói file ZIP theo cấu trúc priority/ và base/...")

    try {
      const zip = new JSZip()

      convertedImages.forEach((item) => {
        const base64Data = item.dataUrl.split(",")[1]
        if (base64Data) {
          // Phân nhóm theo quy ước: priority/ hoặc base/
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
      a.download = "converted_images.zip"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500)

      setStatusMessage("Gói ZIP đã được tải xuống thành công.")
      toast.success("Đã tải xuống converted_images.zip thành công!")
    } catch (zipErr: any) {
      console.error(zipErr)
      toast.error(`Lỗi tạo file ZIP: ${zipErr.message}`)
    } finally {
      setIsZipping(false)
    }
  }

  // Logic Zoom & Pan Preview Modal
  const openZoomModal = (src: string, title: string) => {
    setPreviewModalImg({ src, title })
    setCurrentZoom(1)
  }

  const handleWheelZoom = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.2 : -0.2
    setCurrentZoom((prev) => Math.min(5, Math.max(0.5, +(prev + delta).toFixed(1))))
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (currentZoom <= 1 || !modalContainerRef.current) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.pageX - modalContainerRef.current.offsetLeft,
      y: e.pageY - modalContainerRef.current.offsetTop,
      scrollLeft: modalContainerRef.current.scrollLeft,
      scrollTop: modalContainerRef.current.scrollTop,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !modalContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - modalContainerRef.current.offsetLeft
    const y = e.pageY - modalContainerRef.current.offsetTop
    modalContainerRef.current.scrollLeft = dragStart.scrollLeft - (x - dragStart.x)
    modalContainerRef.current.scrollTop = dragStart.scrollTop - (y - dragStart.y)
  }

  const handleMouseUp = () => setIsDragging(false)

  // Tổng dung lượng tiết kiệm
  const totalOriginalSize = convertedImages.reduce((sum, i) => sum + i.originalSize, 0)
  const totalConvertedSize = convertedImages.reduce((sum, i) => sum + i.convertedSize, 0)
  const totalReduction =
    totalOriginalSize > 0
      ? Math.round(((totalOriginalSize - totalConvertedSize) / totalOriginalSize) * 100)
      : 0

  return (
    <>
      <Dialog open={open} onClose={onClose} size="2xl" className="max-w-5xl w-full">
        <DialogBody className="p-0 max-h-[88vh] flex flex-col bg-white overflow-hidden rounded-2xl">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1057FB] shrink-0 shadow-2xs">
                <FileImage className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Chuyển đổi & Nén ảnh Đa năng
                  </h2>
                  <Badge variant="navy" size="xs" className="font-extrabold text-[10px] tracking-wide">
                    MB UX v2.1
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  Tự động tối ưu WebP/JPG, hỗ trợ quy chuẩn phân nhóm .priority cho Asset App MBBank.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 ml-2"
              title="Đóng modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Control Bar: Format & Quality Slider */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200/90 rounded-2xl">
              {/* Output Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#1057FB]" />
                  <span>Định dạng đầu ra:</span>
                </label>
                <DropdownMenu
                  options={OUTPUT_FORMAT_OPTIONS}
                  value={outputFormat}
                  onChange={(val) => setOutputFormat(val)}
                  className="w-full"
                  buttonClassName="w-full bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl h-10 text-xs font-semibold text-slate-800"
                  menuClassName="w-full min-w-[280px]"
                />
                <p className="text-[11px] text-slate-500">
                  {outputFormat === "image/webp" && "WebP cho dung lượng nhẹ nhất, hỗ trợ trong suốt và load siêu nhanh trên Mobile."}
                  {outputFormat === "image/png" && "PNG giữ nguyên độ sắc nét tuyệt đối, kích thước file thường lớn hơn."}
                  {outputFormat === "image/jpeg" && "JPEG tự động lót nền trắng #FFFFFF chống đen viền ảnh trong suốt."}
                </p>
              </div>

              {/* Quality Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-500" />
                    <span>Chất lượng nén ({quality}%):</span>
                  </label>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#1057FB] text-white">
                    {quality}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={quality}
                  disabled={outputFormat === "image/png"}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1057FB] disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <div className="flex justify-between text-[10.5px] text-slate-400">
                  <span>Siêu nhẹ (30%)</span>
                  <span className="font-semibold text-slate-600">90% (Khuyên dùng)</span>
                  <span>Tối đa (100%)</span>
                </div>
              </div>
            </div>

            {/* Dropzone Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleAddFiles(e.dataTransfer.files)
              }}
              className="border-2 border-dashed border-slate-300 hover:border-[#1057FB] bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-400 group-hover:text-[#1057FB] group-hover:border-[#1057FB]/40 flex items-center justify-center mx-auto shadow-2xs transition-colors">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Nhấp vào đây để chọn tệp hoặc kéo thả ảnh vào khu vực này
              </p>
              <p className="text-xs text-slate-500">
                Hỗ trợ PNG, JPG, JPEG, WebP • Tự động nhận diện đuôi <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 font-mono text-[11px]">.priority</code>
              </p>
            </div>

            {/* Action Buttons & Status */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  onClick={handleConvertAll}
                  disabled={originalImages.length === 0 || isProcessing}
                  className="bg-[#1057FB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl h-9 px-4 cursor-pointer gap-2 shadow-xs transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isProcessing ? "Đang xử lý nén..." : "Chuyển đổi & Nén ảnh"}</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={convertedImages.length === 0 || isZipping}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl h-9 px-4 cursor-pointer gap-2 shadow-xs transition-all disabled:opacity-50"
                >
                  {isZipping ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderArchive className="w-3.5 h-3.5" />
                  )}
                  <span>Tải xuống tất cả (ZIP)</span>
                </Button>

                {originalImages.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearAll}
                    disabled={isProcessing}
                    className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 border-slate-200 rounded-xl h-9 px-3 text-xs cursor-pointer gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa danh sách</span>
                  </Button>
                )}
              </div>

              {/* Status banner */}
              {statusMessage && (
                <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}
            </div>

            {/* Summary KPI Bar if converted */}
            {convertedImages.length > 0 && (
              <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/70 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#1057FB]" />
                  <span className="text-xs font-semibold text-slate-800">
                    Đã nén xong {convertedImages.length} ảnh
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Gốc: </span>
                    <span className="font-bold text-slate-700">{formatBytes(totalOriginalSize)}</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <div>
                    <span className="text-slate-500">Sau nén: </span>
                    <span className="font-bold text-emerald-600">{formatBytes(totalConvertedSize)}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[11px]">
                    Tiết kiệm {totalReduction}%
                  </span>
                </div>
              </div>
            )}

            {/* Tabs: Đã chuyển đổi / Ảnh gốc */}
            {(originalImages.length > 0 || convertedImages.length > 0) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("converted")}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "converted"
                          ? "bg-[#1057FB] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ảnh đã chuyển đổi ({convertedImages.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("original")}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "original"
                          ? "bg-[#1057FB] text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      <span>Ảnh gốc ({originalImages.length})</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Click vào ảnh để phóng to chi tiết & cuộn chuột để zoom
                  </span>
                </div>

                {/* Tab Content: Converted Images */}
                {activeTab === "converted" && (
                  <div>
                    {convertedImages.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                        Chưa có ảnh nào được chuyển đổi. Nhấn nút <strong>"Chuyển đổi & Nén ảnh"</strong> ở trên để thực hiện.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {convertedImages.map((item) => {
                          const isDiffNeg = item.reductionPercent >= 0
                          return (
                            <div
                              key={item.id}
                              className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                            >
                              {/* Thumbnail with Zoom trigger */}
                              <div
                                onClick={() => openZoomModal(item.dataUrl, item.name)}
                                className="relative bg-slate-100 h-28 flex items-center justify-center p-2 cursor-pointer overflow-hidden group/img"
                              >
                                <img
                                  src={item.dataUrl}
                                  alt={item.name}
                                  className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover/img:scale-105"
                                />
                                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 className="w-4 h-4 drop-shadow-sm" />
                                </div>

                                {/* Folder Badge */}
                                <div className="absolute top-1.5 left-1.5">
                                  {item.isPriority ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white shadow-xs">
                                      priority/
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-700/70 text-white">
                                      base/
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Info */}
                              <div className="p-2 space-y-1 text-left flex-1 flex flex-col justify-between">
                                <div>
                                  <p className="text-[11px] font-bold text-slate-900 truncate" title={item.name}>
                                    {item.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10.5px]">
                                    <span className="text-slate-400 line-through">
                                      {formatBytes(item.originalSize)}
                                    </span>
                                    <span className="font-bold text-slate-800">
                                      {formatBytes(item.convertedSize)}
                                    </span>
                                    <span
                                      className={`text-[9.5px] font-bold px-1 py-0.2 rounded ${
                                        isDiffNeg ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                                      }`}
                                    >
                                      {isDiffNeg ? `-${item.reductionPercent}%` : `+${Math.abs(item.reductionPercent)}%`}
                                    </span>
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadSingle(item)}
                                  className="w-full text-emerald-700 hover:text-white hover:bg-emerald-600 text-[11px] font-semibold h-7 rounded-lg gap-1 border border-emerald-200 mt-1 cursor-pointer transition-colors"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Tải về</span>
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content: Original Images */}
                {activeTab === "original" && (
                  <div>
                    {originalImages.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                        Chưa có ảnh nào được chọn.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {originalImages.map((item) => (
                          <div
                            key={item.id}
                            className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div
                              onClick={() => openZoomModal(item.previewUrl, item.name)}
                              className="relative bg-slate-100 h-28 flex items-center justify-center p-2 cursor-pointer overflow-hidden group/img"
                            >
                              <img
                                src={item.previewUrl}
                                alt={item.name}
                                className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover/img:scale-105"
                              />
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Maximize2 className="w-4 h-4 drop-shadow-sm" />
                              </div>

                              {item.isPriority && (
                                <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white shadow-xs">
                                  .priority
                                </span>
                              )}
                            </div>

                            <div className="p-2 space-y-1 text-left flex-1 flex flex-col justify-between">
                              <div>
                                <p className="text-[11px] font-bold text-slate-900 truncate" title={item.name}>
                                  {item.name}
                                </p>
                                <p className="text-[10.5px] text-slate-500 font-mono">
                                  {formatBytes(item.size)}
                                </p>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveOriginal(item.id)}
                                className="w-full text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-medium h-7 rounded-lg gap-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Xóa</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogBody>
      </Dialog>

      {/* MODAL PHÓNG TO CHI TIẾT (ZOOM & PAN LIGHTBOX) */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setPreviewModalImg(null)}
        >
          <div
            className="relative max-w-[92vw] max-h-[90vh] bg-white rounded-2xl overflow-hidden p-4 flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="truncate pr-4">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {previewModalImg.title}
                </p>
                <p className="text-[10px] text-slate-400">
                  Cuộn chuột hoặc bấm nút để phóng to/thu nhỏ • Kéo chuột để di chuyển khi zoom
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(1)))}
                  disabled={currentZoom <= 0.5}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold px-2 text-slate-700 min-w-10 text-center">
                  {Math.round(currentZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentZoom((z) => Math.min(5, +(z + 0.2).toFixed(1)))}
                  disabled={currentZoom >= 5}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentZoom(1)}
                  className="px-2 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer ml-1"
                  title="Khôi phục 100%"
                >
                  1:1
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalImg(null)}
                  className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer ml-2"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Container with Panning */}
            <div
              ref={modalContainerRef}
              onWheel={handleWheelZoom}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`flex-1 overflow-auto p-4 flex items-center justify-center max-h-[70vh] ${
                currentZoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
              }`}
            >
              <img
                src={previewModalImg.src}
                alt={previewModalImg.title}
                style={{ transform: `scale(${currentZoom})`, transformOrigin: "center center" }}
                className="max-h-full max-w-full object-contain transition-transform duration-100 select-none pointer-events-none"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
