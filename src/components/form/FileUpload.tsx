import { useState, useRef, DragEvent, ChangeEvent } from "react"
import { UploadCloud, FileText, X, Image as ImageIcon, FileSpreadsheet, FileBox } from "lucide-react"

interface FileUploadProps {
  files: File[]
  onChange: (files: File[]) => void
}

const ACCEPTED = [".pdf", ".docx", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg"]
const ACCEPT_ATTR = ACCEPTED.join(",")

function fileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? ""
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function getFileIcon(ext: string) {
  if (["png", "jpg", "jpeg"].includes(ext)) return <ImageIcon className="w-4 h-4 text-purple-500" />
  if (["xlsx", "csv"].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
  if (["pdf", "docx", "doc"].includes(ext)) return <FileText className="w-4 h-4 text-blue-500" />
  return <FileBox className="w-4 h-4 text-slate-500" />
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
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 select-none ${
          dragging
            ? "border-navy bg-navy-50/70"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
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
        <div className="flex flex-col items-center gap-2.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
              dragging ? "bg-navy text-white shadow-sm" : "bg-slate-100 text-slate-500"
            }`}
          >
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Kéo thả tệp vào đây hoặc{" "}
              <span className="text-navy underline underline-offset-4">duyệt từ máy tính</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Hỗ trợ PDF, DOCX, PPTX, XLSX, PNG, JPG (Tối đa 25MB)</p>
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
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                  {getFileIcon(ext)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(i)
                  }}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
