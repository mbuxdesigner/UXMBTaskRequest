import React, { useEffect, useRef, useState } from "react"
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ImagePlus,
  Loader2,
  MapPin,
  Paperclip,
  Repeat2,
  Search,
  Users,
  Video,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RightSheet } from "@/components/ui/right-sheet"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/common/UserAvatar"
import type { EventCategoryConfig } from "@/config/systemConfig"
import { cn } from "@/lib/utils"

export interface ScheduleMeetingValues {
  title: string
  categoryId: string
  date: string
  time: string
  durationMinutes: number
  recurrence: "none" | "daily" | "weekly" | "monthly"
  recurrenceEndDate?: string
  attendees: string[]
  location: string
  description: string
}

export interface ScheduleMeetingDesigner {
  id: string
  name: string
  email: string
  role?: string
  avatar?: string
}

interface PendingImage {
  file: File
  previewUrl: string
}

interface ScheduleMeetingDialogProps {
  open: boolean
  initialDate: string
  defaultAttendee?: string
  categories: EventCategoryConfig[]
  designers: ScheduleMeetingDesigner[]
  saving?: boolean
  onClose: () => void
  onSubmit: (values: ScheduleMeetingValues, images: File[]) => void | Promise<void>
}

const TIME_SLOTS = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"]
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

function formatDateSummary(value: string): string {
  if (!value) return "Chưa chọn ngày"
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day))
}

function toYMD(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseYMD(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function MiniDateCalendar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = parseYMD(value)
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))

  useEffect(() => {
    const next = parseYMD(value)
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1))
  }, [value])

  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - first.getDay())
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + index)
    return day
  })
  const todayYMD = toYMD(new Date())

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => moveMonth(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Tháng trước"><ChevronLeft className="h-4 w-4" /></button>
        <p className="text-xs font-bold capitalize text-slate-900">{new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(visibleMonth)}</p>
        <button type="button" onClick={() => moveMonth(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Tháng sau"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((label) => <span key={label} className="py-1 text-[9px] font-bold text-slate-400">{label}</span>)}
        {days.map((day) => {
          const dayYMD = toYMD(day)
          const selectedDay = dayYMD === value
          const isToday = dayYMD === todayYMD
          const inMonth = day.getMonth() === visibleMonth.getMonth()
          return (
            <button
              key={dayYMD}
              type="button"
              onClick={() => onChange(dayYMD)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-[11px] font-medium transition-colors",
                selectedDay ? "bg-slate-950 text-white" : "hover:bg-slate-100",
                !selectedDay && isToday && "bg-blue-50 font-bold text-blue-700",
                !selectedDay && !inMonth && "text-slate-300",
                !selectedDay && inMonth && !isToday && "text-slate-700",
              )}
            >{day.getDate()}</button>
          )
        })}
      </div>
    </div>
  )
}

function EventCategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: EventCategoryConfig[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = categories.find((category) => category.id === value) || categories[0]

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  return (
    <div ref={rootRef} className="relative mt-2">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left transition-all hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selected?.color || "#64748b" }} />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{selected?.name || "Chọn loại sự kiện"}</span>{selected?.description && <span className="mt-0.5 block truncate text-[10px] text-slate-400">{selected.description}</span>}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {categories.map((category) => (
            <button key={category.id} type="button" onClick={() => { onChange(category.id); setOpen(false) }} className={cn("flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50", category.id === value && "bg-slate-50")}>
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
              <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">{category.name}</span>{category.description && <span className="mt-0.5 block text-[10px] leading-4 text-slate-400">{category.description}</span>}</span>
              {category.id === value && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DesignerPicker({
  designers,
  value,
  onChange,
}: {
  designers: ScheduleMeetingDesigner[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedDesigners = designers.filter((designer) => value.includes(designer.email))
  const filtered = designers.filter((designer) => `${designer.name} ${designer.email}`.toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const toggle = (email: string) => onChange(value.includes(email) ? value.filter((item) => item !== email) : [...value, email])

  return (
    <div ref={rootRef} className="relative mt-2">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100">
        <Users className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{selectedDesigners.length > 0 ? selectedDesigners.map((designer) => designer.name).join(", ") : "Chọn Designer tham gia"}</span>
        {selectedDesigners.length > 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{selectedDesigners.length}</span>}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2"><Search className="h-3.5 w-3.5 text-slate-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm Designer…" className="h-7 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400" /></div>
          <div className="max-h-56 overflow-y-auto p-1.5">
            {filtered.length === 0 ? <p className="px-3 py-6 text-center text-xs text-slate-400">Không tìm thấy Designer</p> : filtered.map((designer) => {
              const checked = value.includes(designer.email)
              return (
                <button key={designer.id || designer.email} type="button" onClick={() => toggle(designer.email)} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50", checked && "bg-blue-50/60")}>
                  <UserAvatar name={designer.name} avatarUrl={designer.avatar} size="xs" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-800">{designer.name}</span><span className="block truncate text-[10px] text-slate-400">{designer.email} · {designer.role || "Designer"}</span></span>
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded border", checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300")}>{checked && <Check className="h-3 w-3" />}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function ScheduleMeetingDialog({
  open,
  initialDate,
  defaultAttendee = "",
  categories,
  designers,
  saving = false,
  onClose,
  onSubmit,
}: ScheduleMeetingDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<PendingImage[]>([])
  const [title, setTitle] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState("09:00")
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [recurrence, setRecurrence] = useState<ScheduleMeetingValues["recurrence"]>("none")
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("")
  const [attendees, setAttendees] = useState<string[]>(defaultAttendee ? [defaultAttendee] : [])
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<PendingImage[]>([])
  const [imageError, setImageError] = useState("")

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    return () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
  }, [])

  useEffect(() => {
    if (!open) return
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setTitle("")
    setCategoryId(categories[0]?.id || "cat-review")
    setDate(initialDate)
    setTime("09:00")
    setDurationMinutes(60)
    setRecurrence("none")
    setRecurrenceEndDate("")
    setAttendees(defaultAttendee ? [defaultAttendee] : [])
    setLocation("")
    setDescription("")
    setImages([])
    setImageError("")
  }, [open, initialDate, defaultAttendee, categories])

  const addImages = (files: FileList | File[]) => {
    const incoming = Array.from(files)
    const invalidType = incoming.find((file) => !file.type.startsWith("image/"))
    if (invalidType) {
      setImageError("Chỉ hỗ trợ tệp ảnh PNG, JPG, WEBP hoặc GIF.")
      return
    }
    const oversized = incoming.find((file) => file.size > MAX_IMAGE_SIZE)
    if (oversized) {
      setImageError(`Ảnh “${oversized.name}” vượt quá 10 MB.`)
      return
    }
    setImageError("")
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    const file = incoming[0]
    setImages(file ? [{ file, previewUrl: URL.createObjectURL(file) }] : [])
  }

  const removeImage = (previewUrl: string) => {
    URL.revokeObjectURL(previewUrl)
    setImages((current) => current.filter((image) => image.previewUrl !== previewUrl))
  }

  const submit = () => {
    return onSubmit({
      title: title.trim(),
      categoryId,
      date,
      time,
      durationMinutes,
      recurrence,
      recurrenceEndDate: recurrence === "none" ? undefined : recurrenceEndDate,
      attendees,
      location: location.trim(),
      description: description.trim(),
    }, images.map((image) => image.file))
  }

  return (
    <RightSheet
      open={open}
      onClose={onClose}
      size="xl"
      title="Schedule meeting"
      description="Tạo lịch họp, mời người tham gia và chuẩn bị tài liệu trước buổi làm việc."
      icon={<Video className="h-4.5 w-4.5" />}
      closeDisabled={saving}
      footer={(
        <div className="flex items-center justify-between gap-3">
          <div className="hidden items-center gap-2 text-[10px] text-slate-400 sm:flex">
            <Check className="h-3.5 w-3.5 text-emerald-500" />{date} · {time} · {durationMinutes} phút
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
            <Button type="button" onClick={submit} disabled={saving || !title.trim() || !date || !time || !categoryId || attendees.length === 0 || (recurrence !== "none" && (!recurrenceEndDate || recurrenceEndDate < date))}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
              {saving ? "Đang tạo…" : "Schedule meeting"}
            </Button>
          </div>
        </div>
      )}
    >
        <div className="grid lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50/70 p-5 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Thời gian</p>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><CalendarDays className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="text-[10px] font-semibold text-slate-400">Ngày đã chọn</p><p className="mt-0.5 text-xs font-bold capitalize text-slate-900">{formatDateSummary(date)}</p></div>
            </div>
            <div className="mt-2"><MiniDateCalendar value={date} onChange={setDate} /></div>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Khung giờ bắt đầu</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={cn(
                    "h-8 rounded-lg border text-[11px] font-semibold transition-colors",
                    time === slot
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
            <label className="mt-2 block text-[10px] font-semibold text-slate-500">
              Hoặc nhập giờ khác
              <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-blue-500" />
            </label>

            <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Thời lượng
                <Select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-1.5 h-9 rounded-lg text-xs" startIcon={<Clock3 className="h-3.5 w-3.5" />}>
                  <option value={30}>30 phút</option>
                  <option value={45}>45 phút</option>
                  <option value={60}>1 giờ</option>
                  <option value={90}>1 giờ 30 phút</option>
                  <option value={120}>2 giờ</option>
                </Select>
              </label>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Lặp lại
                <Select value={recurrence} onChange={(event) => setRecurrence(event.target.value as ScheduleMeetingValues["recurrence"])} className="mt-1.5 h-9 rounded-lg text-xs" startIcon={<Repeat2 className="h-3.5 w-3.5" />}>
                  <option value="none">Không lặp</option>
                  <option value="daily">Hàng ngày</option>
                  <option value="weekly">Hàng tuần</option>
                  <option value="monthly">Hàng tháng</option>
                </Select>
              </label>
            </div>
            {recurrence !== "none" && (
              <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Lặp đến ngày
                <input type="date" min={date} value={recurrenceEndDate} onChange={(event) => setRecurrenceEndDate(event.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
            )}
          </aside>

          <div className="space-y-5 p-5 sm:p-6">
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Tên cuộc họp <span className="text-rose-500">*</span>
                <Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Design review luồng vay" className="mt-2" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Loại sự kiện
                  <EventCategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Địa điểm / Link họp
                  <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Phòng họp hoặc Teams" startIcon={<MapPin className="h-4 w-4" />} className="mt-2" />
                </label>
              </div>

              <label className="block text-xs font-semibold text-slate-700">
                Người tham gia
                <DesignerPicker designers={designers} value={attendees} onChange={setAttendees} />
                <span className="mt-1.5 block text-[10px] font-normal text-slate-400">Danh sách lấy từ nhân sự Designer trong Admin Settings.</span>
              </label>

              <label className="block text-xs font-semibold text-slate-700">
                Nội dung chuẩn bị
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Agenda, mục tiêu cuộc họp, link Figma hoặc nội dung cần chuẩn bị…" className="mt-2 min-h-24" />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Paperclip className="h-3.5 w-3.5 text-slate-400" />Ảnh thumbnail</p>
                  <p className="mt-1 text-[10px] text-slate-400">Một ảnh đại diện, không quá 10 MB.</p>
                </div>
                <Button type="button" variant="outline" size="xs" onClick={() => inputRef.current?.click()} disabled={saving}>
                  <ImagePlus className="h-3.5 w-3.5" />{images.length > 0 ? "Đổi ảnh" : "Chọn ảnh"}
                </Button>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => {
                  if (event.target.files) addImages(event.target.files)
                  event.target.value = ""
                }} />
              </div>

              {images.length === 0 ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    addImages(event.dataTransfer.files)
                  }}
                  className="mt-3 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm"><ImagePlus className="h-4 w-4" /></span>
                  <span className="mt-2 text-xs font-semibold text-slate-700">Kéo thả hoặc bấm để chọn ảnh</span>
                  <span className="mt-1 text-[10px] text-slate-400">Ảnh agenda, wireframe hoặc tài liệu tham chiếu</span>
                </button>
              ) : (
                <div className="mt-3">
                  {images.map((image) => (
                    <div key={image.previewUrl} className="group relative aspect-[16/7] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <img src={image.previewUrl} alt={image.file.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-950/75 to-transparent px-3 pb-2 pt-8 text-white"><span className="truncate text-[10px] font-medium">{image.file.name}</span><button type="button" onClick={() => removeImage(image.previewUrl)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label={`Bỏ ${image.file.name}`}><X className="h-3 w-3" /></button></div>
                    </div>
                  ))}
                </div>
              )}
              {imageError && <p className="mt-2 text-[10px] font-medium text-rose-600">{imageError}</p>}
            </div>
          </div>
        </div>
    </RightSheet>
  )
}
