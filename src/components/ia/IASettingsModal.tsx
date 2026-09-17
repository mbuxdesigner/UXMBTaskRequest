import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, SlidersHorizontal, RotateCcw, Check } from "lucide-react"
import { springs, dialogOverlayVariants, dialogContentVariants } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import { IATierDimensionSettings } from "@/types/ia"

export const DEFAULT_TIER_DIMENSIONS: IATierDimensionSettings = {
  1: { width: 320, height: 115 },
  2: { width: 280, height: 120 },
  3: { width: 260, height: 125 },
  4: { width: 250, height: 115 },
  columnGap: 110,
  verticalGapJourney: 44,
  verticalGapScreen: 32,
}

interface IASettingsModalProps {
  isOpen: boolean
  currentSettings: IATierDimensionSettings
  onClose: () => void
  onSave: (newSettings: IATierDimensionSettings) => void
}

export default function IASettingsModal({
  isOpen,
  currentSettings,
  onClose,
  onSave,
}: IASettingsModalProps) {
  const [lv1Width, setLv1Width] = useState<number>(currentSettings[1].width)
  const [lv2Width, setLv2Width] = useState<number>(currentSettings[2].width)
  const [lv3Width, setLv3Width] = useState<number>(currentSettings[3].width)
  const [lv4Width, setLv4Width] = useState<number>(currentSettings[4].width)
  const [columnGap, setColumnGap] = useState<number>(currentSettings.columnGap)

  useEffect(() => {
    if (isOpen) {
      setLv1Width(currentSettings[1].width)
      setLv2Width(currentSettings[2].width)
      setLv3Width(currentSettings[3].width)
      setLv4Width(currentSettings[4].width)
      setColumnGap(currentSettings.columnGap)
    }
  }, [isOpen, currentSettings])

  const handleApplyPreset = (preset: "default" | "spacious" | "compact") => {
    if (preset === "default") {
      setLv1Width(320)
      setLv2Width(280)
      setLv3Width(260)
      setLv4Width(250)
      setColumnGap(110)
    } else if (preset === "spacious") {
      setLv1Width(360)
      setLv2Width(310)
      setLv3Width(285)
      setLv4Width(265)
      setColumnGap(140)
    } else if (preset === "compact") {
      setLv1Width(280)
      setLv2Width(250)
      setLv3Width(235)
      setLv4Width(220)
      setColumnGap(85)
    }
  }

  const handleReset = () => {
    setLv1Width(DEFAULT_TIER_DIMENSIONS[1].width)
    setLv2Width(DEFAULT_TIER_DIMENSIONS[2].width)
    setLv3Width(DEFAULT_TIER_DIMENSIONS[3].width)
    setLv4Width(DEFAULT_TIER_DIMENSIONS[4].width)
    setColumnGap(DEFAULT_TIER_DIMENSIONS.columnGap)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      1: { width: Math.max(160, lv1Width), height: currentSettings[1].height },
      2: { width: Math.max(160, lv2Width), height: currentSettings[2].height },
      3: { width: Math.max(150, lv3Width), height: currentSettings[3].height },
      4: { width: Math.max(140, lv4Width), height: currentSettings[4].height },
      columnGap: Math.max(30, columnGap),
      verticalGapJourney: currentSettings.verticalGapJourney,
      verticalGapScreen: currentSettings.verticalGapScreen,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          variants={dialogOverlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={springs.gentle}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          variants={dialogContentVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={springs.snappy}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cài đặt sơ đồ (Kích thước & Khoảng cách)</h3>
                <p className="text-xs text-slate-500">Tùy chỉnh chiều ngang mặc định các cấp và khoảng cách giữa các nhánh cột</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Bộ mẫu kích thước nhanh</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset("compact")}
                >
                  Thu nhỏ
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleApplyPreset("default")}
                >
                  Chuẩn mặc định
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset("spacious")}
                >
                  Rộng rãi
                </Button>
              </div>
            </div>

            {/* Inputs per tier */}
            <div className="space-y-3 pt-1">
              {/* LV1 */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">Cấp 1</span>
                    <span className="text-xs font-semibold text-slate-900">Sản phẩm số</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    Tự động kéo dài phủ trọn các LV2 bên dưới khi có nhiều nhánh
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min={180}
                    max={600}
                    step={10}
                    value={lv1Width}
                    onChange={(e) => setLv1Width(Number(e.target.value))}
                    className="w-20 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                  />
                  <span className="text-xs text-slate-400">px</span>
                </div>
              </div>

              {/* LV2 */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">Cấp 2</span>
                    <span className="text-xs font-semibold text-slate-900">Phân hệ / Module</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    Chiều ngang các khối phân hệ đỉnh cột
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min={180}
                    max={500}
                    step={10}
                    value={lv2Width}
                    onChange={(e) => setLv2Width(Number(e.target.value))}
                    className="w-20 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                  />
                  <span className="text-xs text-slate-400">px</span>
                </div>
              </div>

              {/* LV3 */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">Cấp 3</span>
                    <span className="text-xs font-semibold text-slate-900">Luồng tính năng</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    Chiều ngang các thẻ luồng thụt lề dưới phân hệ
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min={160}
                    max={450}
                    step={10}
                    value={lv3Width}
                    onChange={(e) => setLv3Width(Number(e.target.value))}
                    className="w-20 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                  />
                  <span className="text-xs text-slate-400">px</span>
                </div>
              </div>

              {/* LV4 */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">Cấp 4</span>
                    <span className="text-xs font-semibold text-slate-900">Màn hình / Điểm chạm</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    Chiều ngang các màn hình con trong luồng
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min={140}
                    max={400}
                    step={10}
                    value={lv4Width}
                    onChange={(e) => setLv4Width(Number(e.target.value))}
                    className="w-20 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                  />
                  <span className="text-xs text-slate-400">px</span>
                </div>
              </div>

              {/* Khoảng cách cột */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-slate-900">Khoảng cách giữa các cột</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    Khoảng trống chiều ngang giữa các nhánh module
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min={30}
                    max={200}
                    step={10}
                    value={columnGap}
                    onChange={(e) => setColumnGap(Number(e.target.value))}
                    className="w-20 px-2.5 py-1 text-xs font-bold text-right rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                  />
                  <span className="text-xs text-slate-400">px</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Khôi phục chuẩn</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu cấu hình</span>
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
