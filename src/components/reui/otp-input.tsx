import React, { useRef, useEffect, useState } from "react"

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  onComplete?: (code: string) => void
  hasError?: boolean
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  onComplete,
  hasError = false,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  // Split string into array of characters
  const digits = Array.from({ length }, (_, i) => value[i] || "")

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      const timer = setTimeout(() => {
        // Focus first empty slot or last slot
        const firstEmpty = digits.findIndex((d) => !d)
        const targetIdx = firstEmpty === -1 ? length - 1 : firstEmpty
        inputsRef.current[targetIdx]?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === "Backspace") {
      e.preventDefault()
      if (digits[index]) {
        // Clear current index
        const newDigits = [...digits]
        newDigits[index] = ""
        const newVal = newDigits.join("")
        onChange(newVal)
      } else if (index > 0) {
        // Move back and clear previous
        const newDigits = [...digits]
        newDigits[index - 1] = ""
        const newVal = newDigits.join("")
        onChange(newVal)
        inputsRef.current[index - 1]?.focus()
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault()
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "")
    if (!rawVal) return

    // If typing single digit
    const char = rawVal.slice(-1)
    const newDigits = [...digits]
    newDigits[index] = char
    const newVal = newDigits.join("").slice(0, length)
    onChange(newVal)

    // Check completion
    if (newVal.length === length && onComplete) {
      onComplete(newVal)
    }

    // Auto-focus next slot
    if (index < length - 1 && char) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (disabled) return
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (!pasteData) return

    onChange(pasteData)
    if (pasteData.length === length && onComplete) {
      onComplete(pasteData)
    }

    // Focus slot after pasted length
    const nextIdx = Math.min(pasteData.length, length - 1)
    inputsRef.current[nextIdx]?.focus()
  }

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-sm mx-auto">
      {Array.from({ length }).map((_, index) => {
        const digit = digits[index]
        const isFocused = focusedIndex === index
        const isFilled = Boolean(digit)

        return (
          <div key={index} className="flex-1 min-w-0">
            <input
              ref={(el) => {
                inputsRef.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={disabled}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onChange={(e) => handleChange(index, e)}
              onPaste={handlePaste}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              className={`w-full h-13 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl transition-all duration-150 outline-none border shadow-2xs select-none ${
                hasError
                  ? "border-rose-300 bg-rose-50/60 text-rose-800 ring-2 ring-rose-200"
                  : isFocused
                  ? "border-[#1B3A6B] ring-3 ring-[#1B3A6B]/15 bg-white text-[#1B3A6B] scale-105 shadow-sm"
                  : isFilled
                  ? "border-slate-300 bg-slate-50/80 text-slate-900 font-extrabold"
                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
              } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100" : "cursor-text"}`}
            />
          </div>
        )
      })}
    </div>
  )
}
export default OtpInput
