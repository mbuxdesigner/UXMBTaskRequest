import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, CircleDot, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type StepStatus = "complete" | "current" | "upcoming" | "error"

export interface StepItem {
  id: string | number
  title: string
  description?: string
  icon?: React.ReactNode
  status?: StepStatus
}

interface StepperContextValue {
  activeStep: number
  orientation?: "horizontal" | "vertical"
  variant?: "default" | "pills" | "circles" | "simple"
  onStepClick?: (stepIndex: number) => void
  totalSteps: number
}

const StepperContext = React.createContext<StepperContextValue | null>(null)

export function useStepper() {
  const context = React.useContext(StepperContext)
  if (!context) {
    throw new Error("useStepper must be used within a Stepper component")
  }
  return context
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  activeStep: number
  orientation?: "horizontal" | "vertical"
  variant?: "default" | "pills" | "circles" | "simple"
  onStepClick?: (stepIndex: number) => void
  children: React.ReactNode
}

export function Stepper({
  activeStep,
  orientation = "horizontal",
  variant = "default",
  onStepClick,
  className,
  children,
  ...props
}: StepperProps) {
  const stepsCount = React.Children.count(children)

  return (
    <StepperContext.Provider
      value={{
        activeStep,
        orientation,
        variant,
        onStepClick,
        totalSteps: stepsCount,
      }}
    >
      <div
        className={cn(
          "w-full select-none",
          orientation === "horizontal"
            ? "flex items-center justify-between"
            : "flex flex-col space-y-4",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </StepperContext.Provider>
  )
}

export interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number
  title: string
  description?: string
  icon?: React.ReactNode
  state?: StepStatus
  disabled?: boolean
}

export function Step({
  step,
  title,
  description,
  icon,
  state,
  disabled,
  className,
  onClick,
  ...props
}: StepProps) {
  const { activeStep, orientation, variant, onStepClick, totalSteps } = useStepper()

  // Calculate status if not explicitly passed
  const currentStatus: StepStatus =
    state ||
    (step < activeStep ? "complete" : step === activeStep ? "current" : "upcoming")

  const isClickable = Boolean(onStepClick) && !disabled

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isClickable && onStepClick) {
      onStepClick(step)
    }
    onClick?.(e)
  }

  const isLast = step === totalSteps - 1

  return (
    <div
      className={cn(
        "relative flex items-center group",
        orientation === "horizontal" ? "flex-1 last:flex-none" : "w-full",
        isClickable && "cursor-pointer",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <div className="flex items-center gap-3">
        {/* Step Indicator / Node */}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-xl transition-all duration-200 font-semibold text-xs",
            "w-9 h-9 border",
            currentStatus === "complete" &&
              "bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-500/20",
            currentStatus === "current" &&
              "bg-[#1B3A6B] border-[#1B3A6B] text-white shadow-md shadow-[#1B3A6B]/25 ring-4 ring-[#1B3A6B]/15",
            currentStatus === "upcoming" &&
              "bg-slate-50 border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600",
            currentStatus === "error" &&
              "bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/20"
          )}
        >
          {currentStatus === "complete" ? (
            <Check className="w-4 h-4 stroke-[2.5]" />
          ) : currentStatus === "error" ? (
            <AlertCircle className="w-4 h-4" />
          ) : icon ? (
            icon
          ) : (
            <span>{step + 1}</span>
          )}
        </div>

        {/* Step Title & Subtitle */}
        <div className="flex flex-col text-left">
          <span
            className={cn(
              "text-xs font-semibold tracking-tight transition-colors",
              currentStatus === "current" && "text-[#1B3A6B] font-bold",
              currentStatus === "complete" && "text-slate-900",
              currentStatus === "upcoming" && "text-slate-500 group-hover:text-slate-700",
              currentStatus === "error" && "text-rose-600 font-bold"
            )}
          >
            {title}
          </span>
          {description && (
            <span
              className={cn(
                "text-[11px] leading-tight transition-colors hidden sm:block",
                currentStatus === "current" ? "text-slate-600" : "text-slate-400"
              )}
            >
              {description}
            </span>
          )}
        </div>
      </div>

      {/* Step Separator Line for horizontal */}
      {orientation === "horizontal" && !isLast && (
        <div className="flex-1 mx-3 hidden md:block">
          <div
            className={cn(
              "h-0.5 w-full rounded-full transition-all duration-300",
              step < activeStep ? "bg-emerald-500" : "bg-slate-200"
            )}
          />
        </div>
      )}
    </div>
  )
}
