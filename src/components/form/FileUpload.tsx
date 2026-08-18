import { useState, useRef, DragEvent, ChangeEvent } from "react"

interface FileUploadProps {
  files: File[]
  onChange: (files: File[]) => void
}

const ACCEPTED = [".pdf", ".docx", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg"]
const ACCEPT_ATTR = ACCEPTED.join(",")

const EXT_ICONS: Record<string, string> = {
  pdf: "📄",
  docx: "📝",
  pptx: "📊",
  xlsx: "📋",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
}

function fileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? ""
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function FileUpload({ files, onChange }: FileUploadProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
    const deduped = [...files, ...arr].filter(
      (f, i, a) => a.findIndex((x) => x.name === f.name && x.size === f.size) === i,
    )
    onChange(deduped)
  }

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ""
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
          dragging
            ? "border-navy bg-navy-50"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          onChange={onInputChange}
          className="sr-only"
        />
        <div className="flex flex-col items-center gap-2">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              dragging ? "bg-navy text-white" : "bg-slate-100 text-slate-400"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 12V3M9 3L6 6M9 3L12 6M3 13.5V15a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0015 15v-1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              Kéo thả tệp vào đây hoặc{" "}
              <span className="text-navy underline underline-offset-2">chọn từ máy tính</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">PDF, DOCX, PPTX, XLSX, PNG, JPG</p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => {
            const ext = fileExt(file.name)
            return (
              <li
                key={i}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2.5"
              >
                <span className="text-lg leading-none">{EXT_ICONS[ext] ?? "📁"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(i)
                  }}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 rounded transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
