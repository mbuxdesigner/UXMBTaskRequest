import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ImagePlus,
  Loader2,
  MapPin,
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
import { CAvatar29 } from "@/components/reui/c-avatar-29"
import { IconStackLarge } from "@/components/reui/c-icon-stack-2"
import { DropdownMenu } from "@/components/reui/dropdown-menu"
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
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom")
  const [menuMaxHeight, setMenuMaxHeight] = useState(340)
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedDesigners = designers.filter((designer) => value.includes(designer.email))
  const filtered = designers.filter((designer) => `${designer.name} ${designer.email}`.toLowerCase().includes(query.trim().toLowerCase()))
  const allSelected = designers.length > 0 && designers.every((designer) => value.includes(designer.email))

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const toggle = (email: string) => onChange(value.includes(email) ? value.filter((item) => item !== email) : [...value, email])
  const toggleAll = () => onChange(allSelected ? [] : designers.map((designer) => designer.email))
  const toggleMenu = (trigger: HTMLElement) => {
    if (open) {
      setOpen(false)
      return
    }
    const rect = trigger.getBoundingClientRect()
    const scrollContainer = trigger.closest(".overflow-y-auto") as HTMLElement | null
    const containerRect = scrollContainer?.getBoundingClientRect()
    const topBoundary = containerRect?.top ?? 72
    const bottomBoundary = containerRect?.bottom ?? window.innerHeight - 72
    const spaceAbove = Math.max(0, rect.top - topBoundary - 12)
    const spaceBelow = Math.max(0, bottomBoundary - rect.bottom - 12)
    const nextPlacement = spaceBelow >= 280 || spaceBelow >= spaceAbove ? "bottom" : "top"
    const available = nextPlacement === "bottom" ? spaceBelow : spaceAbove
    setPlacement(nextPlacement)
    setMenuMaxHeight(Math.min(360, Math.max(220, Math.floor(available))))
    setQuery("")
    setOpen(true)
  }

  return (
    <div ref={rootRef} className={cn("relative mt-2 flex min-h-11 items-center", open && "z-40")}>
      {selectedDesigners.length > 0 ? (
        <div className="flex min-w-0 items-center">
          <CAvatar29
            totalCount={selectedDesigners.length}
            showAddButton
            addTitle="Thêm người tham gia"
            onClick={(event) => toggleMenu(event.currentTarget as HTMLElement)}
            className="cursor-pointer rounded-lg focus-within:ring-4 focus-within:ring-blue-100"
            onAddClick={(event) => {
              event.stopPropagation()
              toggleMenu(event.currentTarget as HTMLElement)
            }}
          >
            {selectedDesigners.slice(0, 3).map((designer) => (
              <UserAvatar key={designer.id || designer.email} name={designer.name} avatarUrl={designer.avatar} size="md" className="ring-2 ring-white" />
            ))}
          </CAvatar29>
        </div>
      ) : (
        <button type="button" onClick={(event) => toggleMenu(event.currentTarget)} className="inline-flex items-center gap-1 rounded-lg border border-blue-200/80 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-[#1057FB] shadow-2xs transition-colors hover:bg-blue-100 hover:text-blue-700">
          <Users className="h-3.5 w-3.5" />
          <span>Thêm</span>
        </button>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: placement === "top" ? -6 : 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === "top" ? -4 : 4, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.75 }}
            className={cn(
              "absolute right-0 z-50 flex w-80 max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-xs shadow-2xl",
              placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            )}
            style={{ maxHeight: `${menuMaxHeight}px` }}
          >
            <div className="space-y-2 border-b border-slate-100 bg-slate-50/60 px-3 pb-2.5 pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold uppercase tracking-wider text-slate-500">Người tham gia ({value.length})</span>
                <button type="button" onClick={toggleAll} className="font-semibold text-[#1057FB] hover:text-blue-700">{allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</button>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, email hoặc vai trò..." className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#1057FB]" />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {filtered.length === 0 ? <p className="px-3 py-6 text-center text-xs text-slate-400">Không tìm thấy nhân sự</p> : filtered.map((designer) => {
                const checked = value.includes(designer.email)
                return (
                  <button key={designer.id || designer.email} type="button" onClick={() => toggle(designer.email)} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-50", checked && "bg-blue-50/70")}>
                    <UserAvatar name={designer.name} avatarUrl={designer.avatar} size="xs" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-800">{designer.name}</span><span className="block truncate text-[10px] text-slate-400">{designer.email} · {designer.role || "Thành viên"}</span></span>
                    <span className={cn("flex h-4 w-4 items-center justify-center rounded border transition-colors", checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}>{checked && <Check className="h-3 w-3" />}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3 py-2">
              <span className="text-[11px] text-slate-500">Đã chọn {value.length}/{designers.length}</span>
              <Button type="button" size="sm" onClick={() => setOpen(false)} className="h-7 rounded-lg px-3 text-xs">Hoàn tất</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      className="font-sans"
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
            <MiniDateCalendar value={date} onChange={setDate} />

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
            <div className="grid items-stretch gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col">
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" className="hidden" onChange={(event) => {
                  if (event.target.files) addImages(event.target.files)
                  event.target.value = ""
                }} />

                {images.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      addImages(event.dataTransfer.files)
                    }}
                    disabled={saving}
                    className="group mx-auto flex aspect-[224/259] w-full max-w-[200px] select-none flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200/90 bg-white px-4 py-5 text-center shadow-2xs transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/30 disabled:cursor-not-allowed disabled:opacity-60 sm:h-full sm:max-w-none sm:aspect-auto"
                  >
                    <IconStackLarge
                      className="pointer-events-none mb-0.5"
                      stackClassName="h-14 w-12"
                      icon={<ImagePlus className="size-4.5 text-slate-400 transition-colors duration-200 group-hover:text-[#1057FB]" />}
                    />
                    <span className="pointer-events-none text-xs font-semibold leading-[18px] text-slate-800">
                      Kéo thả ảnh thumbnail,<br />hoặc <span className="text-[#1057FB] underline underline-offset-4">Chọn ảnh</span>
                    </span>
                    <span className="pointer-events-none mt-2 text-[10px] leading-4 text-slate-400">224 × 259 px · Tối đa 10 MB</span>
                  </button>
                ) : (
                  <div className="mx-auto h-full w-full max-w-[200px] sm:max-w-none">
                    {images.map((image) => (
                      <div key={image.previewUrl} className="group relative aspect-[224/259] h-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm sm:aspect-auto">
                        <img src={image.previewUrl} alt={image.file.name} className="h-full w-full object-contain" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1.5 bg-gradient-to-t from-slate-950/80 to-transparent px-2 pb-2 pt-8 text-white">
                          <span className="min-w-0 truncate text-[9px] font-medium">{image.file.name}</span>
                          <div className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-md bg-white/15 px-1.5 py-1 text-[9px] font-semibold hover:bg-white/25">Đổi</button>
                            <button type="button" onClick={() => removeImage(image.previewUrl)} className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 hover:bg-white/25" aria-label={`Bỏ ${image.file.name}`}><X className="h-3 w-3" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {imageError && <p className="mt-2 text-[10px] font-medium leading-4 text-rose-600">{imageError}</p>}
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Tên cuộc họp <span className="text-rose-500">*</span>
                  <Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Design review luồng vay" className="mt-2 h-12" />
                </label>

                <div className="block text-sm font-medium text-slate-700">
                  Loại sự kiện
                  <DropdownMenu
                    value={categoryId}
                    onChange={setCategoryId}
                    className="mt-2 w-full"
                    buttonClassName="h-11 rounded-xl px-3.5 text-sm"
                    options={categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                      icon: <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />,
                    }))}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">Người tham gia</p>
                    <DesignerPicker designers={designers} value={attendees} onChange={setAttendees} />
                  </div>
                  <label className="block min-w-0 text-sm font-medium text-slate-700">
                    Địa điểm / Link họp
                    <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Phòng họp hoặc Teams" startIcon={<MapPin className="h-4 w-4" />} className="mt-2" />
                  </label>
                </div>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Nội dung chuẩn bị
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Agenda, mục tiêu cuộc họp, link Figma hoặc nội dung cần chuẩn bị…" className="mt-2 min-h-24" />
            </label>
          </div>
        </div>
    </RightSheet>
  )
}
