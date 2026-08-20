import { useState, useRef } from "react"
import { Dialog, DialogBody, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Image as ImageIcon, 
  UploadCloud, 
  Download, 
  Sliders, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  X,
  FileImage,
  ArrowRight
} from "lucide-react"

interface CompressedImageItem {
  id: string
  name: string
  originalSize: number
  compressedSize: number
  originalUrl: string
  compressedUrl: string
  reductionPercent: number
}

interface ImageCompressorModalProps {
  open: boolean
  onClose: () => void
}

export default function ImageCompressorModal({ open, onClose }: ImageCompressorModalProps) {
  const [quality, setQuality] = useState<number>(80)
  const [images, setImages] = useState<CompressedImageItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  const compressSingleFile = (file: File, q: number): Promise<CompressedImageItem> => {
    return new Promise((resolve, reject) => {
      const originalSize = file.size
      const originalUrl = URL.createObjectURL(file)
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Cannot get canvas context"))
          return
        }
        ctx.drawImage(img, 0, 0)

        // Compress as image/jpeg or image/webp
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg"
        const qualityRatio = q / 100

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Compression failed"))
              return
            }
            const compressedSize = blob.size
            const compressedUrl = URL.createObjectURL(blob)
            const reduction = Math.max(
              0,
              Math.round(((originalSize - compressedSize) / originalSize) * 100)
            )

            resolve({
              id: `${file.name}-${Date.now()}-${Math.random()}`,
              name: file.name,
              originalSize,
              compressedSize,
              originalUrl,
              compressedUrl,
              reductionPercent: reduction,
            })
          },
          mimeType,
          qualityRatio
        )
      }

      img.onerror = () => reject(new Error("Image load error"))
      img.src = originalUrl
    })
  }

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsProcessing(true)

    const newItems: CompressedImageItem[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith("image/")) {
        try {
          const item = await compressSingleFile(file, quality)
          newItems.push(item)
        } catch (e) {
          console.warn("Could not compress file:", file.name, e)
        }
      }
    }

    setImages((prev) => [...prev, ...newItems])
    setIsProcessing(false)
  }

  const handleRecompressAll = async (newQuality: number) => {
    setQuality(newQuality)
    // Recompress can be done on next files upload
  }

  const handleDownload = (item: CompressedImageItem) => {
    const a = document.createElement("a")
    a.href = item.compressedUrl
    a.download = `min-${item.name}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDownloadAll = () => {
    images.forEach((img) => handleDownload(img))
  }

  return (
    <Dialog open={open} onClose={onClose} size="2xl">
      <DialogBody className="p-0 max-h-[85vh] flex flex-col bg-white overflow-hidden rounded-3xl">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1057FB] to-[#0D9B97] flex items-center justify-center text-white shadow-md shadow-[#1057FB]/20">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Công cụ Nén ảnh UX</span>
                <Badge variant="navy" size="xs" className="font-extrabold text-[9px]">
                  Web Tool
                </Badge>
              </h2>
              <p className="text-xs text-slate-500">
                Tối ưu dung lượng hình ảnh banner, screenshot UI giữ nguyên chất lượng hiển thị.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Quality Slider Control */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Sliders className="w-4 h-4 text-[#1057FB]" />
                <span>Mức chất lượng nén:</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-[#1057FB] text-white">
                {quality}%
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="95"
              step="5"
              value={quality}
              onChange={(e) => handleRecompressAll(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1057FB]"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Dung lượng siêu nhẹ (20%)</span>
              <span>Cân bằng (80% khuyên dùng)</span>
              <span>Chất lượng tối đa (95%)</span>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFilesSelected(e.dataTransfer.files)
            }}
            className="border-2 border-dashed border-slate-300 hover:border-[#1057FB] bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-2 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 group-hover:text-[#1057FB] group-hover:border-[#1057FB]/40 flex items-center justify-center mx-auto shadow-xs transition-colors">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              Kéo thả hoặc bấm vào đây để chọn ảnh
            </p>
            <p className="text-xs text-slate-400">
              Hỗ trợ PNG, JPG, JPEG, WebP • Xử lý trực tiếp trên trình duyệt 100% an toàn
            </p>
          </div>

          {/* Results List */}
          {images.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Đã nén ({images.length} ảnh)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  className="text-xs font-bold gap-1.5 rounded-xl text-[#1057FB] border-blue-200 bg-blue-50/50 hover:bg-blue-100/60"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải về tất cả (.zip/ảnh)</span>
                </Button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {images.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.compressedUrl}
                        alt={item.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="line-through text-slate-400">
                            {formatFileSize(item.originalSize)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-300" />
                          <span className="font-bold text-emerald-600">
                            {formatFileSize(item.compressedSize)}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                            -{item.reductionPercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(item)}
                      className="h-8 px-2.5 text-xs font-bold text-slate-700 hover:text-[#1057FB] hover:bg-blue-50 rounded-xl shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tải về</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogBody>
    </Dialog>
  )
}
